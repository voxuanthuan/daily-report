
const TEMPO_TOKEN = process.env.TEMPO_API_TOKEN;
const TEMPO_BASE_URL = "https://api.tempo.io/4";

if (!TEMPO_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
        console.warn("Missing TEMPO_API_TOKEN in environment variables. Worklogs will fail if Tempo is required.");
    }
}

interface TempoWorklog {
  issue: {
    id: number;
  };
  timeSpentSeconds: number;
  startDate: string; // "YYYY-MM-DD"
  description: string;
}

export async function tempoFetch(endpoint: string, options: RequestInit = {}) {
    if (!TEMPO_TOKEN) {
        throw new Error("Missing TEMPO_API_TOKEN");
    }

    const url = `${TEMPO_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
        'Authorization': `Bearer ${TEMPO_TOKEN}`,
        'Content-Type': 'application/json',
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
        throw new Error(`Tempo API Error ${response.status}: ${errorBody}`);
    }

    return response.json();
}

/**
 * Fetch worklogs for a given user and date from Tempo.
 */
export async function getTempoWorklogs(accountId: string, date: string) {
    return getTempoWorklogsForRange(accountId, date, date);
}

/**
 * Fetch worklogs for a given user and date range from Tempo.
 */
export async function getTempoWorklogsForRange(accountId: string, fromDate: string, toDate: string) {
    const payload = {
        authorIds: [accountId],
        from: fromDate,
        to: toDate,
        limit: 1000 // Higher limit for ranges
    };

    const res = await tempoFetch('/worklogs/search', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return res.results as TempoWorklog[];
}
