package buddy

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

const BuddySpriteWidth = 17

var buddyColor = lipgloss.Color("#87ceeb")

func padLine(s string, width int) string {
	w := lipgloss.Width(s)
	if w >= width {
		return s
	}
	return s + strings.Repeat(" ", width-w)
}

func RenderBuddyLines(b *Buddy) []string {
	if b == nil || !b.Visible {
		return nil
	}

	style := lipgloss.NewStyle().Foreground(buddyColor)
	nameStyle := lipgloss.NewStyle().Foreground(buddyColor).Bold(true)

	result := make([]string, 8)
	emptyLine := strings.Repeat(" ", BuddySpriteWidth)
	for i := range result {
		result[i] = style.Render(emptyLine)
	}

	if b.Speech != "" {
		msg := b.Speech
		maxMsgLen := BuddySpriteWidth - 6
		if len(msg) > maxMsgLen {
			msg = msg[:maxMsgLen-1] + "~"
		}
		mid := "< " + msg + " >"
		bot := " " + strings.Repeat("-", len(msg)+2)
		result[0] = style.Render(padLine(mid, BuddySpriteWidth))
		result[1] = style.Render(padLine(bot, BuddySpriteWidth))
	}

	rawLines := RenderSprite(b.Bones, b.Frame)
	for i, line := range rawLines {
		idx := 2 + i
		if idx >= 7 {
			break
		}
		trimmed := strings.TrimRight(line, " ")
		padded := " " + trimmed
		result[idx] = style.Render(padLine(padded, BuddySpriteWidth))
	}

	if b.Name != "" {
		nameDisplay := "~" + b.Name
		if lipgloss.Width(nameDisplay) > BuddySpriteWidth {
			nameDisplay = nameDisplay[:BuddySpriteWidth-1] + "~"
		}
		result[7] = nameStyle.Render(padLine(nameDisplay, BuddySpriteWidth))
	}

	return result
}

func RenderBuddyInline(b *Buddy) string {
	if b == nil || !b.Visible {
		return ""
	}
	face := RenderFace(b.Bones.Species, b.Bones.Eye)
	style := lipgloss.NewStyle().Foreground(buddyColor)
	return style.Render(face)
}
