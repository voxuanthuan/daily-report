import { StateManager } from '../state';

/**
 * StatusPanel - No-op implementation for backward compatibility
 * This maintains the interface but doesn't display a status bar
 */
export class StatusPanel {
  private state: StateManager;

  constructor(state: StateManager) {
    this.state = state;
  }

  setMessage(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    // No-op: Status messages are not displayed
  }

  updateStats(tasks: any, worklogs: any[]): void {
    // No-op: Stats are not displayed
  }

  render(): void {
    // No-op: Nothing to render
  }
}
