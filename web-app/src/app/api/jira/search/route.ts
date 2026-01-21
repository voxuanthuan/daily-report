import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jql = searchParams.get('jql');

  if (!jql) {
    return NextResponse.json({ error: 'Missing JQL parameter' }, { status: 400 });
  }

  const fields = searchParams.get('fields') || 'summary,status,issuetype,priority,description,updated,fixVersions,assignee';

  try {
    // New: POST /rest/api/3/search/jql
    // Note: This endpoint is strict about payload keys.
    // 'validateQuery' is NOT supported (use 'validation' instead, or omit).
    
    const fieldsArray = fields.split(',');

    const payload = {
      jql: jql,
      fields: fieldsArray,
      maxResults: 50
    };

    const data = await jiraFetch(`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Jira Search API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
