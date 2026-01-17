package tui

import (
	"fmt"

	"github.com/atotto/clipboard"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// CopyOption represents what to copy
type CopyOption int

const (
	CopyTicketID CopyOption = iota
	CopyTitle
	CopyTicketIDAndTitle
)

// CopyOptionsModal represents the copy options menu
type CopyOptionsModal struct {
	active        bool
	selectedIndex int
	options       []string
	task          *model.Issue
	jiraServer    string
}

// NewCopyOptionsModal creates a new copy options modal
func NewCopyOptionsModal(task *model.Issue, jiraServer string) *CopyOptionsModal {
	return &CopyOptionsModal{
		active:        true,
		selectedIndex: 0,
		options:       []string{"1: Ticket ID", "2: Title", "3: ID + Title"},
		task:          task,
		jiraServer:    jiraServer,
	}
}

// Update handles input for the copy options modal
func (m *CopyOptionsModal) Update(msg tea.KeyMsg) (*CopyOptionsModal, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.active = false
		return m, nil

	case "j", "down":
		if m.selectedIndex < len(m.options)-1 {
			m.selectedIndex++
		}
		return m, nil

	case "k", "up":
		if m.selectedIndex > 0 {
			m.selectedIndex--
		}
		return m, nil

	case "enter":
		// Copy based on selection
		return m, m.copySelected()
	}

	return m, nil
}

// copySelected copies the selected option to clipboard
func (m *CopyOptionsModal) copySelected() tea.Cmd {
	return func() tea.Msg {
		var content string
		var label string

		switch m.selectedIndex {
		case int(CopyTicketID):
			content = m.task.Key
			label = "ticket ID"
		case int(CopyTitle):
			content = m.task.Fields.Summary
			label = "title"
		case int(CopyTicketIDAndTitle):
			content = fmt.Sprintf("%s: %s", m.task.Key, m.task.Fields.Summary)
			label = "ID + title"
		}

		if err := clipboard.WriteAll(content); err != nil {
			return errMsg{fmt.Errorf("failed to copy: %w", err)}
		}

		return copyDoneMsg{fmt.Sprintf("Copied %s to clipboard", label)}
	}
}

// View renders the copy options modal
func (m *CopyOptionsModal) View() string {
	if !m.active {
		return ""
	}

	var s string
	s += "┌─ Copy Options ─┐\n"
	s += "│                │\n"

	for i, option := range m.options {
		prefix := "  "
		if i == m.selectedIndex {
			prefix = "▶ "
		}
		s += fmt.Sprintf("│ %s%-12s │\n", prefix, option)
	}

	s += "│                │\n"
	s += "│ esc: cancel    │\n"
	s += "└────────────────┘"

	return s
}

// copyDoneMsg is sent when copy is complete
type copyDoneMsg struct {
	message string
}
