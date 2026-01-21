package tui

import (
	"fmt"

	"github.com/jroimartin/gocui"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// renderReportPanel renders the Report panel
func (gui *Gui) renderReportPanel(v *gocui.View) {
	v.Clear()
	tasks := gui.state.ReportTasks

	if len(tasks) == 0 {
		fmt.Fprintln(v, "  No tasks")
		return
	}

	for _, task := range tasks {
		icon := GetIssueIcon(task.Fields.IssueType.Name)
		fmt.Fprintf(v, "  %s %s: %s\n", icon, task.Key, task.Fields.Summary)
	}
}

// renderTodoPanel renders the Todo panel
func (gui *Gui) renderTodoPanel(v *gocui.View) {
	v.Clear()
	tasks := gui.state.TodoTasks

	if len(tasks) == 0 {
		fmt.Fprintln(v, "  No tasks")
		return
	}

	for _, task := range tasks {
		icon := GetIssueIcon(task.Fields.IssueType.Name)
		fmt.Fprintf(v, "  %s %s: %s\n", icon, task.Key, task.Fields.Summary)
	}
}

// renderProcessingPanel renders the Processing panel
func (gui *Gui) renderProcessingPanel(v *gocui.View) {
	v.Clear()
	tasks := gui.state.ProcessingTasks

	if len(tasks) == 0 {
		fmt.Fprintln(v, "  No tasks")
		return
	}

	for _, task := range tasks {
		icon := GetIssueIcon(task.Fields.IssueType.Name)
		fmt.Fprintf(v, "  %s %s: %s\n", icon, task.Key, task.Fields.Summary)
	}
}

// renderTimelogPanel renders the Time Tracking panel
func (gui *Gui) renderTimelogPanel(v *gocui.View) {
	v.Clear()
	dateGroups := gui.state.DateGroups

	if len(dateGroups) == 0 {
		fmt.Fprintln(v, "  No worklogs")
		return
	}

	for _, group := range dateGroups {
		hours := float64(group.TotalSeconds) / 3600.0
		taskWord := "task"
		if len(group.Worklogs) != 1 {
			taskWord = "tasks"
		}
		fmt.Fprintf(v, "  %s • %.1fh • %d %s\n", group.DisplayDate, hours, len(group.Worklogs), taskWord)
	}
}

// renderDetailsPanel renders the Details panel
func (gui *Gui) renderDetailsPanel(v *gocui.View) {
	v.Clear()

	// Get selected task from active panel
	var selectedTask *model.Issue
	var tasks []model.Issue
	var idx int

	switch gui.state.ActivePanel {
	case PanelReport:
		tasks = gui.state.ReportTasks
		idx = gui.state.SelectedIndices[PanelReport]
	case PanelTodo:
		tasks = gui.state.TodoTasks
		idx = gui.state.SelectedIndices[PanelTodo]
	case PanelProcessing:
		tasks = gui.state.ProcessingTasks
		idx = gui.state.SelectedIndices[PanelProcessing]
	}

	if len(tasks) > 0 && idx < len(tasks) {
		selectedTask = &tasks[idx]
	}

	if selectedTask == nil {
		fmt.Fprintln(v, "  No task selected")
		return
	}

	icon := GetIssueIcon(selectedTask.Fields.IssueType.Name)
	fmt.Fprintf(v, "  %s %s\n", icon, selectedTask.Key)
	fmt.Fprintln(v, "")
	fmt.Fprintf(v, "  ⏺ %s\n", selectedTask.Fields.Status.Name)
	fmt.Fprintln(v, "")
	fmt.Fprintf(v, "  %s\n", selectedTask.Fields.Summary)
}
