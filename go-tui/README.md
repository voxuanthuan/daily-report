# Jira Daily Report - Go TUI

Fast, performant terminal interface for managing Jira tasks and logging time to Tempo.

**🚀 20x faster than the TypeScript version!**

---

## Quick Start

### 1. Build
```bash
cd go-tui
go build -o bin/jira-report ./cmd/jira-report
```

### 2. Configure

**Option A: Interactive Setup (Recommended)**
```bash
./bin/jira-report config init
```

**Option B: Environment Variables**
```bash
export JIRA_SERVER="https://your-domain.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"
export TEMPO_API_TOKEN="your-tempo-token"
export JIRA_ACCOUNT_ID="your-account-id"

./bin/jira-report tui
```

**Option C: Manual Config File**
Create `~/.jira-daily-report.json` manually (see Configuration File section)

### 3. Run
```bash
./bin/jira-report tui
```

---

## 🔐 Authentication

**New!** OAuth 2.0 authentication - log in with your browser, no API tokens needed!

```bash
# Setup OAuth credentials (one time)
jira-report auth init

# Login via browser
jira-report auth login
```

📖 **[Full Authentication Guide →](README_AUTHENTICATE.md)**

---

## Commands

### `jira-report tui`
Launch the interactive TUI

### `jira-report config init`
Initialize configuration interactively

**Example:**
```bash
$ ./bin/jira-report config init

🔧 Jira Daily Report - Configuration Setup
==========================================

Jira Server URL: https://your-domain.atlassian.net
Jira Email/Username: you@example.com
Jira API Token (hidden): ****
Tempo API Token (hidden): ****
Jira Account ID: 1234567890abcdef
Theme (default: dark): dark

✅ Config saved to: /home/user/.jira-daily-report.json

🚀 You can now run: jira-report tui
```

### `jira-report config show`
Display current configuration (tokens masked)

**Example:**
```bash
$ ./bin/jira-report config show

📋 Current Configuration
=======================
Jira Server:  https://your-domain.atlassian.net
Username:     you@example.com
API Token:    abc****xyz
Tempo Token:  xyz****abc
Account ID:   1234567890abcdef
Theme:        dark

Location: /home/user/.jira-daily-report.json
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Previous panel |
| `l` / `→` | Next panel |
| `1` | Today panel |
| `2` | Todo panel |
| `3` | Testing panel |
| `4` | Time Tracking panel |
| `q` / `Ctrl+C` | Quit |

---

## Features

✅ **Fast Navigation** - Instant response (<10ms)
✅ **Real Data** - Fetches from Jira & Tempo APIs
✅ **Concurrent Loading** - Parallel data fetching
✅ **Worklog Enrichment** - Shows task details with time logged
✅ **Dark Theme** - Beautiful terminal UI
✅ **Single Binary** - No dependencies

---

## Configuration File

Location: `~/.jira-daily-report.json`

```json
{
  "jiraServer": "https://your-domain.atlassian.net",
  "username": "you@example.com",
  "apiToken": "your-jira-api-token",
  "tempoApiToken": "your-tempo-api-token",
  "whoAmI": "your-account-id",
  "autoClipboard": false,
  "theme": "dark"
}
```

**Security**: File permissions are set to `0600` (owner read/write only)

---

## Install

### Option 1: Build from source
```bash
cd go-tui
go build -o bin/jira-report ./cmd/jira-report
cp bin/jira-report /usr/local/bin/
```

### Option 2: Use directly
```bash
cd go-tui
./bin/jira-report tui
```

---

## Performance

| Metric | TypeScript | Go | Improvement |
|--------|-----------|-----|-------------|
| Startup | ~500ms | **~50ms** | **10x faster** |
| Navigation | ~200ms | **<10ms** | **20x faster** |
| Memory | ~100MB | **~20MB** | **5x less** |

---

## License

Same as main project
