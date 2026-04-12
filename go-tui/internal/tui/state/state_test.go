package state

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/yourusername/jira-daily-report/internal/model"
)

func TestGroupTasksByParentInList(t *testing.T) {
	story := model.Issue{
		Key: "GRAP-23",
		Fields: model.IssueFields{
			Summary:   "Story",
			IssueType: model.IssueType{Name: "Story"},
		},
	}
	childA := model.Issue{
		Key: "GRAP-44",
		Fields: model.IssueFields{
			Summary:   "Child A",
			IssueType: model.IssueType{Name: "Sub-task"},
			Parent: &model.IssueParent{
				Key: story.Key,
			},
		},
	}
	other := model.Issue{
		Key: "GRAP-3333",
		Fields: model.IssueFields{
			Summary:   "Other task",
			IssueType: model.IssueType{Name: "Task"},
		},
	}
	childWithoutParentInList := model.Issue{
		Key: "GRAP-999",
		Fields: model.IssueFields{
			Summary:   "Standalone child",
			IssueType: model.IssueType{Name: "Sub-task"},
			Parent: &model.IssueParent{
				Key: "GRAP-1000",
			},
		},
	}

	grouped := groupTasksByParentInList([]model.Issue{childA, other, story, childWithoutParentInList})

	assert.Equal(t, []string{"GRAP-3333", "GRAP-23", "GRAP-44", "GRAP-999"}, issueKeys(grouped))
}

func issueKeys(issues []model.Issue) []string {
	keys := make([]string, 0, len(issues))
	for _, issue := range issues {
		keys = append(keys, issue.Key)
	}
	return keys
}
