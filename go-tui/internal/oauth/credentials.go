package oauth

// Default OAuth credentials for the jira-daily-report application
// These are embedded in the application so users don't need to provide them
//
// To update these for your own OAuth app:
// 1. Go to https://developer.atlassian.com
// 2. Create/Edit your OAuth app
// 3. Copy Client ID and Secret from Settings
// 4. Update the values below
// 5. Rebuild the application
const (
	// DefaultClientID is the OAuth Client ID for this application
	// Replace with your own app's Client ID
	DefaultClientID = "YOUR_CLIENT_ID_HERE"

	// DefaultClientSecret is the OAuth Client Secret for this application
	// Replace with your own app's Client Secret
	DefaultClientSecret = "YOUR_CLIENT_SECRET_HERE"

	// DefaultCallbackURL is the OAuth callback URL
	// Replace with your GitHub Pages URL: https://YOUR_USERNAME.github.io/oauth-callback/
	// See docs/OAUTH_SETUP.md for instructions
	// This must match what's configured in your Atlassian app settings
	DefaultCallbackURL = "https://YOUR_USERNAME.github.io/oauth-callback/"
)

// GetDefaultCredentials returns the embedded OAuth credentials
func GetDefaultCredentials() (clientID, clientSecret, callbackURL string) {
	return DefaultClientID, DefaultClientSecret, DefaultCallbackURL
}

// HasDefaultCredentials returns true if default credentials are configured
// (not the placeholder values)
func HasDefaultCredentials() bool {
	return DefaultClientID != "YOUR_CLIENT_ID_HERE" &&
		DefaultClientSecret != "YOUR_CLIENT_SECRET_HERE"
}
