import { ConfigManager } from '../../../core/config';

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export class OpenUrlAction {
  constructor(private configManager: ConfigManager) {}

  async execute(task: any): Promise<ActionResult> {
    try {
      if (!task) {
        return {
          success: false,
          error: 'No task selected',
        };
      }

      const key = task.key || task.id;
      if (!key) {
        return {
          success: false,
          error: 'Task has no key',
        };
      }

      const jiraServer = await this.configManager.getJiraServer();
      const url = `${jiraServer}browse/${key}`;

      // Dynamic import for ESM module
      const openModule = await import('open');
      const openFn = openModule.default || openModule;
      await openFn(url);

      return {
        success: true,
        message: `Opened ${key} in browser`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
