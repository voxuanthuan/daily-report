package tui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// BorderChars defines border characters
type BorderChars struct {
	TopLeft     string
	TopRight    string
	BottomLeft  string
	BottomRight string
	Horizontal  string
	Vertical    string
}

var (
	// RoundedBorder uses rounded box-drawing characters
	RoundedBorder = BorderChars{
		TopLeft:     "╭",
		TopRight:    "╮",
		BottomLeft:  "╰",
		BottomRight: "╯",
		Horizontal:  "─",
		Vertical:    "│",
	}
)

// RenderWithTitleAndCounter renders content with custom border
// Title is embedded in the top border, counter in the bottom-right
func RenderWithTitleAndCounter(content string, width, height int, title string, counter string, isActive bool, borderChars BorderChars) string {
	// Choose border color based on active state
	borderColor := colorBorder
	titleColor := colorBorder
	if isActive {
		borderColor = colorPrimary
		titleColor = colorPrimary
	}

	// Calculate available width for border content (exclude corners)
	innerWidth := width - 2
	if innerWidth < 0 {
		return "" // Not enough space to render borders
	}

	// BUILD TOP BORDER with embedded title
	// Format: "╭─[1] Report─────────╮"
	titleRendered := lipgloss.NewStyle().Foreground(titleColor).Bold(true).Render(title)
	titleWidth := lipgloss.Width(titleRendered)

	// Calculate how many horizontal chars to fill
	remainingWidth := innerWidth - titleWidth
	if remainingWidth < 0 {
		remainingWidth = 0
		// Safe truncation for title
		runesModule := []rune(title)
		truncateLen := innerWidth
		if truncateLen > len(runesModule) {
			truncateLen = len(runesModule)
		}
		if truncateLen < 0 {
			truncateLen = 0
		}
		safeTitle := string(runesModule[:truncateLen])
		titleRendered = lipgloss.NewStyle().Foreground(titleColor).Bold(true).Render(safeTitle)
	}

	topBorder := lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.TopLeft) +
		titleRendered +
		lipgloss.NewStyle().Foreground(borderColor).Render(strings.Repeat(borderChars.Horizontal, remainingWidth)) +
		lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.TopRight)

	// BUILD BOTTOM BORDER with counter on right
	// Format: "╰──────────1 of 5─╯"
	counterRendered := ""
	counterWidth := 0
	if counter != "" {
		counterRendered = lipgloss.NewStyle().Foreground(colorMuted).Render(counter)
		counterWidth = lipgloss.Width(counterRendered)
	}

	leftPadding := innerWidth - counterWidth
	if leftPadding < 0 {
		leftPadding = 0
	}

	bottomBorder := lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.BottomLeft) +
		lipgloss.NewStyle().Foreground(borderColor).Render(strings.Repeat(borderChars.Horizontal, leftPadding)) +
		counterRendered +
		lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.BottomRight)

	// RENDER CONTENT LINES with side borders
	contentLines := strings.Split(content, "\n")
	contentHeight := height - 2 // Exclude top and bottom borders

	// Pad or truncate content to fit height
	for len(contentLines) < contentHeight {
		contentLines = append(contentLines, "")
	}
	if len(contentLines) > contentHeight {
		contentLines = contentLines[:contentHeight]
	}

	var borderedLines []string
	borderedLines = append(borderedLines, topBorder)

	// Add padding to account for border padding
	paddingLeft := 1
	paddingRight := 1
	availableContentWidth := innerWidth - paddingLeft - paddingRight

	for _, line := range contentLines {
		// Calculate actual display width
		lineWidth := lipgloss.Width(line)

		// Calculate padding needed
		rightPadding := availableContentWidth - lineWidth
		if rightPadding < 0 {
			rightPadding = 0
		}

		borderedLine := lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.Vertical) +
			strings.Repeat(" ", paddingLeft) +
			line +
			strings.Repeat(" ", rightPadding) +
			strings.Repeat(" ", paddingRight) +
			lipgloss.NewStyle().Foreground(borderColor).Render(borderChars.Vertical)

		borderedLines = append(borderedLines, borderedLine)
	}

	borderedLines = append(borderedLines, bottomBorder)

	return strings.Join(borderedLines, "\n")
}
