package buddy

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

const BuddySpriteWidth = 14

var buddyColor = lipgloss.Color("#87ceeb")

func centerLine(s string, width int) string {
	w := lipgloss.Width(s)
	if w >= width {
		return s
	}
	pad := width - w
	left := pad / 2
	right := pad - left
	return strings.Repeat(" ", left) + s + strings.Repeat(" ", right)
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
		maxMsgLen := BuddySpriteWidth - 4
		if lipgloss.Width(msg) > maxMsgLen {
			runes := []rune(msg)
			truncLen := maxMsgLen - 1
			if truncLen < len(runes) {
				msg = string(runes[:truncLen]) + "~"
			}
		}
		mid := "< " + msg + " >"
		bot := " " + strings.Repeat("-", lipgloss.Width(msg)+2)
		result[0] = style.Render(centerLine(mid, BuddySpriteWidth))
		result[1] = style.Render(centerLine(bot, BuddySpriteWidth))
	}

	rawLines := RenderSprite(b.Bones, b.Frame)
	for i, line := range rawLines {
		idx := 2 + i
		if idx >= 7 {
			break
		}
		trimmed := strings.TrimRight(line, " ")
		result[idx] = style.Render(centerLine(trimmed, BuddySpriteWidth))
	}

	if b.Name != "" {
		nameDisplay := "~" + b.Name
		if lipgloss.Width(nameDisplay) > BuddySpriteWidth {
			runes := []rune(nameDisplay)
			maxLen := BuddySpriteWidth - 1
			if maxLen < len(runes) {
				nameDisplay = string(runes[:maxLen]) + "~"
			}
		}
		result[7] = nameStyle.Render(centerLine(nameDisplay, BuddySpriteWidth))
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

func RenderBuddyBadge(b *Buddy) string {
	face := RenderBuddyInline(b)
	if face == "" {
		return ""
	}
	return face + " "
}
