import moment from 'moment-timezone';
import TimesheetParser, { TimesheetEntry, ParsedTimesheetLog } from './timesheet-parser';

interface Worklog {
  tempoWorklogId: number;
  issue: { key: string; summary: string };
  timeSpentSeconds: number;
  startDate: string;
  description?: string;
}

class TempoFormatter {
  /**
   * Format hours to remove unnecessary trailing zeros
   * 8.00 -> 8, 7.50 -> 7.5, 0.00 -> 0
   */
  private formatHours(hours: number): string {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(2).replace(/\.?0+$/, '');
  }

  private getLastWeekThreeWorkingDays(): { date: string; name: string }[] {
    const today = moment.tz('Australia/Sydney');
    const days: { date: string; name: string }[] = [];
    let currentDate = today.clone().startOf('isoWeek').subtract(1, 'week').endOf('isoWeek');
    let count = 0;

    while (count < 3 && currentDate.isSameOrAfter(today.clone().startOf('isoWeek').subtract(1, 'week'))) {
      const weekday = currentDate.isoWeekday();
      if (weekday <= 5) {
        days.unshift({
          date: currentDate.format('YYYY-MM-DD'),
          name: currentDate.format('dddd'),
        });
        count++;
      }
      currentDate.subtract(1, 'day');
    }
    return days;
  }

  private getLastWeekFullWorkingDays(): { date: string; name: string }[] {
    const today = moment.tz('Australia/Sydney');
    const days: { date: string; name: string }[] = [];
    let currentDate = today.clone().startOf('isoWeek').subtract(1, 'week');
    const endDate = currentDate.clone().endOf('isoWeek');

    while (currentDate.isSameOrBefore(endDate)) {
      const weekday = currentDate.isoWeekday();
      if (weekday <= 5) {
        days.push({
          date: currentDate.format('YYYY-MM-DD'),
          name: currentDate.format('dddd'),
        });
      }
      currentDate.add(1, 'day');
    }
    return days;
  }

  private getThisWeekWorkingDays(): { date: string; name: string }[] {
    const today = moment.tz('Australia/Sydney');
    const days: { date: string; name: string }[] = [];
    let currentDate = today.clone().startOf('isoWeek');
    const endDate = today;

    while (currentDate.isSameOrBefore(endDate)) {
      const weekday = currentDate.isoWeekday();
      if (weekday <= 5) {
        days.push({
          date: currentDate.format('YYYY-MM-DD'),
          name: currentDate.isSame(today, 'day') ? 'Today 📅' : currentDate.format('dddd'),
        });
      }
      currentDate.add(1, 'day');
    }
    return days;
  }

  formatWorkLogContent(worklogs: Worklog[]): string {
    let content = '\n';
    if (worklogs.length === 0) {
      console.log('No worklogs found.');
      return content;
    }

    const worklogsByDay: { [key: string]: Worklog[] } = {};
    worklogs.forEach((log) => {
      if (!worklogsByDay[log.startDate]) {
        worklogsByDay[log.startDate] = [];
      }
      worklogsByDay[log.startDate].push(log);
    });

    const lastWeekDisplayDays = this.getLastWeekThreeWorkingDays();
    const lastWeekFullDays = this.getLastWeekFullWorkingDays();
    const thisWeekDays = this.getThisWeekWorkingDays();
    const hoursByDay: { [key: string]: number } = {};

    // Calculate hours for all relevant days
    [...lastWeekFullDays, ...thisWeekDays].forEach((day) => {
      hoursByDay[day.date] = (worklogsByDay[day.date] || []).reduce((sum, log) => sum + log.timeSpentSeconds, 0) / 3600;
    });

    const colWidths = { day: 14, hours: 10 };

    // Calculate total hours for the full last week
    const lastWeekTotalHoursRaw = lastWeekFullDays.reduce((sum, day) => sum + (hoursByDay[day.date] || 0), 0);
    const lastWeekTotalHoursFormatted = Number.isInteger(lastWeekTotalHoursRaw)
      ? lastWeekTotalHoursRaw.toString() // e.g., 4 -> "4"
      : lastWeekTotalHoursRaw.toFixed(1).replace(/\.0$/, ''); // e.g., 4.5 -> "4.5", 4.0 -> "4"
    const lastWeekTotalDisplay = `Last week: ${lastWeekTotalHoursFormatted}/40`;

    // Format last week's rows (only 3 days), adding total on the last row
    const lastWeekRows = lastWeekDisplayDays.map((day, index) => {
      const hours = this.formatHours(hoursByDay[day.date]);
      const isLastDay = index === lastWeekDisplayDays.length - 1;
      return `│ ${day.name.padEnd(colWidths.day)} │ ${hours.padEnd(colWidths.hours)} │${isLastDay ? ` ${lastWeekTotalDisplay}` : ''}`;
    });

    const thisWeekRows = thisWeekDays.map((day) => {
      const hours = this.formatHours(hoursByDay[day.date]);
      return `│ ${day.name.padEnd(colWidths.day)} │ ${hours.padEnd(colWidths.hours)} │`;
    });

    content += '\n─────────────────────────────────────────────────────────────────\n\n';
    content += `┌${'─'.repeat(colWidths.day + 2)}┬${'─'.repeat(colWidths.hours + 2)}┐\n`;
    content += `│ ${'Date'.padEnd(colWidths.day)} │ ${'Hours'.padEnd(colWidths.hours)} │\n`;
    content += `├${'─'.repeat(colWidths.day + 2)}┼${'─'.repeat(colWidths.hours + 2)}┤\n`;
    content += `│ ${'...'.padEnd(colWidths.day)} │ ${''.padEnd(colWidths.hours)} │\n`;
    content += lastWeekRows.join('\n');
    content += `\n├${'─'.repeat(colWidths.day + 2)}┼${'─'.repeat(colWidths.hours + 2)}┤`;
    content += '\n' + thisWeekRows.join('\n');
    content += `\n└${'─'.repeat(colWidths.day + 2)}┴${'─'.repeat(colWidths.hours + 2)}┘\n`;
    return content;
  }

  /**
   * Parse timesheet log format and convert to display format
   * @param timesheetLog - Raw timesheet log string like "B2B-1079 2h, PROJECT-123 1.5h"
   * @returns Formatted string with breakdown by ticket
   */
  formatTimesheetLog(timesheetLog: string): string {
    const parsed = TimesheetParser.parseTimesheetLog(timesheetLog);
    
    if (!parsed.isValid) {
      return `❌ Invalid timesheet format: ${parsed.errors.join(', ')}\n\nExpected format examples:\n${TimesheetParser.getExampleFormats().map(f => `  • ${f}`).join('\n')}`;
    }

    let content = '📋 **Timesheet Log Summary**\n\n';
    
    // Group entries by ticket
    const ticketTotals: { [key: string]: number } = {};
    parsed.entries.forEach(entry => {
      ticketTotals[entry.ticketKey] = (ticketTotals[entry.ticketKey] || 0) + entry.timeSpentSeconds;
    });

    // Format breakdown
    content += '**Breakdown by Ticket:**\n';
    Object.entries(ticketTotals).forEach(([ticket, seconds]) => {
      content += `  • ${ticket}: ${TimesheetParser.formatSecondsToTime(seconds)}\n`;
    });

    content += `\n**Total Time:** ${TimesheetParser.formatSecondsToTime(parsed.totalSeconds)}\n`;
    content += `**Total Hours:** ${(parsed.totalSeconds / 3600).toFixed(2)}h\n`;

    return content;
  }

  /**
   * Convert timesheet log entries to worklog format for integration
   * @param timesheetLog - Raw timesheet log string
   * @param startDate - Date for the worklogs (YYYY-MM-DD format)
   * @returns Array of worklog-like objects
   */
  convertTimesheetToWorklogs(timesheetLog: string, startDate: string): Worklog[] {
    const parsed = TimesheetParser.parseTimesheetLog(timesheetLog);
    
    if (!parsed.isValid) {
      return [];
    }

    return parsed.entries.map((entry, index) => ({
      tempoWorklogId: -1 * (index + 1), // Negative IDs to distinguish from real tempo logs
      issue: {
        key: entry.ticketKey,
        summary: `Timesheet entry for ${entry.ticketKey}`,
        id: entry.ticketKey
      },
      timeSpentSeconds: entry.timeSpentSeconds,
      startDate: startDate,
      description: `Timesheet log: ${entry.rawText}`
    }));
  }
}

export default TempoFormatter;
