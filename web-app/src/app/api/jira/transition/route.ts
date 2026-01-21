import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueIdOrKey, transitionId } = body;

    if (!issueIdOrKey || !transitionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      transition: {
        id: transitionId
      }
    };

    // Note: Transitions endpoint returns 204 No Content on success
    await jiraFetch(`/rest/api/3/issue/${issueIdOrKey}/transitions`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
