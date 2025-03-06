import * as vscode from 'vscode';
import axios from 'axios';
import moment from 'moment';

const config = vscode.workspace.getConfiguration('grappleDailyReport');
const JIRA_SERVER = config.get('jiraServer') as string;
const JIRA_USERNAME = config.get('username') as string;
const JIRA_API_TOKEN = config.get('apiToken') as string;
const auth = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64');
const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
};

/**
 * Returns yesterday’s date as a formatted string (YYYY-MM-DD).
 * If the given reference date (or today, if omitted) is Monday, it returns the previous Friday.
 *
 * @param referenceDate Optional moment.Moment to use as “today” for testing purposes.
 */
export function getYesterday(referenceDate?: moment.Moment): string {
    // Use the provided reference date or the current date
    const today = referenceDate ? moment(referenceDate) : moment();
    // In moment, Sunday = 0, Monday = 1, etc.
    if (today.day() === 1) { // if Monday, subtract 3 days to get Friday
        return today.subtract(3, 'days').format('YYYY-MM-DD');
    } else {
        return today.subtract(1, 'days').format('YYYY-MM-DD');
    }
}

async function getYesterdayTasks(): Promise<any[]> {
    const yesterday = getYesterday();
    const jql = `assignee = '${JIRA_USERNAME}' AND worklogDate = '${yesterday}'`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;
    console.log(`Requesting: ${url}`);
    
    try {
        const response = await axios.get(url, { headers });
        console.log(`Response: Total issues found: ${response.data.total}`);
        console.log(`Issues: ${JSON.stringify(response.data.issues, null, 2)}`);
        return response.data.issues || [];
    } catch (error: any) {
        console.error(`Error fetching yesterday's tasks: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response.data)}`);
        }
        return [];
    }
}

async function getBacklogTasks(): Promise<any[]> {
    const jql = `assignee = '${JIRA_USERNAME}' AND status IN ('To Do', 'In Progress')`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;
    console.log(`Requesting: ${url}`);
    
    try {
        const response = await axios.get(url, { headers });
        console.log(`Response: Total issues found: ${response.data.total}`);
        console.log(`Issues: ${JSON.stringify(response.data.issues, null, 2)}`);
        return response.data.issues || [];
    } catch (error: any) {
        console.error(`Error fetching backlog tasks: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response.data)}`);
        }
        return [];
    }
}

async function generateReport() {
    const yesterdayTasks = await getYesterdayTasks();
    const backlogTasks = await getBacklogTasks();

    let report = 'Hi everyone,\nYesterday\n';
    if (yesterdayTasks.length > 0) {
        for (const task of yesterdayTasks) {
            report += ` ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        report += ' No tasks logged.\n';
    }

    report += 'Today\n';
    if (backlogTasks.length > 0) {
        for (const task of backlogTasks) {
            report += ` ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        report += ' No tasks planned.\n';
    }

    report += 'No blockers\n';

    const outputChannel = vscode.window.createOutputChannel('Jira Daily Report');
    outputChannel.clear();
    outputChannel.append(report);
    outputChannel.show();
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Daily Report extension is now active!');
    const disposable = vscode.commands.registerCommand('jiraDailyReport.generate', generateReport);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
