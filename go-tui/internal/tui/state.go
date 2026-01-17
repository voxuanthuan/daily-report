package tui

import (
	"github.com/yourusername/jira-daily-report/internal/model"
)

// PanelType represents different panel types
type PanelType int

const (
	PanelReport     PanelType = 0 // [1] Report (Today + Yesterday)
	PanelTodo       PanelType = 1 // [2] Todo (Open tasks)
	PanelProcessing PanelType = 2 // [3] Processing (Under Review + Testing)
	PanelTimelog    PanelType = 3 // [0] Time Tracking
	PanelDetails    PanelType = 4 // Details (no number)
)

// State holds the application state
type State struct {
	User                 *model.User
	ReportTasks          []model.Issue // In Progress + Yesterday tasks
	TodoTasks            []model.Issue // Open tasks
	ProcessingTasks      []model.Issue // Under Review + Ready for Testing
	YesterdayTasks       []model.Issue // Yesterday's tasks
	Worklogs             []model.Worklog
	DateGroups           []model.DateGroup
	ActivePanel          PanelType
	SelectedIndices      map[PanelType]int
	SelectedTask         *model.Issue // Currently selected task for details
	TimeTrackingExpanded bool         // Whether time tracking panel is expanded
	Loading              bool         // Main loading state (blocks UI)
	WorklogsLoading      bool         // Background worklog loading (doesn't block UI)
	StatusMessage        string
	Error                error
}

// NewState creates a new application state
func NewState() *State {
	return &State{
		ReportTasks:          []model.Issue{},
		TodoTasks:            []model.Issue{},
		ProcessingTasks:      []model.Issue{},
		YesterdayTasks:       []model.Issue{},
		Worklogs:             []model.Worklog{},
		DateGroups:           []model.DateGroup{},
		ActivePanel:          PanelReport,
		SelectedIndices:      make(map[PanelType]int),
		TimeTrackingExpanded: false,
		Loading:              true, // Start with loading true
		WorklogsLoading:      false,
		StatusMessage:        "Loading tasks...",
	}
}

// GetSelectedIndex returns the selected index for the active panel
func (s *State) GetSelectedIndex() int {
	return s.SelectedIndices[s.ActivePanel]
}

// SetSelectedIndex sets the selected index for the active panel
func (s *State) SetSelectedIndex(index int) {
	s.SelectedIndices[s.ActivePanel] = index
}

// GetCurrentTasks returns tasks for the active panel
func (s *State) GetCurrentTasks() []model.Issue {
	switch s.ActivePanel {
	case PanelReport:
		return s.ReportTasks
	case PanelTodo:
		return s.TodoTasks
	case PanelProcessing:
		return s.ProcessingTasks
	default:
		return []model.Issue{}
	}
}

// MoveSelectionUp moves selection up
func (s *State) MoveSelectionUp() {
	if s.ActivePanel == PanelTimelog {
		if s.SelectedIndices[s.ActivePanel] > 0 {
			s.SelectedIndices[s.ActivePanel]--
		}
	} else {
		tasks := s.GetCurrentTasks()
		if len(tasks) > 0 && s.SelectedIndices[s.ActivePanel] > 0 {
			s.SelectedIndices[s.ActivePanel]--
		}
	}
}

// MoveSelectionDown moves selection down
func (s *State) MoveSelectionDown() {
	if s.ActivePanel == PanelTimelog {
		if s.SelectedIndices[s.ActivePanel] < len(s.DateGroups)-1 {
			s.SelectedIndices[s.ActivePanel]++
		}
	} else {
		tasks := s.GetCurrentTasks()
		if len(tasks) > 0 && s.SelectedIndices[s.ActivePanel] < len(tasks)-1 {
			s.SelectedIndices[s.ActivePanel]++
		}
	}
}
