package tui

import (
	"github.com/yourusername/jira-daily-report/internal/tui/state"
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
		m.state.StatusMessage = ""
		return m, nil
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		m.state.StatusMessage = ""
		return m, nil
	}

	selectedTask = &tasks[idx]
	m.logTimeModal = NewLogTimeModal(selectedTask, m.tempoClient, m.state.User.AccountID)

	return m, nil
}
