import * as vscode from 'vscode';
import TimesheetParser from '../core/tempo/timesheet-parser';
import TempoFormatter from '../core/tempo/formatter';
import TempoWorklogCreator from '../core/tempo/worklog-creator';
import moment from 'moment-timezone';

export class TimesheetHandler {
  private outputChannel: vscode.OutputChannel;
  private formatter: TempoFormatter;
  public worklogCreator: TempoWorklogCreator | null = null;

  constructor(authorAccountId?: string) {
    this.outputChannel = vscode.window.createOutputChannel('Jira Daily Report - Timesheet');
    this.formatter = new TempoFormatter();
    if (authorAccountId) {
      this.worklogCreator = new TempoWorklogCreator(authorAccountId);
    }
  }

  async parseTimesheetLog(): Promise<void> {
    try {
      const timesheetLog = await vscode.window.showInputBox({
        prompt: 'Enter timesheet log entries (e.g., "B2B-1079 2h, PROJECT-123 1.5h")',
        placeHolder: 'B2B-1079 2h, PROJECT-123 1.5h',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Timesheet log cannot be empty';
          }
          const parsed = TimesheetParser.parseTimesheetLog(value);
          if (!parsed.isValid) {
            return `Invalid format: ${parsed.errors.join(', ')}`;
          }
          return null;
        }
      });

      if (!timesheetLog) {
        return;
      }

      const formattedResult = this.formatter.formatTimesheetLog(timesheetLog);
      
      this.outputChannel.clear();
      this.outputChannel.appendLine('='.repeat(60));
      this.outputChannel.appendLine('TIMESHEET LOG PARSING RESULT');
      this.outputChannel.appendLine('='.repeat(60));
      this.outputChannel.appendLine(formattedResult);
      this.outputChannel.show();

      const autoClipboard = vscode.workspace.getConfiguration('grappleDailyReport').get<boolean>('autoClipboard', true);
      if (autoClipboard) {
        await vscode.env.clipboard.writeText(formattedResult);
        vscode.window.showInformationMessage('Timesheet log summary copied to clipboard!');
      } else {
        vscode.window.showInformationMessage('Timesheet log parsed successfully! Check the output panel for results.');
      }

    } catch (error) {
      const errorMessage = `Error parsing timesheet log: ${error}`;
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  async getTimesheetWorklogs(timesheetLog: string, date?: string): Promise<any[]> {
    const targetDate = date || moment.tz('Australia/Sydney').format('YYYY-MM-DD');
    return this.formatter.convertTimesheetToWorklogs(timesheetLog, targetDate);
  }

  async promptForTimesheetIntegration(): Promise<string | undefined> {
    const enableTimesheetIntegration = vscode.workspace.getConfiguration('grappleDailyReport')
      .get<boolean>('enableTimesheetIntegration', true);
    
    if (!enableTimesheetIntegration) {
      return undefined;
    }

    const action = await vscode.window.showInformationMessage(
      'Would you like to add timesheet entries to your daily report?',
      'Add Timesheet Entries',
      'Skip'
    );

    if (action === 'Add Timesheet Entries') {
      const timesheetLog = await vscode.window.showInputBox({
        prompt: 'Enter timesheet log entries for today (e.g., "B2B-1079 2h, PROJECT-123 1.5h")',
        placeHolder: 'B2B-1079 2h, PROJECT-123 1.5h',
        validateInput: (value) => {
          if (!value.trim()) {
            return null; // Allow empty for optional input
          }
          const parsed = TimesheetParser.parseTimesheetLog(value);
          if (!parsed.isValid) {
            return `Invalid format: ${parsed.errors.join(', ')}`;
          }
          return null;
        }
      });

      return timesheetLog;
    }

    return undefined;
  }

  formatTimesheetSection(timesheetLog: string): string {
    if (!timesheetLog || timesheetLog.trim() === '') {
      return '';
    }

    const parsed = TimesheetParser.parseTimesheetLog(timesheetLog);
    if (!parsed.isValid) {
      return `\n⚠️  Invalid timesheet format: ${parsed.errors.join(', ')}\n`;
    }

    let section = '\n📋 **Today\'s Timesheet Log**\n';
    
    // Group entries by ticket
    const ticketTotals: { [key: string]: number } = {};
    parsed.entries.forEach(entry => {
      ticketTotals[entry.ticketKey] = (ticketTotals[entry.ticketKey] || 0) + entry.timeSpentSeconds;
    });

    // Format breakdown
    Object.entries(ticketTotals).forEach(([ticket, seconds]) => {
      section += `  • ${ticket}: ${TimesheetParser.formatSecondsToTime(seconds)}\n`;
    });

    section += `\n**Total Time Logged:** ${TimesheetParser.formatSecondsToTime(parsed.totalSeconds)}\n`;

    return section;
  }

  /**
   * Log time directly to Tempo from timesheet format
   */
  async logTimeToTempo(): Promise<void> {
    if (!this.worklogCreator) {
      vscode.window.showErrorMessage('Worklog creator not initialized. Please ensure you have valid Tempo API access.');
      return;
    }

    try {
      const timesheetLog = await vscode.window.showInputBox({
        prompt: 'Enter timesheet log entries to log to Tempo (e.g., "B2B-1079 2h, PROJECT-123 1.5h")',
        placeHolder: 'B2B-1079 2h, PROJECT-123 1.5h',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Timesheet log cannot be empty';
          }
          const parsed = TimesheetParser.parseTimesheetLog(value);
          if (!parsed.isValid) {
            return `Invalid format: ${parsed.errors.join(', ')}`;
          }
          return null;
        }
      });

      if (!timesheetLog) {
        return;
      }

      // Ask for date
      const dateOptions = [
        { label: '📅 Today', date: this.worklogCreator.getTodayDate() },
        { label: '⏮️ Yesterday', date: this.worklogCreator.getYesterdayDate() },
        { label: '📆 Custom Date', date: 'custom' }
      ];

      const selectedDateOption = await vscode.window.showQuickPick(dateOptions, {
        placeHolder: 'Select date for worklog entries'
      });

      if (!selectedDateOption) {
        return;
      }

      let targetDate = selectedDateOption.date;
      if (targetDate === 'custom') {
        const customDate = await vscode.window.showInputBox({
          prompt: 'Enter date (YYYY-MM-DD format)',
          placeHolder: '2024-01-15',
          validateInput: (value) => {
            if (!value.trim()) {
              return 'Date cannot be empty';
            }
            if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
              return 'Invalid date format. Use YYYY-MM-DD';
            }
            return null;
          }
        });

        if (!customDate) {
          return;
        }
        targetDate = customDate;
      }

      // Ask for optional description
      const description = await vscode.window.showInputBox({
        prompt: 'Enter optional description for all entries (press Enter to skip)',
        placeHolder: 'Optional description...'
      });

      // Create worklogs
      const results = await this.worklogCreator.createWorklogsFromTimesheet(
        timesheetLog,
        targetDate,
        description
      );

      // Display results
      const formattedResults = this.worklogCreator.formatResults(results);
      
      this.outputChannel.clear();
      this.outputChannel.appendLine('='.repeat(60));
      this.outputChannel.appendLine('TEMPO WORKLOG CREATION RESULTS');
      this.outputChannel.appendLine('='.repeat(60));
      this.outputChannel.appendLine(formattedResults);
      this.outputChannel.show();

      // Show summary notification
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (failed.length === 0) {
        vscode.window.showInformationMessage(`✅ Successfully logged time for ${successful.length} ticket(s) to Tempo!`);
      } else if (successful.length === 0) {
        vscode.window.showErrorMessage(`❌ Failed to log time for all ${failed.length} ticket(s). Check output for details.`);
      } else {
        vscode.window.showWarningMessage(`⚠️ Partially successful: ${successful.length} succeeded, ${failed.length} failed. Check output for details.`);
      }

    } catch (error) {
      const errorMessage = `Error logging time to Tempo: ${error}`;
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * Log a single worklog entry to Tempo
   */
  async logSingleWorklog(): Promise<void> {
    if (!this.worklogCreator) {
      vscode.window.showErrorMessage('Worklog creator not initialized. Please ensure you have valid Tempo API access.');
      return;
    }

    try {
      const ticketKey = await vscode.window.showInputBox({
        prompt: 'Enter Jira ticket key (e.g., B2B-1079)',
        placeHolder: 'B2B-1079',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Ticket key cannot be empty';
          }
          if (!/^[A-Z0-9]+-[0-9]+$/i.test(value.trim())) {
            return 'Invalid ticket format. Use format like B2B-1079';
          }
          return null;
        }
      });

      if (!ticketKey) {
        return;
      }

      const timeSpent = await vscode.window.showInputBox({
        prompt: 'Enter time spent (e.g., 2h, 1.5h, 30m)',
        placeHolder: '2h',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Time cannot be empty';
          }
          const parsed = TimesheetParser.parseTimesheetLog(`${ticketKey} ${value}`);
          if (!parsed.isValid) {
            return 'Invalid time format. Use formats like 2h, 1.5h, 30m';
          }
          return null;
        }
      });

      if (!timeSpent) {
        return;
      }

      const description = await vscode.window.showInputBox({
        prompt: 'Enter work description (optional)',
        placeHolder: 'What did you work on?'
      });

      // Parse time to seconds
      const parsed = TimesheetParser.parseTimesheetLog(`${ticketKey} ${timeSpent}`);
      const timeSpentSeconds = parsed.entries[0].timeSpentSeconds;

      // Create single worklog
      const result = await this.worklogCreator.createWorklog(
        ticketKey,
        timeSpentSeconds,
        this.worklogCreator.getTodayDate(),
        description || undefined
      );

      if (result.success) {
        vscode.window.showInformationMessage(`✅ Successfully logged ${result.timeSpent} to ${result.ticketKey}!`);
      } else {
        vscode.window.showErrorMessage(`❌ Failed to log time: ${result.error}`);
      }

    } catch (error) {
      const errorMessage = `Error logging worklog: ${error}`;
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export default TimesheetHandler;