import * as vscode from 'vscode';
import axios from 'axios';
import moment from 'moment';
import { apiHeaders, JIRA_API_TOKEN, JIRA_SERVER, JIRA_USERNAME, WHO_AM_I, IAM } from './config-utils';
import TempoFetcher from './tempo/fetcher';

const IS_QC = WHO_AM_I === IAM.QC;

const GUIDE_GENERATE_TOKEN = 'https://confluence.atlassian.com/cloud/api-tokens-938839638.html';

interface JiraIssue {
    id: string;
    fields: {
      summary: string;
      status: { name: string };
      [key: string]: any;
    };
  }

  export interface PreviousWorkdayResult {
    tasks: JiraIssue[];
    actualDate: string | null;
  }

export async function fetchAllTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    return await fetchBacklogTasks();
}

export function calculateTotalHours(tasks: any[], previousDay: string): number {
    return tasks.reduce((sum, task) => sum + calculateWorklogHours(task, previousDay), 0);
}

// Simple cache for user info (5 minute TTL)
interface UserCache {
    data: any;
    timestamp: number;
}

let userCache: UserCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchUserDisplayName(): Promise<any> {
    // Check cache first
    if (userCache && (Date.now() - userCache.timestamp) < CACHE_TTL_MS) {
        console.log('Using cached user info');
        return userCache.data;
    }

    try {
        console.log('Fetching fresh user info from API');
        const response = await axios.get(`${JIRA_SERVER}/rest/api/3/myself`, { headers: apiHeaders });
        
        // Update cache
        userCache = {
            data: response.data,
            timestamp: Date.now()
        };
        
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        
        // Fallback: return cached data if available, otherwise default
        if (userCache) {
            console.log('Using stale cached user info due to API error');
            return userCache.data;
        }
        
        return JIRA_USERNAME.split('@')[0];
    }
}

async function fetchBacklogTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    const jql = `assignee = '${JIRA_USERNAME}' AND status IN ('Selected for Development', 'Open', 'In Progress')`;
    const fields = ['summary', 'subtasks', 'status', 'priority', 'issuetype'].concat(IS_QC ? ['parent'] : []).join(',');
    const url = `${JIRA_SERVER}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields)}&maxResults=100`;

    try {
        const response = await axios.get(url, { headers: apiHeaders });
        const issues = response.data.issues || [];

        const tasksWithoutMeaningfulSubtasks = issues.filter((task: any) => {
            const subtasks = (task.fields.subtasks || []).filter((subtask: any) => subtask.fields.summary !== 'Test execution');
            return subtasks.length === 0;
        });

        return {
            inProgress: tasksWithoutMeaningfulSubtasks.filter((task: any) => task.fields.status.name === 'In Progress'),
            open: tasksWithoutMeaningfulSubtasks.filter((task: any) => task.fields.status.name === 'Open' || task.fields.status.name === 'Selected for Development'),
        };
    } catch (error: any) {
        console.error(`Failed to fetch backlog tasks: ${error.message}`, error.response?.data);
        return { inProgress: [], open: [] };
    }
}

function calculateWorklogHours(task: any, date: string): number {
    // Note: Worklog data is no longer available through search API due to deprecation
    // Use Tempo API for time tracking instead
    return 0;
}


async function fetchJiraIssueDetails(issueKey: string): Promise<JiraIssue | null> {
    if (!JIRA_SERVER) {
      vscode.window.showErrorMessage('Missing JIRA_SERVER Config');
    }
    if (!JIRA_USERNAME) {
      vscode.window.showErrorMessage('Missing JIRA_USERNAME (email) Config');
    }
    if (!JIRA_API_TOKEN) {
      const errorMessage = `Jira API token is missing. Please configure Jira Tempo API token in settings. See ${GUIDE_GENERATE_TOKEN} for more info.`;
      vscode.window.showErrorMessage(errorMessage);
    }
    const url = `${JIRA_SERVER}/rest/api/3/issue/${issueKey}?fields=summary,status,issueType,priority${WHO_AM_I === IAM.QC ? ',parent' : ''}`;
    try {
      const response = await axios.get(url, { headers: apiHeaders });
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch Jira issue ${issueKey}: ${error?.message}`);
      return null;
    }
  }

  // Extract previous workday tasks from existing worklog data (no additional API calls)
  export async function extractPreviousWorkdayTasks(allWorklogs: any[], workerId: string): Promise<PreviousWorkdayResult> {
    if (allWorklogs.length === 0) {
      console.log('No worklogs provided for extraction');
      return { tasks: [], actualDate: null };
    }

    // Group worklogs by date
    const worklogsByDate: { [key: string]: typeof allWorklogs } = {};
    allWorklogs.forEach(worklog => {
      const logDate = moment.tz(worklog.startDate, 'Australia/Sydney').format('YYYY-MM-DD');
      if (!worklogsByDate[logDate]) {
        worklogsByDate[logDate] = [];
      }
      worklogsByDate[logDate].push(worklog);
    });

    // Find the most recent workday (excluding weekends) with worklogs
    const yesterday = moment.tz('Australia/Sydney').subtract(1, 'day');
    let currentDay = yesterday.clone();
    
    for (let i = 0; i < 14; i++) {
      // Skip weekends
      while (currentDay.isoWeekday() > 5) {
        currentDay.subtract(1, 'day');
      }
      
      const currentDateStr = currentDay.format('YYYY-MM-DD');
      const dayWorklogs = worklogsByDate[currentDateStr];
      
      if (dayWorklogs && dayWorklogs.length > 0) {
        // Fetch Jira issue details for each worklog in parallel
        const issueDetailsPromises = dayWorklogs.map(worklog =>
          fetchJiraIssueDetails(worklog.issue.id)
        );
        const issueDetails = (await Promise.all(issueDetailsPromises)).filter((issue): issue is JiraIssue => issue !== null);
        
        console.log(`Extracted ${issueDetails.length} tasks from existing data for: ${currentDateStr}`);
        return { tasks: issueDetails, actualDate: currentDateStr };
      }
      
      currentDay.subtract(1, 'day');
    }

    console.log('No worklogs found on working days in existing data');
    return { tasks: [], actualDate: null };
  }
  
  // Fetch yesterday's tasks with full issue details, with optimized single API call
  export async function fetchPreviousWorkdayTasks(workerId: string): Promise<PreviousWorkdayResult> {
    const tempoFetcher = new TempoFetcher(workerId);
    
    // Calculate date range: 14 working days back from today
    const endDate = moment.tz('Australia/Sydney').subtract(1, 'day');
    const startDate = endDate.clone().subtract(14, 'days');
    
    try {
      // Single API call to fetch all worklogs in the range
      const allWorklogs = await tempoFetcher.fetchWorklogs(
        startDate.format('YYYY-MM-DD'), 
        endDate.format('YYYY-MM-DD')
      );
      
      console.log(`Fetched ${allWorklogs.length} worklogs in date range ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
      
      if (allWorklogs.length === 0) {
        console.log('No worklogs found in the last 14 days');
        return { tasks: [], actualDate: null };
      }
      
      // Group worklogs by date and find most recent workday with logs
      const worklogsByDate: { [key: string]: typeof allWorklogs } = {};
      allWorklogs.forEach(worklog => {
        const logDate = moment.tz(worklog.startDate, 'Australia/Sydney').format('YYYY-MM-DD');
        if (!worklogsByDate[logDate]) {
          worklogsByDate[logDate] = [];
        }
        worklogsByDate[logDate].push(worklog);
      });
      
      // Find the most recent workday (excluding weekends) with worklogs
      let currentDay = endDate.clone();
      for (let i = 0; i < 14; i++) {
        // Skip weekends
        while (currentDay.isoWeekday() > 5) {
          currentDay.subtract(1, 'day');
        }
        
        const currentDateStr = currentDay.format('YYYY-MM-DD');
        const dayWorklogs = worklogsByDate[currentDateStr];
        
        if (dayWorklogs && dayWorklogs.length > 0) {
          // Fetch Jira issue details for each worklog in parallel
          const issueDetailsPromises = dayWorklogs.map(worklog =>
            fetchJiraIssueDetails(worklog.issue.id)
          );
          const issueDetails = (await Promise.all(issueDetailsPromises)).filter((issue): issue is JiraIssue => issue !== null);
          
          console.log(`Found ${issueDetails.length} tasks for most recent workday: ${currentDateStr}`);
          return { tasks: issueDetails, actualDate: currentDateStr };
        }
        
        currentDay.subtract(1, 'day');
      }
      
      console.log('No worklogs found on working days in the last 14 days');
      return { tasks: [], actualDate: null };
      
    } catch (error: any) {
      console.error(`Failed to fetch worklogs for date range: ${error.message}`);
      return { tasks: [], actualDate: null };
    }
  }
