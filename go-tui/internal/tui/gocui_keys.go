package tui

import (
	"github.com/jroimartin/gocui"
)

// setKeybindings sets up all keyboard bindings
func (gui *Gui) setKeybindings() error {
	// Global keybindings
	if err := gui.g.SetKeybinding("", gocui.KeyCtrlC, gocui.ModNone, quit); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", 'q', gocui.ModNone, quit); err != nil {
		return err
	}

	// Panel switching
	if err := gui.g.SetKeybinding("", '1', gocui.ModNone, gui.switchToReport); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", '2', gocui.ModNone, gui.switchToTodo); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", '3', gocui.ModNone, gui.switchToProcessing); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", '0', gocui.ModNone, gui.switchToTimelog); err != nil {
		return err
	}

	// Navigation
	if err := gui.g.SetKeybinding("", gocui.KeyTab, gocui.ModNone, gui.nextPanel); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", 'j', gocui.ModNone, gui.cursorDown); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", gocui.KeyArrowDown, gocui.ModNone, gui.cursorDown); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", 'k', gocui.ModNone, gui.cursorUp); err != nil {
		return err
	}
	if err := gui.g.SetKeybinding("", gocui.KeyArrowUp, gocui.ModNone, gui.cursorUp); err != nil {
		return err
	}

	// Actions
	if err := gui.g.SetKeybinding("", 'i', gocui.ModNone, gui.showLogTimeModal); err != nil {
		return err
	}

	return nil
}

// quit is the handler for quitting the application
func quit(g *gocui.Gui, v *gocui.View) error {
	return gocui.ErrQuit
}

// switchToReport switches to the Report panel
func (gui *Gui) switchToReport(g *gocui.Gui, v *gocui.View) error {
	gui.state.ActivePanel = PanelReport
	if _, err := g.SetCurrentView("report"); err != nil {
		return err
	}
	return nil
}

// switchToTodo switches to the Todo panel
func (gui *Gui) switchToTodo(g *gocui.Gui, v *gocui.View) error {
	gui.state.ActivePanel = PanelTodo
	if _, err := g.SetCurrentView("todo"); err != nil {
		return err
	}
	return nil
}

// switchToProcessing switches to the Processing panel
func (gui *Gui) switchToProcessing(g *gocui.Gui, v *gocui.View) error {
	gui.state.ActivePanel = PanelProcessing
	if _, err := g.SetCurrentView("processing"); err != nil {
		return err
	}
	return nil
}

// switchToTimelog switches to the Timelog panel
func (gui *Gui) switchToTimelog(g *gocui.Gui, v *gocui.View) error {
	gui.state.ActivePanel = PanelTimelog
	if _, err := g.SetCurrentView("timelog"); err != nil {
		return err
	}
	return nil
}

// nextPanel cycles to the next panel
func (gui *Gui) nextPanel(g *gocui.Gui, v *gocui.View) error {
	panels := []string{"report", "todo", "processing", "timelog"}
	current := v.Name()

	for i, panel := range panels {
		if panel == current {
			next := panels[(i+1)%len(panels)]
			if _, err := g.SetCurrentView(next); err != nil {
				return err
			}
			// Update active panel state
			switch next {
			case "report":
				gui.state.ActivePanel = PanelReport
			case "todo":
				gui.state.ActivePanel = PanelTodo
			case "processing":
				gui.state.ActivePanel = PanelProcessing
			case "timelog":
				gui.state.ActivePanel = PanelTimelog
			}
			break
		}
	}

	return nil
}

// cursorDown moves the cursor down in the current view
func (gui *Gui) cursorDown(g *gocui.Gui, v *gocui.View) error {
	if v != nil {
		cx, cy := v.Cursor()
		if err := v.SetCursor(cx, cy+1); err != nil {
			ox, oy := v.Origin()
			if err := v.SetOrigin(ox, oy+1); err != nil {
				return err
			}
		}

		// Update state
		gui.state.MoveSelectionDown()

		// Refresh details panel
		gui.g.Update(func(g *gocui.Gui) error {
			if dv, err := g.View("details"); err == nil {
				gui.renderDetailsPanel(dv)
			}
			return nil
		})
	}
	return nil
}

// cursorUp moves the cursor up in the current view
func (gui *Gui) cursorUp(g *gocui.Gui, v *gocui.View) error {
	if v != nil {
		ox, oy := v.Origin()
		cx, cy := v.Cursor()
		if err := v.SetCursor(cx, cy-1); err != nil && oy > 0 {
			if err := v.SetOrigin(ox, oy-1); err != nil {
				return err
			}
		}

		// Update state
		gui.state.MoveSelectionUp()

		// Refresh details panel
		gui.g.Update(func(g *gocui.Gui) error {
			if dv, err := g.View("details"); err == nil {
				gui.renderDetailsPanel(dv)
			}
			return nil
		})
	}
	return nil
}
