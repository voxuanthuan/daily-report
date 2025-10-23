# Jira Daily Report - CLI Documentation

The Jira Daily Report tool now supports both VS Code extension and command-line interface (CLI) usage!

## Installation

### Global Installation (Recommended for CLI)
```bash
npm install -g jira-daily-report
```

### Local Installation
```bash
npm install jira-daily-report
# Use via: npx jira-report
```

## Quick Start

### 1. Initialize Configuration
```bash
jira-report config init
```

This creates a `.jira-report.json` file in your current directory with the following template:
```json
{
  "jiraServer": "https://your-domain.atlassian.net/",
  "username": "your-email@example.com",
  "apiToken": "your-jira-api-token",
  "jiraTempoToken": "your-tempo-api-token",
  "whoAmI": "Developer",
  "autoClipboard": true
}
```

### 2. Configure Your Credentials

**Option A: Edit Config File**
Edit `.jira-report.json` and add your credentials:
- **Jira API Token**: Get from https://id.atlassian.com/manage-profile/security/api-tokens
- **Tempo API Token**: Get from https://apidocs.tempo.io/#section/Authentication

**Option B: Use Environment Variables**
```bash
export JIRA_SERVER="https://your-domain.atlassian.net/"
export JIRA_USERNAME="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export TEMPO_API_TOKEN="your-tempo-api-token"
export WHO_AM_I="Developer"  # or "QC"
```

### 3. Generate Your Report
```bash
jira-report generate
```

## CLI Commands

### `jira-report generate`
Generate daily standup report

**Options:**
- `-o, --output <file>` - Save report to file instead of console
- `-f, --format <type>` - Output format: `text` (default), `json`, or `markdown`
- `-c, --clipboard` - Copy report to clipboard (requires clipboardy package)
- `-s, --silent` - Suppress info messages
- `--no-cache` - Disable caching

**Examples:**
```bash
# Basic usage - outputs to console
jira-report generate

# Save to file
jira-report generate -o report.txt

# Generate JSON format
jira-report generate -f json -o report.json

# Copy to clipboard
jira-report generate -c

# Silent mode (only show report)
jira-report generate -s
```

### `jira-report config`
Manage configuration files

**Subcommands:**

#### `jira-report config init`
Initialize a new config file

**Options:**
- `-g, --global` - Create config in home directory (`~/.jira-report.json`)

**Examples:**
```bash
# Create local config
jira-report config init

# Create global config
jira-report config init --global
```

#### `jira-report config show`
Display current configuration with masked secrets

**Example:**
```bash
jira-report config show
```

Output:
```
Current Configuration:
──────────────────────────────────────────────────
Jira Server:    https://company.atlassian.net/
Username:       john@example.com
API Token:      ABCD****WXYZ
Tempo Token:    1234****5678
User Type:      Developer
Auto Clipboard: true

Config File Locations:
✓ /home/user/project/.jira-report.json
✗ /home/user/.jira-report.json

Environment variables take precedence over config files.
```

## Configuration Priority

Configuration is loaded in the following order (highest priority first):

1. **Environment Variables** (highest priority)
   - `JIRA_SERVER`
   - `JIRA_USERNAME`
   - `JIRA_API_TOKEN`
   - `TEMPO_API_TOKEN`
   - `WHO_AM_I`
   - `AUTO_CLIPBOARD`

2. **Local Project Config**
   - `./.jira-report.json` (current directory)

3. **User Home Config** (lowest priority)
   - `~/.jira-report.json`

## Configuration Options

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `jiraServer` | Yes | Jira instance URL | - |
| `username` | Yes | Jira username (email) | - |
| `apiToken` | Yes | Jira API token | - |
| `jiraTempoToken` | Yes | Tempo API token | - |
| `whoAmI` | No | User type: "Developer" or "QC" | "Developer" |
| `autoClipboard` | No | Auto-copy to clipboard | `true` |
| `enableTimesheetIntegration` | No | Enable timesheet features | `true` |
| `timesheetDateFormat` | No | Date format for timesheets | "YYYY-MM-DD" |

## Output Formats

### Text Format (Default)
Human-readable format suitable for Slack/Teams messages:
```
Hi everyone,
Yesterday (22/10)
- PROJ-123: Implemented user authentication
- PROJ-124: Fixed login bug

Today
- PROJ-125: Add password reset feature

No blockers

-------------------------------------------------------------
To Do List
🟥 - PROJ-126: Fix critical bug
🟩 - PROJ-127: New feature request
```

### JSON Format
Structured data for integrations:
```json
{
  "greeting": "Hi everyone",
  "yesterday": [
    "PROJ-123: Implemented user authentication",
    "PROJ-124: Fixed login bug"
  ],
  "today": [
    "PROJ-125: Add password reset feature"
  ],
  "blockers": "No blockers",
  "todoList": [
    "🟥 - PROJ-126: Fix critical bug",
    "🟩 - PROJ-127: New feature request"
  ],
  "worklog": "..."
}
```

### Markdown Format
Same as text but optimized for markdown rendering

## Advanced Usage

### Multiple Environments
Maintain different configs for different projects:

```bash
# Project A
cd ~/projects/project-a
jira-report config init
jira-report generate

# Project B
cd ~/projects/project-b
jira-report config init
jira-report generate
```

### CI/CD Integration
```bash
# In your CI script
export JIRA_SERVER="$JIRA_SERVER_SECRET"
export JIRA_USERNAME="$JIRA_USERNAME_SECRET"
export JIRA_API_TOKEN="$JIRA_API_TOKEN_SECRET"
export TEMPO_API_TOKEN="$TEMPO_API_TOKEN_SECRET"

jira-report generate -f json -o report.json --no-cache
```

### Scheduled Reports
Add to crontab for daily reports:
```bash
# Generate report every weekday at 9 AM
0 9 * * 1-5 jira-report generate -o ~/daily-reports/$(date +\%Y-\%m-\%d).txt
```

## Troubleshooting

### "Configuration 'xxx' is required but not set"
- Ensure you've run `jira-report config init` and filled in all required fields
- Or set the corresponding environment variables

### "Failed to copy to clipboard"
- Install optional dependency: `npm install -g clipboardy`
- Or use `-o` flag to save to file instead

### API Token Issues
- Verify tokens are correct and haven't expired
- Jira API Token: https://id.atlassian.com/manage-profile/security/api-tokens
- Tempo API Token: https://apidocs.tempo.io/#section/Authentication

### Network/Firewall Issues
- Ensure you can access your Jira instance from the command line
- Check proxy settings if behind corporate firewall

## Differences from VS Code Extension

| Feature | VS Code Extension | CLI |
|---------|-------------------|-----|
| Configuration | VS Code settings | Config file or env vars |
| Output | Output panel + clipboard | Console, file, or clipboard |
| Interactive prompts | Yes | No (command-line only) |
| Quick actions | Yes | Not yet implemented |
| Timesheet parsing | Yes | Not yet implemented |

## Getting API Tokens

### Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a descriptive name (e.g., "Daily Report CLI")
4. Copy the token immediately (you can't see it again)

### Tempo API Token
1. Log in to your Jira instance
2. Go to Tempo > Settings > Data Access > API Integration
3. Create a new token
4. Copy and save the token

## Support

For issues, feature requests, or contributions:
- GitHub: https://github.com/voxuanthuan/daily-report
- Issues: https://github.com/voxuanthuan/daily-report/issues

## License

See LICENSE file in the repository.
