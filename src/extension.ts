import * as vscode from 'vscode';
import axios from 'axios';

// Jira API setup
const config = vscode.workspace.getConfiguration('grappleDailyReport');
const JIRA_SERVER = config.get('jiraServer') as string;
const JIRA_USERNAME = config.get('username') as string;
const JIRA_API_TOKEN = config.get('apiToken') as string;
const auth = Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64');
const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
};

// Utility to get yesterday's date
function getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Fetch yesterday's tasks
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

// Fetch backlog tasks
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

// Generate and display the report
async function generateReport() {
    const yesterdayTasks = await getYesterdayTasks();
    const backlogTasks = await getBacklogTasks();

    let report = 'Hi everyone,\nYesterday\n';
    if (yesterdayTasks.length > 0) {
        for (const task of yesterdayTasks) {
            report += `- ${task.key}: ${task.fields.summary}\n`; // Use bullet-point format
        }
    } else {
        report += '- No tasks logged.\n';
    }

    report += 'Today\n';
    if (backlogTasks.length > 0) {
        for (const task of backlogTasks) {
            report += `- ${task.key}: ${task.fields.summary}\n`; // Use bullet-point format
        }
    } else {
        report += '- No tasks planned.\n';
    }

    report += 'No blockers\n';

    // Create an output channel instead of writing to a file
    const outputChannel = vscode.window.createOutputChannel('Jira Daily Report');
    outputChannel.clear();
    outputChannel.append(report);
    outputChannel.show();
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Daily Report extension is now active!');

    // Register the command
    const disposable = vscode.commands.registerCommand('jiraDailyReport.generate', generateReport);
    context.subscriptions.push(disposable);
}

// Extension deactivation
export function deactivate() {}
