import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration('grappleDailyReport');

export function getAutoClipboardConfig(): boolean {
    return config.get('autoClipboard', true);
}
