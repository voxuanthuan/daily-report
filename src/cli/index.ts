import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { OutputManager } from '../core/output';
import { CLIConfigProvider } from './config-adapter';
import { CLIOutputProvider } from './output-adapter';
import { generateDailyReport } from '../core/generate-report';
import { fetchUserDisplayName } from '../core/task-fetcher';
import TempoWorklogCreator from '../core/tempo/worklog-creator';
import TimesheetParser from '../core/tempo/timesheet-parser';
import { startTUI } from './tui/index';
import moment from 'moment-timezone';
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

      // Success message removed to reduce clutter - spinner already shows completion
    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Logtime command
program
  .command('logtime <entries>')
  .description('Log time to Tempo (e.g., "B2B-1079 2h, PROJECT-123 1.5h")')
  .option('-d, --date <date>', 'Date for worklogs (today, yesterday, or YYYY-MM-DD)', 'today')
  .option('--description <text>', 'Optional description for all entries')
  .option('-s, --silent', 'Suppress info messages', false)
  .action(async (entries: string, options) => {
    try {
      // Initialize config provider
      const configProvider = new CLIConfigProvider();
      await configProvider.initialize();
      const configManager = new ConfigManager(configProvider);

      // Validate timesheet format
      const parsed = TimesheetParser.parseTimesheetLog(entries);
      if (!parsed.isValid) {
        console.error('\x1b[31m✖\x1b[0m Invalid timesheet format:', parsed.errors.join(', '));
        console.log('\nExamples:');
        TimesheetParser.getExampleFormats().forEach(ex => console.log(`  ${ex}`));
        process.exit(1);
      }

      // Parse date
      let targetDate: string;
      const timezone = 'Australia/Sydney';

      if (options.date === 'today') {
        targetDate = moment.tz(timezone).format('YYYY-MM-DD');
      } else if (options.date === 'yesterday') {
        targetDate = moment.tz(timezone).subtract(1, 'day').format('YYYY-MM-DD');
      } else {
        // Validate custom date
        if (!moment(options.date, 'YYYY-MM-DD', true).isValid()) {
          console.error('\x1b[31m✖\x1b[0m Invalid date format. Use: today, yesterday, or YYYY-MM-DD');
          process.exit(1);
        }
        targetDate = options.date;
      }

      // Fetch user account ID
      if (!options.silent) {
        console.log('\x1b[36m⏳\x1b[0m Fetching user information...');
      }
      const user = await fetchUserDisplayName(configManager);

      // Create worklog creator with CLI configuration
      const worklogCreator = new TempoWorklogCreator(user.accountId, {
        tempoApiToken: await configManager.getTempoApiToken(),
        jiraServer: await configManager.getJiraServer(),
        jiraAuthHeader: await configManager.getAuthHeader()
      });

      // Show summary before creating
      if (!options.silent) {
        console.log('\n\x1b[1mWorklog Summary:\x1b[0m');
        console.log('─'.repeat(50));
        console.log(`Date:        ${targetDate}`);
        console.log(`User:        ${user.displayName} (${user.emailAddress})`);
        console.log(`Total Time:  ${TimesheetParser.formatSecondsToTime(parsed.totalSeconds)}`);
        console.log(`Entries:     ${parsed.entries.length}`);
        parsed.entries.forEach(entry => {
          console.log(`  • ${entry.ticketKey}: ${TimesheetParser.formatSecondsToTime(entry.timeSpentSeconds)}`);
        });
        if (options.description) {
          console.log(`Description: ${options.description}`);
        }
        console.log('─'.repeat(50));
        console.log('\x1b[36m⏳\x1b[0m Creating worklogs...\n');
      }

      // Create worklogs with progress callback
      const results = await worklogCreator.createWorklogsFromTimesheet(
        entries,
        targetDate,
        options.description,
        (current: number, total: number, ticketKey: string) => {
          if (!options.silent) {
            process.stdout.write(`\r\x1b[36m⏳\x1b[0m Creating worklog ${current}/${total}: ${ticketKey}...`);
          }
        }
      );

      // Clear progress line
      if (!options.silent) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
      }

      // Display results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log('\n\x1b[1mResults:\x1b[0m');
      console.log('─'.repeat(50));

      if (successful.length > 0) {
        console.log('\x1b[32m✓ Successfully Created:\x1b[0m');
        successful.forEach(result => {
          console.log(`  • ${result.ticketKey}: ${result.timeSpent}${result.worklogId ? ` (ID: ${result.worklogId})` : ''}`);
        });
      }

      if (failed.length > 0) {
        console.log('\n\x1b[31m✖ Failed:\x1b[0m');
        failed.forEach(result => {
          console.log(`  • ${result.ticketKey}: ${result.timeSpent}`);
          console.log(`    ${result.error}`);
        });
      }

      const successRate = Math.round((successful.length / results.length) * 100);
      console.log(`\n\x1b[1mSuccess Rate:\x1b[0m ${successful.length}/${results.length} (${successRate}%)`);
      console.log('─'.repeat(50));

      // Exit with error code if any failed
      if (failed.length > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Open ticket command
program
  .command('open <ticketId>')
  .description('Open Jira ticket in browser (e.g., "GRAP-123")')
  .action(async (ticketId: string) => {
    try {
      // Initialize config provider
      const configProvider = new CLIConfigProvider();
      await configProvider.initialize();
      const configManager = new ConfigManager(configProvider);

      // Get Jira server URL
      const jiraServer = await configManager.getJiraServer();
      const ticketUrl = `${jiraServer}browse/${ticketId}`;

      console.log(`\x1b[36m🔗\x1b[0m Opening: ${ticketUrl}`);

      // Import open dynamically to avoid ESM issues
      const open = await import('open');
      await open.default(ticketUrl);

      console.log('\x1b[32m✓\x1b[0m Opened in browser');
    } catch (error) {
      console.error('\x1b[31m✖\x1b[0m Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// TUI command
program
  .command('tui')
  .alias('interactive')
  .description('Launch interactive TUI (Terminal User Interface)')
  .action(async () => {
    try {
      await startTUI();
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
