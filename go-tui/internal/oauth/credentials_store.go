package oauth

import (
	"encoding/json"
	"fmt"

	"github.com/zalando/go-keyring"
)

const (
	oauthCredsService = "jira-daily-report-oauth"
	oauthCredsKey     = "app-credentials"
)

// AppCredentials holds the OAuth app credentials
type AppCredentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	CallbackURL  string `json:"callback_url"`
}

// SaveAppCredentials saves the OAuth app credentials to keyring
func SaveAppCredentials(clientID, clientSecret, callbackURL string) error {
	creds := AppCredentials{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		CallbackURL:  callbackURL,
	}

	data, err := json.Marshal(creds)
	if err != nil {
		return fmt.Errorf("failed to marshal credentials: %w", err)
	}

	return keyring.Set(oauthCredsService, oauthCredsKey, string(data))
}

// LoadAppCredentials loads the OAuth app credentials from keyring
func LoadAppCredentials() (*AppCredentials, error) {
	data, err := keyring.Get(oauthCredsService, oauthCredsKey)
	if err != nil {
		return nil, err
	}

	var creds AppCredentials
	if err := json.Unmarshal([]byte(data), &creds); err != nil {
		return nil, fmt.Errorf("failed to unmarshal credentials: %w", err)
	}

	return &creds, nil
}

// HasAppCredentials returns true if app credentials are stored
func HasAppCredentials() bool {
	_, err := LoadAppCredentials()
	return err == nil
}

// DeleteAppCredentials removes stored app credentials
func DeleteAppCredentials() error {
	return keyring.Delete(oauthCredsService, oauthCredsKey)
}
