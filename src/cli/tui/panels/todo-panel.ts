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
  private formattedItemCache: Map<string, string> = new Map();

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'todo', position, '');
    this.onSelectCallback = onSelectCallback;
    this.overrideSubscribe();
  }

  private overrideSubscribe(): void {
    (this as any).subscribe = () => {
      this.state.subscribe((state, changedKeys) => {
        if (!changedKeys) {
          this.render();
          return;
        }

        const shouldRender = changedKeys.has('*') ||
          changedKeys.has('tasks') ||
          changedKeys.has('tasks.open') ||
          changedKeys.has('panels.todo');

        if (shouldRender) {
          this.render();
        }
      });
    };
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const tasks = state.tasks.open;

    if (tasks.length === 0) {
      items.push('');
      items.push('{center}{gray-fg}╭────────────────────╮{/gray-fg}{/center}');
      items.push('{center}{white-fg}│  📝 No Open Tasks  │{/white-fg}{/center}');
      items.push('{center}{gray-fg}╰────────────────────╯{/gray-fg}{/center}');
    } else {
      tasks.forEach((task) => {
        const key = task.key || task.id;
        let formatted = this.formattedItemCache.get(key);
        
        if (!formatted) {
          formatted = formatTaskItem({
            key: key,
            summary: task.fields.summary,
            issuetype: task.fields?.issuetype?.name || 'Task',
            priority: task.fields?.priority?.name,
            status: task.fields?.status?.name,
          });
          this.formattedItemCache.set(key, formatted);
        }
        
        items.push(formatted);
      });
    }

    this.widget.setItems(items);

    this.state.getState().panels.todo.items = tasks;

    const selectedIndex = this.state.getState().panels.todo.selectedIndex;
    if (tasks.length > 0) {
      const validIndex = Math.min(selectedIndex, tasks.length - 1);
      if (validIndex !== selectedIndex) {
        this.state.setSelectedIndex('todo', validIndex);
      }
      this.widget.select(validIndex);
    }

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
