package oauth

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/pkg/browser"
	"golang.org/x/oauth2"
)

// Authenticator handles the complete OAuth flow
type Authenticator struct {
	config   *Config
	store    *TokenStore
	OnStatus func(status string) // UX: Callbacks for progress updates
}

// NewAuthenticator creates a new authenticator
func NewAuthenticator(config *Config) *Authenticator {
	return &Authenticator{
		config:   config,
		store:    NewTokenStore(),
		OnStatus: func(s string) { fmt.Fprintln(os.Stderr, s) },
	}
}

// Authenticate performs OAuth authentication
// First tries to use existing valid token, otherwise starts new auth flow
func (a *Authenticator) Authenticate(ctx context.Context) (*oauth2.Token, error) {
	// Try to use existing valid token first
	if token, err := a.store.GetValidToken(ctx, a.config); err == nil {
		a.OnStatus("✓ Using cached authentication")
		return token, nil
	}

	// No valid token, start authentication flow
	return a.startAuthFlow(ctx)
}

// startAuthFlow begins the OAuth authorization flow with browser support
func (a *Authenticator) startAuthFlow(ctx context.Context) (*oauth2.Token, error) {
	a.OnStatus("🔐 Starting authentication...")

	// Generate PKCE values
	codeVerifier, err := GenerateCodeVerifier()
	if err != nil {
		return nil, fmt.Errorf("failed to generate code verifier: %w", err)
	}

	codeChallenge := GenerateCodeChallenge(codeVerifier)

	// Generate state for CSRF protection
	state, err := GenerateState()
	if err != nil {
		return nil, fmt.Errorf("failed to generate state: %w", err)
	}

	// Try browser flow first, fallback to manual if it fails
	token, err := a.tryBrowserFlow(ctx, state, codeChallenge, codeVerifier)
	if err != nil {
		a.OnStatus("⚠️  Browser flow failed, falling back to manual flow...")
		return a.tryManualFlow(ctx, state, codeChallenge, codeVerifier)
	}

	return token, nil
}

// tryBrowserFlow attempts browser-based OAuth with callback server
func (a *Authenticator) tryBrowserFlow(ctx context.Context, state, codeChallenge, codeVerifier string) (*oauth2.Token, error) {
	// Start callback server with dynamic port
	callbackServer := NewCallbackServer(state)
	callbackAddr, err := callbackServer.Start()
	if err != nil {
		return nil, fmt.Errorf("failed to start callback server: %w", err)
	}
	defer callbackServer.Shutdown()

	// Update redirect URL with dynamic port
	originalRedirectURL := a.config.GetBaseConfig().RedirectURL
	a.config.GetBaseConfig().RedirectURL = callbackAddr

	// Build authorization URL
	authURL := a.buildAuthorizationURL(state, codeChallenge)

	// Try to open browser
	a.OnStatus("🌐 Opening browser for authentication...")
	if err := browser.OpenURL(authURL); err != nil {
		// Restore original redirect URL
		a.config.GetBaseConfig().RedirectURL = originalRedirectURL
		return nil, fmt.Errorf("failed to open browser: %w", err)
	}

	a.OnStatus("⏳ Waiting for browser authentication...")

	// Wait for callback with progress indicator
	done := make(chan struct{})
	go a.showProgress(done)

	authCode, err := callbackServer.WaitForAuthCode(ctx)
	close(done)

	// Restore original redirect URL
	a.config.GetBaseConfig().RedirectURL = originalRedirectURL

	if err != nil {
		return nil, err
	}

	a.OnStatus("🔄 Exchanging authorization code...")

	// Exchange code for token
	token, err := a.exchangeCodeForToken(ctx, authCode, codeVerifier)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	// Store token
	a.OnStatus("💾 Saving credentials...")
	if err := a.store.SaveToken(token); err != nil {
		a.OnStatus(fmt.Sprintf("⚠️  Warning: could not save token: %v", err))
	}

	a.OnStatus("✅ Authentication successful!")
	return token, nil
}

// tryManualFlow uses the manual copy-paste flow as fallback
func (a *Authenticator) tryManualFlow(ctx context.Context, state, codeChallenge, codeVerifier string) (*oauth2.Token, error) {
	// Build authorization URL
	authURL := a.buildAuthorizationURL(state, codeChallenge)

	// Display instructions to user
	fmt.Println("\n=== OAuth Authentication (Manual Flow) ===")
	fmt.Println("\n1. Visit the following URL in your browser:")
	fmt.Println(authURL)
	fmt.Println("\n2. Log in to your Jira account and authorize the app")
	fmt.Println("3. After authorization, you'll be redirected to a page")
	fmt.Println("4. Copy the authorization code from the page")
	fmt.Println("5. Paste the code below")

	// Read authorization code from user
	authCode, err := a.readAuthCode()
	if err != nil {
		return nil, fmt.Errorf("failed to read authorization code: %w", err)
	}

	// Exchange code for token
	token, err := a.exchangeCodeForToken(ctx, authCode, codeVerifier)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	// Store token
	if err := a.store.SaveToken(token); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: failed to store token: %v\n", err)
		fmt.Println("You'll need to authenticate again next time.")
	} else {
		fmt.Println("\n✓ Authentication successful! Token saved.")
	}

	return token, nil
}

// buildAuthorizationURL creates the authorization URL with all required parameters
func (a *Authenticator) buildAuthorizationURL(state, codeChallenge string) string {
	config := a.config.GetBaseConfig()

	// Build URL with Atlassian-specific parameters
	url := config.AuthCodeURL(state,
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
		oauth2.SetAuthURLParam("audience", "api.atlassian.com"),
		oauth2.SetAuthURLParam("prompt", "consent"),
	)

	return url
}

// readAuthCode reads the authorization code from user input
func (a *Authenticator) readAuthCode() (string, error) {
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("Enter authorization code (or 'q' to quit): ")
		input, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}

		input = strings.TrimSpace(input)

		if input == "q" || input == "Q" {
			return "", fmt.Errorf("authentication cancelled by user")
		}

		if input == "" {
			fmt.Println("Please enter a code.")
			continue
		}

		return input, nil
	}
}

// exchangeCodeForToken exchanges the authorization code for an access token
func (a *Authenticator) exchangeCodeForToken(ctx context.Context, authCode, codeVerifier string) (*oauth2.Token, error) {
	config := a.config.GetBaseConfig()

	token, err := config.Exchange(ctx, authCode,
		oauth2.SetAuthURLParam("code_verifier", codeVerifier))
	if err != nil {
		return nil, fmt.Errorf("token exchange failed: %w", err)
	}

	return token, nil
}

// showProgress displays a simple progress indicator
func (a *Authenticator) showProgress(done chan struct{}) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	elapsed := 0
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			elapsed += 30
			remaining := 180 - elapsed
			if remaining > 0 {
				a.OnStatus(fmt.Sprintf("⏳ Still waiting... (%d seconds remaining)", remaining))
			}
		}
	}
}

// Logout removes stored tokens
func (a *Authenticator) Logout() error {
	if err := a.store.DeleteToken(); err != nil {
		return fmt.Errorf("failed to delete tokens: %w", err)
	}
	fmt.Println("✓ Logged out successfully")
	return nil
}

// HasToken returns true if a valid token exists
func (a *Authenticator) HasToken() bool {
	return a.store.HasToken()
}

// IsAuthenticated checks if valid credentials exist
func (a *Authenticator) IsAuthenticated(ctx context.Context) bool {
	_, err := a.store.GetValidToken(ctx, a.config)
	return err == nil
}

// GetToken returns the current access token (valid or not)
func (a *Authenticator) GetToken() (*oauth2.Token, error) {
	return a.store.LoadToken()
}
