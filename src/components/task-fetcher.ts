import axios from 'axios';
import moment from 'moment';
import { getPreviousWorkday } from './date-utils';
import { apiHeaders, JIRA_SERVER, JIRA_USERNAME } from './config-utils';

export async function fetchAllTasks(): Promise<{ yesterdayTasks: any[]; inProgress: any[]; open: any[] }> {
    const [yesterdayTasks, { inProgress, open }] = await Promise.all([
        fetchPreviousWorkdayTasks(),
        fetchBacklogTasks(),
    ]);
    return { yesterdayTasks, inProgress, open };
}

export function calculateTotalHours(tasks: any[], previousDay: string): number {
    return tasks.reduce((sum, task) => sum + calculateWorklogHours(task, previousDay), 0);
}

export async function fetchUserDisplayName(): Promise<string> {
    try {
        const response = await axios.get(`${JIRA_SERVER}/rest/api/3/myself`, { headers: apiHeaders });
        return response.data.displayName || JIRA_USERNAME.split('@')[0];
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        return JIRA_USERNAME.split('@')[0];
    }
}

async function fetchPreviousWorkdayTasks(): Promise<any[]> {
    const previousDay = getPreviousWorkday();
    const jql = `assignee = '${JIRA_USERNAME}' AND worklogDate = '${previousDay}' AND status != 'Open' AND worklogAuthor = '${JIRA_USERNAME}'`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks,status,worklog`;

    try {
        const response = await axios.get(url, { headers: apiHeaders });
        console.log(`Fetched ${response.data.total} issues for ${previousDay}`);
        return response.data.issues || [];
    } catch (error: any) {
        console.error(`Failed to fetch tasks for ${previousDay}: ${error.message}`, error.response?.data);
        return [];
    }
}

async function fetchBacklogTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    const jql = `assignee = '${JIRA_USERNAME}' AND status IN ('Open', 'In Progress')`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks,status,worklog,priority,issuetype`;

    try {
        const response = await axios.get(url, { headers: apiHeaders });
        const issues = response.data.issues || [];

        const tasksWithoutMeaningfulSubtasks = issues.filter((task: any) => {
            const subtasks = (task.fields.subtasks || []).filter((subtask: any) => subtask.fields.summary !== 'Test execution');
            return subtasks.length === 0;
        });

        return {
            inProgress: tasksWithoutMeaningfulSubtasks.filter((task: any) => task.fields.status.name === 'In Progress'),
            open: tasksWithoutMeaningfulSubtasks.filter((task: any) => task.fields.status.name === 'Open'),
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
            return moment(log.created).format('YYYY-MM-DD') === date && (log.author?.displayName === 'Tempo Timesheets' || log.author?.emailAddress === JIRA_USERNAME);
        })
        .reduce((sum: number, log: any) => sum + (log.timeSpentSeconds || 0), 0);
    return Math.round(totalSeconds / 3600);
}
