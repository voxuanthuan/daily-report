import * as vscode from 'vscode';
import { IOutputProvider } from '../core/output';

/**
 * VS Code implementation of IOutputProvider
 * Uses VS Code's output channels and notification system
 */
export class VSCodeOutputProvider implements IOutputProvider {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string = 'Jira Daily Report') {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Show an informational message
   */
  showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  /**
   * Show an error message
   */
  showError(message: string): void {
    vscode.window.showErrorMessage(message);
  }

  /**
   * Show a warning message
   */
  showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
  }

  /**
   * Display the main report content in output channel
   */
  showReport(content: string): void {
    this.outputChannel.clear();
    this.outputChannel.append(content);
    this.outputChannel.show(true);
  }

  /**
   * Copy content to clipboard using VS Code's clipboard API
   */
  async copyToClipboard(content: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(content);
    } catch (error) {
      throw new Error(`Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if clipboard functionality is available
   */
  hasClipboard(): boolean {
    return true; // VS Code always has clipboard support
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
