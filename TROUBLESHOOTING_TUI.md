# TUI Troubleshooting Guide

## "Failed to load theme" or "Cannot read properties of undefined (reading 'fg')" Error

### Quick Fix

Try running with explicit default theme:
```bash
THEME=dark npx jira-report tui
```

### Reproduction Steps

1. **Check your version:**
   ```bash
   npx jira-report --version
   ```
   Make sure you're on version `0.1.137` or later.

2. **Check your config file exists:**
   ```bash
   # Check for config in current directory
   cat .jira-report.json
   
   # Check for config in home directory
   cat ~/.jira-report.json
   ```

3. **Verify config has theme set:**
   ```json
   {
     "jiraServer": "...",
     "username": "...",
     "apiToken": "...",
     "jiraTempoToken": "...",
     "theme": "dark"
   }
   ```

4. **Try with environment variable override:**
   ```bash
   THEME=dark jira-report tui
   ```

### Debug Information to Collect

If the TUI still crashes, collect this information:

```bash
# 1. Version info
jira-report --version

# 2. Node version
node --version

# 3. Config location and content (mask sensitive data)
cat ~/.jira-report.json | jq 'del(.apiToken, .jiraTempoToken)'

# 4. Try with verbose error
jira-report tui 2>&1 | tee tui-error.log

# 5. Stack trace
# Copy the full error output including line numbers
```

### Common Issues

#### Issue 1: Old cached version
```bash
# Clear npm cache
npm cache clean --force

# Reinstall with latest version
npm install -g jira-daily-report@latest
```

#### Issue 2: Missing theme in config
Add `"theme": "dark"` to your `.jira-report.json`:
```json
{
  "jiraServer": "https://your-domain.atlassian.net/",
  "username": "your-email@example.com",
  "apiToken": "your-token",
  "jiraTempoToken": "your-tempo-token",
  "theme": "dark"
}
```

#### Issue 3: Invalid theme name
Valid themes are:
- `dark` (default)
- `light`
- `solarized`
- `solarized-light`
- `dracula`
- `auto`

### Advanced Debug

Run from source to get better error messages:

```bash
# Clone repo
git clone https://github.com/your-org/jira-daily-report.git
cd jira-daily-report

# Install dependencies
npm install

# Build
npm run compile

# Run with full stack trace
node --trace-warnings dist/cli/index.js tui
```

### Report Bug

If none of these fixes work, please report with:
1. Full error message + stack trace
2. Node version (`node --version`)
3. OS (`uname -a` or Windows version)
4. Config file (with secrets masked)
5. How you're running it (npx, global install, from source)

## Image Preview Issues

### Images show as "[Image: filename]" text
This means your terminal doesn't support high-resolution image protocols (Sixel/Kitty/iTerm).

**Fix:**
1.  **Switch Terminal**: Use a terminal like **iTerm2** (macOS), **Kitty**, or **WezTerm**.
2.  **Install Fallback**: Install `viu` to enable block-based previews in standard terminals (like VSCode).
    *   macOS: `brew install viu`
    *   Linux: `cargo install viu`

### Images show as broken characters
If using `viu` fallback, ensure your terminal font supports unicode block characters and truecolor is enabled.

### "Image load failed" error
Check the error message in the Details panel.
-   **401/403**: Check your Jira API token and username in `~/.jira-daily-report.json`.
-   **404**: The image might have been deleted from Jira.

