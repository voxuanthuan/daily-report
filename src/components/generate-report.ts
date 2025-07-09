import * as vscode from 'vscode';
import moment from 'moment-timezone';
import { getSmartDateLabel } from './date-utils';
import { getAutoClipboardConfig } from './config-utils';
import { fetchAllTasks, fetchUserDisplayName, fetchPreviousWorkdayTasks } from './task-fetcher';
import { buildMainReport, buildTodoList, combineReport } from './report-builder';
import { displayReport, copyToClipboard } from './output-utils';
import TempoFetcher from './tempo/fetcher';
import TempoFormatter from './tempo/formatter';
import TimesheetHandler from './timesheet-handler';

export async function generateDailyReport() {
    const autoClipboard = getAutoClipboardConfig();
    const {open, inProgress} = await fetchAllTasks();
    const user = await fetchUserDisplayName();
    const previousWorkdayResult = await fetchPreviousWorkdayTasks(user.accountId);
    
    // Use the smart date label based on the actual date found
    const smartDateLabel = getSmartDateLabel(previousWorkdayResult.actualDate);

    const fetcher = new TempoFetcher(user.accountId);
    const formatter = new TempoFormatter();
    const timesheetHandler = new TimesheetHandler(user.accountId);
    
    // Fetch existing tempo worklogs
    const Worklogs = await fetcher.fetchLastSixDaysWorklogs();
    
    // Check if user wants to add timesheet entries
    const timesheetLog = await timesheetHandler.promptForTimesheetIntegration();
    
    // Offer to log time directly to Tempo if timesheet entries were provided
    if (timesheetLog && timesheetLog.trim()) {
        const logToTempo = await vscode.window.showInformationMessage(
            'Would you like to log this timesheet data directly to Tempo?',
            'Yes, Log to Tempo',
            'No, Just Include in Report'
        );
        
        if (logToTempo === 'Yes, Log to Tempo') {
            try {
                const results = await timesheetHandler.worklogCreator?.createWorklogsFromTimesheet(
                    timesheetLog,
                    moment.tz('Australia/Sydney').format('YYYY-MM-DD')
                );
                
                if (results) {
                    const successful = results.filter(r => r.success);
                    const failed = results.filter(r => !r.success);
                    
                    if (failed.length === 0) {
                        vscode.window.showInformationMessage(`✅ Successfully logged time for ${successful.length} ticket(s) to Tempo!`);
                    } else if (successful.length === 0) {
                        vscode.window.showErrorMessage(`❌ Failed to log time for all ${failed.length} ticket(s).`);
                    } else {
                        vscode.window.showWarningMessage(`⚠️ Partially successful: ${successful.length} succeeded, ${failed.length} failed.`);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error logging to Tempo: ${error}`);
            }
        }
    }
    
    // Build main report sections
    const mainReport = buildMainReport(smartDateLabel, inProgress, previousWorkdayResult.tasks);
    const todoList = buildTodoList(open);
    const workLogContent = formatter.formatWorkLogContent(Worklogs);
    
    // Add timesheet section if provided
    let timesheetSection = '';
    if (timesheetLog) {
        timesheetSection = timesheetHandler.formatTimesheetSection(timesheetLog);
    }
    
    // Combine all report sections
    const finalReport = combineReport(mainReport, timesheetSection, todoList, workLogContent);

    displayReport(finalReport);
    await copyToClipboard(finalReport, autoClipboard);
    
    // Cleanup
    timesheetHandler.dispose();
}
