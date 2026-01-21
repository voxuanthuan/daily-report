package actions

import (
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// ActionContext provides all the context needed to execute an action
// This includes the selected task, current panel, API clients, and configuration
type ActionContext struct {
	// SelectedTask is the currently selected task in the active panel
	SelectedTask *model.Issue

	// ActivePanel is the currently active panel
	ActivePanel state.PanelType

	// AllTasks contains all tasks across all panels for reference
	AllTasks struct {
		Report     []model.Issue
		Todo       []model.Issue
		Processing []model.Issue
	}

	// User is the current logged-in user
	User *model.User

	// API clients for making requests
	JiraClient  *api.JiraClient
	TempoClient *api.TempoClient

	// Config provides access to user configuration
	Config *config.Manager

	// UserAccountID is the Jira account ID of the current user
	UserAccountID string

	// Additional data that might be passed from modals or other sources
	ExtraData map[string]interface{}
}

// NewActionContext creates a new ActionContext from the current TUI state
func NewActionContext(
	s *state.State,
	jiraClient *api.JiraClient,
	tempoClient *api.TempoClient,
	cfg *config.Manager,
) ActionContext {
	ctx := ActionContext{
		ActivePanel: s.ActivePanel,
		JiraClient:  jiraClient,
		TempoClient: tempoClient,
		Config:      cfg,
		User:        s.User,
		ExtraData:   make(map[string]interface{}),
	}

	// Set all tasks
	ctx.AllTasks.Report = s.ReportTasks
	ctx.AllTasks.Todo = s.TodoTasks
	ctx.AllTasks.Processing = s.ProcessingTasks

	// Set selected task based on active panel
	var tasks []model.Issue
	var idx int

	switch s.ActivePanel {
	case state.PanelReport:
		tasks = s.ReportTasks
		idx = s.SelectedIndices[state.PanelReport]
	case state.PanelTodo:
		tasks = s.TodoTasks
		idx = s.SelectedIndices[state.PanelTodo]
	case state.PanelProcessing:
		tasks = s.ProcessingTasks
		idx = s.SelectedIndices[state.PanelProcessing]
	}

	if len(tasks) > 0 && idx < len(tasks) {
		ctx.SelectedTask = &tasks[idx]
	}

	// Set user account ID if user is loaded
	if s.User != nil {
		ctx.UserAccountID = s.User.AccountID
	}

	return ctx
}

// HasSelectedTask returns true if a task is currently selected
func (ctx ActionContext) HasSelectedTask() bool {
	return ctx.SelectedTask != nil
}

// TaskKey returns the key of the selected task, or empty string if none
func (ctx ActionContext) TaskKey() string {
	if ctx.SelectedTask == nil {
		return ""
	}
	return ctx.SelectedTask.Key
}

// TaskID returns the ID of the selected task, or empty string if none
func (ctx ActionContext) TaskID() string {
	if ctx.SelectedTask == nil {
		return ""
	}
	return ctx.SelectedTask.ID
}
