package tui

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/yourusername/jira-daily-report/internal/model"
)

func TestTaskDepth(t *testing.T) {
	epic := model.Issue{Key: "T-234"}
	story := model.Issue{
		Key: "T-235",
		Fields: model.IssueFields{
			Parent: &model.IssueParent{Key: epic.Key},
		},
	}
	subtask := model.Issue{
		Key: "T-236",
		Fields: model.IssueFields{
			Parent: &model.IssueParent{Key: story.Key},
		},
	}

	tasks := []model.Issue{epic, story, subtask}

	assert.Equal(t, 0, taskDepth(epic, tasks))
	assert.Equal(t, 1, taskDepth(story, tasks))
	assert.Equal(t, 2, taskDepth(subtask, tasks))
}

func TestTaskTreePrefix(t *testing.T) {
	epic := model.Issue{Key: "T-234"}
	story := model.Issue{
		Key: "T-235",
		Fields: model.IssueFields{
			Parent: &model.IssueParent{Key: epic.Key},
		},
	}
	subtaskA := model.Issue{
		Key: "T-236",
		Fields: model.IssueFields{
			Parent: &model.IssueParent{Key: story.Key},
		},
	}
	subtaskB := model.Issue{
		Key: "T-237",
		Fields: model.IssueFields{
			Parent: &model.IssueParent{Key: story.Key},
		},
	}

	tasks := []model.Issue{epic, story, subtaskA, subtaskB}

	assert.Equal(t, "", taskTreePrefix(0, tasks))
	assert.Equal(t, "└─ ", taskTreePrefix(1, tasks))
	assert.Equal(t, "   ├─ ", taskTreePrefix(2, tasks))
	assert.Equal(t, "   └─ ", taskTreePrefix(3, tasks))
}
