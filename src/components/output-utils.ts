import * as vscode from 'vscode';

export function displayReport(finalReport: string) {
    const output = vscode.window.createOutputChannel('Jira Daily Report');
    output.clear();
    output.append(finalReport);
    output.show();
}

export async function copyToClipboard(report: string, mainReportOnly: string, autoClipboard: boolean) {
    if (!autoClipboard) {
        vscode.window.showInformationMessage('Daily report generated!');
        return;
    }

    try {
        // Only copy the simplified main report format to clipboard
        await vscode.env.clipboard.writeText(mainReportOnly);
        vscode.window.showInformationMessage('Daily report generated and copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        vscode.window.showErrorMessage('Daily report generated (clipboard copy failed)');
    }
}
