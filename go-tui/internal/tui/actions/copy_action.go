package actions

import (
	"errors"
	"fmt"

	"github.com/atotto/clipboard"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// CopyFormat defines the format to copy
type CopyFormat int

const (
	CopyFormatKey       CopyFormat = iota // Just the ticket key (e.g., "PROJ-123")
	CopyFormatURL                         // Full URL
	CopyFormatFormatted                   // Formatted text (e.g., "[PROJ-123] Title")
	CopyFormatMarkdown                    // Markdown link
)

// CopyAction copies task information to clipboard
type CopyAction struct {
	format  CopyFormat
	taskKey string
	content string
}

// NewCopyAction creates a new CopyAction with the specified format
func NewCopyAction(format CopyFormat) *CopyAction {
	return &CopyAction{
		format: format,
	}
}

// NewCopyKeyAction creates a CopyAction that copies just the key
func NewCopyKeyAction() *CopyAction {
	return NewCopyAction(CopyFormatKey)
}

// Name returns the action name
func (a *CopyAction) Name() string {
	switch a.format {
	case CopyFormatKey:
		return "Copy Key"
	case CopyFormatURL:
		return "Copy URL"
	case CopyFormatFormatted:
		return "Copy Formatted"
	case CopyFormatMarkdown:
		return "Copy Markdown"
	default:
		return "Copy"
	}
}

// Validate checks if the action can be executed
func (a *CopyAction) Validate(ctx ActionContext) error {
	if !ctx.HasSelectedTask() {
		return errors.New("no task selected")
	}

	a.taskKey = ctx.TaskKey()

	// Prepare content based on format
	switch a.format {
	case CopyFormatKey:
		a.content = a.taskKey

	case CopyFormatURL:
		a.content = fmt.Sprintf("%s/browse/%s", ctx.Config.GetJiraServer(), a.taskKey)

	case CopyFormatFormatted:
		summary := ctx.SelectedTask.Fields.Summary
		a.content = fmt.Sprintf("[%s] %s", a.taskKey, summary)

	case CopyFormatMarkdown:
		url := fmt.Sprintf("%s/browse/%s", ctx.Config.GetJiraServer(), a.taskKey)
		summary := ctx.SelectedTask.Fields.Summary
		a.content = fmt.Sprintf("[%s](%s) - %s", a.taskKey, url, summary)

	default:
		a.content = a.taskKey
	}

	return nil
}

// Execute copies the content to clipboard
func (a *CopyAction) Execute(ctx ActionContext) tea.Cmd {
	return func() tea.Msg {
		if err := clipboard.WriteAll(a.content); err != nil {
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("failed to copy to clipboard: %w", err),
				Retryable:  false,
			}
		}

		return ActionCompletedMsg{
			ActionName: a.Name(),
			Action:     a,
			Result:     a.getSuccessMessage(),
		}
	}
}

// getSuccessMessage returns a format-specific success message
func (a *CopyAction) getSuccessMessage() string {
	switch a.format {
	case CopyFormatKey:
		return fmt.Sprintf("Copied %s to clipboard", a.taskKey)
	case CopyFormatURL:
		return fmt.Sprintf("Copied URL for %s to clipboard", a.taskKey)
	case CopyFormatFormatted:
		return fmt.Sprintf("Copied formatted text for %s to clipboard", a.taskKey)
	case CopyFormatMarkdown:
		return fmt.Sprintf("Copied markdown link for %s to clipboard", a.taskKey)
	default:
		return fmt.Sprintf("Copied %s to clipboard", a.taskKey)
	}
}

// OptimisticUpdate does nothing for this action (no state changes)
func (a *CopyAction) OptimisticUpdate(s *state.State) *state.State {
	// No state changes needed - clipboard is external
	return s
}

// OnSuccess updates the status message
func (a *CopyAction) OnSuccess(s *state.State, result interface{}) *state.State {
	if msg, ok := result.(string); ok {
		s.StatusMessage = msg
	} else {
		s.StatusMessage = a.getSuccessMessage()
	}
	s.CurrentAction = nil
	return s
}

// OnError shows the error message
func (a *CopyAction) OnError(s *state.State, err error) *state.State {
	s.StatusMessage = fmt.Sprintf("Failed to copy: %v", err)
	s.CurrentAction = nil
	return s
}

// GetRefreshStrategy returns the refresh strategy for this action
func (a *CopyAction) GetRefreshStrategy() state.RefreshStrategy {
	return state.RefreshImmediate
}
