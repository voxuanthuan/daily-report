package dateutil

import (
	"fmt"
	"strings"
	"time"
)

var lastWeekdayAliases = map[string]time.Weekday{
	"last monday":    time.Monday,
	"last mon":       time.Monday,
	"last tuesday":   time.Tuesday,
	"last tuesdays":  time.Tuesday,
	"last tueday":    time.Tuesday,
	"last tuedays":   time.Tuesday,
	"last tue":       time.Tuesday,
	"last wednesday": time.Wednesday,
	"last wed":       time.Wednesday,
	"last thursday":  time.Thursday,
	"last thurday":   time.Thursday,
	"last thu":       time.Thursday,
	"last friday":    time.Friday,
	"last fri":       time.Friday,
}

const WorklogDateFormatHelp = "today, yesterday, last monday, last tuesday, last wednesday, last thursday, last friday, or YYYY-MM-DD"

func ParseWorklogDate(s string) (string, error) {
	return parseWorklogDateAt(s, time.Now())
}

func parseWorklogDateAt(s string, now time.Time) (string, error) {
	s = normalizeDateInput(s)

	switch s {
	case "today", "":
		return now.Format("2006-01-02"), nil
	case "yesterday":
		return now.AddDate(0, 0, -1).Format("2006-01-02"), nil
	}

	if weekday, ok := lastWeekdayAliases[s]; ok {
		return previousWeekday(now, weekday).Format("2006-01-02"), nil
	}

	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return "", fmt.Errorf("invalid date format (use: %s)", WorklogDateFormatHelp)
	}
	return t.Format("2006-01-02"), nil
}

func previousWeekday(now time.Time, weekday time.Weekday) time.Time {
	daysBack := (int(now.Weekday()) - int(weekday) + 7) % 7
	if daysBack == 0 {
		daysBack = 7
	}
	return now.AddDate(0, 0, -daysBack)
}

func normalizeDateInput(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(s))), " ")
}
