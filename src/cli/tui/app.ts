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
import { CacheManager, RequestDeduplicator, debounce } from './utils/cache';
import { getTheme } from './theme';

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
  
  // Performance optimization
  private cacheManager: CacheManager;
  private requestDeduplicator: RequestDeduplicator;
  private debouncedRender: () => void;
  private loadingIndicator: NodeJS.Timeout | null = null;

  constructor(screen: blessed.Widgets.Screen, configManager: ConfigManager) {
    this.screen = screen;
    this.configManager = configManager;
    this.state = new StateManager();
    this.layout = new Layout(screen);
    
    // Initialize performance optimizations
    this.cacheManager = new CacheManager(300000); // 5 minute cache
    this.requestDeduplicator = new RequestDeduplicator();
    this.debouncedRender = debounce(() => {
      this.screen.render();
    }, 16); // ~60fps

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
      status: new StatusPanel(this.state),
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
    this.setupRenderOptimization();
  }

  private setupGlobalKeys(): void {
    // Vim-style navigation: h/l for panel left/right
    this.screen.key(['h'], () => {
      this.navigateToPreviousPanel();
    });

    this.screen.key(['l'], () => {
      this.navigateToNextPanel();
    });

    // Tab navigation between panels (keep for compatibility)
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
    // Note: j/k handled by panel widgets for item navigation
    // Global handlers for actions that work on selected task
    this.screen.key(['i'], async () => {
      await this.handleLogTime(false);
    });

    this.screen.key(['I', 'S-i'], async () => {
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

    // Shift+Y to copy ticket ID
    this.screen.key(['Y', 'S-y'], () => {
      this.handleCopyTicketId();
    });

    // 'c' to copy daily standup report
    this.screen.key(['c'], async () => {
      await this.handleCopyReport();
    });

    // 'v' to view images (works from any panel if task has images)
    this.screen.key(['v'], async () => {
      const task = this.state.getCurrentTask();
      
      if (task) {
        await this.panels.details.viewImages();
      }
    });

    // 'a' to show actions menu
    this.screen.key(['a'], () => {
      this.showActionsMenu();
    });
  }
  
  /**
   * Setup render optimization with debouncing
   */
  private setupRenderOptimization(): void {
    // Subscribe to state changes with debounced rendering
    this.state.subscribe((state, changedKeys) => {
      // Only re-render panels that actually changed
      if (changedKeys) {
        changedKeys.forEach(key => {
          if (key === 'focusedPanel' || key === '*') {
            this.renderAllPanels();
          } else if (key.startsWith('panels.today')) {
            this.panels.today.render();
          } else if (key.startsWith('panels.yesterday')) {
            this.panels.yesterday.render();
          } else if (key.startsWith('panels.todo')) {
            this.panels.todo.render();
          } else if (key.startsWith('panels.details')) {
            this.panels.details.render();
          } else if (key === 'tasks' || key === 'worklogs' || key === 'tasksWithWorklogs') {
            this.renderAllPanels();
          } else if (key === 'statusMessage' || key === 'loading') {
            this.panels.status.render();
          }
        });
      }
      
      // Use debounced render
      this.debouncedRender();
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
    this.showLoadingIndicator('Loading data...');
    this.state.setLoading(true);
    this.state.setStatusMessage('Loading data...');

    try {
      // Use cache for tasks if available
      let tasks = this.cacheManager.get<any>('tasks');
      let user = this.cacheManager.get<any>('user');
      
      // Deduplicate concurrent requests
      const taskPromise = tasks ? Promise.resolve(tasks) : 
        this.requestDeduplicator.execute('fetchTasks', () => fetchAllTasks(this.configManager));
      const userPromise = user ? Promise.resolve(user) : 
        this.requestDeduplicator.execute('fetchUser', () => fetchUserDisplayName(this.configManager));
      
      [tasks, user] = await Promise.all([taskPromise, userPromise]);
      
      // Cache the results
      this.cacheManager.set('tasks', tasks, 180000); // 3 minutes
      this.cacheManager.set('user', user, 600000); // 10 minutes

      this.state.updateUser(user);
      this.state.updateTasks(tasks);

      this.actions.logTime = new LogTimeAction(
        this.screen,
        this.configManager,
        user.accountId
      );

      this.updateLoadingIndicator('Fetching worklogs...');
      const tempoApiToken = await this.configManager.getTempoApiToken();
      const fetcher = new TempoFetcher(user.accountId, tempoApiToken);
      
      // Use cache for worklogs
      let worklogs = this.cacheManager.get<any>('worklogs');
      if (!worklogs) {
        worklogs = await this.requestDeduplicator.execute('fetchWorklogs', () => 
          fetcher.fetchLastSixDaysWorklogs()
        );
        this.cacheManager.set('worklogs', worklogs, 120000); // 2 minutes
      }

      this.state.updateWorklogs(worklogs);

      this.updateLoadingIndicator('Processing tasks...');
      const yesterdayResult = await extractPreviousWorkdayTasks(
        worklogs,
        user.accountId,
        this.configManager
      );
      this.state.updateYesterdayTasks(yesterdayResult.tasks);
      if (yesterdayResult.tasksWithWorklogs) {
        this.state.updateTasksWithWorklogs(yesterdayResult.tasksWithWorklogs);
      }

      this.hideLoadingIndicator();
      this.state.setLoading(false);
      this.state.setLastRefresh(new Date());
      
      // Update status bar with statistics
      this.panels.status.updateStats(tasks, worklogs);
      
      this.state.setStatusMessage('Ready');
    } catch (error) {
      this.hideLoadingIndicator();
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
      // Clear both app cache and core caches
      this.cacheManager.clear();
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
  
  /**
   * Show loading indicator
   */
  private showLoadingIndicator(message: string): void {
    this.panels.status.setMessage(`⏳ ${message}`, 'info');
    // Optional: Add animated loading indicator
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frame = 0;
    
    this.loadingIndicator = setInterval(() => {
      this.panels.status.setMessage(`${frames[frame]} ${message}`, 'info');
      frame = (frame + 1) % frames.length;
    }, 80);
  }
  
  /**
   * Update loading indicator message
   */
  private updateLoadingIndicator(message: string): void {
    if (this.loadingIndicator) {
      this.hideLoadingIndicator();
      this.showLoadingIndicator(message);
    }
  }
  
  /**
   * Hide loading indicator
   */
  private hideLoadingIndicator(): void {
    if (this.loadingIndicator) {
      clearInterval(this.loadingIndicator);
      this.loadingIndicator = null;
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

  private handleCopyTicketId(): void {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const ticketId = task.key || task.id;
    this.copyToClipboard(ticketId).then(() => {
      this.panels.status.setMessage(`Copied ticket ID: ${ticketId}`, 'success');
    }).catch(() => {
      // Error already handled in copyToClipboard
    });
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
    if (state.tasksWithWorklogs.length > 0) {
      // Use tasksWithWorklogs to show descriptions as sub-items
      state.tasksWithWorklogs.forEach(({ task, worklogs }) => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`  - ${key}: ${summary}`);

        // Add worklog descriptions as sub-items with deeper indentation
        worklogs.forEach(worklog => {
          if (worklog.description && worklog.description.trim()) {
            lines.push(`    - ${worklog.description}`);
          }
        });
      });
    } else if (state.tasks.yesterday.length > 0) {
      // Fallback to old format if tasksWithWorklogs is not available
      state.tasks.yesterday.forEach(task => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`  - ${key}: ${summary}`);
      });
    } else {
      lines.push('  - No tasks');
    }

    // Today section
    lines.push('Today');
    if (state.tasks.inProgress.length === 0) {
      lines.push('  - No tasks');
    } else {
      state.tasks.inProgress.forEach(task => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`  - ${key}: ${summary}`);
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

  private showActionsMenu(): void {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    const theme = getTheme();
    const key = task.key || task.id;
    const actionsMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 14,
      label: ` Actions for ${key} `,
      tags: true,
      border: 'line',
      style: {
        border: { fg: theme.primary },  // Use primary color (Crail)
        selected: { bg: theme.primary, fg: 'white' }  // Use primary color (Crail)
      },
      keys: true,
      vi: true,
      items: [
        '{cyan-fg}o{/cyan-fg}  Open in browser',
        '{cyan-fg}i{/cyan-fg}  Log time (today)',
        '{cyan-fg}I{/cyan-fg}  Log time (with date & description)',
        '{cyan-fg}s{/cyan-fg}  Change status',
        '{cyan-fg}yy{/cyan-fg} Copy task title',
        '{cyan-fg}Y{/cyan-fg}  Copy ticket ID',
        '{cyan-fg}c{/cyan-fg}  Copy daily report',
        '{cyan-fg}v{/cyan-fg}  View images',
        '{cyan-fg}r{/cyan-fg}  Refresh data',
      ]
    });

    // Set rounded borders
    (actionsMenu as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    actionsMenu.on('select', async (item, index) => {
      actionsMenu.detach();
      this.screen.render();
      
      switch(index) {
        case 0: await this.handleOpenUrl(); break;
        case 1: await this.handleLogTime(false); break;
        case 2: await this.handleLogTime(true); break;
        case 3: await this.handleChangeStatus(); break;
        case 4: await this.handleCopyTitle(); break;
        case 5: this.handleCopyTicketId(); break;
        case 6: await this.handleCopyReport(); break;
        case 7: await this.panels.details.viewImages(); break;
        case 8: await this.refresh(); break;
      }
    });

    actionsMenu.key(['escape', 'q'], () => {
      actionsMenu.detach();
      this.screen.render();
    });

    actionsMenu.focus();
    this.screen.render();
  }

  private toggleHelp(): void {
    if (this.helpOverlay) {
      this.helpOverlay.detach();
      this.helpOverlay = null;
      this.screen.render();
      return;
    }

    const theme = getTheme();
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
          fg: theme.primary,  // Use primary color (Crail)
        },
      },
      content: `
{bold}Jira Daily Report - Interactive TUI{/bold}

{bold}Vim-Style Navigation:{/bold}
  h / l              Navigate panels (left/right)
  j / k              Navigate tasks (down/up)
  Tab / Shift-Tab    Navigate panels (alternative)
  1 / 2 / 3 / 0      Jump to specific panel

{bold}Panel Shortcuts:{/bold}
  1                  TODAY panel
  2                  YESTERDAY panel
  3                  TODO panel
  0                  DETAILS panel

{bold}Actions:{/bold}
  Enter / o          Open selected task in browser
  i                  Log time to selected task (today, no description)
  I (Shift+i)        Log time with date and description
  s                  Change task status
  yy                 Copy task title to clipboard (from focused panel)
  Y (Shift+y)        Copy ticket ID to clipboard (e.g., GRAP-12345)
  c                  Copy daily standup report (Yesterday/Today/Blockers)
  r / R              Refresh all data
  q                  Quit application
  ?                  Toggle this help screen

{bold}Layout:{/bold}
  Left Panels        TODAY [1], YESTERDAY [2], TODO [3]
  Right Top          DETAILS [0] - Task details (expanded for better viewing)
  Right Bottom       TIMELOG - Weekly time summary (compact)

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
    this.hideLoadingIndicator();
    this.screen.destroy();
  }
}
