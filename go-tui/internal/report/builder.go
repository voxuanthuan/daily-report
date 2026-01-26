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

	aggregatedPrev := aggregateWorklogs(prevTasks)
	if len(aggregatedPrev) > 0 {
		for _, item := range aggregatedPrev {
			sb.WriteString(fmt.Sprintf("  ●  %s: %s\n", item.Issue.Key, item.Issue.Summary))
			for _, desc := range item.Descriptions {
				sb.WriteString(fmt.Sprintf("       ○ %s\n", desc))
			}
		}
	} else {
		sb.WriteString("  ●  No tasks logged.\n")
	}

	sb.WriteString("Today\n")

	uniqueInProgress := deduplicateIssues(inProgress)

	var stories []model.Issue
	var tasks []model.Issue

	for _, issue := range uniqueInProgress {
		isStory := strings.EqualFold(issue.Fields.IssueType.Name, "Story") ||
			strings.EqualFold(issue.Fields.IssueType.Name, "Epic")
		if isStory {
			stories = append(stories, issue)
		} else {
			tasks = append(tasks, issue)
		}
	}

	if len(tasks) > 0 {
		for _, t := range tasks {
			sb.WriteString(fmt.Sprintf("  ●  %s: %s\n", t.Key, t.Fields.Summary))
		}
	} else {
		sb.WriteString("  ●  No tasks planned.\n")
	}

	sb.WriteString("No blockers\n")

	if len(stories) > 0 {
		sb.WriteString("\n.\n\nIn-Progress (Story)\n")
		for _, s := range stories {
			sb.WriteString(fmt.Sprintf("  ●  %s: %s\n", s.Key, s.Fields.Summary))
		}
	}

	return sb.String()
}

func BuildHTMLReport(prevTasks []model.Worklog, inProgress []model.Issue, prevDate time.Time) string {
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

	sb.WriteString("<p>Hi everyone,</p>\n")
	sb.WriteString(fmt.Sprintf("<p>%s</p>\n", label))
	sb.WriteString("<ul>\n")

	aggregatedPrev := aggregateWorklogs(prevTasks)
	if len(aggregatedPrev) > 0 {
		for _, item := range aggregatedPrev {
			sb.WriteString(fmt.Sprintf("<li>%s: %s", item.Issue.Key, item.Issue.Summary))
			if len(item.Descriptions) > 0 {
				sb.WriteString("\n<ul>\n")
				for _, desc := range item.Descriptions {
					sb.WriteString(fmt.Sprintf("<li>%s</li>\n", desc))
				}
				sb.WriteString("</ul>\n")
			}
			sb.WriteString("</li>\n")
		}
	} else {
		sb.WriteString("<li>No tasks logged.</li>\n")
	}
	sb.WriteString("</ul>\n")

	sb.WriteString("<p>Today</p>\n")
	sb.WriteString("<ul>\n")

	uniqueInProgress := deduplicateIssues(inProgress)

	var stories []model.Issue
	var tasks []model.Issue

	for _, issue := range uniqueInProgress {
		isStory := strings.EqualFold(issue.Fields.IssueType.Name, "Story") ||
			strings.EqualFold(issue.Fields.IssueType.Name, "Epic")
		if isStory {
			stories = append(stories, issue)
		} else {
			tasks = append(tasks, issue)
		}
	}

	if len(tasks) > 0 {
		for _, t := range tasks {
			sb.WriteString(fmt.Sprintf("<li>%s: %s</li>\n", t.Key, t.Fields.Summary))
		}
	} else {
		sb.WriteString("<li>No tasks planned.</li>\n")
	}
	sb.WriteString("</ul>\n")

	sb.WriteString("<p>No blockers</p>\n")

	if len(stories) > 0 {
		sb.WriteString("<p>.</p>\n<p>In-Progress (Story)</p>\n<ul>\n")
		for _, s := range stories {
			sb.WriteString(fmt.Sprintf("<li>%s: %s</li>\n", s.Key, s.Fields.Summary))
		}
		sb.WriteString("</ul>\n")
	}

	return sb.String()
}

type AggregatedWorklog struct {
	Issue        model.WorklogIssue
	Descriptions []string
}

func aggregateWorklogs(worklogs []model.Worklog) []AggregatedWorklog {
	// Group by Issue Key
	grouped := make(map[string]*AggregatedWorklog)
	var result []AggregatedWorklog
	var order []string // To maintain order of appearance

	for _, w := range worklogs {
		if _, exists := grouped[w.Issue.Key]; !exists {
			grouped[w.Issue.Key] = &AggregatedWorklog{
				Issue:        w.Issue,
				Descriptions: []string{},
			}
			order = append(order, w.Issue.Key)
		}

		desc := strings.TrimSpace(w.Description)
		// Filter out empty descriptions and default "Working on issue" descriptions
		if desc != "" && !strings.HasPrefix(desc, "Working on issue ") {
			// Check for duplicates within this issue's descriptions
			isDuplicate := false
			for _, d := range grouped[w.Issue.Key].Descriptions {
				if d == desc {
					isDuplicate = true
					break
				}
			}
			if !isDuplicate {
				grouped[w.Issue.Key].Descriptions = append(grouped[w.Issue.Key].Descriptions, desc)
			}
		}
	}

	for _, key := range order {
		result = append(result, *grouped[key])
	}

	return result
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

func deduplicateWorklogs(worklogs []model.Worklog) []model.Worklog {
	seen := make(map[string]bool)
	var result []model.Worklog
	for _, w := range worklogs {
		if !seen[w.Issue.Key] {
			seen[w.Issue.Key] = true
			result = append(result, w)
		}
	}
	return result
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
