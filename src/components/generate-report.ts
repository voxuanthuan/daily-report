import { getDateInfo } from './date-utils';
import { getAutoClipboardConfig } from './config-utils';
import { fetchAllTasks, fetchUserDisplayName, fetchPreviousWorkdayTasks } from './task-fetcher';
import { buildMainReport, buildTodoList, combineReport } from './report-builder';
import { displayReport, copyToClipboard } from './output-utils';
import TempoFetcher from './tempo/fetcher';
import TempoFormatter from './tempo/formatter';

export async function generateDailyReport() {
    const dateInfo = getDateInfo();
    const autoClipboard = getAutoClipboardConfig();
    const {open, inProgress} = await fetchAllTasks();
    const user = await fetchUserDisplayName();
    const yesterdayTasks = await fetchPreviousWorkdayTasks(user.accountId);

    const fetcher = new TempoFetcher(user.accountId);
    const formatter = new TempoFormatter();
    // const worklogs = await generateWorklogsReport();
    const  Worklogs = await fetcher.fetchLastSixDaysWorklogs();
    
    // const totalHours = calculateTotalHours(tasks.yesterdayTasks, dateInfo.previousDay);
    const mainReport = buildMainReport(dateInfo.previousDayLabel, inProgress, yesterdayTasks);
    const todoList = buildTodoList(open);
    // const timeLog = buildTotalHoursNote(totalHours);
    const workLogContent = formatter.formatWorkLogContent(Worklogs);
    // const notes = buildNotes(totalHours, userDisplayName);
    const finalReport = combineReport(mainReport, '', todoList, workLogContent);

    displayReport(finalReport);
    await copyToClipboard(mainReport, autoClipboard);
}
