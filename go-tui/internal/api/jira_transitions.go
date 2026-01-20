package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/yourusername/jira-daily-report/internal/jira"
)

// GetTransitions fetches available status transitions for an issue
func (c *JiraClient) GetTransitions(issueKey string) ([]jira.Transition, error) {
	endpoint := fmt.Sprintf("%s/rest/api/3/issue/%s/transitions", c.baseURL, issueKey)

	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.SetBasicAuth(c.username, c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch transitions: %s - %s", resp.Status, string(body))
	}

	var result jira.TransitionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Transitions, nil
}

// TransitionRequest represents the payload for changing an issue status
type TransitionRequest struct {
	Transition TransitionData `json:"transition"`
}

// TransitionData holds the transition ID
type TransitionData struct {
	ID string `json:"id"`
}

// TransitionIssue performs a status transition on an issue
func (c *JiraClient) TransitionIssue(issueKey string, transitionID string) error {
	endpoint := fmt.Sprintf("%s/rest/api/3/issue/%s/transitions", c.baseURL, issueKey)

	payload := TransitionRequest{
		Transition: TransitionData{
			ID: transitionID,
		},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}

	req.SetBasicAuth(c.username, c.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to transition issue: %s - %s", resp.Status, string(body))
	}

	return nil
}
