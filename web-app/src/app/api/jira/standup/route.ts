import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira-client';
import { getTempoWorklogsForRange } from '@/lib/tempo-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateParam = searchParams.get('date'); // The "Report Date" (usually Today)

  if (!dateParam) {
    return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
  }

  const today = dateParam; // Treating the requested date as "Today" for context
  
  try {
    const myself = await jiraFetch('/rest/api/3/myself');
    const myAccountId = myself.accountId;

    // 1. Fetch Previous Workday Worklogs
    // Look back ~7 days to be safe (incase of holidays/weekends)
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    const fromDate = d.toISOString().split('T')[0];

    const worklogs = await getTempoWorklogsForRange(myAccountId, fromDate, today);

    // Group by Date
    const logsByDate = new Map<string, any[]>();
    worklogs.forEach((wl: any) => {
        const date = wl.startDate;
        if (!logsByDate.has(date)) logsByDate.set(date, []);
        logsByDate.get(date)?.push(wl);
    });

    // Find "Yesterday" (latest date < today)
    const sortedDates = Array.from(logsByDate.keys()).sort().reverse(); // Descending
    const prevDate = sortedDates.find(d => d < today);

    const prevWorklogs = prevDate ? logsByDate.get(prevDate) || [] : [];

    // 2. Fetch "Today" tasks (In Progress or Open assigned to me)
    // JQL: assignee = currentUser() AND status = "In Progress"
    const inProgressJql = `assignee = currentUser() AND status = "In Progress"`;
    const inProgressRes = await jiraFetch(`/rest/api/3/search/jql`, {
         method: "POST",
         body: JSON.stringify({
            jql: inProgressJql,
            fields: ["summary", "status", "issuetype"],
            maxResults: 20
         })
    });
    const inProgressIssues = inProgressRes.issues || [];

    // 3. Enrich Previous Worklogs with Issue Details
    // Collect IDs
    const issueIds = new Set<number>();
    prevWorklogs.forEach((wl: any) => {
        if (wl.issue && wl.issue.id) issueIds.add(wl.issue.id);
    });

    const enrichedPrevTasks: any[] = [];
    if (issueIds.size > 0) {
        const idsArray = Array.from(issueIds);
        const jql = `id in (${idsArray.join(',')})`;
        const detailsRes = await jiraFetch(`/rest/api/3/search/jql`, {
             method: "POST",
             body: JSON.stringify({
                jql: jql,
                fields: ["summary", "status", "issuetype"],
                maxResults: 100
             })
        });
        
        const detailsMap = new Map<string, any>();
        (detailsRes.issues || []).forEach((i: any) => detailsMap.set(i.id, i));

        // Deduplicate by Issue Key for the report
        const seenKeys = new Set<string>();
        
        prevWorklogs.forEach((wl: any) => {
            const issueId = String(wl.issue.id);
            const issue = detailsMap.get(issueId);
            if (issue && !seenKeys.has(issue.key)) {
                seenKeys.add(issue.key);
                enrichedPrevTasks.push({
                    key: issue.key,
                    summary: issue.fields.summary,
                    status: issue.fields.status.name
                });
            }
        });
    }

    return NextResponse.json({
        date: today,
        yesterday: {
            date: prevDate || null,
            tasks: enrichedPrevTasks
        },
        today: {
            tasks: inProgressIssues.map((i: any) => ({
                key: i.key,
                summary: i.fields.summary,
                status: i.fields.status.name
            }))
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
