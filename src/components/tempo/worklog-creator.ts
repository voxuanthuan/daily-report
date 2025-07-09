import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TEMPO_API_TOKEN, TEMPO_URL, JIRA_SERVER, apiHeaders } from '../config-utils';
import moment from 'moment-timezone';
import TimesheetParser, { TimesheetEntry } from './timesheet-parser';

const TEMPO_API_DOCS_LINK = 'https://apidocs.tempo.io/v4';

// Tempo API v4 interfaces
interface CreateWorklogRequest {
  issueId: string;
  timeSpentSeconds: number;
  startDate: string;
  startTime?: string;
  description?: string;
  authorAccountId: string;
  attributes?: WorklogAttribute[];
}

// Jira API interface for issue lookup
interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
  };
}

interface WorklogAttribute {
  key: string;
  value: string;
}

interface CreateWorklogResponse {
  tempoWorklogId: number;
  jiraWorklogId: number;
  issue: {
    key: string;
    id: string;
  };
  timeSpentSeconds: number;
  startDate: string;
  startTime: string;
  author: {
    accountId: string;
    displayName: string;
  };
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface WorklogCreationResult {
  success: boolean;
  worklogId?: number;
  error?: string;
  ticketKey: string;
  timeSpent: string;
}

export class TempoWorklogCreator {
  private tempoAxios: AxiosInstance;
  private jiraAxios: AxiosInstance;
  private authorAccountId: string;
  private timezone: string = 'Australia/Sydney';

  constructor(authorAccountId: string) {
    this.authorAccountId = authorAccountId;
    
    // Tempo API instance
    this.tempoAxios = axios.create({
      baseURL: TEMPO_URL,
      headers: {
        Authorization: `Bearer ${TEMPO_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Jira API instance
    this.jiraAxios = axios.create({
      baseURL: JIRA_SERVER,
      headers: apiHeaders,
    });
  }

  /**
   * Resolve issue key to issue ID using Jira API
   */
  private async resolveIssueId(issueKey: string): Promise<string> {
    try {
      const response: AxiosResponse<JiraIssue> = await this.jiraAxios.get(`/rest/api/2/issue/${issueKey}`, {
        params: {
          fields: 'id,key,summary'
        }
      });
      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Ticket ${issueKey} not found`);
        } else if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please check your Jira credentials');
        } else if (error.response?.status === 403) {
          throw new Error(`Access denied to ticket ${issueKey}`);
        }
      }
      throw new Error(`Failed to resolve ticket ${issueKey}: ${error}`);
    }
  }

  /**
   * Create a single worklog entry in Tempo
   */
  async createWorklog(
    issueKey: string,
    timeSpentSeconds: number,
    startDate: string,
    description?: string,
    startTime?: string
  ): Promise<WorklogCreationResult> {
    if (!TEMPO_API_TOKEN) {
      const error = `Tempo API token is missing. Please configure it in settings. See ${TEMPO_API_DOCS_LINK}`;
      vscode.window.showErrorMessage(error);
      return { success: false, error, ticketKey: issueKey, timeSpent: TimesheetParser.formatSecondsToTime(timeSpentSeconds) };
    }

    try {
      // First, resolve the issue key to issue ID
      const issueId = await this.resolveIssueId(issueKey.toUpperCase());
      
      const worklogData: CreateWorklogRequest = {
        issueId,
        timeSpentSeconds,
        startDate,
        startTime,
        description,
        authorAccountId: this.authorAccountId,
      };

      const response: AxiosResponse<CreateWorklogResponse> = await this.tempoAxios.post('/worklogs', worklogData);
      
      return {
        success: true,
        worklogId: response.data.tempoWorklogId,
        ticketKey: issueKey,
        timeSpent: TimesheetParser.formatSecondsToTime(timeSpentSeconds)
      };
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.errors) {
          errorMessage = error.response.data.errors.map((e: any) => e.message).join(', ');
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.status === 404) {
          errorMessage = `Ticket ${issueKey} not found or you don't have permission to log time`;
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication failed. Please check your Tempo API token';
        } else if (error.response?.status === 403) {
          errorMessage = 'Permission denied. You may not have permission to log time on this ticket';
        } else {
          errorMessage = `API Error: ${error.response?.status} ${error.response?.statusText}`;
        }
      } else {
        errorMessage = `Network error: ${error}`;
      }

      return {
        success: false,
        error: errorMessage,
        ticketKey: issueKey,
        timeSpent: TimesheetParser.formatSecondsToTime(timeSpentSeconds)
      };
    }
  }

  /**
   * Create multiple worklog entries from timesheet log format
   */
  async createWorklogsFromTimesheet(
    timesheetLog: string,
    startDate?: string,
    description?: string
  ): Promise<WorklogCreationResult[]> {
    const parsed = TimesheetParser.parseTimesheetLog(timesheetLog);
    
    if (!parsed.isValid) {
      const error = `Invalid timesheet format: ${parsed.errors.join(', ')}`;
      vscode.window.showErrorMessage(error);
      return [{
        success: false,
        error,
        ticketKey: 'INVALID',
        timeSpent: '0m'
      }];
    }

    const targetDate = startDate || moment.tz(this.timezone).format('YYYY-MM-DD');
    const results: WorklogCreationResult[] = [];

    // Show progress for multiple entries
    const progressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: 'Creating Tempo Worklogs',
      cancellable: false
    };

    return vscode.window.withProgress(progressOptions, async (progress) => {
      const totalEntries = parsed.entries.length;
      
      for (let i = 0; i < parsed.entries.length; i++) {
        const entry = parsed.entries[i];
        const progressPercent = ((i + 1) / totalEntries) * 100;
        
        progress.report({
          message: `Creating worklog ${i + 1}/${totalEntries}: ${entry.ticketKey}`,
          increment: progressPercent / totalEntries
        });

        const worklogDescription = description || `Timesheet entry: ${entry.rawText}`;
        const result = await this.createWorklog(
          entry.ticketKey,
          entry.timeSpentSeconds,
          targetDate,
          worklogDescription
        );
        
        results.push(result);
        
        // Small delay to avoid rate limiting
        if (i < parsed.entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return results;
    });
  }

  /**
   * Get today's date in the configured timezone
   */
  getTodayDate(): string {
    return moment.tz(this.timezone).format('YYYY-MM-DD');
  }

  /**
   * Get yesterday's date in the configured timezone
   */
  getYesterdayDate(): string {
    return moment.tz(this.timezone).subtract(1, 'day').format('YYYY-MM-DD');
  }

  /**
   * Format worklog creation results for display
   */
  formatResults(results: WorklogCreationResult[]): string {
    let output = '🕐 **Tempo Worklog Creation Results**\n\n';
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length > 0) {
      output += '✅ **Successfully Created:**\n';
      successful.forEach(result => {
        output += `  • ${result.ticketKey}: ${result.timeSpent}${result.worklogId ? ` (ID: ${result.worklogId})` : ''}\n`;
      });
      output += '\n';
    }
    
    if (failed.length > 0) {
      output += '❌ **Failed to Create:**\n';
      failed.forEach(result => {
        output += `  • ${result.ticketKey}: ${result.timeSpent} - ${result.error}\n`;
      });
      output += '\n';
    }
    
    const totalTime = results.reduce((sum, r) => {
      const parsed = TimesheetParser.parseTimesheetLog(`${r.ticketKey} ${r.timeSpent}`);
      return sum + parsed.totalSeconds;
    }, 0);
    
    output += `**Total Time:** ${TimesheetParser.formatSecondsToTime(totalTime)}\n`;
    output += `**Success Rate:** ${successful.length}/${results.length} (${Math.round(successful.length / results.length * 100)}%)\n`;
    
    return output;
  }
}

export default TempoWorklogCreator;
