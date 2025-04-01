import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration('grappleDailyReport');

export function getAutoClipboardConfig(): boolean {
    return config.get('autoClipboard', true);
}
// Jira configuration
export const JIRA_SERVER = config.get('jiraServer') as string;
export const JIRA_USERNAME = config.get('username') as string;
export const JIRA_API_TOKEN = config.get('apiToken') as string;
export const TEMPO_API_TOKEN = config.get('jiraTempoToken') as string;
export const TEMPO_URL = 'https://api.tempo.io/4';
export const authHeader = `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_API_TOKEN}`).toString('base64')}`;
export const apiHeaders = { 'Authorization': authHeader, 'Content-Type': 'application/json' };
