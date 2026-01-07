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
      // Ensure border object exists before accessing its properties
      if (!this.widget.style.border) {
        this.widget.style.border = {};
      }
      
      // Update border color with null safety
      if (newStyle.border && newStyle?.border?.fg) {
        this.widget.style.border.fg = newStyle.border.fg;
      }
      
      // Update foreground (text) color with null safety
      if (newStyle?.fg) {
        this.widget.style.fg = newStyle.fg;
      }
      
      // Background is transparent - not set
      
      // Update selected item colors with null safety
      if (this.widget.style.selected && newStyle.selected && newStyle?.selected?.fg && newStyle?.selected?.bg) {
        this.widget.style.selected.fg = newStyle.selected.fg;
        this.widget.style.selected.bg = newStyle.selected.bg;
      }
      
      // Update item colors with null safety
      if (this.widget.style.item && newStyle.item && newStyle?.item?.fg && newStyle?.item?.bg) {
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

    // Critical safety: Update style properties IN-PLACE instead of replacing the entire object
    // This prevents blessed from accessing stale/undefined references
    if (newStyle && this.widget.style) {
      // Ensure border object exists
      if (!this.widget.style.border) {
        this.widget.style.border = {};
      }
      
      // Update border color
      if (newStyle.border?.fg) {
        this.widget.style.border.fg = newStyle.border.fg;
      }
      
      // Update foreground color
      if (newStyle.fg) {
        this.widget.style.fg = newStyle.fg;
      }
      
      // Update background color
      if (newStyle.bg !== undefined) {
        this.widget.style.bg = newStyle.bg;
      }
      
      // Ensure selected object exists
      if (!this.widget.style.selected) {
        this.widget.style.selected = {};
      }
      
      // Update selected item colors
      if (newStyle.selected) {
        if (newStyle.selected.fg) {this.widget.style.selected.fg = newStyle.selected.fg;}
        if (newStyle.selected.bg) {this.widget.style.selected.bg = newStyle.selected.bg;}
        if (newStyle.selected.bold !== undefined) {this.widget.style.selected.bold = newStyle.selected.bold;}
      }
      
      // Ensure item object exists
      if (!this.widget.style.item) {
        this.widget.style.item = {};
      }
      
      // Update item colors
      if (newStyle.item) {
        if (newStyle.item.fg) {this.widget.style.item.fg = newStyle.item.fg;}
        if (newStyle.item.bg) {this.widget.style.item.bg = newStyle.item.bg;}
      }
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
