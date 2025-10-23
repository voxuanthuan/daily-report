import { IOutputProvider } from '../core/output';
import * as fs from 'fs';

/**
 * CLI implementation of IOutputProvider
 * Outputs to console, files, or clipboard
 */
export class CLIOutputProvider implements IOutputProvider {
  private spinnerInterval: NodeJS.Timeout | null = null;
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;

  constructor(
    private options: {
      format?: 'text' | 'json' | 'markdown';
      silent?: boolean;
      outputFile?: string;
    } = {}
  ) {}

  /**
   * Start a loading spinner with a message
   */
  startSpinner(message: string = 'Generating report'): void {
    if (this.options.silent || process.stdout.isTTY === false) {
      return;
    }

    this.currentFrame = 0;
    process.stdout.write('\n');

    this.spinnerInterval = setInterval(() => {
      const frame = this.spinnerFrames[this.currentFrame];
      process.stdout.write(`\r\x1b[36m${frame}\x1b[0m ${message}...`);
      this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
    }, 80);
  }

  /**
   * Stop the loading spinner
   */
  stopSpinner(finalMessage?: string): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;

      if (finalMessage) {
        process.stdout.write(`\r\x1b[32m✓\x1b[0m ${finalMessage}\n`);
      } else {
        process.stdout.write('\r\x1b[K'); // Clear the line
      }
    }
  }

  /**
   * Show an informational message
   */
  showInfo(message: string): void {
    if (!this.options.silent) {
      console.log(`\x1b[36mℹ\x1b[0m ${message}`);
    }
  }

  /**
   * Show an error message
   */
  showError(message: string): void {
    console.error(`\x1b[31m✖\x1b[0m ${message}`);
  }

  /**
   * Show a warning message
   */
  showWarning(message: string): void {
    if (!this.options.silent) {
      console.warn(`\x1b[33m⚠\x1b[0m ${message}`);
    }
  }

  /**
   * Display the main report content
   */
  showReport(content: string): void {
    let formattedContent = content;

    // Format based on output format option
    if (this.options.format === 'json') {
      formattedContent = this.convertToJSON(content);
    } else if (this.options.format === 'markdown') {
      // Content is already in markdown-ish format, just ensure proper formatting
      formattedContent = content;
    }

    // Output to file or console
    if (this.options.outputFile) {
      try {
        fs.writeFileSync(this.options.outputFile, formattedContent, 'utf-8');
        this.showInfo(`Report saved to ${this.options.outputFile}`);
      } catch (error) {
        this.showError(`Failed to write report to file: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to console output
        console.log('\n' + formattedContent + '\n');
      }
    } else {
      // Output to console
      console.log('\n' + formattedContent + '\n');
    }
  }

  /**
   * Copy content to clipboard (requires clipboardy package)
   */
  async copyToClipboard(content: string): Promise<void> {
    try {
      // Dynamically import clipboardy (optional dependency)
      const clipboardy = await import('clipboardy');
      await clipboardy.default.write(content);
    } catch (error) {
      throw new Error(`Clipboard functionality not available. Install 'clipboardy' package to enable: npm install clipboardy`);
    }
  }

  /**
   * Check if clipboard functionality is available
   */
  hasClipboard(): boolean {
    try {
      // Check if clipboardy is available
      require.resolve('clipboardy');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert text report to JSON format
   */
  private convertToJSON(content: string): string {
    // Parse the report content into structured JSON
    const lines = content.split('\n');
    const result: any = {
      greeting: '',
      yesterday: [],
      today: [],
      blockers: '',
      todoList: [],
      worklog: '',
    };

    let section: 'greeting' | 'yesterday' | 'today' | 'blockers' | 'todo' | 'worklog' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Hi everyone')) {
        result.greeting = trimmed;
        section = 'greeting';
      } else if (trimmed.match(/^(Yesterday|Last .+day|Last .+)\s*\(/)) {
        section = 'yesterday';
      } else if (trimmed === 'Today') {
        section = 'today';
      } else if (trimmed.match(/^No blockers/i) || trimmed.match(/^Blockers/i)) {
        result.blockers = trimmed;
        section = 'blockers';
      } else if (trimmed.match(/^To Do List/)) {
        section = 'todo';
      } else if (trimmed.match(/^-{5,}/)) {
        section = 'worklog';
      } else if (trimmed.startsWith('- ') || trimmed.match(/^[🟥🟩🟦⬜]/)) {
        if (section === 'yesterday') {
          result.yesterday.push(trimmed.substring(2));
        } else if (section === 'today') {
          result.today.push(trimmed.substring(2));
        } else if (section === 'todo') {
          result.todoList.push(trimmed);
        }
      } else if (section === 'worklog' && trimmed) {
        result.worklog += trimmed + '\n';
      }
    }

    return JSON.stringify(result, null, 2);
  }
}
