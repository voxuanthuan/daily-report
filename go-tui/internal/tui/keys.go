package tui

import (
	"github.com/charmbracelet/bubbles/key"
)

type KeyMap struct {
	Up         key.Binding
	Down       key.Binding
	Left       key.Binding
	Right      key.Binding
	Panel1     key.Binding
	Panel2     key.Binding
	Panel3     key.Binding
	Panel4     key.Binding
	Enter      key.Binding
	Refresh    key.Binding
	Help       key.Binding
	Quit       key.Binding
	CopyReport key.Binding
}

func DefaultKeyMap() KeyMap {
	return KeyMap{
		Up:         key.NewBinding(key.WithKeys("k", "up"), key.WithHelp("k/↑", "up")),
		Down:       key.NewBinding(key.WithKeys("j", "down"), key.WithHelp("j/↓", "down")),
		Left:       key.NewBinding(key.WithKeys("h", "left"), key.WithHelp("h/←", "prev panel")),
		Right:      key.NewBinding(key.WithKeys("l", "right"), key.WithHelp("l/→", "next panel")),
		Panel1:     key.NewBinding(key.WithKeys("1"), key.WithHelp("1", "today")),
		Panel2:     key.NewBinding(key.WithKeys("2"), key.WithHelp("2", "todo")),
		Panel3:     key.NewBinding(key.WithKeys("3"), key.WithHelp("3", "testing")),
		Panel4:     key.NewBinding(key.WithKeys("4"), key.WithHelp("4", "timelog")),
		Enter:      key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "select")),
		Refresh:    key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "refresh")),
		Help:       key.NewBinding(key.WithKeys("?"), key.WithHelp("?", "help")),
		Quit:       key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
		CopyReport: key.NewBinding(key.WithKeys("c"), key.WithHelp("c", "copy report")),
	}
}
