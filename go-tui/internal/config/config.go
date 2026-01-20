package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the application configuration
type Config struct {
	JiraServer    string `json:"jiraServer"`
	Username      string `json:"username"`
	ApiToken      string `json:"apiToken"`
	TempoApiToken string `json:"tempoApiToken"`
	WhoAmI        string `json:"whoAmI"`
	AutoClipboard bool   `json:"autoClipboard"`
	Theme         string `json:"theme"`
}

// Manager handles configuration loading and access
type Manager struct {
	config *Config
}

// NewManager creates a new configuration manager
func NewManager() (*Manager, error) {
	config, err := loadConfig()
	if err != nil {
		return nil, err
	}
	return &Manager{config: config}, nil
}

// loadConfig reads the configuration from ~/.jira-daily-report.json or environment variables
func loadConfig() (*Config, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	configPath := filepath.Join(homeDir, ".jira-daily-report.json")

	// Try to load from file first
	var config Config
	if data, err := os.ReadFile(configPath); err == nil {
		if err := json.Unmarshal(data, &config); err != nil {
			return nil, fmt.Errorf("failed to parse config file: %w", err)
		}
	}

	// Override with environment variables if present
	if val := os.Getenv("JIRA_SERVER"); val != "" {
		config.JiraServer = val
	}
	if val := os.Getenv("JIRA_EMAIL"); val != "" {
		config.Username = val
	}
	if val := os.Getenv("JIRA_USERNAME"); val != "" {
		config.Username = val
	}
	if val := os.Getenv("JIRA_API_TOKEN"); val != "" {
		config.ApiToken = val
	}
	if val := os.Getenv("TEMPO_API_TOKEN"); val != "" {
		config.TempoApiToken = val
	}
	if val := os.Getenv("JIRA_ACCOUNT_ID"); val != "" {
		config.WhoAmI = val
	}
	if val := os.Getenv("JIRA_WHOAMI"); val != "" {
		config.WhoAmI = val
	}
	if val := os.Getenv("JIRA_THEME"); val != "" {
		config.Theme = val
	}

	// Validate required fields
	if config.JiraServer == "" {
		return nil, fmt.Errorf("JIRA_SERVER is required (set via config file or environment variable)")
	}
	if config.Username == "" {
		return nil, fmt.Errorf("JIRA_EMAIL/JIRA_USERNAME is required (set via config file or environment variable)")
	}
	if config.ApiToken == "" {
		return nil, fmt.Errorf("JIRA_API_TOKEN is required (set via config file or environment variable)")
	}
	if config.TempoApiToken == "" {
		return nil, fmt.Errorf("TEMPO_API_TOKEN is required (set via config file or environment variable)")
	}

	// Set default for WhoAmI if not provided
	if config.WhoAmI == "" {
		config.WhoAmI = "Developer"
	}

	return &config, nil
}

// GetJiraServer returns the Jira server URL
func (m *Manager) GetJiraServer() string {
	return m.config.JiraServer
}

// GetUsername returns the Jira username/email
func (m *Manager) GetUsername() string {
	return m.config.Username
}

// GetApiToken returns the Jira API token
func (m *Manager) GetApiToken() string {
	return m.config.ApiToken
}

// GetTempoApiToken returns the Tempo API token
func (m *Manager) GetTempoApiToken() string {
	return m.config.TempoApiToken
}

// GetWhoAmI returns the user account ID
func (m *Manager) GetWhoAmI() string {
	return m.config.WhoAmI
}

// GetTheme returns the theme setting
func (m *Manager) GetTheme() string {
	if m.config.Theme == "" {
		return "dark"
	}
	return m.config.Theme
}

// GetAutoClipboard returns the auto clipboard setting
func (m *Manager) GetAutoClipboard() bool {
	return m.config.AutoClipboard
}

// GetConfig returns the underlying configuration
func (m *Manager) GetConfig() *Config {
	return m.config
}
