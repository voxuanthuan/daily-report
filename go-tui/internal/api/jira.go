package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// JiraClient handles Jira API requests
type JiraClient struct {
	baseURL  string
	username string
	apiToken string
	client   *http.Client
}

// NewJiraClient creates a new Jira API client
func NewJiraClient(baseURL, username, apiToken string) *JiraClient {
	return &JiraClient{
		baseURL:  baseURL,
		username: username,
		apiToken: apiToken,
		client:   &http.Client{},
	}
}

// FetchUser retrieves the current user information
func (c *JiraClient) FetchUser(accountID string) (*model.User, error) {
	endpoint := fmt.Sprintf("%s/rest/api/3/user", c.baseURL)
	params := url.Values{}
	params.Add("accountId", accountID)

	req, err := http.NewRequest("GET", endpoint+"?"+params.Encode(), nil)
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
		return nil, fmt.Errorf("failed to fetch user: %s - %s", resp.Status, string(body))
	}

	var user model.User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// FetchCurrentUser retrieves the currently authenticated user
func (c *JiraClient) FetchCurrentUser() (*model.User, error) {
	endpoint := fmt.Sprintf("%s/rest/api/3/myself", c.baseURL)

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
		return nil, fmt.Errorf("failed to fetch current user: %s - %s", resp.Status, string(body))
	}

	var user model.User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// FetchIssue retrieves a single issue by ID or key
func (c *JiraClient) FetchIssue(issueID string) (*model.Issue, error) {
	endpoint := fmt.Sprintf("%s/rest/api/3/issue/%s", c.baseURL, issueID)
	params := url.Values{}
	params.Add("fields", "key,summary")

	req, err := http.NewRequest("GET", endpoint+"?"+params.Encode(), nil)
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
		return nil, fmt.Errorf("failed to fetch issue: %s - %s", resp.Status, string(body))
	}

	var issue model.Issue
	if err := json.NewDecoder(resp.Body).Decode(&issue); err != nil {
		return nil, err
	}

	return &issue, nil
}

// FetchTasks retrieves tasks with a JQL query using POST to avoid 410 Gone or URL length limits
func (c *JiraClient) FetchTasks(jql string) ([]model.Issue, error) {
	endpoint := fmt.Sprintf("%s/rest/api/3/search/jql", c.baseURL)

	payload := map[string]interface{}{
		"jql":        jql,
		"maxResults": 100,
		"fields":     []string{"key", "summary", "status", "issuetype", "priority", "assignee", "description"},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
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
		return nil, fmt.Errorf("failed to fetch tasks: %s - %s", resp.Status, string(body))
	}

	var result struct {
		Issues []model.Issue `json:"issues"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Issues, nil
}
