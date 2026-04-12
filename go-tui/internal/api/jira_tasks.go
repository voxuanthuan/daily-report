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
		"fields":     []string{"summary", "status", "issuetype", "parent", "priority", "description", "updated", "fixVersions"},
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

// FetchAllTasks fetches all tasks (In Progress, Open, Under Review, Ready for Testing)
// in a single optimized JQL query instead of 4 separate queries
func (c *JiraClient) FetchAllTasks(username string) (inProgress, todo, underReview, testing []model.Issue, err error) {
	// Combine all status queries into one JQL with OR conditions
	// This reduces 4 HTTP requests to 1, significantly improving load time
	jql := fmt.Sprintf(`assignee = '%s' AND status IN (
		'In Progress',
		'Open',
		'Selected for Development',
		'Under Review',
		'Code Review',
		'Review',
		'Ready for Testing',
		'QA',
		'Testing',
		'To Test'
	)`, username)

	issues, err := c.FetchTasksByJQL(jql)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// Categorize issues by status
	for _, issue := range issues {
		status := issue.Fields.Status.Name

		switch status {
		case "In Progress":
			inProgress = append(inProgress, issue)
		case "Open", "Selected for Development":
			todo = append(todo, issue)
		case "Under Review", "Code Review", "Review":
			underReview = append(underReview, issue)
		case "Ready for Testing", "QA", "Testing", "To Test":
			testing = append(testing, issue)
		}
	}

	return inProgress, todo, underReview, testing, nil
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
