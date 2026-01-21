package tui

import (
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// showCopyOptions shows the copy options modal
func (m Model) showCopyOptions() (tea.Model, tea.Cmd) {
	// Get selected task
	var selectedTask *model.Issue
	var tasks []model.Issue
	var idx int

	switch m.state.ActivePanel {
	case state.PanelReport:
		tasks = m.state.ReportTasks
		idx = m.state.SelectedIndices[state.PanelReport]
	case state.PanelTodo:
		tasks = m.state.TodoTasks
		idx = m.state.SelectedIndices[state.PanelTodo]
	case state.PanelProcessing:
		tasks = m.state.ProcessingTasks
		idx = m.state.SelectedIndices[state.PanelProcessing]
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
