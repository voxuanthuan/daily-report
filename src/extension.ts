import * as vscode from 'vscode';
import { generateDailyReport } from './components/generate-report';


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', generateDailyReport),
    );
}

export function deactivate() {}
