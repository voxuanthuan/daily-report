package tui

import (
	"fmt"
	"strings"
	"testing"

	"github.com/charmbracelet/lipgloss"
	"github.com/stretchr/testify/assert"

	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

func TestRenderPanelWithSizeDoesNotDuplicateSelectionAtTop(t *testing.T) {
	tasks := make([]model.Issue, 10)
	for i := range tasks {
		tasks[i] = testPanelIssue(fmt.Sprintf("GRAP-%d", 19000+i), "Under Review", "A processing task")
	}

	m := Model{state: state.NewState()}
	m.state.ActivePanel = state.PanelProcessing
	m.state.SelectedIndices[state.PanelProcessing] = 0

	view := m.renderPanelWithSize("Processing", state.PanelProcessing, tasks, "[3]", 80, 8)

	assert.Equal(t, 1, strings.Count(view, "▶"))
}

func TestVisibleTaskWindowKeepsLastItemsReachable(t *testing.T) {
	start, end := visibleTaskWindow(19, 18, 6)

	assert.Equal(t, 13, start)
	assert.Equal(t, 19, end)
}

func TestRenderPanelWithSizeKeepsLongRowsWithinPanelWidth(t *testing.T) {
	tasks := []model.Issue{
		testPanelIssue("GRAP-19010", "Under Review", strings.Repeat("very long summary ", 20)),
	}
	m := Model{state: state.NewState()}
	m.state.ActivePanel = state.PanelProcessing

	const panelWidth = 60
	view := m.renderPanelWithSize("Processing", state.PanelProcessing, tasks, "[3]", panelWidth, 5)

	for _, line := range strings.Split(view, "\n") {
		assert.LessOrEqual(t, lipgloss.Width(line), panelWidth)
	}
}

func testPanelIssue(key, status, summary string) model.Issue {
	return model.Issue{
		Key: key,
		Fields: model.IssueFields{
			Summary:   summary,
			Status:    model.Status{Name: status},
			IssueType: model.IssueType{Name: "Task"},
		},
	}
}
