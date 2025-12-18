import blessed from 'blessed';
import { TUIApp } from './app';
import { CLIConfigProvider } from '../config-adapter';
import { ConfigManager } from '../../core/config';

export async function startTUI(): Promise<void> {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Jira Daily Report - Interactive TUI',
    fullUnicode: true,
    dockBorders: true,
  });

  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  try {
    const configProvider = new CLIConfigProvider();
    await configProvider.initialize();
    const configManager = new ConfigManager(configProvider);

    const app = new TUIApp(screen, configManager);
    await app.initialize();

    screen.render();
  } catch (error) {
    screen.destroy();
    console.error('Failed to start TUI:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
