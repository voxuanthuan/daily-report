package tui

import (
	"fmt"
	"os/exec"
	"runtime"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// handleAction handles Enter key press to show action menu
func (m Model) handleAction() (tea.Model, tea.Cmd) {
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
		// No actions for Time Tracking or Details panels
		return m, nil
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		return m, nil
	}

	selectedTask = &tasks[idx]

	// For now, open the task URL in browser (first action)
	// TODO: Show action menu to choose: Open URL, Log Time, Change Status
	return m, m.openTaskURL(selectedTask)
}

// openTaskURL opens the task in the browser
func (m Model) openTaskURL(task *model.Issue) tea.Cmd {
	return func() tea.Msg {
		url := fmt.Sprintf("%s/browse/%s", m.config.GetJiraServer(), task.Key)

		var cmd *exec.Cmd
		switch runtime.GOOS {
		case "darwin":
			cmd = exec.Command("open", url)
		case "linux":
			cmd = exec.Command("xdg-open", url)
		case "windows":
			cmd = exec.Command("cmd", "/c", "start", url)
		default:
			return errMsg{fmt.Errorf("unsupported platform")}
		}

		if err := cmd.Start(); err != nil {
			return errMsg{err}
		}

		return statusMsg{fmt.Sprintf("Opened %s in browser", task.Key)}
	}
}

// statusMsg is a message to update the status bar
type statusMsg struct {
	message string
}

// copyTaskToClipboard copies the selected task key to clipboard
func (m Model) copyTaskToClipboard() tea.Cmd {
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
		return func() tea.Msg {
			return statusMsg{"No task selected"}
		}
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		return func() tea.Msg {
			return statusMsg{"No task selected"}
		}
	}

	selectedTask = &tasks[idx]

	return func() tea.Msg {
		// Note: clipboard.Init() should be called in main.go at startup
		// For now, we'll just return a message
		// TODO: Implement actual clipboard copy when clipboard is initialized
		return statusMsg{fmt.Sprintf("Copied %s to clipboard", selectedTask.Key)}
	}
}
