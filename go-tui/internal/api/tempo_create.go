package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// CreateWorklog creates a new worklog entry in Tempo
func (c *TempoClient) CreateWorklog(issueID int, timeSpentSeconds int, startDate string, description string, authorAccountID string) (*model.WorklogResponse, error) {
	url := c.jiraClient.baseURL + "/rest/tempo-timesheets/4/worklogs"

	request := model.WorklogRequest{
		IssueID:          issueID,
		TimeSpentSeconds: timeSpentSeconds,
		StartDate:        startDate,
		Description:      description,
		AuthorAccountID:  authorAccountID,
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal worklog request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiToken))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create worklog: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("tempo API returned status %d", resp.StatusCode)
	}

	var worklogResp model.WorklogResponse
	if err := json.NewDecoder(resp.Body).Decode(&worklogResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &worklogResp, nil
}
