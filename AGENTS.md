# AGENTS.md

Go-based Jira TUI application using Bubble Tea (TUI) + Cobra (CLI). Module: `github.com/yourusername/jira-daily-report`. Requires Go 1.24+.

## Commands

### Build
```bash
go build -o bin/jira-report ./cmd/jira-report                          # Debug build
go build -ldflags="-s -w" -o bin/jira-report ./cmd/jira-report         # Optimized
./build.sh                                                             # Build script
```

All build commands run from `go-tui/` directory.

### Test
```bash
go test ./...                                          # All tests
go test -v ./...                                       # Verbose
go test ./internal/api                                 # Single package
go test -v -run TestPKCEGeneration ./internal/oauth    # Single test
go test -cover ./...                                   # With coverage
go test -race ./...                                    # Race detection
```

### Format & Lint
```bash
go fmt ./...
golangci-lint run
go vet ./...
go mod tidy
```

### Run
```bash
./bin/jira-report tui              # Launch TUI
./bin/jira-report config init      # Interactive setup
./bin/jira-report auth login       # OAuth login
```

## Directory Structure

```
go-tui/
├── cmd/jira-report/          # CLI entry points (main.go, auth.go, generate.go, logtime.go)
├── internal/
│   ├── api/                  # Jira and Tempo API clients
│   ├── oauth/                # OAuth 2.0 with PKCE
│   ├── config/               # Config loading (~/.jira-daily-report.json + env vars)
│   ├── model/                # Data types (Issue, Worklog, User, DateGroup)
│   ├── report/               # Daily report generation
│   ├── jira/                 # Jira utilities (transitions)
│   └── tui/                  # Bubble Tea TUI
│       ├── app.go            # Main Model (Init/Update/View)
│       ├── actions/          # Action framework (interface + executor + actions)
│       ├── refresh/          # Data refresh strategies (polling, delayed, etc.)
│       ├── state/            # Centralized State struct
│       └── *_modal.go        # Modal dialogs
├── go.mod / go.sum
├── build.sh / build-all.sh   # Build scripts
```

## Code Style

### Imports
Three groups separated by blank lines: stdlib, third-party, internal:
```go
import (
    "fmt"
    "time"

    tea "github.com/charmbracelet/bubbletea"
    "github.com/stretchr/testify/assert"

    "github.com/yourusername/jira-daily-report/internal/model"
    "github.com/yourusername/jira-daily-report/internal/tui/state"
)
```

### Naming
- **Exported types/funcs**: `PascalCase` — `JiraClient`, `NewModel`, `FetchTasks`
- **Unexported funcs/vars**: `camelCase` — `setAuth`, `isDefaultDescription`
- **Constants**: `PascalCase` for typed consts (`PanelReport`), `camelCase` for untyped package-level (`tempoBaseURL`)
- **Interfaces**: `PascalCase` — `Action`, `Verifier`
- **Message types**: `PascalCase` — `tasksLoadedMsg`, `ActionCompletedMsg`
- **Files**: `snake_case.go`, tests: `*_test.go` in same package

### Types & Structs
- All exported structs have JSON tags: \`json:"fieldName"\`
- Use `omitempty` for optional fields
- Prefer small, focused structs in `internal/model/`

### Error Handling
Always wrap errors with context using `fmt.Errorf`:
```go
return nil, fmt.Errorf("failed to fetch user: %w", err)
return nil, fmt.Errorf("failed to fetch tasks: %s - %s", resp.Status, string(body))
```
Use `errors.New` for static messages, `fmt.Errorf` with `%w` for wrapping. Never return bare `err`.

### Comments
Doc comments on all exported types and functions:
```go
// JiraClient handles Jira API requests
type JiraClient struct { ... }

// FetchTasks retrieves tasks with a JQL query using POST
func (c *JiraClient) FetchTasks(jql string) ([]model.Issue, error) { ... }
```
No inline comments unless explaining non-obvious logic. Do not add comments unless asked.

### State Management
Prefer returning new state over mutating:
```go
func (a *LogTimeAction) OptimisticUpdate(s *state.State) *state.State {
    newState := *s
    newState.WorklogsLoading = true
    return &newState
}
```

### Testing
Table-driven tests preferred. Both `testing` and `testify` are used:
```go
func TestIsDefaultDescription(t *testing.T) {
    tests := []struct {
        name     string
        desc     string
        expected bool
    }{
        {"empty", "", true},
        {"custom", "did work", false},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := isDefaultDescription(tt.desc)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```
Tests live in the same package (not `*_test` package) to access unexported functions.

### TUI Pattern (Bubble Tea)
All components follow Model-Update-View:
```go
type Model struct { /* state */ }
func (m Model) Init() tea.Cmd                                { /* initial commands */ }
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd)      { /* handle messages */ }
func (m Model) View() string                                  { /* render as string */ }
```

### Action Framework
User interactions implement the `Action` interface (`internal/tui/actions/registry.go`):
```go
type Action interface {
    Name() string
    Validate(ctx ActionContext) error
    Execute(ctx ActionContext) tea.Cmd
    OptimisticUpdate(s *state.State) *state.State
    OnSuccess(s *state.State, result interface{}) *state.State
    OnError(s *state.State, err error) *state.State
    GetRefreshStrategy() state.RefreshStrategy
}
```
Wire actions in `app.go` Update handler via `ActionExecutor`.

## Key Gotchas

- **Auth**: OAuth preferred (token in keyring), Basic Auth fallback. Check both when debugging.
- **Jira index delay**: 1.5s delay after status changes before refresh; immediate refresh may show stale data.
- **Date format**: Jira returns `"2006-01-02T15:04:05.000-0700"` — always handle parse errors.
- **Config precedence**: Defaults → config file (`~/.jira-daily-report.json`) → env vars (env vars win).
- **Worklog descriptions**: Auto-generated `"working on issue XXXXX"` are filtered from reports.
- **Parallel API calls**: Tasks fetched via goroutines; add new queries to the parallel group.
- **Panel numbering**: Report=0, Todo=1, Processing=2, Timelog=3, Details=4 (Details shows context from last task panel).
- **HTTP clients**: Connection pooling with `MaxIdleConns: 100`, `MaxIdleConnsPerHost: 20`.
