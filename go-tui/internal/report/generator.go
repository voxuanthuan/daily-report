package report

import (
	"fmt"
	"sort"
	"time"

	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// GenerateDailyReport generates the daily standup report
func GenerateDailyReport(cfg *config.Manager, jiraClient *api.JiraClient, tempoClient *api.TempoClient) (string, error) {
	// 1. Fetch current user
	user, err := jiraClient.FetchCurrentUser()
	if err != nil {
		return "", fmt.Errorf("failed to fetch user: %w", err)
	}

	// 2. Fetch tasks (In Progress, Todo) independent of worklogs
	username := cfg.GetUsername()

	// Channels for concurrent fetching
	type taskResult struct {
		issues []model.Issue
		err    error
	}
	inProgressChan := make(chan taskResult)
	todoChan := make(chan taskResult)

	go func() {
		issues, err := jiraClient.FetchInProgressTasks(username)
		inProgressChan <- taskResult{issues, err}
	}()

	go func() {
		issues, err := jiraClient.FetchOpenTasks(username)
		todoChan <- taskResult{issues, err}
	}()

	inProgressRes := <-inProgressChan
	if inProgressRes.err != nil {
		return "", fmt.Errorf("failed to fetch in-progress tasks: %w", inProgressRes.err)
	}

	todoRes := <-todoChan
	if todoRes.err != nil {
		return "", fmt.Errorf("failed to fetch todo tasks: %w", todoRes.err)
	}

	// 3. Fetch Worklogs (last 6 days to find previous workday)
	worklogs, err := tempoClient.FetchLastSixDaysWorklogs(user.AccountID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch worklogs: %w", err)
	}

	enrichedWorklogs, err := tempoClient.EnrichWorklogsWithIssueDetails(worklogs)
	if err != nil {
		return "", fmt.Errorf("failed to enrich worklogs: %w", err)
	}

	// 4. Extract Previous Workday Tasks
	prevWorkdayTasks, prevDate := extractPreviousWorkdayTasks(enrichedWorklogs)
	_ = prevDate // We can use this to make a smart label if needed "Yesterday (Tue)" etc.

	// 5. Build Report
	report := BuildMainReport(prevWorkdayTasks, inProgressRes.issues, prevDate)
	todoList := BuildTodoList(todoRes.issues, inProgressRes.issues)

	// Combine
	finalReport := report + todoList

	return finalReport, nil
}

// extractPreviousWorkdayTasks groups worklogs by date and returns tasks from the most recent previous workday
func extractPreviousWorkdayTasks(worklogs []model.Worklog) ([]model.Worklog, time.Time) {
	// Group by date
	dateMap := make(map[string][]model.Worklog)
	for _, w := range worklogs {
		dateMap[w.StartDate] = append(dateMap[w.StartDate], w)
	}

	// Sort dates descending
	var dates []string
	for d := range dateMap {
		dates = append(dates, d)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(dates)))

	// Find first date that is NOT today
	today := time.Now().Format("2006-01-02")

	for _, d := range dates {
		if d < today {
			// Found previous day
			parsedDate, _ := time.Parse("2006-01-02", d)
			return dateMap[d], parsedDate
		}
	}

	return []model.Worklog{}, time.Time{}
}
