import * as vscode from 'vscode';
import { generateDailyReport } from './components/generate-report';
import {openJiraTicket} from './components/open-ticket';
import TimesheetHandler from './components/timesheet-handler';
import { fetchUserDisplayName } from './components/task-fetcher';

export function activate(context: vscode.ExtensionContext) {
    let timesheetHandler: TimesheetHandler | null = null;
    
    // Initialize timesheet handler with user account when needed
    const initializeTimesheetHandler = async (): Promise<TimesheetHandler> => {
        if (!timesheetHandler) {
            try {
                const user = await fetchUserDisplayName();
                timesheetHandler = new TimesheetHandler(user.accountId);
            } catch (error) {
                vscode.window.showErrorMessage('Failed to initialize timesheet handler. Please check your Jira configuration.');
                timesheetHandler = new TimesheetHandler(); // Fallback without account ID
            }
        }
        return timesheetHandler;
    };
    
    const openTicketCommand = vscode.commands.registerCommand('jiraDailyReport.open', async () => {
        const ticketId = await vscode.window.showInputBox({
          prompt: 'Enter Jira ticket key (e.g., PROJ-123)',
          placeHolder: 'GRAP-15123',
          validateInput: (value) => (value.trim() ? null : 'Ticket key cannot be empty'),
        });
    
        // Call the open function with the provided ticket ID
        openJiraTicket(ticketId);
    });

    const parseTimesheetCommand = vscode.commands.registerCommand('jiraDailyReport.parseTimesheet', async () => {
        const handler = await initializeTimesheetHandler();
        await handler.parseTimesheetLog();
    });

    const logTimeToTempoCommand = vscode.commands.registerCommand('jiraDailyReport.logTimeToTempo', async () => {
        const handler = await initializeTimesheetHandler();
        await handler.logTimeToTempo();
    });

    const logSingleWorklogCommand = vscode.commands.registerCommand('jiraDailyReport.logSingleWorklog', async () => {
        const handler = await initializeTimesheetHandler();
        await handler.logSingleWorklog();
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', generateDailyReport),
        openTicketCommand,
        parseTimesheetCommand,
        logTimeToTempoCommand,
        logSingleWorklogCommand
    );
    
    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (timesheetHandler) {
                timesheetHandler.dispose();
            }
        }
    });
}

export function deactivate() {}
