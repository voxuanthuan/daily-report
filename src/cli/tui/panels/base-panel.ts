import blessed from 'neo-blessed';
import { StateManager, PanelType } from '../state';
import { getListStyle, getTheme, getScrollbarStyle, getPanelLabelStyle } from '../theme';

export abstract class BasePanel {
  protected widget: blessed.Widgets.ListElement;
  protected state: StateManager;
  protected panelType: PanelType;
  protected focused: boolean = false;
  protected label: string;

  constructor(
    grid: any,
    state: StateManager,
    panelType: PanelType,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    label: string
  ) {
    this.state = state;
    this.panelType = panelType;
    this.label = label;

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
        border: {
          type: 'line',
        },
        scrollbar: getScrollbarStyle(),
        style: getListStyle(false),
      }
    );

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

    let labelText: string;
    if (items.length > 0) {
      const current = selectedIndex + 1;
      const total = items.length;
      labelText = `${baseLabel} (${current}/${total})`;
    } else {
      // Still show count even when empty
      labelText = `${baseLabel} (0)`;
    }

    // Use theme-consistent label styling with focus state
    this.widget.setLabel(getPanelLabelStyle(this.focused, labelText));
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

    // Trigger label update with focus state
    this.render();

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
