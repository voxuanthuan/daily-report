package clipboard

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// WriteHTML writes HTML content to the clipboard in a way that preserves formatting
// (Rich Text) for pasting into applications like Slack, Gmail, etc.
func WriteHTML(html string) error {
	switch runtime.GOOS {
	case "darwin":
		return writeHTMLMacOS(html)
	case "linux":
		return writeHTMLLinux(html)
	case "windows":
		return writeHTMLWindows(html)
	default:
		return fmt.Errorf("unsupported platform for HTML clipboard: %s", runtime.GOOS)
	}
}

func writeHTMLMacOS(html string) error {
	// macOS: textutil converts HTML to RTF, then pbcopy puts it on clipboard
	// pipeline: echo html | textutil -stdin -format html -convert rtf -stdout | pbcopy

	// Create the textutil command
	textutil := exec.Command("textutil", "-stdin", "-format", "html", "-convert", "rtf", "-stdout")
	textutil.Stdin = strings.NewReader(html)

	// Create the pbcopy command
	pbcopy := exec.Command("pbcopy")

	// Pipe textutil output to pbcopy input
	var err error
	pbcopy.Stdin, err = textutil.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create pipe: %w", err)
	}

	// Start both commands
	if err := pbcopy.Start(); err != nil {
		return fmt.Errorf("failed to start pbcopy: %w", err)
	}
	if err := textutil.Run(); err != nil {
		return fmt.Errorf("failed to run textutil: %w", err)
	}
	if err := pbcopy.Wait(); err != nil {
		return fmt.Errorf("failed to wait for pbcopy: %w", err)
	}

	return nil
}

func writeHTMLLinux(html string) error {
	// Try wl-copy (Wayland) first
	if _, err := exec.LookPath("wl-copy"); err == nil {
		return writeHTMLWayland(html)
	}

	// Fallback to xclip (X11)
	if _, err := exec.LookPath("xclip"); err == nil {
		return writeHTMLXClip(html)
	}

	return fmt.Errorf("no suitable clipboard tool found. Please install 'wl-clipboard' (Wayland) or 'xclip' (X11)")
}

func writeHTMLWayland(html string) error {
	// Use wl-copy to set both text/html and text/plain (as fallback)
	// Note: wl-copy uses the same input for all types, so text/plain will get the HTML source.
	cmd := exec.Command("wl-copy", "--type", "text/html", "--type", "text/plain")
	cmd.Stdin = strings.NewReader(html)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("wl-copy failed: %s: %w", string(output), err)
	}
	return nil
}

func writeHTMLXClip(html string) error {
	// Linux: xclip -selection clipboard -t text/html
	// Note: xclip doesn't support multiple targets well (last one wins),
	// so we only set text/html. For plain text, users should use 'c' key.
	cmd := exec.Command("xclip", "-selection", "clipboard", "-t", "text/html")
	cmd.Stdin = strings.NewReader(html)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("xclip failed: %s: %w", string(output), err)
	}

	return nil
}

func writeHTMLWindows(html string) error {
	// Windows: PowerShell Set-Clipboard -AsHtml
	// We need to be careful with escaping for PowerShell

	// Create a PowerShell script to set the clipboard
	// Using a temporary file might be safer for large content, but for now we'll try direct command

	// Encode HTML to base64 to avoid quoting issues
	// But PowerShell's Set-Clipboard -AsHtml expects a string.
	// A safer approach is to pass it via stdin to a powershell script?
	// Or use a small helper script.

	// Simple approach: Use Set-Clipboard -AsHtml "content"
	// But we need to escape double quotes
	escapedHtml := strings.ReplaceAll(html, `"`, `""`)
	psCommand := fmt.Sprintf("Set-Clipboard -AsHtml \"%s\"", escapedHtml)

	cmd := exec.Command("powershell", "-Command", psCommand)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("powershell failed: %s: %w", string(output), err)
	}

	return nil
}
