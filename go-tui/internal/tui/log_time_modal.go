package tui

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// LogTimeModal represents the log time modal state
type LogTimeModal struct {
	task       *model.Issue
	mode       int // 0=menu, 1=time input, 2=description input, 3=date input, 4=confirm
	menuChoice int // 0=quick, 1=with desc, 2=full
	timeInput  textinput.Model
	descInput  textinput.Model
	dateInput  textinput.Model
	timeValue  string
	descValue  string
	dateValue  string
	err        string
	active     bool
}

// NewLogTimeModal creates a new log time modal
func NewLogTimeModal(task *model.Issue) *LogTimeModal {
	ti := textinput.New()
	ti.Placeholder = "e.g., 2h, 1.5h, 30m"
	ti.Focus()
	ti.CharLimit = 20
	ti.Width = 40

	di := textinput.New()
	di.Placeholder = "Optional description"
	di.CharLimit = 200
	di.Width = 40

	dti := textinput.New()
	dti.Placeholder = "today, yesterday, or YYYY-MM-DD"
	dti.CharLimit = 20
	dti.Width = 40

	return &LogTimeModal{
		task:       task,
		mode:       0, // Start with menu
		menuChoice: 0,
		timeInput:  ti,
		descInput:  di,
		dateInput:  dti,
		dateValue:  "today",
		active:     true,
	}
}

// Update handles modal updates
func (m *LogTimeModal) Update(msg tea.Msg) (*LogTimeModal, tea.Cmd) {
	if !m.active {
		return m, nil
	}

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch m.mode {
		case 0: // Menu mode
			return m.updateMenu(msg)
		case 1: // Time input
			return m.updateTimeInput(msg)
		case 2: // Description input
			return m.updateDescInput(msg)
		case 3: // Date input
			return m.updateDateInput(msg)
		case 4: // Confirm
			return m.updateConfirm(msg)
		}
	}

	return m, nil
}

// updateMenu handles menu navigation
func (m *LogTimeModal) updateMenu(msg tea.KeyMsg) (*LogTimeModal, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.active = false
		return m, nil
	case "j", "down":
		m.menuChoice = (m.menuChoice + 1) % 3
	case "k", "up":
		if m.menuChoice == 0 {
			m.menuChoice = 2
		} else {
			m.menuChoice--
		}
	case "enter":
		// Move to time input
		m.mode = 1
		m.timeInput.Focus()
	case "1":
		m.menuChoice = 0
		m.mode = 1
		m.timeInput.Focus()
	case "2":
		m.menuChoice = 1
		m.mode = 1
		m.timeInput.Focus()
	case "3":
		m.menuChoice = 2
		m.mode = 1
		m.timeInput.Focus()
	}
	return m, nil
}

// updateTimeInput handles time input
func (m *LogTimeModal) updateTimeInput(msg tea.KeyMsg) (*LogTimeModal, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.active = false
		return m, nil
	case "enter":
		timeStr := strings.TrimSpace(m.timeInput.Value())
		if timeStr == "" {
			m.err = "Time is required"
			return m, nil
		}

		// Parse time
		seconds, err := parseTimeString(timeStr)
		if err != nil {
			m.err = err.Error()
			return m, nil
		}

		m.timeValue = timeStr
		m.err = ""

		// Depending on menu choice, move to next step
		if m.menuChoice == 0 {
			// Quick mode: skip to confirm
			m.dateValue = time.Now().Format("2006-01-02")
			m.mode = 4
		} else if m.menuChoice == 1 {
			// With description: go to description
			m.mode = 2
			m.descInput.Focus()
		} else {
			// Full mode: go to description
			m.mode = 2
			m.descInput.Focus()
		}
		_ = seconds // Will use this later for API call
	default:
		var cmd tea.Cmd
		m.timeInput, cmd = m.timeInput.Update(msg)
		return m, cmd
	}
	return m, nil
}

// updateDescInput handles description input
func (m *LogTimeModal) updateDescInput(msg tea.KeyMsg) (*LogTimeModal, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.active = false
		return m, nil
	case "enter":
		m.descValue = strings.TrimSpace(m.descInput.Value())

		if m.menuChoice == 1 {
			// With description mode: skip date, use today
			m.dateValue = time.Now().Format("2006-01-02")
			m.mode = 4
		} else {
			// Full mode: go to date input
			m.mode = 3
			m.dateInput.Focus()
		}
	default:
		var cmd tea.Cmd
		m.descInput, cmd = m.descInput.Update(msg)
		return m, cmd
	}
	return m, nil
}

// updateDateInput handles date input
func (m *LogTimeModal) updateDateInput(msg tea.KeyMsg) (*LogTimeModal, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.active = false
		return m, nil
	case "enter":
		dateStr := strings.TrimSpace(m.dateInput.Value())
		if dateStr == "" {
			dateStr = "today"
		}

		// Parse date
		parsedDate, err := parseDate(dateStr)
		if err != nil {
			m.err = err.Error()
			return m, nil
		}

		m.dateValue = parsedDate
		m.err = ""
		m.mode = 4 // Move to confirm
	default:
		var cmd tea.Cmd
		m.dateInput, cmd = m.dateInput.Update(msg)
		return m, cmd
	}
	return m, nil
}

// updateConfirm handles confirmation
func (m *LogTimeModal) updateConfirm(msg tea.KeyMsg) (*LogTimeModal, tea.Cmd) {
	switch msg.String() {
	case "esc", "n":
		m.active = false
		return m, nil
	case "y", "enter":
		// Submit worklog
		m.active = false
		return m, m.submitWorklog()
	}
	return m, nil
}

// View renders the modal
func (m *LogTimeModal) View() string {
	if !m.active {
		return ""
	}

	var content string
	title := fmt.Sprintf("Log Time - %s", m.task.Key)

	switch m.mode {
	case 0: // Menu
		content = m.renderMenu()
	case 1: // Time input
		content = m.renderTimeInput()
	case 2: // Description input
		content = m.renderDescInput()
	case 3: // Date input
		content = m.renderDateInput()
	case 4: // Confirm
		content = m.renderConfirm()
	}

	if m.err != "" {
		content += "\n\n" + errorStyle.Render("Error: "+m.err)
	}

	return modalStyle.Width(42).Render(
		titleStyle.Render(title) + "\n" + content,
	)
}

func (m *LogTimeModal) renderMenu() string {
	options := []string{
		"Log time (quick - today only)",
		"Log time with description",
		"Log time with date & description",
	}

	var lines []string
	for i, opt := range options {
		prefix := "  "
		if i == m.menuChoice {
			prefix = "▶ "
			lines = append(lines, selectedItemStyle.Render(prefix+opt))
		} else {
			lines = append(lines, itemStyle.Render(prefix+opt))
		}
	}

	lines = append(lines, "")
	lines = append(lines, itemStyle.Foreground(colorMuted).Render("[↑↓/jk] Navigate  [Enter] Select  [ESC] Cancel"))

	return strings.Join(lines, "\n")
}

func (m *LogTimeModal) renderTimeInput() string {
	return "Time (e.g., 2h, 1.5h, 30m):\n\n" +
		m.timeInput.View() + "\n\n" +
		itemStyle.Foreground(colorMuted).Render("[Enter] Continue  [ESC] Cancel")
}

func (m *LogTimeModal) renderDescInput() string {
	return "Description (optional):\n\n" +
		m.descInput.View() + "\n\n" +
		itemStyle.Foreground(colorMuted).Render("[Enter] Continue  [ESC] Cancel")
}

func (m *LogTimeModal) renderDateInput() string {
	return "Date (today, yesterday, or YYYY-MM-DD):\n\n" +
		m.dateInput.View() + "\n\n" +
		itemStyle.Foreground(colorMuted).Render("[Enter] Continue  [ESC] Cancel")
}

func (m *LogTimeModal) renderConfirm() string {
	summary := fmt.Sprintf("Log %s to %s on %s", m.timeValue, m.task.Key, m.dateValue)
	if m.descValue != "" {
		summary += fmt.Sprintf("\nDescription: %s", m.descValue)
	}

	return summary + "\n\n" +
		itemStyle.Foreground(colorSuccess).Render("[Y/Enter] Confirm") + "  " +
		itemStyle.Foreground(colorError).Render("[N/ESC] Cancel")
}

func (m *LogTimeModal) submitWorklog() tea.Cmd {
	return func() tea.Msg {
		// Parse time to seconds
		seconds, err := parseTimeString(m.timeValue)
		if err != nil {
			return statusMessage{
				message: fmt.Sprintf("Error: %v", err),
				isError: true,
				refresh: false,
			}
		}

		// Parse issue ID from task
		issueID, err := strconv.Atoi(m.task.ID)
		if err != nil {
			return statusMessage{
				message: fmt.Sprintf("Error: invalid issue ID"),
				isError: true,
				refresh: false,
			}
		}

		// NOTE: Actual API call would go here
		// For now, we'll return success and trigger refresh
		// TODO: Uncomment and use when tempoClient is available
		_ = seconds // Will use when API is implemented
		_ = issueID // Will use when API is implemented
		// _, err = tempoClient.CreateWorklog(issueID, seconds, m.dateValue, m.descValue, userAccountID)
		// if err != nil {
		//     return statusMessage{
		//         message: fmt.Sprintf("Failed to log time: %v", err),
		//         isError: true,
		//         refresh: false,
		//     }
		// }

		return statusMessage{
			message: fmt.Sprintf("✓ Logged %s to %s", m.timeValue, m.task.Key),
			isError: false,
			refresh: true, // Trigger progressive refresh
		}
	}
}

// Helper functions

func parseTimeString(s string) (int, error) {
	s = strings.TrimSpace(s)
	// Match patterns like "2h", "1.5h", "30m", "2h30m"
	re := regexp.MustCompile(`(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?`)
	matches := re.FindStringSubmatch(s)

	if len(matches) == 0 {
		return 0, fmt.Errorf("invalid time format")
	}

	var totalSeconds int

	// Hours
	if matches[1] != "" {
		hours, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("invalid hours: %w", err)
		}
		totalSeconds += int(hours * 3600)
	}

	// Minutes
	if matches[2] != "" {
		minutes, err := strconv.Atoi(matches[2])
		if err != nil {
			return 0, fmt.Errorf("invalid minutes: %w", err)
		}
		totalSeconds += minutes * 60
	}

	if totalSeconds == 0 {
		return 0, fmt.Errorf("invalid time format")
	}

	return totalSeconds, nil
}

func parseDate(s string) (string, error) {
	s = strings.ToLower(strings.TrimSpace(s))

	switch s {
	case "today", "":
		return time.Now().Format("2006-01-02"), nil
	case "yesterday":
		return time.Now().AddDate(0, 0, -1).Format("2006-01-02"), nil
	default:
		// Try parsing as YYYY-MM-DD
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return "", fmt.Errorf("invalid date format (use: today, yesterday, or YYYY-MM-DD)")
		}
		return t.Format("2006-01-02"), nil
	}
}

// Modal styling
var modalStyle = lipgloss.NewStyle().
	Border(lipgloss.RoundedBorder()).
	BorderForeground(colorPrimary).
	Background(lipgloss.Color("#1e1e2e")).
	Padding(1).
	Align(lipgloss.Left)
