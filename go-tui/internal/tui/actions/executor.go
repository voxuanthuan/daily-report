package actions

import (
	"fmt"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// ActionExecutor manages the execution of actions, including queueing and history
type ActionExecutor struct {
	// queue is a buffered channel for pending actions
	queue chan ActionRequest

	// history stores recent action results (circular buffer)
	history      []state.ActionResult
	maxHistory   int
	historyIndex int

	// currentAction tracks the currently executing action
	currentAction *state.ActionState
}

// ActionRequest represents a request to execute an action
type ActionRequest struct {
	Action  Action
	Context ActionContext
}

// NewActionExecutor creates a new ActionExecutor
func NewActionExecutor() *ActionExecutor {
	return &ActionExecutor{
		queue:        make(chan ActionRequest, 10),   // Buffer up to 10 actions
		history:      make([]state.ActionResult, 50), // Store last 50 actions
		maxHistory:   50,
		historyIndex: 0,
	}
}

// ExecuteAction executes an action and returns a tea.Cmd
// This is the main entry point for all actions
func (e *ActionExecutor) ExecuteAction(action Action, ctx ActionContext) tea.Cmd {
	return func() tea.Msg {
		// Start tracking this action
		startTime := time.Now()

		// Validate the action
		if err := action.Validate(ctx); err != nil {
			return ActionFailedMsg{
				ActionName: action.Name(),
				Error:      fmt.Errorf("validation failed: %w", err),
				Retryable:  false,
			}
		}

		// Action validated, now execute
		return ActionStartedMsg{
			ActionName: action.Name(),
			Action:     action,
			StartTime:  startTime,
		}
	}
}

// RecordResult adds an action result to the history
func (e *ActionExecutor) RecordResult(result state.ActionResult) {
	e.history[e.historyIndex] = result
	e.historyIndex = (e.historyIndex + 1) % e.maxHistory
}

// GetHistory returns recent action results (most recent first)
func (e *ActionExecutor) GetHistory() []state.ActionResult {
	results := make([]state.ActionResult, 0, e.maxHistory)

	// Start from the most recent and go backwards
	for i := 0; i < e.maxHistory; i++ {
		idx := (e.historyIndex - 1 - i + e.maxHistory) % e.maxHistory
		result := e.history[idx]

		// Stop if we hit an empty slot (ActionName will be empty)
		if result.ActionName == "" {
			break
		}

		results = append(results, result)
	}

	return results
}

// ClearHistory clears all action history
func (e *ActionExecutor) ClearHistory() {
	e.history = make([]state.ActionResult, e.maxHistory)
	e.historyIndex = 0
}

// GetCurrentAction returns the currently executing action state, if any
func (e *ActionExecutor) GetCurrentAction() *state.ActionState {
	return e.currentAction
}

// SetCurrentAction sets the currently executing action state
func (e *ActionExecutor) SetCurrentAction(s *state.ActionState) {
	e.currentAction = s
}

// Message types for the action lifecycle

// ActionStartedMsg is sent when an action starts executing
type ActionStartedMsg struct {
	ActionName string
	Action     Action
	StartTime  time.Time
}

// ActionProgressMsg is sent to update progress during long-running actions
type ActionProgressMsg struct {
	ActionName string
	Progress   float64
	Message    string
}

// ActionCompletedMsg is sent when an action completes successfully
type ActionCompletedMsg struct {
	ActionName string
	Action     Action
	Result     interface{}
	Duration   time.Duration
}

// ActionFailedMsg is sent when an action fails
type ActionFailedMsg struct {
	ActionName string
	Error      error
	Retryable  bool
}

// ActionVerifyingMsg is sent when action enters verification mode
type ActionVerifyingMsg struct {
	ActionName string
	Attempt    int
}

// ActionRollbackMsg is sent when an optimistic update needs to be rolled back
type ActionRollbackMsg struct {
	ActionName string
	Reason     string
}
