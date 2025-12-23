import blessed from 'blessed';
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

      const timeInput = await this.showPrompt(`Log time for ${key} (e.g., 2h, 1.5h, 30m):`);

      if (!timeInput) {
        return {
          success: false,
          message: 'Cancelled',
        };
      }

      const parsed = TimesheetParser.parseTimesheetLog(`${key} ${timeInput}`);
      if (!parsed.isValid) {
        return {
          success: false,
          error: `Invalid time format: ${parsed.errors.join(', ')}`,
        };
      }

      let targetDate: string;
      let description: string | undefined;

      if (withDateAndDescription) {
        // Ask for date
        const dateInput = await this.showPrompt(
          'Date (today, yesterday, or YYYY-MM-DD):'
        );

        if (!dateInput) {
          return {
            success: false,
            message: 'Cancelled',
          };
        }

        // Parse date
        const timezone = 'Australia/Sydney';
        if (dateInput.toLowerCase() === 'today' || dateInput === '') {
          targetDate = moment.tz(timezone).format('YYYY-MM-DD');
        } else if (dateInput.toLowerCase() === 'yesterday') {
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

        // Ask for description
        const descInput = await this.showPrompt('Description (optional):');
        description = descInput || undefined;
      } else {
        targetDate = moment.tz('Australia/Sydney').format('YYYY-MM-DD');
      }

      const confirmMessage = description
        ? `Log ${timeInput} to ${key} on ${targetDate}?\nDescription: ${description}`
        : `Log ${timeInput} to ${key} on ${targetDate}?`;

      const confirmed = await this.showConfirmation(confirmMessage, 'Yes', 'No');

      if (!confirmed) {
        return {
          success: false,
          message: 'Cancelled',
        };
      }

      const worklogCreator = new TempoWorklogCreator(this.userAccountId, {
        tempoApiToken: await this.configManager.getTempoApiToken(),
        jiraServer: await this.configManager.getJiraServer(),
        jiraAuthHeader: await this.configManager.getAuthHeader(),
      });

      const result = await worklogCreator.createWorklog(
        task.id,
        parsed.entries[0].timeSpentSeconds,
        targetDate,
        description
      );

      if (result.success) {
        const msg = description
          ? `Logged ${timeInput} to ${key} on ${targetDate} with description`
          : `Logged ${timeInput} to ${key} on ${targetDate}`;
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

  private showPrompt(message: string): Promise<string> {
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

      prompt.input(`{bold}${message}{/bold}`, '', (err, value) => {
        this.screen.render();
        resolve(value || '');
      });

      this.screen.render();
    });
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
