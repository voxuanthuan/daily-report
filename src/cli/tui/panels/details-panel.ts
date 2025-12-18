import blessed from 'blessed';
import { StateManager } from '../state';
import { getIssueIcon } from '../theme';
import { ConfigManager } from '../../../core/config';

interface JiraIssue {
  id: string;
  key?: string;
  fields: {
    summary: string;
    status: { name: string };
    issuetype?: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string };
    description?: string;
    [key: string]: any;
  };
}

export class DetailsPanel {
  private widget: blessed.Widgets.BoxElement;
  private state: StateManager;
  private configManager: ConfigManager;
  private imageUrls: string[] = [];

  constructor(
    grid: any,
    state: StateManager,
    position: { row: number; col: number; rowSpan: number; colSpan: number },
    configManager: ConfigManager
  ) {
    this.state = state;
    this.configManager = configManager;

    this.widget = grid.set(
      position.row,
      position.col,
      position.rowSpan,
      position.colSpan,
      blessed.box,
      {
        label: '[0] Details',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true,
        mouse: true,
        border: 'line',
        scrollbar: {
          ch: '█',
          style: {
            fg: 'blue',
          },
        },
        style: {
          border: {
            fg: 'white',
          },
        },
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

  private setupKeyHandlers(): void {
    // Press 'i' to open images in browser
    this.widget.key(['i'], async () => {
      await this.openImages();
    });
  }

  private async openImages(): Promise<void> {
    if (this.imageUrls.length === 0) {
      return;
    }

    // Check if running in Kitty terminal
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_WINDOW_ID;

    if (isKitty) {
      // Use kitty icat to display images in terminal
      await this.displayImagesInKitty();
    } else {
      // Fall back to opening in browser
      await this.openImagesInBrowser();
    }
  }

  private async displayImagesInKitty(): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Download and display each image
      for (const url of this.imageUrls) {
        try {
          // Use curl to download and pipe to kitty icat
          await execAsync(`curl -s "${url}" | kitty +kitten icat`);
        } catch (error) {
          console.error(`Failed to display image: ${url}`, error);
        }
      }
    } catch (error) {
      console.error('Failed to display images in Kitty:', error);
      // Fall back to browser
      await this.openImagesInBrowser();
    }
  }

  private async openImagesInBrowser(): Promise<void> {
    try {
      const open = await import('open');

      if (this.imageUrls.length === 1) {
        // Single image - open directly
        await open.default(this.imageUrls[0]);
      } else {
        // Multiple images - open all
        for (const url of this.imageUrls) {
          await open.default(url);
        }
      }
    } catch (error) {
      console.error('Failed to open images:', error);
    }
  }

  private subscribe(): void {
    this.state.subscribe(() => {
      this.render();
    });
  }

  render(): void {
    const task = this.state.getCurrentTask();

    if (!task) {
      this.widget.setContent('{center}{gray-fg}No task selected{/gray-fg}{/center}');
      this.widget.screen.render();
      return;
    }

    const key = task.key || task.id;
    const type = task.fields?.issuetype?.name || 'Task';
    const status = task.fields?.status?.name || 'Unknown';
    const priority = task.fields?.priority?.name || 'Medium';
    const assignee = task.fields?.assignee?.displayName || 'Unassigned';
    const summary = task.fields.summary;
    const rawDescription = task.fields.description;

    // Get Jira server URL
    const jiraServer = this.configManager.getJiraServer();
    const url = `${jiraServer}browse/${key}`;

    // Parse and format description (handle ADF format)
    const description = this.parseDescription(rawDescription);
    const formattedDescription = this.formatDescription(description);

    const imageCount = this.imageUrls.length;
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_WINDOW_ID;
    const imageAction = isKitty ? 'show in terminal' : 'open in browser';
    const imageHint = imageCount > 0 ? `\n{gray-fg}(Press 'i' to ${imageAction} ${imageCount} image${imageCount > 1 ? 's' : ''}){/gray-fg}` : '';

    // Get recent time logs for this task
    const recentTimeLogs = this.getRecentTimeLogsForTask(key);

    const content = `
{bold}${key}: ${summary}{/bold}

{cyan-fg}Type:{/cyan-fg}     ${getIssueIcon(type)} ${type}
{cyan-fg}Status:{/cyan-fg}   ${status}
{cyan-fg}Priority:{/cyan-fg} ${priority}
{cyan-fg}Assignee:{/cyan-fg} ${assignee}

{cyan-fg}Description:{/cyan-fg}${imageHint}
${formattedDescription}

{cyan-fg}Task Time Logs:{/cyan-fg}
${recentTimeLogs}

{cyan-fg}URL:{/cyan-fg}
${url}
    `.trim();

    this.widget.setContent(content);
    this.widget.screen.render();
  }

  private parseDescription(rawDescription: any): string {
    if (!rawDescription) {
      return 'No description';
    }

    // If it's already a string, return it
    if (typeof rawDescription === 'string') {
      return rawDescription;
    }

    // Handle ADF (Atlassian Document Format)
    if (typeof rawDescription === 'object' && rawDescription.content) {
      return this.extractTextFromADF(rawDescription);
    }

    return 'No description';
  }

  private extractTextFromADF(adf: any): string {
    if (!adf || !adf.content) {
      return 'No description';
    }

    const lines: string[] = [];
    this.imageUrls = []; // Reset image URLs

    const processNode = (node: any): string => {
      if (!node) {
        return '';
      }

      // Text node
      if (node.type === 'text') {
        return node.text || '';
      }

      // Image node - show placeholder with URL
      if (node.type === 'media' || node.type === 'mediaInline' || node.type === 'mediaSingle') {
        const url = node.attrs?.url || node.attrs?.src;
        const alt = node.attrs?.alt || 'image';
        if (url) {
          this.imageUrls.push(url); // Store image URL
          return `{cyan-fg}[Image: ${alt}]{/cyan-fg}\n{gray-fg}${url}{/gray-fg}`;
        }
        return `{cyan-fg}[Image: ${alt}]{/cyan-fg}`;
      }

      // Heading nodes
      if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const text = node.content ? node.content.map(processNode).join('') : '';
        const prefix = '#'.repeat(level);
        return `{bold}${prefix} ${text}{/bold}`;
      }

      // Bullet list item
      if (node.type === 'bulletList') {
        return node.content ? '\n' + node.content.map((item: any) =>
          '  • ' + (item.content ? item.content.map(processNode).join('') : '')
        ).join('\n') : '';
      }

      // Ordered list item
      if (node.type === 'orderedList') {
        return node.content ? '\n' + node.content.map((item: any, idx: number) =>
          `  ${idx + 1}. ` + (item.content ? item.content.map(processNode).join('') : '')
        ).join('\n') : '';
      }

      // Code block
      if (node.type === 'codeBlock') {
        const code = node.content ? node.content.map(processNode).join('') : '';
        const language = node.attrs?.language || '';
        return `\n{gray-fg}[Code${language ? ` - ${language}` : ''}]{/gray-fg}\n${code}\n`;
      }

      // Inline code
      if (node.type === 'code') {
        return `{yellow-fg}\`${node.text || ''}\`{/yellow-fg}`;
      }

      // Hard break
      if (node.type === 'hardBreak') {
        return '\n';
      }

      // Paragraph or other block nodes with content
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(processNode).join('');
      }

      return '';
    };

    adf.content.forEach((node: any) => {
      const text = processNode(node);
      if (text) {
        lines.push(text);
      }
    });

    return lines.length > 0 ? lines.join('\n') : 'No description';
  }

  private formatDescription(description: string): string {
    if (!description || description === 'No description') {
      return description;
    }

    // Wrap long lines for better readability
    const lines = description.split('\n');
    const wrappedLines: string[] = [];
    const maxLineLength = 80;

    lines.forEach(line => {
      if (line.length <= maxLineLength) {
        wrappedLines.push(line);
      } else {
        // Simple word wrapping
        const words = line.split(' ');
        let currentLine = '';

        words.forEach(word => {
          if ((currentLine + word).length <= maxLineLength) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            if (currentLine) {
              wrappedLines.push(currentLine);
            }
            currentLine = word;
          }
        });

        if (currentLine) {
          wrappedLines.push(currentLine);
        }
      }
    });

    return wrappedLines.join('\n');
  }

  private getRecentTimeLogsForTask(taskKey: string): string {
    const allWorklogs = this.state.getState().worklogs;

    // Filter worklogs for this specific task
    const taskWorklogs = allWorklogs.filter(log => log.issue.key === taskKey);

    if (taskWorklogs.length === 0) {
      return '{gray-fg}No recent time logs{/gray-fg}';
    }

    // Sort by date (most recent first)
    const sortedLogs = taskWorklogs.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    // Take only the last 5 entries
    const recentLogs = sortedLogs.slice(0, 5);

    const lines: string[] = [];
    recentLogs.forEach(log => {
      const timeSpent = this.formatTimeSpent(log.timeSpentSeconds);
      const date = log.startDate;
      const description = log.description ? ` - ${log.description}` : '';
      lines.push(`  • {yellow-fg}${date}{/yellow-fg} - {green-fg}${timeSpent}{/green-fg}${description}`);
    });

    return lines.join('\n');
  }

  private formatTimeSpent(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
