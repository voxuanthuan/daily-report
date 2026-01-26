package model

// Issue represents a Jira issue
type Issue struct {
	ID     string      `json:"id"`
	Key    string      `json:"key"`
	Fields IssueFields `json:"fields"`
}

// IssueFields contains the issue field data
type IssueFields struct {
	Summary     string       `json:"summary"`
	Status      Status       `json:"status"`
	IssueType   IssueType    `json:"issuetype"`
	Priority    *Priority    `json:"priority,omitempty"`
	Description interface{}  `json:"description,omitempty"`
	FixVersions []FixVersion `json:"fixVersions,omitempty"`
	Attachment  []Attachment `json:"attachment,omitempty"`
	Updated     string       `json:"updated,omitempty"`
}

// Attachment represents a Jira attachment
type Attachment struct {
	ID       string `json:"id"`
	Filename string `json:"filename"`
	Content  string `json:"content"`
	MimeType string `json:"mimeType"`
}

// Status represents the issue status
type Status struct {
	Name string `json:"name"`
}

// IssueType represents the issue type
type IssueType struct {
	Name string `json:"name"`
}

// Priority represents the issue priority
type Priority struct {
	Name string `json:"name"`
}

// FixVersion represents a fix version
type FixVersion struct {
	Name string `json:"name"`
}

// Worklog represents a Tempo worklog entry
type Worklog struct {
	TempoWorklogID   int          `json:"tempoWorklogId"`
	Issue            WorklogIssue `json:"issue"`
	TimeSpentSeconds int          `json:"timeSpentSeconds"`
	StartDate        string       `json:"startDate"`
	Description      string       `json:"description,omitempty"`
	Author           Author       `json:"author"`
}

// WorklogIssue represents the issue reference in a worklog
type WorklogIssue struct {
	ID      int    `json:"id"` // Tempo API returns this as a number
	Key     string `json:"key"`
	Summary string `json:"summary"`
}

// Author represents the worklog author
type Author struct {
	AccountID string `json:"accountId"`
}

// User represents a Jira user
type User struct {
	AccountID    string `json:"accountId"`
	DisplayName  string `json:"displayName"`
	EmailAddress string `json:"emailAddress"`
}

// DateGroup represents worklogs grouped by date
type DateGroup struct {
	Date         string
	DisplayDate  string
	Worklogs     []Worklog
	TotalSeconds int
}
