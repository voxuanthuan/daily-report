package tui

import (
	"image"
	"image/color"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// TestViuIntegration tests the integration with the 'viu' CLI tool.
func TestViuIntegration(t *testing.T) {
	// 1. Test behavior when viu is missing (default in this env)
	t.Run("ViuMissing", func(t *testing.T) {
		// Ensure viu is not in path for this test
		oldPath := os.Getenv("PATH")
		defer os.Setenv("PATH", oldPath)
		os.Setenv("PATH", "")

		mgr := NewImageManager("http://jira.local", "user", "token")
		if mgr.viuAvailable {
			t.Errorf("NewImageManager found viu, but it should not be in empty PATH")
		}

		// Create a dummy image
		img := image.NewRGBA(image.Rect(0, 0, 10, 10))

		// If protocol is unsupported (likely in test env) and viu is missing,
		// renderImage should fail or return error
		// We force supported=false to test fallback
		mgr.supported = false

		_, err := mgr.renderImage(img, 10, 10)
		if err == nil {
			t.Error("renderImage should fail when supported=false and viu is missing")
		}
	})

	// 2. Test behavior when viu is present
	t.Run("ViuPresent", func(t *testing.T) {
		// Create a mock viu command
		tmpDir := t.TempDir()
		mockViuPath := filepath.Join(tmpDir, "viu")

		// Create a script that acts as viu
		// It reads stdin (to consume it) and prints a specific string
		content := `#!/bin/sh
cat > /dev/null
echo "MOCKED_VIU_OUTPUT"
`
		if err := os.WriteFile(mockViuPath, []byte(content), 0755); err != nil {
			t.Fatalf("Failed to create mock viu: %v", err)
		}

		// Add tmpDir to PATH
		oldPath := os.Getenv("PATH")
		defer os.Setenv("PATH", oldPath)
		os.Setenv("PATH", tmpDir+string(os.PathListSeparator)+oldPath)

		// Check if LookPath finds it
		path, err := exec.LookPath("viu")
		if err != nil {
			t.Fatalf("exec.LookPath failed to find mock viu: %v", err)
		}
		t.Logf("Found mock viu at: %s", path)

		// Initialize manager
		mgr := NewImageManager("http://jira.local", "user", "token")
		if !mgr.viuAvailable {
			t.Errorf("NewImageManager failed to detect viu in PATH")
		}

		// Force supported=false to trigger fallback
		mgr.supported = false

		// Create dummy image
		img := image.NewRGBA(image.Rect(0, 0, 10, 10))
		// Fill with some data
		img.Set(0, 0, color.White)

		// Test renderWithViu directly
		output, err := mgr.renderWithViu(img, 20)
		if err != nil {
			t.Fatalf("renderWithViu failed: %v", err)
		}

		expected := "MOCKED_VIU_OUTPUT\n"
		if output != expected {
			// Some shells might not output newline, or viu might behave differently.
			// Our mock echoes, which adds newline.
			// Let's trim space for comparison
			if strings.TrimSpace(output) != "MOCKED_VIU_OUTPUT" {
				t.Errorf("Expected output 'MOCKED_VIU_OUTPUT', got %q", output)
			}
		}

		// Test renderImage fallback
		output2, err := mgr.renderImage(img, 20, 10)
		if err != nil {
			t.Fatalf("renderImage failed with viu fallback: %v", err)
		}
		if strings.TrimSpace(output2) != "MOCKED_VIU_OUTPUT" {
			t.Errorf("renderImage fallback expected 'MOCKED_VIU_OUTPUT', got %q", output2)
		}
	})
}
