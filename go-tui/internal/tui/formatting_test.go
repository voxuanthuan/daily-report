package tui

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetStatusCategoryIcon(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected string
	}{
		{name: "under review", status: "Under Review", expected: "🔎"},
		{name: "code review", status: "Code Review", expected: "🔎"},
		{name: "ready for testing", status: "Ready for Testing", expected: "✓"},
		{name: "testing", status: "Testing", expected: "✓"},
		{name: "unknown", status: "In Progress", expected: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, GetStatusCategoryIcon(tt.status))
		})
	}
}
