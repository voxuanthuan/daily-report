import * as vscode from 'vscode';
import axios from 'axios';
import { getApiHeaders, getAuthHeader, getJiraServer, getJiraUsername } from '../components/config-utils';

interface TempoWorklog {
    timeSpentSeconds: number;
    startDate: string;
    issue: {
        key: string;
        summary: string;
    };
    description: string;
}

export async function generateWorklogsReport() {
    try {

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
        const params = {
            from: startOfWeek.toISOString().split('T')[0],
            to: endOfWeek.toISOString().split('T')[0],
            username: getJiraUsername()
        };
        const response = await axios.get(
            `${getJiraServer()}/rest/tempo-timesheets/4/worklogs`,
            {
                headers: {
                  'Authorization': getAuthHeader(),
                  'Accept': 'application/json'
                },
                params
            }
        );

        const worklogs: TempoWorklog[] = response.data;
        const report = formatWeeklyReport(worklogs);
        
        // // Show report in new editor
        // const document = await vscode.workspace.openTextDocument({
        //     content: report,
        //     language: 'markdown'
        // });
        // await vscode.window.showTextDocument(document);
        return report;

    } catch (error) {
        return 'Failed to fetch worklogs';
    }
}

function formatWeeklyReport(worklogs: TempoWorklog[]): string {
    const totalSeconds = worklogs.reduce((acc, log) => acc + log.timeSpentSeconds, 0);
    const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

    let report = `# Weekly Time Report\n\n`;
    report += `Total Hours: ${totalHours}h\n\n`;
    
    // Group by date
    const groupedLogs = worklogs.reduce((acc, log) => {
        const date = log.startDate;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(log);
        return acc;
    }, {} as Record<string, TempoWorklog[]>);

    // Format each day
    Object.keys(groupedLogs).sort().forEach(date => {
        const dayLogs = groupedLogs[date];
        const dayTotal = Math.round((dayLogs.reduce((acc, log) => acc + log.timeSpentSeconds, 0) / 3600) * 100) / 100;
        
        report += `## ${new Date(date).toLocaleDateString()}\n`;
        report += `Total: ${dayTotal}h\n\n`;
        
        dayLogs.forEach(log => {
            const hours = Math.round((log.timeSpentSeconds / 3600) * 100) / 100;
            report += `- ${log.issue.key}: ${log.issue.summary} (${hours}h)\n`;
            if (log.description) {
                report += `  ${log.description}\n`;
            }
        });
        report += '\n';
    });

    return report;
}
