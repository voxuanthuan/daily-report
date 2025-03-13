import * as vscode from 'vscode';

export function displayReport(finalReport: string) {
    const output = vscode.window.createOutputChannel('Jira Daily Report');
    output.clear();
    output.append(finalReport);
    output.show();
}

export async function copyToClipboard(report: string, autoClipboard: boolean) {
    if (!autoClipboard) {
        vscode.window.showInformationMessage('Daily report generated!');
        return;
    }

    try {
        await vscode.env.clipboard.writeText(report);
        vscode.window.showInformationMessage('Daily report generated and copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        vscode.window.showErrorMessage('Daily report generated (clipboard copy failed)');
    }
}
