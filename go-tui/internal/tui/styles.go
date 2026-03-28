package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	// Colors - Modern dark theme
	colorPrimary  = lipgloss.Color("#61afef") // Cyan for focused borders
	colorSuccess  = lipgloss.Color("#98c379") // Green
	colorWarning  = lipgloss.Color("#e5c07b") // Yellow
	colorError    = lipgloss.Color("#e06c75") // Red
	colorMuted    = lipgloss.Color("#6b7280") // Gray
	colorBorder   = lipgloss.Color("#5c6370") // Dark gray for unfocused
	colorFg       = lipgloss.Color("white")   // White text
	colorSelected = lipgloss.Color("#e2b714") // Gold for selected items

	// Extended colors for Bubble Tea v2 styling
	colorBgDark      = lipgloss.Color("#1E1E2E") // Dark blue-gray
	colorBgPanel     = lipgloss.Color("#282838") // Panel background
	colorBgSelected  = lipgloss.Color("#313244") // Selected background
	colorFgSecondary = lipgloss.Color("#A6ADC8") // Light gray
	colorFgDim       = lipgloss.Color("#6C7086") // Dimmed gray
	colorInfo        = lipgloss.Color("#8BE9FD") // Light blue
	colorAccent      = lipgloss.Color("#BD93F9") // Purple
)

// Base styles
var (
	baseStyle = lipgloss.NewStyle().
			Foreground(colorFg).
			Background(colorBgDark)

	dimStyle = baseStyle.Copy().
			Foreground(colorFgDim)
)

// Panel styles
var (
	activeBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorPrimary).
				Padding(0, 1)

	inactiveBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorBorder).
				Padding(0, 1)

	panelTitleFocused = lipgloss.NewStyle().
				Bold(true).
				Foreground(colorPrimary).
				Background(colorBgSelected).
				Padding(0, 2)

	panelTitleUnfocused = lipgloss.NewStyle().
				Bold(true).
				Foreground(colorFgSecondary).
				Padding(0, 2)
)

// Task list styles
var (
	titleStyle        = lipgloss.NewStyle().Bold(true).Foreground(colorPrimary)
	selectedItemStyle = lipgloss.NewStyle().
				Background(colorBgSelected).
				Foreground(colorSelected).
				Bold(true).
				Padding(0, 1)
	itemStyle = lipgloss.NewStyle().
			Foreground(colorFg).
			Padding(0, 1)

	// Task key styling
	taskKeyStyle = lipgloss.NewStyle().
			Foreground(colorInfo).
			Bold(true)

	// Fix version badge
	fixVersionBadgeStyle = lipgloss.NewStyle().
				Foreground(colorFgSecondary)

	// Status badges
	taskStatusStyle = lipgloss.NewStyle().
			Padding(0, 1).
			Foreground(colorBgDark).
			Bold(true)

	statusTodoStyle       = taskStatusStyle.Copy().Background(colorMuted)
	statusInProgressStyle = taskStatusStyle.Copy().Background(colorPrimary)
	statusReviewStyle     = taskStatusStyle.Copy().Background(colorAccent)
	statusTestingStyle    = taskStatusStyle.Copy().Background(colorWarning)
	statusDoneStyle       = taskStatusStyle.Copy().Background(colorSuccess)
)

// Details panel styles
var (
	detailsHeaderStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(colorPrimary).
				Padding(0, 2)

	detailsLabelStyle = lipgloss.NewStyle().
				Foreground(colorFgSecondary).
				Padding(0, 2)

	detailsValueStyle = lipgloss.NewStyle().
				Foreground(colorFg).
				Padding(0, 1)
)

// Time tracking styles
var (
	dateHeaderStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorAccent).
			Padding(0, 1)

	timeStyle = lipgloss.NewStyle().
			Foreground(colorSuccess).
			Bold(true)
)

// Modal styles (common, but individual modals may override)
var (
	modalTitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(colorPrimary).
			MarginBottom(1)

	modalPromptStyle = lipgloss.NewStyle().
				Foreground(colorFgSecondary).
				MarginBottom(1)

	modalInputFocused = lipgloss.NewStyle().
				Foreground(colorSuccess).
				Background(colorBgSelected).
				Padding(0, 1)

	modalInputUnfocused = lipgloss.NewStyle().
				Foreground(colorFg).
				Padding(0, 1)

	modalButtonStyle = lipgloss.NewStyle().
				Foreground(colorFgSecondary).
				Padding(0, 2).
				Margin(0, 1)

	modalButtonFocused = modalButtonStyle.Copy().
				Foreground(colorSuccess).
				Background(colorBgSelected).
				Bold(true)

	modalErrorStyle = lipgloss.NewStyle().
			Foreground(colorError).
			Bold(true).
			MarginTop(1)

	modalSuccessStyle = lipgloss.NewStyle().
				Foreground(colorSuccess).
				Bold(true).
				MarginTop(1)
)

// Status bar styles
var (
	statusBarStyle       = lipgloss.NewStyle().Foreground(colorMuted).Padding(0, 1)
	statusKeyStyle       = lipgloss.NewStyle().Foreground(colorInfo).Bold(true)
	statusSeparatorStyle = lipgloss.NewStyle().Foreground(colorFgDim).SetString(" │ ")
	statusLoadingStyle   = lipgloss.NewStyle().Foreground(colorWarning).SetString("⏳")
	statusErrorStyle     = lipgloss.NewStyle().Foreground(colorError).Bold(true)
	statusSuccessStyle   = lipgloss.NewStyle().Foreground(colorSuccess)

	errorStyle   = lipgloss.NewStyle().Foreground(colorError).Bold(true)
	loadingStyle = lipgloss.NewStyle().Foreground(colorWarning).Bold(true)

	// Progress bar styles
	progressFull    = lipgloss.NewStyle().Foreground(colorSuccess).Background(colorSuccess)
	progressEmpty   = lipgloss.NewStyle().Foreground(colorBgSelected).Background(colorBgSelected)
	progressText    = lipgloss.NewStyle().Foreground(colorFgSecondary)
	progressPercent = lipgloss.NewStyle().Foreground(colorSuccess).Bold(true)
)

// Helper functions

// RenderProgressBar renders a beautiful progress bar with percentage
// width is the total width of the progress bar in characters
// progress is a float from 0.0 to 1.0
func RenderProgressBar(width int, progress float64, step string) string {
	if width < 10 {
		width = 10 // Minimum width
	}

	// Clamp progress between 0 and 1
	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}

	// Calculate filled width
	filledWidth := int(float64(width) * progress)
	if filledWidth > width {
		filledWidth = width
	}

	// Create the progress bar
	// Use full block for filled, light block for empty
	filled := strings.Repeat("█", filledWidth)
	empty := strings.Repeat("░", width-filledWidth)

	// Build the progress line
	bar := progressFull.Render(filled) + progressEmpty.Render(empty)

	// Add percentage
	percent := int(progress * 100)
	percentText := progressPercent.Render(fmt.Sprintf(" %d%%", percent))

	// Build step description
	stepText := ""
	if step != "" {
		stepText = " " + progressText.Render(step)
	}

	return bar + percentText + stepText
}

// RenderCompactProgressBar renders a compact progress bar (for narrow panels)
func RenderCompactProgressBar(width int, progress float64) string {
	if width < 5 {
		width = 5
	}

	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}

	filledWidth := int(float64(width) * progress)
	if filledWidth > width {
		filledWidth = width
	}

	filled := strings.Repeat("█", filledWidth)
	empty := strings.Repeat("░", width-filledWidth)

	return progressFull.Render(filled) + progressEmpty.Render(empty)
}

// Helper functions

// GetStatusStyle returns the styled status badge
func GetStatusStyle(statusName string) lipgloss.Style {
	switch statusName {
	case "To Do", "Open":
		return statusTodoStyle
	case "In Progress":
		return statusInProgressStyle
	case "In Review", "Under Review":
		return statusReviewStyle
	case "Ready for Testing", "Testing":
		return statusTestingStyle
	case "Done", "Closed", "Resolved":
		return statusDoneStyle
	default:
		return taskStatusStyle
	}
}

// RenderStatusBadge renders a status badge
func RenderStatusBadge(statusName string) string {
	style := GetStatusStyle(statusName)
	return style.Render(statusName)
}
