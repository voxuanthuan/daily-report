import { ConfigManager } from './config';
import { OutputManager } from './output';
import { getSmartDateLabel } from './date-utils';
import { fetchAllTasks, fetchUserDisplayName, extractPreviousWorkdayTasks } from './task-fetcher';
import { buildMainReport, buildTodoList, combineReport } from './report-builder';
import TempoFetcher from './tempo/fetcher';
import TempoFormatter from './tempo/formatter';

/**
 * Generate daily standup report
 * Core business logic that is platform-agnostic
 *
 * @param configManager Configuration provider
 * @param outputManager Output provider
 * @param options Additional options for report generation
 */
export async function generateDailyReport(
    configManager: ConfigManager,
    outputManager: OutputManager,
    options: {
        copyToClipboard?: boolean;
        useCache?: boolean;
    } = {}
) {
    outputManager.startSpinner('Generating');

    try {
        // Get configuration
        const autoClipboard = options.copyToClipboard !== undefined
            ? options.copyToClipboard
            : await configManager.getAutoClipboard();

        // Parallel execution: Fetch independent data simultaneously
        const [tasks, user] = await Promise.all([
            fetchAllTasks(configManager),
            fetchUserDisplayName(configManager)
        ]);

        const { open, inProgress } = tasks;

        // Update progress with task count
        const totalTasks = open.length + inProgress.length;
        outputManager.updateProgress(totalTasks);

        const tempoApiToken = await configManager.getTempoApiToken();
        const fetcher = new TempoFetcher(user.accountId, tempoApiToken);
        const formatter = new TempoFormatter();

        // Optimize: Fetch all worklogs in one call, then extract what we need
        const allWorklogs = await fetcher.fetchLastSixDaysWorklogs();

        // Update progress with worklog count
        outputManager.updateProgress(totalTasks, allWorklogs.length);

        // Extract previous workday data from the existing worklog data
        const previousWorkdayResult = await extractPreviousWorkdayTasks(allWorklogs, user.accountId, configManager);

        // Use the smart date label based on the actual date found
        const smartDateLabel = getSmartDateLabel(previousWorkdayResult.actualDate);

        // Build main report sections in parallel where possible
        const [mainReport, todoList, workLogContent] = await Promise.all([
            Promise.resolve(buildMainReport(smartDateLabel, inProgress, previousWorkdayResult.tasks)),
            Promise.resolve(buildTodoList(open, inProgress)),
            Promise.resolve(formatter.formatWorkLogContent(allWorklogs))
        ]);

        // Combine all report sections for display
        const finalReport = combineReport(mainReport, '', '', todoList, workLogContent);

        // Stop spinner before displaying report (clear the line completely)
        outputManager.stopSpinner();

        // Display the report and optionally copy to clipboard
        await outputManager.displayReport(finalReport, autoClipboard);

        return finalReport;

    } catch (error) {
        // Stop spinner on error
        outputManager.stopSpinner();

        // Use output manager to show error
        outputManager.showError(
            'Failed to generate daily report. Please check your configuration and try again.',
            error instanceof Error ? error : undefined
        );

        throw error;
    }
}
