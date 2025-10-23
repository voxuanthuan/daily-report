import * as vscode from 'vscode';
import { IConfigProvider } from '../core/config';

/**
 * VS Code implementation of IConfigProvider
 * Reads configuration from VS Code workspace settings
 */
export class VSCodeConfigProvider implements IConfigProvider {
  private static readonly CONFIG_NAMESPACE = 'grappleDailyReport';
  private static readonly CONFIG_CACHE_TTL = 30000; // 30 seconds

  private config: vscode.WorkspaceConfiguration | null = null;
  private cachedConfig: Map<string, any> = new Map();
  private lastConfigUpdate = 0;
  private configChangeCallbacks: Array<() => void> = [];

  constructor() {
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(VSCodeConfigProvider.CONFIG_NAMESPACE)) {
        this.resetCache();
        // Notify all registered callbacks
        this.configChangeCallbacks.forEach(callback => callback());
      }
    });
  }

  /**
   * Get VS Code configuration, with caching
   */
  private getConfig(): vscode.WorkspaceConfiguration {
    const now = Date.now();
    if (!this.config || (now - this.lastConfigUpdate) > VSCodeConfigProvider.CONFIG_CACHE_TTL) {
      this.config = vscode.workspace.getConfiguration(VSCodeConfigProvider.CONFIG_NAMESPACE);
      this.cachedConfig.clear();
      this.lastConfigUpdate = now;
    }
    return this.config;
  }

  /**
   * Get a configuration value with caching
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (this.cachedConfig.has(key)) {
      return this.cachedConfig.get(key) as T;
    }

    const config = this.getConfig();
    const value = config.get<T>(key);
    this.cachedConfig.set(key, value);
    return value;
  }

  /**
   * Get a required configuration value
   */
  async getRequired<T>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `Configuration '${VSCodeConfigProvider.CONFIG_NAMESPACE}.${key}' is required but not set. ` +
        `Please configure it in VS Code settings.`
      );
    }
    return value;
  }

  /**
   * Register callback for configuration changes
   */
  onConfigChange(callback: () => void): void {
    this.configChangeCallbacks.push(callback);
  }

  /**
   * Reset cached configuration
   */
  private resetCache(): void {
    this.config = null;
    this.cachedConfig.clear();
    this.lastConfigUpdate = 0;
  }

  /**
   * Public method to manually reset cache
   */
  public clearCache(): void {
    this.resetCache();
  }
}

// Constants for backward compatibility
export const IAM = {
  DEVELOPER: "Developer",
  QC: 'QC'
};

export const TEMPO_URL = 'https://api.tempo.io/4';
