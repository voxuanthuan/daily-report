package oauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"
)

// AtlassianSite represents a Jira site from accessible-resources
type AtlassianSite struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	URL      string   `json:"url"`
	Scopes   []string `json:"scopes"`
	AvatarURL string  `json:"avatarUrl"`
}

// UserInfo represents the authenticated user's profile
type UserInfo struct {
	AccountID    string `json:"account_id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Picture      string `json:"picture"`
	Nickname     string `json:"nickname"`
	ZoneInfo     string `json:"zoneinfo"`
	Locale       string `json:"locale"`
	AccountStatus string `json:"account_status"`
}

// AtlassianClient handles Atlassian-specific OAuth operations
type AtlassianClient struct {
	httpClient *http.Client
	token      *oauth2.Token
}

// NewAtlassianClient creates a new client for Atlassian API operations
func NewAtlassianClient(token *oauth2.Token) *AtlassianClient {
	return &AtlassianClient{
		httpClient: &http.Client{},
		token:      token,
	}
}

// GetAccessibleResources returns the list of sites accessible to the user
// This is needed to get the cloud ID for API calls
func (c *AtlassianClient) GetAccessibleResources(ctx context.Context) ([]AtlassianSite, error) {
	url := "https://api.atlassian.com/oauth/token/accessible-resources"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token.AccessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get accessible resources: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var sites []AtlassianSite
	if err := json.NewDecoder(resp.Body).Decode(&sites); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return sites, nil
}

// GetUserInfo retrieves the authenticated user's profile information
func (c *AtlassianClient) GetUserInfo(ctx context.Context) (*UserInfo, error) {
	url := "https://api.atlassian.com/me"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token.AccessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var userInfo UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &userInfo, nil
}

// BuildAPIURL constructs the API URL for a specific Jira site
// Atlassian uses a different URL pattern for OAuth-authenticated requests
// Format: https://api.atlassian.com/ex/jira/{cloudid}/{api-path}
func BuildAPIURL(cloudID, apiPath string) string {
	return fmt.Sprintf("https://api.atlassian.com/ex/jira/%s/%s", cloudID, apiPath)
}

// MakeAPIRequest makes an authenticated API request to a Jira site
func (c *AtlassianClient) MakeAPIRequest(ctx context.Context, cloudID, method, apiPath string, body []byte) (*http.Response, error) {
	url := BuildAPIURL(cloudID, apiPath)

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token.AccessToken)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make API request: %w", err)
	}

	return resp, nil
}

// FindSiteByURL finds a site by its URL from the accessible resources
func (c *AtlassianClient) FindSiteByURL(ctx context.Context, siteURL string) (*AtlassianSite, error) {
	sites, err := c.GetAccessibleResources(ctx)
	if err != nil {
		return nil, err
	}

	for _, site := range sites {
		if site.URL == siteURL {
			return &site, nil
		}
	}

	return nil, fmt.Errorf("site not found: %s", siteURL)
}

// GetCloudID returns the cloud ID for a given site URL
func (c *AtlassianClient) GetCloudID(ctx context.Context, siteURL string) (string, error) {
	site, err := c.FindSiteByURL(ctx, siteURL)
	if err != nil {
		return "", err
	}
	return site.ID, nil
}
