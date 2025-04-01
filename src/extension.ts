import * as vscode from 'vscode';
import { generateDailyReport } from './components/generate-report';
import {openJiraTicket} from './components/open-ticket';

export function activate(context: vscode.ExtensionContext) {
      const disposable = vscode.commands.registerCommand('jiraDailyReport.open', async () => {
        const ticketId = await vscode.window.showInputBox({
          prompt: 'Enter Jira ticket key (e.g., PROJ-123)',
          placeHolder: 'GRAP-15123',
          validateInput: (value) => (value.trim() ? null : 'Ticket key cannot be empty'),
        });
    
        // Call the open function with the provided ticket ID
        openJiraTicket(ticketId);
      });
    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', generateDailyReport),
        disposable
    );
}

export function deactivate() {}
