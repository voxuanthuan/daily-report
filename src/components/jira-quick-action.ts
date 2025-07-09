import * as vscode from 'vscode';
import JiraCommandParser, { JiraCommand } from './jira-command-parser';
import JiraStatusManager from './jira-status-manager';
import TempoWorklogCreator from './tempo/worklog-creator';
import moment from 'moment-timezone';

export interface QuickActionResult {
  success: boolean;
  ticketKey: string;
  timeLogged?: string;
  statusChanged?: {
    from: string;
    to: string;
  };
  errors: string[];
  summary: string;
}

export class JiraQuickAction {
  private outputChannel: vscode.OutputChannel;
  private statusManager: JiraStatusManager;
  private worklogCreator: TempoWorklogCreator | null = null;

  constructor(authorAccountId?: string) {
    this.outputChannel = vscode.window.createOutputChannel('Jira Daily Report - Quick Actions');
    this.statusManager = new JiraStatusManager();
    if (authorAccountId) {
      this.worklogCreator = new TempoWorklogCreator(authorAccountId);
    }
  }

  /**
   * Execute a quick action command
   */
  async executeCommand(): Promise<void> {
    try {
      // Get user input with helpful placeholder
      const commandInput = await vscode.window.showInputBox({
        prompt: 'Enter Jira command (e.g., "B2B-1079 #time 2h #under-review")',
        placeHolder: 'B2B-1079 #time 2h #under-review',
        validateInput: (value) => {
          if (!value.trim()) {
            return 'Command cannot be empty';
          }
          const parsed = JiraCommandParser.parseCommand(value);
          if (!parsed.isValid) {
            return `Invalid command: ${parsed.errors.join(', ')}`;
          }
          return null;
        }
      });

      if (!commandInput) {
        return;
      }

      // Parse the command
      const parsedCommand = JiraCommandParser.parseCommand(commandInput);
      if (!parsedCommand.isValid) {
        vscode.window.showErrorMessage(`Invalid command: ${parsedCommand.errors.join(', ')}`);
        return;
      }

      // Execute the command
      const result = await this.executeQuickAction(parsedCommand);
      
      // Display results
      this.displayResults(result);

    } catch (error) {
      const errorMessage = `Error executing command: ${error}`;
      this.outputChannel.appendLine(errorMessage);
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  /**
   * Show command help
   */
  async showHelp(): Promise<void> {
    const helpText = JiraCommandParser.getHelpText();
    
    this.outputChannel.clear();
    this.outputChannel.appendLine('='.repeat(60));
    this.outputChannel.appendLine('JIRA QUICK ACTIONS HELP');
    this.outputChannel.appendLine('='.repeat(60));
    this.outputChannel.appendLine(helpText);
    this.outputChannel.show();

    vscode.window.showInformationMessage('Jira Quick Actions help shown in output panel');
  }

  /**
   * Show user's current tickets for quick selection
   */
  async showMyTickets(): Promise<void> {
    try {
      if (!this.worklogCreator) {
        vscode.window.showErrorMessage('Quick actions not initialized. Please check your configuration.');
        return;
      }

      // Get user's current tickets
      const tickets = await this.statusManager.getUserTickets(
        (this.worklogCreator as any).authorAccountId,
        ['In Progress', 'Selected for Development']
      );

      if (tickets.length === 0) {
        vscode.window.showInformationMessage('No tickets found in "In Progress" or "Selected for Development" status');
        return;
      }

      // Create quick pick items
      const quickPickItems = tickets.map(ticket => ({
        label: `${ticket.key}: ${ticket.fields.summary}`,
        detail: `Status: ${ticket.fields.status.name}`,
        description: ticket.fields.status.name === 'In Progress' ? '🔥 High Priority' : '',
        ticketKey: ticket.key,
        currentStatus: ticket.fields.status.name
      }));

      const selectedTicket = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: 'Select a ticket to work with',
        matchOnDetail: true,
        matchOnDescription: true
      });

      if (!selectedTicket) {
        return;
      }

      // Now ask what to do with the selected ticket
      const actions = [
        { label: '⏱️ Log Time', action: 'time' },
        { label: '📤 Submit for Review', action: 'review' },
        { label: '🔄 Change Status', action: 'status' },
        { label: '⚡ Log Time + Change Status', action: 'both' }
      ];

      const selectedAction = await vscode.window.showQuickPick(actions, {
        placeHolder: `What would you like to do with ${selectedTicket.ticketKey}?`
      });

      if (!selectedAction) {
        return;
      }

      // Generate command based on selection
      let command = selectedTicket.ticketKey;
      
      if (selectedAction.action === 'time' || selectedAction.action === 'both') {
        const timeInput = await vscode.window.showInputBox({
          prompt: 'Enter time to log (e.g., 2h, 1.5h, 30m)',
          placeHolder: '2h'
        });
        if (!timeInput) {
          return;
        }
        command += ` #time ${timeInput}`;
      }

      if (selectedAction.action === 'review') {
        command += ' #under-review';
      } else if (selectedAction.action === 'status' || selectedAction.action === 'both') {
        const statusOptions = [
          { label: 'In Progress', value: '#in-progress' },
          { label: 'Under Review', value: '#under-review' },
          { label: 'Ready for Testing', value: '#ready-for-testing' },
          { label: 'Selected for Development', value: '#selected' }
        ];

        const selectedStatus = await vscode.window.showQuickPick(statusOptions, {
          placeHolder: 'Select new status'
        });
        if (!selectedStatus) {
          return;
        }
        command += ` ${selectedStatus.value}`;
      }

      // Execute the generated command
      const parsedCommand = JiraCommandParser.parseCommand(command);
      if (parsedCommand.isValid) {
        const result = await this.executeQuickAction(parsedCommand);
        this.displayResults(result);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Error loading tickets: ${error}`);
    }
  }

  /**
   * Execute the parsed quick action
   */
  private async executeQuickAction(command: JiraCommand): Promise<QuickActionResult> {
    const result: QuickActionResult = {
      success: true,
      ticketKey: command.ticketKey,
      errors: [],
      summary: ''
    };

    const operations: string[] = [];

    try {
      // Execute status change if requested
      if (command.statusChange) {
        const statusResult = await this.statusManager.changeIssueStatus(
          command.ticketKey,
          command.statusChange.newStatus
        );

        if (statusResult.success) {
          result.statusChanged = {
            from: statusResult.oldStatus || 'Unknown',
            to: statusResult.newStatus || command.statusChange.newStatus
          };
          operations.push(`Status: ${result.statusChanged.from} → ${result.statusChanged.to}`);
        } else {
          result.errors.push(statusResult.error || 'Status change failed');
          result.success = false;
        }
      }

      // Execute time logging if requested
      if (command.timeEntry && this.worklogCreator) {
        const timeResult = await this.worklogCreator.createWorklog(
          command.ticketKey,
          command.timeEntry.timeSpentSeconds,
          moment.tz('Australia/Sydney').format('YYYY-MM-DD'),
          'Time logged via Quick Action'
        );

        if (timeResult.success) {
          result.timeLogged = command.timeEntry.timeString;
          operations.push(`Time logged: ${result.timeLogged}`);
        } else {
          result.errors.push(timeResult.error || 'Time logging failed');
          result.success = false;
        }
      } else if (command.timeEntry && !this.worklogCreator) {
        result.errors.push('Time logging not available - worklog creator not initialized');
        result.success = false;
      }

      // Create summary
      if (result.success) {
        result.summary = `✅ ${command.ticketKey}: ${operations.join(', ')}`;
      } else {
        result.summary = `❌ ${command.ticketKey}: ${result.errors.join(', ')}`;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Unexpected error: ${error}`);
      result.summary = `❌ ${command.ticketKey}: ${result.errors.join(', ')}`;
    }

    return result;
  }

  /**
   * Display the results of the quick action
   */
  private displayResults(result: QuickActionResult): void {
    this.outputChannel.clear();
    this.outputChannel.appendLine('='.repeat(60));
    this.outputChannel.appendLine('JIRA QUICK ACTION RESULT');
    this.outputChannel.appendLine('='.repeat(60));
    this.outputChannel.appendLine(result.summary);
    
    if (result.timeLogged) {
      this.outputChannel.appendLine(`⏱️ Time Logged: ${result.timeLogged}`);
    }
    
    if (result.statusChanged) {
      this.outputChannel.appendLine(`📋 Status Changed: ${result.statusChanged.from} → ${result.statusChanged.to}`);
    }
    
    if (result.errors.length > 0) {
      this.outputChannel.appendLine('\n❌ Errors:');
      result.errors.forEach(error => this.outputChannel.appendLine(`  • ${error}`));
    }
    
    this.outputChannel.show();

    // Show notification
    if (result.success) {
      if (result.errors.length === 0) {
        vscode.window.showInformationMessage(result.summary);
      } else {
        vscode.window.showWarningMessage(`Partially successful: ${result.summary}`);
      }
    } else {
      vscode.window.showErrorMessage(result.summary);
    }
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export default JiraQuickAction;