import moment from 'moment-timezone';

interface Worklog {
  tempoWorklogId: number;
  issue: { key: string; summary: string };
  timeSpentSeconds: number;
  startDate: string;
  worker: string;
  description?: string;
}

class TempoFormatter {
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

    const colWidths = { day: 12, hours: 10 };
    const header = [
      `| ${'Date'.padEnd(colWidths.day)} | ${'Hours'.padEnd(colWidths.hours)} |`,
      `|${'-'.repeat(colWidths.day + 2)}|${'-'.repeat(colWidths.hours + 2)}|\n`,
    ];

    // Calculate total hours for the full last week
    const lastWeekTotalHoursRaw = lastWeekFullDays.reduce((sum, day) => sum + (hoursByDay[day.date] || 0), 0);
    const lastWeekTotalHoursFormatted = Number.isInteger(lastWeekTotalHoursRaw)
      ? lastWeekTotalHoursRaw.toString() // e.g., 4 -> "4"
      : lastWeekTotalHoursRaw.toFixed(1).replace(/\.0$/, ''); // e.g., 4.5 -> "4.5", 4.0 -> "4"
    const lastWeekTotalDisplay = `Last week: ${lastWeekTotalHoursFormatted}/40`;

    // Format last week's rows (only 3 days), adding total on the last row
    const lastWeekRows = lastWeekDisplayDays.map((day, index) => {
      const hours = hoursByDay[day.date].toFixed(2);
      const isLastDay = index === lastWeekDisplayDays.length - 1;
      return `| ${day.name.padEnd(colWidths.day)} | ${hours.padEnd(colWidths.hours)} |${isLastDay ? ` ${lastWeekTotalDisplay}` : ''}`;
    });

    const thisWeekRows = thisWeekDays.map((day) => {
      const hours = hoursByDay[day.date].toFixed(2);
      return `| ${day.name.padEnd(colWidths.day)} | ${hours.padEnd(colWidths.hours)} |`;
    });

    content += '\n-------------------------------------------------------------\n\n';
    content += header.join('\n');
    content += `| ${'...'.padEnd(colWidths.day)} | ${''.padEnd(colWidths.hours)} |\n`;
    content += lastWeekRows.join('\n');
    content += `\n|${'-'.repeat(colWidths.day + 2)}|${'-'.repeat(colWidths.hours + 2)}|`;
    content += `\n|${'-'.repeat(colWidths.day + 2)}|${'-'.repeat(colWidths.hours + 2)}|`;
    content += '\n' + thisWeekRows.join('\n');
    content += '\n';
    return content;
  }
}

export default TempoFormatter;
