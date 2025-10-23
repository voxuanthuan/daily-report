import axios from 'axios';
import moment from 'moment';
import { ConfigManager } from './config';
import TempoFetcher from './tempo/fetcher';

const IAM = {
    DEVELOPER: "Developer",
    QC: 'QC'
};

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

export async function fetchAllTasks(configManager: ConfigManager): Promise<{ inProgress: any[]; open: any[] }> {
    // Check cache first
    if (taskCache && (Date.now() - taskCache.timestamp) < TASK_CACHE_TTL_MS) {
        console.log('Using cached task data');
        return taskCache.data;
    }

    const tasks = await fetchBacklogTasks(configManager);

    // Update cache
    taskCache = {
        data: tasks,
        timestamp: Date.now()
    };

    return tasks;
}

export function calculateTotalHours(tasks: any[], previousDay: string): number {
    return tasks.reduce((sum, task) => sum + calculateWorklogHours(task, previousDay), 0);
}

// Enhanced caching system
interface UserCache {
    data: any;
    timestamp: number;
}

interface TaskCache {
    data: { inProgress: any[]; open: any[] };
    timestamp: number;
}

let userCache: UserCache | null = null;
let taskCache: TaskCache | null = null;
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TASK_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function fetchUserDisplayName(configManager: ConfigManager): Promise<any> {
    // Check cache first
    if (userCache && (Date.now() - userCache.timestamp) < USER_CACHE_TTL_MS) {
        console.log('Using cached user info');
        return userCache.data;
    }

    try {
        console.log('Fetching fresh user info from API');
        const jiraServer = await configManager.getJiraServer();
        const authHeader = await configManager.getAuthHeader();
        const apiHeaders = {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };
        const response = await axios.get(`${jiraServer}rest/api/3/myself`, { headers: apiHeaders });

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

        const username = await configManager.getUsername();
        return username.split('@')[0];
    }
}

async function fetchBacklogTasks(configManager: ConfigManager): Promise<{ inProgress: any[]; open: any[] }> {
    console.log('Fetching fresh task data from API');
    const jiraUsername = await configManager.getUsername();
    const jiraServer = await configManager.getJiraServer();
    const authHeader = await configManager.getAuthHeader();
    const apiHeaders = {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
    };
    const whoAmI = await configManager.getWhoAmI();
    const isQC = whoAmI === IAM.QC;

    const jql = `assignee = '${jiraUsername}' AND status IN ('Selected for Development', 'Open', 'In Progress')`;
    const fields = ['summary', 'subtasks', 'status', 'priority', 'issuetype'].concat(isQC ? ['parent'] : []).join(',');
    const url = `${jiraServer}rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${encodeURIComponent(fields)}&maxResults=100`;

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


// Enhanced issue details cache
const issueDetailsCache = new Map<string, { data: JiraIssue, timestamp: number }>();
const ISSUE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchJiraIssueDetails(issueKey: string, configManager: ConfigManager): Promise<JiraIssue | null> {
    // Check cache first
    const cached = issueDetailsCache.get(issueKey);
    if (cached && (Date.now() - cached.timestamp) < ISSUE_CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const jiraServer = await configManager.getJiraServer();
        const whoAmI = await configManager.getWhoAmI();
        const authHeader = await configManager.getAuthHeader();
        const apiHeaders = {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };

        const url = `${jiraServer}rest/api/3/issue/${issueKey}?fields=summary,status,issueType,priority${whoAmI === IAM.QC ? ',parent' : ''}`;
        const response = await axios.get(url, { headers: apiHeaders });

        // Cache the result
        issueDetailsCache.set(issueKey, {
            data: response.data,
            timestamp: Date.now()
        });

        return response.data;
    } catch (error: any) {
        console.error(`Failed to fetch Jira issue ${issueKey}: ${error?.message}`);
        return null;
    }
}

  // Extract previous workday tasks from existing worklog data (no additional API calls)
  export async function extractPreviousWorkdayTasks(allWorklogs: any[], workerId: string, configManager: ConfigManager): Promise<PreviousWorkdayResult> {
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
          fetchJiraIssueDetails(worklog.issue.id, configManager)
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
  
  // Cache for previous workday tasks
  let previousWorkdayCache: { data: PreviousWorkdayResult, timestamp: number } | null = null;
  const PREVIOUS_WORKDAY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  // Fetch yesterday's tasks with full issue details, with optimized single API call
  export async function fetchPreviousWorkdayTasks(workerId: string, tempoApiToken: string, configManager: ConfigManager): Promise<PreviousWorkdayResult> {
    // Check cache first
    if (previousWorkdayCache && (Date.now() - previousWorkdayCache.timestamp) < PREVIOUS_WORKDAY_CACHE_TTL) {
        console.log('Using cached previous workday tasks');
        return previousWorkdayCache.data;
    }

    const tempoFetcher = new TempoFetcher(workerId, tempoApiToken);

    // Calculate date range: 14 working days back from today
    const endDate = moment.tz('Australia/Sydney').subtract(1, 'day');
    const startDate = endDate.clone().subtract(14, 'days');

    try {
      console.log('Fetching fresh previous workday tasks');
      // Single API call to fetch all worklogs in the range
      const allWorklogs = await tempoFetcher.fetchWorklogs(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );

      console.log(`Fetched ${allWorklogs.length} worklogs in date range ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);

      if (allWorklogs.length === 0) {
        console.log('No worklogs found in the last 14 days');
        const result = { tasks: [], actualDate: null };
        previousWorkdayCache = { data: result, timestamp: Date.now() };
        return result;
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
            fetchJiraIssueDetails(worklog.issue.id, configManager)
          );
          const issueDetails = (await Promise.all(issueDetailsPromises)).filter((issue): issue is JiraIssue => issue !== null);

          console.log(`Found ${issueDetails.length} tasks for most recent workday: ${currentDateStr}`);
          const result = { tasks: issueDetails, actualDate: currentDateStr };
          previousWorkdayCache = { data: result, timestamp: Date.now() };
          return result;
        }

        currentDay.subtract(1, 'day');
      }

      console.log('No worklogs found on working days in the last 14 days');
      const result = { tasks: [], actualDate: null };
      previousWorkdayCache = { data: result, timestamp: Date.now() };
      return result;

    } catch (error: any) {
      console.error(`Failed to fetch worklogs for date range: ${error.message}`);
      return { tasks: [], actualDate: null };
    }
  }

  // Clear caches (useful for testing or when configuration changes)
  export function clearCaches(): void {
    userCache = null;
    taskCache = null;
    previousWorkdayCache = null;
    issueDetailsCache.clear();
    console.log('All caches cleared');
  }
