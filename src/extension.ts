import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
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
 */
export function getYesterday(referenceDate?: moment.Moment): string {
    const today = referenceDate ? moment(referenceDate) : moment();
    if (today.day() === 1) { // Monday, get Friday
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

async function getBacklogTasks(): Promise<{ inProgress: any[]; open: any[] }> {
    const jql = `assignee = '${JIRA_USERNAME}' AND status IN ('Open', 'In Progress')`;
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks,status,parent`;
    try {
        const response = await axios.get(url, { headers });
        const issues = response.data.issues || [];

        const filteredTasks = issues.filter((task: any) => {
            const isSubtask = !!task.fields.parent;
            const meaningfulSubtasks = (task.fields.subtasks || []).filter(
                (subtask: any) => subtask.fields.summary !== 'Test execution'
            );
            const hasMeaningfulSubtasks = meaningfulSubtasks.length > 0;
            return !isSubtask && !hasMeaningfulSubtasks;
        });

        // Split tasks into In Progress and Open
        const inProgress = filteredTasks.filter((task: any) => task.fields.status.name === 'In Progress');
        const open = filteredTasks.filter((task: any) => task.fields.status.name === 'Open');

        console.log(`Filtered In Progress: ${JSON.stringify(inProgress, null, 2)}`);
        console.log(`Filtered Open: ${JSON.stringify(open, null, 2)}`);
        return { inProgress, open };
    } catch (error: any) {
        console.error(`Error fetching backlog tasks: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response.data)}`);
        }
        return { inProgress: [], open: [] };
    }
}

async function showTodoList() {
    const { open } = await getBacklogTasks();

    let todoText = `Current Todo Tasks (Assigned to ${JIRA_USERNAME})\n`;
    if (open.length > 0) {
        for (const task of open) {
            todoText += `- ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        todoText += '- No tasks in backlog\n';
    }

    const outputChannel = vscode.window.createOutputChannel('Jira Todo List');
    outputChannel.clear();
    outputChannel.append(todoText);
    outputChannel.show();

    vscode.window.showInformationMessage('Todo list displayed in output channel for reference');
}

async function generateReport() {
    const today = moment();
    const label = today.day() === 1 ? "Last Friday" : "Yesterday";

    const config = vscode.workspace.getConfiguration('jiraDailyReport');
    const autoClipboard = config.get('autoClipboard', false);

    const yesterdayTasks = await getYesterdayTasks();
    const { inProgress, open } = await getBacklogTasks();

    // Construct the report text
    let reportText = `Hi everyone,\n${label}\n`;
    if (yesterdayTasks.length > 0) {
        for (const task of yesterdayTasks) {
            reportText += `- ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        reportText += '- No tasks logged.\n';
    }

    reportText += 'Today\n';
    if (inProgress.length > 0) {
        for (const task of inProgress) {
            reportText += `- ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        reportText += '- No tasks planned.\n';
    }

    
    reportText += 'No blockers\n';
    
    // Prepare final report
    let finalReport = reportText;

    finalReport += '- Report copy to Clipboard! ✅';

    let notificationMessage = 'Daily report generated!';

    finalReport += '\n\nTo Do:\n';

    if (open.length > 0) {
        for (const task of open) {
            finalReport += `- ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        finalReport += '- No tasks available.\n';
    }

    if (autoClipboard) {
        try {
            await vscode.env.clipboard.writeText(reportText);
            notificationMessage = 'Daily report generated and copied to clipboard!';
        } catch (error) {
            vscode.window.showErrorMessage('Failed to copy report to clipboard');
            console.error('Clipboard error:', error);
            notificationMessage = 'Daily report generated (clipboard copy failed)';
        }
    }

    const outputChannel = vscode.window.createOutputChannel('Jira Daily Report');
    outputChannel.clear();
    outputChannel.append(finalReport);
    outputChannel.show();

    vscode.window.showInformationMessage(notificationMessage);
}

// Function to read CHANGELOG.md
function getChangelog(context: vscode.ExtensionContext): string {
    const changelogPath = path.join(context.extensionPath, 'CHANGELOG.md');
    try {
        return fs.readFileSync(changelogPath, 'utf8');
    } catch (error) {
        console.error('Error reading CHANGELOG.md:', error);
        return 'No changelog available. Please ensure CHANGELOG.md exists in the extension directory.';
    }
}

// Function to display the changelog
function showChangelog(context: vscode.ExtensionContext) {
    const currentVersion = context.extension.packageJSON.version;
    const lastVersion = context.globalState.get('lastVersion') as string | undefined;

    if (lastVersion !== currentVersion) {
        const changelog = getChangelog(context);
        const outputChannel = vscode.window.createOutputChannel('Jira Daily Report Changelog');
        outputChannel.clear();
        outputChannel.append(`Extension updated to v${currentVersion}!\n\n${changelog}`);
        outputChannel.show();
        context.globalState.update('lastVersion', currentVersion);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Daily Report extension is now active!');
    showChangelog(context);

    const disposable = vscode.commands.registerCommand('jiraDailyReport.generate', generateReport);
    const todoDisposable = vscode.commands.registerCommand('jiraDailyReport.showTodo', showTodoList);
    context.subscriptions.push(disposable, todoDisposable);
}

export function deactivate() {}
