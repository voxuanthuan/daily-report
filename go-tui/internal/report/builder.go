package report

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

func BuildMainReport(prevTasks []model.Worklog, inProgress []model.Issue, prevDate time.Time) string {
	var sb strings.Builder

	label := "Yesterday"
	if !prevDate.IsZero() {
		today := time.Now()
		daysDiff := int(today.Sub(prevDate).Hours() / 24)

		if daysDiff > 1 {
			weekday := prevDate.Weekday().String()
			label = fmt.Sprintf("Last %s", weekday)
		}
	}

	sb.WriteString("Hi everyone,\n")
	sb.WriteString(label + "\n")

	groupedPrev := groupWorklogsByIssue(prevTasks)
	if len(groupedPrev) > 0 {
		// Get unique issue keys and sort them for consistent output
		issueKeys := make([]string, 0, len(groupedPrev))
		for key := range groupedPrev {
			issueKeys = append(issueKeys, key)
		}
		sort.Strings(issueKeys)

		for _, key := range issueKeys {
			worklogs := groupedPrev[key]
			if len(worklogs) == 0 {
				continue
			}

			// Use the first worklog for issue details (all have same issue key/summary)
			sb.WriteString(fmt.Sprintf("  ● %s: %s\n", worklogs[0].Issue.Key, worklogs[0].Issue.Summary))

			// Display all non-default descriptions
			for _, w := range worklogs {
				if !isDefaultDescription(w.Description) {
					sb.WriteString(fmt.Sprintf("     ○ %s\n", strings.TrimSpace(w.Description)))
				}
			}
		}
	} else {
		sb.WriteString("  ● No tasks logged.\n")
	}

	sb.WriteString("Today\n")

	uniqueInProgress := deduplicateIssues(inProgress)

	if len(uniqueInProgress) > 0 {
		for _, t := range uniqueInProgress {
			sb.WriteString(fmt.Sprintf("  ● %s: %s\n", t.Key, t.Fields.Summary))
		}
	} else {
		sb.WriteString("  ● No tasks planned.\n")
	}

	sb.WriteString("No blockers\n")

	return sb.String()
}

// BuildTodoList builds the Todo section
func BuildTodoList(todo []model.Issue, inProgress []model.Issue) string {
	var sb strings.Builder
	sb.WriteString("\n─────────────────────────────────────────────────────────────────\n\n")
	sb.WriteString("Todo\n")

	// Filter in-progress for stories
	uniqueInProgress := deduplicateIssues(inProgress)
	stories := filterStories(uniqueInProgress)
	inProgressKeys := make(map[string]bool)
	for _, s := range stories {
		inProgressKeys[s.Key] = true
	}

	// Sort todo tasks
	// Priority High > Medium > Low
	// Type Bug > Task > Story
	sort.Slice(todo, func(i, j int) bool {
		p1 := getPriorityValue(todo[i].Fields.Priority)
		p2 := getPriorityValue(todo[j].Fields.Priority)
		if p1 != p2 {
			return p1 > p2
		}

		t1 := getTypeValue(todo[i].Fields.IssueType.Name)
		t2 := getTypeValue(todo[j].Fields.IssueType.Name)
		if t1 != t2 {
			return t1 > t2
		}

		return todo[i].Key < todo[j].Key
	})

	// Sort stories similarly
	sort.Slice(stories, func(i, j int) bool {
		p1 := getPriorityValue(stories[i].Fields.Priority)
		p2 := getPriorityValue(stories[j].Fields.Priority)
		return p1 > p2
	})

	// Combine: stories first if not strictly "todo", but original TS puts sorted open tasks.
	// Replicating TS logic:
	// "Combine: in-progress first (stories), then open tasks, limit to 10 total"
	// But `stories` here are "In Progress Stories" specifically?
	// TS logic: `const allTasks = [...sortedOpenTasks].slice(0, 10);`
	// Wait, TS logic actually ignores `stories` in the main list concatenation?
	// `const allTasks = [...sortedOpenTasks].slice(0, 10);` -> It only uses OpenTasks!
	// But it uses `stories` to mark them?
	// Ah, TS says: "Add in-progress indicator for stories/epics that are in progress" via `inProgressKeys`.

	limit := 10
	if len(todo) < limit {
		limit = len(todo)
	}
	allTasks := todo[:limit]

	if len(allTasks) == 0 {
		sb.WriteString("- No tasks available.")
		return sb.String()
	}

	for _, task := range allTasks {
		icon := getIcon(task.Fields.IssueType.Name)
		indicator := ""
		if inProgressKeys[task.Key] {
			indicator = "⏳ "
		}
		sb.WriteString(fmt.Sprintf(" %s %s%s: %s\n", icon, indicator, task.Key, task.Fields.Summary))
	}

	return sb.String()
}

// Helpers

// groupWorklogsByIssue groups worklogs by their issue key while preserving order
func groupWorklogsByIssue(worklogs []model.Worklog) map[string][]model.Worklog {
	grouped := make(map[string][]model.Worklog)
	for _, w := range worklogs {
		grouped[w.Issue.Key] = append(grouped[w.Issue.Key], w)
	}
	return grouped
}

// isDefaultDescription checks if a description is a default/auto-generated one
func isDefaultDescription(desc string) bool {
	desc = strings.TrimSpace(desc)
	if desc == "" {
		return true
	}

	descLower := strings.ToLower(desc)
	// Check for "working on issue" prefix (case-insensitive)
	if strings.HasPrefix(descLower, "working on issue") {
		return true
	}

	return false
}

func deduplicateIssues(issues []model.Issue) []model.Issue {
	seen := make(map[string]bool)
	var result []model.Issue
	for _, i := range issues {
		if !seen[i.Key] {
			seen[i.Key] = true
			result = append(result, i)
		}
	}
	return result
}

func filterStories(issues []model.Issue) []model.Issue {
	var result []model.Issue
	for _, i := range issues {
		if strings.EqualFold(i.Fields.IssueType.Name, "Story") ||
			strings.EqualFold(i.Fields.IssueType.Name, "Epic") {
			result = append(result, i)
		}
	}
	return result
}

func getPriorityValue(p *model.Priority) int {
	if p == nil {
		return 0
	}
	switch p.Name {
	case "High":
		return 2
	case "Medium":
		return 1
	default:
		return 0
	}
}

func getTypeValue(t string) int {
	switch t {
	case "Bug":
		return 4
	case "Task":
		return 3
	case "Sub-task":
		return 2
	case "Story":
		return 1
	default:
		return 0
	}
}

func getIcon(t string) string {
	switch t {
	case "Bug":
		return "🔴"
	case "Sub-task":
		return "🔵"
	default:
		return "🟢"
	}
}
