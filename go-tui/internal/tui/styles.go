package tui

import "github.com/charmbracelet/lipgloss"

var (
	// Colors - Dark theme matching TypeScript UI
	colorPrimary  = lipgloss.Color("#61afef") // Cyan for focused borders
	colorSuccess  = lipgloss.Color("#98c379") // Green
	colorWarning  = lipgloss.Color("#e5c07b") // Yellow
	colorError    = lipgloss.Color("#e06c75") // Red
	colorMuted    = lipgloss.Color("#6b7280") // Gray
	colorBorder   = lipgloss.Color("#5c6370") // Dark gray for unfocused
	colorFg       = lipgloss.Color("white")   // White text
	colorSelected = lipgloss.Color("#e2b714") // Gold for selected items
)

var (
	activeBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorPrimary).
				Padding(0, 1) // Reduced padding for more content space

	inactiveBorderStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorBorder).
				Padding(0, 1) // Reduced padding for more content space

	titleStyle        = lipgloss.NewStyle().Bold(true).Foreground(colorPrimary)
	selectedItemStyle = lipgloss.NewStyle().Foreground(colorSelected).Bold(true)
	itemStyle         = lipgloss.NewStyle().Foreground(colorFg)
	statusBarStyle    = lipgloss.NewStyle().Foreground(colorMuted).Padding(0, 1)
	errorStyle        = lipgloss.NewStyle().Foreground(colorError).Bold(true)
	loadingStyle      = lipgloss.NewStyle().Foreground(colorWarning).Bold(true)
)
