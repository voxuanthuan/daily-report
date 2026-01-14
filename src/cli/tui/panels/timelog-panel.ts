import blessed from 'neo-blessed';
import { StateManager } from '../state';
import { BasePanel } from './base-panel';
import moment from 'moment-timezone';

interface DateGroup {
  date: string;
  displayDate: string;
  worklogs: Array<{
    task: {
      id: string;
      key: string;
      summary: string;
    };
    timeSpentSeconds: number;
    description?: string;
    tempoWorklogId: number;
  }>;
  totalSeconds: number;
}

export class TimeLogPanel extends BasePanel {
  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number }
  ) {
    super(grid, state, 'timelog', position, '[4] ⏱️  Time Tracking');
  }

  render(): void {
    const state = this.state.getState();
    const worklogs = state.worklogs;

    // Group worklogs by date
    const dateGroups = new Map<string, DateGroup>();
    
    worklogs.forEach((log, index) => {
      const date = log.startDate;
      if (!dateGroups.has(date)) {
        dateGroups.set(date, {
          date: date,
          displayDate: moment(date).format('dddd, MMMM D, YYYY'),
          worklogs: [],
          totalSeconds: 0
        });
      }
      
      const group = dateGroups.get(date)!;
      
      // Use enriched issue data from Jira API
      const taskKey = log.issue.key || `ID-${(log.issue as any).id}`;
      const taskSummary = log.issue.summary || 'No summary available';
      
      group.worklogs.push({
        task: {
          id: taskKey,
          key: taskKey,
          summary: taskSummary
        },
        timeSpentSeconds: log.timeSpentSeconds,
        description: log.description,
        tempoWorklogId: log.tempoWorklogId
      });
      group.totalSeconds += log.timeSpentSeconds;
    });

    // Convert to array and sort by date (most recent first)
    const sortedDates = Array.from(dateGroups.values()).sort((a, b) => 
      b.date.localeCompare(a.date)
    );

    // Build display items
    const displayItems: string[] = [];
    let grandTotalSeconds = 0;

    if (sortedDates.length === 0) {
      displayItems.push('');
      displayItems.push('{center}{gray-fg}No worklogs found{/gray-fg}{/center}');
      displayItems.push('');
    } else {
      sortedDates.forEach((dateGroup) => {
        const hours = (dateGroup.totalSeconds / 3600).toFixed(1);
        const taskCount = dateGroup.worklogs.length;
        const taskText = taskCount === 1 ? 'task' : 'tasks';
        
        // Format: "Monday, January 13, 2026 • 7.5h • 3 tasks"
        const line = `{bold}{yellow-fg}${dateGroup.displayDate}{/yellow-fg}{/bold} • {green-fg}${hours}h{/green-fg} • {cyan-fg}${taskCount} ${taskText}{/cyan-fg}`;
        
        displayItems.push(line);
        grandTotalSeconds += dateGroup.totalSeconds;
      });

      // Add summary at bottom
      displayItems.push('');
      const totalHours = (grandTotalSeconds / 3600).toFixed(1);
      const totalDays = sortedDates.length;
      displayItems.push(`{bold}Total: {green-fg}${totalHours}h{/green-fg} across {white-fg}${totalDays} days{/white-fg}{/bold}`);
    }

    // Update panel state with date groups (not individual worklogs)
    state.panels.timelog.items = sortedDates;

    // Set widget content
    this.widget.setItems(displayItems);

    // Restore selection
    const selectedIndex = state.panels.timelog.selectedIndex;
    if (selectedIndex < displayItems.length) {
      this.widget.select(selectedIndex);
    }

    // Update label with stats
    const hours = (grandTotalSeconds / 3600).toFixed(1);
    const stats = grandTotalSeconds > 0 ? ` • ${hours}h` : '';
    this.updateLabelWithStats('[4] ⏱️  Time Tracking', stats);

    this.widget.screen.render();
  }

  async onSelect(): Promise<void> {
    // When user presses Enter on a date, the Details panel will show all worklogs for that date
  }
}
