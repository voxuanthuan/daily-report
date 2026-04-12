package tui

// IssueIcons maps Jira issue types to emoji icons
var IssueIcons = map[string]string{
	"Bug":         "🟥",
	"Task":        "🟦",
	"Story":       "📗",
	"Sub-task":    "🟦",
	"Subtask":     "🟦",
	"Epic":        "🟪",
	"Improvement": "⬆️",
}

var StatusCategoryIcons = map[string]string{
	"Under Review":      "👀",
	"Code Review":       "👀",
	"Review":            "👀",
	"Ready for Testing": "🐞",
	"QA":                "🐞",
	"Testing":           "🐞",
	"To Test":           "🐞",
}

func GetStatusCategoryIcon(statusName string) string {
	if icon, ok := StatusCategoryIcons[statusName]; ok {
		return icon
	}
	return ""
}

func GetIssueIcon(issueType string) string {
	if icon, ok := IssueIcons[issueType]; ok {
		return icon
	}
	return "◽" // default
}

// FormatTaskWithPrefix formats a task with To-/Ye- prefix and emoji icon
func FormatTaskWithPrefix(task interface{}, isYesterday bool) string {
	// Type assertion to get issue data
	var key, summary, issueType string

	switch t := task.(type) {
	case map[string]interface{}:
		if k, ok := t["Key"].(string); ok {
			key = k
		}
		if f, ok := t["Fields"].(map[string]interface{}); ok {
			if s, ok := f["Summary"].(string); ok {
				summary = s
			}
			if it, ok := f["IssueType"].(map[string]interface{}); ok {
				if n, ok := it["Name"].(string); ok {
					issueType = n
				}
			}
		}
	}

	prefix := "To - "
	if isYesterday {
		prefix = "Ye - "
	}

	icon := GetIssueIcon(issueType)
	return icon + " " + prefix + key + ": " + summary
}
