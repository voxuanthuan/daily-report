import axios, { AxiosInstance, AxiosResponse } from 'axios';
import moment from 'moment-timezone';

const TEMPO_URL = 'https://api.tempo.io/4';
const TEMPO_API_DOCS_LINK = 'https://apidocs.tempo.io/#section/Authentication';

// Define interfaces for Tempo API response structure
interface WorklogIssue {
  key: string;
  summary: string;
  id: string
}

export interface Worklog {
  tempoWorklogId: number;
  issue: WorklogIssue;
  timeSpentSeconds: number;
  startDate: string;
  author: {
    accountId: string;
    self: string;  
  };
  description?: string;
}

interface TempoResponse {
  results: Worklog[];
  metadata: {
    count: number;
  };
}


// Enhanced caching for Tempo data
interface WorklogCache {
  data: Worklog[];
  timestamp: number;
  key: string;
}

const worklogCache = new Map<string, WorklogCache>();
const WORKLOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class TempoFetcher {
  private axiosInstance: AxiosInstance | null = null;
  private workerId: string;
  private tempoApiToken: string;
  private timezone: string = 'Australia/Sydney';

  constructor(workerId: string, tempoApiToken: string) {
    this.workerId = workerId;
    this.tempoApiToken = tempoApiToken;
  }

  private getAxiosInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      this.axiosInstance = axios.create({
        baseURL: TEMPO_URL,
        headers: {
          Authorization: `Bearer ${this.tempoApiToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
    return this.axiosInstance;
  }

  private getLastSixWorkingDays(): { startDate: string; endDate: string } {
    const today = moment.tz(this.timezone); // Use moment-timezone with Australia/Sydney
    const days: moment.Moment[] = [];
    let currentDate = today.clone();

    while (days.length < 10) {
      const weekday = currentDate.isoWeekday();
      if (weekday <= 5) { // Monday (1) to Friday (5), exclude Saturday (6) and Sunday (7)
        days.unshift(currentDate.clone());
      }
      currentDate.subtract(1, 'day');
    }

    const startDate = days[0].tz(this.timezone).format('YYYY-MM-DD');
    const endDate = today.tz(this.timezone).format('YYYY-MM-DD');
    return { startDate, endDate };
  }

  async fetchLastSixDaysWorklogs(): Promise<Worklog[]> {
    const { startDate, endDate } = this.getLastSixWorkingDays();
    const cacheKey = `${this.workerId}-${startDate}-${endDate}`;
    
    // Check cache first
    const cached = worklogCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < WORKLOG_CACHE_TTL) {

      return cached.data;
    }

    if(!this.tempoApiToken) {
      const errorMessage = `Jira Tempo API token is missing. Please configure Jira Tempo API token in settings. See ${TEMPO_API_DOCS_LINK} for more info.`;
      throw new Error(errorMessage);
    }

    try {
      const requestBody = {
        authorIds: [this.workerId],
        from: startDate,
        to: endDate,
        offset: 0,
        limit: 70
      };

      const axiosInstance = this.getAxiosInstance();
      const response: AxiosResponse<TempoResponse> = await axiosInstance.post('/worklogs/search', requestBody);
      const final = response.data.results;
      
      // Cache the result
      worklogCache.set(cacheKey, {
        data: final,
        timestamp: Date.now(),
        key: cacheKey
      });
      
      return final;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch worklogs: ${error.response?.data?.errorMessages || error.message}`);
      }
      throw new Error(`Unexpected error: ${error}`);
    }
  }

  async fetchWorklogs(startDate: string, endDate: string): Promise<Worklog[]> {
    const sydneyStartDate = moment.tz(startDate, this.timezone).format('YYYY-MM-DD');
    const sydneyEndDate = moment.tz(endDate, this.timezone).format('YYYY-MM-DD');
    const cacheKey = `${this.workerId}-${sydneyStartDate}-${sydneyEndDate}`;
    
    // Check cache first
    const cached = worklogCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < WORKLOG_CACHE_TTL) {

      return cached.data;
    }

    try {

      const requestBody = {
        authorIds: [this.workerId],
        from: sydneyStartDate,
        to: sydneyEndDate
      };

      const axiosInstance = this.getAxiosInstance();
      const response: AxiosResponse<TempoResponse> = await axiosInstance.post('/worklogs/search', requestBody);
      const results = response.data.results;
      
      // Cache the result
      worklogCache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
        key: cacheKey
      });
      
      return results;
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  /**
   * Enrich worklogs with issue details from Jira API
   * Tempo API v4 only returns issueId, not key/summary
   */
  async enrichWorklogsWithIssueDetails(worklogs: Worklog[], jiraAxiosInstance: any): Promise<Worklog[]> {
    // Get unique issue IDs
    const issueIds = [...new Set(worklogs.map(log => (log.issue as any).id).filter(Boolean))];
    
    // Fetch issue details in batches
    const issueDetailsMap = new Map<string, { key: string; summary: string }>();
    
    for (const issueId of issueIds) {
      try {
        const response = await jiraAxiosInstance.get(`/rest/api/3/issue/${issueId}`, {
          params: {
            fields: 'key,summary'
          }
        });
        
        issueDetailsMap.set(issueId, {
          key: response.data.key,
          summary: response.data.fields.summary
        });
      } catch (error) {
        console.warn(`Failed to fetch issue details for ID ${issueId}:`, error);
        // Continue with other issues
      }
    }
    
    // Enrich worklogs with issue details
    return worklogs.map(log => {
      const issueId = (log.issue as any).id;
      const issueDetails = issueDetailsMap.get(issueId);
      
      if (issueDetails) {
        return {
          ...log,
          issue: {
            ...log.issue,
            key: issueDetails.key,
            summary: issueDetails.summary
          }
        };
      }
      
      return log;
    });
  }

  // Clear cache for testing or configuration changes
  static clearCache(): void {
    worklogCache.clear();

  }
}

export default TempoFetcher;
