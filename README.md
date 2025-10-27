# Jira Daily Report CLI

[![npm version](https://img.shields.io/npm/v/jira-daily-report.svg)](https://www.npmjs.com/package/jira-daily-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for daily Jira reporting and Tempo time logging from your terminal.

## Installation
```bash
npm install -g jira-daily-report
```

## Setup

Add these to your shell profile (`.bashrc`, `.zshrc`):
```bash
export JIRA_SERVER="https://your-domain.atlassian.net/"
export JIRA_USERNAME="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export TEMPO_API_TOKEN="your-tempo-api-token"
```

**Get your tokens:**
- **Jira:** [Create API token](https://id.atlassian.com/manage-profile/security/api-tokens)
- **Tempo:** Go to `https://your-domain.atlassian.net/plugins/servlet/ac/io.tempo.jira/tempo-app#!/configuration/api-integration` (replace `your-domain` with your Jira domain)

## Usage

**Generate daily report:**
```bash
jira-report generate
```

**Log time:**
```bash
# Single ticket
jira-report logtime "B2B-1079 2h"

# Multiple tickets
jira-report logtime "B2B-1079 2h, PROJECT-123 1.5h"

# Specific date
jira-report logtime "B2B-1079 2h" --date yesterday
jira-report logtime "B2B-1079 2h" --date 2025-01-15

# With description
jira-report logtime "B2B-1079 2h" --description "Bug fix"
```

**Time formats:** `2h`, `1.5h`, `30m`, `1h 30m`

## Contribute

Found a bug or have a feature idea? [Open an issue](https://github.com/voxuanthuan/daily-report/issues) or submit a PR!

Also available as a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=thuanvo.jira-daily-report)
