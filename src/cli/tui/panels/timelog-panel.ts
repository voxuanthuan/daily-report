import blessed from 'neo-blessed';
import { StateManager } from '../state';
import { getTheme, onThemeChange } from '../theme';
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
        label: ' ⏱️  Time Tracking ',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true,
        mouse: true,
        border: {
          type: 'line',
        },
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
        padding: {
          left: 1,
          right: 1,
          top: 0,
          bottom: 0,
        },
      }
    );

    this.subscribe();
    this.setupThemeListener();
  }

  private subscribe(): void {
    this.state.subscribe(() => {
      this.render();
    });
  }

  private setupThemeListener(): void {
    onThemeChange(() => {
      this.updateTheme();
    });
  }

  private updateTheme(): void {
    const theme = getTheme();
    
    // Explicitly update all style properties
    if (this.widget.style) {
      // Update border color with null safety
      if (this.widget.style.border && theme.border) {
        this.widget.style.border.fg = theme.border;
      }
      
      // Update foreground color only - background is transparent
      if (theme.fg) {
        this.widget.style.fg = theme.fg;
      }
    }
    
    this.render();
    this.widget.screen.render();
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

    // Week header with date range
    const weekStart = thisWeekStart.format('MMM D');
    const weekEnd = thisWeekStart.clone().add(4, 'days').format('MMM D');
    lines.push(`{bold}Week: ${weekStart} - ${weekEnd}{/bold}`);
    lines.push('');

    // Days with enhanced progress bars
    days.forEach(({ day, hours, isToday }) => {
      const hourStr = hours.toFixed(1).padStart(5) + 'h';
      const dayLabel = isToday ? `{bold}{underline}${day}{/underline}{/bold}` : day;
      const bar = this.getEnhancedProgressBar(hours, 8, 15);
      const goalIndicator = hours < 8 ? ' {gray-fg}│{/gray-fg}' : '';

      if (isToday) {
        lines.push(`  ${dayLabel} ${hourStr} ${bar} {cyan-fg}<{/cyan-fg}${goalIndicator}`);
      } else if (hours >= 8) {
        lines.push(`  ${dayLabel} ${hourStr} ${bar} {green-fg}✓{/green-fg}`);
      } else if (hours > 0) {
        lines.push(`  ${dayLabel} ${hourStr} ${bar}${goalIndicator}`);
      } else {
        lines.push(`  {white-fg}${day} ${hourStr} ${bar}{/white-fg}${goalIndicator}`);
      }
    });

    // Week summary with goal indicator
    lines.push('');
    const weekColor = thisWeekTotal >= 40 ? 'green' : thisWeekTotal >= 32 ? 'yellow' : 'white';
    const goalIndicator = thisWeekTotal >= 40 ? ' ✓ Goal reached!' : '';
    lines.push(`  {${weekColor}-fg}{bold}Total: ${thisWeekTotal.toFixed(1)}h{/bold} / 40h${goalIndicator}{/${weekColor}-fg}`);
    lines.push('');

    return lines.join('\n');
  }

  private getProgressBar(hours: number, target: number, maxWidth: number): string {
    const percentage = Math.min(hours / target, 1);
    const filledWidth = Math.round(percentage * maxWidth);

    if (hours === 0) {
      return '{white-fg}' + '─'.repeat(maxWidth) + '{/white-fg}';
    }

    const color = hours >= target ? 'green-fg' : hours > 0 ? 'yellow-fg' : 'gray-fg';
    const filled = '█'.repeat(filledWidth);
    const empty = '─'.repeat(maxWidth - filledWidth);

    return `{${color}}${filled}{/}{white-fg}${empty}{/}`;
  }

  private getEnhancedProgressBar(hours: number, target: number, width: number): string {
    const percentage = Math.min(hours / target, 1);
    const filledWidth = Math.round(percentage * width);

    // Use different characters for visual appeal (░, ▒, ▓, █)
    let filled = '';
    const remaining = width - filledWidth;

    // Determine shading based on progress percentage
    if (percentage >= 0.75) {
      filled = '\u2588'.repeat(filledWidth);     // Full block ▓█
    } else if (percentage >= 0.5) {
      filled = '\u2593'.repeat(filledWidth);     // Dark shade ▓
    } else if (percentage >= 0.25) {
      filled = '\u2592'.repeat(filledWidth);     // Medium shade ▒
    } else {
      filled = '\u2591'.repeat(filledWidth);     // Light shade ░
    }

    const empty = '\u2591'.repeat(remaining);    // Light shade for empty space

    let color = 'gray';
    if (hours >= target) {
      color = 'green';
    } else if (hours >= target * 0.5) {
      color = 'yellow';
    } else if (hours > 0) {
      color = 'cyan';
    }

    return `{${color}-fg}${filled}{/}{white-fg}${empty}{/}`;
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
