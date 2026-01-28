package oauth

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPKCEGeneration(t *testing.T) {
	verifier, err := GenerateCodeVerifier()
	assert.NoError(t, err)
	assert.NotEmpty(t, verifier)
	assert.Len(t, verifier, 43) // Base64URL encoded 32 bytes

	challenge := GenerateCodeChallenge(verifier)
	assert.NotEmpty(t, challenge)
	assert.Len(t, challenge, 43) // Base64URL encoded SHA256
}

func TestStateGeneration(t *testing.T) {
	state, err := GenerateState()
	assert.NoError(t, err)
	assert.Len(t, state, 43) // Base64URL encoded 32 bytes (increased from 16)

	// Ensure uniqueness
	state2, err := GenerateState()
	assert.NoError(t, err)
	assert.NotEqual(t, state, state2, "States should be unique")
}

func TestDeviceHashConsistency(t *testing.T) {
	hash1 := generateDeviceHash()
	hash2 := generateDeviceHash()
	assert.Equal(t, hash1, hash2, "Device hash should be consistent")
	assert.NotEmpty(t, hash1)
}

func TestCallbackServerDynamicPort(t *testing.T) {
	server := NewCallbackServer("test-state")
	addr, err := server.Start()
	assert.NoError(t, err)
	assert.Contains(t, addr, "http://127.0.0.1:")
	assert.NotContains(t, addr, ":0/") // Should have actual port

	port := server.GetPort()
	assert.Greater(t, port, 0)
	assert.Less(t, port, 65536)

	server.Shutdown()
}

func TestTokenStoreInstanceKey(t *testing.T) {
	store1 := NewTokenStoreWithInstance("https://example.atlassian.net")
	store2 := NewTokenStoreWithInstance("https://example.atlassian.net")
	store3 := NewTokenStoreWithInstance("https://different.atlassian.net")

	// Same instance should have same key
	assert.Equal(t, store1.getUserKey(), store2.getUserKey())

	// Different instance should have different key
	assert.NotEqual(t, store1.getUserKey(), store3.getUserKey())
}

func TestNewTokenStoreBackwardCompatibility(t *testing.T) {
	// NewTokenStore without instance should use default key
	store := NewTokenStore()
	assert.Equal(t, "oauth-access-token", store.getUserKey())
}
