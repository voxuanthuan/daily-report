import moment from 'moment-timezone';

export interface TimesheetEntry {
  ticketKey: string;
  timeSpentSeconds: number;
  rawText: string;
}

export interface ParsedTimesheetLog {
  entries: TimesheetEntry[];
  totalSeconds: number;
  isValid: boolean;
  errors: string[];
}

class TimesheetParser {
  private static readonly TIME_PATTERN = /(\d+(?:\.\d+)?)\s*([hm])/gi;
  private static readonly TICKET_PATTERN = /([A-Z0-9]+-\d+)/g;
  private static readonly FULL_ENTRY_PATTERN = /([A-Z0-9]+-[0-9]+)\s+((?:\d+(?:\.\d+)?[hm]\s*)+)/gi;

  /**
   * Parse a timesheet log string containing entries like "B2B-1079 2h, PROJECT-123 1.5h"
   * @param logText - The raw timesheet log text
   * @returns ParsedTimesheetLog object with parsed entries and validation info
   */
  static parseTimesheetLog(logText: string): ParsedTimesheetLog {
    const result: ParsedTimesheetLog = {
      entries: [],
      totalSeconds: 0,
      isValid: true,
      errors: []
    };

    if (!logText || logText.trim() === '') {
      result.isValid = false;
      result.errors.push('Empty timesheet log');
      return result;
    }

    const normalizedLog = logText.trim();
    const entries = this.extractEntries(normalizedLog);

    if (entries.length === 0) {
      result.isValid = false;
      result.errors.push('No valid entries found in format "TICKET-123 2h"');
      return result;
    }

    result.entries = entries;
    result.totalSeconds = entries.reduce((sum, entry) => sum + entry.timeSpentSeconds, 0);

    return result;
  }

  /**
   * Extract individual timesheet entries from the log text
   */
  private static extractEntries(logText: string): TimesheetEntry[] {
    const entries: TimesheetEntry[] = [];
    this.FULL_ENTRY_PATTERN.lastIndex = 0; // Reset regex state
    const matches = Array.from(logText.matchAll(this.FULL_ENTRY_PATTERN));

    for (const match of matches) {
      const ticketKey = match[1];
      const timeString = match[2];
      const timeSpentSeconds = this.parseTimeToSeconds(timeString);
      
      if (timeSpentSeconds > 0) {
        entries.push({
          ticketKey: ticketKey.toUpperCase(),
          timeSpentSeconds,
          rawText: match[0]
        });
      }
    }

    return entries;
  }

  /**
   * Convert time string like "2h", "1.5h", "30m" to seconds
   */
  private static parseTimeToSeconds(timeString: string): number {
    this.TIME_PATTERN.lastIndex = 0; // Reset regex state
    const matches = Array.from(timeString.matchAll(this.TIME_PATTERN));
    let totalSeconds = 0;

    for (const match of matches) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();

      if (unit === 'h') {
        totalSeconds += value * 3600; // hours to seconds
      } else if (unit === 'm') {
        totalSeconds += value * 60; // minutes to seconds
      }
    }

    return totalSeconds;
  }

  /**
   * Format seconds back to human-readable time
   */
  static formatSecondsToTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  }

  /**
   * Validate a single timesheet entry format
   */
  static validateEntry(entry: string): boolean {
    const trimmed = entry.trim();
    this.FULL_ENTRY_PATTERN.lastIndex = 0; // Reset regex state
    return this.FULL_ENTRY_PATTERN.test(trimmed);
  }

  /**
   * Get example formats for user guidance
   */
  static getExampleFormats(): string[] {
    return [
      'B2B-1079 2h',
      'PROJECT-123 1.5h',
      'B2B-1079 2h, PROJECT-456 30m',
      'TICKET-789 1h 30m'
    ];
  }
}

export default TimesheetParser;