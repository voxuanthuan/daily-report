import { IConfigProvider } from '../core/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * CLI implementation of IConfigProvider
 * Reads configuration from multiple sources with precedence:
 * 1. Environment variables (highest priority)
 * 2. Local project config file (.jira-report.json in current directory)
 * 3. User home config file (~/.jira-report.json)
 */
export class CLIConfigProvider implements IConfigProvider {
  private config: Record<string, any> = {};
  private initialized = false;

  private readonly configSources = [
    path.join(process.cwd(), '.jira-report.json'),          // Local project config
    path.join(os.homedir(), '.jira-report.json'),           // User home config
  ];

  /**
   * Initialize configuration from all sources
   * Must be called before using get/getRequired
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load from config files (in reverse order, so first file in list has highest priority)
    for (let i = this.configSources.length - 1; i >= 0; i--) {
      const configPath = this.configSources[i];
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf-8');
          const fileConfig = JSON.parse(content);
          this.config = { ...this.config, ...fileConfig };
          console.log(`Loaded config from: ${configPath}`);
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Override with environment variables (highest priority)
    this.config = {
      ...this.config,
      jiraServer: process.env.JIRA_SERVER || this.config.jiraServer,
      username: process.env.JIRA_USERNAME || this.config.username,
      apiToken: process.env.JIRA_API_TOKEN || this.config.apiToken,
      jiraTempoToken: process.env.TEMPO_API_TOKEN || this.config.jiraTempoToken,
      whoAmI: process.env.WHO_AM_I || this.config.whoAmI || 'Developer',
      autoClipboard: process.env.AUTO_CLIPBOARD === 'true' || this.config.autoClipboard !== false,
      enableTimesheetIntegration: this.config.enableTimesheetIntegration !== false,
      timesheetDateFormat: this.config.timesheetDateFormat || 'YYYY-MM-DD',
    };

    this.initialized = true;
  }

  /**
   * Get a configuration value
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.config[key] as T;
  }

  /**
   * Get a required configuration value
   */
  async getRequired<T>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `Configuration '${key}' is required but not set.\n` +
        `Please set it via:\n` +
        `  1. Environment variable: ${this.getEnvVarName(key)}\n` +
        `  2. Config file: .jira-report.json or ~/.jira-report.json\n` +
        `  3. Run: jira-report config --init to create a template`
      );
    }
    return value;
  }

  /**
   * Register callback for configuration changes
   * (Not supported in CLI - config is static after initialization)
   */
  onConfigChange(callback: () => void): void {
    // CLI config is static, no dynamic updates
  }

  /**
   * Get the environment variable name for a config key
   */
  private getEnvVarName(key: string): string {
    const envMap: Record<string, string> = {
      jiraServer: 'JIRA_SERVER',
      username: 'JIRA_USERNAME',
      apiToken: 'JIRA_API_TOKEN',
      jiraTempoToken: 'TEMPO_API_TOKEN',
      whoAmI: 'WHO_AM_I',
      autoClipboard: 'AUTO_CLIPBOARD',
    };
    return envMap[key] || key.toUpperCase();
  }

  /**
   * Get config file paths for reference
   */
  getConfigPaths(): string[] {
    return this.configSources;
  }

  /**
   * Check if config exists
   */
  hasConfig(): boolean {
    return this.configSources.some(p => fs.existsSync(p));
  }

  /**
   * Create a template config file
   */
  static createTemplate(filepath?: string): void {
    const targetPath = filepath || path.join(process.cwd(), '.jira-report.json');

    const template = {
      jiraServer: 'https://your-domain.atlassian.net/',
      username: 'your-email@example.com',
      apiToken: 'your-jira-api-token',
      jiraTempoToken: 'your-tempo-api-token',
      whoAmI: 'Developer',
      autoClipboard: true,
      enableTimesheetIntegration: true,
      timesheetDateFormat: 'YYYY-MM-DD'
    };

    fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), 'utf-8');
    console.log(`Created config template at: ${targetPath}`);
    console.log('\nPlease edit the file and add your credentials.');
    console.log('\nTo get your API tokens:');
    console.log('  Jira API Token: https://id.atlassian.com/manage-profile/security/api-tokens');
    console.log('  Tempo API Token: https://apidocs.tempo.io/#section/Authentication');
  }
}
