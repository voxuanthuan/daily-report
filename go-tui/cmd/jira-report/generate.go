package main

import (
	"fmt"
	"log"
	"os"

	"github.com/atotto/clipboard"
	"github.com/spf13/cobra"
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/report"
)

var (
	outputFile    string
	outputFormat  string
	copyClipboard bool
	silent        bool
)

var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Generate daily standup report",
	Long:  `Generate a daily standup report from your Jira tasks and Tempo worklogs.`,
	Run: func(cmd *cobra.Command, args []string) {
		// Load configuration
		cfg, err := config.NewManager()
		if err != nil {
			log.Fatalf("Failed to load configuration: %v", err)
		}

		if !silent {
			fmt.Println("Generating daily report...")
		}

		// Initialize clients
		jiraClient := api.NewJiraClient(
			cfg.GetJiraServer(),
			cfg.GetUsername(),
			cfg.GetApiToken(),
		)

		tempoClient := api.NewTempoClient(
			cfg.GetTempoApiToken(),
			jiraClient,
		)

		// Generate report
		reportContent, err := report.GenerateDailyReport(cfg, jiraClient, tempoClient)
		if err != nil {
			log.Fatalf("Failed to generate report: %v", err)
		}

		// Handle output
		if outputFile != "" {
			err := os.WriteFile(outputFile, []byte(reportContent), 0644)
			if err != nil {
				log.Fatalf("Failed to write output file: %v", err)
			}
			if !silent {
				fmt.Printf("Report written to %s\n", outputFile)
			}
		} else {
			// Print to stdout
			fmt.Println(reportContent)
		}

		// Handle clipboard
		if copyClipboard || cfg.GetAutoClipboard() {
			err := clipboard.WriteAll(reportContent)
			if err != nil {
				if !silent {
					fmt.Printf("Warning: Failed to copy to clipboard: %v\n", err)
				}
			} else {
				if !silent {
					fmt.Println("Report copied to clipboard!")
				}
			}
		}
	},
}

func init() {
	generateCmd.Flags().StringVarP(&outputFile, "output", "o", "", "Output file path")
	generateCmd.Flags().StringVarP(&outputFormat, "format", "f", "text", "Output format (text currently supported)")
	generateCmd.Flags().BoolVarP(&copyClipboard, "clipboard", "c", false, "Copy report to clipboard")
	generateCmd.Flags().BoolVarP(&silent, "silent", "s", false, "Suppress info messages")

	rootCmd.AddCommand(generateCmd)
}
