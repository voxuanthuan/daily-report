import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

interface Worklog {
  tempoWorklogId: number;
  issue: {
    key: string;
    summary: string;
  };
  timeSpentSeconds: number;
  startDate: string;
  author: {
    accountId: string;
  };
  description?: string;
}

interface UserInfo {
  accountId: string;
  displayName: string;
  emailAddress: string;
}

export interface TaskWithWorklogs {
  task: JiraIssue;
  worklogs: Array<{ description?: string; timeSpentSeconds: number }>;
}

export interface PanelState {
  selectedIndex: number;
  scrollOffset: number;
  items: any[];
}

export type PanelType = 'today' | 'yesterday' | 'todo' | 'details';

export interface TUIState {
  panels: {
    today: PanelState;
    yesterday: PanelState;
    todo: PanelState;
    details: PanelState;
  };
  focusedPanel: PanelType;
  tasks: {
    inProgress: JiraIssue[];
    open: JiraIssue[];
    yesterday: JiraIssue[];
  };
  tasksWithWorklogs: TaskWithWorklogs[];
  worklogs: Worklog[];
  user: UserInfo | null;
  loading: boolean;
  statusMessage: string;
  lastRefresh: Date | null;
}

// Selective listener for specific state changes
type StateListener = (state: TUIState, changedKeys?: Set<string>) => void;

// Memoization cache
interface MemoCache<T> {
  value: T | null;
  dependencies: any[];
}

export class StateManager {
  private state: TUIState;
  private listeners: Set<StateListener>;
  private previousState: TUIState | null = null;

  // Memoization caches
  private memoCache: Map<string, MemoCache<any>>;

  // State persistence
  private persistencePath: string;
  private persistenceEnabled: boolean = true;
  private errorHandler?: (message: string, type: 'success' | 'error' | 'info') => void;

  constructor() {
    this.state = {
      panels: {
        today: { selectedIndex: 0, scrollOffset: 0, items: [] },
        yesterday: { selectedIndex: 0, scrollOffset: 0, items: [] },
        todo: { selectedIndex: 0, scrollOffset: 0, items: [] },
        details: { selectedIndex: 0, scrollOffset: 0, items: [] },
      },
      focusedPanel: 'today',
      tasks: {
        inProgress: [],
        open: [],
        yesterday: [],
      },
      tasksWithWorklogs: [],
      worklogs: [],
      user: null,
      loading: false,
      statusMessage: 'Ready',
      lastRefresh: null,
    };
    this.listeners = new Set();
    this.memoCache = new Map();
    
    // Set up persistence path
    this.persistencePath = path.join(os.homedir(), '.jira-tui-state.json');
    
    // Try to restore previous state
    this.restoreState();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set error handler for state operations
   */
  setErrorHandler(handler: (message: string, type: 'success' | 'error' | 'info') => void): void {
    this.errorHandler = handler;
  }

  /**
   * Notify listeners with selective rendering support
   * Only notifies if specific parts of state have changed
   */
  private notify(changedKeys?: Set<string>): void {
    // Detect what changed by comparing with previous state
    const actualChangedKeys = changedKeys || this.detectChanges();
    
    // Only notify if something actually changed
    if (actualChangedKeys.size > 0) {
      this.listeners.forEach(listener => listener(this.state, actualChangedKeys));
      
      // Update previous state for next comparison
      this.previousState = JSON.parse(JSON.stringify(this.state));
      
      // Persist state if enabled
      if (this.persistenceEnabled) {
        this.persistState();
      }
    }
  }

  /**
   * Detect which parts of state have changed
   */
  private detectChanges(): Set<string> {
    const changed = new Set<string>();
    
    if (!this.previousState) {
      // First time, everything is new
      return new Set(['*']);
    }

    // Check each top-level property
    if (this.state.focusedPanel !== this.previousState.focusedPanel) {
      changed.add('focusedPanel');
    }
    
    if (this.state.loading !== this.previousState.loading) {
      changed.add('loading');
    }
    
    if (this.state.statusMessage !== this.previousState.statusMessage) {
      changed.add('statusMessage');
    }
    
    // Check panels (by reference or deep comparison)
    (Object.keys(this.state.panels) as PanelType[]).forEach(panel => {
      if (JSON.stringify(this.state.panels[panel]) !== JSON.stringify(this.previousState!.panels[panel])) {
        changed.add(`panels.${panel}`);
      }
    });
    
    // Check tasks
    if (JSON.stringify(this.state.tasks) !== JSON.stringify(this.previousState.tasks)) {
      changed.add('tasks');
    }
    
    if (JSON.stringify(this.state.worklogs) !== JSON.stringify(this.previousState.worklogs)) {
      changed.add('worklogs');
    }

    return changed;
  }

  getState(): TUIState {
    return this.state;
  }

  setFocusedPanel(panel: PanelType): void {
    if (this.state.focusedPanel !== panel) {
      this.state.focusedPanel = panel;
      this.notify(new Set(['focusedPanel']));
    }
  }

  setSelectedIndex(panel: PanelType, index: number): void {
    if (this.state.panels[panel].selectedIndex !== index) {
      this.state.panels[panel].selectedIndex = index;
      this.notify(new Set([`panels.${panel}`]));
    }
  }

  setScrollOffset(panel: PanelType, offset: number): void {
    if (this.state.panels[panel].scrollOffset !== offset) {
      this.state.panels[panel].scrollOffset = offset;
      // Scroll changes don't need full notify, can be batched
      this.notify(new Set([`panels.${panel}.scroll`]));
    }
  }

  updateTasks(tasks: { inProgress: JiraIssue[]; open: JiraIssue[] }): void {
    this.state.tasks.inProgress = tasks.inProgress;
    this.state.tasks.open = tasks.open;
    this.invalidateMemoCache('taskStats');
    this.notify(new Set(['tasks']));
  }

  updateYesterdayTasks(tasks: JiraIssue[]): void {
    this.state.tasks.yesterday = tasks;
    this.notify(new Set(['tasks.yesterday']));
  }

  updateTasksWithWorklogs(tasksWithWorklogs: TaskWithWorklogs[]): void {
    this.state.tasksWithWorklogs = tasksWithWorklogs;
    this.notify(new Set(['tasksWithWorklogs']));
  }

  updateWorklogs(worklogs: Worklog[]): void {
    this.state.worklogs = worklogs;
    this.invalidateMemoCache('worklogStats');
    this.notify(new Set(['worklogs']));
  }

  updateUser(user: UserInfo): void {
    this.state.user = user;
    this.notify(new Set(['user']));
  }

  setLoading(loading: boolean): void {
    if (this.state.loading !== loading) {
      this.state.loading = loading;
      this.notify(new Set(['loading']));
    }
  }

  setStatusMessage(message: string): void {
    if (this.state.statusMessage !== message) {
      this.state.statusMessage = message;
      this.notify(new Set(['statusMessage']));
    }
  }

  setLastRefresh(date: Date | null): void {
    this.state.lastRefresh = date;
    this.notify(new Set(['lastRefresh']));
  }

  getSelectedItem(panel: PanelType): any {
    const panelState = this.state.panels[panel];
    if (panelState.selectedIndex >= 0 && panelState.selectedIndex < panelState.items.length) {
      return panelState.items[panelState.selectedIndex];
    }
    return null;
  }

  getCurrentTask(): JiraIssue | null {
    const panel = this.state.focusedPanel;
    if (panel === 'today' || panel === 'yesterday' || panel === 'todo') {
      return this.getSelectedItem(panel);
    }
    return null;
  }

  // Memoization utilities

  /**
   * Memoize a computed value with dependencies
   */
  private memoize<T>(key: string, fn: () => T, dependencies: any[]): T {
    const cached = this.memoCache.get(key);
    
    if (cached) {
      // Check if dependencies have changed
      const depsChanged = dependencies.some((dep, i) => dep !== cached.dependencies[i]);
      if (!depsChanged && cached.value !== null) {
        return cached.value;
      }
    }
    
    // Compute new value
    const value = fn();
    this.memoCache.set(key, { value, dependencies });
    return value;
  }

  /**
   * Invalidate memoization cache
   */
  private invalidateMemoCache(key?: string): void {
    if (key) {
      this.memoCache.delete(key);
    } else {
      this.memoCache.clear();
    }
  }

  /**
   * Get computed task statistics (memoized)
   */
  getTaskStats(): { total: number; inProgress: number; open: number; yesterday: number } {
    return this.memoize('taskStats', () => ({
      total: this.state.tasks.inProgress.length + this.state.tasks.open.length,
      inProgress: this.state.tasks.inProgress.length,
      open: this.state.tasks.open.length,
      yesterday: this.state.tasks.yesterday.length,
    }), [
      this.state.tasks.inProgress.length,
      this.state.tasks.open.length,
      this.state.tasks.yesterday.length,
    ]);
  }

  /**
   * Get computed worklog statistics (memoized)
   */
  getWorklogStats(): { totalHoursToday: number; totalHoursThisWeek: number } {
    return this.memoize('worklogStats', () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      const todayWorklogs = this.state.worklogs.filter(w => w.startDate === today);
      const totalSecondsToday = todayWorklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
      
      // Calculate this week (last 7 days)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekWorklogs = this.state.worklogs.filter(w => new Date(w.startDate) >= weekAgo);
      const totalSecondsThisWeek = thisWeekWorklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
      
      return {
        totalHoursToday: totalSecondsToday / 3600,
        totalHoursThisWeek: totalSecondsThisWeek / 3600,
      };
    }, [this.state.worklogs.length]);
  }

  // State persistence

  /**
   * Persist state to disk
   */
  private persistState(): void {
    try {
      const persistData = {
        focusedPanel: this.state.focusedPanel,
        panels: this.state.panels,
        lastRefresh: this.state.lastRefresh,
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(this.persistencePath, JSON.stringify(persistData, null, 2));
    } catch (error) {
      console.error('Failed to persist state:', error);
      // Notify user if error handler is set
      if (this.errorHandler) {
        this.errorHandler('Failed to save state', 'error');
      }
    }
  }

  /**
   * Restore state from disk
   */
  private restoreState(): void {
    try {
      if (!fs.existsSync(this.persistencePath)) {
        return;
      }
      
      const data = fs.readFileSync(this.persistencePath, 'utf-8');
      const persistData = JSON.parse(data);
      
      // Only restore if data is recent (within 24 hours)
      const timestamp = new Date(persistData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        this.state.focusedPanel = persistData.focusedPanel || this.state.focusedPanel;
        // Don't restore panel items, only positions
        Object.keys(persistData.panels || {}).forEach((panel) => {
          const panelKey = panel as PanelType;
          if (this.state.panels[panelKey]) {
            this.state.panels[panelKey].selectedIndex = persistData.panels[panelKey].selectedIndex || 0;
            this.state.panels[panelKey].scrollOffset = persistData.panels[panelKey].scrollOffset || 0;
          }
        });
      }
    } catch (error) {
      // Silently fail - if we can't restore, just start fresh
      console.error('Failed to restore state:', error);
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        fs.unlinkSync(this.persistencePath);
      }
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  }

  /**
   * Enable/disable state persistence
   */
  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }
}

