package tui

import (
	"fmt"
	"strings"
)

// parseDescription converts Jira description (ADF or plain text) to display lines
func parseDescription(desc interface{}, maxWidth int) []string {
	if desc == nil {
		return []string{"[No description]"}
	}

	// Try to parse as ADF JSON first
	if descMap, ok := desc.(map[string]interface{}); ok {
		return parseADF(descMap, maxWidth)
	}

	// Fallback to plain text
	if descStr, ok := desc.(string); ok {
		if strings.TrimSpace(descStr) == "" {
			return []string{"[No description]"}
		}
		return wrapText(descStr, maxWidth)
	}

	return []string{"[No description]"}
}

// parseADF parses Atlassian Document Format
func parseADF(adf map[string]interface{}, maxWidth int) []string {
	lines := []string{}

	content, ok := adf["content"].([]interface{})
	if !ok {
		return []string{"[No description]"}
	}

	for _, node := range content {
		nodeMap, ok := node.(map[string]interface{})
		if !ok {
			continue
		}

		nodeType, _ := nodeMap["type"].(string)

		switch nodeType {
		case "paragraph":
			lines = append(lines, parseParagraph(nodeMap, maxWidth)...)
		case "heading":
			lines = append(lines, parseHeading(nodeMap, maxWidth)...)
		case "bulletList":
			lines = append(lines, parseBulletList(nodeMap, maxWidth)...)
		case "orderedList":
			lines = append(lines, parseOrderedList(nodeMap, maxWidth)...)
		case "codeBlock":
			lines = append(lines, parseCodeBlock(nodeMap, maxWidth)...)
		case "mediaGroup", "mediaSingle":
			lines = append(lines, parseMedia(nodeMap)...)
		case "rule":
			lines = append(lines, strings.Repeat("─", min(maxWidth, 40)))
		}

		lines = append(lines, "") // Spacing between blocks
	}

	if len(lines) == 0 {
		return []string{"[No description]"}
	}

	return lines
}

// parseParagraph parses a paragraph node
func parseParagraph(node map[string]interface{}, maxWidth int) []string {
	text := extractTextFromNode(node)
	if text == "" {
		return []string{}
	}
	return wrapText(text, maxWidth)
}

// parseHeading parses a heading node
func parseHeading(node map[string]interface{}, maxWidth int) []string {
	level, _ := node["attrs"].(map[string]interface{})
	levelNum := 1
	if level != nil {
		if lvl, ok := level["level"].(float64); ok {
			levelNum = int(lvl)
		}
	}

	text := extractTextFromNode(node)
	if text == "" {
		return []string{}
	}

	// Add heading prefix based on level
	prefix := strings.Repeat("#", levelNum) + " "
	return []string{prefix + text}
}

// parseBulletList parses a bullet list
func parseBulletList(node map[string]interface{}, maxWidth int) []string {
	return parseList(node, maxWidth, "• ")
}

// parseOrderedList parses an ordered list
func parseOrderedList(node map[string]interface{}, maxWidth int) []string {
	lines := []string{}
	content, ok := node["content"].([]interface{})
	if !ok {
		return lines
	}

	for i, item := range content {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		text := extractTextFromNode(itemMap)
		if text != "" {
			prefix := fmt.Sprintf("%d. ", i+1)
			wrapped := wrapText(text, maxWidth-len(prefix))
			if len(wrapped) > 0 {
				lines = append(lines, prefix+wrapped[0])
				for j := 1; j < len(wrapped); j++ {
					lines = append(lines, "   "+wrapped[j]) // Indent continuation
				}
			}
		}
	}

	return lines
}

// parseList parses a list (bullet or ordered)
func parseList(node map[string]interface{}, maxWidth int, prefix string) []string {
	lines := []string{}
	content, ok := node["content"].([]interface{})
	if !ok {
		return lines
	}

	for _, item := range content {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		text := extractTextFromNode(itemMap)
		if text != "" {
			wrapped := wrapText(text, maxWidth-len(prefix))
			if len(wrapped) > 0 {
				lines = append(lines, prefix+wrapped[0])
				for j := 1; j < len(wrapped); j++ {
					lines = append(lines, "  "+wrapped[j]) // Indent continuation
				}
			}
		}
	}

	return lines
}

// parseCodeBlock parses a code block
func parseCodeBlock(node map[string]interface{}, maxWidth int) []string {
	lines := []string{}
	content, ok := node["content"].([]interface{})
	if !ok {
		return lines
	}

	lines = append(lines, "```")
	for _, textNode := range content {
		textMap, ok := textNode.(map[string]interface{})
		if !ok {
			continue
		}

		if text, ok := textMap["text"].(string); ok {
			// Split by newlines and add each line
			codeLines := strings.Split(text, "\n")
			for _, line := range codeLines {
				// Truncate if too long
				if len(line) > maxWidth-4 {
					line = line[:maxWidth-4] + "..."
				}
				lines = append(lines, line)
			}
		}
	}
	lines = append(lines, "```")

	return lines
}

// parseMedia parses media nodes (images, etc.)
func parseMedia(node map[string]interface{}) []string {
	// Try to extract alt text or any description
	content, ok := node["content"].([]interface{})
	if !ok {
		return []string{"[Image: no description]"}
	}

	for _, mediaNode := range content {
		mediaMap, ok := mediaNode.(map[string]interface{})
		if !ok {
			continue
		}

		if attrs, ok := mediaMap["attrs"].(map[string]interface{}); ok {
			// Try alt text
			if alt, ok := attrs["alt"].(string); ok && alt != "" {
				return []string{fmt.Sprintf("[Image: %s]", alt)}
			}

			// Try filename
			if filename, ok := attrs["__fileName"].(string); ok && filename != "" {
				return []string{fmt.Sprintf("[Image: %s]", filename)}
			}
		}
	}

	return []string{"[Image: no description]"}
}

// extractTextFromNode recursively extracts text from ADF nodes
func extractTextFromNode(node map[string]interface{}) string {
	var text strings.Builder

	content, ok := node["content"].([]interface{})
	if !ok {
		return ""
	}

	for _, child := range content {
		childMap, ok := child.(map[string]interface{})
		if !ok {
			continue
		}

		nodeType, _ := childMap["type"].(string)

		switch nodeType {
		case "text":
			if t, ok := childMap["text"].(string); ok {
				// Check for marks (bold, italic, etc.)
				if marks, ok := childMap["marks"].([]interface{}); ok && len(marks) > 0 {
					// For now, just add the text - we could add markdown formatting later
					text.WriteString(t)
				} else {
					text.WriteString(t)
				}
			}
		case "mention":
			if attrs, ok := childMap["attrs"].(map[string]interface{}); ok {
				if mention, ok := attrs["text"].(string); ok {
					text.WriteString(mention)
				}
			}
		case "inlineCard":
			if attrs, ok := childMap["attrs"].(map[string]interface{}); ok {
				if url, ok := attrs["url"].(string); ok {
					text.WriteString(url)
				}
			}
		case "hardBreak":
			text.WriteString("\n")
		default:
			// Recursively extract from nested content
			nested := extractTextFromNode(childMap)
			if nested != "" {
				text.WriteString(nested)
			}
		}
	}

	return text.String()
}

// wrapText wraps text to specified width
func wrapText(text string, maxWidth int) []string {
	if maxWidth < 10 {
		maxWidth = 10
	}

	// Split by existing newlines first
	paragraphs := strings.Split(text, "\n")
	var lines []string

	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			lines = append(lines, "")
			continue
		}

		// Wrap each paragraph
		words := strings.Fields(para)
		if len(words) == 0 {
			continue
		}

		currentLine := words[0]
		for _, word := range words[1:] {
			if len(currentLine)+1+len(word) <= maxWidth {
				currentLine += " " + word
			} else {
				lines = append(lines, currentLine)
				currentLine = word
			}
		}
		if currentLine != "" {
			lines = append(lines, currentLine)
		}
	}

	return lines
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
