## Jira Daily Report

### Features

- Report Generation
- Time Logging
---

## Installation

### CLI Tool (Global)

```bash
# Install globally using npm/pnpm/yarn
npm install -g jira-daily-report
```

###  Environment Variables

Environment variables take precedence over config files:

```bash
# Add to your shell profile (.bashrc, .zshrc, .bash_profile)
export JIRA_SERVER="https://your-domain.atlassian.net/"
export JIRA_USERNAME="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export TEMPO_API_TOKEN="your-tempo-api-token"

# Optional settings
export WHO_AM_I="Developer" #or "QC"
export AUTO_CLIPBOARD="true"

# Reload your shell configuration
source ~/.zshrc  # or ~/.bashrc
```

### Get Your API Tokens

- **Jira API Token**: https://id.atlassian.com/manage-profile/security/api-tokens
- **Tempo API Token**: https://apidocs.tempo.io/#section/Authentication
  - Go to: `https://your-domain.atlassian.net/plugins/servlet/ac/io.tempo.jira/tempo-app#!/configuration/api-integration`

---

## CLI Commands

### 1. `jira-report generate`


---

### 2. `jira-report logtime`

Log time to Tempo for one or multiple tickets with flexible date support.

**Usage:**

```bash
# Log time for today (default)
jira-report logtime "B2B-1079 2h"

# Log multiple tickets at once
jira-report logtime "B2B-1079 2h, PROJECT-123 1.5h, TASK-456 30m"

# Log time for yesterday
jira-report logtime "B2B-1079 2h" --date yesterday

# Log time for a specific date
jira-report logtime "B2B-1079 2h" --date 2025-01-15

# Add description to all entries
jira-report logtime "B2B-1079 2h, PROJECT-123 1h" --description "Fixed authentication bug"

```

**Timesheet Format:**

The timesheet format supports flexible time notation:

- `2h` - 2 hours
- `1.5h` - 1 hour 30 minutes
- `30m` - 30 minutes
- `1h 30m` - 1 hour 30 minutes (combined)

---

## Support

For help with setup, troubleshooting, or feature requests, please visit our [GitHub Issues](https://github.com/voxuanthuan/daily-report/issues) page.

---

## License

MIT

