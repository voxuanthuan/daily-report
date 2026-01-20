package tui

import (
	"github.com/yourusername/jira-daily-report/internal/tui/state"
	"fmt"
	"strings"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// renderDetailsPanel renders the details panel showing selected task info
func (m Model) renderDetailsPanel() string {
	isActive := m.state.ActivePanel == state.PanelDetails

	var items []string
	items = append(items, titleStyle.Render("Details"))
	items = append(items, "")

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
	}

	if len(tasks) > 0 && idx < len(tasks) {
		selectedTask = &tasks[idx]
	}

	if selectedTask == nil {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No task selected"))
	} else {
		// Show task details
		icon := GetIssueIcon(selectedTask.Fields.IssueType.Name)
		items = append(items, selectedItemStyle.Render(fmt.Sprintf("%s %s", icon, selectedTask.Key)))
		items = append(items, "")
		items = append(items, itemStyle.Render("⏺ "+selectedTask.Fields.Status.Name))

		// === FIX VERSION (if available) ===
		if len(selectedTask.Fields.FixVersions) > 0 {
			versionNames := make([]string, len(selectedTask.Fields.FixVersions))
			for i, v := range selectedTask.Fields.FixVersions {
				versionNames[i] = v.Name
			}
			fixVersionText := "Fix Version: " + strings.Join(versionNames, ", ")
			items = append(items, itemStyle.Foreground(colorMuted).Render(fixVersionText))
		}

		items = append(items, "")
		items = append(items, itemStyle.Render(selectedTask.Fields.Summary))

		// Add description if available
		if desc, ok := selectedTask.Fields.Description.(string); ok && desc != "" {
			items = append(items, "")
			items = append(items, itemStyle.Foreground(colorMuted).Render("Description:"))
			// Truncate long descriptions
			if len(desc) > 200 {
				desc = desc[:200] + "..."
			}
			items = append(items, itemStyle.Render(desc))
		}
	}

	content := strings.Join(items, "\n")

	if isActive {
		return activeBorderStyle.Width(35).Height(25).Render(content)
	}
	return inactiveBorderStyle.Width(35).Height(25).Render(content)
}
