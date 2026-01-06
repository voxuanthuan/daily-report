import type { Widgets } from 'blessed';

// Jira-style issue type icons (matching official Jira SVG icons)
// Based on: bug.svg, Task.svg, Group.svg, Subtask.svg, Epic.svg, Improvement.svg
export const ISSUE_ICONS: Record<string, string> = {
  // Main Jira issue types (using colored squares from SVG background colors)
  'Bug': '🟥',           // Red square - matches bug.svg (#E5493A)
  'Task': '🟦',          // Blue square - matches Task.svg (#4BADE8)
  'Story': '📗',         // Green bookmark - matches Group.svg (#63BA3C + bookmark)
  'Sub-task': '🟦',      // Blue square - matches Subtask.svg (#4BAEE8)
  'Subtask': '🟦',       // Alternative naming for subtask
  'Epic': '🟪',          // Purple square - matches Epic.svg (#904EE2)
  'Improvement': '⬆️',   // Green arrow up - matches Improvement.svg (#63BA3C + arrow)
  
  // Other common issue types
  'Feature': '⭐',       // Star - new feature
  'New Feature': '⭐',   // Star - new feature
  'Technical task': '⚙️', // Gear - technical work
  'Support': '💬',       // Speech bubble - support/help
  'Question': '❓',      // Question mark
  'Documentation': '📄', // Document - documentation
  'Research': '🔍',      // Magnifying glass - research/investigation
  'Spike': '📊',         // Chart - research spike
  'Test': '🧪',          // Test tube - testing
  
  // Fallback
  'default': '◽',       // Small white square
};

// Priority-based icons and colors
export const PRIORITY_ICONS: Record<string, string> = {
  'Highest': '🔴',
  'High': '🟠',
  'Medium': '🟡',
  'Low': '🟢',
  'Lowest': '🔵',
  'default': '⚪',
};



// Status-specific styling
export const STATUS_ICONS: Record<string, string> = {
  'To Do': '📝',
  'In Progress': '🔄',
  'Under Review': '👀',
  'Code Review': '👀',
  'Testing': '🧪',
  'Done': '✅',
  'Closed': '✅',
  'Blocked': '🚫',
  'On Hold': '⏸️',
  'Selected for Development': '🎯',
  'Ready for Testing': '🧪',
  'default': '⚪',
};



// Theme configuration
export type ThemeMode = 'dark' | 'light' | 'dracula' | 'solarized' | 'solarized-light' | 'auto';

// Claude color palette for a sleek and minimalistic design
export const CLAUDE_COLORS = {
  CRAIL: '#C15F3C',      // Primary - warm terracotta/orange
  CLOUDY: '#B1ADA1',     // Secondary - warm gray
  PAMPAS: '#F4F3EE',     // Background - warm off-white
  WHITE: '#FFFFFF',      // Pure white
};

// Primary color used throughout the TUI for consistency
export const PRIMARY_COLOR = CLAUDE_COLORS.CRAIL;

// Minimalist color palette inspired by monkeytype.com
// Designed for readability, focus, and distraction-free interaction
export const MINIMALIST_PALETTE = {
  // Backgrounds
  bg: '#323437',           // Main background - dark gray
  bgSubtle: '#2c2e31',     // Subtle backgrounds for selected items

  // Text colors
  text: '#d1d0c5',         // Primary text - light beige
  textDim: '#646669',      // Dimmed text for secondary content

  // Accent colors
  accent: '#e2b714',       // Gold accent for focus and interaction
  accentDim: '#b8941a',    // Dimmed gold for subtle emphasis

  // Borders
  borderFocus: '#61afef',  // Cyan border for focused panels (changed from gold)
  borderNormal: '#5c6370', // Dim gray for unfocused panels (darker than before)

  // Feedback colors (muted for minimalism)
  error: '#ca4754',        // Muted red for errors
  errorDark: '#7e2a33',    // Darker error variant
  success: '#98c379',      // Success green
  warning: '#e5c07b',      // Warning yellow
  info: '#61afef',         // Info cyan
};

// Solarized color palette (16 colors by Ethan Schoonover)
// Designed in CIELAB color space for precision and readability
export const SOLARIZED_COLORS = {
  // Background tones
  BASE03: '#002b36',  // Dark background
  BASE02: '#073642',  // Black
  BASE01: '#586e75',  // Content tones (dark)
  BASE00: '#657b83',  // Content tones
  BASE0: '#839496',   // Brighter content tones
  BASE1: '#93a1a1',   // Brightest content tones
  BASE2: '#eee8d5',   // Light background
  BASE3: '#fdf6e3',   // Lightest background
  
  // Accent tones
  YELLOW: '#b58900',
  ORANGE: '#cb4b16',
  RED: '#dc322f',
  MAGENTA: '#d33682',
  VIOLET: '#6c71c4',
  BLUE: '#268bd2',
  CYAN: '#2aa198',
  GREEN: '#859900',
};

export const STATUS_COLORS: Record<string, string> = {
  'To Do': MINIMALIST_PALETTE.textDim,
  'In Progress': MINIMALIST_PALETTE.accent,
  'Under Review': MINIMALIST_PALETTE.info,
  'Code Review': MINIMALIST_PALETTE.info,
  'Testing': MINIMALIST_PALETTE.warning,
  'Done': MINIMALIST_PALETTE.success,
  'Closed': MINIMALIST_PALETTE.success,
  'Blocked': MINIMALIST_PALETTE.error,
  'On Hold': MINIMALIST_PALETTE.textDim,
  'Selected for Development': MINIMALIST_PALETTE.info,
  'Ready for Testing': MINIMALIST_PALETTE.warning,
  'default': MINIMALIST_PALETTE.text,
};

export const PRIORITY_COLORS: Record<string, string> = {
  'Highest': MINIMALIST_PALETTE.error,
  'High': MINIMALIST_PALETTE.warning,
  'Medium': MINIMALIST_PALETTE.textDim,
  'Low': MINIMALIST_PALETTE.info,
  'Lowest': MINIMALIST_PALETTE.textDim,
  'default': MINIMALIST_PALETTE.text,
};

// Semantic colors for UI elements and feedback
export const SEMANTIC_COLORS = {
  // Feedback colors
  success: MINIMALIST_PALETTE.success,
  warning: MINIMALIST_PALETTE.warning,
  error: MINIMALIST_PALETTE.error,
  info: MINIMALIST_PALETTE.info,

  // UI element colors
  scrollbar: MINIMALIST_PALETTE.accent,
  panelLabel: MINIMALIST_PALETTE.accent,
  focusedBorder: MINIMALIST_PALETTE.borderFocus,
  unfocusedBorder: MINIMALIST_PALETTE.borderNormal,

  // Text emphasis
  textMuted: MINIMALIST_PALETTE.textDim,
  textSecondary: MINIMALIST_PALETTE.text,
};

interface ThemeColors {
  primary: string;          // Main brand/accent color
  focused: string;
  unfocused: string;
  selectedBg: string;
  selectedFg: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  bg: string;
  fg: string;
  // Enhanced colors
  accent: string;
  muted: string;
  highlight: string;
  dimmed: string;
}

// Dark theme (default) - using Claude's color palette
// All colors optimized for visibility on black backgrounds
const DARK_THEME: ThemeColors = {
  primary: '#61afef',             // Cyan for focused panel borders (changed from red/terracotta)
  focused: '#61afef',            // Cyan for focused panel borders
  unfocused: '#5c6370',          // Darker gray for unfocused borders
  selectedBg: '#2c323c',         // Subtle dark background for selected items
  selectedFg: '#e2b714',         // Gold for selected item text (matches MINIMALIST_PALETTE.accent)
  border: '#5c6370',             // Darker gray for default borders
  error: '#e06c75',              // Softer red (only for bugs/overdue)
  success: '#98c379',            // Green
  warning: '#e5c07b',            // Yellow
  info: '#61afef',               // Cyan
  bg: 'black',
  fg: 'white',
  accent: '#e2b714',             // Gold accent for interactive elements
  muted: '#9ca3af',              // Light gray for muted text (visible on black)
  highlight: '#61afef',          // Cyan for highlights
  dimmed: '#6b7280',             // Medium gray instead of dark gray (visible on black)
};

// Light theme - using Claude's color palette
const LIGHT_THEME: ThemeColors = {
  primary: '#0184bc',             // Blue for focused panel borders
  focused: '#0184bc',
  unfocused: CLAUDE_COLORS.CLOUDY,
  selectedBg: '#e8e8e8',         // Light gray for selected items
  selectedFg: '#C15F3C',         // Terracotta for selected item text
  border: CLAUDE_COLORS.CLOUDY,
  error: '#e45649',              // Red (only for bugs/overdue)
  success: '#50a14f',
  warning: '#c18401',
  info: '#0184bc',
  bg: CLAUDE_COLORS.PAMPAS,
  fg: '#2d2d2d',
  accent: '#C15F3C',             // Terracotta accent
  muted: CLAUDE_COLORS.CLOUDY,
  highlight: '#0184bc',
  dimmed: CLAUDE_COLORS.PAMPAS,
};

// Dracula theme - popular dark theme
const DRACULA_THEME: ThemeColors = {
  primary: '#8be9fd',            // Cyan for focused borders (changed from purple)
  focused: '#8be9fd',
  unfocused: '#6272a4',          // Blue-gray
  selectedBg: '#44475a',         // Subtle dark background
  selectedFg: '#50fa7b',         // Green for selected item text
  border: '#6272a4',
  error: '#ff5555',              // Red (only for bugs/overdue)
  success: '#50fa7b',
  warning: '#f1fa8c',
  info: '#8be9fd',
  bg: '#282a36',                 // Dark background
  fg: '#f8f8f2',                 // Off-white text
  accent: '#ff79c6',             // Pink accent
  muted: '#6272a4',
  highlight: '#8be9fd',
  dimmed: '#44475a',
};

// Solarized Dark theme - eye-friendly precision colors
const SOLARIZED_DARK_THEME: ThemeColors = {
  primary: '#2aa198',         // Cyan for focused borders (changed from yellow)
  focused: '#2aa198',
  unfocused: '#586e75',       // Base01 (content tone)
  selectedBg: '#073642',       // Base02 (darker background)
  selectedFg: '#b58900',        // Yellow for selected item text
  border: '#586e75',           // Base01
  error: '#dc322f',           // Red (only for bugs/overdue)
  success: '#859900',          // Green
  warning: '#cb4b16',          // Orange
  info: '#268bd2',             // Blue
  bg: '#002b36',              // Base03 (dark background)
  fg: '#839496',              // Base0 (bright content)
  accent: '#b58900',          // Yellow accent
  muted: '#586e75',           // Base01
  highlight: '#2aa198',        // Cyan
  dimmed: '#073642',           // Base02
};

// Solarized Light theme - eye-friendly precision colors
const SOLARIZED_LIGHT_THEME: ThemeColors = {
  primary: '#2aa198',         // Cyan for focused borders (changed from yellow)
  focused: '#2aa198',
  unfocused: '#93a1a1',       // Base1 (brighter content)
  selectedBg: '#eee8d5',       // Base2 (light background)
  selectedFg: '#cb4b16',        // Orange for selected item text
  border: '#93a1a1',           // Base1
  error: '#dc322f',           // Red (only for bugs/overdue)
  success: '#859900',          // Green
  warning: '#cb4b16',          // Orange
  info: '#268bd2',             // Blue
  bg: '#fdf6e3',              // Base3 (lightest background)
  fg: '#657b83',              // Base00 (content)
  accent: '#b58900',          // Yellow accent
  muted: '#93a1a1',           // Base1
  highlight: '#2aa198',        // Cyan
  dimmed: '#eee8d5',           // Base2
};

// Current active theme
let currentTheme: ThemeColors = DARK_THEME;
let currentMode: ThemeMode = 'dark';

// Theme change listeners
const themeChangeListeners: Set<() => void> = new Set();

/**
 * Detect system theme (works in terminals with COLORFGBG or terminal capabilities)
 */
function detectSystemTheme(): 'dark' | 'light' {
  // Check COLORFGBG environment variable (common in terminals)
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const fg = parseInt(colorfgbg.split(';')[0]);
    // If foreground is dark (0-7), background is likely light
    // If foreground is bright (8-15), background is likely dark
    return fg >= 8 ? 'dark' : 'light';
  }

  // Default to dark if can't detect
  return 'dark';
}

export function setTheme(mode: ThemeMode): void {
  currentMode = mode;

  // Resolve 'auto' mode
  if (mode === 'auto') {
    const systemTheme = detectSystemTheme();
    // Use Solarized themes for auto-detection
    currentTheme = systemTheme === 'light' ? SOLARIZED_LIGHT_THEME : SOLARIZED_DARK_THEME;
  } else if (mode === 'solarized') {
    currentTheme = SOLARIZED_DARK_THEME;
  } else if (mode === 'solarized-light') {
    currentTheme = SOLARIZED_LIGHT_THEME;
  } else if (mode === 'dracula') {
    currentTheme = DRACULA_THEME;
  } else if (mode === 'light') {
    currentTheme = LIGHT_THEME;
  } else {
    currentTheme = DARK_THEME;
  }

  // Notify listeners of theme change
  themeChangeListeners.forEach(listener => listener());
}

export function getTheme(): ThemeColors {
  return currentTheme;
}

export function getCurrentThemeMode(): ThemeMode {
  return currentMode;
}

export function toggleTheme(): ThemeMode {
  const modes: ThemeMode[] = ['dark', 'light', 'dracula', 'solarized', 'solarized-light'];
  const currentIndex = modes.indexOf(currentMode);
  if (currentMode === 'auto') {
    const systemTheme = detectSystemTheme();
    const resolvedIndex = systemTheme === 'light' ? 1 : 0;
    setTheme(modes[(resolvedIndex + 1) % modes.length]);
  } else {
    setTheme(modes[(currentIndex + 1) % modes.length]);
  }
  return currentMode;
}

/**
 * Apply theme background color to screen
 * @param screen The blessed screen object
 * @param theme The active theme
 */
export function applyBackgroundToScreen(screen: any, theme: ThemeColors): void {
  if (screen && screen.style) {
    screen.style.bg = theme.bg;
  }
}

/**
 * Subscribe to theme changes
 */
export function onThemeChange(listener: () => void): () => void {
  themeChangeListeners.add(listener);
  return () => themeChangeListeners.delete(listener);
}

// Legacy export for backward compatibility
export const COLORS = currentTheme;

export function getBoxStyle(focused: boolean): Widgets.BoxOptions['style'] {
  return {
    border: {
      fg: focused ? currentTheme.focused : currentTheme.border,
    },
    focus: {
      border: {
        fg: currentTheme.focused,
      },
    },
    bg: currentTheme.bg,
    fg: currentTheme.fg,
  };
}

export function getListStyle(focused: boolean): Widgets.ListOptions<any>['style'] {
  const theme = currentTheme; // Use current theme instead of hardcoded palette
  
  if (focused) {
    return {
      selected: {
        bg: theme.selectedBg,
        fg: theme.selectedFg,
        bold: true,  // Bold for selected item
        underline: false,
        inverse: false,
      },
      item: {
        fg: theme.fg,
        bg: 'transparent',  // Transparent background
      },
      border: {
        fg: theme.focused,
        bold: false,
      },
      focus: {
        border: {
          fg: theme.focused,
          bold: false,
        },
        selected: {
          bg: theme.selectedBg,
          fg: theme.selectedFg,
          bold: true,  // Bold for selected item
          underline: false,
          inverse: false,
        },
      },
      // Set transparent background for the entire list
      fg: theme.fg,
      bg: 'transparent',
    };
  } else {
    // Unfocused panels: no highlighting, just normal text
    return {
      selected: {
        bg: 'transparent',  // No highlight
        fg: theme.fg,  // Same as normal text - no highlight
        bold: false,   // Not bold when unfocused
        underline: false,
        inverse: false,
      },
      item: {
        fg: theme.fg,
        bg: 'transparent',  // Transparent background
      },
      border: {
        fg: theme.unfocused,
      },
      // Set transparent background for the entire list
      fg: theme.fg,
      bg: 'transparent',
    };
  }
}

/**
 * Get consistent scrollbar styling using theme colors
 */
export function getScrollbarStyle(): { ch: string; style: { fg: string } } {
  return {
    ch: '|',  // Thinner scrollbar character
    style: { fg: MINIMALIST_PALETTE.accent },  // Gold accent for scrollbar
  };
}

/**
 * Format panel label with focus state styling
 * Minimalist approach: focused panels get gold accent, unfocused stay readable
 */
export function getPanelLabelStyle(focused: boolean, label: string): string {
  if (focused) {
    // Gold accent for focused panels - matches MINIMALIST_PALETTE.accent
    return `{${MINIMALIST_PALETTE.accent}-fg}${label}{/${MINIMALIST_PALETTE.accent}-fg}`;
  }
  // Beige text for unfocused panels - matches MINIMALIST_PALETTE.text
  return `{${MINIMALIST_PALETTE.text}-fg}${label}{/${MINIMALIST_PALETTE.text}-fg}`;
}

export function getIssueIcon(issueType: string): string {
  return ISSUE_ICONS[issueType] || ISSUE_ICONS['default'];
}

export function getPriorityIcon(priority: string): string {
  return PRIORITY_ICONS[priority] || PRIORITY_ICONS['default'];
}

export function getStatusIcon(status: string): string {
  return STATUS_ICONS[status] || STATUS_ICONS['default'];
}

export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS['default'];
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS['default'];
}

/**
 * Format issue for display with priority and status indicators
 */
export function formatIssueForDisplay(
  key: string,
  summary: string,
  issueType: string,
  maxWidth: number = 50,
  priority?: string,
  status?: string
): string {
  const typeIcon = getIssueIcon(issueType);
  
  let prefix = `${typeIcon} ${key}`;
  
  // Add priority indicator for high priority items
  if (priority && (priority === 'Highest' || priority === 'High')) {
    const priorityIcon = getPriorityIcon(priority);
    prefix = `${priorityIcon} ${prefix}`;
  }
  
  prefix += ': ';
  const availableWidth = maxWidth - prefix.length;

  let displaySummary = summary.length > availableWidth
    ? summary.substring(0, availableWidth - 3) + '...'
    : summary;
  
  // Use cyan color for done/closed items - visible on black background
  if (status === 'Done' || status === 'Closed') {
    return `${prefix}{cyan-fg}${displaySummary}{/cyan-fg}`;
  }

  // Return without color tag - will use panel's item.fg style (white)
  return `${prefix}${displaySummary}`;
}

/**
 * Format issue with rich details including status
 */
export function formatIssueWithStatus(
  key: string,
  summary: string,
  issueType: string,
  status: string,
  maxWidth: number = 50
): string {
  const typeIcon = getIssueIcon(issueType);
  const statusIcon = getStatusIcon(status);
  
  const prefix = `${typeIcon} ${key} ${statusIcon} `;
  const availableWidth = maxWidth - prefix.length;

  const displaySummary = summary.length > availableWidth
    ? summary.substring(0, availableWidth - 3) + '...'
    : summary;

  // Return without color tag - will use panel's item.fg style (white)
  return `${prefix}${displaySummary}`;
}

/**
 * Get color tags for blessed rich text
 */
export function getColorTag(color: string): { open: string; close: string } {
  return {
    open: `{${color}-fg}`,
    close: `{/${color}-fg}`,
  };
}

/**
 * Wrap text with color tags
 */
export function colorize(text: string, color: string): string {
  return `{${color}-fg}${text}{/${color}-fg}`;
}

/**
 * Apply bold styling
 */
export function bold(text: string): string {
  return `{bold}${text}{/bold}`;
}

/**
 * Apply dim/muted styling
 */
export function dim(text: string): string {
  return `{dim}${text}{/dim}`;
}

/**
 * Format task item for display in list panels
 */
export function formatTaskItem(
  task: { key: string; summary: string; issuetype: string; priority?: string; status?: string },
  options?: { showPriority?: boolean; maxWidth?: number }
): string {
  const opts = { showPriority: true, ...options };
  const icon = getIssueIcon(task.issuetype);
  const priority = task.priority;

  let prefix = '';

  // Priority prefix for high/highest
  if (opts.showPriority && priority) {
    if (priority === 'Highest') {
      prefix = `{red-fg}!{/red-fg} `;
    } else if (priority === 'High') {
      prefix = `{magenta-fg}!{/magenta-fg} `;
    }
  }

  // Show full text without truncation
  const display = `${icon} ${task.key}: ${task.summary}`;

  // Use cyan for done items - visible on black background
  if (task.status === 'Done' || task.status === 'Closed') {
    return `${prefix}{cyan-fg}${display}{/cyan-fg}`;
  }

  // Return without explicit color - will use panel's item.fg style (white from getListStyle)
  return `${prefix}${display}`;
}

/**
 * Format section header with visual divider
 */
export function formatSectionHeader(title: string, width: number = 40): string {
  const dividerChar = '─';
  const titleWithPadding = ` ${title} `;
  const remainingWidth = width - titleWithPadding.length;
  const leftDivider = dividerChar.repeat(Math.floor(remainingWidth / 2));
  const rightDivider = dividerChar.repeat(Math.ceil(remainingWidth / 2));

  return `{cyan-fg}${leftDivider}${titleWithPadding}${rightDivider}{/cyan-fg}`;
}
