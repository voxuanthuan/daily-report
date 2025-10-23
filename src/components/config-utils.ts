import * as vscode from 'vscode';

export const IAM = {
    DEVELOPER: "Developer",
    QC: 'QC'
}; 

// Lazy configuration loading to improve startup time
let _config: vscode.WorkspaceConfiguration | null = null;
let _cachedConfig: any = {};
let _lastConfigUpdate = 0;
const CONFIG_CACHE_TTL = 30000; // 30 seconds

function getConfig(): vscode.WorkspaceConfiguration {
    const now = Date.now();
    if (!_config || (now - _lastConfigUpdate) > CONFIG_CACHE_TTL) {
        _config = vscode.workspace.getConfiguration('grappleDailyReport');
        _cachedConfig = {}; // Reset cache
        _lastConfigUpdate = now;
    }
    return _config;
}

function getCachedConfigValue<T>(key: string, defaultValue?: T): T {
    if (_cachedConfig[key] === undefined) {
        _cachedConfig[key] = getConfig().get(key, defaultValue);
    }
    return _cachedConfig[key];
}

export function getAutoClipboardConfig(): boolean {
    return getCachedConfigValue('autoClipboard', true);
}

// Lazy getters for configuration values
export function getJiraServer(): string {
    return getCachedConfigValue('jiraServer', '');
}

export function getJiraUsername(): string {
    return getCachedConfigValue('username', '');
}

export function getJiraApiToken(): string {
    return getCachedConfigValue('apiToken', '');
}

export function getTempoApiToken(): string {
    return getCachedConfigValue('jiraTempoToken', '');
}

export function getWhoAmI(): string {
    return getCachedConfigValue('whoAmI', IAM.DEVELOPER);
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
    _config = null;
    _cachedConfig = {};
    _authHeader = null;
    _apiHeaders = null;
    _lastConfigUpdate = 0;
}
