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

export class TodoPanel extends BasePanel {
  private onSelectCallback?: (task: any) => Promise<void>;

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'todo', position, '(3) Todo');
    this.onSelectCallback = onSelectCallback;
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const tasks = state.tasks.open.slice(0, 10);  // Limit to 10 tasks

    if (tasks.length === 0) {
      items.push('{gray-fg}No tasks{/gray-fg}');
    } else {
      const selectedIndex = this.state.getState().panels.todo.selectedIndex;
      
      tasks.forEach((task, index) => {
        const issueType = task.fields?.issuetype?.name || 'Task';
        const key = task.key || task.id;
        const summary = task.fields.summary;

        // Show full text for all items
        items.push(`${getIssueIcon(issueType)} ${key}: ${summary}`);
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

    // Update label with position indicator
    this.updateLabelWithPosition('(3) Todo');

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
