import * as vscode from 'vscode'; // VS Code API
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { TEMPO_API_TOKEN, TEMPO_URL } from '../config-utils';
import moment from 'moment-timezone';

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
  worker: string;
  description?: string;
}

interface TempoResponse {
  results: Worklog[];
  metadata: {
    count: number;
  };
}


class TempoFetcher {
  private axiosInstance: AxiosInstance;
  private workerId: string;
  private timezone: string = 'Australia/Sydney';

  constructor(workerId: string) {
    this.workerId = workerId;
    this.axiosInstance = axios.create({
      baseURL: TEMPO_URL,
      headers: {
        Authorization: `Bearer ${TEMPO_API_TOKEN}`, // Using imported token
        'Content-Type': 'application/json',
      },
    });
  }

  private getLastSixWorkingDays(): { startDate: string; endDate: string } {
    const today = moment.tz(this.timezone); // Use moment-timezone with Australia/Sydney
    const days: moment.Moment[] = [];
    let currentDate = today.clone();

    while (days.length < 6) {
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
    if(!TEMPO_API_TOKEN) {
      const errorMessage = `Jira Tempo API token is missing. Please configure Jira Tempo API token in settings. See ${TEMPO_API_DOCS_LINK} for more info.`;
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const response: AxiosResponse<TempoResponse> = await this.axiosInstance.get('/worklogs', {
        params: {
          from: startDate,
          to: endDate,
          worker: this.workerId,
        },
      });
      return response.data.results;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch worklogs: ${error.response?.data?.errorMessages || error.message}`);
      }
      throw new Error(`Unexpected error: ${error}`);
    }
  }

  async fetchWorklogs(startDate: string, endDate: string): Promise<Worklog[]> {
    try {
      const sydneyStartDate = moment.tz(startDate, this.timezone).format('YYYY-MM-DD');
      const sydneyEndDate = moment.tz(endDate, this.timezone).format('YYYY-MM-DD');

      const response: AxiosResponse<TempoResponse> = await this.axiosInstance.get('/worklogs', {
        params: {
          from: sydneyStartDate,
          to: sydneyEndDate,
          worker: this.workerId,
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }
}

export default TempoFetcher;
