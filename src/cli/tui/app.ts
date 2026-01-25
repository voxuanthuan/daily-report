import blessed from 'neo-blessed';
import axios from 'axios';
import { ConfigManager } from '../../core/config';
import { StateManager, PanelType } from './state';
import { Layout } from './layout';
import { TodayPanel } from './panels/today-panel';
import { TestingPanel } from './panels/testing-panel';
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
import { getTheme, setTheme, getCurrentThemeMode, onThemeChange, markThemeInitialized, ThemeMode } from './theme';
import { ReportPreviewModal } from './modals/report-preview-modal';
import { applyRoundedCorners } from './utils/rounded-corners';

export class TUIApp {
  private screen: blessed.Widgets.Screen;
  private configManager: ConfigManager;
  private state: StateManager;
  private layout: Layout;
  private panels: {
    today: TodayPanel;
    testing: TestingPanel;
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
  private panelOrder: PanelType[] = ['today', 'todo', 'testing', 'timelog'];  // Navigable panels (Details excluded)
  private helpOverlay: blessed.Widgets.BoxElement | null = null;
  
  // Performance optimization
  private cacheManager: CacheManager;
  private requestDeduplicator: RequestDeduplicator;
  private debouncedRender: () => void;
  private loadingIndicator: NodeJS.Timeout | null = null;

  constructor(screen: blessed.Widgets.Screen, configManager: ConfigManager) {
    // CRITICAL: Initialize theme BEFORE creating panels to prevent undefined theme access
    setTheme('dark');
    
    this.screen = screen;
    this.configManager = configManager;
    this.state = new StateManager();

    // Set up error handler for state persistence failures
    this.state.setErrorHandler((message, type) => {
      this.showToast(message, type);
    });

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
      testing: new TestingPanel(
        grid,
        this.state,
        this.layout.positions.testingPanel,
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

    // Apply rounded corners to all panels
    applyRoundedCorners(this.panels.today.getWidget());
    applyRoundedCorners(this.panels.testing.getWidget());
    applyRoundedCorners(this.panels.todo.getWidget());
    applyRoundedCorners(this.panels.details.getWidget());
    applyRoundedCorners(this.panels.timelog.getWidget());

    this.actions = {
      openUrl: new OpenUrlAction(this.configManager),
      logTime: new LogTimeAction(this.screen, this.configManager, ''),
      changeStatus: new ChangeStatusAction(this.screen, this.configManager),
    };

    this.setupGlobalKeys();
    this.setupRenderOptimization();
  }

  private setupGlobalKeys(): void {
    // Vim-style navigation: l for panel right, h for left panel navigation
    // Note: h now free for Ctrl+? help toggle
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

    // Ctrl+? to toggle help (replaces Ctrl+H to avoid conflict with h key)
    this.screen.key(['C-?'], () => {
      this.toggleHelp();
    });

    // Number shortcuts for panels
    this.screen.key(['1'], () => {
      this.state.setFocusedPanel('today');
    });

    this.screen.key(['2'], () => {
      this.state.setFocusedPanel('todo');
    });

    this.screen.key(['3'], () => {
      this.state.setFocusedPanel('testing');
    });

    this.screen.key(['4'], () => {
      this.state.setFocusedPanel('timelog');
    });

    this.screen.key(['r', 'R'], async () => {
      await this.refresh();
    });

    this.screen.key(['C-h'], () => {
      this.toggleHelp();
    });

    // Note: Enter/o handled by panel widgets directly
    // Note: j/k handled by panel widgets for item navigation
    // Global handlers for actions that work on selected task
    this.screen.key(['i'], () => {
      this.showLogTimeMenu();
    });

    this.screen.key(['s'], async () => {
      await this.handleChangeStatus();
    });

    // 'y' to show copy options menu
    this.screen.key(['y'], () => {
      this.showCopyMenu();
    });



    // 'v' to view images (works from any panel if task has images)
    this.screen.key(['v'], async () => {
      const task = this.state.getCurrentTask();
      
      if (task) {
        await this.panels.details.viewImages();
      }
    });

    // 'a' or '/' to show actions menu (help)
    this.screen.key(['a', '/'], () => {  // Using / instead of ? for better compatibility
      this.showActionsMenu();
    });

    // h for left panel navigation (now unconflicted with help toggle)
    this.screen.key(['h'], () => {
      this.navigateToPreviousPanel();
    });

    // Ctrl+ shortcuts for quick actions
    this.screen.key(['C-r'], async () => {
      await this.refresh();
    });

    this.screen.key(['C-c'], async () => {
      await this.handleCopyReport();
    });

    // 'c' to copy daily report
    this.screen.key(['c'], async () => {
      await this.handleCopyReport();
    });

    this.screen.key(['C-q'], () => {
      process.exit(0);
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
          } else if (key.startsWith('panels.testing')) {
            this.panels.testing.render();
          } else if (key.startsWith('panels.todo')) {
            this.panels.todo.render();
          } else if (key.startsWith('panels.details')) {
            this.panels.details.render();
          } else if (key.startsWith('panels.timelog')) {
            this.panels.timelog.render();
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

    // Subscribe to theme changes for UI updates
    onThemeChange(() => {
      this.updateTheme();
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
      await this.loadThemeFromConfig();
      // Mark theme as initialized so listeners can fire on subsequent changes
      markThemeInitialized();
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

  private async loadThemeFromConfig(): Promise<void> {
    try {
      const themeMode = await this.configManager.getTheme();
      setTheme(themeMode as any);
      this.state.setThemeMode(themeMode);
    } catch (error) {
      console.warn('Failed to load theme from config, using default:', error);
      // CRITICAL: Always set a default theme when config fails to prevent undefined theme state
      setTheme('dark');
      this.state.setThemeMode('dark');
    }
  }

  private async loadInitialData(): Promise<void> {
    this.showLoadingIndicator();
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
      this.state.updateUnderReviewTasks(tasks.underReview || []);
      this.state.updateReadyForTestingTasks(tasks.readyForTesting || []);

      this.actions.logTime = new LogTimeAction(
        this.screen,
        this.configManager,
        user.accountId
      );

      this.state.setStatusMessage('Fetching worklogs...');
      const tempoApiToken = await this.configManager.getTempoApiToken();
      const fetcher = new TempoFetcher(user.accountId, tempoApiToken);

      // Use cache for worklogs
      let worklogs = this.cacheManager.get<any>('worklogs');
      if (!worklogs) {
        worklogs = await this.requestDeduplicator.execute('fetchWorklogs', () =>
          fetcher.fetchLastSixDaysWorklogs()
        );
        
        // Enrich worklogs with issue details from Jira API
        this.state.setStatusMessage('Enriching worklogs with issue details...');
        const jiraUrl = await this.configManager.getJiraServer();
        const jiraEmail = await this.configManager.getUsername();
        const jiraApiToken = await this.configManager.getApiToken();
        
        const jiraAxios = axios.create({
          baseURL: jiraUrl,
          auth: {
            username: jiraEmail,
            password: jiraApiToken
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        worklogs = await fetcher.enrichWorklogsWithIssueDetails(worklogs, jiraAxios);
        
        this.cacheManager.set('worklogs', worklogs, 120000); // 2 minutes
      }

      this.state.updateWorklogs(worklogs);

      this.state.setStatusMessage('Processing tasks...');
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
    this.panels.testing.render();
    this.panels.todo.render();
    this.panels.details.render();
    this.panels.status.render();
    this.panels.timelog.render();
  }
  async refresh(): Promise<void> {
    this.showLoadingIndicator();
    try {
      // Clear all caches: app cache, task cache, and Tempo worklog cache
      this.cacheManager.clear();
      clearCaches();
      TempoFetcher.clearCache(); // Clear Tempo worklog cache to get fresh data
      await this.loadInitialData();
      this.hideLoadingIndicator();
      this.renderAllPanels();
      this.panels.status.setMessage('✓ Data refreshed successfully', 'success');
    } catch (error) {
      this.hideLoadingIndicator();
      this.panels.status.setMessage(
        `✗ Refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    }
  }
  
  /**
   * Show a temporary toast message
   * Appears in top-right, auto-dismisses
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info', durationMs: number = 2000): void {
    const theme = getTheme();
    const colorMap = {
      success: 'green',
      error: 'red',
      info: 'cyan',
    };
    const iconMap = {
      success: '\u2713', // checkmark
      error: '\u2717',   // x mark
      info: '\u2139',    // info
    };

    const toast = blessed.box({
      parent: this.screen,
      top: 1,
      right: 2,
      width: Math.min(message.length + 6, 50),
      height: 3,
      content: `{center}{${colorMap[type]}-fg}${iconMap[type]} ${message}{/${colorMap[type]}-fg}{/center}`,
      tags: true,
      border: {
        type: 'line',
        ch: { tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F' }
      } as any,
      style: {
        border: { fg: colorMap[type] },
      },
    });

    this.screen.render();

    setTimeout(() => {
      toast.detach();
      this.screen.render();
    }, durationMs);
  }

  /**
   * Show loading indicator with optional message
   */
  private showLoadingIndicator(message?: string): void {
    // Stop any existing loading indicator first
    this.hideLoadingIndicator();

    // Add animated loading indicator
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frame = 0;
    const displayMessage = message || 'Loading';

    this.loadingIndicator = setInterval(() => {
      const spinner = frames[frame];
      const statusText = `{yellow-fg}${spinner} ${displayMessage}...{/yellow-fg}`;
      this.layout.updateGuideBar(this.guideBar, statusText, this.state.getState().lastRefresh || undefined);
      this.screen.render();
      frame = (frame + 1) % frames.length;
    }, 80);
  }

  /**
   * Hide loading indicator
   */
  private hideLoadingIndicator(): void {
    if (this.loadingIndicator) {
      clearInterval(this.loadingIndicator);
      this.loadingIndicator = null;
      // Restore normal guide bar with sync time
      this.layout.updateGuideBar(this.guideBar, undefined, this.state.getState().lastRefresh || undefined);
      this.screen.render();
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

    // Show result popup
    if (result.success) {
      await this.showResultPopup('✓ Success', result.message || 'Time logged successfully', 'success');
      // Refresh data to show new worklog
      await this.refresh();
    } else if (result.message) {
      this.panels.status.setMessage(result.message, 'info');
    } else {
      await this.showResultPopup('✗ Error', result.error || 'Failed to log time', 'error');
    }
  }

  private async handleLogTimeWithDescription(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.panels.status.setMessage('No task selected', 'warning');
      return;
    }

    // Import the LogTimeAction to access its methods
    const LogTimeActionModule = await import('./actions/log-time.js');
    const logTimeAction = new LogTimeActionModule.LogTimeAction(
      this.screen,
      this.configManager,
      this.state.getState().user?.accountId || ''
    );

    // Create a modified version that asks for description but uses today
    const result = await logTimeAction.executeWithDescription(task);

    // Show result popup
    if (result.success) {
      await this.showResultPopup('✓ Success', result.message || 'Time logged successfully', 'success');
      // Refresh data to show new worklog
      await this.refresh();
    } else if (result.message) {
      this.panels.status.setMessage(result.message, 'info');
    } else {
      await this.showResultPopup('✗ Error', result.error || 'Failed to log time', 'error');
    }
  }

  /**
   * Show a result popup with the outcome of an action
   */
  private showResultPopup(title: string, message: string, type: 'success' | 'error'): Promise<void> {
    return new Promise((resolve) => {
      const theme = getTheme();
      const color = type === 'success' ? 'green' : 'red';
      const icon = type === 'success' ? '✓' : '✗';

      const popup = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 10,
        content: `{center}{bold}{${color}-fg}${icon} ${title}{/${color}-fg}{/bold}\n\n{white-fg}${message}{/white-fg}\n\n{white-fg}Press any key to continue...{/white-fg}{/center}`,
        tags: true,
        border: {
          type: 'line',
          ch: {
            'top': '─',
            'bottom': '─',
            'left': '│',
            'right': '│',
            'tl': '╭',
            'tr': '╮',
            'bl': '╰',
            'br': '╯'
          }
        } as any,
        style: {
          border: {
            fg: color,
          },
        },
        shadow: true,
      });

      const closePopup = () => {
        popup.detach();
        this.screen.render();
        resolve();
      };

      // Close on any key
      popup.key(['escape', 'enter', 'space', 'q'], closePopup);

      // Shorter timeout for success, longer for errors
      const autoCloseMs = type === 'success' ? 2000 : 4000;
      setTimeout(() => {
        if (popup.parent) {
          closePopup();
        }
      }, autoCloseMs);

      popup.focus();
      this.screen.render();
    });
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
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const title = task.fields.summary;
    try {
      await this.copyToClipboard(title);
      this.showToast('Title copied!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Copy failed: ${msg}. Install xclip/xsel?`, 'error');
    }
  }

  private handleCopyTicketId(): void {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const ticketId = task.key || task.id;
    this.copyToClipboard(ticketId).then(() => {
      this.showToast(`Copied: ${ticketId}`, 'success');
    }).catch((error) => {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Copy failed: ${msg}. Install xclip/xsel?`, 'error');
    });
  }

  private async handleCopyDescription(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const description = task.fields.summary;
    try {
      await this.copyToClipboard(description);
      this.showToast('Description copied!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Copy failed: ${msg}. Install xclip/xsel?`, 'error');
    }
  }

  private async handleCopyBoth(): Promise<void> {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const ticketId = task.key || task.id;
    const description = task.fields.summary;
    const fullTicket = `${ticketId}: ${description}`;

    try {
      await this.copyToClipboard(fullTicket);
      this.showToast('Full ticket copied!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Copy failed: ${msg}. Install xclip/xsel?`, 'error');
    }
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

  /**
   * Clean worklog description by removing "Working on issue XXX-123" prefix
   * that Tempo API auto-generates
   */
  private cleanWorklogDescription(description: string): string {
    if (!description) {
      return '';
    }
    
    // Remove "Working on issue XXX-123" pattern (case insensitive)
    // Handles prefixes with numbers like B2B-1292
    const cleaned = description.replace(/^Working on issue\s+[A-Z0-9]+-\d+\s*/i, '');
    return cleaned.trim();
  }

  private async handleCopyReport(): Promise<void> {
    const state = this.state.getState();

    // Build standup report
    const lines: string[] = ['Hi everyone,'];

    // Yesterday section - use smart label (Last Friday on Monday, Yesterday otherwise)
    const { getDateInfo } = await import('../../core/date-utils.js');
    const { previousDayLabel } = getDateInfo();
    lines.push(previousDayLabel);
    if (state.tasksWithWorklogs.length > 0) {
      // Use tasksWithWorklogs to show descriptions as sub-items
      state.tasksWithWorklogs.forEach(({ task, worklogs }) => {
        const key = task.key || task.id;
        const summary = task.fields.summary;
        lines.push(`  - ${key}: ${summary}`);

        // Add worklog descriptions as sub-items with deeper indentation
        worklogs.forEach(worklog => {
          if (worklog.description && worklog.description.trim()) {
            const cleanedDesc = this.cleanWorklogDescription(worklog.description);
            if (cleanedDesc) {
              lines.push(`    - ${cleanedDesc}`);
            }
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

    // Show preview modal
    const modal = new ReportPreviewModal(this.screen, () => {
      this.screen.render();
    });
    modal.show(report);
  }

  private async refreshTasks(): Promise<void> {
    // Call full refresh to update all data including worklogs and time tracking
    await this.refresh();
  }

  private showLogTimeMenu(): void {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const theme = getTheme();
    const key = task.key || task.id;
    const logTimeMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 9,
      label: ` Log Time - ${key} `,
      tags: true,
      border: {
        type: 'line',
        ch: {
          'top': '─',
          'bottom': '─',
          'left': '│',
          'right': '│',
          'tl': '╭',
          'tr': '╮',
          'bl': '╰',
          'br': '╯'
        }
      } as any,
      style: {
        border: { fg: theme.primary },
        selected: { 
          bg: theme.selectedBg,
          fg: theme.selectedFg,
          bold: true 
        },
        item: {
          fg: theme.fg
        }
      },
      keys: true,
      vi: true,
      items: [
        '{cyan-fg}1{/cyan-fg}  Log time (quick - today only)',
        '{cyan-fg}2{/cyan-fg}  Log time with description',
        '{cyan-fg}3{/cyan-fg}  Log time with date & description',
      ]
    });

    logTimeMenu.on('select', async (item, index) => {
      logTimeMenu.detach();
      this.screen.render();

      switch(index) {
        case 0: await this.handleLogTime(false); break;
        case 1: await this.handleLogTimeWithDescription(); break;
        case 2: await this.handleLogTime(true); break;
      }
    });

    logTimeMenu.key(['escape', 'q'], () => {
      logTimeMenu.detach();
      this.screen.render();
    });

    logTimeMenu.focus();
    this.screen.render();
  }

  private showCopyMenu(): void {
    const task = this.state.getCurrentTask();
    if (!task) {
      this.showToast('No task selected - use ↑↓ or hjkl to select', 'error');
      return;
    }

    const theme = getTheme();
    const key = task.key || task.id;
    const copyMenu = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 45,
      height: 8,
      label: ` Copy Options - ${key} `,
      tags: true,
      border: {
        type: 'line',
        ch: {
          'top': '─',
          'bottom': '─',
          'left': '│',
          'right': '│',
          'tl': '╭',
          'tr': '╮',
          'bl': '╰',
          'br': '╯'
        }
      } as any,
      style: {
        border: { fg: theme.primary },
        selected: { 
          bg: theme.selectedBg,
          fg: theme.selectedFg,
          bold: true 
        },
        item: {
          fg: theme.fg
        }
      },
      keys: true,
      vi: true,
      items: [
        '{cyan-fg}1{/cyan-fg}  Copy full ticket (ID + description)',
        '{cyan-fg}2{/cyan-fg}  Copy ticket ID only',
        '{cyan-fg}3{/cyan-fg}  Copy description only',
      ]
    });

    copyMenu.on('select', async (item, index) => {
      copyMenu.detach();
      this.screen.render();

      switch(index) {
        case 0: await this.handleCopyBoth(); break;
        case 1: this.handleCopyTicketId(); break;
        case 2: await this.handleCopyDescription(); break;
      }
    });

    copyMenu.key(['escape', 'q'], () => {
      copyMenu.detach();
      this.screen.render();
    });

    copyMenu.focus();
    this.screen.render();
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
      border: {
        type: 'line',
        ch: {
          'top': '─',
          'bottom': '─',
          'left': '│',
          'right': '│',
          'tl': '╭',
          'tr': '╮',
          'bl': '╰',
          'br': '╯'
        }
      } as any,
      style: {
        border: { fg: theme.primary },
        selected: { 
          bg: theme.selectedBg,  // Dark subtle background
          fg: theme.selectedFg,  // Yellow/accent text
          bold: true 
        },
        item: {
          fg: theme.fg  // Normal text color
        }
      },
      keys: true,
      vi: true,
      items: [
        '{cyan-fg}o{/cyan-fg}  Open in browser',
        '{cyan-fg}i{/cyan-fg}  Log time (menu: quick/description/full)',
        '{cyan-fg}s{/cyan-fg}  Change status',
        '{cyan-fg}y{/cyan-fg}  Copy menu (full/ID/description)',
        '{cyan-fg}c{/cyan-fg}  Copy daily standup report',
        '{cyan-fg}v{/cyan-fg}  View task images',
        '{cyan-fg}r{/cyan-fg}  Refresh all data',
      ]
    });

    actionsMenu.on('select', async (item, index) => {
      actionsMenu.detach();
      this.screen.render();

      switch(index) {
        case 0: await this.handleOpenUrl(); break;
        case 1: this.showLogTimeMenu(); break;
        case 2: await this.handleChangeStatus(); break;
        case 3: this.showCopyMenu(); break;
        case 4: await this.handleCopyReport(); break;
        case 5: await this.panels.details.viewImages(); break;
        case 6: await this.refresh(); break;
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
      border: {
        type: 'line',
        ch: {
          'top': '─',
          'bottom': '─',
          'left': '│',
          'right': '│',
          'tl': '╭',
          'tr': '╮',
          'bl': '╰',
          'br': '╯'
        }
      } as any,
      scrollable: true,
      keys: true,
      vi: true,
      style: {
        border: {
          fg: theme.primary,
        },
      },
      content: `
{bold}Jira Daily Report - Quick Reference{/bold}

{bold}Essential Shortcuts:{/bold}
  {cyan-fg}jkl{/cyan-fg}      Navigate (Vim-style)
  {cyan-fg}Tab{/cyan-fg}      Cycle panels
  {cyan-fg}Enter{/cyan-fg}  Open in browser
  {cyan-fg}i{/cyan-fg}      Log time menu
  {cyan-fg}y{/cyan-fg}      Copy menu
  {cyan-fg}c{/cyan-fg}      Copy report
  {cyan-fg}Ctrl+?{/cyan-fg}   Toggle help

{bold}Panel Navigation:{/bold}
  {cyan-fg}1{/cyan-fg} Today  {cyan-fg}2{/cyan-fg} Todo  {cyan-fg}3{/cyan-fg} Testing  {cyan-fg}4{/cyan-fg} Timelog

{bold}More Actions:{/bold}
  {cyan-fg}s{/cyan-fg}      Change status
  {cyan-fg}v{/cyan-fg}      View images
  {cyan-fg}a{/cyan-fg}      Actions menu
  {cyan-fg}r{/cyan-fg}      Refresh
  {cyan-fg}q{/cyan-fg}      Quit

{bold}Quick Keys:{/bold}
  {cyan-fg}Ctrl+T{/cyan-fg}  Change theme
  {cyan-fg}Ctrl+R{/cyan-fg}  Quick refresh
  {cyan-fg}Ctrl+C{/cyan-fg}  Copy report

{white-fg}Press Ctrl+? or ESC to close{/white-fg}
      `,
    });

    this.helpOverlay.key(['C-?', 'escape'], () => {
      this.toggleHelp();
    });

    this.helpOverlay.focus();
    this.screen.render();
  }

  cleanup(): void {
    this.hideLoadingIndicator();
    this.screen.destroy();
  }

  private updateTheme(): void {
    const theme = getTheme();
    
    // Apply theme background to screen
    const { applyBackgroundToScreen } = require('./theme');
    applyBackgroundToScreen(this.screen, theme);
    
    this.layout.updateGuideBar(this.guideBar, undefined, this.state.getState().lastRefresh || undefined);
    this.renderAllPanels();
  }
}
