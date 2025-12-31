import { BasePanel } from './base-panel';
import { StateManager } from '../state';
import { formatTaskItem } from '../theme';

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
    super(grid, state, 'today', position, '(1) Today');
    this.onSelectCallback = onSelectCallback;
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const tasks = state.tasks.inProgress;

    if (tasks.length === 0) {
      items.push('{gray-fg}No tasks in progress{/gray-fg}');
      items.push('');
      items.push('{cyan-fg}💡 Actions:{/cyan-fg}');
      items.push('{white-fg}  • Press {/white-fg}{yellow-fg}r{/yellow-fg}{white-fg} to refresh data{/white-fg}');
      items.push('{white-fg}  • Go to Jira & update task status{/white-fg}');
    } else {
      tasks.forEach((task) => {
        const formatted = formatTaskItem({
          key: task.key || task.id,
          summary: task.fields.summary,
          issuetype: task.fields?.issuetype?.name || 'Task',
          priority: task.fields?.priority?.name,
          status: task.fields?.status?.name,
        });
        items.push(formatted);
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

    // Update label with position indicator
    this.updateLabelWithPosition('(1) Today');

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
