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

export class TodoPanel extends BasePanel {
  private onSelectCallback?: (task: any) => Promise<void>;

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'todo', position, '');
    this.onSelectCallback = onSelectCallback;
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const tasks = state.tasks.open;  // Show all open tasks

    // Enhanced empty state
    if (tasks.length === 0) {
      items.push('');
      items.push('{center}{gray-fg}╭────────────────────╮{/gray-fg}{/center}');
      items.push('{center}{white-fg}│  📝 No Open Tasks  │{/white-fg}{/center}');
      items.push('{center}{gray-fg}╰────────────────────╯{/gray-fg}{/center}');
      items.push('');
      items.push('{center}{cyan-fg}⚡ Quick Actions{/cyan-fg}{/center}');
      items.push('');
      items.push('  {white-fg}r{/white-fg} {gray-fg}→{/gray-fg} {white-fg}Refresh from Jira{/white-fg}');
      items.push('  {white-fg}1{/white-fg} {gray-fg}→{/gray-fg} {white-fg}View Today panel{/white-fg}');
      items.push('  {white-fg}?{/white-fg} {gray-fg}→{/gray-fg} {white-fg}Show help{/white-fg}');
    } else {
      // Show all tasks (high priority tasks already have visual indicators from formatTaskItem)
      tasks.forEach((task) => {
        const key = task.key || task.id;
        const formatted = formatTaskItem({
          key: `To - ${key}`,
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
    this.state.getState().panels.todo.items = tasks;

    // Update selection
    const selectedIndex = this.state.getState().panels.todo.selectedIndex;
    if (tasks.length > 0) {
      const validIndex = Math.min(selectedIndex, tasks.length - 1);
      if (validIndex !== selectedIndex) {
        this.state.setSelectedIndex('todo', validIndex);
      }
      this.widget.select(validIndex);
    }

    // Update label with task count
    this.updateLabelWithStats('Todo');

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
