import * as vscode from 'vscode';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getJiraServer, getApiHeaders } from '../components/config-utils';

// Jira API interfaces
interface JiraTransition {
  id: string;
  name: string;
  to: {
    statusCategory: {
      key: string;
    };
  };
}

interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    summary: string;
    assignee?: {
      accountId: string;
      displayName: string;
    };
  };
}

interface StatusChangeResult {
  success: boolean;
  ticketKey: string;
  oldStatus?: string;
  newStatus?: string;
  error?: string;
}

export class JiraStatusManager {
  private jiraAxios: AxiosInstance;

  constructor() {
    this.jiraAxios = axios.create({
      baseURL: getJiraServer(),
      headers: getApiHeaders(),
    });
  }

  /**
   * Get current issue details
   */
  async getIssueDetails(issueKey: string): Promise<JiraIssue> {
    try {
      const response: AxiosResponse<JiraIssue> = await this.jiraAxios.get(`/rest/api/2/issue/${issueKey}`, {
        params: {
          fields: 'status,summary,assignee'
        }
      });
      return response.data;
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
      throw new Error(`Failed to get issue details: ${error}`);
    }
  }

  /**
   * Get available transitions for an issue
   */
  async getAvailableTransitions(issueKey: string): Promise<JiraTransition[]> {
    try {
      const response: AxiosResponse<JiraTransitionsResponse> = await this.jiraAxios.get(
        `/rest/api/2/issue/${issueKey}/transitions`
      );
      return response.data.transitions;
    } catch (error) {
      throw new Error(`Failed to get transitions for ${issueKey}: ${error}`);
    }
  }

  /**
   * Change issue status
   */
  async changeIssueStatus(issueKey: string, newStatus: string): Promise<StatusChangeResult> {
    try {
      // Get current issue details
      const issue = await this.getIssueDetails(issueKey);
      const currentStatus = issue.fields.status.name;

      // Check if already in target status
      if (currentStatus.toLowerCase() === newStatus.toLowerCase()) {
        return {
          success: true,
          ticketKey: issueKey,
          oldStatus: currentStatus,
          newStatus: currentStatus,
          error: `Ticket ${issueKey} is already in status "${currentStatus}"`
        };
      }

      // Get available transitions
      const transitions = await this.getAvailableTransitions(issueKey);
      
      // Find transition that leads to target status
      const targetTransition = transitions.find(transition => 
        transition.name.toLowerCase() === newStatus.toLowerCase() ||
        transition.name.toLowerCase().includes(newStatus.toLowerCase()) ||
        newStatus.toLowerCase().includes(transition.name.toLowerCase())
      );

      if (!targetTransition) {
        const availableTransitions = transitions.map(t => t.name).join(', ');
        return {
          success: false,
          ticketKey: issueKey,
          oldStatus: currentStatus,
          error: `Cannot transition to "${newStatus}". Available transitions: ${availableTransitions}`
        };
      }

      // Execute transition
      await this.jiraAxios.post(`/rest/api/2/issue/${issueKey}/transitions`, {
        transition: {
          id: targetTransition.id
        }
      });

      return {
        success: true,
        ticketKey: issueKey,
        oldStatus: currentStatus,
        newStatus: targetTransition.name
      };

    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.errorMessages) {
          errorMessage = error.response.data.errorMessages.join(', ');
        } else if (error.response?.data?.errors) {
          errorMessage = Object.values(error.response.data.errors).join(', ');
        } else if (error.response?.status === 400) {
          errorMessage = 'Invalid transition. The status change may not be allowed.';
        } else {
          errorMessage = `API Error: ${error.response?.status} ${error.response?.statusText}`;
        }
      } else {
        errorMessage = `${error}`;
      }

      return {
        success: false,
        ticketKey: issueKey,
        error: errorMessage
      };
    }
  }

  /**
   * Get user's current tickets with specific statuses
   */
  async getUserTickets(accountId: string, statuses: string[] = ['In Progress', 'Selected for Development']): Promise<JiraIssue[]> {
    try {
      const statusFilter = statuses.map(status => `"${status}"`).join(', ');
      const jql = `assignee = "${accountId}" AND status IN (${statusFilter}) ORDER BY status DESC, updated DESC`;
      
      const response = await this.jiraAxios.get('/rest/api/2/search', {
        params: {
          jql,
          fields: 'status,summary,assignee',
          maxResults: 20
        }
      });

      return response.data.issues;
    } catch (error) {
      console.error('Failed to fetch user tickets:', error);
      return [];
    }
  }

  /**
   * Format status change result for display
   */
  formatStatusChangeResult(result: StatusChangeResult): string {
    if (result.success) {
      if (result.oldStatus === result.newStatus) {
        return `ℹ️ ${result.ticketKey} is already in status "${result.newStatus}"`;
      } else {
        return `✅ ${result.ticketKey}: "${result.oldStatus}" → "${result.newStatus}"`;
      }
    } else {
      return `❌ ${result.ticketKey}: ${result.error}`;
    }
  }
}

export default JiraStatusManager;