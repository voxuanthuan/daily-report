package report

import (
	"strings"
	"testing"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

func TestBuildMainReport_AggregationAndFiltering(t *testing.T) {
	prevDate := time.Date(2023, 10, 26, 0, 0, 0, 0, time.UTC)

	// Create test worklogs
	worklogs := []model.Worklog{
		{
			Issue:       model.WorklogIssue{Key: "GRAP-123", Summary: "Task 1"},
			Description: "Working on issue GRAP-123", // Should be filtered
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-123", Summary: "Task 1"},
			Description: "Real description 1",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-123", Summary: "Task 1"},
			Description: "Real description 2",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-456", Summary: "Task 2"},
			Description: "Working on issue GRAP-456", // Should be filtered
		},
	}

	inProgress := []model.Issue{}

	report := BuildMainReport(worklogs, inProgress, prevDate)

	// Verify "Working on issue" is gone
	if strings.Contains(report, "Working on issue") {
		t.Errorf("Report should not contain 'Working on issue', got: %s", report)
	}

	// Verify both real descriptions are present for GRAP-123
	if !strings.Contains(report, "Real description 1") {
		t.Errorf("Report should contain 'Real description 1'")
	}
	if !strings.Contains(report, "Real description 2") {
		t.Errorf("Report should contain 'Real description 2'")
	}

	// Verify structure
	// Should look something like:
	// ● GRAP-123: Task 1
	//   ○ Real description 1
	//   ○ Real description 2
	expectedSubBullets := "  ○ Real description 1\n  ○ Real description 2"
	if !strings.Contains(report, expectedSubBullets) {
		t.Errorf("Report incorrectly formatted sub-bullets. Expected contiguous:\n%s\nGot:\n%s", expectedSubBullets, report)
	}
}
