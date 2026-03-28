package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/atotto/clipboard"
	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/report"
)

// ReportPreviewModal shows a full-screen preview of the daily report
type ReportPreviewModal struct {
	active       bool
	pending      bool
	content      string
	scrollOffset int
	maxScroll    int
	width        int
	height       int
	spinner      spinner.Model
}

// reportCopiedMsg is sent when the report is copied to clipboard
type reportCopiedMsg struct {
	message string
}

// NewReportPreviewModal creates a new report preview modal
func NewReportPreviewModal(worklogs []model.Worklog, inProgress []model.Issue, prevDate time.Time, width, height int) *ReportPreviewModal {
	content := report.BuildMainReport(worklogs, inProgress, prevDate)

	return &ReportPreviewModal{
		active:       true,
		pending:      false,
		content:      content,
		scrollOffset: 0,
		width:        width,
		height:       height,
	}
}

// NewPendingReportPreviewModal creates a modal that shows loading until data is ready
func NewPendingReportPreviewModal(width, height int) *ReportPreviewModal {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))
	return &ReportPreviewModal{
		active:       true,
		pending:      true,
		scrollOffset: 0,
		width:        width,
		height:       height,
		spinner:      s,
	}
}

// IsPending returns true if the modal is waiting for data to load
func (m *ReportPreviewModal) IsPending() bool {
	return m.pending
}

// BuildReport populates the report content and clears the pending state
func (m *ReportPreviewModal) BuildReport(content string) {
	m.content = content
	m.pending = false
	m.scrollOffset = 0
}

// IsActive returns true if the modal is active
func (m *ReportPreviewModal) IsActive() bool {
	return m.active
}

// Update handles input for the report preview modal
func (m *ReportPreviewModal) Update(msg tea.KeyMsg) (*ReportPreviewModal, tea.Cmd) {
	if m.pending {
		switch msg.String() {
		case "esc", "q":
			m.active = false
			return m, nil
		}
		return m, nil
	}

	switch msg.String() {
	case "esc", "q":
		m.active = false
		return m, nil

	case "j", "down":
		// Scroll down
		if m.scrollOffset < m.maxScroll {
			m.scrollOffset++
		}
		return m, nil

	case "k", "up":
		// Scroll up
		if m.scrollOffset > 0 {
			m.scrollOffset--
		}
		return m, nil

	case "y":
		// Copy report to clipboard and close
		return m, m.copyReport()

	case "g":
		// Go to top
		m.scrollOffset = 0
		return m, nil

	case "G":
		// Go to bottom
		m.scrollOffset = m.maxScroll
		return m, nil
	}

	return m, nil
}

// copyReport copies the report content to clipboard
func (m *ReportPreviewModal) copyReport() tea.Cmd {
	return func() tea.Msg {
		if err := clipboard.WriteAll(m.content); err != nil {
			return errMsg{fmt.Errorf("failed to copy report: %w", err)}
		}
		return reportCopiedMsg{message: "Report copied to clipboard!"}
	}
}

// View renders the report preview modal
func (m *ReportPreviewModal) View() string {
	if !m.active {
		return ""
	}

	modalWidth := m.width - 4
	modalHeight := m.height - 4
	contentWidth := modalWidth - 4
	contentHeight := modalHeight - 6

	if contentWidth < 20 {
		contentWidth = 20
	}
	if contentHeight < 5 {
		contentHeight = 5
	}

	if m.pending {
		title := "📋 Daily Report Preview"
		loadingText := m.spinner.View() + " Loading report data..."
		loadingHint := "Waiting for data to finish loading..."
		footer := "esc: close"

		titleStyle := lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("86")).
			Width(contentWidth).
			Align(lipgloss.Center)

		footerStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")).
			Width(contentWidth).
			Align(lipgloss.Center)

		loadingStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("205")).
			Width(contentWidth).
			Align(lipgloss.Center)

		hintStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color("241")).
			Width(contentWidth).
			Align(lipgloss.Center)

		separator := strings.Repeat("─", contentWidth)

		modalContent := lipgloss.JoinVertical(
			lipgloss.Left,
			titleStyle.Render(title),
			separator,
			"",
			loadingStyle.Render(loadingText),
			hintStyle.Render(loadingHint),
			"",
			separator,
			footerStyle.Render(footer),
		)

		modalStyle := lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("63")).
			Padding(1, 2).
			Width(modalWidth).
			Height(modalHeight)

		return modalStyle.Render(modalContent)
	}

	// Split content into lines
	lines := strings.Split(m.content, "\n")

	// Calculate max scroll
	m.maxScroll = len(lines) - contentHeight
	if m.maxScroll < 0 {
		m.maxScroll = 0
	}

	// Ensure scroll offset is valid
	if m.scrollOffset > m.maxScroll {
		m.scrollOffset = m.maxScroll
	}

	// Get visible lines
	visibleStart := m.scrollOffset
	visibleEnd := visibleStart + contentHeight
	if visibleEnd > len(lines) {
		visibleEnd = len(lines)
	}

	var visibleLines []string
	if visibleStart < len(lines) {
		visibleLines = lines[visibleStart:visibleEnd]
	}

	// Truncate lines that are too long
	for i, line := range visibleLines {
		if len(line) > contentWidth {
			visibleLines[i] = line[:contentWidth-3] + "..."
		}
	}

	// Build scroll indicator
	scrollIndicator := ""
	if m.maxScroll > 0 {
		if m.scrollOffset > 0 && m.scrollOffset < m.maxScroll {
			scrollIndicator = " [▲▼]"
		} else if m.scrollOffset > 0 {
			scrollIndicator = " [▲]"
		} else if m.scrollOffset < m.maxScroll {
			scrollIndicator = " [▼]"
		}
	}

	// Build the modal content
	title := "📋 Daily Report Preview" + scrollIndicator
	footer := "y: copy | j/k: scroll | g/G: top/bottom | esc: close"

	// Style definitions
	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("86")).
		Width(contentWidth).
		Align(lipgloss.Center)

	footerStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Width(contentWidth).
		Align(lipgloss.Center)

	contentStyle := lipgloss.NewStyle().
		Width(contentWidth)

	// Render content
	renderedTitle := titleStyle.Render(title)
	separator := strings.Repeat("─", contentWidth)
	renderedContent := contentStyle.Render(strings.Join(visibleLines, "\n"))
	renderedFooter := footerStyle.Render(footer)

	// Combine all parts
	modalContent := lipgloss.JoinVertical(
		lipgloss.Left,
		renderedTitle,
		separator,
		renderedContent,
		separator,
		renderedFooter,
	)

	// Create the modal box
	modalStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("63")).
		Padding(1, 2).
		Width(modalWidth).
		Height(modalHeight)

	return modalStyle.Render(modalContent)
}
