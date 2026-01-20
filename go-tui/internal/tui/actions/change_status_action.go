package actions

import (
	"errors"
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// ChangeStatusAction changes the status of a Jira ticket
type ChangeStatusAction struct {
	taskKey       string
	currentStatus string
	targetStatus  string
	transitionID  string
	sourcePanel   state.PanelType
	targetPanel   state.PanelType
	originalTask  *model.Issue
}

// NewChangeStatusAction creates a new ChangeStatusAction
func NewChangeStatusAction(targetStatus string, transitionID string) *ChangeStatusAction {
	return &ChangeStatusAction{
		targetStatus: targetStatus,
		transitionID: transitionID,
	}
}

// Name returns the action name
func (a *ChangeStatusAction) Name() string {
	return "Change Status"
}

// Validate checks if the action can be executed
func (a *ChangeStatusAction) Validate(ctx ActionContext) error {
	if !ctx.HasSelectedTask() {
		return errors.New("no task selected")
	}

	a.taskKey = ctx.TaskKey()
	a.currentStatus = ctx.SelectedTask.Fields.Status.Name
	a.sourcePanel = ctx.ActivePanel

	// Store original task for rollback
	taskCopy := *ctx.SelectedTask
	a.originalTask = &taskCopy

	// Determine target panel based on status
	a.targetPanel = a.determineTargetPanel(a.targetStatus)

	// Validate transition ID is provided
	if a.transitionID == "" {
		return errors.New("transition ID is required")
	}

	return nil
}

// Execute calls the Jira API to change status
func (a *ChangeStatusAction) Execute(ctx ActionContext) tea.Cmd {
	return func() tea.Msg {
		// Call Jira API to perform transition
		err := ctx.JiraClient.TransitionIssue(a.taskKey, a.transitionID)
		if err != nil {
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("failed to change status: %w", err),
				Retryable:  true,
			}
		}

		return ActionCompletedMsg{
			ActionName: a.Name(),
			Action:     a,
			Result: map[string]interface{}{
				"taskKey":      a.taskKey,
				"targetStatus": a.targetStatus,
				"message":      fmt.Sprintf("Changed %s to '%s'", a.taskKey, a.targetStatus),
			},
		}
	}
}

// OptimisticUpdate moves the task to the target panel immediately
func (a *ChangeStatusAction) OptimisticUpdate(s *state.State) *state.State {
	// TODO: Implement optimistic updates
	// For now, just set a loading message
	s.StatusMessage = fmt.Sprintf("Changing status to %s...", a.targetStatus)
	return s
}

// OnSuccess confirms the status change
func (a *ChangeStatusAction) OnSuccess(s *state.State, result interface{}) *state.State {
	// Clear snapshot since action succeeded
	s.StateSnapshot = nil

	// Extract result data
	if resultMap, ok := result.(map[string]interface{}); ok {
		if msg, ok := resultMap["message"].(string); ok {
			s.StatusMessage = msg
		}
	}

	s.CurrentAction = nil
	return s
}

// OnError handles failure
func (a *ChangeStatusAction) OnError(s *state.State, err error) *state.State {
	s.StatusMessage = fmt.Sprintf("Failed to change status: %v", err)
	s.CurrentAction = nil
	return s
}

// GetRefreshStrategy returns the refresh strategy for this action
func (a *ChangeStatusAction) GetRefreshStrategy() state.RefreshStrategy {
	return state.RefreshPolling
}

// determineTargetPanel determines which panel a task should be in based on its status
func (a *ChangeStatusAction) determineTargetPanel(status string) state.PanelType {
	statusLower := strings.ToLower(status)

	// Map statuses to panels based on typical Jira workflows
	switch {
	case strings.Contains(statusLower, "open"),
		strings.Contains(statusLower, "to do"),
		strings.Contains(statusLower, "selected for development"):
		return state.PanelTodo

	case strings.Contains(statusLower, "in progress"),
		strings.Contains(statusLower, "development"):
		return state.PanelReport

	case strings.Contains(statusLower, "review"),
		strings.Contains(statusLower, "testing"),
		strings.Contains(statusLower, "qa"),
		strings.Contains(statusLower, "ready for"):
		return state.PanelProcessing

	default:
		// Keep in current panel if unknown status
		return a.sourcePanel
	}
}
