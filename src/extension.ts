import * as vscode from 'vscode';
import { generateDailyReport } from './components/generate-report';
import {openJiraTicket} from './components/open-ticket';
import TimesheetHandler from './components/timesheet-handler';
import JiraQuickAction from './components/jira-quick-action';
import { fetchUserDisplayName } from './components/task-fetcher';

export function activate(context: vscode.ExtensionContext) {
    let timesheetHandler: TimesheetHandler | null = null;
    let quickActionHandler: JiraQuickAction | null = null;
    
    // Initialize handlers with user account when needed
    const initializeHandlers = async (): Promise<{ timesheet: TimesheetHandler; quickAction: JiraQuickAction }> => {
        if (!timesheetHandler || !quickActionHandler) {
            try {
                const user = await fetchUserDisplayName();
                timesheetHandler = new TimesheetHandler(user.accountId);
                quickActionHandler = new JiraQuickAction(user.accountId);
            } catch (error) {
                vscode.window.showErrorMessage('Failed to initialize handlers. Please check your Jira configuration.');
                timesheetHandler = new TimesheetHandler(); // Fallback without account ID
                quickActionHandler = new JiraQuickAction(); // Fallback without account ID
            }
        }
        return { timesheet: timesheetHandler, quickAction: quickActionHandler };
    };
    
    const initializeTimesheetHandler = async (): Promise<TimesheetHandler> => {
        const handlers = await initializeHandlers();
        return handlers.timesheet;
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

    const quickActionCommand = vscode.commands.registerCommand('jiraDailyReport.quickAction', async () => {
        const handlers = await initializeHandlers();
        await handlers.quickAction.executeCommand();
    });

    const myTicketsCommand = vscode.commands.registerCommand('jiraDailyReport.myTickets', async () => {
        const handlers = await initializeHandlers();
        await handlers.quickAction.showMyTickets();
    });

    const quickActionHelpCommand = vscode.commands.registerCommand('jiraDailyReport.quickActionHelp', async () => {
        const handlers = await initializeHandlers();
        await handlers.quickAction.showHelp();
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', generateDailyReport),
        openTicketCommand,
        parseTimesheetCommand,
        logTimeToTempoCommand,
        logSingleWorklogCommand,
        quickActionCommand,
        myTicketsCommand,
        quickActionHelpCommand
    );
    
    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (timesheetHandler) {
                timesheetHandler.dispose();
            }
            if (quickActionHandler) {
                quickActionHandler.dispose();
            }
        }
    });
}

export function deactivate() {}
