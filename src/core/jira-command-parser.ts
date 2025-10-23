import TimesheetParser from './tempo/timesheet-parser';

export interface JiraCommand {
  ticketKey: string;
  timeEntry?: {
    timeSpentSeconds: number;
    timeString: string;
  };
  statusChange?: {
    newStatus: string;
    statusDisplay: string;
  };
  isValid: boolean;
  errors: string[];
}

class JiraCommandParser {
  // Valid status mappings (excluding done and decline)
  private static readonly STATUS_MAPPINGS: { [key: string]: string } = {
    'open': 'Open',
    'selected': 'Selected for Development',
    'selected-for-development': 'Selected for Development',
    'inprogress': 'In Progress',
    'in-progress': 'In Progress',
    'under-review': 'Under Review',
    'ready-for-testing': 'Ready for Testing',
    'testing': 'Ready for Testing'
  };

  // Alias mappings for common variations
  private static readonly STATUS_ALIASES: { [key: string]: string } = {
    'dev': 'selected-for-development',
    'development': 'selected-for-development',
    'progress': 'in-progress',
    'wip': 'in-progress',
    'review': 'under-review',
    'pr': 'under-review',
    'test': 'ready-for-testing',
    'qa': 'ready-for-testing'
  };

  /**
   * Parse a command string like "B2B-1079 #time 2h #under-review"
   * 
   * Supported formats:
   * - B2B-1079 #time 2h #under-review (log time + change status)
   * - B2B-1079 #under-review (change status only)
   * - B2B-1079 #time 2h (log time only)
   * - #time 2h B2B-1079 (order doesn't matter)
   */
  static parseCommand(input: string): JiraCommand {
    const result: JiraCommand = {
      ticketKey: '',
      isValid: false,
      errors: []
    };

    if (!input || input.trim() === '') {
      result.errors.push('Command cannot be empty');
      return result;
    }

    const trimmedInput = input.trim();
    
    // Extract ticket key (pattern: LETTERS-NUMBERS or LETTERS+NUMBERS-NUMBERS)
    const ticketMatch = trimmedInput.match(/([A-Z0-9]+-[0-9]+)/i);
    if (!ticketMatch) {
      result.errors.push('No valid ticket key found (expected format: B2B-1079)');
      return result;
    }
    
    result.ticketKey = ticketMatch[1].toUpperCase();

    // Extract hashtags
    const hashtagMatches = trimmedInput.match(/#[\w-]+(?:\s+[\w.]+)?/g) || [];
    
    if (hashtagMatches.length === 0) {
      result.errors.push('No hashtags found (use #time, #status, etc.)');
      return result;
    }

    // Process hashtags
    for (const hashtag of hashtagMatches) {
      const parts = hashtag.substring(1).split(/\s+/); // Remove # and split
      const command = parts[0].toLowerCase();
      const value = parts.slice(1).join(' ');

      if (command === 'time') {
        if (!value) {
          result.errors.push('#time requires a value (e.g., #time 2h)');
          continue;
        }
        
        // Parse time using existing timesheet parser
        const timeParseResult = TimesheetParser.parseTimesheetLog(`${result.ticketKey} ${value}`);
        if (!timeParseResult.isValid) {
          result.errors.push(`Invalid time format: ${timeParseResult.errors.join(', ')}`);
          continue;
        }
        
        result.timeEntry = {
          timeSpentSeconds: timeParseResult.totalSeconds,
          timeString: value
        };
      } else {
        // Check if it's a status command
        const normalizedStatus = this.normalizeStatus(command);
        if (normalizedStatus) {
          result.statusChange = {
            newStatus: this.STATUS_MAPPINGS[normalizedStatus],
            statusDisplay: this.STATUS_MAPPINGS[normalizedStatus]
          };
        } else {
          result.errors.push(`Unknown status: #${command}. Valid statuses: ${Object.keys(this.STATUS_MAPPINGS).join(', ')}`);
        }
      }
    }

    // Validate that we have at least time or status
    if (!result.timeEntry && !result.statusChange) {
      result.errors.push('Must specify either #time or a status change');
      return result;
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Normalize status name by checking aliases and variations
   */
  private static normalizeStatus(status: string): string | null {
    const normalized = status.toLowerCase();
    
    // Check direct mapping
    if (this.STATUS_MAPPINGS[normalized]) {
      return normalized;
    }
    
    // Check aliases
    if (this.STATUS_ALIASES[normalized]) {
      return this.STATUS_ALIASES[normalized];
    }
    
    // Check partial matches
    for (const [key, value] of Object.entries(this.STATUS_MAPPINGS)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Get available status options for help/autocomplete
   */
  static getAvailableStatuses(): string[] {
    return Object.keys(this.STATUS_MAPPINGS);
  }

  /**
   * Get status aliases for help
   */
  static getStatusAliases(): { [key: string]: string } {
    return { ...this.STATUS_ALIASES };
  }

  /**
   * Format command examples for help
   */
  static getExampleCommands(): string[] {
    return [
      'B2B-1079 #time 2h #under-review',
      'PROJECT-123 #time 1.5h',
      'TASK-456 #in-progress',
      'B2B-1079 #time 30m #review',
      'PROJECT-123 #dev #time 45m'
    ];
  }

  /**
   * Generate help text for the command syntax
   */
  static getHelpText(): string {
    const statuses = this.getAvailableStatuses().join(', ');
    const aliases = Object.entries(this.STATUS_ALIASES)
      .map(([alias, full]) => `${alias} → ${full}`)
      .join(', ');
    
    return `
🎯 **Jira Command Syntax**

**Format:** TICKET-123 #time 2h #status

**Examples:**
${this.getExampleCommands().map(cmd => `  • ${cmd}`).join('\n')}

**Time formats:** 2h, 1.5h, 30m, 1h 30m

**Available statuses:** ${statuses}

**Status aliases:** ${aliases}

**What happens:**
• #time 2h → Logs 2 hours to the ticket
• #under-review → Changes ticket status to "Under Review"
• Both → Logs time AND changes status
    `.trim();
  }
}

export { JiraCommandParser };
export default JiraCommandParser;