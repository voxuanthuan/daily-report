import * as vscode from 'vscode';
import moment from 'moment-timezone';
import { getSmartDateLabel } from './date-utils';
import { getAutoClipboardConfig } from './config-utils';
import { fetchAllTasks, fetchUserDisplayName, extractPreviousWorkdayTasks } from './task-fetcher';
import { buildMainReport, buildTodoList, combineReport } from './report-builder';
import { displayReport, copyToClipboard } from './output-utils';
import TempoFetcher from './tempo/fetcher';
import TempoFormatter from './tempo/formatter';

export async function generateDailyReport() {
    const autoClipboard = getAutoClipboardConfig();
    
    // Parallel execution: Fetch independent data simultaneously
    const [tasks, user] = await Promise.all([
        fetchAllTasks(),
        fetchUserDisplayName()
    ]);

    const { open, inProgress } = tasks;
    const fetcher = new TempoFetcher(user.accountId);
    const formatter = new TempoFormatter();
    
    // Optimize: Fetch all worklogs in one call, then extract what we need
    const allWorklogs = await fetcher.fetchLastSixDaysWorklogs();
    
    // Extract previous workday data from the existing worklog data
    const previousWorkdayResult = await extractPreviousWorkdayTasks(allWorklogs, user.accountId);
    
    // Use the smart date label based on the actual date found
    const smartDateLabel = getSmartDateLabel(previousWorkdayResult.actualDate);
    
    // Build main report sections
    const mainReport = buildMainReport(smartDateLabel, inProgress, previousWorkdayResult.tasks);
    const todoList = buildTodoList(open);
    const workLogContent = formatter.formatWorkLogContent(allWorklogs);
    
    // Combine all report sections for display
    const finalReport = combineReport(mainReport, '', todoList, workLogContent);

    displayReport(finalReport);
    await copyToClipboard(finalReport, mainReport, autoClipboard);
}
