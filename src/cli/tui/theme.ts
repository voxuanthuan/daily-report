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
  // Text semantic colors (for theme-aware styling)
  textDim: string;          // Dimmed/secondary text
  textSecondary: string;    // Secondary content text
}

// Dark theme (default) - using Claude's color palette
// All colors optimized for visibility on black backgrounds
const DARK_THEME: ThemeColors = {
  primary: '#61afef',             // Cyan for focused panel borders
  focused: '#61afef',            // Cyan for focused panel borders
  unfocused: '#5c6370',          // Darker gray for unfocused borders
  selectedBg: '#2c323c',         // Subtle dark background for selected items
  selectedFg: '#e2b714',         // Gold for selected item text
  border: '#5c6370',             // Darker gray for default borders
  error: '#e06c75',              // Softer red (only for bugs/overdue)
  success: '#98c379',            // Green
  warning: '#e5c07b',            // Yellow
  info: '#61afef',               // Cyan
  bg: 'black',
  fg: 'white',
  accent: '#e2b714',             // Gold accent for interactive elements
  muted: '#9ca3af',              // Light gray for muted text
  highlight: '#61afef',          // Cyan for highlights
  dimmed: '#6b7280',             // Medium gray (visible on black)
  textDim: '#646669',            // Dimmed text for secondary content
  textSecondary: '#d1d0c5',      // Secondary text color
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
  textDim: '#6b7280',            // Dimmed text for secondary content
  textSecondary: '#4b5563',      // Secondary text color
};

// Dracula theme - popular dark theme
const DRACULA_THEME: ThemeColors = {
  primary: '#8be9fd',            // Cyan for focused borders
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
  textDim: '#6272a4',            // Dimmed text (blue-gray)
  textSecondary: '#bd93f9',      // Secondary text (purple)
};

// Solarized Dark theme - eye-friendly precision colors
const SOLARIZED_DARK_THEME: ThemeColors = {
  primary: '#2aa198',         // Cyan for focused borders
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
  textDim: '#586e75',          // Base01 (dimmed text)
  textSecondary: '#839496',    // Base0 (secondary text)
};

// Solarized Light theme - eye-friendly precision colors
const SOLARIZED_LIGHT_THEME: ThemeColors = {
  primary: '#2aa198',         // Cyan for focused borders
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
  textDim: '#93a1a1',          // Base1 (dimmed text)
  textSecondary: '#657b83',    // Base00 (secondary text)
};

// Current active theme - explicitly initialized to prevent undefined access
// Using Object.assign for better compatibility with bundlers
let currentTheme: ThemeColors = Object.assign({}, DARK_THEME);
let currentMode: ThemeMode = 'dark';
let isInitializing: boolean = true; // Flag to prevent renders during initialization

// Theme change listeners
const themeChangeListeners: Set<() => void> = new Set();

// Initialize theme immediately at module load to prevent any undefined access
(function initializeTheme() {
  if (!currentTheme ||!currentTheme?.fg) {
    currentTheme = Object.assign({}, DARK_THEME);
  }
})();

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
  console.log(`[THEME] setTheme called with mode: ${mode}`);
  currentMode = mode;

  // Resolve 'auto' mode
  if (mode === 'auto') {
    const systemTheme = detectSystemTheme();
    // Use Solarized themes for auto-detection
    currentTheme = Object.assign({}, systemTheme === 'light' ? SOLARIZED_LIGHT_THEME : SOLARIZED_DARK_THEME);
  } else if (mode === 'solarized') {
    currentTheme = Object.assign({}, SOLARIZED_DARK_THEME);
  } else if (mode === 'solarized-light') {
    currentTheme = Object.assign({}, SOLARIZED_LIGHT_THEME);
  } else if (mode === 'dracula') {
    currentTheme = Object.assign({}, DRACULA_THEME);
  } else if (mode === 'light') {
    currentTheme = Object.assign({}, LIGHT_THEME);
  } else {
    currentTheme = Object.assign({}, DARK_THEME);
  }
  
  console.log(`[THEME] Theme set. fg=${currentTheme.fg}, bg=${currentTheme.bg}`);

  // Notify listeners of theme change (but not during initialization)
  if (!isInitializing) {
    themeChangeListeners.forEach(listener => listener());
  }
}

/**
 * Mark theme initialization as complete - allows theme change listeners to fire
 */
export function markThemeInitialized(): void {
  isInitializing = false;
}

export function getTheme(): ThemeColors {
  // Defensive check: ensure theme is always initialized with all required properties
  // Check multiple critical properties to ensure complete initialization
  if (!currentTheme ||
      !currentTheme.fg ||
      !currentTheme.bg ||
      !currentTheme.focused ||
      !currentTheme.unfocused ||
      !currentTheme.selectedBg ||
      !currentTheme.selectedFg) {
    console.log('[THEME] WARNING: Theme not properly initialized, using DARK_THEME fallback');
    currentTheme = Object.assign({}, DARK_THEME);
  }
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
  const theme = getTheme(); // Use getTheme() to ensure theme is always initialized
  return {
    border: {
      fg: (focused ? theme?.focused : theme?.border) || '#5c6370',
    },
    focus: {
      border: {
        fg: theme?.focused || '#61afef',
      },
    },
    bg: theme?.bg || 'black',
    fg: theme?.fg || 'white',
  };
}

export function getListStyle(focused: boolean): Widgets.ListOptions<any>['style'] {
  const theme = getTheme(); // Use getTheme() to ensure theme is always initialized

  // Additional safety: ensure theme object has all required properties
  const safeFg = theme?.fg || 'white';
  const safeBg = theme?.bg || 'black';
  const safeFocused = theme?.focused || '#61afef';
  const safeUnfocused = theme?.unfocused || '#5c6370';
  const safeSelectedBg = theme?.selectedBg || '#2c323c';
  const safeSelectedFg = theme?.selectedFg || '#e2b714';

  if (focused) {
    return {
      selected: {
        bg: safeSelectedBg,
        fg: safeSelectedFg,
        bold: true,
        underline: false,
        inverse: false,
      },
      item: {
        fg: safeFg,
        bg: 'transparent',
      },
      border: {
        fg: safeFocused,
        bold: false,
      },
      focus: {
        border: {
          fg: safeFocused,
          bold: false,
        },
        selected: {
          bg: safeSelectedBg,
          fg: safeSelectedFg,
          bold: true,
          underline: false,
          inverse: false,
        },
      },
      fg: safeFg,
      bg: 'transparent',
    };
  } else {
    return {
      selected: {
        bg: 'transparent',
        fg: safeFg,
        bold: false,
        underline: false,
        inverse: false,
      },
      item: {
        fg: safeFg,
        bg: 'transparent',
      },
      border: {
        fg: safeUnfocused,
      },
      fg: safeFg,
      bg: 'transparent',
    };
  }
}

/**
 * Get consistent scrollbar styling using theme colors
 */
export function getScrollbarStyle(): { ch: string; style: { fg: string } } {
  const theme = getTheme();
  return {
    ch: '|',  // Thinner scrollbar character
    style: { fg: theme.accent },  // Theme accent color for scrollbar
  };
}

/**
 * Format panel label with focus state styling
 * Minimalist approach: focused panels get gold accent, unfocused stay readable
 */
export function getPanelLabelStyle(focused: boolean, label: string): string {
  const theme = getTheme();
  if (focused) {
    // Accent color for focused panels
    return `{${theme.accent}-fg}${label}{/${theme.accent}-fg}`;
  }
  // Unfocused panels: return plain label - will use panel's default fg style
  return label;
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
  const theme = getTheme();
  const priorityColorMap: Record<string, string | undefined> = {
    'Highest': theme?.error,
    'High': theme?.warning,
    'Medium': theme?.textDim,
    'Low': theme?.info,
    'Lowest': theme?.textDim,
    'default': theme?.fg,
  };
  return priorityColorMap[priority] || priorityColorMap['default'] || 'white';
}

export function getStatusColor(status: string): string {
  const theme = getTheme();
  const statusColorMap: Record<string, string | undefined> = {
    'To Do': theme?.textDim,
    'In Progress': theme?.accent,
    'Under Review': theme?.info,
    'Code Review': theme?.info,
    'Testing': theme?.warning,
    'Done': theme?.success,
    'Closed': theme?.success,
    'Blocked': theme?.error,
    'On Hold': theme?.textDim,
    'Selected for Development': theme?.info,
    'Ready for Testing': theme?.warning,
    'default': theme?.fg,
  };
  return statusColorMap[status] || statusColorMap['default'] || 'white';
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
