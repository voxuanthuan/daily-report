import blessed from 'blessed';
import { StateManager } from '../state';
import moment from 'moment-timezone';

export class TimeLogPanel {
  private widget: blessed.Widgets.BoxElement;
  private state: StateManager;

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number }
  ) {
    this.state = state;

    this.widget = grid.set(
      position.row,
      position.col,
      position.rowSpan,
      position.colSpan,
      blessed.box,
      {
        label: 'Weekly Time Tracking',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true,
        mouse: true,
        border: 'line',
        scrollbar: {
          ch: '█',
          style: {
            fg: 'blue',
          },
        },
        style: {
          border: {
            fg: 'white',
          },
        },
      }
    );

    // Set rounded border characters
    (this.widget as any).border.type = 'line';
    (this.widget as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    this.subscribe();
  }

  private subscribe(): void {
    this.state.subscribe(() => {
      this.render();
    });
  }

  render(): void {
    const content = this.getWeeklyTimeLogTable();
    this.widget.setContent(content);
    this.widget.screen.render();
  }

  private getWeeklyTimeLogTable(): string {
    const allWorklogs = this.state.getState().worklogs;
    const timezone = 'Australia/Sydney';
    const today = moment.tz(timezone);

    // Group worklogs by date
    const worklogsByDate = new Map<string, number>();
    allWorklogs.forEach(log => {
      const date = log.startDate;
      const existing = worklogsByDate.get(date) || 0;
      worklogsByDate.set(date, existing + log.timeSpentSeconds);
    });

    // Get last 10 working days
    const days: { date: moment.Moment; hours: number; isToday: boolean }[] = [];
    let currentDate = today.clone();
    let daysAdded = 0;

    while (daysAdded < 10) {
      const weekday = currentDate.isoWeekday();
      if (weekday <= 5) { // Monday to Friday only
        const dateStr = currentDate.format('YYYY-MM-DD');
        const seconds = worklogsByDate.get(dateStr) || 0;
        const hours = Math.round((seconds / 3600) * 10) / 10; // Round to 1 decimal
        days.unshift({
          date: currentDate.clone(),
          hours: hours,
          isToday: dateStr === today.format('YYYY-MM-DD')
        });
        daysAdded++;
      }
      currentDate.subtract(1, 'day');
    }

    // Split into last week and this week
    const thisWeekStart = today.clone().startOf('isoWeek');
    const lastWeekDays = days.filter(d => d.date.isBefore(thisWeekStart));
    const thisWeekDays = days.filter(d => d.date.isSameOrAfter(thisWeekStart));

    // Calculate totals
    const lastWeekTotal = lastWeekDays.reduce((sum, d) => sum + d.hours, 0);
    const thisWeekTotal = thisWeekDays.reduce((sum, d) => sum + d.hours, 0);

    // Build table
    const lines: string[] = [];
    lines.push('');
    lines.push('  ┌────────────────┬────────────┐');
    lines.push('  │ Date           │ Hours      │');
    lines.push('  ├────────────────┼────────────┤');

    // Show last 3 days of last week if available
    const lastWeekVisible = lastWeekDays.slice(-3);
    if (lastWeekVisible.length > 0) {
      lastWeekVisible.forEach(day => {
        const dayName = day.date.format('dddd');
        const hoursStr = day.hours.toString().padEnd(10);
        lines.push(`  │ ${dayName.padEnd(14)} │ ${hoursStr} │`);
      });
      const summary = `Last week: ${lastWeekTotal}/40`;
      lines.push(`  ├────────────────┼────────────┤ {gray-fg}${summary}{/gray-fg}`);
    }

    // Show this week
    thisWeekDays.forEach(day => {
      const dayName = day.date.format('dddd');
      const emoji = day.isToday ? ' 📅' : '';
      const label = day.isToday ? `Today${emoji}` : dayName;
      const hoursStr = day.hours.toString().padEnd(10);
      const hoursColor = day.hours >= 8 ? 'green-fg' : day.hours > 0 ? 'yellow-fg' : 'gray-fg';
      lines.push(`  │ ${label.padEnd(14)} │ {${hoursColor}}${hoursStr}{/${hoursColor}} │`);
    });

    const thisWeekSummary = `This week: ${thisWeekTotal}/40`;
    lines.push(`  └────────────────┴────────────┘ {cyan-fg}${thisWeekSummary}{/cyan-fg}`);
    lines.push('');

    return lines.join('\n');
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
