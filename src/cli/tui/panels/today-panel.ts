import { BasePanel } from './base-panel';
import { StateManager } from '../state';
import { getIssueIcon } from '../theme';

interface JiraIssue {
  id: string;
  key?: string;
  fields: {
    summary: string;
    status: { name: string };
    issuetype?: { name: string };
    priority?: { name: string };
    [key: string]: any;
  };
}

export class TodayPanel extends BasePanel {
  private onSelectCallback?: (task: any) => Promise<void>;

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'today', position, '[1] Today');
    this.onSelectCallback = onSelectCallback;
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const tasks = state.tasks.inProgress;

    if (tasks.length === 0) {
      items.push('{gray-fg}No tasks{/gray-fg}');
    } else {
      tasks.forEach(task => {
        const issueType = task.fields?.issuetype?.name || 'Task';
        const key = task.key || task.id;
        const summary = task.fields.summary;

        // Truncate summary to fit panel width
        const maxWidth = 35;
        const truncatedSummary = summary.length > maxWidth
          ? summary.substring(0, maxWidth - 3) + '...'
          : summary;

        items.push(`${getIssueIcon(issueType)} ${key}: ${truncatedSummary}`);
      });
    }

    this.widget.setItems(items);

    // Update state items for navigation
    this.state.getState().panels.today.items = tasks;

    // Update selection
    const selectedIndex = this.state.getState().panels.today.selectedIndex;
    if (tasks.length > 0) {
      const validIndex = Math.min(selectedIndex, tasks.length - 1);
      if (validIndex !== selectedIndex) {
        this.state.setSelectedIndex('today', validIndex);
      }
      this.widget.select(validIndex);
    }

    this.widget.screen.render();
  }

  async onSelect(): Promise<void> {
    const task = this.getSelectedItem();
    if (task && this.onSelectCallback) {
      try {
        await this.onSelectCallback(task);
      } catch (error) {
        console.error('Error in onSelect callback:', error);
      }
    }
  }
}
