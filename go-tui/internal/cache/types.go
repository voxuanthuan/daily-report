package cache

import (
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// CacheData represents the cached application data
type CacheData struct {
	User            *model.User       `json:"user"`
	ReportTasks     []model.Issue     `json:"reportTasks"`
	TodoTasks       []model.Issue     `json:"todoTasks"`
	ProcessingTasks []model.Issue     `json:"processingTasks"`
	Worklogs        []model.Worklog   `json:"worklogs"`
	DateGroups      []model.DateGroup `json:"dateGroups"`
	CachedAt        time.Time         `json:"cachedAt"`
	ExpiresAt       time.Time         `json:"expiresAt"`
	Version         string            `json:"version"`
}

// IsExpired checks if the cache data has expired
func (c *CacheData) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}

// IsValid checks if the cache data is valid (not expired and has correct version)
func (c *CacheData) IsValid() bool {
	if c.Version != CurrentVersion {
		return false
	}
	return !c.IsExpired()
}

// Age returns how long ago the data was cached
func (c *CacheData) Age() time.Duration {
	return time.Since(c.CachedAt)
}

const (
	// CurrentVersion is the current cache format version
	CurrentVersion = "1.0"
)
