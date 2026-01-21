package actions

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// Action represents a user action that can be executed in the TUI
// All actions follow the same lifecycle: Validate → Execute → OptimisticUpdate → OnSuccess/OnError
type Action interface {
	// Name returns a human-readable name for this action (for logging and display)
	Name() string

	// Validate checks if the action can be executed given the current context
	// Returns an error if validation fails
	Validate(ctx ActionContext) error

	// Execute performs the actual action (usually an API call)
	// Returns a tea.Cmd that will send a message when complete
	Execute(ctx ActionContext) tea.Cmd

	// OptimisticUpdate updates the UI state immediately before the API call completes
	// This provides instant feedback to the user
	// Returns a new state (should not mutate the original)
	OptimisticUpdate(s *state.State) *state.State

	// OnSuccess is called when the action completes successfully
	// Updates the state with actual data from the API response
	OnSuccess(s *state.State, result interface{}) *state.State

	// OnError is called when the action fails
	// Should rollback any optimistic updates and show error messages
	OnError(s *state.State, err error) *state.State

	// GetRefreshStrategy returns the strategy for refreshing data after action
	GetRefreshStrategy() state.RefreshStrategy
}
