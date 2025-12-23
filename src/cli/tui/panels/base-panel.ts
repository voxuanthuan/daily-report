import blessed from 'blessed';
import { StateManager, PanelType } from '../state';
import { getListStyle, getTheme } from '../theme';

export abstract class BasePanel {
  protected widget: blessed.Widgets.ListElement;
  protected state: StateManager;
  protected panelType: PanelType;
  protected focused: boolean = false;

  constructor(
    grid: any,
    state: StateManager,
    panelType: PanelType,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    label: string
  ) {
    this.state = state;
    this.panelType = panelType;

    const theme = getTheme();

    this.widget = grid.set(
      position.row,
      position.col,
      position.rowSpan,
      position.colSpan,
      blessed.list,
      {
        label: ` ${label} `,
        tags: true,
        keys: true,
        vi: true,
        mouse: true,
        scrollable: true,
        alwaysScroll: true,
        border: 'line',
        scrollbar: {
          ch: '█',
          style: {
            fg: theme.primary,  // Use primary color for scrollbar
          },
        },
        style: getListStyle(false),
      }
    );

    // Set rounded border characters after creation
    (this.widget as any).border.type = 'line';
    (this.widget as any).border.ch = {
      top: '─',
      bottom: '─',
      left: '│',
      right: '│',
      tl: '╭',
      tr: '╮',
      bl: '╰',
      br: '╯',
    };

    this.setupKeyHandlers();
    this.subscribe();
  }

  protected setupKeyHandlers(): void {
    this.widget.key(['j', 'down'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const items = this.state.getState().panels[this.panelType].items;
      const newIndex = Math.min(items.length - 1, current + 1);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    this.widget.key(['k', 'up'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const newIndex = Math.max(0, current - 1);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    this.widget.key(['g', 'home'], () => {
      this.state.setSelectedIndex(this.panelType, 0);
    });

    this.widget.key(['G', 'end'], () => {
      const items = this.state.getState().panels[this.panelType].items;
      if (items.length > 0) {
        this.state.setSelectedIndex(this.panelType, items.length - 1);
      }
    });

    this.widget.key(['pageup'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const newIndex = Math.max(0, current - 10);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    this.widget.key(['pagedown'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const items = this.state.getState().panels[this.panelType].items;
      const newIndex = Math.min(items.length - 1, current + 10);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    // Ctrl+b for page up (vim-style)
    this.widget.key(['C-b'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const newIndex = Math.max(0, current - 10);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    // Ctrl+f for page down (vim-style)
    this.widget.key(['C-f'], () => {
      const current = this.state.getState().panels[this.panelType].selectedIndex;
      const items = this.state.getState().panels[this.panelType].items;
      const newIndex = Math.min(items.length - 1, current + 10);
      this.state.setSelectedIndex(this.panelType, newIndex);
    });

    this.widget.key(['enter', 'o'], () => {
      this.onSelect();
    });
  }

  /**
   * Update panel label with position indicator (e.g., "TODAY (2/5)")
   */
  protected updateLabelWithPosition(baseLabel: string): void {
    const items = this.state.getState().panels[this.panelType].items;
    const selectedIndex = this.state.getState().panels[this.panelType].selectedIndex;
    
    if (items.length > 0) {
      const current = selectedIndex + 1;
      const total = items.length;
      this.widget.setLabel(` ${baseLabel} (${current}/${total}) `);
    } else {
      this.widget.setLabel(` ${baseLabel} `);
    }
  }

  protected subscribe(): void {
    this.state.subscribe((state) => {
      if (state.focusedPanel === this.panelType && !this.focused) {
        this.setFocus(true);
      } else if (state.focusedPanel !== this.panelType && this.focused) {
        this.setFocus(false);
      }

      this.render();
    });
  }

  setFocus(focused: boolean): void {
    this.focused = focused;
    const newStyle = getListStyle(focused);

    // Update the full style
    this.widget.style = newStyle;

    // Explicitly update border color to ensure it changes
    if (this.widget.style.border) {
      this.widget.style.border.fg = newStyle.border.fg;
    }

    if (focused) {
      this.widget.focus();
    }

    this.widget.screen.render();
  }

  abstract render(): void;
  abstract onSelect(): Promise<void> | void;

  getWidget(): blessed.Widgets.ListElement {
    return this.widget;
  }

  getSelectedItem(): any {
    return this.state.getSelectedItem(this.panelType);
  }
}
