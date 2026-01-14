package api

import (
	"fmt"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// FetchTasksByJQL fetches tasks using a JQL query
func (c *JiraClient) FetchTasksByJQL(jql string) ([]model.Issue, error) {
	// Use the correct Jira search endpoint (migrated to /search/jql)
	endpoint := fmt.Sprintf("%s/rest/api/3/search/jql", c.baseURL)

	// Build request body (POST method is recommended for Jira API)
	requestBody := map[string]interface{}{
		"jql":        jql,
		"fields":     []string{"summary", "status", "issuetype", "priority", "description"},
		"maxResults": 100,
	}

	req, err := c.buildRequest("POST", endpoint, requestBody)
	if err != nil {
		return nil, err
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := c.readBody(resp)
		return nil, fmt.Errorf("failed to fetch tasks: status %d - %s", resp.StatusCode, string(body))
	}

	var result struct {
		Issues []model.Issue `json:"issues"`
	}
	if err := c.decodeResponse(resp, &result); err != nil {
		return nil, err
	}

	return result.Issues, nil
}

// FetchInProgressTasks fetches tasks in "In Progress" status
func (c *JiraClient) FetchInProgressTasks(username string) ([]model.Issue, error) {
	jql := fmt.Sprintf(`assignee = '%s' AND status = 'In Progress'`, username)
	return c.FetchTasksByJQL(jql)
}

// FetchOpenTasks fetches open tasks
func (c *JiraClient) FetchOpenTasks(username string) ([]model.Issue, error) {
	jql := fmt.Sprintf(`assignee = '%s' AND status IN ('Open', 'Selected for Development')`, username)
	return c.FetchTasksByJQL(jql)
}

// FetchReadyForTestingTasks fetches tasks ready for testing
func (c *JiraClient) FetchReadyForTestingTasks(username string) ([]model.Issue, error) {
	jql := fmt.Sprintf(`assignee = '%s' AND status IN ('Ready for Testing', 'QA', 'Testing', 'To Test')`, username)
	return c.FetchTasksByJQL(jql)
}
