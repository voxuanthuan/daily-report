package jira

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/yourusername/jira-daily-report/internal/config"
)

// Transition represents a Jira status transition
type Transition struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	To   struct {
		Name string `json:"name"`
	} `json:"to"`
}

// TransitionsResponse represents the API response
type TransitionsResponse struct {
	Transitions []Transition `json:"transitions"`
}

// TransitionRequest represents the request body for changing status
type TransitionRequest struct {
	Transition struct {
		ID string `json:"id"`
	} `json:"transition"`
}

// getBasicAuth creates Basic auth header value
func getBasicAuth(cfg *config.Config) string {
	auth := cfg.Username + ":" + cfg.ApiToken
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
}

// GetAvailableTransitions fetches available status transitions for an issue
func GetAvailableTransitions(issueKey string, cfg *config.Config) ([]Transition, error) {
	url := fmt.Sprintf("%srest/api/2/issue/%s/transitions", cfg.JiraServer, issueKey)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", getBasicAuth(cfg))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transitions: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result TransitionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Transitions, nil
}

// ChangeIssueStatus changes the status of an issue using a transition
func ChangeIssueStatus(issueKey, transitionID string, cfg *config.Config) error {
	url := fmt.Sprintf("%srest/api/2/issue/%s/transitions", cfg.JiraServer, issueKey)

	reqBody := TransitionRequest{}
	reqBody.Transition.ID = transitionID

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", getBasicAuth(cfg))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to change status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}
