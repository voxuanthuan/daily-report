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

export async function fetchAllTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    return await fetchBacklogTasks();
}

export function calculateTotalHours(tasks: any[], previousDay: string): number {
    return tasks.reduce((sum, task) => sum + calculateWorklogHours(task, previousDay), 0);
}

export async function fetchUserDisplayName(): Promise<any> {
    try {
        const response = await axios.get(`${JIRA_SERVER}/rest/api/3/myself`, { headers: apiHeaders });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        return JIRA_USERNAME.split('@')[0];
    }
}

async function fetchBacklogTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    const jql = `assignee = '${JIRA_USERNAME}' AND status IN ('Selected for Development', 'Open', 'In Progress')`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks,status,worklog,priority,issuetype${IS_QC ? ',parent' : ''}`;

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
    const worklogs = task.fields.worklog?.worklogs || [];
    const totalSeconds = worklogs
        .filter((log: any) => {
            return moment(log.created).format('YYYY-MM-DD') === date && log.author?.emailAddress === JIRA_USERNAME;
        })
        .reduce((sum: number, log: any) => sum + (log.timeSpentSeconds || 0), 0);
    return Math.round(totalSeconds / 3600);
}

function getPreviousWorkday(): string {
    const today = moment.tz('Australia/Sydney');
    let previousDay = today.clone().subtract(1, 'day');
  
    while (previousDay.isoWeekday() > 5) {
      previousDay.subtract(1, 'day');
    }
  
    return previousDay.format('YYYY-MM-DD');
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
  
  // Fetch yesterday's tasks with full issue details
  export async function fetchPreviousWorkdayTasks(workerId: string): Promise<any[]> {
    const previousDay = getPreviousWorkday();
    const tempoFetcher = new TempoFetcher(workerId);
  
    try {
      const worklogs = await tempoFetcher.fetchWorklogs(previousDay, previousDay);
      console.log(`Fetched ${worklogs.length} worklogs for ${previousDay}`);
  
      const filteredWorklogs = worklogs.filter(worklog =>
        moment.tz(worklog.startDate, 'Australia/Sydney').format('YYYY-MM-DD') === previousDay
      );
  
      // Fetch Jira issue details for each worklog
      const issueDetailsPromises = filteredWorklogs.map(worklog =>
        fetchJiraIssueDetails(worklog.issue.id)
      );
      const issueDetails = (await Promise.all(issueDetailsPromises)).filter((issue): issue is JiraIssue => issue !== null);
  
      return issueDetails;
    } catch (error: any) {
      console.error(`Failed to fetch worklogs for ${previousDay}: ${error.message}`);
      return [];
    }
  }
