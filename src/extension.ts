import * as vscode from 'vscode';
import { generateDailyReport } from './core/generate-report';
import { ConfigManager } from './core/config';
import { OutputManager } from './core/output';
import { VSCodeConfigProvider } from './vscode/config-adapter';
import { VSCodeOutputProvider } from './vscode/output-adapter';
import { fetchUserDisplayName } from './core/task-fetcher';
import { CacheManager } from './core/cache-manager';
import {openJiraTicket} from './components/open-ticket';
import TimesheetHandler from './components/timesheet-handler';
import JiraQuickAction from './components/jira-quick-action';

// Global handler cache for better performance
let globalHandlerCache: {
    timesheet: TimesheetHandler | null;
    quickAction: JiraQuickAction | null;
    user: any | null;
    lastInitialized: number;
} = {
    timesheet: null,
    quickAction: null,
    user: null,
    lastInitialized: 0
};

const HANDLER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activation started');

    // Initialize configuration and output providers (once per activation)
    const configProvider = new VSCodeConfigProvider();
    const outputProvider = new VSCodeOutputProvider();
    const configManager = new ConfigManager(configProvider);
    const outputManager = new OutputManager(outputProvider);

    // Cleanup output provider on deactivation
    context.subscriptions.push({ dispose: () => outputProvider.dispose() });

    // Optimized handler initialization with caching
    const initializeHandlers = async (): Promise<{ timesheet: TimesheetHandler; quickAction: JiraQuickAction }> => {
        const now = Date.now();

        // Check if we have valid cached handlers
        if (globalHandlerCache.timesheet && globalHandlerCache.quickAction &&
            globalHandlerCache.user && (now - globalHandlerCache.lastInitialized) < HANDLER_CACHE_TTL) {
            console.log('Using cached handlers');
            return {
                timesheet: globalHandlerCache.timesheet,
                quickAction: globalHandlerCache.quickAction
            };
        }

        try {
            console.log('Initializing fresh handlers');
            const user = await fetchUserDisplayName(configManager);
            
            globalHandlerCache.timesheet = new TimesheetHandler(user.accountId);
            globalHandlerCache.quickAction = new JiraQuickAction(user.accountId);
            globalHandlerCache.user = user;
            globalHandlerCache.lastInitialized = now;
            
            return { 
                timesheet: globalHandlerCache.timesheet, 
                quickAction: globalHandlerCache.quickAction 
            };
        } catch (error) {
            console.error('Handler initialization failed:', error);
            vscode.window.showErrorMessage('Failed to initialize handlers. Please check your Jira configuration.');
            
            // Create fallback handlers if they don't exist
            if (!globalHandlerCache.timesheet) {
                globalHandlerCache.timesheet = new TimesheetHandler();
            }
            if (!globalHandlerCache.quickAction) {
                globalHandlerCache.quickAction = new JiraQuickAction();
            }
            
            return { 
                timesheet: globalHandlerCache.timesheet, 
                quickAction: globalHandlerCache.quickAction 
            };
        }
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

    // Initialize cache manager
    CacheManager.registerClearCacheCommand(context);

    // Register all commands
    context.subscriptions.push(
        vscode.commands.registerCommand('jiraDailyReport.generate', async () => {
            console.log('Generate Daily Report command triggered');
            await generateDailyReport(configManager, outputManager);
        }),
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
            console.log('Extension deactivating, cleaning up handlers');
            if (globalHandlerCache.timesheet) {
                globalHandlerCache.timesheet.dispose();
            }
            if (globalHandlerCache.quickAction) {
                globalHandlerCache.quickAction.dispose();
            }
            // Clear global cache
            globalHandlerCache = {
                timesheet: null,
                quickAction: null,
                user: null,
                lastInitialized: 0
            };
        }
    });
    
    console.log('Extension activation completed');
}

export function deactivate() {
    console.log('Extension deactivated');
}
