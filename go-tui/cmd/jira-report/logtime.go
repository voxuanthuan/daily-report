package main

import (
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
)

var (
	date          string
	description   string
	logtimeSilent bool
)

type timeEntry struct {
	key      string
	duration string
}

var logtimeCmd = &cobra.Command{
	Use:   "logtime <entries>",
	Short: "Log time to Tempo",
	Long: `Log time to Tempo using a simple format: "KEY-123 2h, KEY-456 1.5h". 
Separated by comma. Supported units: h, m.`,
	Args: cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		entriesStr := args[0]

		// Load configuration
		cfg, err := config.NewManager()
		if err != nil {
			log.Fatalf("Failed to load configuration: %v", err)
		}

		if !logtimeSilent {
			fmt.Println("Processing time logs...")
		}

		// Initialize clients - prefer OAuth if available
		var jiraClient *api.JiraClient
		if oauthToken := cfg.GetOAuthToken(); oauthToken != "" {
			jiraClient = api.NewOAuthJiraClient(cfg.GetJiraServer(), oauthToken)
		} else {
			jiraClient = api.NewJiraClient(
				cfg.GetJiraServer(),
				cfg.GetUsername(),
				cfg.GetApiToken(),
			)
		}

		tempoClient := api.NewTempoClient(
			cfg.GetTempoApiToken(),
			jiraClient,
		)

		// Fetch user to get account ID
		user, err := jiraClient.FetchCurrentUser()
		if err != nil {
			log.Fatalf("Failed to fetch user info: %v", err)
		}

		// Parse date
		targetDate := time.Now()
		if date == "yesterday" {
			targetDate = targetDate.AddDate(0, 0, -1)
		} else if date != "today" {
			parsed, err := time.Parse("2006-01-02", date)
			if err != nil {
				log.Fatalf("Invalid date format. Use 'today', 'yesterday', or YYYY-MM-DD: %v", err)
			}
			targetDate = parsed
		}

		// Parse entries
		// Format: "KEY-123 2h, KEY-456 1.5h"
		// Regex to find chunks
		entryList := parseEntries(entriesStr)
		if len(entryList) == 0 {
			log.Fatal("No valid entries found. Format example: 'KEY-123 2h, KEY-456 30m'")
		}

		// Execute logs
		successCount := 0
		for _, entry := range entryList {
			// Reuse LogTimeAction logic for parsing time string to seconds?
			// actions package has LogTimeAction but it takes "2h" string and parses inside?
			// Let's check `actions.NewLogTimeAction`...
			// It converts timeValue string to int seconds inside `Execute`? No, let's look at `log_time_action.go`.
			// Ah, `actions.NewLogTimeAction` takes `timeValue string`.
			// `Execute` does `ParseTimeInput(a.timeValue)`.
			// So we can reuse that logic if we duplicate it or make it public.
			// Ideally we move `ParseTimeInput` to a shared helper.
			// For now, let's reimplement simple parsing or use `actions` if possible.
			// But `actions` depends on `state` and `tea`.

			// Simple parse here for CLI independence
			seconds, err := parseDuration(entry.duration)
			if err != nil {
				fmt.Printf("❌ Failed to parse duration for %s: %v\n", entry.key, err)
				continue
			}

			if !logtimeSilent {
				fmt.Printf("⏳ Logging %s to %s...\n", entry.duration, entry.key)
			}

			// Need to resolve Issue Key to Issue ID
			issue, err := jiraClient.FetchIssue(entry.key)
			if err != nil {
				fmt.Printf("❌ Failed to find issue %s: %v\n", entry.key, err)
				continue
			}

			issueID, _ := strconv.Atoi(issue.ID)

			// Fetch user to get account ID if not already fetched
			// But wait, we need user account ID for each call?
			// Actually we can fetch user once outside the loop?
			// Yes, fetch user once BEFORE loop.
			// But wait, `logtime.go` defines `user` inside?
			// No, previous edit was inside loop. Let's do it properly.
			// CreateWorklog(issueID, seconds, startDate, description, authorAccountID)

			// We need `user` variable.
			// Let's assume we fetch user before loop.

			_, err = tempoClient.CreateWorklog(issueID, seconds, targetDate.Format("2006-01-02"), description, user.AccountID)
			if err != nil {
				fmt.Printf("❌ Failed to log time for %s: %v\n", entry.key, err)
			} else {
				fmt.Printf("✓ Logged %s to %s\n", entry.duration, entry.key)
				successCount++
			}
		}

		if !logtimeSilent {
			fmt.Printf("\nSuccessfully logged %d/%d entries.\n", successCount, len(entryList))
		}
	},
}

func parseEntries(input string) []timeEntry {
	var entries []timeEntry
	parts := strings.Split(input, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Split by space: KEY-123 2h
		// Careful with multiple spaces
		fields := strings.Fields(part)
		if len(fields) >= 2 {
			entries = append(entries, timeEntry{
				key:      fields[0],
				duration: strings.Join(fields[1:], ""), // "2h 30m" -> "2h30m" for parser?
			})
		}
	}
	return entries
}

func parseDuration(input string) (int, error) {
	// Basic parser for "1.5h", "2h", "30m", "1h 30m"
	// Normalize
	input = strings.ToLower(strings.ReplaceAll(input, " ", ""))

	totalSeconds := 0

	// Regex for component parsing
	re := regexp.MustCompile(`(\d+(\.\d+)?)([hm])`)
	matches := re.FindAllStringSubmatch(input, -1)

	if len(matches) == 0 {
		// Try parsing as simple number (hours)
		if val, err := strconv.ParseFloat(input, 64); err == nil {
			return int(val * 3600), nil
		}
		return 0, fmt.Errorf("invalid format")
	}

	for _, match := range matches {
		val, err := strconv.ParseFloat(match[1], 64)
		if err != nil {
			continue
		}
		unit := match[3]

		if unit == "h" {
			totalSeconds += int(val * 3600)
		} else if unit == "m" {
			totalSeconds += int(val * 60)
		}
	}

	return totalSeconds, nil
}

func init() {
	logtimeCmd.Flags().StringVarP(&date, "date", "d", "today", "Date to log time (today, yesterday, YYYY-MM-DD)")
	logtimeCmd.Flags().StringVar(&description, "description", "", "Worklog description")
	logtimeCmd.Flags().BoolVarP(&logtimeSilent, "silent", "s", false, "Suppress info messages")

	rootCmd.AddCommand(logtimeCmd)
}
