package refresh

import (
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/tui/actions"
)

// Poller manages the polling lifecycle for action verification
type Poller struct {
	config    Config
	action    actions.Action
	attempt   int
	startTime time.Time
}

// NewPoller creates a new poller for the given action
func NewPoller(action actions.Action, config Config) *Poller {
	return &Poller{
		config:    config,
		action:    action,
		attempt:   0,
		startTime: time.Now(),
	}
}

// GetAction returns the action being polled
func (p *Poller) GetAction() actions.Action {
	return p.action
}

// GetAttempt returns the current attempt number
func (p *Poller) GetAttempt() int {
	return p.attempt
}

// NextPoll returns a Cmd that sends RefreshPollingMsg after the appropriate delay
// This increments the attempt counter and schedules the next poll
func (p *Poller) NextPoll() tea.Cmd {
	p.attempt++
	delay := p.config.GetDelay(p.attempt)

	return func() tea.Msg {
		// Wait for the calculated delay
		time.Sleep(delay)

		return RefreshPollingMsg{
			ActionName: p.action.Name(),
			Attempt:    p.attempt,
			Poller:     p,
		}
	}
}

// ShouldContinue returns true if more polling attempts should be made
func (p *Poller) ShouldContinue() bool {
	return p.attempt < p.config.MaxAttempts
}

// GetElapsedTime returns time elapsed since polling started
func (p *Poller) GetElapsedTime() time.Duration {
	return time.Since(p.startTime)
}

// Message types for polling lifecycle

// RefreshPollingMsg is sent to trigger the next verification attempt
type RefreshPollingMsg struct {
	ActionName string
	Attempt    int
	Poller     *Poller
}

// RefreshVerifiedMsg is sent when the action's changes are confirmed in Jira
type RefreshVerifiedMsg struct {
	ActionName string
	Success    bool
	Data       interface{}
}

// RefreshTimeoutMsg is sent when max polling attempts are reached without verification
type RefreshTimeoutMsg struct {
	ActionName string
	Attempts   int
}
