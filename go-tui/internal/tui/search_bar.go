package tui

import (
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type SearchBar struct {
	input    textinput.Model
	active   bool
	accepted bool
}

func NewSearchBar(width int) SearchBar {
	ti := textinput.New()
	ti.Placeholder = "search tasks..."
	ti.CharLimit = 100
	if width > 6 {
		ti.Width = width - 6
	}
	return SearchBar{
		input: ti,
	}
}

func (s *SearchBar) Activate() {
	s.active = true
	s.accepted = false
	s.input.SetValue("")
	s.input.Focus()
}

func (s *SearchBar) Deactivate() {
	s.active = false
	s.accepted = false
	s.input.SetValue("")
	s.input.Blur()
}

func (s *SearchBar) Accept() {
	s.active = false
	s.accepted = true
	s.input.Blur()
}

func (s *SearchBar) Update(msg tea.Msg) (SearchBar, tea.Cmd) {
	var cmd tea.Cmd
	s.input, cmd = s.input.Update(msg)
	return *s, cmd
}

func (s SearchBar) View(width int) string {
	if !s.active && !s.accepted {
		return ""
	}
	if s.accepted {
		query := s.input.Value()
		if query == "" {
			return ""
		}
		filterStyle := lipgloss.NewStyle().
			Foreground(colorMuted).
			Background(colorBgSelected).
			Padding(0, 1).
			Width(width)
		return filterStyle.Render("filter: " + query)
	}
	searchStyle := lipgloss.NewStyle().
		Foreground(colorPrimary).
		Background(colorBgSelected).
		Padding(0, 1).
		Width(width)
	return searchStyle.Render("/" + s.input.View())
}

func (s SearchBar) IsActive() bool {
	return s.active
}

func (s SearchBar) IsAccepted() bool {
	return s.accepted
}

func (s SearchBar) Query() string {
	return s.input.Value()
}

func (s *SearchBar) SetWidth(width int) {
	if width > 6 {
		s.input.Width = width - 6
	}
}
