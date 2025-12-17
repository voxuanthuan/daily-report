import blessed from 'blessed';
import { ConfigManager } from '../../core/config';
import { StateManager, PanelType } from './state';
import { Layout } from './layout';
import { TodayPanel } from './panels/today-panel';
import { YesterdayPanel } from './panels/yesterday-panel';
import { TodoPanel } from './panels/todo-panel';
import { DetailsPanel } from './panels/details-panel';
import { StatusPanel } from './panels/status-panel';
import { TimeLogPanel } from './panels/timelog-panel';
import { OpenUrlAction } from './actions/open-url';
import { LogTimeAction } from './actions/log-time';
import { ChangeStatusAction } from './actions/change-status';
import { fetchAllTasks, fetchUserDisplayName, extractPreviousWorkdayTasks, clearCaches } from '../../core/task-fetcher';
import TempoFetcher from '../../core/tempo/fetcher';

export class TUIApp {
  private screen: blessed.Widgets.Screen;
  private configManager: ConfigManager;
  private state: StateManager;
  private layout: Layout;
  private panels: {
    today: TodayPanel;
    yesterday: YesterdayPanel;
    todo: TodoPanel;
    details: DetailsPanel;
    status: StatusPanel;
    timelog: TimeLogPanel;
  };
  private guideBar: blessed.Widgets.BoxElement;
  private actions: {
    openUrl: OpenUrlAction;
    logTime: LogTimeAction;
    changeStatus: ChangeStatusAction;
  };
  private panelOrder: PanelType[] = ['today', 'yesterday', 'todo', 'details'];  // Navigable panels
  private helpOverlay: blessed.Widgets.BoxElement | null = null;
  private lastYKeyTime: number = 0;

  constructor(screen: blessed.Widgets.Screen, configManager: ConfigManager) {
    this.screen = screen;
    this.configManager = configManager;
    this.state = new StateManager();
    this.layout = new Layout(screen);

    const grid = this.layout.getGrid();

    this.panels = {
      today: new TodayPanel(
        grid,
        this.state,
        this.layout.positions.todayPanel,
        this.handleTaskSelect.bind(this)
      ),
      yesterday: new YesterdayPanel(
        grid,
        this.state,
        this.layout.positions.yesterdayPanel,
        this.handleTaskSelect.bind(this)
      ),
      todo: new TodoPanel(
        grid,
        this.state,
        this.layout.positions.todoPanel,
        this.handleTaskSelect.bind(this)
      ),
      details: new DetailsPanel(
        grid,
        this.state,
        this.layout.positions.detailsPanel,
        this.configManager
      ),
      status: new StatusPanel(
        this.layout.createStatusBar(),
        this.state
      ),
      timelog: new TimeLogPanel(
        grid,
        this.state,
        this.layout.positions.timelogPanel
      ),
    };

    // Create guide bar at the bottom
    this.guideBar = this.layout.createGuideBar();

    this.actions = {
      openUrl: new OpenUrlAction(this.configManager),
      logTime: new LogTimeAction(this.screen, this.configManager, ''),
      changeStatus: new ChangeStatusAction(this.screen, this.configManager),
    };

    this.setupGlobalKeys();
  }

  private setupGlobalKeys(): void {
    // Tab navigation between panels
    this.screen.key(['tab'], () => {
      this.navigateToNextPanel();
    });

    this.screen.key(['S-tab'], () => {
      this.navigateToPreviousPanel();
    });

    // Number shortcuts for panels
    this.screen.key(['1'], () => {
      this.state.setFocusedPanel('today');
    });

    this.screen.key(['2'], () => {
      this.state.setFocusedPanel('yesterday');
    });

    this.screen.key(['3'], () => {
      this.state.setFocusedPanel('todo');
    });

    this.screen.key(['0'], () => {
      this.state.setFocusedPanel('details');
    });

    this.screen.key(['r', 'R'], async () => {
      await this.refresh();
    });

    this.screen.key(['?'], () => {
      this.toggleHelp();
    });

    // Note: Enter/o handled by panel widgets directly
    // Global handlers for actions that work on selected task
    this.screen.key(['l'], async () => {
      await this.handleLogTime(false);
    });

    this.screen.key(['L', 'S-l'], async () => {
      await this.handleLogTime(true);
    });

    this.screen.key(['s'], async () => {
      await this.handleChangeStatus();
    });

    // 'yy' to copy task title - double 'y' within 500ms
    this.screen.key(['y'], () => {
      const now = Date.now();
      if (now - this.lastYKeyTime < 500) {
        // Double 'y' pressed
        this.handleCopyTitle();
        this.lastYKeyTime = 0;
      } else {
        // First 'y' pressed
        this.lastYKeyTime = now;
      }
    });

    // 'c' to copy daily standup report
    this.screen.key(['c'], async () => {
      await this.handleCopyReport();
    });
  }

  private navigateToNextPanel(): void {
    const currentPanel = this.state.getState().focusedPanel;
    const currentIndex = this.panelOrder.indexOf(currentPanel);
    const nextIndex = (currentIndex + 1) % this.panelOrder.length;
    this.state.setFocusedPanel(this.panelOrder[nextIndex]);
  }

  private navigateToPreviousPanel(): void {
    const currentPanel = this.state.getState().focusedPanel;
    const currentIndex = this.panelOrder.indexOf(currentPanel);
    const previousIndex = currentIndex === 0 ? this.panelOrder.length - 1 : currentIndex - 1;
    this.state.setFocusedPanel(this.panelOrder[previousIndex]);
  }


  async initialize(): Promise<void> {
    try {
      await this.loadInitialData();
      this.state.setFocusedPanel('today');
      this.renderAllPanels();
      this.screen.render();
    } catch (error) {
      this.panels.status.setMessage(
        `Error initializing: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    }
  }

  private async loadInitialData(): Promise<void> {
    this.state.setLoading(true);
    this.state.setStatusMessage('Loading data...');

    try {
      const [tasks, user] = await Promise.all([
        fetchAllTasks(this.configManager),
        fetchUserDisplayName(this.configManager),
      ]);

      this.state.updateUser(user);
      this.state.updateTasks(tasks);

      this.actions.logTime = new LogTimeAction(
        this.screen,
        this.configManager,
        user.accountId
      );

      const tempoApiToken = await this.configManager.getTempoApiToken();
      const fetcher = new TempoFetcher(user.accountId, tempoApiToken);
      const worklogs = await fetcher.fetchLastSixDaysWorklogs();

      this.state.updateWorklogs(worklogs);

      const yesterdayResult = await extractPreviousWorkdayTasks(
        worklogs,
        user.accountId,
        this.configManager
      );
      this.state.updateYesterdayTasks(yesterdayResult.tasks);

      this.state.setLoading(false);
      this.state.setLastRefresh(new Date());
      this.state.setStatusMessage('Ready');
    } catch (error) {
      this.state.setLoading(false);
      throw error;
    }
  }

  private renderAllPanels(): void {
    this.panels.today.render();
    this.panels.yesterday.render();
    this.panels.todo.render();
    this.panels.details.render();
    this.panels.status.render();
    this.panels.timelog.render();
  }

  async refresh(): Promise<void> {
    this.panels.status.setMessage('Refreshing data...', 'info');
    try {
      clearCaches();
      await this.loadInitialData();
      this.renderAllPanels();
      this.panels.status.setMessage('Data refreshed', 'success');
    } catch (error) {
      this.panels.status.setMessage(
        `Refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    }
  }

  private async handleTaskSelect(task: any): Promise<void> {
    await this.handleOpenUrl();
  }

  private async handleOpenUrl(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const result = await this.actions.openUrl.execute(task);
    if (result.success) {
      this.panels.status.setMessage(result.message || 'Opened in browser', 'success');
    } else {
      this.panels.status.setMessage(result.error || 'Failed to open URL', 'error');
    }
  }

  private async handleLogTime(withDateAndDescription: boolean = false): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const result = await this.actions.logTime.execute(task, withDateAndDescription);
    if (result.success) {
      this.panels.status.setMessage(result.message || 'Time logged', 'success');
      // Refresh data to show new worklog
      await this.refresh();
    } else if (result.message) {
      this.panels.status.setMessage(result.message, 'info');
    } else {
      this.panels.status.setMessage(result.error || 'Failed to log time', 'error');
    }
  }

  private async handleChangeStatus(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const result = await this.actions.changeStatus.execute(task);
    if (result.success) {
      this.panels.status.setMessage(result.message || 'Status changed', 'success');
      await this.refreshTasks();
    } else if (result.message) {
      this.panels.status.setMessage(result.message, 'info');
    } else {
      this.panels.status.setMessage(result.error || 'Failed to change status', 'error');
    }
  }

  private async handleCopyTitle(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const title = task.fields.summary;
    await this.copyToClipboard(title);
    const truncatedTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;
    this.panels.status.setMessage(`Copied: "${truncatedTitle}"`, 'success');
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      const clipboardModule = await import('clipboardy');
      const clipboard: any = clipboardModule.default || clipboardModule;

      if (clipboard && typeof clipboard.write === 'function') {
        await clipboard.write(text);
      } else {
        throw new Error('Clipboard write function not available');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.panels.status.setMessage(`Copy failed: ${errorMsg}`, 'error');
      throw error;
    }
  }

  private async handleCopyReport(): Promise<void> {
    const state = this.state.getState();

    // Build standup report
    const lines: string[] = ['Hi everyone,'];

    // Yesterday section
    lines.push('Yesterday');
    if (state.tasks.yesterday.length === 0) {
      lines.push('• No tasks');
    } else {
      state.tasks.yesterday.forEach(task => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`• ${key}: ${summary}`);
      });
    }

    // Today section
    lines.push('Today');
    if (state.tasks.inProgress.length === 0) {
      lines.push('• No tasks');
    } else {
      state.tasks.inProgress.forEach(task => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`• ${key}: ${summary}`);
      });
    }

    // Blockers section
    lines.push('No blockers');

    const report = lines.join('\n');

    try {
      await this.copyToClipboard(report);
      this.panels.status.setMessage('Daily standup report copied to clipboard!', 'success');
    } catch (error) {
      // Error already handled in copyToClipboard
    }
  }

  private async refreshTasks(): Promise<void> {
    try {
      const tasks = await fetchAllTasks(this.configManager);
      this.state.updateTasks(tasks);
      this.renderAllPanels();
    } catch (error) {
      this.panels.status.setMessage('Failed to refresh tasks', 'error');
    }
  }

  private toggleHelp(): void {
    if (this.helpOverlay) {
      this.helpOverlay.detach();
      this.helpOverlay = null;
      this.screen.render();
      return;
    }

    this.helpOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '70%',
      label: ' Help ',
      tags: true,
      border: 'line',
      scrollable: true,
      keys: true,
      vi: true,
      style: {
        border: {
          fg: 'cyan',
        },
      },
      content: `
{bold}Jira Daily Report - Interactive TUI{/bold}

{bold}Panel Navigation:{/bold}
  Tab / Shift-Tab    Navigate between panels
  1                  Jump to TODAY panel
  2                  Jump to YESTERDAY panel
  3                  Jump to TODO panel
  0                  Jump to DETAILS panel

{bold}Task Navigation:{/bold}
  j / ↓              Move down in task list
  k / ↑              Move up in task list
  g / Home           Jump to top of current panel
  G / End            Jump to bottom of current panel
  PageUp / PageDown  Scroll by page

{bold}Actions:{/bold}
  Enter / o          Open selected task in browser
  l                  Log time to selected task (today, no description)
  L                  Log time with date and description
  s                  Change task status
  yy                 Copy task title to clipboard (from focused panel)
  c                  Copy daily standup report (Yesterday/Today/Blockers)
  i                  Open images in browser (when viewing details)
  r / R              Refresh all data
  q                  Quit application
  ?                  Toggle this help screen

{bold}Layout:{/bold}
  Left Panels        TODAY [1], YESTERDAY [2], TODO [3]
  Right Panel        DETAILS [0] - Selected task details

{cyan-fg}Press ? or ESC to close this help screen{/cyan-fg}
      `,
    });

    // Set rounded border characters
    (this.helpOverlay as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    this.helpOverlay.key(['?', 'escape'], () => {
      this.toggleHelp();
    });

    this.helpOverlay.focus();
    this.screen.render();
  }

  cleanup(): void {
    this.screen.destroy();
  }
}
