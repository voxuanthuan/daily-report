package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// showLogTimeModal shows the log time modal for the selected task
func (m Model) showLogTimeModal() (Model, tea.Cmd) {
	// Get selected task from active panel
	var selectedTask *model.Issue
	var tasks []model.Issue
	var idx int

	switch m.state.ActivePanel {
	case PanelReport:
		tasks = m.state.ReportTasks
		idx = m.state.SelectedIndices[PanelReport]
	case PanelTodo:
		tasks = m.state.TodoTasks
		idx = m.state.SelectedIndices[PanelTodo]
	case PanelProcessing:
		tasks = m.state.ProcessingTasks
		idx = m.state.SelectedIndices[PanelProcessing]
	default:
		m.state.StatusMessage = "No task panel selected"
		return m, nil
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		m.state.StatusMessage = "No task selected"
		return m, nil
	}

	selectedTask = &tasks[idx]
	m.logTimeModal = NewLogTimeModal(selectedTask)

	return m, nil
}
