import { IOutputProvider } from '../core/output';
import * as fs from 'fs';

/**
 * CLI implementation of IOutputProvider
 * Outputs to console, files, or clipboard
 */
export class CLIOutputProvider implements IOutputProvider {
  private spinnerInterval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private startTime: number = 0;

  // Progress tracking (simulating token count like Claude Code)
  private tokenCount = 0;
  private targetTokenCount = 0;
  private displayTokenCount = 0;

  // Loading animation dots
  private loadingDots = ['   ', '.  ', '.. ', '...'];

  // Rotation spinner frames
  private spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  // Claude Code starburst/asterisk icon frames (animated rotation)
  private starburstFrames = [
    '✶',  // 8-pointed star
    '✷',  // heavy asterisk
    '✸',  // heavy 8-teardrop asterisk
    '✹',  // balloon asterisk
    '✺',  // heavy balloon asterisk
    '✻',  // 6-pointed asterisk
    '✼',  // teardrop asterisk
    '✽',  // open center asterisk
  ];

  // Alternative: More dynamic starburst frames
  private burstFrames = [
    '◦∘∙⊙∘◦',
    '∘∙⊙●⊙∙∘',
    '∙⊙●◉●⊙∙',
    '⊙●◉◉◉●⊙',
    '∙⊙●◉●⊙∙',
    '∘∙⊙●⊙∙∘',
  ];

  // Simple rotating asterisk frames
  private asteriskFrames = [
    '✦',  // 4-pointed star
    '✧',  // white 4-pointed star
    '✶',  // 6-pointed black star
    '✷',  // heavy asterisk
  ];

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
    this.startTime = Date.now();

    // Show simple spinner with loading dots
    this.spinnerInterval = setInterval(() => {
      const dotsIdx = this.currentFrame % this.loadingDots.length;
      const dots = this.loadingDots[dotsIdx];
      const spinnerIdx = this.currentFrame % this.spinnerFrames.length;
      const spinner = this.spinnerFrames[spinnerIdx];

      // Clear line and show spinner with message
      process.stdout.write('\r\x1b[K'); // Clear current line
      process.stdout.write(`${spinner} ${message}${dots}`);

      this.currentFrame++;
    }, 100);
  }

  /**
   * Stop the loading spinner
   */
  stopSpinner(finalMessage?: string): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;

      // Clear the spinner line
      process.stdout.write('\r\x1b[K');

      // Optionally show a subtle completion message
      if (finalMessage) {
        process.stdout.write(`\x1b[32m✓\x1b[0m \x1b[90m${finalMessage}\x1b[0m\n`);
      }
    }
  }

  /**
   * Update progress information during generation
   */
  updateProgress(tasks?: number, worklogs?: number): void {
    // Convert tasks and worklogs to simulated token count
    // Smaller estimate: each task ~30 tokens, each worklog ~10 tokens
    let estimatedTokens = 0;
    if (tasks !== undefined) {
      estimatedTokens += tasks * 30;
    }
    if (worklogs !== undefined) {
      estimatedTokens += worklogs * 10;
    }
    // Set the target, displayTokenCount will incrementally catch up
    this.targetTokenCount = estimatedTokens;
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
      // Output to console (no extra spacing)
      console.log(formattedContent);
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
