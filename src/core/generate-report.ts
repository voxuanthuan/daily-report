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
    console.log('Starting daily report generation');
    const startTime = Date.now();

    try {
        // Get configuration
        const autoClipboard = options.copyToClipboard !== undefined
            ? options.copyToClipboard
            : await configManager.getAutoClipboard();

        console.log('Fetching tasks and user data in parallel');
        // Parallel execution: Fetch independent data simultaneously
        const [tasks, user] = await Promise.all([
            fetchAllTasks(configManager),
            fetchUserDisplayName(configManager)
        ]);

        const { open, inProgress } = tasks;
        console.log(`Found ${inProgress.length} in-progress tasks and ${open.length} open tasks`);

        const tempoApiToken = await configManager.getTempoApiToken();
        const fetcher = new TempoFetcher(user.accountId, tempoApiToken);
        const formatter = new TempoFormatter();

        console.log('Fetching worklog data');
        // Optimize: Fetch all worklogs in one call, then extract what we need
        const allWorklogs = await fetcher.fetchLastSixDaysWorklogs();
        console.log(`Retrieved ${allWorklogs.length} worklogs`);

        console.log('Processing previous workday data');
        // Extract previous workday data from the existing worklog data
        const previousWorkdayResult = await extractPreviousWorkdayTasks(allWorklogs, user.accountId, configManager);

        // Use the smart date label based on the actual date found
        const smartDateLabel = getSmartDateLabel(previousWorkdayResult.actualDate);
        console.log(`Using smart date label: ${smartDateLabel}`);

        console.log('Building report sections');
        // Build main report sections in parallel where possible
        const [mainReport, todoList, workLogContent] = await Promise.all([
            Promise.resolve(buildMainReport(smartDateLabel, inProgress, previousWorkdayResult.tasks)),
            Promise.resolve(buildTodoList(open)),
            Promise.resolve(formatter.formatWorkLogContent(allWorklogs))
        ]);

        // Combine all report sections for display
        const finalReport = combineReport(mainReport, '', todoList, workLogContent);

        console.log('Displaying and copying report');
        // Display the report and optionally copy to clipboard
        await outputManager.displayReport(finalReport, autoClipboard);

        const totalTime = Date.now() - startTime;
        console.log(`Daily report generation completed in ${totalTime}ms`);

        return finalReport;

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`Daily report generation failed after ${totalTime}ms:`, error);

        // Use output manager to show error
        outputManager.showError(
            'Failed to generate daily report. Please check your configuration and try again.',
            error instanceof Error ? error : undefined
        );

        throw error;
    }
}
