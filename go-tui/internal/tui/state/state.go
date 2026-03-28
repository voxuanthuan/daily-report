package state

import (
	"strings"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// PanelType represents different panel types
type PanelType int

const (
	PanelReport     PanelType = 0 // [1] Report (Today + Yesterday)
	PanelTodo       PanelType = 1 // [2] Todo (Open tasks)
	PanelProcessing PanelType = 2 // [3] Processing (Under Review + Testing)
	PanelTimelog    PanelType = 3 // [4] Time Tracking
	PanelDetails    PanelType = 4 // [0] Details
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
	LastTaskPanel        PanelType    // Last task panel viewed (for Details panel)
	DetailsScrollOffset  int          // Scroll position in Details panel
	DetailsScrollMax     int          // Maximum scroll offset (calculated from content)
	DetailsContentLines  []string     // Cached content lines for scrolling
	Loading              bool         // Main loading state (blocks UI)
	WorklogsLoading      bool         // Background worklog loading (doesn't block UI)
	WorklogsLoadProgress float64      // Worklog loading progress (0.0 - 1.0)
	WorklogsLoadStep     string       // Current loading step description
	StatusMessage        string
	Error                error

	// Action tracking fields (new in action framework)
	CurrentAction   *ActionState    // Currently executing action, if any
	ActionHistory   []ActionResult  // Recent action results
	RefreshStrategy RefreshStrategy // Current refresh strategy
	PollingActive   bool            // Whether polling is currently active
	LastRefreshTime time.Time       // Last time data was refreshed
	StateSnapshot   *State          // Snapshot for rollback (optimistic updates)

	SearchActive            bool
	SearchQuery             string
	FilteredReportTasks     []model.Issue
	FilteredTodoTasks       []model.Issue
	FilteredProcessingTasks []model.Issue

	CachedDescKey  string
	CachedDescText []string
}

// ActionState tracks the current state of an executing action
type ActionState struct {
	Name      string
	State     ActionStateEnum
	StartTime time.Time
	Message   string
	Progress  float64
	TaskKey   string // Key of the task being acted upon
}

// ActionStateEnum represents the different states an action can be in
type ActionStateEnum int

const (
	ActionIdle       ActionStateEnum = iota // No action in progress
	ActionValidating                        // Checking if action can be executed
	ActionExecuting                         // API call in progress
	ActionVerifying                         // Polling to verify changes
	ActionSuccess                           // Action completed successfully
	ActionFailed                            // Action failed
	ActionRolledBack                        // Optimistic update was rolled back
)

// ActionResult stores the result of an executed action
type ActionResult struct {
	ActionName string
	Success    bool
	Error      error
	StartTime  time.Time
	EndTime    time.Time
	Duration   time.Duration
}

// RefreshStrategy determines how the UI should refresh after an action
type RefreshStrategy int

const (
	// RefreshImmediate - No waiting, no verification (e.g., copy to clipboard)
	RefreshImmediate RefreshStrategy = iota

	// RefreshPolling - Poll API until verified or timeout (e.g., status change)
	RefreshPolling

	// RefreshDelayed - Fixed delay then full refresh (e.g., bulk operations)
	RefreshDelayed

	// RefreshManual - User must manually trigger refresh
	RefreshManual
)

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
		StatusMessage:        "",
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

// GetCurrentTasks returns tasks for the active panel (filtered if search is active)
func (s *State) GetCurrentTasks() []model.Issue {
	if s.SearchQuery != "" {
		return s.GetFilteredCurrentTasks()
	}
	return s.GetTasks(s.ActivePanel)
}

// GetTasks returns the unfiltered task list for a panel
func (s *State) GetTasks(panel PanelType) []model.Issue {
	switch panel {
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

// ScrollDetailsUp scrolls the details panel up
func (s *State) ScrollDetailsUp() {
	if s.DetailsScrollOffset > 0 {
		s.DetailsScrollOffset--
	}
}

// ScrollDetailsDown scrolls the details panel down
func (s *State) ScrollDetailsDown(maxScroll int) {
	if s.DetailsScrollOffset < maxScroll {
		s.DetailsScrollOffset++
	}
}

// ResetDetailsScroll resets scroll when task changes
func (s *State) ResetDetailsScroll() {
	s.DetailsScrollOffset = 0
}

// ApplyFilter filters all task lists by the given query (case-insensitive match on key or summary)
func (s *State) ApplyFilter(query string) {
	s.SearchQuery = query
	if query == "" {
		s.FilteredReportTasks = s.ReportTasks
		s.FilteredTodoTasks = s.TodoTasks
		s.FilteredProcessingTasks = s.ProcessingTasks
		return
	}
	lowerQuery := strings.ToLower(query)
	s.FilteredReportTasks = filterIssues(s.ReportTasks, lowerQuery)
	s.FilteredTodoTasks = filterIssues(s.TodoTasks, lowerQuery)
	s.FilteredProcessingTasks = filterIssues(s.ProcessingTasks, lowerQuery)

	for _, panel := range []PanelType{PanelReport, PanelTodo, PanelProcessing} {
		tasks := s.GetFilteredTasks(panel)
		if len(tasks) > 0 && s.SelectedIndices[panel] >= len(tasks) {
			s.SelectedIndices[panel] = len(tasks) - 1
		}
	}
}

// ClearFilter resets all filtered lists and clears the search query
func (s *State) ClearFilter() {
	s.SearchActive = false
	s.SearchQuery = ""
	s.FilteredReportTasks = nil
	s.FilteredTodoTasks = nil
	s.FilteredProcessingTasks = nil
}

// ClearDescCache clears the cached description
func (s *State) ClearDescCache() {
	s.CachedDescKey = ""
	s.CachedDescText = nil
}

// GetFilteredTasks returns the filtered task list for the given panel
func (s *State) GetFilteredTasks(panel PanelType) []model.Issue {
	if s.SearchQuery == "" {
		return s.GetTasks(panel)
	}
	switch panel {
	case PanelReport:
		if s.FilteredReportTasks != nil {
			return s.FilteredReportTasks
		}
		return s.ReportTasks
	case PanelTodo:
		if s.FilteredTodoTasks != nil {
			return s.FilteredTodoTasks
		}
		return s.TodoTasks
	case PanelProcessing:
		if s.FilteredProcessingTasks != nil {
			return s.FilteredProcessingTasks
		}
		return s.ProcessingTasks
	default:
		return []model.Issue{}
	}
}

// GetFilteredCurrentTasks returns filtered tasks for the active panel
func (s *State) GetFilteredCurrentTasks() []model.Issue {
	return s.GetFilteredTasks(s.ActivePanel)
}

// filterIssues returns issues matching the lowercase query
func filterIssues(issues []model.Issue, lowerQuery string) []model.Issue {
	var result []model.Issue
	for _, issue := range issues {
		if strings.Contains(strings.ToLower(issue.Key), lowerQuery) ||
			strings.Contains(strings.ToLower(issue.Fields.Summary), lowerQuery) {
			result = append(result, issue)
		}
	}
	if result == nil {
		return []model.Issue{}
	}
	return result
}
