import blessed from 'blessed';
import contrib from 'blessed-contrib';

export interface LayoutPositions {
  todayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  yesterdayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  todoPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  detailsPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  timelogPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  guideBar: { bottom: number; left: number; width: string; height: number };
}

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
      return {
        todayPanel: { row: 0, col: 0, rowSpan: 3, colSpan: 12 },
        yesterdayPanel: { row: 3, col: 0, rowSpan: 3, colSpan: 12 },
        todoPanel: { row: 6, col: 0, rowSpan: 3, colSpan: 12 },
        detailsPanel: { row: 9, col: 0, rowSpan: 6, colSpan: 12 },
        timelogPanel: { row: 15, col: 0, rowSpan: 3, colSpan: 12 },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else if (isSmall) {
      // Compact layout for small terminals
      return {
        todayPanel: { row: 0, col: 0, rowSpan: 4, colSpan: 6 },
        yesterdayPanel: { row: 4, col: 0, rowSpan: 4, colSpan: 6 },
        todoPanel: { row: 8, col: 0, rowSpan: 4, colSpan: 6 },
        detailsPanel: { row: 0, col: 6, rowSpan: 9, colSpan: 6 },
        timelogPanel: { row: 9, col: 6, rowSpan: 3, colSpan: 6 },
        guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },
      };
    } else {
      // Default layout for standard terminals
      return {
        todayPanel: { row: 0, col: 0, rowSpan: 4, colSpan: 4 },
        yesterdayPanel: { row: 4, col: 0, rowSpan: 4, colSpan: 4 },
        todoPanel: { row: 8, col: 0, rowSpan: 4, colSpan: 9 },
        timelogPanel: { row: 8, col: 9, rowSpan: 4, colSpan: 3 },
        detailsPanel: { row: 0, col: 4, rowSpan: 8, colSpan: 8 },
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

  private formatGuideBarContent(): string {
    // Action labels in cyan, shortcuts in white/grey, separators dimmed
    const cyan = 'cyan-fg';
    const white = 'white-fg';
    const grey = 'gray-fg';
    const yellow = 'yellow-fg';

    const shortcuts = [
      `{${cyan}}Navigate:{/${cyan}} {${white}}hjkl/Ctrl-fb/Tab{/${white}}`,
      `{${cyan}}Panels:{/${cyan}} {${white}}1-3,0{/${white}}`,
      `{${cyan}}Actions:{/${cyan}} {${white}}a{/${white}}`,
      `{${cyan}}Open:{/${cyan}} {${white}}Enter{/${white}}`,
      `{${cyan}}Log:{/${cyan}} {${white}}i{/${white}}{${grey}}/{/${grey}}{${yellow}}I{/${yellow}}`,
      `{${cyan}}Status:{/${cyan}} {${white}}s{/${white}}`,
      `{${cyan}}Copy:{/${cyan}} {${white}}yy{/${white}}{${grey}}/{/${grey}}{${yellow}}Y{/${yellow}}{${grey}}/{/${grey}}{${white}}c{/${white}}`,
      `{${cyan}}Refresh:{/${cyan}} {${white}}r{/${white}}`,
      `{${cyan}}Help:{/${cyan}} {${white}}?{/${white}}`,
      `{${cyan}}Quit:{/${cyan}} {${white}}q{/${white}}`,
    ];

    return shortcuts.join(` {${grey}}│{/${grey}} `);
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
