import blessed from 'neo-blessed';
import { StateManager, PanelType } from '../state';
import { getListStyle, getTheme, getScrollbarStyle, getPanelLabelStyle, onThemeChange } from '../theme';

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
    // Add prefix to labels
    const iconLabels: Record<PanelType, string> = {
      today: '[1] Report',
      todo: '[2] Todo',
      testing: '[3] Processing',
      details: 'Details'
    };
    this.label = iconLabels[panelType] || label;

    const theme = getTheme();

    this.widget = grid.set(
      position.row,
      position.col,
      position.rowSpan,
      position.colSpan,
      blessed.list,
      {
        label: getPanelLabelStyle(false, this.label),  // Use styled label (initially unfocused)
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
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      }
    );

    this.setupKeyHandlers();
    this.subscribe();
    this.setupThemeListener();
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

  protected setupThemeListener(): void {
    onThemeChange(() => {
      this.updateTheme();
    });
  }

  /**
   * Update panel label with position indicator (e.g., "TODAY (2/5)")
   */
  protected updateLabelWithPosition(baseLabel: string): void {
    const items = this.state.getState().panels[this.panelType].items;
    const selectedIndex = this.state.getState().panels[this.panelType].selectedIndex;

    // Add icon prefix to labels
    const iconLabels: Record<PanelType, string> = {
      today: '(1) 📅 Today',
      todo: '(3) 📝 Todo',
      testing: '(2) 🧪 Testing',
      details: '(0) Details'
    };

    let labelText: string;
    if (items.length > 0) {
      const current = selectedIndex + 1;
      const total = items.length;
      labelText = `${iconLabels[this.panelType]} (${current}/${total})`;
    } else {
      // Still show count even when empty
      labelText = `${iconLabels[this.panelType]} (0)`;
    }

    // Use theme-consistent label styling with focus state
    this.widget.setLabel(getPanelLabelStyle(this.focused, labelText));
  }

  /**
   * Update panel label with custom statistics (e.g., task count, time logged)
   * @param baseLabel - Base label without icons
   * @param stats - Optional statistics to show (e.g., " • 6h")
   */
  protected updateLabelWithStats(baseLabel: string, stats?: string): void {
    const items = this.state.getState().panels[this.panelType].items;
    const selectedIndex = this.state.getState().panels[this.panelType].selectedIndex;

    // Add prefix to labels - MUST match constructor labels
    const iconLabels: Record<PanelType, string> = {
      today: '[1] Report',
      todo: '[2] Todo',
      testing: '[3] Processing',
      details: 'Details'
    };

    const count = items.length;
    let labelText = `${iconLabels[this.panelType]} (${count})`;
    
    // Add statistics if provided
    if (stats) {
      labelText += stats;
    }

    // Use theme-consistent label styling with focus state
    this.widget.setLabel(getPanelLabelStyle(this.focused, labelText));
  }

  protected updateTheme(): void {
    const newStyle = getListStyle(this.focused);
    const theme = getTheme();
    
    // Explicitly update all style properties for blessed to recognize changes
    if (this.widget.style) {
      // Update border color
      if (this.widget.style.border) {
        this.widget.style.border.fg = newStyle.border.fg;
      }
      
      // Update foreground (text) color
      this.widget.style.fg = newStyle.fg;
      
      // Background is transparent - not set
      
      // Update selected item colors
      if (this.widget.style.selected) {
        this.widget.style.selected.fg = newStyle.selected.fg;
        this.widget.style.selected.bg = newStyle.selected.bg;
      }
      
      // Update item colors
      if (this.widget.style.item) {
        this.widget.style.item.fg = newStyle.item.fg;
        this.widget.style.item.bg = newStyle.item.bg;
      }
    }

    // Update label with theme-aware styling
    this.widget.setLabel(getPanelLabelStyle(this.focused, this.label));
    
    // Re-render to apply changes
    this.render();
    this.widget.screen.render();
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
