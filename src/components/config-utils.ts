export const IAM = {
    DEVELOPER: "Developer",
    QC: 'QC'
};

// Configuration cache to improve performance
let _cachedConfig: any = {};
let _lastConfigUpdate = 0;
const CONFIG_CACHE_TTL = 30000; // 30 seconds

function getCachedConfigValue<T>(key: string, envVar: string, defaultValue?: T): T {
    const now = Date.now();

    // Reset cache if TTL expired
    if ((now - _lastConfigUpdate) > CONFIG_CACHE_TTL) {
        _cachedConfig = {};
        _lastConfigUpdate = now;
    }

    if (_cachedConfig[key] === undefined) {
        _cachedConfig[key] = process.env[envVar] || defaultValue;
    }
    return _cachedConfig[key];
}

export function getAutoClipboardConfig(): boolean {
    const value = getCachedConfigValue('autoClipboard', 'AUTO_CLIPBOARD', 'true');
    return value === 'true' || value === true;
}

// Lazy getters for configuration values from environment variables
export function getJiraServer(): string {
    return getCachedConfigValue('jiraServer', 'JIRA_SERVER', '');
}

export function getJiraUsername(): string {
    return getCachedConfigValue('username', 'JIRA_USERNAME', '');
}

export function getJiraApiToken(): string {
    return getCachedConfigValue('apiToken', 'JIRA_API_TOKEN', '');
}

export function getTempoApiToken(): string {
    return getCachedConfigValue('jiraTempoToken', 'JIRA_TEMPO_TOKEN', '');
}

export function getWhoAmI(): string {
    return getCachedConfigValue('whoAmI', 'WHO_AM_I', IAM.DEVELOPER);
}

// Legacy exports for backward compatibility - will be removed in future versions
// @deprecated Use getJiraServer() instead
export const JIRA_SERVER = '';
// @deprecated Use getJiraUsername() instead
export const JIRA_USERNAME = '';
// @deprecated Use getJiraApiToken() instead
export const JIRA_API_TOKEN = '';
// @deprecated Use getTempoApiToken() instead
export const TEMPO_API_TOKEN = '';
// @deprecated Use getWhoAmI() instead
export const WHO_AM_I = IAM.DEVELOPER;
export const TEMPO_URL = 'https://api.tempo.io/4';

// Lazy auth header generation
let _authHeader: string | null = null;
let _apiHeaders: any | null = null;

export function getAuthHeader(): string {
    if (!_authHeader) {
        const username = getJiraUsername();
        const token = getJiraApiToken();
        _authHeader = `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
    }
    return _authHeader;
}

export function getApiHeaders(): any {
    if (!_apiHeaders) {
        _apiHeaders = { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' };
    }
    return _apiHeaders;
}

// @deprecated Use getAuthHeader() instead
export const authHeader = '';
// @deprecated Use getApiHeaders() instead
export const apiHeaders = {};

// Reset cache when configuration changes
export function resetConfigCache(): void {
    _cachedConfig = {};
    _authHeader = null;
    _apiHeaders = null;
    _lastConfigUpdate = 0;
}
