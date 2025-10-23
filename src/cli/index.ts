import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { OutputManager } from '../core/output';
import { CLIConfigProvider } from './config-adapter';
import { CLIOutputProvider } from './output-adapter';
import { generateDailyReport } from '../core/generate-report';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Get version from package.json
const packageJsonPath = path.join(__dirname, '../../package.json');
let version = '1.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  version = packageJson.version;
} catch (error) {
  // Use default version if package.json not found
}

program
  .name('jira-report')
  .description('Generate Jira daily standup reports from the command line')
  .version(version);

// Generate command
program
  .command('generate')
  .description('Generate daily standup report')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <type>', 'Output format (text, json, markdown)', 'text')
  .option('-c, --clipboard', 'Copy report to clipboard', false)
  .option('-s, --silent', 'Suppress info messages', false)
  .option('--no-cache', 'Disable caching')
  .action(async (options) => {
    try {
      // Initialize config provider
      const configProvider = new CLIConfigProvider();
      await configProvider.initialize();

      // Initialize output provider
      const outputProvider = new CLIOutputProvider({
        format: options.format,
        silent: options.silent,
        outputFile: options.output,
      });

      // Create managers
      const configManager = new ConfigManager(configProvider);
      const outputManager = new OutputManager(outputProvider);

      // Generate report
      await generateDailyReport(configManager, outputManager, {
        copyToClipboard: options.clipboard,
        useCache: options.cache !== false,
      });

      if (!options.silent) {
        console.log('\x1b[32m✓\x1b[0m Report generated successfully');
      }
    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Config command
const configCommand = program
  .command('config')
  .description('Manage configuration');

configCommand
  .command('init')
  .description('Initialize configuration file')
  .option('-g, --global', 'Create config in home directory')
  .action((options) => {
    try {
      const filepath = options.global
        ? path.join(require('os').homedir(), '.jira-report.json')
        : path.join(process.cwd(), '.jira-report.json');

      if (fs.existsSync(filepath)) {
        console.log(`\x1b[33m⚠\x1b[0m Config file already exists at: ${filepath}`);
        console.log('Use --force to overwrite (not implemented yet)');
        return;
      }

      CLIConfigProvider.createTemplate(filepath);
      console.log('\x1b[32m✓\x1b[0m Configuration file created successfully');
    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

configCommand
  .command('show')
  .description('Show current configuration (with masked secrets)')
  .action(async () => {
    try {
      const configProvider = new CLIConfigProvider();
      await configProvider.initialize();

      console.log('\n\x1b[1mCurrent Configuration:\x1b[0m');
      console.log('─'.repeat(50));

      const configManager = new ConfigManager(configProvider);

      // Show config with masked secrets
      const jiraServer = await configManager.getJiraServer();
      const username = await configManager.getUsername();
      const apiToken = await configManager.getApiToken();
      const tempoToken = await configManager.getTempoApiToken();
      const whoAmI = await configManager.getWhoAmI();
      const autoClipboard = await configManager.getAutoClipboard();

      console.log(`Jira Server:   ${jiraServer}`);
      console.log(`Username:      ${username}`);
      console.log(`API Token:     ${maskSecret(apiToken)}`);
      console.log(`Tempo Token:   ${maskSecret(tempoToken)}`);
      console.log(`User Type:     ${whoAmI}`);
      console.log(`Auto Clipboard: ${autoClipboard}`);

      console.log('\n\x1b[1mConfig File Locations:\x1b[0m');
      configProvider.getConfigPaths().forEach((p, i) => {
        const exists = fs.existsSync(p);
        const status = exists ? '\x1b[32m✓\x1b[0m' : '\x1b[90m✗\x1b[0m';
        console.log(`${status} ${p}`);
      });

      console.log('\n\x1b[90mEnvironment variables take precedence over config files.\x1b[0m\n');
    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Helper function to mask secrets
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '***';
  }
  return secret.substring(0, 4) + '****' + secret.substring(secret.length - 4);
}

// Parse arguments
program.parse();
