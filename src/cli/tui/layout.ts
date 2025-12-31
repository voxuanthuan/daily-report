import blessed from 'neo-blessed';
import contrib from 'blessed-contrib';
import { getTheme } from './theme';

export interface LayoutPositions {
  todayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  yesterdayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
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
    today: { rows: 5, cols: 5 },
    yesterday: { rows: 3, cols: 5 },
    todo: { rows: 4, cols: 5 },
    details: { rows: 9, cols: 7 },      // Bigger - high priority
    timelog: { rows: 3, cols: 7 },      // Smaller - low priority
  },
  small: {
    today: { rows: 4, cols: 6 },
    yesterday: { rows: 3, cols: 6 },
    todo: { rows: 5, cols: 6 },
    details: { rows: 9, cols: 6 },      // Bigger - high priority
    timelog: { rows: 3, cols: 6 },      // Smaller - low priority
  },
  tiny: {
    today: { rows: 3, cols: 12 },
    yesterday: { rows: 3, cols: 12 },
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
        yesterdayPanel: { row: 3, col: 0, rowSpan: sizes.yesterday.rows, colSpan: sizes.yesterday.cols },
        todoPanel: { row: 6, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        detailsPanel: { row: 9, col: 0, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 15, col: 0, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else if (isSmall) {
      // Compact layout for small terminals - optimized for narrow screens
      const sizes = PANEL_SIZES.small;
      return {
        todayPanel: { row: 0, col: 0, rowSpan: sizes.today.rows, colSpan: sizes.today.cols },
        yesterdayPanel: { row: 4, col: 0, rowSpan: sizes.yesterday.rows, colSpan: sizes.yesterday.cols },
        todoPanel: { row: 7, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        detailsPanel: { row: 0, col: 6, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 9, col: 6, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else {
      // Default layout for standard terminals - prioritizes Today and Details panels
      const sizes = PANEL_SIZES.standard;
      return {
        todayPanel: { row: 0, col: 0, rowSpan: sizes.today.rows, colSpan: sizes.today.cols },
        yesterdayPanel: { row: 5, col: 0, rowSpan: sizes.yesterday.rows, colSpan: sizes.yesterday.cols },
        todoPanel: { row: 8, col: 0, rowSpan: sizes.todo.rows, colSpan: sizes.todo.cols },
        detailsPanel: { row: 0, col: 5, rowSpan: sizes.details.rows, colSpan: sizes.details.cols },
        timelogPanel: { row: 9, col: 5, rowSpan: sizes.timelog.rows, colSpan: sizes.timelog.cols },
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
    const guideBar = blessed.box({
      bottom: this.positions.guideBar.bottom,
      left: this.positions.guideBar.left,
      width: this.positions.guideBar.width,
      height: this.positions.guideBar.height,
      tags: true,
      style: {
        bg: 'black',
        fg: 'white',
      },
      content: this.formatGuideBarContent(),
    });

    this.screen.append(guideBar);
    return guideBar;
  }

  private formatGuideBarContent(lastSync?: Date): string {
    const theme = getTheme();
    const action = 'white-fg';   // White for action names
    const key = 'yellow-fg';     // Yellow for keyboard shortcuts
    const sep = 'gray-fg';       // Grey for separators
    const info = 'cyan-fg';      // Cyan for info

    // Calculate sync time
    let syncInfo = '';
    if (lastSync) {
      const now = new Date();
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        syncInfo = `{${info}}✓ Synced just now{/${info}}`;
      } else if (diffMins < 60) {
        syncInfo = `{${info}}✓ Synced ${diffMins}m ago{/${info}}`;
      } else {
        syncInfo = `{${info}}✓ Synced ${diffHours}h ago{/${info}}`;
      }
    }

    // Simplified shortcuts for space
    const shortcuts = [
      `{${action}}LogTime:{/${action}} {${key}}i{/${key}}`,
      `{${action}}Copy:{/${action}} {${key}}y{/${key}}`,
      `{${action}}Title:{/${action}} {${key}}t{/${key}}`,
      `{${action}}Status:{/${action}} {${key}}s{/${key}}`,
      `{${action}}Help:{/${action}} {${key}}?{/${key}}`,
      `{${action}}Refresh:{/${action}} {${key}}r{/${key}}`,
    ];

    const shortcutsStr = shortcuts.join(` {${sep}}|{/${sep}} `);

    if (syncInfo) {
      return `${syncInfo}  {${sep}}│{/${sep}}  ${shortcutsStr}`;
    }
    return shortcutsStr;
  }

  updateGuideBar(guideBar: blessed.Widgets.BoxElement, spinner?: string, lastSync?: Date): void {
    if (spinner) {
      // Show spinner at the start of guide bar, keep shortcuts visible
      const yellow = 'yellow-fg';
      const grey = 'gray-fg';
      guideBar.setContent(`{${yellow}}${spinner}{/${yellow}} {${grey}}│{/${grey}} ${this.formatGuideBarContent(lastSync)}`);
    } else {
      // Show normal guide bar with sync info
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
