package tui

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jroimartin/gocui"
	"github.com/yourusername/jira-daily-report/internal/api"
	"github.com/yourusername/jira-daily-report/internal/config"
)

// Gui represents the gocui application
type Gui struct {
	g           *gocui.Gui
	state       *State
	jiraClient  *api.JiraClient
	tempoClient *api.TempoClient
	config      *config.Manager
}

// NewGui creates a new gocui-based TUI
func NewGui(cfg *config.Manager) (*Gui, error) {
	// Set TERM to xterm if terminfo issues are detected
	originalTerm := os.Getenv("TERM")
	if originalTerm == "" || strings.Contains(originalTerm, "256color") {
		os.Setenv("TERM", "xterm")
		defer os.Setenv("TERM", originalTerm) // Restore original after init
	}

	// Try to create GUI with OutputNormal first
	g, err := gocui.NewGui(gocui.OutputNormal)
	if err != nil {
		// If that fails, try with explicit TERM=xterm
		os.Setenv("TERM", "xterm")
		g, err = gocui.NewGui(gocui.OutputNormal)
		if err != nil {
			// If still failing, try screen
			os.Setenv("TERM", "screen")
			g, err = gocui.NewGui(gocui.OutputNormal)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize terminal UI: %w", err)
			}
		}
	}

	// Restore original TERM after successful init
	os.Setenv("TERM", originalTerm)

	jiraClient := api.NewJiraClient(
		cfg.GetJiraServer(),
		cfg.GetUsername(),
		cfg.GetApiToken(),
	)

	tempoClient := api.NewTempoClient(
		cfg.GetTempoApiToken(),
		jiraClient,
	)

	gui := &Gui{
		g:           g,
		state:       NewState(),
		jiraClient:  jiraClient,
		tempoClient: tempoClient,
		config:      cfg,
	}

	// Set up the GUI
	g.SetManagerFunc(gui.layout)
	g.Cursor = true
	g.Mouse = false

	// Set up keybindings
	if err := gui.setKeybindings(); err != nil {
		return nil, err
	}

	// Load initial data
	go gui.loadData()

	return gui, nil
}

// layout defines the layout of all views
func (gui *Gui) layout(g *gocui.Gui) error {
	maxX, maxY := g.Size()

	// Calculate panel dimensions (similar to Bubble Tea layout)
	// 60% left (3 panels stacked) + 40% right (Details + Time stacked)
	leftWidth := int(float64(maxX) * 0.6)
	rightWidth := maxX - leftWidth - 1
	leftPanelHeight := (maxY - 4) / 3

	// Left column panels
	// [1] Report panel
	if v, err := g.SetView("report", 0, 0, leftWidth, leftPanelHeight); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Title = " [1] Report "
		v.Highlight = true
		v.SelBgColor = gocui.ColorGreen
		v.SelFgColor = gocui.ColorBlack
		gui.renderReportPanel(v)
	}

	// [2] Todo panel
	y1 := leftPanelHeight + 1
	y2 := y1 + leftPanelHeight
	if v, err := g.SetView("todo", 0, y1, leftWidth, y2); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Title = " [2] Todo "
		v.Highlight = true
		v.SelBgColor = gocui.ColorGreen
		v.SelFgColor = gocui.ColorBlack
		gui.renderTodoPanel(v)
	}

	// [3] Processing panel
	y1 = y2 + 1
	y2 = maxY - 2
	if v, err := g.SetView("processing", 0, y1, leftWidth, y2); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Title = " [3] Processing "
		v.Highlight = true
		v.SelBgColor = gocui.ColorGreen
		v.SelFgColor = gocui.ColorBlack
		gui.renderProcessingPanel(v)
	}

	// Right column panels
	x1 := leftWidth + 1
	detailsHeight := int(float64(maxY-4) * 0.6)
	_ = rightWidth // Will be used when we add proper sizing

	// Details panel
	if v, err := g.SetView("details", x1, 0, maxX-1, detailsHeight); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Title = " Details "
		v.Wrap = true
		gui.renderDetailsPanel(v)
	}

	// [0] Time Tracking panel
	y1 = detailsHeight + 1
	if v, err := g.SetView("timelog", x1, y1, maxX-1, maxY-2); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Title = " [0] Time Tracking "
		v.Highlight = true
		v.SelBgColor = gocui.ColorGreen
		v.SelFgColor = gocui.ColorBlack
		gui.renderTimelogPanel(v)
	}

	// Status bar
	if v, err := g.SetView("status", 0, maxY-2, maxX-1, maxY); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		v.Frame = false
		fmt.Fprintf(v, gui.state.StatusMessage+" | q: quit | j/k: move | 1/2/3/0: panels | i: log time")
	}

	// Set initial focus
	if _, err := g.SetCurrentView("report"); err != nil {
		return err
	}

	return nil
}

// Run starts the main loop
func (gui *Gui) Run() error {
	defer gui.g.Close()

	if err := gui.g.MainLoop(); err != nil && err != gocui.ErrQuit {
		return err
	}
	return nil
}

// Close closes the GUI
func (gui *Gui) Close() {
	gui.g.Close()
}

// loadData loads initial data from Jira and Tempo
func (gui *Gui) loadData() {
	gui.state.Loading = true
	gui.state.StatusMessage = "Loading data..."
	gui.g.Update(func(g *gocui.Gui) error {
		return nil
	})

	// Fetch current user
	user, err := gui.jiraClient.FetchCurrentUser()
	if err != nil {
		log.Printf("Error fetching user: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}
	gui.state.User = user

	username := gui.config.GetUsername()

	// Fetch tasks
	inProgress, err := gui.jiraClient.FetchInProgressTasks(username)
	if err != nil {
		log.Printf("Error fetching in progress tasks: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}
	gui.state.ReportTasks = inProgress

	todo, err := gui.jiraClient.FetchOpenTasks(username)
	if err != nil {
		log.Printf("Error fetching todo tasks: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}
	gui.state.TodoTasks = todo

	underReview, err := gui.jiraClient.FetchUnderReviewTasks(username)
	if err != nil {
		log.Printf("Error fetching under review tasks: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}

	testing, err := gui.jiraClient.FetchReadyForTestingTasks(username)
	if err != nil {
		log.Printf("Error fetching testing tasks: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}

	gui.state.ProcessingTasks = append(underReview, testing...)

	// Fetch worklogs
	worklogs, err := gui.tempoClient.FetchLastSixDaysWorklogs(user.AccountID)
	if err != nil {
		log.Printf("Error fetching worklogs: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}

	enriched, err := gui.tempoClient.EnrichWorklogsWithIssueDetails(worklogs)
	if err != nil {
		log.Printf("Error enriching worklogs: %v", err)
		gui.state.Error = err
		gui.state.Loading = false
		return
	}

	gui.state.Worklogs = enriched
	gui.state.DateGroups = groupWorklogsByDate(enriched)
	gui.state.Loading = false
	gui.state.StatusMessage = fmt.Sprintf("Loaded %d tasks, %d worklogs",
		len(inProgress)+len(todo)+len(gui.state.ProcessingTasks),
		len(enriched))

	// Update UI
	gui.g.Update(func(g *gocui.Gui) error {
		return nil
	})
}
