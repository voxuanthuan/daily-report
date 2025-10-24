# Jira Daily Report

Generate daily standup reports from Jira and Tempo time tracking - available as both a CLI tool and VS Code extension.


## Installation

### CLI Tool (npm)

```bash
# Global installation (recommended for CLI usage)
pnpm install -g jira-daily-report

# Or use with npx
npx jira-daily-report generate
```


- **Jira API Token**: Get from https://id.atlassian.com/manage-profile/security/api-tokens
- **Tempo API Token**: Get from https://{your-domain}.atlassian.net/plugins/servlet/ac/io.tempo.jira/tempo-app#!/configuration/api-integration

**Or use environment variables:**

```bash
# Add to your shell profile (.bashrc, .zshrc, .bash_profile)

export JIRA_SERVER="https://your-domain.atlassian.net/"
export JIRA_USERNAME="thuanvo@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export TEMPO_API_TOKEN="your-tempo-api-token"
export WHO_AM_I="Developer"  # or "QC"

# Reload your shell configuration
source ~/.zshrc  # or ~/.bashrc
```

### 3. Generate Your Report
## CLI Commands

### `jira-report generate`


## Requirements

- Node.js >= 16.0.0
- Jira Server access with API token

## Support

For help with setup, troubleshooting, or feature requests, please visit our [GitHub Issues](https://github.com/voxuanthuan/daily-report/issues) page.

