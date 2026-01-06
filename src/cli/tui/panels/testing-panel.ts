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

export class TestingPanel extends BasePanel {
  private onSelectCallback?: (task: any) => Promise<void>;

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'testing', position, '');
    this.onSelectCallback = onSelectCallback;
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const taskObjects: any[] = [];

    const underReviewTasks = state.tasks.underReview;
    const readyForTestingTasks = state.tasks.readyForTesting;

    // Add under review tasks
    underReviewTasks.forEach((task) => {
      const key = task.key || task.id;
      const formatted = formatTaskItem({
        key: `Rev - ${key}`,
        summary: task.fields.summary,
        issuetype: task.fields?.issuetype?.name || 'Task',
        priority: task.fields?.priority?.name,
        status: task.fields?.status?.name,
      });
      items.push(formatted);
      taskObjects.push(task);
    });

    // Add ready for testing tasks
    readyForTestingTasks.forEach((task) => {
      const key = task.key || task.id;
      const formatted = formatTaskItem({
        key: `QA - ${key}`,
        summary: task.fields.summary,
        issuetype: task.fields?.issuetype?.name || 'Task',
        priority: task.fields?.priority?.name,
        status: task.fields?.status?.name,
      });
      items.push(formatted);
      taskObjects.push(task);
    });

    // Enhanced empty state
    if (underReviewTasks.length === 0 && readyForTestingTasks.length === 0) {
      items.push('');
      items.push('{center}{gray-fg}╭──────────────────────╮{/gray-fg}{/center}');
      items.push('{center}{white-fg}│ 🧪 No Tests Pending │{/white-fg}{/center}');
      items.push('{center}{gray-fg}╰──────────────────────╯{/gray-fg}{/center}');
      items.push('');
      items.push('{center}{green-fg}✓ All clear!{/green-fg}{/center}');
      items.push('');
      items.push('  {white-fg}r{/white-fg} {gray-fg}→{/gray-fg} {white-fg}Refresh data{/white-fg}');
      items.push('  {white-fg}1{/white-fg} {gray-fg}→{/gray-fg} {white-fg}View Today panel{/white-fg}');
    }

    this.widget.setItems(items);

    // Update state items for navigation
    this.state.getState().panels.testing.items = taskObjects;

    // Update selection
    const selectedIndex = this.state.getState().panels.testing.selectedIndex;
    if (taskObjects.length > 0) {
      const validIndex = Math.min(selectedIndex, taskObjects.length - 1);
      if (validIndex !== selectedIndex) {
        this.state.setSelectedIndex('testing', validIndex);
      }
      this.widget.select(validIndex);
    }

    // Update label with task count
    this.updateLabelWithStats('Testing');

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
