package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/model"
)

// Model represents the Bubbletea application model
type Model struct {
	state        *State
	keys         KeyMap
	width        int
	height       int
	jiraClient   *api.JiraClient
	tempoClient  *api.TempoClient
	config       *config.Manager
	logTimeModal *LogTimeModal // Active log time modal (nil if not shown)
}

// NewModel creates a new TUI model
func NewModel(cfg *config.Manager) *Model {
	jiraClient := api.NewJiraClient(
		cfg.GetJiraServer(),
		cfg.GetUsername(),
		cfg.GetApiToken(),
	)

	tempoClient := api.NewTempoClient(
		cfg.GetTempoApiToken(),
		jiraClient,
	)

	return &Model{
		state:       NewState(),
		keys:        DefaultKeyMap(),
		jiraClient:  jiraClient,
		tempoClient: tempoClient,
		config:      cfg,
	}
}

// Init initializes the model
func (m Model) Init() tea.Cmd {
	return tea.Batch(
		m.loadData,
		tea.EnterAltScreen,
	)
}

// loadData fetches initial data from Jira and Tempo
func (m *Model) loadData() tea.Msg {
	// Fetch current user
	user, err := m.jiraClient.FetchCurrentUser()
	if err != nil {
		return errMsg{err}
	}

	username := m.config.GetUsername()

	// Fetch tasks concurrently
	type taskResult struct {
		inProgress  []model.Issue
		todo        []model.Issue
		underReview []model.Issue
		testing     []model.Issue
		err         error
	}

	resultChan := make(chan taskResult, 1)

	go func() {
		var result taskResult

		// Fetch In Progress tasks
		result.inProgress, result.err = m.jiraClient.FetchInProgressTasks(username)
		if result.err != nil {
			resultChan <- result
			return
		}

		// Fetch Open tasks
		result.todo, result.err = m.jiraClient.FetchOpenTasks(username)
		if result.err != nil {
			resultChan <- result
			return
		}

		// Fetch Under Review tasks
		result.underReview, result.err = m.jiraClient.FetchUnderReviewTasks(username)
		if result.err != nil {
			resultChan <- result
			return
		}

		// Fetch Ready for Testing tasks
		result.testing, result.err = m.jiraClient.FetchReadyForTestingTasks(username)
		if result.err != nil {
			resultChan <- result
			return
		}

		resultChan <- result
	}()

	tasks := <-resultChan
	if tasks.err != nil {
		return errMsg{tasks.err}
	}

	// Fetch worklogs using the user's account ID
	worklogs, err := m.tempoClient.FetchLastSixDaysWorklogs(user.AccountID)
	if err != nil {
		return errMsg{err}
	}

	// Enrich with issue details
	enriched, err := m.tempoClient.EnrichWorklogsWithIssueDetails(worklogs)
	if err != nil {
		return errMsg{err}
	}

	// Group by date
	dateGroups := groupWorklogsByDate(enriched)

	// Combine Under Review + Testing for Processing panel
	processingTasks := append(tasks.underReview, tasks.testing...)

	return dataLoadedMsg{
		user:            user,
		reportTasks:     tasks.inProgress,
		todoTasks:       tasks.todo,
		processingTasks: processingTasks,
		worklogs:        enriched,
		dateGroups:      dateGroups,
	}
}

// Update handles messages and updates the model
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		// Handle modal input first if modal is active
		if m.logTimeModal != nil && m.logTimeModal.active {
			updatedModal, cmd := m.logTimeModal.Update(msg)
			m.logTimeModal = updatedModal
			return m, cmd
		}
		return m.handleKeyPress(msg)

	case dataLoadedMsg:
		m.state.User = msg.user
		m.state.ReportTasks = msg.reportTasks
		m.state.TodoTasks = msg.todoTasks
		m.state.ProcessingTasks = msg.processingTasks
		m.state.Worklogs = msg.worklogs
		m.state.DateGroups = msg.dateGroups
		m.state.Loading = false
		m.state.StatusMessage = fmt.Sprintf("Loaded %d tasks, %d worklogs",
			len(msg.reportTasks)+len(msg.todoTasks)+len(msg.processingTasks),
			len(msg.worklogs))
		return m, nil

	case errMsg:
		m.state.Error = msg.error
		m.state.Loading = false
		m.state.StatusMessage = fmt.Sprintf("Error: %v", msg.error)
		return m, nil

	case statusMsg:
		m.state.StatusMessage = msg.message
		return m, nil
	}

	return m, nil
}

// handleKeyPress handles keyboard input
func (m Model) handleKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit

	case "k", "up":
		m.state.MoveSelectionUp()
		return m, nil

	case "j", "down":
		m.state.MoveSelectionDown()
		return m, nil

	case "1":
		m.state.ActivePanel = PanelReport
		return m, nil

	case "2":
		m.state.ActivePanel = PanelTodo
		return m, nil

	case "3":
		m.state.ActivePanel = PanelProcessing
		return m, nil

	case "0":
		m.state.ActivePanel = PanelTimelog
		return m, nil

	case "l", "right", "tab":
		// Cycle through panels: Report -> Todo -> Processing -> Timelog -> Details -> Report
		m.state.ActivePanel = (m.state.ActivePanel + 1) % 5
		return m, nil

	case "h", "left":
		// Cycle backwards
		if m.state.ActivePanel == 0 {
			m.state.ActivePanel = 4
		} else {
			m.state.ActivePanel--
		}
		return m, nil

	case "enter":
		// Open action menu for selected task
		return m.handleAction()

	case "c":
		// Copy task key to clipboard
		return m, m.copyTaskToClipboard()

	case "i":
		// Show log time modal
		return m.showLogTimeModal()
	}

	return m, nil
}

// View renders the TUI
func (m Model) View() string {
	if m.state.Loading {
		return loadingStyle.Render("Loading...")
	}

	if m.state.Error != nil {
		return errorStyle.Render(fmt.Sprintf("Error: %v\n\nPress q to quit", m.state.Error))
	}

	// Calculate responsive dimensions
	// Layout: 60% left (3 panels stacked) + 40% right (Details + Time stacked)
	// Leave 1 line at top and 2 at bottom for terminal chrome
	availableHeight := m.height - 4              // Reserve 1 top + 3 bottom (status + margin)
	leftPanelHeight := (availableHeight - 3) / 3 // Each of 3 left panels

	// Account for lipgloss borders: 2 chars per side (4 total) + padding 2x2 (4 total) = 8 chars per panel
	// Plus 2 chars spacing between columns = 10 chars overhead per column
	totalOverhead := 20 // Left column overhead + Right column overhead
	availableWidth := m.width - totalOverhead

	leftPanelWidth := int(float64(availableWidth) * 0.60) // 60% of usable width
	rightPanelWidth := availableWidth - leftPanelWidth    // Remaining 40%

	// Right column split: Details (60% of height) + Time (40% of height)
	detailsPanelHeight := int(float64(availableHeight) * 0.6)
	timePanelHeight := availableHeight - detailsPanelHeight - 2 // Extra margin between panels

	// Render panels with dynamic dimensions
	reportPanel := m.renderPanelWithSize("Report", PanelReport, m.state.ReportTasks, "[1]", leftPanelWidth, leftPanelHeight)
	todoPanel := m.renderPanelWithSize("Todo", PanelTodo, m.state.TodoTasks, "[2]", leftPanelWidth, leftPanelHeight)
	processingPanel := m.renderPanelWithSize("Processing", PanelProcessing, m.state.ProcessingTasks, "[3]", leftPanelWidth, leftPanelHeight)
	detailsPanel := m.renderDetailsPanelWithSize(rightPanelWidth, detailsPanelHeight)
	timelogPanel := m.renderTimelogPanelWithSize(rightPanelWidth, timePanelHeight)

	// Left column: 3 panels stacked vertically
	leftColumn := lipgloss.JoinVertical(lipgloss.Left, reportPanel, todoPanel, processingPanel)

	// Right column: Details + Time stacked vertically
	rightColumn := lipgloss.JoinVertical(lipgloss.Left, detailsPanel, timelogPanel)

	// Combine: left (60%) + right (40%)
	content := lipgloss.JoinHorizontal(lipgloss.Top, leftColumn, rightColumn)

	statusBar := m.renderStatusBar()

	baseView := lipgloss.JoinVertical(lipgloss.Left, content, statusBar)

	// Overlay modal if active
	if m.logTimeModal != nil && m.logTimeModal.active {
		// Render modal without any placement
		modalView := m.logTimeModal.View()

		// Split both views into lines
		modalLines := strings.Split(modalView, "\n")
		baseLines := strings.Split(baseView, "\n")

		// Calculate modal dimensions
		_ = len(modalLines) // modalHeight not needed with simpler positioning
		modalWidth := 0
		for _, line := range modalLines {
			width := lipgloss.Width(line)
			if width > modalWidth {
				modalWidth = width
			}
		}

		// Position modal in the upper-middle area to avoid covering panel titles
		// Place it about 1/3 down from the top
		startY := m.height / 3

		// Ensure we don't go negative
		if startY < 0 {
			startY = 0
		}

		// Create output with base view, then overlay modal at center position
		overlayLines := make([]string, len(baseLines))
		copy(overlayLines, baseLines)

		// Replace lines where modal appears with centered modal lines
		for i, modalLine := range modalLines {
			lineY := startY + i
			if lineY >= 0 && lineY < len(overlayLines) {
				// Center the modal line
				modalLineWidth := lipgloss.Width(modalLine)
				leftPadding := (m.width - modalLineWidth) / 2
				if leftPadding < 0 {
					leftPadding = 0
				}

				// Create centered line with modal content
				centeredLine := strings.Repeat(" ", leftPadding) + modalLine
				overlayLines[lineY] = centeredLine
			}
		}

		return strings.Join(overlayLines, "\n")
	}

	return baseView
}

// renderPanelWithSize renders a task panel with dynamic dimensions
func (m Model) renderPanelWithSize(title string, panelType PanelType, tasks []model.Issue, panelLabel string, width, height int) string {
	isActive := m.state.ActivePanel == panelType
	selectedIdx := m.state.SelectedIndices[panelType]

	var items []string
	items = append(items, titleStyle.Render(fmt.Sprintf("%s %s (%d)", panelLabel, title, len(tasks))))
	items = append(items, "")

	if len(tasks) == 0 {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No tasks"))
	} else {
		// Calculate how many items can fit
		maxItems := height - 3 // Reserve space for title and padding
		displayTasks := tasks
		if len(tasks) > maxItems {
			// Show items around selection
			start := selectedIdx - maxItems/2
			if start < 0 {
				start = 0
			}
			end := start + maxItems
			if end > len(tasks) {
				end = len(tasks)
				start = end - maxItems
				if start < 0 {
					start = 0
				}
			}
			displayTasks = tasks[start:end]
		}

		for i, task := range displayTasks {
			prefix := "  "
			style := itemStyle
			actualIdx := i
			if len(tasks) > maxItems {
				actualIdx = i + (selectedIdx - maxItems/2)
				if actualIdx < 0 {
					actualIdx = i
				}
			}
			if actualIdx == selectedIdx && isActive {
				prefix = "▶ "
				style = selectedItemStyle
			}

			// Get emoji icon for issue type
			icon := GetIssueIcon(task.Fields.IssueType.Name)
			// Truncate summary to fit width
			maxSummaryLen := width - len(icon) - len(task.Key) - 8
			summary := task.Fields.Summary
			if maxSummaryLen < 0 { // Ensure maxSummaryLen is not negative
				maxSummaryLen = 0
			}
			if len(summary) > maxSummaryLen {
				summary = summary[:maxSummaryLen-3] + "..."
			}
			taskText := fmt.Sprintf("%s %s: %s", icon, task.Key, summary)
			items = append(items, style.Render(prefix+taskText))
		}
	}

	content := strings.Join(items, "\n")

	if isActive {
		return activeBorderStyle.Width(width).Height(height).Render(content)
	}
	return inactiveBorderStyle.Width(width).Height(height).Render(content)
}

// renderTimelogPanelWithSize renders the time tracking panel with dynamic dimensions
func (m Model) renderTimelogPanelWithSize(width, height int) string {
	isActive := m.state.ActivePanel == PanelTimelog
	selectedIdx := m.state.SelectedIndices[PanelTimelog]

	var items []string
	items = append(items, titleStyle.Render(fmt.Sprintf("[0] Time Tracking (%d)", len(m.state.DateGroups))))
	items = append(items, "")

	if len(m.state.DateGroups) == 0 {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No worklogs"))
	} else {
		// Calculate how many items can fit
		maxItems := height - 3
		displayGroups := m.state.DateGroups
		if len(m.state.DateGroups) > maxItems {
			start := selectedIdx - maxItems/2
			if start < 0 {
				start = 0
			}
			end := start + maxItems
			if end > len(m.state.DateGroups) {
				end = len(m.state.DateGroups)
				start = end - maxItems
				if start < 0 {
					start = 0
				}
			}
			displayGroups = m.state.DateGroups[start:end]
		}

		for i, group := range displayGroups {
			prefix := "  "
			style := itemStyle
			actualIdx := i
			if len(m.state.DateGroups) > maxItems {
				actualIdx = i + (selectedIdx - maxItems/2)
				if actualIdx < 0 {
					actualIdx = i
				}
			}
			if actualIdx == selectedIdx && isActive {
				prefix = "▶ "
				style = selectedItemStyle
			}
			hours := float64(group.TotalSeconds) / 3600.0
			taskWord := "task"
			if len(group.Worklogs) != 1 {
				taskWord = "tasks"
			}
			text := fmt.Sprintf("%s • %.1fh • %d %s", group.DisplayDate, hours, len(group.Worklogs), taskWord)
			items = append(items, style.Render(prefix+text))
		}
	}

	content := strings.Join(items, "\n")

	if isActive {
		return activeBorderStyle.Width(width).Height(height).Render(content)
	}
	return inactiveBorderStyle.Width(width).Height(height).Render(content)
}

// renderDetailsPanelWithSize renders the details panel with dynamic dimensions
func (m Model) renderDetailsPanelWithSize(width, height int) string {
	isActive := m.state.ActivePanel == PanelDetails

	var items []string
	items = append(items, titleStyle.Render("Details"))
	items = append(items, "")

	// Get selected task from active panel
	var selectedTask *model.Issue
	var tasks []model.Issue
	var idx int

	switch m.state.ActivePanel {
	case PanelReport:
		tasks = m.state.ReportTasks
		idx = m.state.SelectedIndices[PanelReport]
	case PanelTodo:
		tasks = m.state.TodoTasks
		idx = m.state.SelectedIndices[PanelTodo]
	case PanelProcessing:
		tasks = m.state.ProcessingTasks
		idx = m.state.SelectedIndices[PanelProcessing]
	}

	if len(tasks) > 0 && idx < len(tasks) {
		selectedTask = &tasks[idx]
	}

	if selectedTask == nil {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No task selected"))
	} else {
		// Show task details
		icon := GetIssueIcon(selectedTask.Fields.IssueType.Name)
		items = append(items, selectedItemStyle.Render(fmt.Sprintf("%s %s", icon, selectedTask.Key)))
		items = append(items, "")
		items = append(items, itemStyle.Render("⏺ "+selectedTask.Fields.Status.Name))
		items = append(items, "")

		// Wrap summary to fit width
		summary := selectedTask.Fields.Summary
		maxLen := width - 4
		if len(summary) > maxLen {
			// Simple word wrap
			for len(summary) > maxLen {
				items = append(items, itemStyle.Render(summary[:maxLen]))
				summary = summary[maxLen:]
			}
			if len(summary) > 0 {
				items = append(items, itemStyle.Render(summary))
			}
		} else {
			items = append(items, itemStyle.Render(summary))
		}

		// Add action hints at bottom if panel is active
		if isActive && len(items) < height-5 {
			items = append(items, "")
			items = append(items, itemStyle.Foreground(colorMuted).Render("Actions:"))
			items = append(items, itemStyle.Foreground(colorMuted).Render("Enter - Open in browser"))
			items = append(items, itemStyle.Foreground(colorMuted).Render("t - Log time"))
			items = append(items, itemStyle.Foreground(colorMuted).Render("s - Change status"))
		}
	}

	content := strings.Join(items, "\n")

	if isActive {
		return activeBorderStyle.Width(width).Height(height).Render(content)
	}
	return inactiveBorderStyle.Width(width).Height(height).Render(content)
}

// renderStatusBar renders the status bar
func (m Model) renderStatusBar() string {
	return statusBarStyle.Render(m.state.StatusMessage + " | q: quit | j/k: move | 1/2/3/0: panels | enter: open | i: log time | c: copy")
}

// Helper types for messages

type dataLoadedMsg struct {
	user            *model.User
	reportTasks     []model.Issue
	todoTasks       []model.Issue
	processingTasks []model.Issue
	worklogs        []model.Worklog
	dateGroups      []model.DateGroup
}

type errMsg struct {
	error
}

// groupWorklogsByDate groups worklogs by date
func groupWorklogsByDate(worklogs []model.Worklog) []model.DateGroup {
	groupMap := make(map[string]*model.DateGroup)

	for _, log := range worklogs {
		if _, exists := groupMap[log.StartDate]; !exists {
			groupMap[log.StartDate] = &model.DateGroup{
				Date:         log.StartDate,
				DisplayDate:  log.StartDate, // TODO: Format properly
				Worklogs:     []model.Worklog{},
				TotalSeconds: 0,
			}
		}
		group := groupMap[log.StartDate]
		group.Worklogs = append(group.Worklogs, log)
		group.TotalSeconds += log.TimeSpentSeconds
	}

	// Convert to slice and sort
	var groups []model.DateGroup
	for _, group := range groupMap {
		groups = append(groups, *group)
	}

	return groups
}
