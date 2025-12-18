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

type StateListener = (state: TUIState) => void;

export class StateManager {
  private state: TUIState;
  private listeners: Set<StateListener>;

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
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): TUIState {
    return this.state;
  }

  setFocusedPanel(panel: PanelType): void {
    this.state.focusedPanel = panel;
    this.notify();
  }

  setSelectedIndex(panel: PanelType, index: number): void {
    this.state.panels[panel].selectedIndex = index;
    this.notify();
  }

  setScrollOffset(panel: PanelType, offset: number): void {
    this.state.panels[panel].scrollOffset = offset;
    this.notify();
  }

  updateTasks(tasks: { inProgress: JiraIssue[]; open: JiraIssue[] }): void {
    this.state.tasks.inProgress = tasks.inProgress;
    this.state.tasks.open = tasks.open;
    // Combined tasks panel will handle rendering all tasks
    this.notify();
  }

  updateYesterdayTasks(tasks: JiraIssue[]): void {
    this.state.tasks.yesterday = tasks;
    this.notify();
  }

  updateTasksWithWorklogs(tasksWithWorklogs: TaskWithWorklogs[]): void {
    this.state.tasksWithWorklogs = tasksWithWorklogs;
    this.notify();
  }

  updateWorklogs(worklogs: Worklog[]): void {
    this.state.worklogs = worklogs;
    this.notify();
  }

  updateUser(user: UserInfo): void {
    this.state.user = user;
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.notify();
  }

  setStatusMessage(message: string): void {
    this.state.statusMessage = message;
    this.notify();
  }

  setLastRefresh(date: Date | null): void {
    this.state.lastRefresh = date;
    this.notify();
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
}
