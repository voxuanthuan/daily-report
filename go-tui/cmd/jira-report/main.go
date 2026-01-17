package main

import (
	"fmt"
	"log"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/tui"
)

var rootCmd = &cobra.Command{
	Use:   "jira-report",
	Short: "Jira Daily Report - Generate daily standup reports and manage tasks",
	Long: `A fast, performant TUI for managing Jira tasks, 
logging time to Tempo, and generating daily reports.`,
}

var tuiCmd = &cobra.Command{
	Use:   "tui",
	Short: "Launch the interactive terminal UI",
	Run: func(cmd *cobra.Command, args []string) {
		// Load configuration
		cfg, err := config.NewManager()
		if err != nil {
			log.Fatal("Failed to load configuration:", err)
		}

		// Create and run Bubble Tea TUI
		model := tui.NewModel(cfg)
		p := tea.NewProgram(model, tea.WithAltScreen())

		if _, err := p.Run(); err != nil {
			log.Fatal("Error running TUI:", err)
		}
	},
}

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage configuration",
	Long:  `Configure Jira and Tempo API credentials`,
}

var configInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize configuration interactively",
	Run: func(cmd *cobra.Command, args []string) {
		if err := config.InitInteractive(); err != nil {
			log.Fatal("Failed to initialize config:", err)
		}
	},
}

var configShowCmd = &cobra.Command{
	Use:   "show",
	Short: "Show current configuration",
	Run: func(cmd *cobra.Command, args []string) {
		if err := config.ShowConfig(); err != nil {
			log.Fatal("Failed to show config:", err)
		}
	},
}

func init() {
	configCmd.AddCommand(configInitCmd)
	configCmd.AddCommand(configShowCmd)
	rootCmd.AddCommand(tuiCmd)
	rootCmd.AddCommand(configCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
