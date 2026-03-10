package report

import (
	"strings"
	"testing"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

func TestIsDefaultDescription(t *testing.T) {
	tests := []struct {
		name     string
		desc     string
		expected bool
	}{
		{
			name:     "empty description",
			desc:     "",
			expected: true,
		},
		{
			name:     "whitespace only",
			desc:     "   ",
			expected: true,
		},
		{
			name:     "working on issue prefix",
			desc:     "working on issue GRAP-18331",
			expected: true,
		},
		{
			name:     "Working on issue with capital W",
			desc:     "Working on issue GRAP-18331",
			expected: true,
		},
		{
			name:     "working on issue with extra spaces",
			desc:     "  working on issue GRAP-18331  ",
			expected: true,
		},
		{
			name:     "WORKING ON ISSUE all caps",
			desc:     "WORKING ON ISSUE GRAP-18331",
			expected: true,
		},
		{
			name:     "custom description",
			desc:     "do task A",
			expected: false,
		},
		{
			name:     "custom description with prefix",
			desc:     "working on the issue",
			expected: false,
		},
		{
			name:     "description containing working on issue",
			desc:     "Completed: working on issue GRAP-18331",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isDefaultDescription(tt.desc)
			if result != tt.expected {
				t.Errorf("isDefaultDescription(%q) = %v, want %v", tt.desc, result, tt.expected)
			}
		})
	}
}

func TestGroupWorklogsByIssue(t *testing.T) {
	worklogs := []model.Worklog{
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "Issue 1"},
			Description: "do task A",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18331", Summary: "Issue 2"},
			Description: "working on issue GRAP-18331",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "Issue 1"},
			Description: "do task B",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "Issue 1"},
			Description: "do task C",
		},
	}

	grouped := groupWorklogsByIssue(worklogs)

	if len(grouped) != 2 {
		t.Errorf("Expected 2 issue groups, got %d", len(grouped))
	}

	if len(grouped["GRAP-18336"]) != 3 {
		t.Errorf("Expected 3 worklogs for GRAP-18336, got %d", len(grouped["GRAP-18336"]))
	}

	if len(grouped["GRAP-18331"]) != 1 {
		t.Errorf("Expected 1 worklog for GRAP-18331, got %d", len(grouped["GRAP-18331"]))
	}

	// Verify order is preserved (first entry should be "do task A")
	if grouped["GRAP-18336"][0].Description != "do task A" {
		t.Errorf("Expected first worklog description 'do task A', got %q", grouped["GRAP-18336"][0].Description)
	}

	// Verify second entry is "do task B"
	if grouped["GRAP-18336"][1].Description != "do task B" {
		t.Errorf("Expected second worklog description 'do task B', got %q", grouped["GRAP-18336"][1].Description)
	}

	// Verify third entry is "do task C"
	if grouped["GRAP-18336"][2].Description != "do task C" {
		t.Errorf("Expected third worklog description 'do task C', got %q", grouped["GRAP-18336"][2].Description)
	}
}

func TestBuildMainReportMultipleWorklogs(t *testing.T) {
	prevTasks := []model.Worklog{
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "The debtor blanket reason \"No ABN\" is not automatically removed when an ABN is updated."},
			Description: "do task A",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18331", Summary: "Can not run debtor credit assessment from client dashboard"},
			Description: "working on issue GRAP-18331",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "The debtor blanket reason \"No ABN\" is not automatically removed when an ABN is updated."},
			Description: "do task B",
		},
		{
			Issue:       model.WorklogIssue{Key: "GRAP-18336", Summary: "The debtor blanket reason \"No ABN\" is not automatically removed when an ABN is updated."},
			Description: "do task C",
		},
	}

	inProgress := []model.Issue{
		{
			Key: "GRAP-18231",
			Fields: model.IssueFields{
				Summary:   "[Client dashboard] Required document upload tile not displayed when  \"Action Item SLA Timeframe\" is unset + expired client actions not highlighted",
				IssueType: model.IssueType{Name: "Task"},
			},
		},
	}

	report := BuildMainReport(prevTasks, inProgress, time.Now().AddDate(0, 0, -1))

	// Verify report contains the expected elements
	if !strings.Contains(report, "Hi everyone,") {
		t.Error("Report should contain greeting")
	}

	if !strings.Contains(report, "Yesterday") {
		t.Error("Report should contain Yesterday")
	}

	if !strings.Contains(report, "GRAP-18336") {
		t.Error("Report should contain GRAP-18336")
	}

	if !strings.Contains(report, "do task A") {
		t.Error("Report should contain 'do task A'")
	}

	if !strings.Contains(report, "do task B") {
		t.Error("Report should contain 'do task B'")
	}

	if !strings.Contains(report, "do task C") {
		t.Error("Report should contain 'do task C'")
	}

	if !strings.Contains(report, "GRAP-18331") {
		t.Error("Report should contain GRAP-18331")
	}

	// Verify that "working on issue" description is NOT shown
	// The issue should be listed, but the description should not appear as a subtask
	lines := strings.Split(report, "\n")
	grap18331Found := false
	for i, line := range lines {
		if strings.Contains(line, "GRAP-18331") {
			grap18331Found = true
			// Check next few lines don't contain "working on issue" as a subtask
			for j := i + 1; j < len(lines) && j < i+3; j++ {
				if strings.Contains(lines[j], "○") && strings.Contains(lines[j], "working on issue") {
					t.Error("Report should not show 'working on issue' as a subtask")
				}
				if strings.Contains(lines[j], "●") {
					// Hit the next issue, stop checking
					break
				}
			}
		}
	}

	if !grap18331Found {
		t.Error("GRAP-18331 should appear in the report")
	}

	if !strings.Contains(report, "Today") {
		t.Error("Report should contain Today section")
	}

	if !strings.Contains(report, "GRAP-18231") {
		t.Error("Report should contain GRAP-18231 in Today section")
	}

	if !strings.Contains(report, "No blockers") {
		t.Error("Report should contain blockers section")
	}
}

func TestBuildMainReportEmptyWorklogs(t *testing.T) {
	prevTasks := []model.Worklog{}
	inProgress := []model.Issue{
		{
			Key: "GRAP-18231",
			Fields: model.IssueFields{
				Summary:   "Test task",
				IssueType: model.IssueType{Name: "Task"},
			},
		},
	}

	report := BuildMainReport(prevTasks, inProgress, time.Now().AddDate(0, 0, -1))

	if !strings.Contains(report, "No tasks logged.") {
		t.Error("Report should show 'No tasks logged.' when no worklogs")
	}

	if !strings.Contains(report, "GRAP-18231") {
		t.Error("Report should still show today's tasks")
	}
}
