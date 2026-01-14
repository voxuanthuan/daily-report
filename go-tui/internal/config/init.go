package config

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	"golang.org/x/term"
)

// InitInteractive runs an interactive configuration setup
func InitInteractive() error {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("🔧 Jira Daily Report - Configuration Setup")
	fmt.Println("==========================================")
	fmt.Println()

	// Jira Server
	fmt.Print("Jira Server URL (e.g., https://your-domain.atlassian.net): ")
	jiraServer, _ := reader.ReadString('\n')
	jiraServer = strings.TrimSpace(jiraServer)

	// Username/Email
	fmt.Print("Jira Email/Username: ")
	username, _ := reader.ReadString('\n')
	username = strings.TrimSpace(username)

	// API Token (hidden input)
	fmt.Print("Jira API Token (hidden): ")
	apiTokenBytes, _ := term.ReadPassword(int(syscall.Stdin))
	apiToken := string(apiTokenBytes)
	fmt.Println()

	// Tempo API Token (hidden input)
	fmt.Print("Tempo API Token (hidden): ")
	tempoTokenBytes, _ := term.ReadPassword(int(syscall.Stdin))
	tempoToken := string(tempoTokenBytes)
	fmt.Println()

	// Account ID
	fmt.Print("Jira Account ID (whoAmI): ")
	whoAmI, _ := reader.ReadString('\n')
	whoAmI = strings.TrimSpace(whoAmI)

	// Optional settings
	fmt.Print("Theme (default: dark): ")
	theme, _ := reader.ReadString('\n')
	theme = strings.TrimSpace(theme)
	if theme == "" {
		theme = "dark"
	}

	// Create config
	config := Config{
		JiraServer:    jiraServer,
		Username:      username,
		ApiToken:      apiToken,
		TempoApiToken: tempoToken,
		WhoAmI:        whoAmI,
		AutoClipboard: false,
		Theme:         theme,
	}

	// Save config
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	configPath := filepath.Join(homeDir, ".jira-daily-report.json")

	// Check if file exists
	if _, err := os.Stat(configPath); err == nil {
		fmt.Printf("\n⚠️  Config file already exists at: %s\n", configPath)
		fmt.Print("Overwrite? (y/N): ")
		confirm, _ := reader.ReadString('\n')
		if strings.ToLower(strings.TrimSpace(confirm)) != "y" {
			fmt.Println("❌ Cancelled")
			return nil
		}
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	fmt.Printf("\n✅ Config saved to: %s\n", configPath)
	fmt.Println("\n🚀 You can now run: jira-report tui")

	return nil
}

// ShowConfig displays the current configuration (excluding sensitive data)
func ShowConfig() error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}

	fmt.Println("📋 Current Configuration")
	fmt.Println("=======================")
	fmt.Printf("Jira Server:  %s\n", cfg.JiraServer)
	fmt.Printf("Username:     %s\n", cfg.Username)
	fmt.Printf("API Token:    %s\n", maskToken(cfg.ApiToken))
	fmt.Printf("Tempo Token:  %s\n", maskToken(cfg.TempoApiToken))
	fmt.Printf("Account ID:   %s\n", cfg.WhoAmI)
	fmt.Printf("Theme:        %s\n", cfg.Theme)

	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".jira-daily-report.json")
	fmt.Printf("\nLocation: %s\n", configPath)

	return nil
}

func maskToken(token string) string {
	if len(token) < 8 {
		return "****"
	}
	return token[:4] + "****" + token[len(token)-4:]
}
