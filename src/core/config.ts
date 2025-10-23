/**
 * Abstract configuration provider interface
 * Allows different implementations for VS Code, CLI, etc.
 */
export interface IConfigProvider {
  /**
   * Get a configuration value
   * @param key Configuration key
   * @returns Configuration value or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Get a required configuration value
   * @param key Configuration key
   * @returns Configuration value
   * @throws Error if configuration is not found
   */
  getRequired<T>(key: string): Promise<T>;

  /**
   * Register a callback for configuration changes
   * @param callback Function to call when configuration changes
   */
  onConfigChange(callback: () => void): void;
}

/**
 * Configuration manager that uses an abstract provider
 * Contains all the business logic for configuration access
 */
export class ConfigManager {
  constructor(private provider: IConfigProvider) {}

  async getJiraServer(): Promise<string> {
    const server = await this.provider.getRequired<string>('jiraServer');
    // Ensure trailing slash
    return server.endsWith('/') ? server : `${server}/`;
  }

  async getUsername(): Promise<string> {
    return this.provider.getRequired<string>('username');
  }

  async getApiToken(): Promise<string> {
    return this.provider.getRequired<string>('apiToken');
  }

  async getTempoApiToken(): Promise<string> {
    return this.provider.getRequired<string>('jiraTempoToken');
  }

  async getWhoAmI(): Promise<string> {
    const whoAmI = await this.provider.get<string>('whoAmI');
    return whoAmI || 'Developer';
  }

  async getAutoClipboard(): Promise<boolean> {
    const autoClipboard = await this.provider.get<boolean>('autoClipboard');
    return autoClipboard !== undefined ? autoClipboard : true;
  }

  async getEnableTimesheetIntegration(): Promise<boolean> {
    const enabled = await this.provider.get<boolean>('enableTimesheetIntegration');
    return enabled !== undefined ? enabled : true;
  }

  async getTimesheetDateFormat(): Promise<string> {
    const format = await this.provider.get<string>('timesheetDateFormat');
    return format || 'YYYY-MM-DD';
  }

  /**
   * Get Basic Auth header for Jira API
   */
  async getAuthHeader(): Promise<string> {
    const username = await this.getUsername();
    const apiToken = await this.getApiToken();
    const credentials = `${username}:${apiToken}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Get Tempo API headers
   */
  async getTempoHeaders(): Promise<Record<string, string>> {
    const token = await this.getTempoApiToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Register callback for configuration changes
   */
  onConfigChange(callback: () => void): void {
    this.provider.onConfigChange(callback);
  }
}
