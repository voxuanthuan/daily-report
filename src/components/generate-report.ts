import { getDateInfo } from './date-utils';
import { getAutoClipboardConfig } from './config-utils';
import { fetchAllTasks, calculateTotalHours, fetchUserDisplayName } from './task-fetcher';
import { buildMainReport, buildTodoList, buildNotes, combineReport, buildTotalHoursNote } from './report-builder';
import { displayReport, copyToClipboard } from './output-utils';

export async function generateDailyReport() {
    const dateInfo = getDateInfo();
    const autoClipboard = getAutoClipboardConfig();
    const tasks = await fetchAllTasks();
    const userDisplayName = await fetchUserDisplayName();

    const totalHours = calculateTotalHours(tasks.yesterdayTasks, dateInfo.previousDay);
    const mainReport = buildMainReport(dateInfo.previousDayLabel, tasks);
    const todoList = buildTodoList(tasks.open);
    const timeLog = buildTotalHoursNote(totalHours, userDisplayName);
    const notes = buildNotes(totalHours, userDisplayName);
    const finalReport = combineReport(mainReport, timeLog, todoList, notes);

    displayReport(finalReport);
    await copyToClipboard(mainReport, autoClipboard);
}
