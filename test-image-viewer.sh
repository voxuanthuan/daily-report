#!/bin/bash

# Test script to debug image viewer functionality

echo "=== Testing Image Viewer Setup ==="
echo ""

# Check if Kitty terminal
echo "1. Checking terminal type..."
echo "   TERM: $TERM"
echo "   KITTY_WINDOW_ID: $KITTY_WINDOW_ID"
if [ "$TERM" = "xterm-kitty" ] || [ -n "$KITTY_WINDOW_ID" ]; then
    echo "   ✓ Kitty terminal detected"
else
    echo "   ✗ NOT Kitty terminal (will fallback to browser)"
fi
echo ""

# Check if kitty icat is available
echo "2. Checking if 'kitty +kitten icat' is available..."
if command -v kitty &> /dev/null; then
    echo "   ✓ kitty command found"
    if kitty +kitten icat --help &> /dev/null; then
        echo "   ✓ icat kitten is available"
    else
        echo "   ✗ icat kitten not available"
    fi
else
    echo "   ✗ kitty command not found"
fi
echo ""

# Test downloading an image
echo "3. Testing image download..."
TEST_URL="https://via.placeholder.com/150"
if curl -s "$TEST_URL" -o /tmp/test-image.tmp; then
    echo "   ✓ Image download works"
    rm /tmp/test-image.tmp
else
    echo "   ✗ Image download failed"
fi
echo ""

# Run TUI with logging
echo "4. To test the TUI, run:"
echo "   node dist/cli/index.js tui 2>&1 | tee /tmp/tui-output.log"
echo ""
echo "5. After pressing 'v', check the log:"
echo "   cat /tmp/tui-output.log | grep 'KEY PRESSED'"
echo ""
echo "=== Test Complete ==="
