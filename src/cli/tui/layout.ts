import blessed from 'blessed';
import contrib from 'blessed-contrib';

export interface LayoutPositions {
  todayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  yesterdayPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  todoPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  detailsPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  timelogPanel: { row: number; col: number; rowSpan: number; colSpan: number };
  statusBar: { top: string; left: number; width: string; height: number };
  guideBar: { bottom: number; left: number; width: string; height: number };
}

export class Layout {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  public positions: LayoutPositions;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;

    this.positions = {
      todayPanel: { row: 0, col: 0, rowSpan: 4, colSpan: 4 },        // Top 1/3 left
      yesterdayPanel: { row: 4, col: 0, rowSpan: 4, colSpan: 4 },    // Middle 1/3 left
      todoPanel: { row: 8, col: 0, rowSpan: 4, colSpan: 4 },         // Bottom 1/3 left
      detailsPanel: { row: 0, col: 4, rowSpan: 9, colSpan: 8 },      // Top right (9/12 rows) - increased for better description viewing
      timelogPanel: { row: 9, col: 4, rowSpan: 3, colSpan: 8 },      // Bottom right (3/12 rows) - reduced height
      statusBar: { top: '85%', left: 0, width: '100%', height: 3 },  // Moved up slightly
      guideBar: { bottom: 0, left: 0, width: '100%', height: 1 },    // Bottom guide bar
    };

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    this.screen.on('resize', () => {
      this.screen.render();
    });
  }

  getGrid(): any {
    return this.grid;
  }

  createStatusBar(): blessed.Widgets.BoxElement {
    const statusBar = blessed.box({
      top: this.positions.statusBar.top,
      left: this.positions.statusBar.left,
      width: this.positions.statusBar.width,
      height: this.positions.statusBar.height,
      tags: true,
      border: 'line',
      style: {
        border: {
          fg: 'white',
        },
      },
    });

    // Set rounded border characters
    (statusBar as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    this.screen.append(statusBar);
    return statusBar;
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

    const shortcuts = [
      `{${cyan}}Navigate:{/${cyan}} {${white}}hjkl{/${white}}`,
      `{${cyan}}Open:{/${cyan}} {${white}}Enter{/${white}}`,
      `{${cyan}}LogTime:{/${cyan}} {${white}}i/I{/${white}}`,
      `{${cyan}}Status:{/${cyan}} {${white}}s{/${white}}`,
      `{${cyan}}CopyTask:{/${cyan}} {${white}}yy{/${white}}`,
      `{${cyan}}CopyReport:{/${cyan}} {${white}}c{/${white}}`,
      `{${cyan}}Refresh:{/${cyan}} {${white}}r{/${white}}`,
      `{${cyan}}Help:{/${cyan}} {${white}}?{/${white}}`,
      `{${cyan}}Quit:{/${cyan}} {${white}}q{/${white}}`,
    ];

    return shortcuts.join(` {${grey}}|{/${grey}} `);
  }
}
