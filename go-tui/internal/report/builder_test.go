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
	//   ●  GRAP-123: Task 1
	//       ○ Real description 1
	//       ○ Real description 2
	expectedSubBullets := "       ○ Real description 1\n       ○ Real description 2"
	if !strings.Contains(report, expectedSubBullets) {
		t.Errorf("Report incorrectly formatted sub-bullets. Expected contiguous:\n%q\nGot:\n%q", expectedSubBullets, report)
	}
}

func TestBuildHTMLReport(t *testing.T) {
	// Setup test data
	prevDate := time.Date(2023, 10, 26, 0, 0, 0, 0, time.UTC)

	prevTasks := []model.Worklog{
		{
			Issue: model.WorklogIssue{
				Key:     "PROJ-123",
				Summary: "Fix login bug",
			},
			Description: "Investigated issue",
		},
		{
			Issue: model.WorklogIssue{
				Key:     "PROJ-123",
				Summary: "Fix login bug",
			},
			Description: "Fixed NPE",
		},
		{
			Issue: model.WorklogIssue{
				Key:     "PROJ-456",
				Summary: "Update docs",
			},
			Description: "Updated README",
		},
	}

	inProgress := []model.Issue{
		{
			Key: "PROJ-789",
			Fields: model.IssueFields{
				Summary: "New feature",
				IssueType: model.IssueType{
					Name: "Story",
				},
			},
		},
		{
			Key: "PROJ-999",
			Fields: model.IssueFields{
				Summary: "Cleanup",
				IssueType: model.IssueType{
					Name: "Task",
				},
			},
		},
	}

	// Execute
	html := BuildHTMLReport(prevTasks, inProgress, prevDate)

	// Verify
	expectedSubstrings := []string{
		"<p>Hi everyone,</p>",
		"<p>Last Thursday</p>", // 2023-10-26 was a Thursday
		"<ul>",
		"<li>PROJ-123: Fix login bug",
		"<li>Investigated issue</li>",
		"<li>Fixed NPE</li>",
		"<li>PROJ-456: Update docs",
		"<li>Updated README</li>",
		"<p>Today</p>",
		"<li>PROJ-789: New feature</li>",
		"<li>PROJ-999: Cleanup</li>",
		"<p>No blockers</p>",
	}

	for _, sub := range expectedSubstrings {
		if !strings.Contains(html, sub) {
			t.Errorf("Expected HTML to contain %q, but it didn't.\nGot:\n%s", sub, html)
		}
	}
}

func TestBuildHTMLReport_Empty(t *testing.T) {
	prevDate := time.Now().AddDate(0, 0, -1)
	html := BuildHTMLReport([]model.Worklog{}, []model.Issue{}, prevDate)

	if !strings.Contains(html, "<li>No tasks logged.</li>") {
		t.Error("Expected 'No tasks logged' message")
	}
	if !strings.Contains(html, "<li>No tasks planned.</li>") {
		t.Error("Expected 'No tasks planned' message")
	}
}
