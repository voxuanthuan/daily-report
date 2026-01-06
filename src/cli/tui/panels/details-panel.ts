import blessed from 'neo-blessed';
import { StateManager } from '../state';
import { getIssueIcon, getStatusIcon, getStatusColor, getPriorityIcon, getPriorityColor, formatSectionHeader, getScrollbarStyle, getTheme, onThemeChange } from '../theme';
import { ConfigManager } from '../../../core/config';
import { getJiraServer } from '../../../components/config-utils';

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
        label: '(0) 📋 Details',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        keys: true,
        vi: true,
        mouse: true,
        border: {
          type: 'line',
        },
        scrollbar: getScrollbarStyle(),
        style: {
          border: {
            fg: getTheme().border,
          },
        },
        padding: {
          left: 1,
          right: 1,
          top: 1,     // Add top padding for spacing
          bottom: 0,
        },
      }
    );

    this.setupKeyHandlers();
    this.subscribe();
    this.setupThemeListener();
  }

  /**
   * Public method to view images - called when user presses 'v'
   */
  async viewImages(): Promise<void> {
    const task = this.state.getCurrentTask();
    
    if (!task) {
      return;
    }

    const attachments = task.fields?.attachment || [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    const imageAttachments = attachments.filter((att: any) => {
      const filename = (att.filename || '').toLowerCase();
      return imageExtensions.some(ext => filename.endsWith(ext));
    });

    if (imageAttachments.length === 0) {
      this.state.setStatusMessage('{yellow-fg}No image attachments found{/yellow-fg}');
      return;
    }

    try {
      this.state.setStatusMessage('{cyan-fg}Downloading images...{/cyan-fg}');
      
      const { AttachmentDownloader } = await import('../attachment-downloader.js');
      const downloader = new AttachmentDownloader(this.configManager);
      
      // Download all images
      const downloadedPaths = await downloader.downloadImages(task);
      
      if (downloadedPaths.length > 0) {
        this.state.setStatusMessage(`{green-fg}Opening ${downloadedPaths.length} image(s)...{/green-fg}`);
        
        // Open images with system default viewer
        const open = (await import('open')).default;
        for (const imagePath of downloadedPaths) {
          await open(imagePath);
        }
        
        // Show success message with location
        setTimeout(() => {
          this.state.setStatusMessage(`{green-fg}✓ Opened ${downloadedPaths.length} image(s) (saved to ~/Downloads/jira-attachments){/green-fg}`);
        }, 500);
      }
    } catch (error: any) {
      this.state.setStatusMessage(`{red-fg}Error: ${error.message}{/red-fg}`);
    }
  }

  private setupKeyHandlers(): void {
    // Press 'i' to open images in browser
    this.widget.key(['i'], async () => {
      await this.openImages();
    });
  }

  private setupThemeListener(): void {
    onThemeChange(() => {
      this.updateTheme();
    });
  }

  private updateTheme(): void {
    const theme = getTheme();
    
    // Explicitly update all style properties
    if (this.widget.style) {
      // Update border color
      if (this.widget.style.border) {
        this.widget.style.border.fg = theme.border;
      }
      
      // Update foreground color only - background is transparent
      this.widget.style.fg = theme.fg;
    }
    
    this.render();
    this.widget.screen.render();
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
      this.widget.setContent('{center}{white-fg}No task selected{/white-fg}{/center}');
      this.widget.screen.render();
      return;
    }

    const key = task.key || task.id;
    const type = task.fields?.issuetype?.name || 'Task';
    const status = task.fields?.status?.name || 'Unknown';
    const summary = task.fields.summary;
    const rawDescription = task.fields.description;

    // Parse and format description (handle ADF format)
    const description = this.parseDescription(rawDescription);
    const formattedDescription = this.formatDescription(description);

    const imageCount = this.imageUrls.length;
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_WINDOW_ID;
    const imageAction = isKitty ? 'show in terminal' : 'open in browser';
    const imageHint = imageCount > 0 ? `{gray-fg}(Press 'v' to ${imageAction} ${imageCount} image${imageCount > 1 ? 's' : ''}){/gray-fg}` : '';

    const content = `

 {bold}{white-fg}${key}{/white-fg}{/bold}
 {bold}{white-fg}${summary}{/white-fg}{/bold}

 {gray-fg}─────────────────────────────────────{/gray-fg}

 ${formattedDescription || '{gray-fg}No description{/gray-fg}'}
 ${imageHint}

 {gray-fg}${getIssueIcon(type)} ${type}  •  ${getStatusIcon(status)} ${status}{/gray-fg}
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
          return `{cyan-fg}[Image: ${alt}]{/cyan-fg}\n{white-fg}${url}{/white-fg}`;
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
        return `\n{white-fg}[Code${language ? ` - ${language}` : ''}]{/white-fg}\n${code}\n`;
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

    // Just return the description as-is, blessed will handle wrapping
    // Remove any excessive blank lines
    return description
      .split('\n')
      .filter((line, index, array) => {
        // Keep non-empty lines
        if (line.trim()) {
          return true;
        }
        // Keep single empty lines but remove consecutive empty lines
        if (index === 0 || index === array.length - 1) {
          return false;
        }
        return array[index - 1]?.trim() !== '';
      })
      .join('\n');
  }

  private getRecentTimeLogsForTask(taskKey: string): string {
    const allWorklogs = this.state.getState().worklogs;

    // Filter worklogs for this specific task
    const taskWorklogs = allWorklogs.filter(log => log.issue.key === taskKey);

    if (taskWorklogs.length === 0) {
      return '{white-fg}No recent time logs{/white-fg}';
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

  private formatStatusBadge(status: string): string {
    const color = getStatusColor(status);
    const icon = getStatusIcon(status);
    return `{${color}-fg}${icon} ${status}{/${color}-fg}`;
  }

  private formatPriorityBadge(priority: string): string {
    const color = getPriorityColor(priority);
    const icon = getPriorityIcon(priority);
    return `{${color}-fg}${icon}{/${color}-fg} {${color}-fg}${priority}{/${color}-fg}`;
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
