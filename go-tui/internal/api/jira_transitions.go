package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

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
