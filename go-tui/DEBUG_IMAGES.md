# Image Loading Debug Guide

## What to Look For

The TUI now includes **debug messages in the status bar** to help track image loading:

### 1. Terminal Support Check
When you **first navigate to a task** (or press `j`/`k` to move between tasks):
- **✅ If supported**: Status bar shows `🔄 Loading X image(s) for TASK-123...`
- **❌ If not supported**: Status bar shows `Terminal protocol: HalfBlocks (inline images not supported)`

### 2. Image Loading Messages
After images start loading, watch the status bar for:
- **Success**: `✅ Image loaded: screenshot.png`
- **Error**: `❌ Image load failed: screenshot.png - HTTP 404: Not Found`
- **Skip**: `⏭️ Skipping screenshot.png (already loaded/loading)`

### 3. Visual Indicators in Details Panel
In the **Details panel** (right side, top), you should see:
- **Loading**: Box with spinner `⏳ Loading image: screenshot.png`
- **Loaded**: The actual image (if supported) with label `📷 screenshot.png`
- **Failed**: Error box `❌ Failed to load: screenshot.png` with error message
- **Unsupported**: Text `[Image: screenshot.png]`

---

## Terminal Protocol Detection

The app detects which image protocol your terminal supports:
- **Kitty**: Best support (direct protocol)
- **iTerm2**: Good support (inline images)
- **Sixel**: Good support (older protocol)
- **HalfBlocks**: Fallback (ASCII art - not true images)
- **Unsupported**: No inline image support

**Your friend on macOS likely has iTerm2**, which should work.

---

## How to Test

### Step 1: Run the TUI
```bash
./bin/jira-report tui
```

### Step 2: Navigate to a Task with Images
1. Press `1`, `2`, or `3` to select a panel with tasks
2. Use `j`/`k` (or arrow keys) to navigate to a task that has images in its description
3. **Watch the status bar at the bottom** for debug messages

### Step 3: Check the Details Panel
- The **Details panel** (right side, top) shows the task description
- Images should appear inline with the text
- If loading, you'll see a spinner placeholder
- If terminal doesn't support inline images, you'll see `[Image: filename]`

---

## Common Issues & Solutions

### Issue: Status bar says "Terminal protocol: HalfBlocks"
**Cause**: Your terminal doesn't support inline images
**Solution**: Try running in:
- iTerm2 (macOS)
- Kitty (cross-platform)
- WezTerm (cross-platform)
- Any terminal with Sixel support

### Issue: Images never load (stuck at loading spinner)
**Check these:**
1. Is your Jira API token valid? (Can you fetch tasks?)
2. Does the task actually have images in the description?
3. Check status bar for error messages
4. Network connectivity to Jira server?

### Issue: "Image load failed: HTTP 401/403"
**Cause**: Authentication issue
**Solution**: Check your `~/.jira-daily-report.json` config:
- `apiToken` should be correct
- `username` should match the token owner

### Issue: Images load but don't render
**Cause**: Terminal might not fully support the detected protocol
**Solution**: Try a different terminal emulator

---

## Expected Behavior

### When Everything Works:
1. **Navigate to task** → Status bar: `🔄 Loading 2 image(s) for TASK-123...`
2. **Wait 1-2 seconds** → Status bar: `✅ Image loaded: screenshot.png`
3. **Details panel** → Shows actual image inline with description text
4. **Move to another task** → Images clear, new images load

### When Terminal Not Supported:
1. **Navigate to task** → Status bar: `Terminal protocol: HalfBlocks (inline images not supported)`
2. **Details panel** → Shows `[Image: screenshot.png]` as text

---

## File Locations

### Code Files (if you need to add more debug):
- `internal/tui/app.go` - Main app logic, image loading triggers
- `internal/tui/image_renderer.go` - Image fetching/rendering
- `internal/tui/description_parser.go` - ADF parsing for images

### Binary:
- `bin/jira-report` - Main binary (local platform)
- `bin/jira-report-darwin-arm64` - For macOS Apple Silicon (M1/M2/M3)
- `bin/jira-report-darwin-amd64` - For macOS Intel

---

## What I Fixed

1. **Info field preservation**: Image metadata (filename) now preserved when updating state
2. **Race condition**: Removed premature state setting that was preventing image load
3. **Debug messages**: Added status bar messages to track loading flow
4. **Error handling**: Better error messages for failed loads

---

## Next Steps If It's Not Working

Run the TUI and tell me:
1. What message appears in the **status bar** when you navigate to a task with images?
2. What do you see in the **Details panel** where the image should be?
3. What terminal are you using? (iTerm2, Terminal.app, Kitty, etc.)
