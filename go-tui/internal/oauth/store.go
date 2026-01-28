package oauth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/zalando/go-keyring"
	"golang.org/x/oauth2"
)

const (
	// Service name for keyring storage
	serviceName = "jira-daily-report"
)

// SecureToken wraps oauth2.Token with additional metadata
type SecureToken struct {
	*oauth2.Token
	InstanceURL string    `json:"instance_url"`
	CreatedAt   time.Time `json:"created_at"`
	DeviceHash  string    `json:"device_hash"` // SECURITY: Token binding
}

// TokenStore handles secure token persistence with security enhancements
type TokenStore struct {
	instanceURL string
	deviceHash  string
}

// NewTokenStore creates a new token store with device binding
func NewTokenStore() *TokenStore {
	return &TokenStore{
		deviceHash: generateDeviceHash(),
	}
}

// NewTokenStoreWithInstance creates a token store for a specific instance
func NewTokenStoreWithInstance(instanceURL string) *TokenStore {
	return &TokenStore{
		instanceURL: instanceURL,
		deviceHash:  generateDeviceHash(),
	}
}

// generateDeviceHash creates a unique hash for token binding
// This prevents token theft from being useful on other devices
func generateDeviceHash() string {
	hostname, _ := os.Hostname()
	user := os.Getenv("USER")
	if user == "" {
		user = os.Getenv("USERNAME") // Windows
	}

	data := hostname + ":" + user
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:8]) // First 8 bytes is enough
}

// getUserKey returns instance-specific storage key
func (s *TokenStore) getUserKey() string {
	if s.instanceURL == "" {
		// Default key for backward compatibility
		return "oauth-access-token"
	}
	// SECURITY: Store tokens per instance to support multiple Jira accounts
	hash := sha256.Sum256([]byte(s.instanceURL))
	return "oauth-token-" + hex.EncodeToString(hash[:8])
}

// SaveToken stores the token securely with metadata
func (s *TokenStore) SaveToken(token *oauth2.Token) error {
	secureToken := &SecureToken{
		Token:       token,
		InstanceURL: s.instanceURL,
		CreatedAt:   time.Now(),
		DeviceHash:  s.deviceHash,
	}

	tokenData, err := json.Marshal(secureToken)
	if err != nil {
		return fmt.Errorf("failed to marshal token: %w", err)
	}

	if err := keyring.Set(serviceName, s.getUserKey(), string(tokenData)); err != nil {
		// Fallback to file storage if keyring fails
		return s.saveTokenToFile(secureToken)
	}

	return nil
}

// LoadToken retrieves the stored token with validation
func (s *TokenStore) LoadToken() (*oauth2.Token, error) {
	// Try keyring first
	tokenData, err := keyring.Get(serviceName, s.getUserKey())
	if err != nil {
		// Fallback to file storage
		return s.loadTokenFromFile()
	}

	var secureToken SecureToken
	if err := json.Unmarshal([]byte(tokenData), &secureToken); err != nil {
		return nil, fmt.Errorf("failed to unmarshal token: %w", err)
	}

	// SECURITY: Validate token binding - prevent use on different devices
	if secureToken.DeviceHash != s.deviceHash {
		s.DeleteToken() // Remove compromised token
		return nil, fmt.Errorf("token was created on a different device")
	}

	// SECURITY: Validate instance URL matches (if set)
	if s.instanceURL != "" && secureToken.InstanceURL != s.instanceURL {
		return nil, fmt.Errorf("token instance mismatch")
	}

	return secureToken.Token, nil
}

// DeleteToken removes stored tokens (logout)
func (s *TokenStore) DeleteToken() error {
	if err := keyring.Delete(serviceName, s.getUserKey()); err != nil {
		// Ignore if not found
	}
	// Also delete file-based backup
	s.deleteTokenFile()
	return nil
}

// GetValidToken ensures we have a valid token, refreshing if needed
func (s *TokenStore) GetValidToken(ctx context.Context, config *Config) (*oauth2.Token, error) {
	token, err := s.LoadToken()
	if err != nil {
		return nil, err
	}

	// Check if token is about to expire (within 5 minutes)
	if time.Until(token.Expiry) < 5*time.Minute {
		if token.RefreshToken == "" {
			return nil, fmt.Errorf("token expired and no refresh token available")
		}

		// Attempt refresh
		newToken, err := s.refreshToken(ctx, config, token)
		if err != nil {
			return nil, err
		}
		return newToken, nil
	}

	return token, nil
}

// refreshToken handles token refresh with retry logic
func (s *TokenStore) refreshToken(ctx context.Context, config *Config, token *oauth2.Token) (*oauth2.Token, error) {
	const maxRetries = 3
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		newToken, err := config.GetBaseConfig().TokenSource(ctx, token).Token()
		if err == nil {
			if saveErr := s.SaveToken(newToken); saveErr != nil {
				return nil, fmt.Errorf("failed to save refreshed token: %w", saveErr)
			}
			return newToken, nil
		}
		lastErr = err

		// Exponential backoff
		time.Sleep(time.Duration(1<<i) * time.Second)
	}

	return nil, fmt.Errorf("failed to refresh token after %d attempts: %w", maxRetries, lastErr)
}

// HasToken returns true if a token exists in storage
func (s *TokenStore) HasToken() bool {
	_, err := s.LoadToken()
	return err == nil
}

// saveTokenToFile is a fallback if keyring is not available
func (s *TokenStore) saveTokenToFile(secureToken *SecureToken) error {
	tokenData, err := json.Marshal(secureToken)
	if err != nil {
		return err
	}
	return keyring.Set(serviceName, s.getUserKey()+"_file", string(tokenData))
}

// loadTokenFromFile is a fallback if keyring is not available
func (s *TokenStore) loadTokenFromFile() (*oauth2.Token, error) {
	tokenData, err := keyring.Get(serviceName, s.getUserKey()+"_file")
	if err != nil {
		return nil, err
	}

	var secureToken SecureToken
	if err := json.Unmarshal([]byte(tokenData), &secureToken); err != nil {
		return nil, err
	}

	// SECURITY: Validate token binding even for file-based tokens
	if secureToken.DeviceHash != s.deviceHash {
		s.DeleteToken()
		return nil, fmt.Errorf("token was created on a different device")
	}

	return secureToken.Token, nil
}

// deleteTokenFile removes file-based token storage
func (s *TokenStore) deleteTokenFile() {
	keyring.Delete(serviceName, s.getUserKey()+"_file")
}
