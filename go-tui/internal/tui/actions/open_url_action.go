package actions

import (
	"errors"
	"fmt"
	"os/exec"
	"runtime"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// OpenURLAction opens a Jira ticket in the default browser
type OpenURLAction struct {
	taskKey string
	url     string
}

// NewOpenURLAction creates a new OpenURLAction
func NewOpenURLAction() *OpenURLAction {
	return &OpenURLAction{}
}

// Name returns the action name
func (a *OpenURLAction) Name() string {
	return "Open URL"
}

// Validate checks if the action can be executed
func (a *OpenURLAction) Validate(ctx ActionContext) error {
	if !ctx.HasSelectedTask() {
		return errors.New("no task selected")
	}

	a.taskKey = ctx.TaskKey()
	a.url = fmt.Sprintf("%s/browse/%s", ctx.Config.GetJiraServer(), a.taskKey)

	return nil
}

// Execute opens the URL in the default browser
func (a *OpenURLAction) Execute(ctx ActionContext) tea.Cmd {
	return func() tea.Msg {
		var cmd *exec.Cmd

		switch runtime.GOOS {
		case "darwin":
			cmd = exec.Command("open", a.url)
		case "linux":
			cmd = exec.Command("xdg-open", a.url)
		case "windows":
			cmd = exec.Command("cmd", "/c", "start", a.url)
		default:
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("unsupported platform: %s", runtime.GOOS),
				Retryable:  false,
			}
		}

		if err := cmd.Start(); err != nil {
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("failed to open browser: %w", err),
				Retryable:  true,
			}
		}

		return ActionCompletedMsg{
			ActionName: a.Name(),
			Action:     a,
			Result:     fmt.Sprintf("Opened %s in browser", a.taskKey),
		}
	}
}

// OptimisticUpdate does nothing for this action (no state changes)
func (a *OpenURLAction) OptimisticUpdate(s *state.State) *state.State {
	// No state changes needed - this is an external action
	return s
}

// OnSuccess updates the status message
func (a *OpenURLAction) OnSuccess(s *state.State, result interface{}) *state.State {
	if msg, ok := result.(string); ok {
		s.StatusMessage = msg
	} else {
		s.StatusMessage = fmt.Sprintf("Opened %s in browser", a.taskKey)
	}
	s.CurrentAction = nil
	return s
}

// OnError shows the error message
func (a *OpenURLAction) OnError(s *state.State, err error) *state.State {
	s.StatusMessage = fmt.Sprintf("Failed to open URL: %v", err)
	s.CurrentAction = nil
	return s
}

// GetRefreshStrategy returns the refresh strategy for this action
func (a *OpenURLAction) GetRefreshStrategy() state.RefreshStrategy {
	return state.RefreshImmediate
}
