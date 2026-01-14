package api

import (
	"fmt"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// FetchUnderReviewTasks fetches tasks under review
func (c *JiraClient) FetchUnderReviewTasks(username string) ([]model.Issue, error) {
	jql := fmt.Sprintf(`assignee = '%s' AND status IN ('Under Review', 'Code Review', 'Review')`, username)
	return c.FetchTasksByJQL(jql)
}
