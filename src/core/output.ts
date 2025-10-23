/**
 * Abstract output provider interface
 * Allows different implementations for VS Code, CLI, etc.
 */
export interface IOutputProvider {
  /**
   * Show an informational message
   * @param message Message to display
   */
  showInfo(message: string): void;

  /**
   * Show an error message
   * @param message Error message to display
   */
  showError(message: string): void;

  /**
   * Show a warning message
   * @param message Warning message to display
   */
  showWarning(message: string): void;

  /**
   * Display the main report content
   * @param content Report content to display
   */
  showReport(content: string): void;

  /**
   * Copy content to clipboard (optional - may not be available in all environments)
   * @param content Content to copy
   */
  copyToClipboard?(content: string): Promise<void>;

  /**
   * Check if clipboard functionality is available
   */
  hasClipboard(): boolean;

  /**
   * Start a loading spinner/progress indicator (optional - may not be available in all environments)
   * @param message Message to display with the spinner
   */
  startSpinner?(message?: string): void;

  /**
   * Stop the loading spinner/progress indicator (optional - may not be available in all environments)
   * @param finalMessage Final message to display after stopping
   */
  stopSpinner?(finalMessage?: string): void;
}

/**
 * Output manager that uses an abstract provider
 * Contains business logic for output formatting and display
 */
export class OutputManager {
  constructor(private provider: IOutputProvider) {}

  /**
   * Display an informational message
   */
  showInfo(message: string): void {
    this.provider.showInfo(message);
  }

  /**
   * Display an error message
   */
  showError(message: string, error?: Error): void {
    let errorMessage = message;
    if (error) {
      errorMessage += `\n${error.message}`;
      if (error.stack) {
        console.error(error.stack);
      }
    }
    this.provider.showError(errorMessage);
  }

  /**
   * Display a warning message
   */
  showWarning(message: string): void {
    this.provider.showWarning(message);
  }

  /**
   * Display the main report and optionally copy to clipboard
   */
  async displayReport(content: string, copyToClipboard: boolean = true): Promise<void> {
    // Show the report
    this.provider.showReport(content);

    // Copy to clipboard if requested and available
    if (copyToClipboard && this.provider.hasClipboard() && this.provider.copyToClipboard) {
      try {
        await this.provider.copyToClipboard(content);
        this.showInfo('Report copied to clipboard');
      } catch (error) {
        this.showWarning('Failed to copy report to clipboard');
      }
    }
  }

  /**
   * Check if clipboard is available
   */
  hasClipboard(): boolean {
    return this.provider.hasClipboard();
  }

  /**
   * Start a loading spinner/progress indicator
   */
  startSpinner(message?: string): void {
    if (this.provider.startSpinner) {
      this.provider.startSpinner(message);
    }
  }

  /**
   * Stop the loading spinner/progress indicator
   */
  stopSpinner(finalMessage?: string): void {
    if (this.provider.stopSpinner) {
      this.provider.stopSpinner(finalMessage);
    }
  }
}
