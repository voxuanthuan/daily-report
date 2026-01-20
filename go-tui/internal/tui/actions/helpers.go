package actions

import (
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// CloneState creates a deep copy of the state for safe optimistic updates
// This ensures we can rollback changes if an action fails
func CloneState(s *state.State) *state.State {
	if s == nil {
		return nil
	}

	newState := &state.State{
		// Copy primitive fields
		ActivePanel:          s.ActivePanel,
		TimeTrackingExpanded: s.TimeTrackingExpanded,
		LastTaskPanel:        s.LastTaskPanel,
		DetailsScrollOffset:  s.DetailsScrollOffset,
		Loading:              s.Loading,
		WorklogsLoading:      s.WorklogsLoading,
		StatusMessage:        s.StatusMessage,
		Error:                s.Error,
		RefreshStrategy:      s.RefreshStrategy,
		PollingActive:        s.PollingActive,
		LastRefreshTime:      s.LastRefreshTime,

		// Clone maps
		SelectedIndices: make(map[state.PanelType]int),

		// Clone slices (shallow copy of tasks/worklogs is sufficient for now)
		ReportTasks:     make([]model.Issue, len(s.ReportTasks)),
		TodoTasks:       make([]model.Issue, len(s.TodoTasks)),
		ProcessingTasks: make([]model.Issue, len(s.ProcessingTasks)),
		YesterdayTasks:  make([]model.Issue, len(s.YesterdayTasks)),
		Worklogs:        make([]model.Worklog, len(s.Worklogs)),
		DateGroups:      make([]model.DateGroup, len(s.DateGroups)),
		ActionHistory:   make([]state.ActionResult, len(s.ActionHistory)),
	}

	// Copy map contents
	for k, v := range s.SelectedIndices {
		newState.SelectedIndices[k] = v
	}

	// Copy slice contents
	copy(newState.ReportTasks, s.ReportTasks)
	copy(newState.TodoTasks, s.TodoTasks)
	copy(newState.ProcessingTasks, s.ProcessingTasks)
	copy(newState.YesterdayTasks, s.YesterdayTasks)
	copy(newState.Worklogs, s.Worklogs)
	copy(newState.DateGroups, s.DateGroups)
	copy(newState.ActionHistory, s.ActionHistory)

	// Copy pointer fields (reference, not deep copy)
	newState.User = s.User
	newState.SelectedTask = s.SelectedTask
	newState.CurrentAction = s.CurrentAction

	return newState
}

// UpdateTaskInState finds and updates a task across all panels
// The updateFn is called with a pointer to the task allowing modifications
func UpdateTaskInState(s *state.State, taskKey string, updateFn func(*model.Issue)) bool {
	// Search in Report tasks
	for i := range s.ReportTasks {
		if s.ReportTasks[i].Key == taskKey {
			updateFn(&s.ReportTasks[i])
			return true
		}
	}

	// Search in Todo tasks
	for i := range s.TodoTasks {
		if s.TodoTasks[i].Key == taskKey {
			updateFn(&s.TodoTasks[i])
			return true
		}
	}

	// Search in Processing tasks
	for i := range s.ProcessingTasks {
		if s.ProcessingTasks[i].Key == taskKey {
			updateFn(&s.ProcessingTasks[i])
			return true
		}
	}

	// Task not found
	return false
}

// FindTaskInState searches for a task across all panels and returns a pointer to it
func FindTaskInState(s *state.State, taskKey string) *model.Issue {
	// Search in Report tasks
	for i := range s.ReportTasks {
		if s.ReportTasks[i].Key == taskKey {
			return &s.ReportTasks[i]
		}
	}

	// Search in Todo tasks
	for i := range s.TodoTasks {
		if s.TodoTasks[i].Key == taskKey {
			return &s.TodoTasks[i]
		}
	}

	// Search in Processing tasks
	for i := range s.ProcessingTasks {
		if s.ProcessingTasks[i].Key == taskKey {
			return &s.ProcessingTasks[i]
		}
	}

	return nil
}

// RemoveTaskFromState removes a task from the specified panel
func RemoveTaskFromState(s *state.State, taskKey string, fromPanel state.PanelType) bool {
	switch fromPanel {
	case state.PanelReport:
		for i, task := range s.ReportTasks {
			if task.Key == taskKey {
				s.ReportTasks = append(s.ReportTasks[:i], s.ReportTasks[i+1:]...)
				return true
			}
		}

	case state.PanelTodo:
		for i, task := range s.TodoTasks {
			if task.Key == taskKey {
				s.TodoTasks = append(s.TodoTasks[:i], s.TodoTasks[i+1:]...)
				return true
			}
		}

	case state.PanelProcessing:
		for i, task := range s.ProcessingTasks {
			if task.Key == taskKey {
				s.ProcessingTasks = append(s.ProcessingTasks[:i], s.ProcessingTasks[i+1:]...)
				return true
			}
		}
	}

	return false
}

// AddTaskToState adds a task to the specified panel
func AddTaskToState(s *state.State, task model.Issue, toPanel state.PanelType) {
	switch toPanel {
	case state.PanelReport:
		s.ReportTasks = append(s.ReportTasks, task)

	case state.PanelTodo:
		s.TodoTasks = append(s.TodoTasks, task)

	case state.PanelProcessing:
		s.ProcessingTasks = append(s.ProcessingTasks, task)
	}
}

// MoveTaskBetweenPanels moves a task from one panel to another
// This is commonly used for status change optimistic updates
func MoveTaskBetweenPanels(s *state.State, taskKey string, fromPanel, toPanel state.PanelType) bool {
	// Find the task
	task := FindTaskInState(s, taskKey)
	if task == nil {
		return false
	}

	// Make a copy before removing
	taskCopy := *task

	// Remove from source panel
	if !RemoveTaskFromState(s, taskKey, fromPanel) {
		return false
	}

	// Add to target panel
	AddTaskToState(s, taskCopy, toPanel)

	return true
}

// SaveStateSnapshot creates a snapshot of the current state for potential rollback
func SaveStateSnapshot(s *state.State) *state.State {
	return CloneState(s)
}

// RestoreFromSnapshot restores state from a previously saved snapshot
// This is used to rollback optimistic updates when actions fail
func RestoreFromSnapshot(s *state.State, snapshot *state.State) {
	if snapshot == nil {
		return
	}

	// Restore task lists
	s.ReportTasks = make([]model.Issue, len(snapshot.ReportTasks))
	copy(s.ReportTasks, snapshot.ReportTasks)

	s.TodoTasks = make([]model.Issue, len(snapshot.TodoTasks))
	copy(s.TodoTasks, snapshot.TodoTasks)

	s.ProcessingTasks = make([]model.Issue, len(snapshot.ProcessingTasks))
	copy(s.ProcessingTasks, snapshot.ProcessingTasks)

	s.Worklogs = make([]model.Worklog, len(snapshot.Worklogs))
	copy(s.Worklogs, snapshot.Worklogs)

	s.DateGroups = make([]model.DateGroup, len(snapshot.DateGroups))
	copy(s.DateGroups, snapshot.DateGroups)

	// Restore other state that might have changed
	s.StatusMessage = snapshot.StatusMessage
	s.SelectedIndices = make(map[state.PanelType]int)
	for k, v := range snapshot.SelectedIndices {
		s.SelectedIndices[k] = v
	}
}

// AddWorklogToState adds a worklog to the state (for optimistic updates)
func AddWorklogToState(s *state.State, worklog model.Worklog) {
	// Add to worklogs list
	s.Worklogs = append([]model.Worklog{worklog}, s.Worklogs...)

	// TODO: Update DateGroups if needed
	// This would require re-grouping worklogs by date
}

// RemoveWorklogFromState removes a worklog from the state (for rollback)
func RemoveWorklogFromState(s *state.State, worklogID string) bool {
	for i, worklog := range s.Worklogs {
		// Note: Worklog struct might not have ID field yet
		// This is a placeholder for future implementation
		_ = worklog
		_ = i
		// if worklog.ID == worklogID {
		//     s.Worklogs = append(s.Worklogs[:i], s.Worklogs[i+1:]...)
		//     return true
		// }
	}
	return false
}
