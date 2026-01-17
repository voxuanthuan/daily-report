package tui

import (
	"fmt"
	"strings"

	"github.com/yourusername/jira-daily-report/internal/jira"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// StatusDialogModel represents the status selection dialog
type StatusDialogModel struct {
	transitions   []jira.Transition
	cursor        int
	selected      *jira.Transition
	active        bool
	mode          int // 0=select, 1=confirm
	currentStatus string
	issueKey      string

	// Confirmation state
	confirmCursor int // 0=Yes, 1=No
}

// NewStatusDialogModel creates a new status selection dialog
func NewStatusDialogModel(transitions []jira.Transition, currentStatus string, issueKey string) *StatusDialogModel {
	processed := processTransitions(transitions)

	return &StatusDialogModel{
		transitions:   processed,
		cursor:        0,
		currentStatus: currentStatus,
		issueKey:      issueKey,
		active:        true,
		mode:          0,
		confirmCursor: 0,
	}
}

// Helper to filter and sort transitions
func processTransitions(transitions []jira.Transition) []jira.Transition {
	var filtered []jira.Transition
	var selectedForDev *jira.Transition

	// Filter and find priority item
	for i := range transitions {
		name := transitions[i].To.Name

		// Filter out specific statuses
		if strings.EqualFold(name, "Open") ||
			strings.EqualFold(name, "Done") ||
			strings.EqualFold(name, "Decline") {
			continue
		}

		if strings.EqualFold(name, "Selected for Development") {
			selectedForDev = &transitions[i]
		} else {
			filtered = append(filtered, transitions[i])
		}
	}

	// Prepend priority item
	if selectedForDev != nil {
		filtered = append([]jira.Transition{*selectedForDev}, filtered...)
	}

	return filtered
}

// Update handles user input
func (m *StatusDialogModel) Update(msg tea.Msg) (*StatusDialogModel, tea.Cmd) {
	if !m.active {
		return m, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		if m.mode == 0 {
			return m.updateSelect(msg)
		} else {
			return m.updateConfirm(msg)
		}
	}

	return m, nil
}

func (m *StatusDialogModel) updateSelect(msg tea.KeyMsg) (*StatusDialogModel, tea.Cmd) {
	switch msg.String() {
	case "q", "esc":
		m.active = false
		return m, nil

	case "enter":
		if len(m.transitions) > 0 {
			m.selected = &m.transitions[m.cursor]
			m.mode = 1          // Switch to confirm mode
			m.confirmCursor = 0 // Default to Yes
		}
		return m, nil

	case "j", "down":
		if m.cursor < len(m.transitions)-1 {
			m.cursor++
		}

	case "k", "up":
		if m.cursor > 0 {
			m.cursor--
		}
	}
	return m, nil
}

func (m *StatusDialogModel) updateConfirm(msg tea.KeyMsg) (*StatusDialogModel, tea.Cmd) {
	switch msg.String() {
	case "q", "esc", "n":
		m.active = false
		return m, nil

	case "enter", "y":
		// Confirm action
		m.active = false
		// Return a command to execute the change
		return m, func() tea.Msg {
			return statusChangeConfirmedMsg{
				issueKey:     m.issueKey,
				transitionID: m.selected.ID,
				targetStatus: m.selected.To.Name,
			}
		}

	case "h", "left", "l", "right", "tab":
		m.confirmCursor = 1 - m.confirmCursor
	}
	return m, nil
}

// View renders the dialog
func (m *StatusDialogModel) View() string {
	if !m.active || len(m.transitions) == 0 {
		return ""
	}

	// Use local modal style matching LogTimeModal
	modalStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorPrimary).
		Background(lipgloss.Color("#1e1e2e")).
		Padding(1).
		Align(lipgloss.Left)

	if m.mode == 1 {
		return modalStyle.Width(50).Render(m.renderConfirm())
	}

	return modalStyle.Width(50).Render(m.renderSelect())
}

func (m *StatusDialogModel) renderSelect() string {
	title := "Select Status"
	var lines []string

	lines = append(lines, titleStyle.Render(title))
	lines = append(lines, "")

	for i, transition := range m.transitions {
		prefix := "  "
		style := itemStyle

		if i == m.cursor {
			prefix = "▶ "
			style = selectedItemStyle
		}

		// Mark current status
		statusText := transition.To.Name
		if strings.EqualFold(transition.To.Name, m.currentStatus) {
			statusText += " (current)"
		}

		lines = append(lines, style.Render(prefix+statusText))
	}

	lines = append(lines, "")
	lines = append(lines, itemStyle.Foreground(colorMuted).Render("[↑↓/jk] Navigate  [Enter] Select  [ESC] Cancel"))

	return strings.Join(lines, "\n")
}

func (m *StatusDialogModel) renderConfirm() string {
	title := "Confirm Status Change"

	content := fmt.Sprintf("Change %s status to \"%s\"?", m.issueKey, m.selected.To.Name)

	// Yes/No buttons
	yesStyle := itemStyle
	noStyle := itemStyle

	if m.confirmCursor == 0 {
		yesStyle = selectedItemStyle
	} else {
		noStyle = selectedItemStyle
	}

	buttons := lipgloss.JoinHorizontal(
		lipgloss.Center,
		yesStyle.Render(" [ Yes ] "),
		"  ",
		noStyle.Render(" [ No ] "),
	)

	var lines []string
	lines = append(lines, titleStyle.Render(title))
	lines = append(lines, "")
	lines = append(lines, content)
	lines = append(lines, "")
	lines = append(lines, buttons)
	lines = append(lines, "")
	lines = append(lines, itemStyle.Foreground(colorMuted).Render("[Enter/y] Confirm  [ESC/n] Cancel"))

	return strings.Join(lines, "\n")
}

// IsActive returns whether the modal is active (has items)
func (m *StatusDialogModel) IsActive() bool {
	return m.active && len(m.transitions) > 0
}

// Custom message for confirmation
type statusChangeConfirmedMsg struct {
	issueKey     string
	transitionID string
	targetStatus string
}
