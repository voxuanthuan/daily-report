package model

// WorklogRequest represents a request to create a worklog
type WorklogRequest struct {
	IssueID          int    `json:"issueId"`
	TimeSpentSeconds int    `json:"timeSpentSeconds"`
	StartDate        string `json:"startDate"` // YYYY-MM-DD
	Description      string `json:"description,omitempty"`
	AuthorAccountID  string `json:"authorAccountId"`
}

// WorklogResponseIssue represents the issue in a worklog creation response
type WorklogResponseIssue struct {
	ID  int    `json:"id"` // Tempo API returns this as a number
	Key string `json:"key"`
}

// WorklogResponse represents the API response when creating a worklog
type WorklogResponse struct {
	TempoWorklogID int                  `json:"tempoWorklogId"`
	JiraWorklogID  int                  `json:"jiraWorklogId"`
	Issue          WorklogResponseIssue `json:"issue"`
	TimeSpent      string               `json:"timeSpent"`
	StartDate      string               `json:"startDate"`
	Description    string               `json:"description,omitempty"`
}
