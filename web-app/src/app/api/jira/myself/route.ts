import { NextRequest, NextResponse } from 'next/server';
import { jiraFetch } from '@/lib/jira-client';

export async function GET(request: NextRequest) {
  try {
    const data = await jiraFetch(`/rest/api/3/myself`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
