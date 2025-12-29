import blessed from 'neo-blessed';
import axios from 'axios';
import { ConfigManager } from '../../../core/config';
import { ActionResult } from './open-url';
import { getTheme } from '../theme';

interface JiraTransition {
  id: string;
  name: string;
}

export class ChangeStatusAction {
  constructor(
    private screen: blessed.Widgets.Screen,
    private configManager: ConfigManager
  ) {}

  async execute(task: any): Promise<ActionResult> {
    try {
      if (!task) {
        return {
          success: false,
          error: 'No task selected',
        };
      }

      const key = task.key || task.id;
      if (!key) {
        return {
          success: false,
          error: 'Task has no key',
        };
      }

      const transitions = await this.getAvailableTransitions(task.id);

      if (transitions.length === 0) {
        return {
          success: false,
          error: 'No status transitions available for this task',
        };
      }

      const currentStatus = task.fields?.status?.name;
      const selectedTransition = await this.showTransitionList(transitions, currentStatus);

      if (!selectedTransition) {
        return {
          success: false,
          message: 'Cancelled',
        };
      }

      const confirmed = await this.showConfirmation(
        `Change ${key} status to "${selectedTransition.name}"?`,
        'Yes',
        'No'
      );

      if (!confirmed) {
        return {
          success: false,
          message: 'Cancelled',
        };
      }

      await this.changeIssueStatus(task.id, selectedTransition.id);

      return {
        success: true,
        message: `Changed ${key} to "${selectedTransition.name}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getAvailableTransitions(issueIdOrKey: string): Promise<JiraTransition[]> {
    const jiraServer = await this.configManager.getJiraServer();
    const authHeader = await this.configManager.getAuthHeader();

    const response = await axios.get(
      `${jiraServer}rest/api/2/issue/${issueIdOrKey}/transitions`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.transitions;
  }

  private async changeIssueStatus(issueIdOrKey: string, transitionId: string): Promise<void> {
    const jiraServer = await this.configManager.getJiraServer();
    const authHeader = await this.configManager.getAuthHeader();

    await axios.post(
      `${jiraServer}rest/api/2/issue/${issueIdOrKey}/transitions`,
      {
        transition: {
          id: transitionId,
        },
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  private showTransitionList(transitions: JiraTransition[], currentStatus?: string): Promise<JiraTransition | null> {
    return new Promise((resolve) => {
      const theme = getTheme();
      
      // Find current status index to pre-select it
      let initialIndex = 0;
      if (currentStatus) {
        const matchIndex = transitions.findIndex(t =>
          t.name.toLowerCase() === currentStatus.toLowerCase()
        );
        if (matchIndex !== -1) {
          initialIndex = matchIndex;
        }
      }

      const items = transitions.map(t => {
        // Mark current status with indicator
        if (currentStatus && t.name.toLowerCase() === currentStatus.toLowerCase()) {
          return `${t.name} {white-fg}(current){/white-fg}`;
        }
        return t.name;
      });

      const list = blessed.list({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        label: ' Select Status ',
        tags: true,
        keys: true,
        vi: true,
        mouse: true,
        border: 'line',
        scrollable: true,
        items: items,
        style: {
          selected: {
            bg: theme.primary,  // Use primary color (Crail) for selected item
            fg: '#ffffff',       // White text
            bold: true,
          },
          item: {
            fg: 'white',
            bg: 'black',
          },
          border: {
            fg: theme.primary,  // Use primary color (Crail) for border
          },
        },
      });

      // Set rounded border characters
      (list as any).border.ch = {
        top: '─',
        bottom: '─',
        left: '│',
        right: '│',
        tl: '╭',
        tr: '╮',
        bl: '╰',
        br: '╯',
      };

      // Pre-select current status
      list.select(initialIndex);

      list.key(['escape', 'q'], () => {
        list.detach();
        this.screen.render();
        resolve(null);
      });

      list.key(['enter'], () => {
        const selected = (list as any).selected || 0;
        list.detach();
        this.screen.render();
        resolve(transitions[selected]);
      });

      list.focus();
      this.screen.render();
    });
  }

  private showConfirmation(message: string, yes: string, no: string): Promise<boolean> {
    return new Promise((resolve) => {
      const question = blessed.question({
        parent: this.screen,
        top: 'center',
        left: 'center',
        height: 'shrink',
        width: 'shrink',
        keys: true,
        vi: true,
        mouse: true,
        tags: true,
        border: 'line',
      });

      // Set rounded border characters
      (question as any).border.ch = {
        top: '─',
        bottom: '─',
        left: '│',
        right: '│',
        tl: '╭',
        tr: '╮',
        bl: '╰',
        br: '╯',
      };

      question.ask(message, (err: any, value: any) => {
        this.screen.render();
        const isYes = value === true || (typeof value === 'string' && value.toLowerCase() === yes.toLowerCase());
        resolve(isYes);
      });

      this.screen.render();
    });
  }
}
