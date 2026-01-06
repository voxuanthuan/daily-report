import blessed from 'neo-blessed';
import contrib from 'blessed-contrib';
import { getTheme, onThemeChange } from './theme';

export interface LayoutPositions {
  todayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  testingPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  todoPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  detailsPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  timelogPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  guideBar: { bottom: number; left: number; width: string; height: number };
}

/**
 * Panel size constants for different terminal size categories
 * Improves maintainability and visual hierarchy
 */
const PANEL_SIZES = {
  standard: {
    today: { rows: 5, cols: 7 },        // Wider for full text
    testing: { rows: 3, cols: 7 },      // Wider for full text
    todo: { rows: 4, cols: 7 },         // Wider for full text
    details: { rows: 9, cols: 5 },      // Narrower - still readable
    timelog: { rows: 3, cols: 5 },      // Narrower - less priority
  },
  small: {
    today: { rows: 4, cols: 6 },
    testing: { rows: 3, cols: 6 },
    todo: { rows: 5, cols: 6 },
    details: { rows: 9, cols: 6 },
    timelog: { rows: 3, cols: 6 },
  },
  tiny: {
    today: { rows: 3, cols: 12 },
    testing: { rows: 3, cols: 12 },
    todo: { rows: 3, cols: 12 },
    details: { rows: 6, cols: 12 },
    timelog: { rows: 3, cols: 12 },
  },
} as const;

export class Layout {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  public positions: LayoutPositions;
  private terminalSize: { width: number; height: number };

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
    this.terminalSize = { 
      width: screen.width as number || 120, 
      height: screen.height as number || 40 
    };

    // Calculate responsive positions based on terminal size
    this.positions = this.calculatePositions();

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    this.screen.on('resize', () => {
      this.handleResize();
    });
  }
  
  /**
   * Calculate panel positions based on terminal size
   */
  private calculatePositions(): LayoutPositions {
    const isSmall = this.terminalSize.width < 100;
    const isTiny = this.terminalSize.width < 80;
    
    if (isTiny) {
      // Stack panels vertically for very small terminals
      const sizes = PANEL_SIZES.tiny;
      return {
        todayPanel: { row: 0, col: 0, rowSpan: sizes.today.rows, colSpan: sizes.today.cols },
        todoPanel: { row: 3, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        testingPanel: { row: 7, col: 0, rowSpan: sizes.testing.rows, colSpan: sizes.testing.cols },
        detailsPanel: { row: 9, col: 0, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 15, col: 0, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else if (isSmall) {
      // Compact layout for small terminals - optimized for narrow screens
      const sizes = PANEL_SIZES.small;
      return {
        todayPanel: { row: 0, col: 0, rowSpan: sizes.today.rows, colSpan: sizes.today.cols },
        todoPanel: { row: 4, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        testingPanel: { row: 9, col: 0, rowSpan: sizes.testing.rows, colSpan: sizes.testing.cols },
        detailsPanel: { row: 0, col: 6, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 9, col: 6, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else {
      // Default layout for standard terminals - prioritizes task panels with more width
      const sizes = PANEL_SIZES.standard;
      return {
        todayPanel: { row: 0, col: 0, rowSpan: sizes.today.rows, colSpan: sizes.today.cols },
        todoPanel: { row: 5, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        testingPanel: { row: 9, col: 0, rowSpan: sizes.testing.rows, colSpan: sizes.testing.cols },
        detailsPanel: { row: 0, col: 7, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 9, col: 7, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    }
  }
  
  /**
   * Handle terminal resize
   */
  private handleResize(): void {
    this.terminalSize = {
      width: this.screen.width as number || 120,
      height: this.screen.height as number || 40,
    };
    
    // Recalculate positions for new terminal size
    this.positions = this.calculatePositions();
    
    // Trigger render
    this.screen.render();
  }

  getGrid(): any {
    return this.grid;
  }

  createGuideBar(): blessed.Widgets.BoxElement {
    const theme = getTheme();
    const guideBar = blessed.box({
      bottom: this.positions.guideBar.bottom,
      left: this.positions.guideBar.left,
      width: this.positions.guideBar.width,
      height: this.positions.guideBar.height,
      tags: true,
      style: {
        bg: theme.bg,
        fg: theme.fg,
      },
      content: this.formatGuideBarContent(),
    });

    this.screen.append(guideBar);
    this.setupThemeListener(guideBar);
    return guideBar;
  }

  private setupThemeListener(guideBar: blessed.Widgets.BoxElement): void {
    onThemeChange(() => {
      const theme = getTheme();
      if (guideBar.style) {
        guideBar.style.bg = theme.bg;
        guideBar.style.fg = theme.fg;
      }
    });
  }

  private formatGuideBarContent(lastSync?: Date): string {
    let syncInfo = '';
    if (lastSync) {
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        syncInfo = `{cyan-fg}✓ Synced just now{/cyan-fg}`;
      } else if (diffMins < 60) {
        syncInfo = `{cyan-fg}✓ Synced ${diffMins}m ago{/cyan-fg}`;
      } else {
        syncInfo = `{cyan-fg}✓ Synced ${diffHours}h ago{/cyan-fg}`;
      }
    }

    const shortcuts = [
      `{white-fg}LogTime:/{white-fg} {cyan-fg}i{/cyan-fg}`,
      `{white-fg}Copy:/{white-fg} {cyan-fg}y{/cyan-fg}`,
      `{white-fg}Title:/{white-fg} {cyan-fg}t{/cyan-fg}`,
      `{white-fg}Status:/{white-fg} {cyan-fg}s{/cyan-fg}`,
      `{white-fg}Actions:/{white-fg} {cyan-fg}a{/cyan-fg}`,
      `{white-fg}Refresh:/{white-fg} {cyan-fg}r{/cyan-fg}`,
    ];

    const shortcutsStr = shortcuts.join(' {gray-fg}|{/gray-fg} ');

    if (syncInfo) {
      return `${syncInfo}  {gray-fg}│{/gray-fg}  ${shortcutsStr}`;
    }
    return shortcutsStr;
  }

  updateGuideBar(guideBar: blessed.Widgets.BoxElement, spinner?: string, lastSync?: Date): void {
    if (spinner) {
      guideBar.setContent(`{cyan-fg}${spinner}{/cyan-fg} {gray-fg}│{/gray-fg} ${this.formatGuideBarContent(lastSync)}`);
    } else {
      guideBar.setContent(this.formatGuideBarContent(lastSync));
    }
  }
  
  /**
   * Get current terminal size category
   */
  getTerminalSizeCategory(): 'tiny' | 'small' | 'standard' | 'large' {
    if (this.terminalSize.width < 80) {
      return 'tiny';
    }
    if (this.terminalSize.width < 100) {
      return 'small';
    }
    if (this.terminalSize.width < 140) {
      return 'standard';
    }
    return 'large';
  }
}
