package cache

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/yourusername/jira-daily-report/internal/model"
)

// Manager handles cache operations
type Manager struct {
	cachePath string
	ttl       time.Duration
	enabled   bool
}

// NewManager creates a new cache manager
func NewManager(enabled bool, ttl time.Duration) (*Manager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	cachePath := filepath.Join(homeDir, ".jira-daily-report-cache.json")

	return &Manager{
		cachePath: cachePath,
		ttl:       ttl,
		enabled:   enabled,
	}, nil
}

// Load reads and validates the cache from disk
func (m *Manager) Load() (*CacheData, error) {
	if !m.enabled {
		return nil, fmt.Errorf("cache is disabled")
	}

	if _, err := os.Stat(m.cachePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("cache file does not exist")
	}

	data, err := os.ReadFile(m.cachePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read cache file: %w", err)
	}

	var cacheData CacheData
	if err := json.Unmarshal(data, &cacheData); err != nil {
		_ = m.Clear()
		return nil, fmt.Errorf("failed to parse cache (corrupted): %w", err)
	}

	if !cacheData.IsValid() {
		if cacheData.Version != CurrentVersion {
			_ = m.Clear()
			return nil, fmt.Errorf("cache version mismatch (expected %s, got %s)", CurrentVersion, cacheData.Version)
		}
		return nil, fmt.Errorf("cache expired (age: %v)", cacheData.Age())
	}

	return &cacheData, nil
}

// Save writes cache data to disk atomically
func (m *Manager) Save(data *CacheData) error {
	if !m.enabled {
		return nil
	}

	data.CachedAt = time.Now()
	data.ExpiresAt = time.Now().Add(m.ttl)
	data.Version = CurrentVersion

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal cache data: %w", err)
	}

	tempPath := m.cachePath + ".tmp"
	if err := os.WriteFile(tempPath, jsonData, 0600); err != nil {
		return fmt.Errorf("failed to write cache temp file: %w", err)
	}

	if err := os.Rename(tempPath, m.cachePath); err != nil {
		_ = os.Remove(tempPath)
		return fmt.Errorf("failed to rename cache file: %w", err)
	}

	return nil
}

// Clear removes the cache file
func (m *Manager) Clear() error {
	if err := os.Remove(m.cachePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to clear cache: %w", err)
	}
	return nil
}

// IsValid checks if cache exists and is valid
func (m *Manager) IsValid() bool {
	data, err := m.Load()
	if err != nil {
		return false
	}
	return data.IsValid()
}

// GetCachePath returns the cache file path
func (m *Manager) GetCachePath() string {
	return m.cachePath
}

// GetInfo returns cache information for display
func (m *Manager) GetInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})
	info["path"] = m.cachePath
	info["enabled"] = m.enabled
	info["ttl"] = m.ttl.String()

	if !m.enabled {
		info["status"] = "disabled"
		return info, nil
	}

	data, err := m.Load()
	if err != nil {
		info["status"] = "invalid"
		info["error"] = err.Error()
		return info, nil
	}

	info["status"] = "valid"
	info["cachedAt"] = data.CachedAt.Format(time.RFC3339)
	info["expiresAt"] = data.ExpiresAt.Format(time.RFC3339)
	info["age"] = data.Age().String()
	info["version"] = data.Version

	if fileInfo, err := os.Stat(m.cachePath); err == nil {
		info["size"] = fmt.Sprintf("%d KB", fileInfo.Size()/1024)
	}

	info["userCached"] = data.User != nil
	info["reportTasks"] = len(data.ReportTasks)
	info["todoTasks"] = len(data.TodoTasks)
	info["processingTasks"] = len(data.ProcessingTasks)
	info["worklogs"] = len(data.Worklogs)
	info["dateGroups"] = len(data.DateGroups)

	return info, nil
}

// BuildCacheData creates a CacheData struct from current state
func BuildCacheData(
	user *model.User,
	reportTasks, todoTasks, processingTasks []model.Issue,
	worklogs []model.Worklog,
	dateGroups []model.DateGroup,
) *CacheData {
	return &CacheData{
		User:            user,
		ReportTasks:     reportTasks,
		TodoTasks:       todoTasks,
		ProcessingTasks: processingTasks,
		Worklogs:        worklogs,
		DateGroups:      dateGroups,
	}
}
