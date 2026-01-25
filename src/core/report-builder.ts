export function buildMainReport(previousDayLabel: string, inProgress: any[], yesterdayTasks: any[]): string {
  let report = `\nHi everyone,\n${previousDayLabel}\n`;

  // Deduplicate yesterday's tasks by key
  const uniqueYesterdayTasks = deduplicateTasks(yesterdayTasks);

  // QC will report based on parent tasks cause subtask with no meaning content
  report += uniqueYesterdayTasks.length > 0
      ? uniqueYesterdayTasks.map((task) => `- ${task?.fields?.parent?.key || task?.key}: ${task?.fields?.parent?.fields?.summary || task?.fields?.summary}`).join('\n') + '\n'
      : '- No tasks logged.\n';

  report += 'Today\n';

  // Deduplicate today's tasks by key
  const uniqueInProgress = deduplicateTasks(inProgress);

  // Separate stories/epics from tasks/bugs
  const todayNonStories = uniqueInProgress.filter((task) => {
    const issueType = task?.fields?.issuetype?.name;
    return issueType !== 'Story' && issueType !== 'Epic';
  });

  report += todayNonStories.length > 0
      ? todayNonStories.map((task) => `- ${task?.fields?.parent?.key || task?.key}: ${task?.fields?.parent?.fields?.summary || task?.fields?.summary}`).join('\n') + '\n'
      : '- No tasks planned.\n';

  report += 'No blockers\n';

  // Add in-progress stories in the same section
  const stories = uniqueInProgress.filter((task) => {
    const issueType = task?.fields?.issuetype?.name;
    return issueType === 'Story' || issueType === 'Epic';
  });

  if (stories.length > 0) {
    report += '\n.\n\nIn-Progress (Story))\n';
    report += stories.map((task) => `- ${task?.fields?.parent?.key || task?.key}: ${task?.fields?.parent?.fields?.summary || task?.fields?.summary}`).join('\n') + '\n';
  }

  report += '\n';
  return report;
}

/**
 * Deduplicate tasks by their key (or parent key for QC mode)
 * When the same task appears multiple times (e.g., multiple time logs), keep only one
 */
function deduplicateTasks(tasks: any[]): any[] {
  const seen = new Map<string, any>();

  for (const task of tasks) {
    // Use parent key if available (QC mode), otherwise use task key
    const key = task?.fields?.parent?.key || task?.key;

    if (key && !seen.has(key)) {
      seen.set(key, task);
    }
  }

  return Array.from(seen.values());
}

export function buildInProgressStories(inProgress: any[]): string {
  // This function is no longer used as stories are now in the main report
  return '';
}

export function buildTodoList(openTasks: any[], inProgress: any[] = []): string {
  let todo = '\n─────────────────────────────────────────────────────────────────\n\n';
  todo += 'Todo\n';

  // Get in-progress stories/epics
  const uniqueInProgress = deduplicateTasks(inProgress);
  const stories = uniqueInProgress.filter((task) => {
    const issueType = task?.fields?.issuetype?.name;
    return issueType === 'Story' || issueType === 'Epic';
  });

  // Sort in-progress stories
  const sortedStories = stories.sort((a, b) => {
      const priorityOrder: any = { 'High': 2, 'Medium': 1 };
      const aPriority  = priorityOrder[a.fields.priority?.name] || 0;
      const bPriority = priorityOrder[b.fields.priority?.name] || 0;
      if (aPriority !== bPriority) {return bPriority - aPriority;}
      return a.key.localeCompare(b.key);
  });

  // Sort open tasks
  const sortedOpenTasks = openTasks.sort((a, b) => {
      const priorityOrder: any = { 'High': 2, 'Medium': 1 };
      const aPriority  = priorityOrder[a.fields.priority?.name] || 0;
      const bPriority = priorityOrder[b.fields.priority?.name] || 0;
      if (aPriority !== bPriority) {return bPriority - aPriority;}

      const typeOrder: any = { 'Bug': 4, 'Task': 3, 'Sub-task': 2, 'Story': 1 };
      const aType = typeOrder[a.fields.issuetype?.name] || 0;
      const bType = typeOrder[b.fields.issuetype?.name] || 0;
      if (aType !== bType) {return bType - aType;}

      return a.key.localeCompare(b.key);
  });

  // Combine: in-progress first, then open tasks, limit to 10 total
  const allTasks = [...sortedOpenTasks].slice(0, 10);

  if (allTasks.length === 0) {
      todo += '- No tasks available.';
      return todo;
  }

  // Create a Set of in-progress task keys for quick lookup
  const inProgressKeys = new Set(sortedStories.map(task => task.key));

  // Map tasks with Jira-like icons
  todo += allTasks.map((task) => {
      let icon = '';
      switch (task.fields.issuetype?.name) {
          case 'Bug':
              icon = '🔴';
              break;
          case 'Sub-task':
              icon = '🔵';
              break;
          case 'Story':
              icon = '🟢';
              break;
          case 'Task':
              icon = '🟢';
              break;
          default:
              icon = '🟢';
      }

      // Add in-progress indicator for stories/epics that are in progress
      const inProgressIndicator = inProgressKeys.has(task.key) ? '⏳ ' : '';

      return ` ${icon} ${inProgressIndicator}${task.key}: ${task?.fields?.summary}`;
  }).join('\n');

  return todo;
}

export function combineReport(mainReport: string, timeLog: string, inProgressStories: string, todoList: string, worklogs: string): string {
  return `${mainReport}${timeLog}${inProgressStories}${todoList}${worklogs}`;
}

export function buildHtmlReport(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let listLevel = 0; // 0: none, 1: ul, 2: nested ul

  // Helper to close lists down to a specific level
  const closeListsToLevel = (targetLevel: number) => {
    while (listLevel > targetLevel) {
      if (listLevel === 2) {
        html += '    </ul>\n  </li>\n';
      } else if (listLevel === 1) {
        html += '</ul>\n';
      }
      listLevel--;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for bullet points
    // Level 1: "  - " (2 spaces)
    // Level 2: "    - " (4 spaces)
    const isLevel1 = line.startsWith('  - ');
    const isLevel2 = line.startsWith('    - ');

    if (isLevel2) {
      if (listLevel < 2) {
         // If we are at level 1, start a nested list inside the previous li
         if (listLevel === 0) {
           html += '<ul>\n';
           listLevel = 1;
         }
         if (listLevel === 1) {
            html += '    <ul>\n';
            listLevel = 2;
         }
      }
      const content = line.replace(/^\s+-\s+/, '');
      html += `      <li>${escapeHtml(content)}</li>\n`;

    } else if (isLevel1) {
      closeListsToLevel(1); // Close any level 2
      if (listLevel === 0) {
        html += '<ul>\n';
        listLevel = 1;
      }
      const content = line.replace(/^\s+-\s+/, '');
      html += `  <li>${escapeHtml(content)}</li>\n`;
    } else {
      // Not a list item
      closeListsToLevel(0);
      if (trimmed) {
        // Paragraph or Header
        html += `<p>${escapeHtml(trimmed)}</p>\n`;
      }
    }
  }

  closeListsToLevel(0);
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
