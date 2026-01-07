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
  private formattedItemCache: Map<string, string> = new Map();
  private timeLoggedCache: Map<string, number> = new Map();
  private lastWorklogsHash: string = '';

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    onSelectCallback?: (task: any) => Promise<void>
  ) {
    super(grid, state, 'today', position, '');
    this.onSelectCallback = onSelectCallback;
    this.overrideSubscribe();
  }

  private overrideSubscribe(): void {
    const originalSubscribe = (this as any).subscribe;
    const baseSubscribe = originalSubscribe.bind(this);
    
    (this as any).subscribe = () => {
      this.state.subscribe((state, changedKeys) => {
        if (!changedKeys) {
          this.render();
          return;
        }

        const shouldRender = changedKeys.has('*') ||
          changedKeys.has('tasks') ||
          changedKeys.has('tasks.inProgress') ||
          changedKeys.has('tasks.yesterday') ||
          changedKeys.has('worklogs') ||
          changedKeys.has('panels.today');

        if (shouldRender) {
          this.render();
        }
      });
    };
  }

  render(): void {
    const state = this.state.getState();
    const items: string[] = [];
    const taskObjects: any[] = [];

    const worklogsHash = JSON.stringify(state.worklogs);
    const worklogsChanged = worklogsHash !== this.lastWorklogsHash;
    
    if (worklogsChanged) {
      this.timeLoggedCache.clear();
      this.lastWorklogsHash = worklogsHash;
    }

    let totalSeconds = 0;

    const getTimeLogged = (taskKey: string): number => {
      if (this.timeLoggedCache.has(taskKey)) {
        return this.timeLoggedCache.get(taskKey)!;
      }

      const worklogs = state.worklogs || {};
      let taskSeconds = 0;
      
      Object.values(worklogs).forEach((dayWorklogs: any) => {
        if (Array.isArray(dayWorklogs)) {
          dayWorklogs.forEach(log => {
            if (log.issue?.key === taskKey) {
              taskSeconds += log.timeSpentSeconds || 0;
            }
          });
        }
      });
      
      this.timeLoggedCache.set(taskKey, taskSeconds);
      return taskSeconds;
    };

    const formatTimeBadge = (seconds: number): string => {
      if (seconds === 0) {
        return '';
      }
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours > 0) {
        return minutes > 0 ? ` {cyan-fg}${hours}h ${minutes}m{/cyan-fg}` : ` {cyan-fg}${hours}h{/cyan-fg}`;
      }
      return ` {cyan-fg}${minutes}m{/cyan-fg}`;
    };

    const todayTasks = state.tasks.inProgress;
    const yesterdayTasks = state.tasks.yesterday;

    todayTasks.forEach((task) => {
      const key = task.key || task.id;
      const timeLogged = getTimeLogged(key);
      totalSeconds += timeLogged;
      
      const cacheKey = `To-${key}`;
      let formatted = this.formattedItemCache.get(cacheKey);
      
      if (!formatted) {
        formatted = formatTaskItem({
          key: `To - ${key}`,
          summary: task.fields.summary,
          issuetype: task.fields?.issuetype?.name || 'Task',
          priority: task.fields?.priority?.name,
          status: task.fields?.status?.name,
        });
        this.formattedItemCache.set(cacheKey, formatted);
      }
      
      const timeBadge = formatTimeBadge(timeLogged);
      items.push(formatted + timeBadge);
      taskObjects.push(task);
    });

    yesterdayTasks.forEach((task) => {
      const key = task.key || task.id;
      const timeLogged = getTimeLogged(key);
      totalSeconds += timeLogged;
      
      const cacheKey = `Ye-${key}`;
      let formatted = this.formattedItemCache.get(cacheKey);
      
      if (!formatted) {
        formatted = formatTaskItem({
          key: `Ye - ${key}`,
          summary: task.fields.summary,
          issuetype: task.fields?.issuetype?.name || 'Task',
          priority: task.fields?.priority?.name,
          status: task.fields?.status?.name,
        });
        this.formattedItemCache.set(cacheKey, formatted);
      }
      
      const timeBadge = formatTimeBadge(timeLogged);
      items.push(formatted + timeBadge);
      taskObjects.push(task);
    });

    if (todayTasks.length === 0 && yesterdayTasks.length === 0) {
      items.push('');
      items.push('{center}{gray-fg}╭────────────────────╮{/gray-fg}{/center}');
      items.push('{center}{white-fg}│   📋 No Tasks Yet  │{/white-fg}{/center}');
      items.push('{center}{gray-fg}╰────────────────────╯{/gray-fg}{/center}');
      items.push('');
      items.push('{center}{cyan-fg}⚡ Quick Actions{/cyan-fg}{/center}');
      items.push('');
      items.push('  {white-fg}r{/white-fg} {gray-fg}→{/gray-fg} {white-fg}Refresh data{/white-fg}');
      items.push('  {white-fg}2{/white-fg} {gray-fg}→{/gray-fg} {white-fg}View TODO list{/white-fg}');
      items.push('  {white-fg}?{/white-fg} {gray-fg}→{/gray-fg} {white-fg}Show help{/white-fg}');
    }

    this.widget.setItems(items);

    this.state.getState().panels.today.items = taskObjects;

    const selectedIndex = this.state.getState().panels.today.selectedIndex;
    if (taskObjects.length > 0) {
      const validIndex = Math.min(selectedIndex, taskObjects.length - 1);
      if (validIndex !== selectedIndex) {
        this.state.setSelectedIndex('today', validIndex);
      }
      this.widget.select(validIndex);
    }

    const totalHours = totalSeconds / 3600;
    let statsText = '';
    if (totalSeconds > 0) {
      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);
      if (hours > 0) {
        statsText = minutes > 0 ? ` • ${hours}h ${minutes}m` : ` • ${hours}h`;
      } else {
        statsText = ` • ${minutes}m`;
      }
    }
    
    this.updateLabelWithStats('Today', statsText);

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
