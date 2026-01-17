package tui

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

// ConfirmDialogModel represents a yes/no confirmation dialog
type ConfirmDialogModel struct {
	message   string
	confirmed bool
	cancelled bool
	cursor    int // 0 = Yes, 1 = No
	width     int
	height    int
}

// NewConfirmDialogModel creates a new confirmation dialog
func NewConfirmDialogModel(message string) ConfirmDialogModel {
	return ConfirmDialogModel{
		message: message,
		cursor:  0, // Default to "Yes"
		width:   60,
		height:  10,
	}
}

// Init initializes the dialog
func (m ConfirmDialogModel) Init() tea.Cmd {
	return nil
}

// Update handles user input
func (m ConfirmDialogModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "esc", "n":
			m.cancelled = true
			return m, tea.Quit

		case "enter", "y":
			m.confirmed = (m.cursor == 0) || msg.String() == "y"
			return m, tea.Quit

		case "h", "left":
			m.cursor = 0

		case "l", "right":
			m.cursor = 1

		case "tab":
			m.cursor = 1 - m.cursor
		}
	}

	return m, nil
}

// View renders the dialog
func (m ConfirmDialogModel) View() string {
	var items []string

	items = append(items, titleStyle.Render("Confirm"))
	items = append(items, "")
	items = append(items, itemStyle.Render(m.message))
	items = append(items, "")

	// Yes/No buttons
	yesStyle := itemStyle
	noStyle := itemStyle

	if m.cursor == 0 {
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
	items = append(items, buttons)

	items = append(items, "")
	items = append(items, itemStyle.Foreground(colorMuted).Render("←→/hl/Tab: switch │ Enter/y: confirm │ Esc/n: cancel"))

	content := strings.Join(items, "\n")

	return lipgloss.Place(
		m.width,
		m.height,
		lipgloss.Center,
		lipgloss.Center,
		activeBorderStyle.Width(m.width-4).Height(m.height-4).Render(content),
	)
}

// IsConfirmed returns whether the user confirmed
func (m ConfirmDialogModel) IsConfirmed() bool {
	return m.confirmed
}

// IsCancelled returns whether the dialog was cancelled
func (m ConfirmDialogModel) IsCancelled() bool {
	return m.cancelled
}
