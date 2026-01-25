package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/atotto/clipboard"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/report"
	htmlclipboard "github.com/yourusername/jira-daily-report/internal/tui/clipboard"
)

// ReportPreviewModal shows a full-screen preview of the daily report
type ReportPreviewModal struct {
	active       bool
	content      string
	htmlContent  string
	scrollOffset int
	maxScroll    int
	width        int
	height       int
}

// reportCopiedMsg is sent when the report is copied to clipboard
type reportCopiedMsg struct {
	message string
}

// NewReportPreviewModal creates a new report preview modal
func NewReportPreviewModal(worklogs []model.Worklog, inProgress []model.Issue, prevDate time.Time, width, height int) *ReportPreviewModal {
	// Build the report content using the report builder
	content := report.BuildMainReport(worklogs, inProgress, prevDate)
	htmlContent := report.BuildHTMLReport(worklogs, inProgress, prevDate)

	return &ReportPreviewModal{
		active:       true,
		content:      content,
		htmlContent:  htmlContent,
		scrollOffset: 0,
		width:        width,
		height:       height,
	}
}

// IsActive returns true if the modal is active
func (m *ReportPreviewModal) IsActive() bool {
	return m.active
}

// Update handles input for the report preview modal
func (m *ReportPreviewModal) Update(msg tea.KeyMsg) (*ReportPreviewModal, tea.Cmd) {
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

	case "c":
		// Copy report as Text
		return m, m.copyReport(false, false)

	case "y":
		// Copy report as HTML
		return m, m.copyReport(true, false)

	case "Y":
		// Copy HTML source as text
		return m, m.copyReport(true, true)


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
func (m *ReportPreviewModal) copyReport(html bool, source bool) tea.Cmd {
	return func() tea.Msg {
		if html {
			if source {
				// Copy HTML source as plain text
				if err := clipboard.WriteAll(m.htmlContent); err != nil {
					return errMsg{fmt.Errorf("failed to copy HTML source: %w", err)}
				}
				return reportCopiedMsg{message: "HTML source copied to clipboard!"}
			}

			// Copy as Rich Text (HTML)
			if err := htmlclipboard.WriteHTML(m.htmlContent); err != nil {
				return errMsg{fmt.Errorf("failed to copy HTML report: %w", err)}
			}
			return reportCopiedMsg{message: "Report copied (Rich Text)!"}
		}

		if err := clipboard.WriteAll(m.content); err != nil {
			return errMsg{fmt.Errorf("failed to copy report: %w", err)}
		}
		return reportCopiedMsg{message: "Report copied to clipboard (Text)!"}
	}
}

// View renders the report preview modal
func (m *ReportPreviewModal) View() string {
	if !m.active {
		return ""
	}

	// Calculate dimensions
	modalWidth := m.width - 4
	modalHeight := m.height - 4
	contentWidth := modalWidth - 4   // Padding inside modal
	contentHeight := modalHeight - 6 // Title + footer + padding

	if contentWidth < 20 {
		contentWidth = 20
	}
	if contentHeight < 5 {
		contentHeight = 5
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
	footer := "c: text | y: html | Y: source | j/k: scroll | esc: close"

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
