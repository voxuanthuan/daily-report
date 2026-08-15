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

func TestGroupTasksByParentInList_RecursiveHierarchy(t *testing.T) {
	epic := model.Issue{
		Key: "T-234",
		Fields: model.IssueFields{
			Summary:   "Epic",
			IssueType: model.IssueType{Name: "Epic"},
		},
	}
	story := model.Issue{
		Key: "T-235",
		Fields: model.IssueFields{
			Summary:   "Story",
			IssueType: model.IssueType{Name: "Story"},
			Parent: &model.IssueParent{
				Key: epic.Key,
			},
		},
	}
	subtaskA := model.Issue{
		Key: "T-236",
		Fields: model.IssueFields{
			Summary:   "Sub-task A",
			IssueType: model.IssueType{Name: "Sub-task"},
			Parent: &model.IssueParent{
				Key: story.Key,
			},
		},
	}
	subtaskB := model.Issue{
		Key: "T-237",
		Fields: model.IssueFields{
			Summary:   "Sub-task B",
			IssueType: model.IssueType{Name: "Sub-task"},
			Parent: &model.IssueParent{
				Key: story.Key,
			},
		},
	}
	other := model.Issue{
		Key: "T-999",
		Fields: model.IssueFields{
			Summary:   "Other task",
			IssueType: model.IssueType{Name: "Task"},
		},
	}

	grouped := groupTasksByParentInList([]model.Issue{subtaskB, other, story, epic, subtaskA})

	assert.Equal(t, []string{"T-999", "T-234", "T-235", "T-237", "T-236"}, issueKeys(grouped))
}

func TestNewStateInitializesBuddyAtTimelog(t *testing.T) {
	s := NewState()

	assert.Equal(t, PanelTimelog, s.BuddyPanel)
	assert.True(t, s.IsBuddyVisiting(PanelTimelog))
	assert.False(t, s.IsBuddyVisiting(PanelReport))
}

func TestAdvanceBuddyCyclesThroughPanels(t *testing.T) {
	s := NewState()

	assert.Equal(t, PanelReport, s.AdvanceBuddy())
	assert.Equal(t, 1, s.BuddyStep)
	assert.Equal(t, PanelTodo, s.AdvanceBuddy())
	assert.Equal(t, PanelProcessing, s.AdvanceBuddy())
	assert.Equal(t, PanelDetails, s.AdvanceBuddy())
	assert.Equal(t, PanelTimelog, s.AdvanceBuddy())
	assert.Equal(t, PanelReport, s.AdvanceBuddy())
	assert.Equal(t, 6, s.BuddyStep)
}

func issueKeys(issues []model.Issue) []string {
	keys := make([]string, 0, len(issues))
	for _, issue := range issues {
		keys = append(keys, issue.Key)
	}
	return keys
}
