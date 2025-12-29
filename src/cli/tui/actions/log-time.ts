import blessed from 'neo-blessed';
import moment from 'moment-timezone';
import { ConfigManager } from '../../../core/config';
import TempoWorklogCreator from '../../../core/tempo/worklog-creator';
import TimesheetParser from '../../../core/tempo/timesheet-parser';
import { ActionResult } from './open-url';
import { getTheme } from '../theme';

export class LogTimeAction {
  constructor(
    private screen: blessed.Widgets.Screen,
    private configManager: ConfigManager,
    private userAccountId: string
  ) {}

  async execute(task: any, withDateAndDescription: boolean = false): Promise<ActionResult> {
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

      const timezone = 'Australia/Sydney';

      // Simple mode ('i'): Just ask for time, use today
      if (!withDateAndDescription) {
        // Ask for time only
        const timeInput = await this.showPrompt(
          `Log time for ${key}\n\nTime (e.g., 2h, 1.5h, 30m):`,
          ''
        );

        if (!timeInput || !timeInput.trim()) {
          return { success: false, message: 'Cancelled' };
        }

        // Parse time
        const parsed = TimesheetParser.parseTimesheetLog(`${key} ${timeInput.trim()}`);
        if (!parsed.isValid) {
          return {
            success: false,
            error: `Invalid time format: ${parsed.errors.join(', ')}`,
          };
        }

        // Auto-use today
        const targetDate = moment.tz(timezone).format('YYYY-MM-DD');

        // Confirm
        const confirmed = await this.showConfirmation(
          `Log ${timeInput.trim()} to ${key} on ${targetDate}?`,
          'Yes',
          'No'
        );

        if (!confirmed) {
          return { success: false, message: 'Cancelled' };
        }

        // Submit
        const worklogCreator = new TempoWorklogCreator(this.userAccountId, {
          tempoApiToken: await this.configManager.getTempoApiToken(),
          jiraServer: await this.configManager.getJiraServer(),
          jiraAuthHeader: await this.configManager.getAuthHeader(),
        });

        const result = await worklogCreator.createWorklog(
          task.id,
          parsed.entries[0].timeSpentSeconds,
          targetDate,
          undefined
        );

        if (result.success) {
          return {
            success: true,
            message: `Logged ${timeInput.trim()} to ${key} on ${targetDate}`,
          };
        } else {
          return {
            success: false,
            error: result.error || 'Failed to log time',
          };
        }
      }

      // Full mode ('I'): Ask for time, description, date
      // 1. Ask for time
      const timeInput = await this.showPrompt(
        `Log time for ${key}\n\nTime (e.g., 2h, 1.5h, 30m):`,
        ''
      );

      if (!timeInput || !timeInput.trim()) {
        return { success: false, message: 'Cancelled' };
      }

      // Parse time
      const parsed = TimesheetParser.parseTimesheetLog(`${key} ${timeInput.trim()}`);
      if (!parsed.isValid) {
        return {
          success: false,
          error: `Invalid time format: ${parsed.errors.join(', ')}`,
        };
      }

      // 2. Ask for description (with git auto-fill)
      const suggestedDesc = await this.getLastCommitMessage(key);
      const description = await this.showPrompt(
        'Description (optional):',
        suggestedDesc
      );

      // 3. Ask for date
      const dateInput = await this.showPrompt(
        'Date (today, yesterday, or YYYY-MM-DD):',
        'today'
      );

      // Parse date
      let targetDate: string;
      const parsedDateInput = (dateInput || 'today').toLowerCase().trim();

      if (parsedDateInput === 'today' || parsedDateInput === '') {
        targetDate = moment.tz(timezone).format('YYYY-MM-DD');
      } else if (parsedDateInput === 'yesterday') {
        targetDate = moment.tz(timezone).subtract(1, 'day').format('YYYY-MM-DD');
      } else {
        if (!moment(dateInput, 'YYYY-MM-DD', true).isValid()) {
          return {
            success: false,
            error: 'Invalid date format. Use: today, yesterday, or YYYY-MM-DD',
          };
        }
        targetDate = dateInput;
      }

      const finalDescription = description.trim() || undefined;

      // 4. Confirm
      const confirmMessage = finalDescription
        ? `Log ${timeInput.trim()} to ${key} on ${targetDate}?\nDescription: ${finalDescription}`
        : `Log ${timeInput.trim()} to ${key} on ${targetDate}?`;

      const confirmed = await this.showConfirmation(confirmMessage, 'Yes', 'No');

      if (!confirmed) {
        return { success: false, message: 'Cancelled' };
      }

      // 5. Submit
      const worklogCreator = new TempoWorklogCreator(this.userAccountId, {
        tempoApiToken: await this.configManager.getTempoApiToken(),
        jiraServer: await this.configManager.getJiraServer(),
        jiraAuthHeader: await this.configManager.getAuthHeader(),
      });

      const result = await worklogCreator.createWorklog(
        task.id,
        parsed.entries[0].timeSpentSeconds,
        targetDate,
        finalDescription
      );

      if (result.success) {
        const msg = finalDescription
          ? `Logged ${timeInput.trim()} to ${key} on ${targetDate} with description`
          : `Logged ${timeInput.trim()} to ${key} on ${targetDate}`;
        return {
          success: true,
          message: msg,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to log time',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private showPrompt(message: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      const theme = getTheme();

      const prompt = blessed.prompt({
        parent: this.screen,
        top: 'center',
        left: 'center',
        height: 9,
        width: '60%',
        keys: true,
        vi: true,
        mouse: true,
        tags: true,
        border: {
          type: 'line',
        },
        style: {
          border: {
            fg: theme.primary,
          },
          label: {
            fg: theme.primary,
            bold: true,
          },
          focus: {
            border: {
              fg: theme.primary,
            },
          },
        },
        padding: {
          left: 2,
          right: 2,
          top: 1,
          bottom: 1,
        },
        shadow: true,
        hidden: false,
      });

      // Set rounded border characters
      (prompt as any).border.ch = {
        top: '─',
        bottom: '─',
        left: '│',
        right: '│',
        tl: '╭',
        tr: '╮',
        bl: '╰',
        br: '╯',
      };

      prompt.input(`{bold}{white-fg}${message}{/white-fg}{/bold}`, defaultValue || '', (err, value) => {
        this.screen.render();
        resolve(value || '');
      });

      this.screen.render();
    });
  }

  /**
   * Attempt to get the last commit message from feature/{ticketId} branch
   */
  private async getLastCommitMessage(ticketId: string): Promise<string> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const branchName = `feature/${ticketId}`;
      
      // Check if branch exists
      try {
        await execAsync(`git rev-parse --verify ${branchName}`);
      } catch {
        // Branch doesn't exist, return empty
        return '';
      }
      
      // Get the last commit message from the branch
      const { stdout } = await execAsync(
        `git log ${branchName} -1 --pretty=format:%s`
      );
      
      return stdout.trim();
    } catch (error) {
      // If git command fails or any error occurs, just return empty string
      return '';
    }
  }

  private showConfirmation(message: string, yes: string, no: string): Promise<boolean> {
    return new Promise((resolve) => {
      const theme = getTheme();
      
      const question = blessed.question({
        parent: this.screen,
        top: 'center',
        left: 'center',
        height: 11,
        width: '60%',
        keys: true,
        vi: true,
        mouse: true,
        tags: true,
        border: {
          type: 'line',
        },
        style: {
          border: {
            fg: theme.primary,  // Use primary color (Crail)
          },
          label: {
            fg: theme.primary,  // Use primary color (Crail)
            bold: true,
          },
          focus: {
            border: {
              fg: theme.primary,  // Use primary color (Crail)
            },
          },
        },
        padding: {
          left: 2,
          right: 2,
          top: 1,
          bottom: 1,
        },
        shadow: true,
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

      const formattedMessage = `{bold}{white-fg}${message}{/white-fg}{/bold}\n\n{green-fg}[${yes}]{/green-fg} / {red-fg}[${no}]{/red-fg}`;

      question.ask(formattedMessage, (err: any, value: any) => {
        this.screen.render();
        const isYes = value === true || (typeof value === 'string' && value.toLowerCase() === yes.toLowerCase());
        resolve(isYes);
      });

      this.screen.render();
    });
  }
}
