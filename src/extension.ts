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
    // Include only subtasks or tasks or story without subtasks 
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks`;
    try {
        const response = await axios.get(url, { headers });
        const issues = response.data.issues || [];

        const filteredTasks = issues.filter((task: any) => {
            const isSubtask = !!task.fields.parent; // Has a parent field (not included in fields, but checking for safety)
            const hasSubtasks = task.fields.subtasks && task.fields.subtasks.length > 0; // Has subtasks

            // Keep only if it’s not a subtask and has no subtasks
            return !isSubtask && !hasSubtasks;
        });

        console.log(`Filtered Issues: ${JSON.stringify(filteredTasks, null, 2)}`);
        return filteredTasks;
    } catch (error: any) {
        console.error(`Error fetching backlog tasks: ${error.message}`);
        if (error.response) {
            console.error(`Response: ${JSON.stringify(error.response.data)}`);
        }
        return [];
    }
}


async function generateReport() {
    const today = moment();
    const label = today.day() === 1 ? "Last Friday" : "Yesterday";

    // Get configuration
    const config = vscode.workspace.getConfiguration('jiraDailyReport');
    const autoClipboard = config.get('autoClipboard', false); // Default to false

    const yesterdayTasks = await getYesterdayTasks();
    const backlogTasks = await getBacklogTasks();

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
    if (backlogTasks.length > 0) {
        for (const task of backlogTasks) {
            reportText += `- ${task.key}: ${task.fields.summary}\n`;
        }
    } else {
        reportText += '- No tasks planned.\n';
    }
    reportText += 'No blockers\n';

    // Prepare final report
    let finalReport = reportText;
    let notificationMessage = 'Daily report generated!';

    // Handle clipboard if enabled
    if (autoClipboard) {
        finalReport += '\n\n✅ Report copied to clipboard!'; // Added checkmark icon and new text
        try {
            await vscode.env.clipboard.writeText(reportText);
            notificationMessage = 'Daily report generated and copied to clipboard!';
        } catch (error) {
            vscode.window.showErrorMessage('Failed to copy report to clipboard');
            console.error('Clipboard error:', error);
            notificationMessage = 'Daily report generated (clipboard copy failed)';
        }
    }

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('Jira Daily Report');
    outputChannel.clear();
    outputChannel.append(finalReport);
    outputChannel.show();

    // Show notification
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

        // Update the stored version
        context.globalState.update('lastVersion', currentVersion);
    }
}



export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Daily Report extension is now active!');

    // Show changelog if version changed
    showChangelog(context);

    // Register the command
    const disposable = vscode.commands.registerCommand('jiraDailyReport.generate', generateReport);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
