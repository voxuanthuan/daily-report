package tui

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/cache"
	"github.com/yourusername/jira-daily-report/internal/config"
	"github.com/yourusername/jira-daily-report/internal/jira"
	"github.com/yourusername/jira-daily-report/internal/model"
	"github.com/yourusername/jira-daily-report/internal/tui/actions"
	"github.com/yourusername/jira-daily-report/internal/tui/refresh"
	"github.com/yourusername/jira-daily-report/internal/tui/state"
)

// Model represents the Bubbletea application model
type Model struct {
	state              *state.State
	actionExecutor     *actions.ActionExecutor
	activePoller       *refresh.Poller
	refreshConfig      refresh.Config
	showingHistory     bool
	keys               KeyMap
	width              int
	height             int
	jiraClient         *api.JiraClient
	tempoClient        *api.TempoClient
	config             *config.Manager
	cacheManager       *cache.Manager
	logTimeModal       *LogTimeModal
	copyOptionsModal   *CopyOptionsModal
	reportPreviewModal *ReportPreviewModal
	statusModal        *StatusDialogModel
	lastKey            string
	spinner            spinner.Model
	cacheAge           time.Duration
	fromCache          bool
}

type transitionsFetchedMsg struct {
	transitions []jira.Transition
	issueKey    string
	status      string
}

type cacheLoadedMsg struct {
	data *cache.CacheData
	err  error
}

type cacheSaveMsg struct{}

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

	cacheManager, err := cache.NewManager(cfg.GetCacheEnabled(), cfg.GetCacheTTL())
	if err != nil {
		cacheManager = nil
	}

	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))

	return &Model{
		state:          state.NewState(),
		actionExecutor: actions.NewActionExecutor(),
		refreshConfig:  refresh.DefaultConfig(),
		keys:           DefaultKeyMap(),
		jiraClient:     jiraClient,
		tempoClient:    tempoClient,
		config:         cfg,
		cacheManager:   cacheManager,
		spinner:        s,
		fromCache:      false,
	}
}

// statusMessage is a message sent when an action completes with a status update
type statusMessage struct {
	message string
	isError bool
	refresh bool
}

// delayedRefreshMsg is sent after a delay to trigger data refresh (e.g., after status changes)
type delayedRefreshMsg struct{}

// Init initializes the model
func (m Model) Init() tea.Cmd {
	return tea.Batch(
		m.loadCachedDataCmd,
		tea.EnterAltScreen,
		m.spinner.Tick,
	)
}

func (m *Model) loadCachedDataCmd() tea.Msg {
	if m.cacheManager == nil {
		return cacheLoadedMsg{err: fmt.Errorf("cache manager not initialized")}
	}

	data, err := m.cacheManager.Load()
	return cacheLoadedMsg{data: data, err: err}
}

// tasksLoadedMsg is sent when tasks are loaded (fast path)
type tasksLoadedMsg struct {
	user            *model.User
	reportTasks     []model.Issue
	todoTasks       []model.Issue
	processingTasks []model.Issue
}

// worklogsLoadedMsg is sent when worklogs are loaded (background)
type worklogsLoadedMsg struct {
	worklogs   []model.Worklog
	dateGroups []model.DateGroup
	err        error
}

// startPhase2Msg is sent to trigger Phase 2 loading after UI update
type startPhase2Msg struct{}

// loadTasksCmd fetches user and tasks (fast path - Phase 1)
func (m *Model) loadTasksCmd() tea.Msg {
	// Fetch current user
	user, err := m.jiraClient.FetchCurrentUser()
	if err != nil {
		return errMsg{err}
	}

	username := m.config.GetUsername()

	// Fetch tasks in parallel
	type taskResult struct {
		name   string
		issues []model.Issue
		err    error
	}

	taskChan := make(chan taskResult, 4)

	// Launch all task fetches in parallel
	go func() {
		issues, err := m.jiraClient.FetchInProgressTasks(username)
		taskChan <- taskResult{"inProgress", issues, err}
	}()

	go func() {
		issues, err := m.jiraClient.FetchOpenTasks(username)
		taskChan <- taskResult{"todo", issues, err}
	}()

	go func() {
		issues, err := m.jiraClient.FetchUnderReviewTasks(username)
		taskChan <- taskResult{"underReview", issues, err}
	}()

	go func() {
		issues, err := m.jiraClient.FetchReadyForTestingTasks(username)
		taskChan <- taskResult{"testing", issues, err}
	}()

	// Collect results
	var inProgress, todo, underReview, testing []model.Issue
	for i := 0; i < 4; i++ {
		result := <-taskChan
		if result.err != nil {
			return errMsg{result.err}
		}
		switch result.name {
		case "inProgress":
			inProgress = result.issues
		case "todo":
			todo = result.issues
		case "underReview":
			underReview = result.issues
		case "testing":
			testing = result.issues
		}
	}

	// Combine Under Review + Testing for Processing panel
	processingTasks := append(underReview, testing...)

	// Sort Todo and Processing tasks by updated date
	todo = sortIssuesByUpdatedDesc(todo)
	processingTasks = sortIssuesByUpdatedDesc(processingTasks)

	return tasksLoadedMsg{
		user:            user,
		reportTasks:     inProgress,
		todoTasks:       todo,
		processingTasks: processingTasks,
	}
}

// sortIssuesByUpdatedDesc sorts issues by updated date (descending)
func sortIssuesByUpdatedDesc(issues []model.Issue) []model.Issue {
	sort.Slice(issues, func(i, j int) bool {
		t1, err1 := time.Parse("2006-01-02T15:04:05.000-0700", issues[i].Fields.Updated)
		t2, err2 := time.Parse("2006-01-02T15:04:05.000-0700", issues[j].Fields.Updated)

		// If parsing fails, push to bottom
		if err1 != nil {
			return false
		}
		if err2 != nil {
			return true
		}

		return t1.After(t2)
	})
	return issues
}

// loadWorklogsCmd fetches worklogs and enriches them (background - Phase 2)
func (m *Model) loadWorklogsCmd() tea.Msg {
	if m.state.User == nil {
		return worklogsLoadedMsg{err: fmt.Errorf("user not loaded")}
	}

	// Fetch worklogs using the user's account ID
	worklogs, err := m.tempoClient.FetchLastSixDaysWorklogs(m.state.User.AccountID)
	if err != nil {
		return worklogsLoadedMsg{err: err}
	}

	// Enrich with issue details
	enriched, err := m.tempoClient.EnrichWorklogsWithIssueDetails(worklogs)
	if err != nil {
		return worklogsLoadedMsg{err: err}
	}

	// Group by date
	dateGroups := groupWorklogsByDate(enriched)

	return worklogsLoadedMsg{
		worklogs:   enriched,
		dateGroups: dateGroups,
	}
}

// Update handles messages and updates the model
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd

	case tea.KeyMsg:
		if m.logTimeModal != nil && m.logTimeModal.active {
			updatedModal, cmd := m.logTimeModal.Update(msg)
			m.logTimeModal = updatedModal
			return m, cmd
		}
		if m.copyOptionsModal != nil && m.copyOptionsModal.active {
			updatedModal, cmd := m.copyOptionsModal.Update(msg)
			m.copyOptionsModal = updatedModal
			return m, cmd
		}
		if m.reportPreviewModal != nil && m.reportPreviewModal.IsActive() {
			updatedModal, cmd := m.reportPreviewModal.Update(msg)
			m.reportPreviewModal = updatedModal
			return m, cmd
		}
		if m.statusModal != nil && m.statusModal.IsActive() {
			updatedModal, cmd := m.statusModal.Update(msg)
			m.statusModal = updatedModal
			return m, cmd
		}
		return m.handleKeyPress(msg)

	case transitionsFetchedMsg:
		m.state.StatusMessage = "Select new status"
		m.statusModal = NewStatusDialogModel(msg.transitions, msg.status, msg.issueKey)
		return m, nil

	case logTimeSubmittedMsg:
		// Close modal
		m.logTimeModal = nil

		ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)
		// We use the task from the message to ensure context is correct
		// Though usually it matches the selected task

		action := actions.NewLogTimeAction(msg.timeValue, msg.description, msg.date)
		return m, m.actionExecutor.ExecuteAction(action, ctx)

	case statusChangeConfirmedMsg:
		m.state.StatusMessage = fmt.Sprintf("Changing status to %s...", msg.targetStatus)

		// Close modal
		m.statusModal = nil

		ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)

		// Use ChangeStatusAction with ID directly
		action := actions.NewChangeStatusAction(msg.targetStatus, msg.transitionID)
		return m, m.actionExecutor.ExecuteAction(action, ctx)

	case cacheLoadedMsg:
		if msg.err == nil && msg.data != nil {
			m.state.User = msg.data.User
			m.state.ReportTasks = msg.data.ReportTasks
			m.state.TodoTasks = msg.data.TodoTasks
			m.state.ProcessingTasks = msg.data.ProcessingTasks
			m.state.Worklogs = msg.data.Worklogs
			m.state.DateGroups = msg.data.DateGroups
			m.state.Loading = false
			m.fromCache = true
			m.cacheAge = msg.data.Age()
			m.state.StatusMessage = fmt.Sprintf("📦 Loaded from cache (%v ago), refreshing...",
				formatDuration(m.cacheAge))
			return m, m.loadTasksCmd
		}
		m.state.StatusMessage = "Loading fresh data..."
		return m, m.loadTasksCmd

	case tasksLoadedMsg:
		m.state.User = msg.user
		m.state.ReportTasks = msg.reportTasks
		m.state.TodoTasks = msg.todoTasks
		m.state.ProcessingTasks = msg.processingTasks
		m.state.Loading = false
		m.state.WorklogsLoading = true
		m.fromCache = false
		m.state.StatusMessage = fmt.Sprintf("Loaded %d tasks. Loading time data...",
			len(msg.reportTasks)+len(msg.todoTasks)+len(msg.processingTasks))
		return m, tea.Batch(
			tea.Tick(100*time.Millisecond, func(t time.Time) tea.Msg {
				return startPhase2Msg{}
			}),
			func() tea.Msg { return cacheSaveMsg{} },
		)

	case worklogsLoadedMsg:
		m.state.WorklogsLoading = false
		if msg.err != nil {
			m.state.StatusMessage = fmt.Sprintf("Tasks ready. Worklog error: %v", msg.err)
			return m, nil
		}
		m.state.Worklogs = msg.worklogs
		m.state.DateGroups = msg.dateGroups
		m.state.StatusMessage = fmt.Sprintf("Loaded %d tasks, %d worklogs",
			len(m.state.ReportTasks)+len(m.state.TodoTasks)+len(m.state.ProcessingTasks),
			len(msg.worklogs))
		return m, func() tea.Msg { return cacheSaveMsg{} }

	case startPhase2Msg:
		// Triggered after UI has had time to render Phase 1 results
		return m, func() tea.Msg {
			return m.loadWorklogsCmd()
		}

	case dataLoadedMsg:
		// Legacy handler - keep for compatibility
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

	case copyDoneMsg:
		m.state.StatusMessage = msg.message
		m.copyOptionsModal = nil
		return m, nil

	case reportCopiedMsg:
		m.state.StatusMessage = msg.message
		m.reportPreviewModal = nil
		return m, nil

	case delayedRefreshMsg:
		// Delay period complete, now trigger the actual refresh
		m.state.Loading = true
		m.state.StatusMessage = m.state.StatusMessage + " Refreshing..."
		return m, m.loadTasksCmd

	case statusMessage:
		m.state.StatusMessage = msg.message
		if msg.isError {
			// Don't set m.state.Error to avoid blocking the view with error screen
			// just show in status bar
		}
		if msg.refresh {
			// Add delay before refresh to allow Jira's search index to update
			// This prevents the race condition where we fetch tasks before the status change is indexed
			return m, tea.Tick(1500*time.Millisecond, func(t time.Time) tea.Msg {
				return delayedRefreshMsg{}
			})
		}
		return m, nil

	// Action lifecycle messages
	case actions.ActionStartedMsg:
		// Action has been validated and is starting execution
		m.state.CurrentAction = &state.ActionState{
			Name:      msg.ActionName,
			State:     state.ActionExecuting,
			StartTime: msg.StartTime,
			Message:   fmt.Sprintf("Executing %s...", msg.ActionName),
		}

		// Apply optimistic update if action supports it
		newState := msg.Action.OptimisticUpdate(m.state)
		m.state = newState

		// Now execute the actual action
		ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)
		return m, msg.Action.Execute(ctx)

	case actions.ActionCompletedMsg:
		// Action completed successfully
		if m.state.CurrentAction != nil {
			// Record the result in history
			m.actionExecutor.RecordResult(state.ActionResult{
				ActionName: msg.ActionName,
				Success:    true,
				StartTime:  m.state.CurrentAction.StartTime,
				EndTime:    time.Now(),
				Duration:   time.Since(m.state.CurrentAction.StartTime),
			})
		}

		// Update status with result message
		m.state.CurrentAction = nil // Clear current action
		m.state.StatusMessage = fmt.Sprintf("✓ %s completed", msg.ActionName)

		// Record in history
		m.state.ActionHistory = append(m.state.ActionHistory, state.ActionResult{
			ActionName: msg.ActionName,
			Success:    true,
			StartTime:  time.Now().Add(-msg.Duration), // Approximate start time
			EndTime:    time.Now(),
			Duration:   msg.Duration,
		})
		// Keep last 50 actions
		if len(m.state.ActionHistory) > 50 {
			m.state.ActionHistory = m.state.ActionHistory[len(m.state.ActionHistory)-50:]
		}

		// Check if action needs verification
		strategy := msg.Action.GetRefreshStrategy()
		if strategy == state.RefreshPolling {
			// Start polling
			poller := refresh.NewPoller(msg.Action, m.refreshConfig)
			m.activePoller = poller

			// Update status message
			m.state.StatusMessage = fmt.Sprintf("%s completed, verifying...", msg.ActionName)

			return m, poller.NextPoll()
		}
		return m, nil

	case refresh.RefreshPollingMsg:
		// Verify if action changes are reflected
		verifier := refresh.GetVerifier(msg.Poller.GetAction())
		clients := refresh.VerifierClients{
			JiraClient:  m.jiraClient,
			TempoClient: m.tempoClient,
		}

		verified, err := verifier.Verify(msg.Poller.GetAction(), m.state, clients)

		if err != nil {
			// Verification error - retry or timeout
			if msg.Poller.ShouldContinue() {
				return m, msg.Poller.NextPoll()
			}
			return m, func() tea.Msg {
				return refresh.RefreshTimeoutMsg{
					ActionName: msg.ActionName,
					Attempts:   msg.Attempt,
				}
			}
		}

		if verified {
			// Success! Changes are reflected
			m.activePoller = nil
			return m, func() tea.Msg {
				return refresh.RefreshVerifiedMsg{
					ActionName: msg.ActionName,
					Success:    true,
				}
			}
		}

		// Not yet reflected, schedule next poll
		if msg.Poller.ShouldContinue() {
			return m, msg.Poller.NextPoll()
		}

		// Max attempts reached
		m.activePoller = nil
		return m, func() tea.Msg {
			return refresh.RefreshTimeoutMsg{
				ActionName: msg.ActionName,
				Attempts:   msg.Attempt,
			}
		}

	case refresh.RefreshVerifiedMsg:
		m.state.CurrentAction = nil
		m.state.StatusMessage = fmt.Sprintf("✓ %s verified", msg.ActionName)
		m.state.Loading = true
		return m, tea.Batch(
			m.loadTasksCmd,
			func() tea.Msg { return cacheSaveMsg{} },
		)

	case refresh.RefreshTimeoutMsg:
		m.state.CurrentAction = nil
		m.state.StatusMessage = fmt.Sprintf("⚠ %s verification timed out. Press 'r' to refresh.", msg.ActionName)
		return m, nil

	case actions.ActionFailedMsg:
		m.state.CurrentAction = nil // Clear current action
		m.state.StatusMessage = fmt.Sprintf("✗ %s failed: %v", msg.ActionName, msg.Error)

		// Record in history
		m.state.ActionHistory = append(m.state.ActionHistory, state.ActionResult{
			ActionName: msg.ActionName,
			Success:    false,
			Error:      msg.Error,
			StartTime:  time.Now(),
			EndTime:    time.Now(),
		})
		// Keep last 50 actions
		if len(m.state.ActionHistory) > 50 {
			m.state.ActionHistory = m.state.ActionHistory[len(m.state.ActionHistory)-50:]
		}

		// Rollback optimistic updates if snapshot exists
		// TODO: Implement state snapshots
		m.state.StateSnapshot = nil
		m.state.StatusMessage = fmt.Sprintf("Error: %v", msg.Error)
		m.state.CurrentAction = nil
		return m, nil

	case cacheSaveMsg:
		return m, m.saveCacheCmd
	}

	return m, nil
}

// handleKeyPress handles keyboard input
func (m Model) handleKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit

	case "k", "up":
		// Scroll up in Details panel if active, otherwise move selection
		if m.state.ActivePanel == state.PanelDetails {
			m.state.ScrollDetailsUp()
		} else {
			m.state.MoveSelectionUp()
		}
		return m, nil

	case "j", "down":
		// Scroll down in Details panel if active, otherwise move selection
		if m.state.ActivePanel == state.PanelDetails {
			m.state.ScrollDetailsDown(m.state.DetailsScrollMax)
		} else {
			m.state.MoveSelectionDown()
		}
		return m, nil

	case "1":
		m.state.ActivePanel = state.PanelReport
		m.state.TimeTrackingExpanded = false
		return m, nil

	case "2":
		m.state.ActivePanel = state.PanelTodo
		m.state.TimeTrackingExpanded = false
		return m, nil

	case "3":
		m.state.ActivePanel = state.PanelProcessing
		m.state.TimeTrackingExpanded = false
		return m, nil

	case "4":
		m.state.ActivePanel = state.PanelTimelog
		m.state.TimeTrackingExpanded = true // Expand when navigating to time
		return m, nil

	case "0":
		m.state.ActivePanel = state.PanelDetails
		// Reset scroll when navigating to details
		m.state.ResetDetailsScroll()
		return m, nil

	case "s":
		// Change status of selected task
		return m.handleChangeStatus()

	case "l", "right", "tab":
		// Cycle through panels: Report -> Todo -> Processing -> Timelog -> Report
		// Skip Details panel (not directly navigable)
		switch m.state.ActivePanel {
		case state.PanelReport:
			m.state.ActivePanel = state.PanelTodo
		case state.PanelTodo:
			m.state.ActivePanel = state.PanelProcessing
		case state.PanelProcessing:
			m.state.ActivePanel = state.PanelTimelog
			m.state.TimeTrackingExpanded = true
		case state.PanelTimelog, state.PanelDetails:
			m.state.ActivePanel = state.PanelReport
			m.state.TimeTrackingExpanded = false
		}
		return m, nil

	case "h", "left":
		// Cycle backwards through panels
		switch m.state.ActivePanel {
		case state.PanelReport:
			m.state.ActivePanel = state.PanelTimelog
			m.state.TimeTrackingExpanded = true
		case state.PanelTodo:
			m.state.ActivePanel = state.PanelReport
			m.state.TimeTrackingExpanded = false
		case state.PanelProcessing:
			m.state.ActivePanel = state.PanelTodo
			m.state.TimeTrackingExpanded = false
		case state.PanelTimelog, state.PanelDetails:
			m.state.ActivePanel = state.PanelProcessing
			m.state.TimeTrackingExpanded = false
		}
		return m, nil

	case "o":
		// Open Jira ticket in browser using new action framework
		ctx := actions.NewActionContext(m.state, m.jiraClient, m.tempoClient, m.config)
		action := actions.NewOpenURLAction()
		return m, m.actionExecutor.ExecuteAction(action, ctx)

	case "r":
		// Refresh data (progressive loading)
		m.state.Loading = true
		m.state.WorklogsLoading = true
		m.state.StatusMessage = "Refreshing..."
		return m, m.loadTasksCmd

	case "H":
		// Toggle history overlay
		m.showingHistory = !m.showingHistory
		return m, nil

	case "c":
		return m.showReportPreviewModal()

	case "i":
		// Show log time modal
		return m.showLogTimeModal()

	case "y":
		// Check if this is 'yy' (double press)
		if m.lastKey == "y" {
			// Show copy options
			m.lastKey = "" // Reset
			return m.showCopyOptions()
		}
		// First 'y' - just track it
		m.lastKey = "y"
		return m, nil
	}

	// Reset lastKey for any other key
	if msg.String() != "y" {
		m.lastKey = ""
	}

	return m, nil
}

// handleChangeStatus changes the status of the selected task
func (m Model) handleChangeStatus() (Model, tea.Cmd) {
	// Get selected task
	var selectedTask *model.Issue
	var tasks []model.Issue
	var idx int

	switch m.state.ActivePanel {
	case state.PanelReport:
		tasks = m.state.ReportTasks
		idx = m.state.SelectedIndices[state.PanelReport]
	case state.PanelTodo:
		tasks = m.state.TodoTasks
		idx = m.state.SelectedIndices[state.PanelTodo]
	case state.PanelProcessing:
		tasks = m.state.ProcessingTasks
		idx = m.state.SelectedIndices[state.PanelProcessing]
	default:
		return m, func() tea.Msg { return statusMessage{message: "No task selected", isError: true} }
	}

	if len(tasks) == 0 || idx >= len(tasks) {
		return m, func() tea.Msg { return statusMessage{message: "No task selected", isError: true} }
	}

	selectedTask = &tasks[idx]
	issueKey := selectedTask.Key
	currentStatus := selectedTask.Fields.Status.Name

	// Fetch transitions from Jira
	m.state.StatusMessage = fmt.Sprintf("Fetching transitions for %s...", issueKey)
	return m, m.fetchTransitionsCmd(issueKey, currentStatus)
}

// fetchTransitionsCmd fetches available transitions from Jira
func (m Model) fetchTransitionsCmd(issueKey, currentStatus string) tea.Cmd {
	return func() tea.Msg {
		transitions, err := m.jiraClient.GetTransitions(issueKey)
		if err != nil {
			return errMsg{err}
		}
		return transitionsFetchedMsg{
			transitions: transitions,
			issueKey:    issueKey,
			status:      currentStatus,
		}
	}
}

// View renders the TUI
func (m Model) View() string {
	if m.state.Error != nil {
		return errorStyle.Render(fmt.Sprintf("Error: %v\n\nPress q to quit", m.state.Error))
	}

	// Calculate responsive dimensions
	// Layout: Left column (Report + Todo + Processing), Right column (Details + Time)

	// Account for: status bar (1) + top margin (1) + bottom margin (1) = 3 lines
	statusAndMargins := 3

	// Left column: 3 panels × 2 border lines each = 6 lines
	leftAvailableHeight := m.height - statusAndMargins - 6
	if leftAvailableHeight < 20 {
		leftAvailableHeight = 20
	}

	// Right column: 2 panels × 2 border lines each = 4 lines
	rightAvailableHeight := m.height - statusAndMargins - 4
	if rightAvailableHeight < 20 {
		rightAvailableHeight = 20
	}

	availableWidth := m.width - 2 // Maximize width usage

	leftPanelWidth := int(float64(availableWidth) * 0.60) // 60% of usable width
	rightPanelWidth := availableWidth - leftPanelWidth    // Remaining 40%

	// Left column: 3 panels
	leftContentSpace := m.height - statusAndMargins
	// Distribute height exactly for left column
	h1 := leftContentSpace / 3
	h2 := leftContentSpace / 3
	h3 := leftContentSpace - h1 - h2

	// Right column: Time panel always expanded (fixed height)
	timePanelHeight := 10 // 1 title + 8 items + borders = 10 lines

	// Ensure Details panel has enough space
	if leftContentSpace-timePanelHeight < 5 {
		// Shrink time panel if screen is too small
		timePanelHeight = leftContentSpace - 5
		if timePanelHeight < 5 {
			timePanelHeight = 5 // Absolute minimum
		}
	}

	detailsPanelHeight := leftContentSpace - timePanelHeight

	// Render panels with calculated dimensions
	reportPanel := m.renderPanelWithSize("Report", state.PanelReport, m.state.ReportTasks, "[1]", leftPanelWidth, h1)
	todoPanel := m.renderPanelWithSize("Todo", state.PanelTodo, m.state.TodoTasks, "[2]", leftPanelWidth, h2)
	processingPanel := m.renderPanelWithSize("Processing", state.PanelProcessing, m.state.ProcessingTasks, "[3]", leftPanelWidth, h3)
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

	if m.copyOptionsModal != nil && m.copyOptionsModal.active {
		modalView := m.copyOptionsModal.View()
		modalLines := strings.Split(modalView, "\n")
		baseLines := strings.Split(baseView, "\n")

		startY := (m.height - len(modalLines)) / 2
		if startY < 0 {
			startY = 0
		}

		overlayLines := make([]string, len(baseLines))
		copy(overlayLines, baseLines)

		for i, modalLine := range modalLines {
			lineY := startY + i
			if lineY >= 0 && lineY < len(overlayLines) {
				modalLineWidth := lipgloss.Width(modalLine)
				leftPadding := (m.width - modalLineWidth) / 2
				if leftPadding < 0 {
					leftPadding = 0
				}
				centeredLine := strings.Repeat(" ", leftPadding) + modalLine
				overlayLines[lineY] = centeredLine
			}
		}

		return strings.Join(overlayLines, "\n")
	}

	if m.reportPreviewModal != nil && m.reportPreviewModal.IsActive() {
		modalView := m.reportPreviewModal.View()
		modalLines := strings.Split(modalView, "\n")
		baseLines := strings.Split(baseView, "\n")

		startY := (m.height - len(modalLines)) / 2
		if startY < 0 {
			startY = 0
		}

		overlayLines := make([]string, len(baseLines))
		copy(overlayLines, baseLines)

		for i, modalLine := range modalLines {
			lineY := startY + i
			if lineY >= 0 && lineY < len(overlayLines) {
				modalLineWidth := lipgloss.Width(modalLine)
				leftPadding := (m.width - modalLineWidth) / 2
				if leftPadding < 0 {
					leftPadding = 0
				}
				centeredLine := strings.Repeat(" ", leftPadding) + modalLine
				overlayLines[lineY] = centeredLine
			}
		}

		return strings.Join(overlayLines, "\n")
	}

	// Overlay status modal if active
	if m.statusModal != nil && m.statusModal.IsActive() {
		modalView := m.statusModal.View()
		modalLines := strings.Split(modalView, "\n")

		baseLines := strings.Split(baseView, "\n")
		overlayLines := make([]string, len(baseLines))
		copy(overlayLines, baseLines)

		startY := (m.height - len(modalLines)) / 2
		if startY < 0 {
			startY = 0
		}

		for i, modalLine := range modalLines {
			lineY := startY + i
			if lineY >= 0 && lineY < len(overlayLines) {
				modalLineWidth := lipgloss.Width(modalLine)
				leftPadding := (m.width - modalLineWidth) / 2
				if leftPadding < 0 {
					leftPadding = 0
				}
				centeredLine := strings.Repeat(" ", leftPadding) + modalLine
				overlayLines[lineY] = centeredLine
			}
		}
		return strings.Join(overlayLines, "\n")
	}

	// Overlay history if active (lowest priority overlay)
	if m.showingHistory {
		historyView := m.renderHistoryOverlay()
		// Simple overwrite for now as renderHistoryOverlay uses Place which creates full screen string
		// But Place might return string with spaces for transparency?
		// Actually Place typically returns a block of size width x height.
		return historyView
	}

	return baseView

}

// renderPanelWithSize renders a task panel with dynamic dimensions
func (m Model) renderPanelWithSize(title string, panelType state.PanelType, tasks []model.Issue, panelLabel string, width int, height int) string {
	isActive := m.state.ActivePanel == panelType
	selectedIdx := m.state.SelectedIndices[panelType]

	var items []string

	// No internal title - will use border title instead
	if len(tasks) == 0 {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No tasks"))
	} else {
		// Calculate how many items can fit (more space now without title)
		maxItems := height - 2 // Only top and bottom borders (title moved to border)
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

	// No title in content - will be in border
	content := strings.Join(items, "\n")

	// Title for top border
	borderTitle := fmt.Sprintf("%s %s", panelLabel, title)

	// Counter for bottom-right showing selection position
	counter := ""
	if len(tasks) > 0 {
		counter = fmt.Sprintf("%d of %d", selectedIdx+1, len(tasks))
	} else {
		counter = "0 items"
	}

	return RenderWithTitleAndCounter(content, width, height, borderTitle, counter, isActive, RoundedBorder)
}

// renderTimelogPanelWithSize renders the time tracking panel with dynamic dimensions
func (m Model) renderTimelogPanelWithSize(width, height int) string {
	isActive := m.state.ActivePanel == state.PanelTimelog
	selectedIdx := m.state.SelectedIndices[state.PanelTimelog]

	var items []string

	// Always render in expanded mode
	// Title will be in border, not in content

	// Show loading indicator when worklogs are being fetched
	if m.state.WorklogsLoading {
		items = append(items, itemStyle.Foreground(colorMuted).Render(m.spinner.View()+" Loading time data..."))
	} else if len(m.state.DateGroups) == 0 {
		items = append(items, itemStyle.Foreground(colorMuted).Render("No worklogs"))
	} else {
		// Calculate available lines for items: height - borders(2) - title(1)
		maxItems := height - 3
		if maxItems < 1 {
			maxItems = 1
		}

		displayGroups := m.state.DateGroups
		start := 0

		if len(m.state.DateGroups) > maxItems {
			start = selectedIdx - maxItems/2
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
			actualIdx := start + i

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

	// No title in content - will be in border
	content := strings.Join(items, "\n")

	// Title for top border
	borderTitle := "[4] Time Tracking"

	// Counter for bottom-right
	counter := ""
	if len(m.state.DateGroups) > 0 {
		counter = fmt.Sprintf("%d of %d", selectedIdx+1, len(m.state.DateGroups))
	} else {
		counter = "0 groups"
	}

	return RenderWithTitleAndCounter(content, width, height, borderTitle, counter, isActive, RoundedBorder)
}

// renderDetailsPanelWithSize renders the details panel with dynamic dimensions
func (m Model) renderDetailsPanelWithSize(width, height int) string {
	isActive := m.state.ActivePanel == state.PanelDetails

	// Calculate content width available inside the panel
	contentWidth := width - 4
	if contentWidth < 1 {
		contentWidth = 1
	}

	var items []string

	// Check which panel is active to determine what to show
	if m.state.ActivePanel == state.PanelTimelog {
		// SHOW TIMELOG DETAILS for selected date
		selectedIdx := m.state.SelectedIndices[state.PanelTimelog]
		if selectedIdx >= 0 && selectedIdx < len(m.state.DateGroups) {
			dateGroup := m.state.DateGroups[selectedIdx]
			totalHours := float64(dateGroup.TotalSeconds) / 3600.0

			// Header: Date + Total Time
			header := fmt.Sprintf("📅 %s - %.1fh Total", dateGroup.DisplayDate, totalHours)
			items = append(items, selectedItemStyle.Render(header))
			items = append(items, strings.Repeat("─", contentWidth))
			items = append(items, "")

			// List all worklogs for this date
			for _, worklog := range dateGroup.Worklogs {
				worklogHours := float64(worklog.TimeSpentSeconds) / 3600.0
				issueKey := worklog.Issue.Key
				issueSummary := worklog.Issue.Summary
				if issueKey == "" {
					issueKey = "Unknown"
				}

				// 1. Ticket ID + Title
				// Worklog response doesn't include issue type, so use generic icon
				icon := "🎫"
				titleLine := fmt.Sprintf("%s %s %s", icon, issueKey, issueSummary)
				// Truncate title if too long
				if len(titleLine) > contentWidth {
					titleLine = titleLine[:contentWidth-3] + "..."
				}
				items = append(items, selectedItemStyle.Render(titleLine))

				// 2. Time Logged
				timeLine := fmt.Sprintf("⏱  %.2fh", worklogHours)
				items = append(items, itemStyle.Foreground(colorSuccess).Render(timeLine))

				// 3. Description
				if worklog.Description != "" {
					items = append(items, itemStyle.Foreground(colorMuted).Render("📝 Description:"))
					descLines := parseDescription(worklog.Description, contentWidth)
					items = append(items, descLines...)
				} else {
					items = append(items, itemStyle.Foreground(colorMuted).Render("📝 No description"))
				}

				// Separator
				items = append(items, "")
				items = append(items, itemStyle.Foreground(colorBorder).Render(strings.Repeat("─", contentWidth/2)))
				items = append(items, "")
			}
		} else {
			items = append(items, itemStyle.Foreground(colorMuted).Render("No date selected"))
		}
	} else {
		// SHOW TASK DETAILS (Default behavior)
		// Get selected task from the last active task panel
		var selectedTask *model.Issue
		var tasks []model.Issue
		var idx int

		// Check which panel was last active (or current if it's a task panel)
		activePanel := m.state.ActivePanel
		if activePanel == state.PanelDetails {
			// Use last task panel
			activePanel = m.state.LastTaskPanel
		} else {
			// Update last task panel
			m.state.LastTaskPanel = activePanel
		}

		switch activePanel {
		case state.PanelReport:
			tasks = m.state.ReportTasks
			idx = m.state.SelectedIndices[state.PanelReport]
		case state.PanelTodo:
			tasks = m.state.TodoTasks
			idx = m.state.SelectedIndices[state.PanelTodo]
		case state.PanelProcessing:
			tasks = m.state.ProcessingTasks
			idx = m.state.SelectedIndices[state.PanelProcessing]
		}

		if len(tasks) > 0 && idx < len(tasks) {
			selectedTask = &tasks[idx]
		}

		if selectedTask == nil {
			items = append(items, itemStyle.Foreground(colorMuted).Render("No task selected"))
		} else {
			// 1. Icon + Task Key
			icon := GetIssueIcon(selectedTask.Fields.IssueType.Name)
			items = append(items, selectedItemStyle.Render(fmt.Sprintf("%s %s", icon, selectedTask.Key)))
			items = append(items, "")

			// 2. Status (de-emphasized)
			items = append(items, itemStyle.Foreground(colorMuted).Render("⏺ "+selectedTask.Fields.Status.Name))

			// 3. Fix Versions (prominently displayed if present)
			if len(selectedTask.Fields.FixVersions) > 0 {
				versionNames := make([]string, len(selectedTask.Fields.FixVersions))
				for i, v := range selectedTask.Fields.FixVersions {
					versionNames[i] = v.Name
				}
				fixVersionText := "🏷️  Fix Version: " + strings.Join(versionNames, ", ")
				items = append(items, selectedItemStyle.Render(fixVersionText))
			}
			items = append(items, "")

			// 4. Task Title/Summary
			items = append(items, itemStyle.Render("Title:"))
			wrappedSummary := itemStyle.Width(contentWidth).Render(selectedTask.Fields.Summary)
			items = append(items, wrappedSummary)
			items = append(items, "")

			// 5. Description with ADF parsing
			items = append(items, itemStyle.Foreground(colorMuted).Render("Description:"))
			descriptionLines := parseDescription(selectedTask.Fields.Description, contentWidth)
			items = append(items, descriptionLines...)
		}
	}

	// Store content lines for scrolling
	m.state.DetailsContentLines = items

	// Calculate scrolling
	visibleHeight := height - 4 // Account for borders and title
	if visibleHeight < 1 {
		visibleHeight = 1
	}

	maxScroll := len(items) - visibleHeight
	if maxScroll < 0 {
		maxScroll = 0
	}
	m.state.DetailsScrollMax = maxScroll

	// Apply scroll offset
	visibleStart := m.state.DetailsScrollOffset
	if visibleStart > maxScroll {
		visibleStart = maxScroll
		m.state.DetailsScrollOffset = maxScroll
	}

	visibleEnd := visibleStart + visibleHeight
	if visibleEnd > len(items) {
		visibleEnd = len(items)
	}

	var visibleLines []string
	if visibleStart < len(items) {
		visibleLines = items[visibleStart:visibleEnd]
	}

	// Add scroll indicators
	scrollInfo := ""
	if maxScroll > 0 {
		if m.state.DetailsScrollOffset > 0 && m.state.DetailsScrollOffset < maxScroll {
			scrollInfo = " ▲▼"
		} else if m.state.DetailsScrollOffset > 0 {
			scrollInfo = " ▲"
		} else if m.state.DetailsScrollOffset < maxScroll {
			scrollInfo = " ▼"
		}
	}

	// Title for top border with scroll indicators
	borderTitle := "Details [0]" + scrollInfo

	// No counter for details panel
	counter := ""

	// Use custom border rendering
	content := strings.Join(visibleLines, "\n")
	return RenderWithTitleAndCounter(content, width, height, borderTitle, counter, isActive, RoundedBorder)
}

func (m Model) renderStatusBar() string {
	helpText := "q: quit | j/k: move | 1/2/3/0: panels | o: open | c: copy report | yy: copy task | r: refresh | i: log time | H: history"

	if m.fromCache && m.cacheAge > 0 {
		cacheIndicator := fmt.Sprintf(" [📦 %s old]", formatDuration(m.cacheAge))
		helpText = cacheIndicator + " | " + helpText
	}

	if m.state.Loading || m.activePoller != nil {
		helpText = m.spinner.View() + " " + helpText
	}

	maxWidth := m.width - 2

	if maxWidth <= 0 {
		return ""
	}

	if len(helpText) > maxWidth {
		if maxWidth > 3 {
			return statusBarStyle.Render(helpText[:maxWidth-3] + "...")
		}
		return statusBarStyle.Render(helpText[:maxWidth])
	}

	return statusBarStyle.Render(helpText)
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

// renderHistoryOverlay renders the action history overlay
func (m Model) renderHistoryOverlay() string {
	if len(m.state.ActionHistory) == 0 {
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center,
			lipgloss.NewStyle().Border(lipgloss.RoundedBorder()).Padding(1, 2).Render("No action history"),
		)
	}

	var historyItems []string
	// Show in reverse order (newest first)
	startIndex := len(m.state.ActionHistory) - 1
	endIndex := startIndex - (m.height - 4) // Reserve space for borders/title
	if endIndex < 0 {
		endIndex = -1
	}

	for i := startIndex; i > endIndex; i-- {
		action := m.state.ActionHistory[i]

		var icon, statusColor string
		if action.Success {
			icon = "✓"
			statusColor = "86" // Green (aquamarine-like)
		} else {
			icon = "✗"
			statusColor = "196" // Red
		}

		timeStr := action.EndTime.Format("15:04:05")

		item := fmt.Sprintf("%s %s %s",
			lipgloss.NewStyle().Foreground(lipgloss.Color(statusColor)).Render(icon),
			lipgloss.NewStyle().Width(10).Render(timeStr),
			action.ActionName,
		)

		if action.Error != nil {
			item += lipgloss.NewStyle().Foreground(lipgloss.Color("196")).Render(fmt.Sprintf(" (%v)", action.Error))
		}

		historyItems = append(historyItems, item)
	}

	historyList := strings.Join(historyItems, "\n")

	box := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("63")).
		Padding(1, 2).
		Width(m.width - 4).
		Render(lipgloss.NewStyle().Bold(true).Render("Action History") + "\n\n" + historyList)

	// Center the box
	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, box)
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

	// Convert to slice
	var groups []model.DateGroup
	for _, group := range groupMap {
		groups = append(groups, *group)
	}

	// Sort by date descending (newest first)
	sort.Slice(groups, func(i, j int) bool {
		return groups[i].Date > groups[j].Date
	})

	return groups
}

func (m *Model) saveCacheCmd() tea.Msg {
	if m.cacheManager == nil {
		return nil
	}

	cacheData := cache.BuildCacheData(
		m.state.User,
		m.state.ReportTasks,
		m.state.TodoTasks,
		m.state.ProcessingTasks,
		m.state.Worklogs,
		m.state.DateGroups,
	)

	_ = m.cacheManager.Save(cacheData)
	return nil
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	return fmt.Sprintf("%dh", int(d.Hours()))
}
