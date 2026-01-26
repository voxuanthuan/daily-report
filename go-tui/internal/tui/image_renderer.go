package tui

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"time"

	"github.com/blacktop/go-termimg"
	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

var imageDebugLog *log.Logger

func init() {
	f, err := os.OpenFile("/tmp/jira-image-debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		imageDebugLog = log.New(f, "[IMG] ", log.LstdFlags|log.Lshortfile)
	}
}

type ImageInfo struct {
	ID       string
	URL      string
	Filename string
	Alt      string
	Width    int
	Height   int
}

type ImageState int

const (
	ImageStateLoading ImageState = iota
	ImageStateLoaded
	ImageStateFailed
	ImageStateUnsupported
)

type LoadedImage struct {
	Info     ImageInfo
	State    ImageState
	Image    image.Image
	Rendered string
	Error    error
}

type ImageManager struct {
	images       map[string]*LoadedImage
	mu           sync.RWMutex
	jiraServer   string
	username     string
	apiToken     string
	protocol     termimg.Protocol
	supported    bool
	viuAvailable bool
}

func NewImageManager(jiraServer, username, apiToken string) *ImageManager {
	if imageDebugLog != nil {
		imageDebugLog.Println("Initializing ImageManager...")
	}

	protocol := termimg.DetectProtocol()
	supported := protocol != termimg.Halfblocks && protocol != termimg.Unsupported

	viuPath, err := exec.LookPath("viu")
	viuAvailable := err == nil && viuPath != ""

	if imageDebugLog != nil {
		imageDebugLog.Printf("Detected protocol: %d, supported: %v, viu: %v", protocol, supported, viuAvailable)
	}

	if os.Getenv("TMUX") != "" {
		if imageDebugLog != nil {
			imageDebugLog.Println("TMUX detected, attempting ForceTmux...")
		}
		termimg.ForceTmux(true)
	}

	return &ImageManager{
		images:       make(map[string]*LoadedImage),
		jiraServer:   jiraServer,
		username:     username,
		apiToken:     apiToken,
		protocol:     protocol,
		supported:    supported,
		viuAvailable: viuAvailable,
	}
}

func (m *ImageManager) IsSupported() bool {
	return m.supported
}

func (m *ImageManager) GetProtocolName() string {
	switch m.protocol {
	case termimg.Kitty:
		return "Kitty"
	case termimg.ITerm2:
		return "iTerm2"
	case termimg.Sixel:
		return "Sixel"
	case termimg.Halfblocks:
		return "HalfBlocks"
	default:
		return "Unknown"
	}
}

func (m *ImageManager) GetImage(id string) *LoadedImage {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.images[id]
}

func (m *ImageManager) SetImage(id string, img *LoadedImage) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.images[id] = img
}

func (m *ImageManager) ClearCache() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.images = make(map[string]*LoadedImage)
}

type imageLoadedMsg struct {
	ID       string
	Image    image.Image
	Rendered string
	Error    error
}

func (m *ImageManager) LoadImageCmd(info ImageInfo, width, height int) tea.Cmd {
	return func() tea.Msg {
		// Panic recovery
		defer func() {
			if r := recover(); r != nil {
				if imageDebugLog != nil {
					imageDebugLog.Printf("PANIC in LoadImageCmd for %s: %v", info.ID, r)
				}
				// This won't be sent since we're in defer, but prevents crash
			}
		}()

		if imageDebugLog != nil {
			imageDebugLog.Printf("START LoadImageCmd: ID=%s Filename=%s URL=%s", info.ID, info.Filename, info.URL)
		}

		existing := m.GetImage(info.ID)
		if existing != nil && existing.State != ImageStateFailed {
			if imageDebugLog != nil {
				imageDebugLog.Printf("SKIP LoadImageCmd: %s already exists with state %d", info.ID, existing.State)
			}
			return statusMsg{message: fmt.Sprintf("⏭️ Skipping %s (already loaded/loading)", info.Filename)}
		}

		m.SetImage(info.ID, &LoadedImage{
			Info:  info,
			State: ImageStateLoading,
		})
		if imageDebugLog != nil {
			imageDebugLog.Printf("SET LoadImageCmd: %s state=Loading", info.ID)
		}

		img, err := m.fetchImage(info.URL)
		if err != nil {
			if imageDebugLog != nil {
				imageDebugLog.Printf("FETCH FAILED for %s: %v", info.ID, err)
			}
			msg := imageLoadedMsg{
				ID:    info.ID,
				Error: fmt.Errorf("fetch failed: %w", err),
			}
			if imageDebugLog != nil {
				imageDebugLog.Printf("RETURN imageLoadedMsg (error): %+v", msg)
			}
			return msg
		}

		if imageDebugLog != nil {
			imageDebugLog.Printf("FETCH SUCCESS for %s, bounds=%v", info.ID, img.Bounds())
		}

		rendered, err := m.renderImage(img, width, height)
		if err != nil {
			if imageDebugLog != nil {
				imageDebugLog.Printf("RENDER FAILED for %s: %v", info.ID, err)
			}
			msg := imageLoadedMsg{
				ID:    info.ID,
				Image: img,
				Error: fmt.Errorf("render failed: %w", err),
			}
			if imageDebugLog != nil {
				imageDebugLog.Printf("RETURN imageLoadedMsg (render error): %+v", msg)
			}
			return msg
		}

		if imageDebugLog != nil {
			imageDebugLog.Printf("RENDER SUCCESS for %s, rendered length=%d", info.ID, len(rendered))
		}

		msg := imageLoadedMsg{
			ID:       info.ID,
			Image:    img,
			Rendered: rendered,
		}
		if imageDebugLog != nil {
			imageDebugLog.Printf("RETURN imageLoadedMsg (success): ID=%s HasImage=%v RenderedLen=%d", msg.ID, msg.Image != nil, len(msg.Rendered))
		}
		return msg
	}
}

func (m *ImageManager) fetchImage(contentURL string) (image.Image, error) {
	if imageDebugLog != nil {
		imageDebugLog.Printf("Downloading image from content URL: %s", contentURL)
	}

	req, err := http.NewRequest("GET", contentURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.SetBasicAuth(m.username, m.apiToken)

	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}
			req.SetBasicAuth(m.username, m.apiToken)
			return nil
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	img, _, err := image.Decode(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	return img, nil
}

func (m *ImageManager) renderImage(img image.Image, maxWidth, maxHeight int) (string, error) {
	if !m.supported {
		if m.viuAvailable {
			return m.renderWithViu(img, maxWidth)
		}
		return "", fmt.Errorf("terminal does not support inline images")
	}

	bounds := img.Bounds()
	imgWidth := bounds.Dx()
	imgHeight := bounds.Dy()

	charAspect := 2.0

	scale := 1.0
	if imgWidth > maxWidth {
		scale = float64(maxWidth) / float64(imgWidth)
	}
	if int(float64(imgHeight)*scale/charAspect) > maxHeight {
		scale = float64(maxHeight) * charAspect / float64(imgHeight)
	}

	finalWidth := int(float64(imgWidth) * scale)
	finalHeight := int(float64(imgHeight) * scale / charAspect)

	if finalWidth < 1 {
		finalWidth = 1
	}
	if finalHeight < 1 {
		finalHeight = 1
	}

	rendered, err := termimg.New(img).
		Width(finalWidth).
		Height(finalHeight).
		Protocol(m.protocol).
		Render()

	if err != nil {
		return "", fmt.Errorf("render image: %w", err)
	}

	return rendered, nil
}

func (m *ImageManager) renderWithViu(img image.Image, width int) (string, error) {
	if imageDebugLog != nil {
		imageDebugLog.Printf("Attempting renderWithViu, width=%d", width)
	}

	// Encode image to PNG in memory
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return "", fmt.Errorf("failed to encode image for viu: %w", err)
	}

	// viu -b -w <width> -
	// -b: block mode (half blocks)
	// -w: width in characters
	// -: read from stdin
	args := []string{"-b", "-w", strconv.Itoa(width), "-"}
	cmd := exec.Command("viu", args...)
	cmd.Stdin = &buf

	output, err := cmd.CombinedOutput()
	if err != nil {
		if imageDebugLog != nil {
			imageDebugLog.Printf("viu execution failed: %v, output: %s", err, string(output))
		}
		return "", fmt.Errorf("viu execution failed: %w", err)
	}

	return string(output), nil
}

func RenderImagePlaceholder(info ImageInfo, state ImageState, width int, s spinner.Model, err error) string {
	borderStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("241")).
		Width(width-4).
		Align(lipgloss.Center).
		Padding(0, 1)

	var content string
	switch state {
	case ImageStateLoading:
		content = fmt.Sprintf("%s Loading image: %s", s.View(), info.Filename)
	case ImageStateFailed:
		errMsg := "unknown error"
		if err != nil {
			errMsg = err.Error()
		}
		content = fmt.Sprintf("❌ Failed to load: %s\n%s", info.Filename, errMsg)
	case ImageStateUnsupported:
		content = fmt.Sprintf("🖼️  [Image: %s]\n(Terminal doesn't support inline images.\nInstall 'viu' for preview)", info.Filename)
	default:
		content = fmt.Sprintf("🖼️  [Image: %s]", info.Filename)
	}

	return borderStyle.Render(content)
}

func RenderLoadedImage(img *LoadedImage, width int) string {
	if img.State != ImageStateLoaded || img.Rendered == "" {
		return ""
	}

	labelStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("241")).
		Italic(true)

	label := labelStyle.Render(fmt.Sprintf("📷 %s", img.Info.Filename))

	return lipgloss.JoinVertical(lipgloss.Left, label, img.Rendered)
}
