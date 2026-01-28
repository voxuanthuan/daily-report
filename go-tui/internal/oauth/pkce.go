package oauth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// GenerateCodeVerifier creates a cryptographically random code verifier for PKCE
// Returns a 43-character URL-safe base64 encoded string
func GenerateCodeVerifier() (string, error) {
	data := make([]byte, 32)
	if _, err := rand.Read(data); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	// Use RawURLEncoding to remove padding
	return base64.RawURLEncoding.EncodeToString(data), nil
}

// GenerateCodeChallenge creates a code challenge from the verifier using SHA256
// This is required for the S256 PKCE method
func GenerateCodeChallenge(verifier string) string {
	hash := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(hash[:])
}

// GenerateState creates a random state parameter for CSRF protection
// The state should be unique per authentication request
// Using 32 bytes (256 bits) for cryptographic strength
func GenerateState() (string, error) {
	data := make([]byte, 32)
	if _, err := rand.Read(data); err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}
