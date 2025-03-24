import { getDateInfo } from './date-utils';
import { getAutoClipboardConfig } from './config-utils';
import { fetchAllTasks, calculateTotalHours } from './task-fetcher';
import { buildMainReport, buildTodoList, combineReport, buildTotalHoursNote } from './report-builder';
import { displayReport, copyToClipboard } from './output-utils';
import { generateWorklogsReport } from './worklogs-weekly';

export async function generateDailyReport() {
    const dateInfo = getDateInfo();
    const autoClipboard = getAutoClipboardConfig();
    const tasks = await fetchAllTasks();
    // const userDisplayName = await fetchUserDisplayName();
    const worklogs = await generateWorklogsReport();

    const totalHours = calculateTotalHours(tasks.yesterdayTasks, dateInfo.previousDay);
    const mainReport = buildMainReport(dateInfo.previousDayLabel, tasks);
    const todoList = buildTodoList(tasks.open);
    const timeLog = buildTotalHoursNote(totalHours);
    // const notes = buildNotes(totalHours, userDisplayName);
    const finalReport = combineReport(mainReport, timeLog, todoList, worklogs);

    displayReport(finalReport);
    await copyToClipboard(mainReport, autoClipboard);
}
