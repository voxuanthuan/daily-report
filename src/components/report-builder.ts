export function buildMainReport(previousDayLabel: string, tasks: { yesterdayTasks: any[]; inProgress: any[] }): string {
  const { yesterdayTasks, inProgress } = tasks;
  let report = `Hi everyone,\n${previousDayLabel}\n`;
  
  report += yesterdayTasks.length > 0
      ? yesterdayTasks.map((task) => `- ${task.key}: ${task.fields.summary}`).join('\n') + '\n'
      : '- No tasks logged.\n';
  
  report += 'Today\n';
  report += inProgress.length > 0
      ? inProgress.map((task) => `- ${task.key}: ${task.fields.summary}`).join('\n') + '\n'
      : '- No tasks planned.\n';
  
  report += 'No blockers\n\n';
  return report;
}

export function buildTodoList(openTasks: any[]): string {
  let todo = '-------------------------------------------------------------\n\n';
  todo += 'To Do List\n';

  if (openTasks.length === 0) {
      todo += '- No tasks available.';
      return todo;
  }

  // shjt request from @longvo
  const sortedTasks = openTasks
      .sort((a, b) => {
          const priorityOrder: any = { 'High': 2, 'Medium': 1 };
          const aPriority  = priorityOrder[a.fields.priority?.name] || 0;
          const bPriority = priorityOrder[b.fields.priority?.name] || 0;
          if (aPriority !== bPriority) {return bPriority - aPriority;}

          const typeOrder: any = { 'Bug': 4, 'Task': 3, 'Sub-task': 2, 'Story': 1 };
          const aType = typeOrder[a.fields.issuetype?.name] || 0;
          const bType = typeOrder[b.fields.issuetype?.name] || 0;
          if (aType !== bType) {return bType - aType;}

          return a.key.localeCompare(b.key);
      })
      .slice(0, 10); // Limit to top 10 tasks

  // Map tasks with Jira-like icons
  todo += sortedTasks.map((task) => {
      let icon = '';
      switch (task.fields.issuetype?.name) {
          case 'Bug':
              icon = '🟥';
              break;
          case 'Sub-task':
              icon = '🟦';
              break;
          case 'Story':
              icon = '🟩';
              break;
          default:
              icon = '🟩';
      }
      return ` ${icon} - ${task.key}: ${task.fields.summary}`;
  }).join('\n');

  return todo;
}

export function buildTotalHoursNote(totalHours: number, userDisplayName: string): string {
  return totalHours < 8
      ? `- 🕐 Last Logwork: ${totalHours}h \n`
      : totalHours === 8
      ? '- 🕐 Last Logwork: completed 👍\n'
      : `- 🕐 Last Logwork: (${totalHours}) > 8h ⛔\n`;
}

export function buildNotes(totalHours: number, userDisplayName: string): string {
  let notes = '\n\nNotes';
  notes += `\nTodo List sorted by
            - High > Medium
            - Bug > task > sub-task > Story
            - Limit 10 `;
  notes += '\n- 📋 Clipboard: The report is copied to clipboard';
  notes += '\n- 📅 TimeLog: Logwork just for reference, we got some edgecase can not fix this time. (Qc assign its self, tempo app time tracking)';

  return notes;
}

export function combineReport(mainReport: string, timeLog: string, todoList: string, remainingNotes: string): string {
  return `${mainReport}${timeLog}${todoList}${remainingNotes}`;
}
