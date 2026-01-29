package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// getCloudIDForSite fetches the cloud ID for a given Jira site URL using OAuth token
func getCloudIDForSite(siteURL, oauthToken string) (string, error) {
	// Call Atlassian API to get accessible resources
	req, err := http.NewRequest("GET", "https://api.atlassian.com/oauth/token/accessible-resources", nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+oauthToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get accessible resources: %s - %s", resp.Status, string(body))
	}

	var sites []struct {
		ID   string `json:"id"`
		URL  string `json:"url"`
		Name string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&sites); err != nil {
		return "", err
	}

	// Normalize URLs for comparison
	normalizedSiteURL := strings.TrimSuffix(strings.TrimSpace(siteURL), "/")

	// Find matching site
	for _, site := range sites {
		normalizedURL := strings.TrimSuffix(strings.TrimSpace(site.URL), "/")
		if normalizedURL == normalizedSiteURL {
			return site.ID, nil
		}
	}

	// If no exact match, return the first site's ID
	if len(sites) > 0 {
		return sites[0].ID, nil
	}

	return "", fmt.Errorf("no accessible Jira sites found")
}

// JiraClient handles Jira API requests
type JiraClient struct {
	baseURL    string
	username   string
	apiToken   string
	oauthToken string // OAuth Bearer token (preferred when set)
	client     *http.Client
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

// NewOAuthJiraClient creates a new Jira API client using OAuth Bearer token
// For OAuth with Atlassian Cloud, we need to use api.atlassian.com/ex/jira/{cloudId} pattern
func NewOAuthJiraClient(siteURL, oauthToken string) *JiraClient {
	// Get cloud ID for the site
	cloudID, err := getCloudIDForSite(siteURL, oauthToken)
	if err != nil {
		// Fallback to direct URL if cloud ID fetch fails
		// This allows the code to work even if there's an issue
		return &JiraClient{
			baseURL:    siteURL,
			oauthToken: oauthToken,
			client:     &http.Client{},
		}
	}

	// Use Atlassian Cloud API proxy pattern
	baseURL := fmt.Sprintf("https://api.atlassian.com/ex/jira/%s", cloudID)
	return &JiraClient{
		baseURL:    baseURL,
		oauthToken: oauthToken,
		client:     &http.Client{},
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

	c.setAuth(req)
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

	c.setAuth(req)
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

	c.setAuth(req)
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
		"fields":     []string{"key", "summary", "status", "issuetype", "priority", "assignee", "description", "fixVersions"},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	c.setAuth(req)
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
