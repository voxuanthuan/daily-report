# Keyboard Shortcuts Reference

## Default Keybindings

### Primary Commands
- **`Ctrl+Shift+J`** (Windows/Linux) or **`Cmd+Shift+J`** (Mac)
  - **Jira Quick Action** - Main command with hashtag syntax
  - Example: `B2B-1079 #time 2h #under-review`

- **`Ctrl+Shift+T`** (Windows/Linux) or **`Cmd+Shift+T`** (Mac)
  - **My Jira Tickets** - Browse your current tickets
  - Shows In Progress and Selected for Development tickets

- **`Ctrl+Shift+R`** (Windows/Linux) or **`Cmd+Shift+R`** (Mac)
  - **Generate Daily Report** - Generate your daily standup report

- **`Ctrl+Shift+O`** (Windows/Linux) or **`Cmd+Shift+O`** (Mac)
  - **Open Ticket** - Open Jira ticket in browser
  - Prompts for ticket key (e.g., B2B-1079) and opens in default browser

## Quick Usage Examples

### Using Ctrl+Shift+J (Quick Action)
```bash
# Start working on a ticket
B2B-1079 #in-progress

# Log time after working  
B2B-1079 #time 3h

# Submit for review with final time
B2B-1079 #time 1h #under-review

# Quick status change
PROJECT-456 #ready-for-testing
```

### Using Ctrl+Shift+T (My Tickets)
- Shows a list of your current tickets
- Select a ticket to perform quick actions
- In Progress tickets are marked with 🔥 (high priority)

### Using Ctrl+Shift+R (Generate Report)
- Generates your daily standup report
- Includes yesterday's work, today's plans, and blockers
- Integrates with time tracking data

### Using Ctrl+Shift+O (Open Ticket)
- Press the shortcut
- Enter ticket key (e.g., `B2B-1079`)
- Ticket opens in your default browser
- Quick way to view ticket details, comments, attachments

## Customization

You can customize these shortcuts in VS Code:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Preferences: Open Keyboard Shortcuts"
3. Search for "jiraDailyReport"
4. Edit the keybindings as needed

## Conflicts

If any of these shortcuts conflict with existing VS Code shortcuts:
- The extension shortcuts will take precedence when the editor is focused
- You can disable or change them in the Keyboard Shortcuts settings
- Common conflicts:
  - `Ctrl+Shift+T` might conflict with "Reopen Closed Editor"
  - `Ctrl+Shift+J` might conflict with "Toggle Panel"
  - `Ctrl+Shift+O` might conflict with "Go to Symbol in Workspace"

## Alternative Access

All commands are also available via Command Palette:
- `Ctrl+Shift+P` → Type command name
- No keyboard shortcut required
- Works even if shortcuts are disabled