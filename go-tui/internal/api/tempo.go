package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

const tempoBaseURL = "https://api.tempo.io/4"

// TempoClient handles Tempo API requests
type TempoClient struct {
	apiToken   string
	jiraClient *JiraClient
	client     *http.Client
}

// NewTempoClient creates a new Tempo API client
func NewTempoClient(apiToken string, jiraClient *JiraClient) *TempoClient {
	return &TempoClient{
		apiToken:   apiToken,
		jiraClient: jiraClient,
		client:     &http.Client{},
	}
}

// FetchWorklogs retrieves worklogs for a date range
func (c *TempoClient) FetchWorklogs(accountID, startDate, endDate string) ([]model.Worklog, error) {
	endpoint := fmt.Sprintf("%s/worklogs/search", tempoBaseURL)

	requestBody := map[string]interface{}{
		"authorIds": []string{accountID},
		"from":      startDate,
		"to":        endDate,
		"limit":     100,
	}

	bodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiToken))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch worklogs: %s - %s", resp.Status, string(body))
	}

	var result struct {
		Results []model.Worklog `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Results, nil
}

// FetchLastSixDaysWorklogs retrieves worklogs for the last 6 working days
func (c *TempoClient) FetchLastSixDaysWorklogs(accountID string) ([]model.Worklog, error) {
	// Calculate date range (last 10 calendar days to cover 6 working days)
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -10)

	startDateStr := startDate.Format("2006-01-02")
	endDateStr := endDate.Format("2006-01-02")

	return c.FetchWorklogs(accountID, startDateStr, endDateStr)
}

// EnrichWorklogsWithIssueDetails fetches issue details from Jira and enriches worklogs
func (c *TempoClient) EnrichWorklogsWithIssueDetails(worklogs []model.Worklog) ([]model.Worklog, error) {
	// Collect unique issue IDs
	issueIDs := make(map[int]bool)
	for _, log := range worklogs {
		if log.Issue.ID != 0 {
			issueIDs[log.Issue.ID] = true
		}
	}

	// Fetch issue details concurrently
	issueDetailsMap := make(map[int]*model.Issue)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(issueIDs))

	for issueID := range issueIDs {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			// Convert int ID to string for API call
			issue, err := c.jiraClient.FetchIssue(fmt.Sprintf("%d", id))
			if err != nil {
				errChan <- fmt.Errorf("failed to fetch issue %d: %w", id, err)
				return
			}

			mu.Lock()
			issueDetailsMap[id] = issue
			mu.Unlock()
		}(issueID)
	}

	wg.Wait()
	close(errChan)

	// Check for errors
	if len(errChan) > 0 {
		return nil, <-errChan
	}

	// Enrich worklogs with issue details
	enrichedWorklogs := make([]model.Worklog, len(worklogs))
	for i, log := range worklogs {
		enrichedWorklogs[i] = log
		if issue, ok := issueDetailsMap[log.Issue.ID]; ok {
			enrichedWorklogs[i].Issue.Key = issue.Key
			enrichedWorklogs[i].Issue.Summary = issue.Fields.Summary
		}
	}

	return enrichedWorklogs, nil
}
