/**
 * Formatting utilities for consistent display across the TUI
 * Provides helpers for durations, relative time, truncation, progress bars, and badges
 */

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30m" or "45m" or "30s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  
  return `${minutes}m`;
}

/**
 * Format relative time from a date
 * @param date - Date to format
 * @returns Relative time string like "2h ago", "yesterday", "3 days ago"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  if (diffDays === 1) {
    return 'yesterday';
  }
  
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  const months = Math.floor(diffDays / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

/**
 * Format a percentage value
 * @param value - Number to format as percentage
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxWidth - Maximum width
 * @param position - Where to place ellipsis ('end' or 'middle')
 * @returns Truncated string
 */
export function truncateWithEllipsis(
  text: string,
  maxWidth: number,
  position: 'end' | 'middle' = 'end'
): string {
  if (text.length <= maxWidth) {
    return text;
  }
  
  if (position === 'middle') {
    const ellipsis = '...';
    const availableWidth = maxWidth - ellipsis.length;
    const leftWidth = Math.ceil(availableWidth / 2);
    const rightWidth = Math.floor(availableWidth / 2);
    
    return text.substring(0, leftWidth) + ellipsis + text.substring(text.length - rightWidth);
  }
  
  // position === 'end'
  return text.substring(0, maxWidth - 3) + '...';
}

/**
 * Create an ASCII progress bar
 * @param value - Current value
 * @param max - Maximum value
 * @param width - Width of the progress bar in characters
 * @param filled - Character for filled portion (default: '█')
 * @param empty - Character for empty portion (default: '░')
 * @returns Progress bar string
 */
export function createProgressBar(
  value: number,
  max: number,
  width: number,
  filled: string = '█',
  empty: string = '░'
): string {
  const percentage = Math.max(0, Math.min(1, value / max));
  const filledWidth = Math.round(percentage * width);
  const emptyWidth = width - filledWidth;
  
  return filled.repeat(filledWidth) + empty.repeat(emptyWidth);
}

/**
 * Create a visual section divider with optional title
 * @param title - Optional title for the divider
 * @param width - Width of the divider
 * @param char - Character to use for the line (default: '─')
 * @returns Formatted divider string
 */
export function createSectionDivider(
  title?: string,
  width: number = 40,
  char: string = '─'
): string {
  if (!title) {
    return char.repeat(width);
  }
  
  const titleWithPadding = ` ${title} `;
  const titleWidth = titleWithPadding.length;
  
  if (titleWidth >= width) {
    return titleWithPadding.substring(0, width);
  }
  
  const remainingWidth = width - titleWidth;
  const leftWidth = Math.floor(remainingWidth / 2);
  const rightWidth = Math.ceil(remainingWidth / 2);
  
  return char.repeat(leftWidth) + titleWithPadding + char.repeat(rightWidth);
}

/**
 * Format a compact badge
 * @param text - Badge text
 * @param color - Color for the badge (blessed color name)
 * @returns Formatted badge string with color tags
 */
export function formatBadge(text: string, color: string = 'cyan'): string {
  return `{${color}-fg}${text}{/${color}-fg}`;
}

/**
 * Format a time badge (e.g., "🕐 2h 30m")
 * @param seconds - Duration in seconds
 * @param showIcon - Whether to show the clock icon (default: true)
 * @returns Formatted time badge
 */
export function formatTimeBadge(seconds: number, showIcon: boolean = true): string {
  const duration = formatDuration(seconds);
  const icon = showIcon ? '🕐 ' : '';
  return `${icon}${duration}`;
}

/**
 * Pad string to a specific width
 * @param text - Text to pad
 * @param width - Target width
 * @param align - Alignment ('left', 'right', 'center')
 * @param char - Character to use for padding (default: ' ')
 * @returns Padded string
 */
export function padString(
  text: string,
  width: number,
  align: 'left' | 'right' | 'center' = 'left',
  char: string = ' '
): string {
  if (text.length >= width) {
    return text;
  }
  
  const padding = width - text.length;
  
  if (align === 'right') {
    return char.repeat(padding) + text;
  }
  
  if (align === 'center') {
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = Math.ceil(padding / 2);
    return char.repeat(leftPadding) + text + char.repeat(rightPadding);
  }
  
  // align === 'left'
  return text + char.repeat(padding);
}

/**
 * Format task count badge (e.g., "(5)")
 * @param count - Number of items
 * @returns Formatted count badge
 */
export function formatCountBadge(count: number): string {
  return `(${count})`;
}

/**
 * Format hours in a compact way (e.g., "6.5h")
 * @param hours - Number of hours (can be decimal)
 * @returns Formatted hours string
 */
export function formatHours(hours: number): string {
  if (hours === 0) {
    return '0h';
  }
  
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  
  if (remainingMinutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${remainingMinutes}m`;
}
