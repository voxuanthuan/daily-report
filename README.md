# Jira Daily Report CLI

[![npm version](https://img.shields.io/npm/v/jira-daily-report.svg)](https://www.npmjs.com/package/jira-daily-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI tool for daily Jira reporting and Tempo time logging from your terminal.

https://github.com/user-attachments/assets/your-video-id/promo.mp4

> **Note:** Upload the video from `go-tui/promo-video/out/promo.mp4` to your GitHub repository's releases or use a service like GitHub's asset hosting to get a permanent URL, then replace the URL above.

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

## Recommended Terminal Configuration

### Fonts

For optimal TUI experience, use one of these monospace fonts:

**Highly Recommended:**
- **Fira Code** - Excellent ligatures and readability
- **JetBrains Mono** - Optimized for code, clear characters
- **Cascadia Code** - Microsoft's modern terminal font

**Good Options:**
- Source Code Pro (Adobe)
- Noto Sans Mono (wide Unicode support)
- Ubuntu Mono

**Installation (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install fonts-firacode fonts-jetbrains-mono
```

**Installation (macOS):**
```bash
brew install --cask font-fira-code
brew install --cask font-jetbrains-mono
```

**Download from:**
- Fira Code: https://github.com/tonsky/FiraCode
- JetBrains Mono: https://www.jetbrains.com/lp/mono/

**Font Size:** 12-14px recommended for standard screens
- Small laptops: 11-12px
- Large monitors: 14-16px

### Terminal Settings

**GNOME Terminal:**
1. Preferences > Text
2. Uncheck "Use the system fixed width font"
3. Select: Fira Code Regular
4. Set size: 13

**macOS Terminal:**
1. Preferences > Profiles > Text
2. Select Font: Fira Code
3. Set size: 13

**Windows Terminal:**
1. Settings > Profiles > Defaults
2. Font face: JetBrains Mono
3. Size: 13

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
