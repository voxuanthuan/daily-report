# Jira Daily Report Extension

A VS Code extension that generates daily standup reports from your Jira Server and integrates with Tempo time tracking.

**🌐 Website**: [https://v0-jira-daily-report.vercel.app/](https://v0-jira-daily-report.vercel.app/)

## Requirements

- VS Code 1.80.0 or later
- Jira Server access with API token
- Tempo time tracking (optional)

## Installation

### Method 1: From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "jira-daily-report"
4. Click Install

### Method 2: Quick Install
1. Open VS Code
2. Press `Ctrl+P` (Quick Open)
3. Type: `ext install thuanvo.jira-daily-report`
4. Press Enter

### Method 3: Manual Installation
1. Download from [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=thuanvo.jira-daily-report)
2. Install the .vsix file in VS Code

## Configuration

Before using the extension, configure your Jira settings:

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "jira daily report"
3. Configure the following:
   - **Jira Server URL**: Your Jira instance (e.g., `https://yourcompany.atlassian.net/`)
   - **Username**: Your Jira username (email)
   - **API Token**: [Get your Jira API token](https://confluence.atlassian.com/cloud/api-tokens-938839638.html)
   - **Tempo API Token**: [Get your Tempo API token](https://apidocs.tempo.io/#section/Authentication) (optional)
   - **Who Am I**: Select "Developer" or "QC"
   - **Auto Clipboard**: Enable to automatically copy reports to clipboard

## Features

### 1. Generate Jira Daily Report

Creates a daily standup report with your tasks, time tracking, and blockers.

**How to use:**
1. Press `Ctrl+Shift+P` to open Command Palette
2. Type: `Generate Jira Daily Report`
3. Press Enter

**Or use keyboard shortcut:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

**What it does:**
- Fetches your current Jira tasks (Open, In Progress, Selected for Development)
- Retrieves time tracking data from Tempo
- Generates formatted report with:
  - Yesterday's completed work
  - Today's planned tasks
  - Blockers and impediments
  - Time tracking summary

### 2. Open Ticket

Opens any Jira ticket in your browser quickly.

**How to use:**
1. Press `Ctrl+Shift+P` to open Command Palette
2. Type: `Open Ticket`
3. Press Enter
4. Enter ticket key (e.g., `B2B-1079`)
5. Ticket opens in your default browser

**Or use keyboard shortcut:** `Ctrl+Shift+O` (Windows/Linux) or `Cmd+Shift+O` (Mac)

**What it does:**
- Prompts for ticket key
- Opens the ticket in your default browser
- Quick way to view ticket details, comments, attachments

### 3. Jira Quick Action

Main feature that combines time logging and status changes in one command using hashtag syntax.

**How to use:**
1. Press `Ctrl+Shift+P` to open Command Palette
2. Type: `Jira Quick Action`
3. Press Enter
4. Enter command with hashtag syntax (see examples below)

**Or use keyboard shortcut:** `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Shift+J` (Mac)

**Hashtag Syntax Examples:**
```
# Log time and change status
B2B-1079 #time 2h #under-review

# Change status only
B2B-1079 #under-review

# Log time only
B2B-1079 #time 2h

# Order doesn't matter
#time 2h B2B-1079 #in-progress

# Use aliases
B2B-1079 #time 1.5h #dev    # dev = selected for development
B2B-1079 #review             # review = under-review
```

**Supported Time Formats:**
- `2h` (2 hours)
- `1.5h` (1.5 hours)
- `30m` (30 minutes)
- `1h 30m` (1 hour 30 minutes)

**Supported Status Changes:**
- `#open` → Open
- `#selected` or `#dev` → Selected for Development
- `#in-progress` or `#wip` → In Progress
- `#under-review` or `#review` → Under Review
- `#ready-for-testing` or `#testing` → Ready for Testing

**What it does:**
1. Validates ticket format and syntax
2. Logs time directly to Tempo (if `#time` specified)
3. Changes ticket status via Jira API (if status specified)
4. Shows detailed results with success/failure information

### 4. My Jira Tickets

Browse your current tickets and perform quick actions.

**How to use:**
1. Press `Ctrl+Shift+P` to open Command Palette
2. Type: `My Jira Tickets`
3. Press Enter
4. Select a ticket from the list
5. Choose an action for the selected ticket

**Or use keyboard shortcut:** `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)

**What it shows:**
- **In Progress tickets** (marked with 🔥 for high priority)
- **Selected for Development tickets**
- Quick actions for each ticket (log time, change status, etc.)

**What it does:**
- Displays your current work in a organized list
- Provides quick access to ticket actions
- Integrates with Jira Quick Action for seamless workflow

## Keyboard Shortcuts Summary

- **`Ctrl+Shift+R`** - Generate Jira Daily Report
- **`Ctrl+Shift+O`** - Open Ticket in Browser
- **`Ctrl+Shift+J`** - Jira Quick Action
- **`Ctrl+Shift+T`** - My Jira Tickets

*On Mac, use `Cmd` instead of `Ctrl`*

## Additional Resources

- **Website**: [https://v0-jira-daily-report.vercel.app/](https://v0-jira-daily-report.vercel.app/)
- **GitHub Repository**: [https://github.com/voxuanthuan/daily-report](https://github.com/voxuanthuan/daily-report)
- **Issues & Feature Requests**: [GitHub Issues](https://github.com/voxuanthuan/daily-report/issues)
- **Keyboard Shortcuts Reference**: [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md)

## Support

For help with setup, troubleshooting, or feature requests, please visit our [GitHub Issues](https://github.com/voxuanthuan/daily-report/issues) page.

## License

[MIT](./License.md)