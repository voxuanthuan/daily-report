import type { Widgets } from 'blessed';

export const ISSUE_ICONS: Record<string, string> = {
  'Bug': '🔴',
  'Task': '🟢',
  'Story': '🟠',
  'Sub-task': '🔵',
  'Epic': '🟣',
};

export const COLORS = {
  focused: '#ff9640',        // Orange/amber for focused panel border
  unfocused: '#61afef',      // Blue/cyan for unfocused panel border
  selectedBg: '#3e4451',     // Deep indigo/blue for selected item background
  selectedFg: '#ffffff',     // White for selected item text
  border: 'white',
  error: 'red',
  success: 'green',
  warning: 'yellow',
  info: 'cyan',
};

export function getBoxStyle(focused: boolean): Widgets.BoxOptions['style'] {
  return {
    border: {
      fg: focused ? COLORS.focused : COLORS.border,
    },
    focus: {
      border: {
        fg: COLORS.focused,
      },
    },
  };
}

export function getListStyle(focused: boolean): Widgets.ListOptions<any>['style'] {
  if (focused) {
    return {
      selected: {
        bg: COLORS.selectedBg,      // Deep indigo when focused
        fg: COLORS.selectedFg,       // White text
        bold: true,
      },
      item: {
        fg: 'white',
        bg: 'black',
      },
      border: {
        fg: COLORS.focused,  // Yellow/orange when focused
      },
      focus: {
        border: {
          fg: COLORS.focused,
        },
        selected: {
          bg: COLORS.selectedBg,
          fg: COLORS.selectedFg,
          bold: true,
        },
      },
    };
  } else {
    // Unfocused panels: selected item looks like normal item
    return {
      selected: {
        fg: 'white',         // Same as normal items - no indication
        bold: false,         // Not bold
      },
      item: {
        fg: 'white',
      },
      border: {
        fg: COLORS.unfocused,  // Blue when not focused
      },
    };
  }
}

export function getIssueIcon(issueType: string): string {
  return ISSUE_ICONS[issueType] || '⚪';
}

export function formatIssueForDisplay(key: string, summary: string, issueType: string, maxWidth: number = 50): string {
  const icon = getIssueIcon(issueType);
  const prefix = `${icon} ${key}: `;
  const availableWidth = maxWidth - prefix.length;

  const truncatedSummary = summary.length > availableWidth
    ? summary.substring(0, availableWidth - 3) + '...'
    : summary;

  return `${prefix}${truncatedSummary}`;
}
