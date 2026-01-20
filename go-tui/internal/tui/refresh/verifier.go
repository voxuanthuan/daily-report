package refresh

import (
	"fmt"

	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/tui/actions"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// Verifier checks if an action's changes are reflected in Jira
type Verifier interface {
	Verify(action actions.Action, s *state.State, clients VerifierClients) (bool, error)
}

// VerifierClients provides API client access for verification
type VerifierClients struct {
	JiraClient  *api.JiraClient
	TempoClient *api.TempoClient
}

// NoOpVerifier always returns true without verification
// Used for immediate actions that don't modify server state (OpenURL, Copy)
type NoOpVerifier struct{}

// Verify always returns true for no-op verification
func (v *NoOpVerifier) Verify(action actions.Action, s *state.State, clients VerifierClients) (bool, error) {
	return true, nil
}

// StatusChangeVerifier verifies that a status change is reflected in Jira
type StatusChangeVerifier struct {
	TaskKey      string
	TargetStatus string
}

// Verify checks if the issue's status matches the target status
func (v *StatusChangeVerifier) Verify(action actions.Action, s *state.State, clients VerifierClients) (bool, error) {
	// Fetch the issue from Jira
	issue, err := clients.JiraClient.FetchIssue(v.TaskKey)
	if err != nil {
		return false, fmt.Errorf("failed to fetch issue: %w", err)
	}

	// Check if status matches
	return issue.Fields.Status.Name == v.TargetStatus, nil
}

// LogTimeVerifier verifies that a worklog entry exists in Jira
type LogTimeVerifier struct {
	TaskKey     string
	TimeSeconds int
	Date        string
	AccountID   string
}

// Verify checks if a matching worklog exists
func (v *LogTimeVerifier) Verify(action actions.Action, s *state.State, clients VerifierClients) (bool, error) {
	// Fetch recent worklogs for the user
	worklogs, err := clients.TempoClient.FetchLastSixDaysWorklogs(v.AccountID)
	if err != nil {
		return false, fmt.Errorf("failed to fetch worklogs: %w", err)
	}

	// Look for a matching worklog
	for _, wl := range worklogs {
		if wl.Issue.Key == v.TaskKey &&
			wl.TimeSpentSeconds == v.TimeSeconds &&
			wl.StartDate == v.Date {
			return true, nil
		}
	}

	return false, nil
}

// GetVerifier returns the appropriate verifier for an action based on its refresh strategy
func GetVerifier(action actions.Action) Verifier {
	strategy := action.GetRefreshStrategy()

	switch strategy {
	case state.RefreshImmediate, state.RefreshManual:
		// No verification needed for immediate or manual refresh
		return &NoOpVerifier{}

	case state.RefreshPolling:
		// Determine verifier type based on action name
		// This is a simplified approach - in production, actions could provide their own verifiers
		switch action.Name() {
		case "Change Status":
			// For status changes, we'd need to extract the target status from action data
			// For now, return NoOp as ChangeStatus isn't integrated yet
			return &NoOpVerifier{}

		case "Log Time":
			// For time logging, we'd need to extract worklog details
			// For now, return NoOp as LogTime isn't integrated yet
			return &NoOpVerifier{}

		default:
			return &NoOpVerifier{}
		}

	case state.RefreshDelayed:
		// Delayed refresh doesn't use polling verification
		return &NoOpVerifier{}

	default:
		return &NoOpVerifier{}
	}
}

// GetVerifierForStatusChange creates a verifier for status change actions
// This is a helper function for when ChangeStatusAction is integrated
func GetVerifierForStatusChange(taskKey, targetStatus string) Verifier {
	return &StatusChangeVerifier{
		TaskKey:      taskKey,
		TargetStatus: targetStatus,
	}
}

// GetVerifierForLogTime creates a verifier for log time actions
// This is a helper function for when LogTimeAction is integrated
func GetVerifierForLogTime(taskKey string, timeSeconds int, date, accountID string) Verifier {
	return &LogTimeVerifier{
		TaskKey:     taskKey,
		TimeSeconds: timeSeconds,
		Date:        date,
		AccountID:   accountID,
	}
}
