import blessed from 'neo-blessed';
import { getTheme } from '../theme';
import { HtmlClipboard } from '../utils/html-clipboard';
import { buildHtmlReport } from '../../../core/report-builder';

export class ReportPreviewModal {
  private screen: blessed.Widgets.Screen;
  private modal!: blessed.Widgets.BoxElement;
  private contentBox!: blessed.Widgets.BoxElement;
  private overlay: blessed.Widgets.BoxElement | null = null;
  private reportText: string = '';
  private onClose: () => void;

  constructor(screen: blessed.Widgets.Screen, onClose: () => void) {
    this.screen = screen;
    this.onClose = onClose;

    // Create the modal container (initially hidden or created on show)
    // We'll create it on show() to ensure fresh theme/state
  }

  public show(reportText: string): void {
    this.reportText = reportText;
    const theme = getTheme();

    // Create a semi-transparent overlay
    this.overlay = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      transparent: true,
      style: {
        bg: 'black', // Dim background (requires transparency support or just blocking)
        transparent: true
      }
    });

    this.modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      label: ' Report Preview (c: Text, y: HTML/Web, Esc: Close) ',
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        border: { fg: theme.primary },
        bg: theme.bg,
        fg: theme.fg,
      },
      shadow: true,
    });

    this.contentBox = blessed.box({
      parent: this.modal,
      top: 0,
      left: 0,
      width: '100%-2',
      height: '100%-2',
      content: reportText,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: '│',
        track: {
          bg: theme.border
        },
        style: {
          inverse: true
        }
      }
    });

    this.setupKeys();
    this.modal.focus();
    this.screen.render();
  }

  private setupKeys(): void {
    // Close
    this.modal.key(['escape', 'q'], () => {
      this.close();
    });

    // Copy as Text
    this.modal.key(['c'], async () => {
      await this.copyText();
    });

    // Copy as HTML
    this.modal.key(['y'], async () => {
      await this.copyHtml();
    });
  }

  private close(): void {
    if (this.modal) {
      this.modal.destroy();
    }
    if (this.overlay) {
      this.overlay.destroy();
    }
    this.screen.render();
    this.onClose();
  }

  private async copyText(): Promise<void> {
    try {
      await this.copyToClipboard(this.reportText);
      this.showToast('Copied as Plain Text!', 'success');
      // Optional: Close after copy? User might want to verify. Keeping open for now.
    } catch (error) {
      this.showToast('Failed to copy text', 'error');
    }
  }

  private async copyHtml(): Promise<void> {
    const html = buildHtmlReport(this.reportText);
    try {
      await HtmlClipboard.write(html);
      this.showToast('Copied as HTML (Web/Slack)!', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to copy HTML: ${msg}`, 'error');
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    const clipboardModule = await import('clipboardy');
    const clipboard: any = clipboardModule.default || clipboardModule;
    await clipboard.write(text);
  }

  // Helper to show toast (duplicated from App, maybe should inject a toaster or callback)
  // For now, simple overlay box
  private showToast(message: string, type: 'success' | 'error'): void {
    const theme = getTheme();
    const color = type === 'success' ? 'green' : 'red';

    const toast = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 'shrink',
      height: 'shrink',
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      content: `{${color}-fg}${message}{/${color}-fg}`,
      tags: true,
      border: 'line',
      style: {
        border: { fg: color },
        bg: theme.bg
      }
    });

    this.screen.render();
    setTimeout(() => {
      toast.destroy();
      this.screen.render();
    }, 2000);
  }
}
