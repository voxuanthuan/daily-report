package tui

import (
	"sort"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

func (m Model) showLogTimeModal() (Model, tea.Cmd) {
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

func (m Model) showReportPreviewModal() (Model, tea.Cmd) {
	var prevDate time.Time
	if len(m.state.DateGroups) > 0 {
		prevDate, _ = time.Parse("2006-01-02", m.state.DateGroups[0].Date)
	}

	prevWorklogs := getPreviousDayWorklogs(m.state.Worklogs)

	m.reportPreviewModal = NewReportPreviewModal(
		prevWorklogs,
		m.state.ReportTasks,
		prevDate,
		m.width,
		m.height,
	)

	return m, nil
}

func getPreviousDayWorklogs(worklogs []model.Worklog) []model.Worklog {
	if len(worklogs) == 0 {
		return nil
	}

	// Sort worklogs by date descending (newest first)
	sortedWorklogs := make([]model.Worklog, len(worklogs))
	copy(sortedWorklogs, worklogs)
	sort.Slice(sortedWorklogs, func(i, j int) bool {
		return sortedWorklogs[i].StartDate > sortedWorklogs[j].StartDate
	})

	today := time.Now().Format("2006-01-02")
	var prevDate string

	// Find first date that's not today
	for _, w := range sortedWorklogs {
		if w.StartDate != today {
			prevDate = w.StartDate
			break
		}
	}

	if prevDate == "" {
		return nil
	}

	// Return ALL worklogs from that date
	var result []model.Worklog
	for _, w := range sortedWorklogs {
		if w.StartDate == prevDate {
			result = append(result, w)
		}
	}

	return result
}
