package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// showCopyOptions shows the copy options modal
func (m Model) showCopyOptions() (tea.Model, tea.Cmd) {
	// Get selected task
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
		return m, nil
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		return m, nil
	}

	selectedTask = &tasks[idx]
	m.copyOptionsModal = NewCopyOptionsModal(selectedTask, m.config.GetJiraServer())

	return m, nil
}
