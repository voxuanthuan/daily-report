import blessed from 'blessed';
import { StateManager } from '../state';
import { getTheme } from '../theme';
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
    const theme = getTheme();

    this.widget = grid.set(
      position.row,
      position.col,
      position.rowSpan,
      position.colSpan,
      blessed.box,
      {
        label: ' Time Tracking ',
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
            fg: theme.primary,
          },
        },
        style: {
          border: {
            fg: theme.border,
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
    const content = this.getSimpleTimeDisplay();
    this.widget.setContent(content);
    this.widget.screen.render();
  }

  private getSimpleTimeDisplay(): string {
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

    // Get this week's data
    const thisWeekStart = today.clone().startOf('isoWeek');
    const days: { day: string; hours: number; isToday: boolean }[] = [];
    
    for (let i = 0; i < 5; i++) { // Mon-Fri
      const date = thisWeekStart.clone().add(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      const seconds = worklogsByDate.get(dateStr) || 0;
      const hours = Math.round((seconds / 3600) * 10) / 10;
      
      days.push({
        day: date.format('ddd'),
        hours: hours,
        isToday: dateStr === today.format('YYYY-MM-DD')
      });
    }

    const thisWeekTotal = days.reduce((sum, d) => sum + d.hours, 0);

    // Build clean display
    const lines: string[] = [];
    lines.push('');
    
    // Days with hours
    days.forEach(({ day, hours, isToday }) => {
      const hourStr = hours.toFixed(1) + 'h';
      const displayDay = isToday ? `{bold}${day}{/bold}` : day;
      const bar = this.getProgressBar(hours, 8, 12);
      
      if (isToday) {
        lines.push(`  {bold}${displayDay}  ${hourStr.padEnd(6)} ${bar}{/bold}`);
      } else if (hours > 0) {
        lines.push(`  ${displayDay}  ${hourStr.padEnd(6)} ${bar}`);
      } else {
        lines.push(`  {gray-fg}${day}  ${hourStr.padEnd(6)} ${bar}{/gray-fg}`);
      }
    });

    // Week total
    lines.push('');
    const weekProgress = Math.round((thisWeekTotal / 40) * 100);
    const totalColor = thisWeekTotal >= 40 ? 'green-fg' : thisWeekTotal >= 30 ? 'yellow-fg' : 'white-fg';
    lines.push(`  {${totalColor}}Week: ${thisWeekTotal.toFixed(1)}h / 40h ({bold}${weekProgress}%{/bold}){/${totalColor}}`);
    lines.push('');

    return lines.join('\n');
  }

  private getProgressBar(hours: number, target: number, maxWidth: number): string {
    const percentage = Math.min(hours / target, 1);
    const filledWidth = Math.round(percentage * maxWidth);
    
    if (hours === 0) {
      return '{gray-fg}' + '─'.repeat(maxWidth) + '{/gray-fg}';
    }
    
    const color = hours >= target ? 'green-fg' : hours > 0 ? 'yellow-fg' : 'gray-fg';
    const filled = '█'.repeat(filledWidth);
    const empty = '─'.repeat(maxWidth - filledWidth);
    
    return `{${color}}${filled}{/}{gray-fg}${empty}{/}`;
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
