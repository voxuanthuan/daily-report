package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
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
	// Cache for enriched issue details to avoid repeated API calls
	issueCache      map[int]model.Issue
	issueCacheMutex sync.RWMutex
}

// NewTempoClient creates a new Tempo API client
func NewTempoClient(apiToken string, jiraClient *JiraClient) *TempoClient {
	return &TempoClient{
		apiToken:    apiToken,
		jiraClient:  jiraClient,
		client:      &http.Client{Timeout: 30 * time.Second},
		issueCache:  make(map[int]model.Issue),
	}
}

// FetchWorklogs retrieves worklogs for a date range
func (c *TempoClient) FetchWorklogs(accountID, startDate, endDate string) ([]model.Worklog, error) {
	endpoint := fmt.Sprintf("%s/worklogs/search", tempoBaseURL)

	requestBody := map[string]interface{}{
		"authorIds": []string{accountID},
		"from":      startDate,
		"to":        endDate,
		"limit":     100, // Increased from default to get more results
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
// OPTIMIZED: Uses single query with all issue IDs instead of batching, plus caching
func (c *TempoClient) EnrichWorklogsWithIssueDetails(worklogs []model.Worklog) ([]model.Worklog, error) {
	// Collect unique issue IDs that need enrichment
	issueIDsToFetch := make(map[int]bool)
	for _, log := range worklogs {
		if log.Issue.ID != 0 && log.Issue.Key == "" {
			// Check cache first
			c.issueCacheMutex.RLock()
			_, cached := c.issueCache[log.Issue.ID]
			c.issueCacheMutex.RUnlock()

			if !cached {
				issueIDsToFetch[log.Issue.ID] = true
			}
		}
	}

	if len(issueIDsToFetch) == 0 {
		// All issues already cached or no enrichment needed
		return c.enrichFromCache(worklogs), nil
	}

	// OPTIMIZATION: Use a single JQL query with all issue IDs instead of batching
	// JQL supports up to 1000 issues in a single query
	var ids []string
	for id := range issueIDsToFetch {
		ids = append(ids, fmt.Sprintf("%d", id))
	}

	// Split into multiple queries if needed (JQL has limits)
	const maxIDsPerQuery = 500
	issueDetailsMap := make(map[int]model.Issue)

	for i := 0; i < len(ids); i += maxIDsPerQuery {
		end := i + maxIDsPerQuery
		if end > len(ids) {
			end = len(ids)
		}

		batchIDs := ids[i:end]
		jql := fmt.Sprintf("id in (%s)", strings.Join(batchIDs, ","))

		issues, err := c.jiraClient.FetchTasks(jql)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch issues: %w", err)
		}

		// Update cache and map
		c.issueCacheMutex.Lock()
		for _, issue := range issues {
			idInt, _ := strconv.Atoi(issue.ID)
			issueDetailsMap[idInt] = issue
			c.issueCache[idInt] = issue
		}
		c.issueCacheMutex.Unlock()
	}

	// Enrich worklogs with issue details
	enrichedWorklogs := make([]model.Worklog, len(worklogs))
	for i, log := range worklogs {
		enrichedWorklogs[i] = log
		if log.Issue.Key == "" && log.Issue.ID != 0 {
			// Try to get from cache or newly fetched details
			c.issueCacheMutex.RLock()
			if issue, ok := c.issueCache[log.Issue.ID]; ok {
				enrichedWorklogs[i].Issue.Key = issue.Key
				enrichedWorklogs[i].Issue.Summary = issue.Fields.Summary
			}
			c.issueCacheMutex.RUnlock()
		}
	}

	return enrichedWorklogs, nil
}

// enrichFromCache enriches worklogs using cached issue details
func (c *TempoClient) enrichFromCache(worklogs []model.Worklog) []model.Worklog {
	enrichedWorklogs := make([]model.Worklog, len(worklogs))
	c.issueCacheMutex.RLock()
	defer c.issueCacheMutex.RUnlock()

	for i, log := range worklogs {
		enrichedWorklogs[i] = log
		if log.Issue.Key == "" && log.Issue.ID != 0 {
			if issue, ok := c.issueCache[log.Issue.ID]; ok {
				enrichedWorklogs[i].Issue.Key = issue.Key
				enrichedWorklogs[i].Issue.Summary = issue.Fields.Summary
			}
		}
	}

	return enrichedWorklogs
}

// ClearCache clears the issue cache (useful for testing or forced refresh)
func (c *TempoClient) ClearCache() {
	c.issueCacheMutex.Lock()
	defer c.issueCacheMutex.Unlock()
	c.issueCache = make(map[int]model.Issue)
}
