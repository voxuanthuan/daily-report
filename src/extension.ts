import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment';

const config = vscode.workspace.getConfiguration('grappleDailyReport');
const JIRA_SERVER = config.get('jiraServer') as string;
const JIRA_USERNAME = config.get('username') as string;
const JIRA_API_TOKEN = config.get('apiToken') as string;
const authHeader = `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64')}`;
const apiHeaders = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

export function getPreviousWorkday(referenceDate?: moment.Moment): string {
    const date = referenceDate ? moment(referenceDate) : moment();
    return date.day() === 1 ? date.subtract(3, 'days').format('YYYY-MM-DD') : date.subtract(1, 'days').format('YYYY-MM-DD');
}

async function fetchPreviousWorkdayTasks(): Promise<any[]> {
    const previousDay = getPreviousWorkday();
    const jql = `assignee = '${JIRA_USERNAME}' AND worklogDate = '${previousDay}'`;
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
    const url = `${JIRA_SERVER}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,subtasks,status,worklog`;

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

async function displayTodoList() {
    const { open } = await fetchBacklogTasks();
    const output = vscode.window.createOutputChannel('Jira Todo List');
    output.clear();

    output.appendLine(`Current Todo Tasks (Assigned to ${JIRA_USERNAME})`);
    open.length > 0
        ? open.forEach((task) => output.appendLine(`- ${task.key}: ${task.fields.summary}`))
        : output.appendLine('- No tasks in backlog');

    output.show();
    vscode.window.showInformationMessage('Todo list displayed in output channel');
}

function calculateWorklogHours(task: any, date: string): number {
    const worklogs = task.fields.worklog?.worklogs || [];
    const totalSeconds = worklogs
        .filter((log: any) => moment(log.started).format('YYYY-MM-DD') === date)
        .reduce((sum: number, log: any) => sum + (log.timeSpentSeconds || 0), 0);
    return Math.round(totalSeconds / 3600);
}

async function generateDailyReport() {
    const today = moment();
    const isMonday = today.day() === 1;
    const previousDayLabel = isMonday ? 'Last Friday' : 'Yesterday';
    const previousDay = getPreviousWorkday();
    const autoClipboard = config.get('autoClipboard', true);

    const [yesterdayTasks, { inProgress, open }] = await Promise.all([fetchPreviousWorkdayTasks(), fetchBacklogTasks()]);
    const userDisplayName = await fetchUserDisplayName();

    let report = `Hi everyone,\n${previousDayLabel}\n`;
    const totalHours = yesterdayTasks.reduce((sum, task) => sum + calculateWorklogHours(task, previousDay), 0);

    report += yesterdayTasks.length > 0
        ? yesterdayTasks.map((task) => `- ${task.key}: ${task.fields.summary} - ${calculateWorklogHours(task, previousDay)}h`).join('\n') + '\n'
        : '- No tasks logged.\n';

    report += 'Today\n';
    report += inProgress.length > 0
        ? inProgress.map((task) => `- ${task.key}: ${task.fields.summary}`).join('\n') + '\n'
        : '- No tasks planned.\n';

    report += 'No blockers\n\n';

    let finalReport = report;
    finalReport += '-------------------------------------------------------------';
    finalReport += '\n\nTo Do List\n';
    finalReport += open.length > 0
        ? open.map((task) => `- ${task.key}: ${task.fields.summary}`).join('\n')
        : '- No tasks available.';
    finalReport += '\n\nNotes';

    finalReport += totalHours < 8
    ? `\n- 👨🏼 Ha Nguyen: thanh niên @${userDisplayName} qua làm gì mới log có ${totalHours}h`
    : totalHours === 8
    ? '\n- 🕐 Logwork: completed 👍'
    : '\n- 🕐 Logwork: exceed 8h ⛔';

    finalReport += '\n- 📋 Clipboard: The report is copied to clipboard';

    const output = vscode.window.createOutputChannel('Jira Daily Report');
    output.clear();
    output.append(finalReport);
    output.show();

    if (autoClipboard) {
        try {
            await vscode.env.clipboard.writeText(report);
            vscode.window.showInformationMessage('Daily report generated and copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            vscode.window.showErrorMessage('Daily report generated (clipboard copy failed)');
        }
    } else {
        vscode.window.showInformationMessage('Daily report generated!');
    }
}

async function fetchUserDisplayName(): Promise<string> {
    try {
        const response = await axios.get(`${JIRA_SERVER}/rest/api/3/myself`, { headers: apiHeaders });
        return response.data.displayName || JIRA_USERNAME.split('@')[0];
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        return JIRA_USERNAME.split('@')[0];
    }
}

function readChangelog(context: vscode.ExtensionContext): string {
    const changelogPath = path.join(context.extensionPath, 'CHANGELOG.md');
    try {
        return fs.readFileSync(changelogPath, 'utf8');
    } catch (error) {
        console.error('Error reading CHANGELOG.md:', error);
        return 'No changelog available.';
    }
}

function displayChangelog(context: vscode.ExtensionContext) {
    const currentVersion = context.extension.packageJSON.version;
    const lastVersion = context.globalState.get('lastVersion') as string | undefined;

    if (lastVersion !== currentVersion) {
        const changelog = readChangelog(context);
        const output = vscode.window.createOutputChannel('Jira Daily Report Changelog');
        output.clear();
        output.append(`Extension updated to v${currentVersion}!\n\n${changelog}`);
        output.show();
        context.globalState.update('lastVersion', currentVersion);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Jira Daily Report extension activated!');
    displayChangelog(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', generateDailyReport),
        vscode.commands.registerCommand('jiraDailyReport.showTodo', displayTodoList)
    );
}

export function deactivate() {}
