package actions

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// LogTimeAction logs work time to a Jira ticket via Tempo
type LogTimeAction struct {
	taskKey     string
	taskID      string
	timeValue   string
	timeSeconds int
	description string
	date        string
	accountID   string
}

// NewLogTimeAction creates a new LogTimeAction
func NewLogTimeAction(timeValue, description, date string) *LogTimeAction {
	return &LogTimeAction{
		timeValue:   timeValue,
		description: description,
		date:        date,
	}
}

// Name returns the action name
func (a *LogTimeAction) Name() string {
	return "Log Time"
}

// Validate checks if the action can be executed
func (a *LogTimeAction) Validate(ctx ActionContext) error {
	if !ctx.HasSelectedTask() {
		return errors.New("no task selected")
	}

	a.taskKey = ctx.TaskKey()
	a.taskID = ctx.TaskID()
	a.accountID = ctx.UserAccountID

	// Validate time format
	seconds, err := parseTimeString(a.timeValue)
	if err != nil {
		return fmt.Errorf("invalid time format: %w", err)
	}
	a.timeSeconds = seconds

	// Validate date
	parsedDate, err := parseDate(a.date)
	if err != nil {
		return fmt.Errorf("invalid date: %w", err)
	}
	a.date = parsedDate

	// Validate account ID
	if a.accountID == "" {
		return errors.New("user account ID not available")
	}

	return nil
}

// Execute logs the time via Tempo APIgo
func (a *LogTimeAction) Execute(ctx ActionContext) tea.Cmd {
	return func() tea.Msg {
		// Convert task ID to int
		issueID, err := strconv.Atoi(a.taskID)
		if err != nil {
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("invalid issue ID: %w", err),
				Retryable:  false,
			}
		}

		// Call Tempo API
		worklog, err := ctx.TempoClient.CreateWorklog(
			issueID,
			a.timeSeconds,
			a.date,
			a.description,
			a.accountID,
		)
		if err != nil {
			return ActionFailedMsg{
				ActionName: a.Name(),
				Error:      fmt.Errorf("failed to log time: %w", err),
				Retryable:  true,
			}
		}

		return ActionCompletedMsg{
			ActionName: a.Name(),
			Action:     a,
			Result: map[string]interface{}{
				"worklog": worklog,
				"taskKey": a.taskKey,
				"time":    a.timeValue,
				"message": fmt.Sprintf("Logged %s to %s", a.timeValue, a.taskKey),
			},
		}
	}
}

// OptimisticUpdate adds the worklog to state immediately
func (a *LogTimeAction) OptimisticUpdate(s *state.State) *state.State {
	// TODO: Implement optimistic updates
	// For now, just set a loading message
	s.StatusMessage = fmt.Sprintf("Logging %s to %s...", a.timeValue, a.taskKey)
	return s
}

// OnSuccess replaces optimistic worklog with real one
func (a *LogTimeAction) OnSuccess(s *state.State, result interface{}) *state.State {
	// Clear snapshot since action succeeded
	s.StateSnapshot = nil

	// Extract result data
	if resultMap, ok := result.(map[string]interface{}); ok {
		if msg, ok := resultMap["message"].(string); ok {
			s.StatusMessage = msg
		}

		// TODO: Replace optimistic worklog with real one from API
		// This requires worklog ID matching which may need enhancement
	}

	s.CurrentAction = nil
	return s
}

// OnError handles failure
func (a *LogTimeAction) OnError(s *state.State, err error) *state.State {
	s.StatusMessage = fmt.Sprintf("Failed to log time: %v", err)
	s.CurrentAction = nil
	return s
}

// GetRefreshStrategy returns the refresh strategy for this action
func (a *LogTimeAction) GetRefreshStrategy() state.RefreshStrategy {
	return state.RefreshPolling
}

// Helper functions

// parseTimeString parses time strings like "2h", "1.5h", "30m", "2h30m"
func parseTimeString(s string) (int, error) {
	s = strings.TrimSpace(s)

	// Match patterns like "2h", "1.5h", "30m", "2h30m"
	re := regexp.MustCompile(`(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?`)
	matches := re.FindStringSubmatch(s)

	if len(matches) == 0 {
		return 0, fmt.Errorf("invalid time format")
	}

	var totalSeconds int

	// Hours
	if matches[1] != "" {
		hours, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("invalid hours: %w", err)
		}
		totalSeconds += int(hours * 3600)
	}

	// Minutes
	if matches[2] != "" {
		minutes, err := strconv.Atoi(matches[2])
		if err != nil {
			return 0, fmt.Errorf("invalid minutes: %w", err)
		}
		totalSeconds += minutes * 60
	}

	if totalSeconds == 0 {
		return 0, fmt.Errorf("invalid time format")
	}

	return totalSeconds, nil
}

// parseDate parses date strings like "today", "yesterday", or "YYYY-MM-DD"
func parseDate(s string) (string, error) {
	s = strings.ToLower(strings.TrimSpace(s))

	switch s {
	case "today", "":
		return time.Now().Format("2006-01-02"), nil
	case "yesterday":
		return time.Now().AddDate(0, 0, -1).Format("2006-01-02"), nil
	default:
		// Try parsing as YYYY-MM-DD
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return "", fmt.Errorf("invalid date format (use: today, yesterday, or YYYY-MM-DD)")
		}
		return t.Format("2006-01-02"), nil
	}
}
