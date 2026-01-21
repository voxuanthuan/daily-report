import { headers } from 'next/headers';

const JIRA_HOST = process.env.JIRA_SERVER;
const JIRA_EMAIL = process.env.JIRA_USERNAME;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_TOKEN) {
  const missing = [];
  if (!JIRA_HOST) missing.push("JIRA_SERVER");
  if (!JIRA_EMAIL) missing.push("JIRA_USERNAME");
  if (!JIRA_TOKEN) missing.push("JIRA_API_TOKEN");
  throw new Error(`Missing Jira Environment Variables: ${missing.join(", ")}. Please check your .env.local file.`);
}

export const WHO_AM_I = process.env.WHO_AM_I || "Developer";

export async function jiraFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${JIRA_HOST}${endpoint}`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');

  const defaultHeaders = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jira API Error ${response.status}: ${errorBody}`);
  }

  return response.json();
}
