export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: any; // Simplified for now, ADF is complex
    status: {
      name: string;
      statusCategory?: {
        colorName: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl?: string;
    };
    priority?: {
      name: string;
      iconUrl?: string;
    };
    assignee?: {
      displayName: string;
      avatarUrls?: {
        '48x48': string;
      };
    };
    fixVersions?: {
        name: string;
    }[];
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
}
