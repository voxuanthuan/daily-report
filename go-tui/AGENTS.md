# AGENTS.md

This document helps agents work effectively with this Go-based Jira TUI application.

## Project Overview

This is a fast, performant terminal UI for managing Jira tasks and logging time to Tempo. Built with Go using Bubble Tea for TUI and Cobra for CLI. Provides 20x performance improvement over the original TypeScript version.

**Key Features:**
- Terminal-based interactive UI
- OAuth 2.0 authentication (preferred) or Basic Auth fallback
- Real-time Jira and Tempo API integration
- Progressive loading (fast initial load, background enrichment)
- Multi-panel layout with task management and time tracking
- Action framework with optimistic updates and verification

---

## Essential Commands

### Building

```bash
# Single platform build (current OS/arch)
go build -o bin/jira-report ./cmd/jira-report

# Optimized build (smaller binary size)
go build -ldflags="-s -w" -o bin/jira-report ./cmd/jira-report
# -s: Strip symbol table
# -w: Strip DWARF debugging information

# Using build script (recommended)
./build.sh

# Multi-platform build
./build-all.sh
# Builds for: linux-amd64, linux-arm64, darwin-amd64, darwin-arm64, windows-amd64, windows-arm64
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests with verbose output
go test -v ./...

# Run tests for specific package
go test ./internal/oauth
go test ./internal/report

# Run tests with coverage
go test -cover ./...
```

### Running

```bash
# Build first if needed
go build -o bin/jira-report ./cmd/jira-report

# Launch TUI
./bin/jira-report tui

# Configuration
./bin/jira-report config init    # Interactive setup
./bin/jira-report config show    # Show current config

# Authentication (OAuth)
./bin/jira-report auth init      # Setup OAuth credentials
./bin/jira-report auth login     # Login via browser
./bin/jira-report auth status    # Check auth status
./bin/jira-report auth logout    # Remove credentials
./bin/jira-report auth sites     # List accessible Jira sites
```

### Development

```bash
# Go version check
go version  # Requires Go 1.24+

# Download dependencies
go mod download
go mod tidy

# Format code
go fmt ./...

# Lint (if golangci-lint is installed)
golangci-lint run

# Verify binary
./bin/jira-report --help
```

---

## Code Organization

### Directory Structure

```
go-tui/
├── cmd/jira-report/     # CLI entry points
│   ├── main.go          # Root command setup
│   ├── auth.go          # Authentication commands
│   ├── generate.go      # Report generation commands
│   └── logtime.go       # Time logging commands
├── internal/
│   ├── api/            # Jira and Tempo API clients
│   ├── oauth/          # OAuth 2.0 authentication
│   ├── report/         # Daily report generation
│   ├── config/         # Configuration management
│   ├── jira/          # Jira-specific utilities
│   ├── model/          # Data structures
│   └── tui/            # TUI application
│       ├── app.go              # Main Bubble Tea model
│       ├── actions/           # User action framework
│       ├── refresh/           # Data refresh strategies
│       ├── state/             # Application state
│       ├── panels/            # Panel rendering
│       ├── gocui_*.go         # gocui library integration
│       └── *_modal.go          # Modal dialogs
├── go.mod / go.sum      # Go module definitions
├── build.sh            # Optimized single-platform build
├── build-all.sh        # Multi-platform build
└── package.json        # NPM wrapper for distribution
```

### Key Packages

**`internal/api/`**
- `JiraClient`: Jira REST API wrapper
  - `NewJiraClient(baseURL, username, apiToken)` - Basic auth
  - `NewOAuthJiraClient(siteURL, oauthToken)` - OAuth auth
  - Fetch methods: `FetchCurrentUser`, `FetchTasks`, `FetchIssue`, `GetTransitions`
- `TempoClient`: Tempo worklog API wrapper
  - `NewTempoClient(apiToken, jiraClient)`
  - Fetch methods: `FetchLastSixDaysWorklogs`, `EnrichWorklogsWithIssueDetails`

**`internal/oauth/`**
- OAuth 2.0 with PKCE flow implementation
- Keyring storage for credentials (platform-specific)
- `NewAuthenticator(config)` - Main entry point
- Token management with automatic refresh

**`internal/tui/`**
- `Model`: Main Bubble Tea application model
- `actions.Action`: Interface for user actions with lifecycle:
  - `Validate()` - Pre-execution checks
  - `Execute()` - Perform API call
  - `OptimisticUpdate()` - Immediate UI feedback
  - `OnSuccess()` / `OnError()` - Post-execution
  - `GetRefreshStrategy()` - How to refresh data
- `state.State`: Centralized application state
  - Panel selection and indices
  - Task lists (Report, Todo, Processing)
  - Worklogs and date groups
  - Loading states
  - Action history

**`internal/model/`**
- `Issue`: Jira issue data
- `Worklog`: Tempo worklog entry
- `User`: Jira user information
- `DateGroup`: Worklogs grouped by date

**`internal/config/`**
- `Manager`: Configuration loader
  - `NewManager()` - Load from file or env vars
  - Config stored in `~/.jira-daily-report.json`
  - Environment variables override config file

---

## Code Patterns

### Bubble Tea Pattern (TUI)

All TUI components follow the Model-Update-View pattern:

```go
type MyComponent struct {
    // Component state
}

func (c MyComponent) Init() tea.Cmd {
    // Initialize component, return initial command
}

func (c MyComponent) Update(msg tea.Msg) (MyComponent, tea.Cmd) {
    // Handle messages, return updated model and command
}

func (c MyComponent) View() string {
    // Render component as string
}
```

**Message Types:**
- `tea.KeyMsg` - Keyboard input
- `tea.WindowSizeMsg` - Terminal resize
- `tea.MouseMsg` - Mouse events (if enabled)
- Custom messages for app-specific events

### Action Framework Pattern

User interactions follow the action pattern:

```go
// 1. Define action implementing Action interface
type MyAction struct {
    // Action data
}

func (a MyAction) Name() string { return "MyAction" }
func (a MyAction) Validate(ctx ActionContext) error { /* ... */ }
func (a MyAction) Execute(ctx ActionContext) tea.Cmd { /* ... */ }
func (a MyAction) OptimisticUpdate(s *state.State) *state.State { /* ... */ }
func (a MyAction) OnSuccess(s *state.State, result interface{}) *state.State { /* ... */ }
func (a MyAction) OnError(s *state.State, err error) *state.State { /* ... */ }
func (a MyAction) GetRefreshStrategy() state.RefreshStrategy { /* ... */ }

// 2. Execute in Update handler
ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)
action := actions.NewMyAction(...)
return m, m.actionExecutor.ExecuteAction(action, ctx)
```

**Refresh Strategies:**
- `RefreshImmediate` - No waiting (copy to clipboard)
- `RefreshPolling` - Poll API until verified (status change)
- `RefreshDelayed` - Fixed delay then refresh (bulk operations)
- `RefreshManual` - User must trigger refresh

### Progressive Loading Pattern

Data loads in phases for fast startup:

**Phase 1 (Fast Path):**
- Fetch user and tasks in parallel
- Update UI immediately
- Blocks main UI during fetch

**Phase 2 (Background):**
- Fetch worklogs after 100ms delay (allows UI to render Phase 1)
- Enrich with issue details
- Doesn't block UI
- Updates UI when complete

```go
// In Update handler
case tasksLoadedMsg:
    // Phase 1 complete
    m.state.User = msg.user
    m.state.ReportTasks = msg.reportTasks
    // ...
    m.state.Loading = false
    m.state.WorklogsLoading = true

    // Schedule Phase 2
    return m, tea.Tick(100*time.Millisecond, func(t time.Time) tea.Msg {
        return startPhase2Msg{}
    })

case startPhase2Msg:
    // Start Phase 2
    return m, m.loadWorklogsCmd()

case worklogsLoadedMsg:
    // Phase 2 complete
    m.state.WorklogsLoading = false
    m.state.Worklogs = msg.worklogs
    // ...
```

### State Management

State is centralized in `internal/tui/state/State`. Use immutable patterns:

```go
// Bad: Mutates state
func (s *State) AddTask(task model.Issue) {
    s.ReportTasks = append(s.ReportTasks, task)
}

// Good: Returns new state
func (s *State) AddTask(task model.Issue) *State {
    newState := *s // Copy
    newState.ReportTasks = append(newState.ReportTasks, task)
    return &newState
}
```

Use helper methods for common operations:
- `MoveSelectionUp()` / `MoveSelectionDown()`
- `ScrollDetailsUp()` / `ScrollDetailsDown()`
- `GetSelectedIndex()` / `SetSelectedIndex()`

### Error Handling

Always return errors with context:

```go
// Bad
if err != nil {
    return err
}

// Good
if err != nil {
    return fmt.Errorf("failed to fetch user: %w", err)
}

// For UI errors
if err != nil {
    return m, func() tea.Msg {
        return statusMessage{
            message: "Failed to fetch data",
            isError: true,
        }
    }
}
```

---

## Naming Conventions

- **Packages:** `lowercase` (e.g., `api`, `oauth`, `tui`)
- **Types:** `PascalCase` (e.g., `JiraClient`, `Issue`, `Worklog`)
- **Interfaces:** `PascalCase` (e.g., `Action`, `Verifier`)
- **Functions/Methods:** `PascalCase` if exported, `camelCase` if private
- **Constants:** `PascalCase` or `UPPER_SNAKE_CASE`
- **Files:** `snake_case.go`
- **Test files:** `*_test.go` in same package
- **Messages:** `PascalCase` (e.g., `tasksLoadedMsg`, `statusMessage`)

---

## Testing Patterns

### Test Organization

```go
package mypackage

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestMyFunction(t *testing.T) {
    tests := []struct {
        name     string
        input    InputType
        expected ExpectedType
    }{
        {
            name:     "test case 1",
            input:    Input,
            expected: Expected,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := MyFunction(tt.input)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

### Test Libraries

- `github.com/stretchr/testify` - Test assertions
  - `assert.Equal(t, expected, actual)`
  - `require.NoError(t, err)` - Fails test immediately if error
  - `assert.Len(t, slice, expectedLen)`

### Running Tests

```bash
# All tests
go test ./...

# Specific package
go test ./internal/api

# With coverage
go test -cover ./internal/api

# Race detection
go test -race ./...

# Verbose
go test -v ./internal/oauth
```

---

## Important Gotchas

### OAuth vs Basic Auth

The application prefers OAuth authentication but falls back to Basic Auth:

```go
// In tui/app.go NewModel
if oauthToken := cfg.GetOAuthToken(); oauthToken != "" {
    jiraClient = api.NewOAuthJiraClient(cfg.GetJiraServer(), oauthToken)
} else {
    jiraClient = api.NewJiraClient(
        cfg.GetJiraServer(),
        cfg.GetUsername(),
        cfg.GetApiToken(),
    )
}
```

**Gotcha:** OAuth tokens are stored in keyring, not config file. Check both when debugging auth issues.

### Jira Search Index Delay

Jira's search index may not update immediately after status changes. The app uses a 1.5s delay before refresh:

```go
// In Update handler for status changes
if msg.refresh {
    return m, tea.Tick(1500*time.Millisecond, func(t time.Time) tea.Msg {
        return delayedRefreshMsg{}
    })
}
```

**Gotcha:** If you change status and refresh immediately, old data may appear. Wait 1.5s or use 'r' to refresh.

### Panel Navigation

Panels are numbered but not contiguous:
- `[1]` - Report (Today + Yesterday tasks)
- `[2]` - Todo (Open tasks)
- `[3]` - Processing (Under Review + Testing)
- `[4]` - Time Tracking
- `[0]` - Details (only accessible via key, not in navigation cycle)

**Gotcha:** Details panel is special - shows task details from last active task panel, or worklog details if Time Tracking is active.

### gocui Integration

The app uses both `gocui` and Bubble Tea libraries. Some files have `.bak` suffixes indicating refactoring in progress.

**Gotcha:** Be aware of which library a file belongs to when making changes. Most active development uses Bubble Tea.

### Date/Time Handling

Jira API returns dates in format: `"2006-01-02T15:04:05.000-0700"`

```go
time.Parse("2006-01-02T15:04:05.000-0700", dateString)
```

**Gotcha:** Always handle parse errors - Jira dates may be missing or malformed.

### Worklog Description Defaults

Auto-generated worklog descriptions like `"working on issue GRAP-12345"` are filtered from reports:

```go
func isDefaultDescription(desc string) bool {
    // Returns true for empty, whitespace, or "working on issue XXXXX"
}
```

**Gotcha:** If you want a worklog to appear in reports, add a custom description, not just rely on the auto-generated one.

### Configuration Precedence

Configuration is loaded in this order (later overrides earlier):
1. Default values
2. Config file (`~/.jira-daily-report.json`)
3. Environment variables

**Gotcha:** Environment variables always win. Set `JIRA_SERVER` to override config file.

### Multi-platform Binary Names

Binaries are named with OS and arch:
- `jira-report-linux-amd64`
- `jira-report-darwin-arm64`
- `jira-report-windows-amd64.exe`

**Gotcha:** NPM wrapper uses `cli.js` to detect platform and call appropriate binary.

### Parallel API Calls

The app fetches multiple Jira queries in parallel using goroutines:

```go
taskChan := make(chan taskResult, 4)

go func() {
    issues, err := m.jiraClient.FetchInProgressTasks(username)
    taskChan <- taskResult{"inProgress", issues, err}
}()
// ... more goroutines ...

// Collect results
for i := 0; i < 4; i++ {
    result := <-taskChan
    // ...
}
```

**Gotcha:** When adding new Jira queries, add them to the parallel fetch group for best performance.

### Action History Limits

Action history is limited to last 50 entries:

```go
if len(m.state.ActionHistory) > 50 {
    m.state.ActionHistory = m.state.ActionHistory[len(m.state.ActionHistory)-50:]
}
```

**Gotcha:** Old actions are automatically pruned. Don't rely on full history for debugging.

---

## Configuration

### Config File Location

`~/.jira-daily-report.json`

**File permissions:** `0600` (owner read/write only)

### Config Structure

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

### Environment Variables

Environment variables override config file:

- `JIRA_SERVER` - Jira server URL
- `JIRA_EMAIL` or `JIRA_USERNAME` - Username
- `JIRA_API_TOKEN` - Jira API token
- `TEMPO_API_TOKEN` - Tempo API token
- `JIRA_ACCOUNT_ID` - User account ID
- `JIRA_THEME` - UI theme

**OAuth Environment Variables:**
- `JIRA_OAUTH_CLIENT_ID` - OAuth app client ID
- `JIRA_OAUTH_CLIENT_SECRET` - OAuth app client secret
- `JIRA_OAUTH_CALLBACK_URL` - OAuth callback URL

### Interactive Setup

```bash
./bin/jira-report config init
```

Prompts for all required values and saves to config file.

---

## Dependencies

### Key Libraries

- **github.com/charmbracelet/bubbletea** - TUI framework (Elm architecture)
- **github.com/charmbracelet/lipgloss** - Styling and layout
- **github.com/charmbracelet/bubbles** - UI components (spinners, text inputs)
- **github.com/jroimartin/gocui** - Alternative TUI library (legacy)
- **github.com/spf13/cobra** - CLI framework
- **golang.org/x/oauth2** - OAuth 2.0 client
- **github.com/zalando/go-keyring** - Cross-platform keyring storage
- **github.com/atotto/clipboard** - Clipboard access

### Go Version

Requires Go 1.24+ (see `go.mod`)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` / `Ctrl+C` | Quit |
| `j` / `↓` | Move down |
| `k` / `↑` | Move up |
| `h` / `←` | Previous panel |
| `l` / `→` | Next panel |
| `1` | Today panel |
| `2` | Todo panel |
| `3` | Testing panel |
| `4` | Time Tracking panel |
| `0` | Details panel |
| `o` | Open Jira ticket in browser |
| `r` | Refresh data |
| `s` | Change task status |
| `i` | Log time |
| `c` | Copy daily report |
| `yy` | Copy selected task |
| `H` | Show action history |

---

## Common Tasks

### Adding a New Action

1. Create action struct in `internal/tui/actions/`
2. Implement `Action` interface methods
3. Register in `internal/tui/actions/executor.go`
4. Wire keyboard shortcut in `internal/tui/app.go`

Example:

```go
// internal/tui/actions/my_action.go
type MyAction struct {
    data string
}

func (a MyAction) Name() string { return "MyAction" }
func (a MyAction) Validate(ctx ActionContext) error { return nil }
func (a MyAction) Execute(ctx ActionContext) tea.Cmd {
    return func() tea.Msg {
        // Perform action
        return actions.ActionCompletedMsg{
            ActionName: a.Name(),
            Duration:   time.Since(startTime),
        }
    }
}
func (a MyAction) OptimisticUpdate(s *state.State) *state.State {
    newState := *s
    // Update state optimistically
    return &newState
}
func (a MyAction) OnSuccess(s *state.State, result interface{}) *state.State {
    return s // No changes needed
}
func (a MyAction) OnError(s *state.State, err error) *state.State {
    return s // No rollback needed
}
func (a MyAction) GetRefreshStrategy() state.RefreshStrategy {
    return state.RefreshImmediate
}

// internal/tui/app.go
case "m":
    ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)
    action := actions.NewMyAction("data")
    return m, m.actionExecutor.ExecuteAction(action, ctx)
```

### Adding a New Panel

1. Add `PanelType` constant in `internal/tui/state/state.go`
2. Add task list in `State` struct
3. Add render method in `internal/tui/app.go`
4. Update layout in `View()` method
5. Add keyboard navigation

### Adding a New API Endpoint

1. Add method to `JiraClient` or `TempoClient` in `internal/api/`
2. Handle auth in `setAuth()` method
3. Return typed struct from `internal/model/`
4. Add error handling with context

Example:

```go
// internal/api/jira.go
func (c *JiraClient) FetchCustomData(id string) (*model.CustomData, error) {
    endpoint := fmt.Sprintf("%s/rest/api/3/custom/%s", c.baseURL, id)

    req, err := http.NewRequest("GET", endpoint, nil)
    if err != nil {
        return nil, err
    }

    c.setAuth(req)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("failed to fetch custom data: %s - %s", resp.Status, string(body))
    }

    var data model.CustomData
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        return nil, err
    }

    return &data, nil
}
```

---

## CI/CD

GitHub Actions workflows:
- `.github/workflows/build.yml` - Build and test on push/PR
  - Builds for all platforms
  - Runs binary verification
  - Tests npm package
  - Uploads artifacts

Build matrix:
- Go 1.21 (CI)
- Go 1.24+ (local dev)

---

## Troubleshooting

### "Failed to load configuration"

Check:
1. Config file exists at `~/.jira-daily-report.json`
2. File has correct JSON syntax
3. File permissions allow read
4. Environment variables are set correctly

### "Authentication failed"

Check:
1. OAuth credentials are stored in keyring (`jira-report auth status`)
2. API tokens are valid and not expired
3. Jira server URL is correct
4. Network connectivity to Jira

### "No tasks found"

Check:
1. Username/account ID is correct
2. JQL queries in API client are appropriate
3. User has permissions to view tasks
4. Tasks exist in expected statuses

### Binary not found after build

Check:
1. `bin/` directory exists
2. Build command completed without errors
3. Binary name matches what you're trying to run
4. Binary has execute permissions (`chmod +x bin/jira-report`)

---

## Performance Notes

- Startup: ~50ms (10x faster than TypeScript version)
- Navigation: <10ms response time
- Memory: ~20MB (5x less than TypeScript)
- Progressive loading provides fast initial UI even with slow APIs
- Parallel API calls reduce total fetch time
- Optimized builds strip ~40% of binary size

---

## License

Same as main project (see LICENSE file)
