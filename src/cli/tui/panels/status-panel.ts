import blessed from 'blessed';
import { StateManager } from '../state';

export class StatusPanel {
  private widget: blessed.Widgets.BoxElement;
  private state: StateManager;
  private clearMessageTimer?: NodeJS.Timeout;

  constructor(statusBar: blessed.Widgets.BoxElement, state: StateManager) {
    this.widget = statusBar;
    this.state = state;
    this.subscribe();
  }

  private subscribe(): void {
    this.state.subscribe(() => {
      this.render();
    });
  }

  render(): void {
    const state = this.state.getState();
    const task = this.state.getCurrentTask();

    let statusLine1 = '';
    let statusLine2 = '';

    if (state.loading) {
      statusLine1 = '{cyan-fg}⏳ Loading...{/cyan-fg}';
      statusLine2 = state.statusMessage;
    } else {
      // Show status message if exists, otherwise show selected task
      if (state.statusMessage && state.statusMessage !== 'Ready') {
        statusLine1 = state.statusMessage;
      } else if (task) {
        const key = task.key || task.id;
        statusLine1 = `{green-fg}Selected:{/green-fg} ${key} - ${task.fields.summary.substring(0, 60)}`;
      } else {
        statusLine1 = `{cyan-fg}Panel:{/cyan-fg} ${state.focusedPanel}`;
      }

      statusLine2 = '{bold}[Enter]{/bold} Open | {bold}[l]{/bold} Log time | {bold}[s]{/bold} Status | {bold}[yy]{/bold} Copy title | {bold}[r]{/bold} Refresh | {bold}[q]{/bold} Quit | {bold}[?]{/bold} Help';
    }

    const content = `${statusLine1}\n${statusLine2}`;
    this.widget.setContent(content);
    this.widget.screen.render();
  }

  setMessage(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    const colorMap = {
      info: 'cyan',
      success: 'green',
      error: 'red',
      warning: 'yellow',
    };

    const color = colorMap[type];
    this.state.setStatusMessage(`{${color}-fg}${message}{/${color}-fg}`);

    // Auto-clear message after 3 seconds
    if (this.clearMessageTimer) {
      clearTimeout(this.clearMessageTimer);
    }
    this.clearMessageTimer = setTimeout(() => {
      this.state.setStatusMessage('Ready');
    }, 3000);
  }

  getWidget(): blessed.Widgets.BoxElement {
    return this.widget;
  }
}
