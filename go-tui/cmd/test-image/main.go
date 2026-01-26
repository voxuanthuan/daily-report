package main

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"

	"github.com/blacktop/go-termimg"
	"github.com/charmbracelet/bubbles/spinner"
	"jira-daily-report/internal/tui"
)

func main() {
	// Create a dummy image
	img := image.NewRGBA(image.Rect(0, 0, 100, 50))
	for y := 0; y < 50; y++ {
		for x := 0; x < 100; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x * 2), G: uint8(y * 5), B: 100, A: 255})
		}
	}

	// Save to temp file for reference (though not strictly needed for this test as we pass object)
	tmpFile := filepath.Join(os.TempDir(), "test-image.png")
	f, _ := os.Create(tmpFile)
	png.Encode(f, img)
	f.Close()
	defer os.Remove(tmpFile)

	fmt.Println("--- Testing ImageManager ---")

	// Initialize Manager
	// We pass dummy creds as we won't actually fetch from network in this test,
	// we will manually invoke render if possible or inspect internal state.
	// But ImageManager.LoadImageCmd fetches from URL.
	// To test renderWithViu, we need access to renderWithViu which is private,
	// OR we need to modify ImageManager to allow testing rendering directly,
	// OR we just rely on the fact that we can't easily test private methods from outside package.

	// Actually, since I'm in a different package (main), I can't call renderWithViu directly.
	// However, I can check how it behaves by inspecting the behavior of NewImageManager detection
	// and maybe use a public method if available.
	// Wait, I modified renderImage which is private.

	// Better approach: Create a test file inside `internal/tui` package.
}
