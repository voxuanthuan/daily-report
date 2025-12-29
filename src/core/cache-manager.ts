import * as vscode from 'vscode';
import { clearCaches } from './task-fetcher';
import TempoFetcher from './tempo/fetcher';

/**
 * Cache Manager - Centralized cache management for the extension
 */
export class CacheManager {
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.setupConfigurationWatcher();
    }

    private setupConfigurationWatcher() {
        // Watch for configuration changes and clear relevant caches
        const configWatcher = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('grappleDailyReport')) {

                this.clearAllCaches();
            }
        });
        
        this.disposables.push(configWatcher);
    }

    /**
     * Clear all caches when configuration changes or on demand
     */
    public clearAllCaches(): void {


        // Configuration cache is handled automatically by VSCodeConfigProvider

        // Clear task-related caches
        clearCaches();

        // Clear Tempo worklog cache
        TempoFetcher.clearCache();

        vscode.window.showInformationMessage('Extension caches cleared due to configuration changes');
    }

    /**
     * Get cache status for debugging
     */
    public getCacheStatus(): any {
        return {
            timestamp: Date.now(),
            message: 'Cache status retrieved'
        };
    }

    /**
     * Manual cache clear command for users
     */
    public static registerClearCacheCommand(context: vscode.ExtensionContext): void {
        const cacheManager = new CacheManager();
        
        const clearCacheCommand = vscode.commands.registerCommand(
            'jiraDailyReport.clearCache', 
            () => {
                cacheManager.clearAllCaches();
                vscode.window.showInformationMessage('All Jira Daily Report caches have been cleared');
            }
        );
        
        context.subscriptions.push(clearCacheCommand);
        context.subscriptions.push(cacheManager);
    }

    dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
