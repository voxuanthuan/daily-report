package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"golang.org/x/oauth2"

	"github.com/yourusername/jira-daily-report/internal/oauth"
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Manage Jira OAuth authentication",
	Long:  `Authenticate with Jira using OAuth 2.0 - just login with your Jira/Google account. No API tokens needed!`,
}

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize OAuth app credentials",
	Long:  `Set up OAuth app credentials. Get them from https://developer.atlassian.com`,
	Run: func(cmd *cobra.Command, args []string) {
		reader := bufio.NewReader(os.Stdin)

		fmt.Println("=== Jira Daily Report - OAuth Setup ===")
		fmt.Println("\nBefore continuing, make sure you have:")
		fmt.Println("1. OAuth app at https://developer.atlassian.com")
		fmt.Println("2. GitHub Pages callback (see docs/OAUTH_SETUP.md)")
		fmt.Println("\nPress Enter when ready...")
		reader.ReadString('\n')

		// Get Client ID
		fmt.Print("\nEnter Client ID: ")
		clientID, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("Failed to read input: %v", err)
		}
		clientID = strings.TrimSpace(clientID)

		if clientID == "" {
			log.Fatal("Client ID cannot be empty")
		}

		// Get Client Secret
		fmt.Print("Enter Client Secret: ")
		clientSecret, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("Failed to read input: %v", err)
		}
		clientSecret = strings.TrimSpace(clientSecret)

		if clientSecret == "" {
			log.Fatal("Client Secret cannot be empty")
		}

		// Get Callback URL (optional)
		fmt.Print("\nEnter Callback URL (e.g., https://username.github.io/oauth-callback/): ")
		fmt.Print("Or press Enter to use default: ")
		callbackURL, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("Failed to read input: %v", err)
		}
		callbackURL = strings.TrimSpace(callbackURL)

		if callbackURL == "" {
			fmt.Println("\n⚠️  No callback URL provided.")
			fmt.Println("Please follow the instructions in docs/OAUTH_SETUP.md")
			fmt.Println("to create a GitHub Pages callback URL.")
			log.Fatal("Callback URL is required")
		}

		// Save credentials
		fmt.Println("\nSaving credentials to keyring...")
		if err := oauth.SaveAppCredentials(clientID, clientSecret, callbackURL); err != nil {
			log.Fatalf("Failed to save credentials: %v", err)
		}

		fmt.Println("✓ OAuth credentials saved successfully!")
		fmt.Println("\nYou can now run: jira-report auth login")
	},
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with Jira using OAuth 2.0",
	Long:  `Start the OAuth 2.0 authentication flow. Just visit the URL in your browser and log in with your Jira or Google account.`,
	Run: func(cmd *cobra.Command, args []string) {
		// Get credentials - env vars override stored credentials
		clientID := os.Getenv("JIRA_OAUTH_CLIENT_ID")
		clientSecret := os.Getenv("JIRA_OAUTH_CLIENT_SECRET")
		callbackURL := os.Getenv("JIRA_OAUTH_CALLBACK_URL")

		// Try to load from keyring if env vars not set
		if clientID == "" || clientSecret == "" {
			creds, err := oauth.LoadAppCredentials()
			if err != nil {
				fmt.Fprintln(os.Stderr, "Error: OAuth credentials not found")
				fmt.Fprintln(os.Stderr, "\nPlease run: jira-report auth init")
				fmt.Fprintln(os.Stderr, "\nOr set environment variables:")
				fmt.Fprintln(os.Stderr, "  JIRA_OAUTH_CLIENT_ID")
				fmt.Fprintln(os.Stderr, "  JIRA_OAUTH_CLIENT_SECRET")
				os.Exit(1)
			}

			if clientID == "" {
				clientID = creds.ClientID
			}
			if clientSecret == "" {
				clientSecret = creds.ClientSecret
			}
			if callbackURL == "" {
				callbackURL = creds.CallbackURL
			}
		}

		// Create OAuth configuration
		config := oauth.NewConfig(clientID, clientSecret, callbackURL)
		authenticator := oauth.NewAuthenticator(config)

		// Perform authentication
		ctx := context.Background()
		token, err := authenticator.Authenticate(ctx)
		if err != nil {
			log.Fatalf("Authentication failed: %v", err)
		}

		// Get user info
		client := oauth.NewAtlassianClient(token)
		userInfo, err := client.GetUserInfo(ctx)
		if err == nil {
			fmt.Printf("\n✓ Logged in as: %s (%s)\n", userInfo.Name, userInfo.Email)
		}

		// Show token info
		fmt.Println("\n=== Authentication Successful ===")
		fmt.Printf("Expires At: %s\n", token.Expiry.Format(time.RFC3339))
		if token.RefreshToken != "" {
			fmt.Println("Auto-refresh: Enabled")
		}
	},
}

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove stored OAuth credentials",
	Run: func(cmd *cobra.Command, args []string) {
		config := oauth.NewConfig("", "", "")
		authenticator := oauth.NewAuthenticator(config)

		if err := authenticator.Logout(); err != nil {
			log.Fatalf("Logout failed: %v", err)
		}
	},
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current authentication status",
	Run: func(cmd *cobra.Command, args []string) {
		config := oauth.NewConfig("", "", "")
		authenticator := oauth.NewAuthenticator(config)

		if !authenticator.HasToken() {
			fmt.Println("Not authenticated")
			fmt.Println("\nRun 'jira-report auth login' to authenticate.")
			return
		}

		token, err := authenticator.GetToken()
		if err != nil {
			log.Fatalf("Failed to get token: %v", err)
		}

		verbose, _ := cmd.Flags().GetBool("verbose")

		fmt.Println("=== Authentication Status ===")
		fmt.Printf("Status: %s\n", getStatus(token))
		fmt.Printf("Expires At: %s\n", token.Expiry.Format(time.RFC3339))

		if token.RefreshToken != "" {
			fmt.Println("Auto-refresh: Enabled")
		}

		// Show token details if verbose
		if verbose {
			fmt.Println("\n=== Token Details ===")
			if len(token.AccessToken) > 20 {
				fmt.Printf("Access Token: %s...(%d chars)\n", token.AccessToken[:20], len(token.AccessToken))
			} else {
				fmt.Printf("Access Token: %s\n", token.AccessToken)
			}
			if token.RefreshToken != "" {
				if len(token.RefreshToken) > 20 {
					fmt.Printf("Refresh Token: %s...(%d chars)\n", token.RefreshToken[:20], len(token.RefreshToken))
				} else {
					fmt.Printf("Refresh Token: %s\n", token.RefreshToken)
				}
			}
			fmt.Printf("Token Type: %s\n", token.TokenType)
		}

		// Try to get user info
		ctx := context.Background()
		client := oauth.NewAtlassianClient(token)
		if userInfo, err := client.GetUserInfo(ctx); err == nil {
			fmt.Printf("\nLogged in as: %s (%s)\n", userInfo.Name, userInfo.Email)
		}
	},
}

var sitesCmd = &cobra.Command{
	Use:   "sites",
	Short: "List accessible Jira sites",
	Run: func(cmd *cobra.Command, args []string) {
		// Load credentials from keyring
		creds, err := oauth.LoadAppCredentials()
		if err != nil {
			log.Fatalf("OAuth credentials not found. Run 'jira-report auth init' first")
		}

		// Allow env override
		clientID := creds.ClientID
		clientSecret := creds.ClientSecret
		callbackURL := creds.CallbackURL

		if envID := os.Getenv("JIRA_OAUTH_CLIENT_ID"); envID != "" {
			clientID = envID
		}
		if envSecret := os.Getenv("JIRA_OAUTH_CLIENT_SECRET"); envSecret != "" {
			clientSecret = envSecret
		}
		if envURL := os.Getenv("JIRA_OAUTH_CALLBACK_URL"); envURL != "" {
			callbackURL = envURL
		}

		config := oauth.NewConfig(clientID, clientSecret, callbackURL)
		authenticator := oauth.NewAuthenticator(config)

		ctx := context.Background()
		token, err := authenticator.Authenticate(ctx)
		if err != nil {
			log.Fatalf("Authentication failed: %v", err)
		}

		client := oauth.NewAtlassianClient(token)
		sites, err := client.GetAccessibleResources(ctx)
		if err != nil {
			log.Fatalf("Failed to get sites: %v", err)
		}

		if len(sites) == 0 {
			fmt.Println("No accessible Jira sites found.")
			return
		}

		fmt.Println("=== Accessible Jira Sites ===")
		for i, site := range sites {
			fmt.Printf("\n%d. %s\n", i+1, site.Name)
			fmt.Printf("   URL: %s\n", site.URL)
			fmt.Printf("   Cloud ID: %s\n", site.ID)
		}
	},
}

func getStatus(token *oauth2.Token) string {
	if token.Expiry.Before(time.Now()) {
		return "Expired"
	}
	if time.Until(token.Expiry) < 5*time.Minute {
		return "Expiring Soon"
	}
	return "Valid"
}

func init() {
	// Add subcommands
	authCmd.AddCommand(initCmd)
	authCmd.AddCommand(loginCmd)
	authCmd.AddCommand(logoutCmd)
	authCmd.AddCommand(statusCmd)
	authCmd.AddCommand(sitesCmd)

	// Add flags
	statusCmd.Flags().BoolP("verbose", "v", false, "Show token details")

	// Add to root
	rootCmd.AddCommand(authCmd)
}
