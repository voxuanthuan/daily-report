// Package oauth implements OAuth 2.0 authentication with PKCE for Jira CLI
// Uses manual copy-paste flow - no local server required
package oauth

import (
	"golang.org/x/oauth2"
)

// Atlassian OAuth 2.0 endpoints
var (
	AuthURL  = "https://auth.atlassian.com/authorize"
	TokenURL = "https://auth.atlassian.com/oauth/token"
)

// Config holds OAuth configuration for Atlassian
type Config struct {
	oauth2 *oauth2.Config
	// Scopes for Jira API access
	Scopes []string
}

// NewConfig creates OAuth configuration for Atlassian Jira
// clientID: Your Atlassian OAuth app Client ID
// clientSecret: Your Atlassian OAuth app Client Secret
// callbackURL: The callback URL configured in your Atlassian app
func NewConfig(clientID, clientSecret, callbackURL string) *Config {
	return &Config{
		oauth2: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			Scopes:       []string{"read:jira-work", "write:jira-work", "read:me", "offline_access"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  AuthURL,
				TokenURL: TokenURL,
			},
			RedirectURL: callbackURL,
		},
		Scopes: []string{"read:jira-work", "write:jira-work", "read:me", "offline_access"},
	}
}

// GetBaseConfig returns the underlying oauth2.Config
func (c *Config) GetBaseConfig() *oauth2.Config {
	return c.oauth2
}

// GetClientID returns the OAuth client ID
func (c *Config) GetClientID() string {
	return c.oauth2.ClientID
}
