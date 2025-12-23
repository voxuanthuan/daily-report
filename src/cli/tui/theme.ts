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

export const PRIORITY_COLORS: Record<string, string> = {
  'Highest': 'red',
  'High': 'magenta',
  'Medium': 'yellow',
  'Low': 'cyan',
  'Lowest': 'blue',
  'default': 'white',
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

export const STATUS_COLORS: Record<string, string> = {
  'To Do': 'gray',
  'In Progress': 'cyan',
  'Under Review': 'yellow',
  'Code Review': 'yellow',
  'Testing': 'magenta',
  'Done': 'green',
  'Closed': 'green',
  'Blocked': 'red',
  'On Hold': 'yellow',
  'Selected for Development': 'blue',
  'Ready for Testing': 'magenta',
  'default': 'white',
};

// Theme configuration
export type ThemeMode = 'dark' | 'light' | 'auto';

// Claude color palette for a sleek and minimalistic design
export const CLAUDE_COLORS = {
  CRAIL: '#C15F3C',      // Primary - warm terracotta/orange
  CLOUDY: '#B1ADA1',     // Secondary - warm gray
  PAMPAS: '#F4F3EE',     // Background - warm off-white
  WHITE: '#FFFFFF',      // Pure white
};

// Primary color used throughout the TUI for consistency
export const PRIMARY_COLOR = CLAUDE_COLORS.CRAIL;

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
const DARK_THEME: ThemeColors = {
  primary: PRIMARY_COLOR,        // Crail - warm terracotta for all interactive elements
  focused: PRIMARY_COLOR,        // Use Crail for focused panel borders
  unfocused: CLAUDE_COLORS.CLOUDY, // Cloudy gray for unfocused borders
  selectedBg: PRIMARY_COLOR,     // Use Crail for selected item backgrounds
  selectedFg: '#ffffff',         // White for selected item text
  border: CLAUDE_COLORS.CLOUDY,  // Cloudy gray for default borders
  error: '#e06c75',              // Softer red
  success: '#98c379',            // Green
  warning: '#e5c07b',            // Yellow
  info: '#61afef',               // Cyan
  bg: 'black',
  fg: 'white',
  accent: PRIMARY_COLOR,         // Use Crail as accent
  muted: CLAUDE_COLORS.CLOUDY,   // Cloudy for muted text
  highlight: '#D17A5A',          // Lighter Crail for highlights
  dimmed: '#3e4451',             // Dark gray
};

// Light theme - using Claude's color palette
const LIGHT_THEME: ThemeColors = {
  primary: PRIMARY_COLOR,        // Crail for light mode too
  focused: PRIMARY_COLOR,        // Use Crail for focused panel borders
  unfocused: CLAUDE_COLORS.CLOUDY, // Cloudy gray
  selectedBg: PRIMARY_COLOR,     // Use Crail for selected item backgrounds
  selectedFg: CLAUDE_COLORS.WHITE, // White text on Crail background
  border: CLAUDE_COLORS.CLOUDY,  // Cloudy gray for borders
  error: '#e45649',
  success: '#50a14f',
  warning: '#c18401',
  info: '#0184bc',
  bg: CLAUDE_COLORS.PAMPAS,      // Pampas warm off-white background
  fg: '#2d2d2d',                 // Dark gray text
  accent: PRIMARY_COLOR,
  muted: CLAUDE_COLORS.CLOUDY,
  highlight: '#D17A5A',          // Lighter Crail
  dimmed: CLAUDE_COLORS.PAMPAS,
};

// Current active theme
let currentTheme: ThemeColors = DARK_THEME;
let currentMode: ThemeMode = 'dark';

export function setTheme(mode: ThemeMode): void {
  currentMode = mode;
  currentTheme = mode === 'light' ? LIGHT_THEME : DARK_THEME;
}

export function getTheme(): ThemeColors {
  return currentTheme;
}

export function getCurrentThemeMode(): ThemeMode {
  return currentMode;
}

export function toggleTheme(): ThemeMode {
  const newMode = currentMode === 'dark' ? 'light' : 'dark';
  setTheme(newMode);
  return newMode;
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
  if (focused) {
    return {
      selected: {
        bg: currentTheme.selectedBg,
        fg: currentTheme.selectedFg,
        bold: true,
      },
      item: {
        fg: currentTheme.fg,
      },
      border: {
        fg: currentTheme.focused,
      },
      focus: {
        border: {
          fg: currentTheme.focused,
        },
        selected: {
          bg: currentTheme.selectedBg,
          fg: currentTheme.selectedFg,
          bold: true,
        },
      },
    };
  } else {
    return {
      selected: {
        fg: currentTheme.fg,
        bold: false,
      },
      item: {
        fg: currentTheme.fg,
      },
      border: {
        fg: currentTheme.unfocused,
      },
    };
  }
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
  
  // Add strikethrough effect for done/closed items (using dim styling)
  if (status === 'Done' || status === 'Closed') {
    return `${prefix}{dim}${displaySummary}{/dim}`;
  }
  
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
