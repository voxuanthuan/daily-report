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
✅ **Image Preview** - Native Sixel/Kitty support with `viu` fallback
✅ **Single Binary** - No dependencies
✅ **Smart Caching** - Instant startup with cached data (enabled by default)

---

## Image Previews

The TUI supports inline image previews for Jira issue descriptions.

### Supported Terminals (Native High-Res)
If you use a terminal with **Sixel**, **Kitty**, or **iTerm2** protocol support, images will render natively in high resolution.
- **iTerm2** (macOS)
- **Kitty**
- **WezTerm**
- **Alacritty** (with sixel patch) or others

### Standard Terminals (Fallback)
For standard terminals (VSCode integrated terminal, Apple Terminal, GNOME Terminal), install **`viu`** to enable block-based image previews.

**Installation:**
- **macOS**: `brew install viu`
- **Linux**: `cargo install viu` (or check your package manager)

If `viu` is detected, the TUI will automatically use it as a fallback renderer. Without it, you will see a text placeholder.

---

## Configuration File

Location: `~/.jira-daily-report.json`

```json
{
  "jiraServer": "https://your-domain.atlassian.net",
  "username": "you@example.com",
  "apiToken": "your-jira-api-token",
  "tempoApiToken": "your-tempo-token",
  "whoAmI": "your-account-id",
  "autoClipboard": false,
  "theme": "dark",
  "cacheEnabled": true,
  "cacheTTL": 60
}
```

**Security**: File permissions are set to `0600` (owner read/write only)

### Cache Configuration

- **`cacheEnabled`**: Enable/disable caching (default: `true`)
- **`cacheTTL`**: Cache time-to-live in minutes (default: `60`)
- **Cache file**: `~/.jira-daily-report-cache.json` (auto-managed)

**Environment Variables:**
```bash
export JIRA_CACHE_ENABLED=true   # Enable/disable cache
export JIRA_CACHE_TTL=60          # Cache TTL in minutes
```

**How it works:**
1. First launch: Fetches fresh data from APIs (~500ms)
2. Subsequent launches: Shows cached data instantly (~50ms), then refreshes in background
3. Cache indicator: Shows `📦 Xm old` in status bar when using cached data

---

## Install

### Prerequisites (Optional)

For the best image preview experience on terminals without native Sixel/Kitty support, install `viu`:

- **macOS**: `brew install viu`
- **Linux**: `cargo install viu` (or via your package manager)

Without `viu`, image previews will only work in terminals with Sixel/Kitty/iTerm2 support (like WezTerm, iTerm2, Kitty).

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

| Metric | TypeScript | Go (Cold Start) | Go (Cached) | Best Improvement |
|--------|-----------|-----------------|-------------|------------------|
| Startup | ~500ms | ~500ms | **~50ms** | **10x faster** |
| Navigation | ~200ms | **<10ms** | **<10ms** | **20x faster** |
| Memory | ~100MB | **~20MB** | **~20MB** | **5x less** |

**Cache Performance:**
- ⚡ **First launch**: ~500ms (fetches from API)
- 🚀 **Cached launch**: ~50ms (10x faster)
- 🔄 **Background refresh**: Data updates seamlessly without blocking UI

---

## License

Same as main project
