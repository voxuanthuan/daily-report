import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira-client';
import { getTempoWorklogs } from '@/lib/tempo-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date'); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
  }

  try {
    // We need the current user's accountId to filter/query Tempo.
    const myself = await jiraFetch('/rest/api/3/myself');
    const myAccountId = myself.accountId;
    console.log(`Current user accountId: ${myAccountId}`);

    // Fetch worklogs from Tempo
    let tempoWorklogs: any[] = [];
    try {
        tempoWorklogs = await getTempoWorklogs(myAccountId, date);
    } catch (e: any) {
        console.error("Tempo fetch failed, falling back to JQL (or returning error):", e);
        // Fallback or error? User clearly wants Tempo if they have it.
        // If Tempo token is missing string, we might want to panic or warn.
        // For now, let's throw if Tempo fetch failed, assuming Tempo is primary.
        throw new Error(`Failed to fetch worklogs from Tempo: ${e.message}. Check TEMPO_API_TOKEN.`);
    }

    // Now we need to enrich these worklogs with Issue details (Key, Summary, Status)
    // Tempo returns issue.id
    
    // 1. Collect Issue IDs
    const issueIds = new Set<number>();
    tempoWorklogs.forEach(wl => {
        if (wl.issue && wl.issue.id) {
            issueIds.add(wl.issue.id);
        }
    });

    const reportData = [];

    if (issueIds.size > 0) {
        // 2. Fetch Issues from Jira via JQL "id in (...)"
        const idsArray = Array.from(issueIds);
        const jql = `id in (${idsArray.join(',')})`;
        
        const searchPayload = {
            jql: jql,
            fields: ["summary", "status", "issuetype", "parent"],
            maxResults: 100
        };

        const searchRes = await jiraFetch(`/rest/api/3/search/jql`, {
             method: "POST",
             body: JSON.stringify(searchPayload)
        });

        const issuesMap = new Map<string, any>(); // Map ID (as string) to Issue Object
        (searchRes.issues || []).forEach((issue: any) => {
            issuesMap.set(issue.id, issue);
        });

        // 3. Group worklogs by Issue
        // We want to return structure: [ { issue: {...}, worklogs: [...] } ]
        
        const groupedWorklogs = new Map<string, any>(); // Key: issueId

        tempoWorklogs.forEach(wl => {
             const issueId = String(wl.issue.id);
             if (!groupedWorklogs.has(issueId)) {
                 groupedWorklogs.set(issueId, []);
             }
             groupedWorklogs.get(issueId).push(wl);
        });

        for (const [issueId, worklogs] of groupedWorklogs) {
            const issue = issuesMap.get(issueId);
            if (!issue) continue; // Should not happen usually

            reportData.push({
                issue: {
                    key: issue.key,
                    summary: issue.fields.summary,
                    status: issue.fields.status.name,
                    iconUrl: issue.fields.issuetype?.iconUrl
                },
                worklogs: worklogs.map((wl: any) => ({
                    id: wl.tempoWorklogId,
                    started: wl.startDate + "T" + (wl.startTime || "00:00:00"), // Tempo returns separate date/time often
                    timeSpentSeconds: wl.timeSpentSeconds,
                    comment: wl.description || ""
                }))
            });
        }
    }

    return NextResponse.json({ report: reportData, date });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
