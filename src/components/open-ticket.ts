import * as vscode from 'vscode';
import { JIRA_SERVER } from './config-utils';


// Function to open a Jira ticket in the browser
export function openJiraTicket(ticketId: string | undefined) {
  if (!ticketId) {
    vscode.window.showErrorMessage('No ticket ID provided.');
    return;
  }

  const cleanedTicketId = ticketId.trim();
  if (!cleanedTicketId) {
    vscode.window.showErrorMessage('Ticket ID cannot be empty.');
    return;
  }

  const url = `${JIRA_SERVER}/browse/${cleanedTicketId}`;
  vscode.env.openExternal(vscode.Uri.parse(url));
}

