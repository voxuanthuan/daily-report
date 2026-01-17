#!/bin/bash
# Test script for progressive loading in Go TUI

echo "🧪 Testing Go TUI Progressive Loading"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /home/thuan/workspace/grapple/shjt/jira-daily-report/jira-daily-report/go-tui

# Clear previous log
rm -f /tmp/tui-debug.log

echo -e "${YELLOW}Starting TUI in background...${NC}"
./jira-tui tui 2>/tmp/tui-debug.log &
TUI_PID=$!

echo "TUI PID: $TUI_PID"
echo -e "${YELLOW}Waiting for logs...${NC}"
echo ""

# Wait a bit for the TUI to start
sleep 1

# Monitor the log file and show timestamps
echo "📊 Log output:"
echo "----------------------------------------"

# Tail the log file for 15 seconds, then kill
timeout 15 tail -f /tmp/tui-debug.log 2>/dev/null &
TAIL_PID=$!

# Wait for either timeout or manual interrupt
wait $TAIL_PID 2>/dev/null

echo ""
echo "----------------------------------------"

# Kill the TUI
kill $TUI_PID 2>/dev/null
wait $TUI_PID 2>/dev/null

echo ""
echo -e "${GREEN}✓ Test complete!${NC}"
echo ""
echo "📋 What to look for in the logs:"
echo "  1. [PHASE 1] Starting... should appear first"
echo "  2. [PHASE 1] Completed... should appear ~1-2 seconds later"
echo "  3. [UPDATE] Tasks loaded... should appear immediately after"
echo "  4. [PHASE 2] Starting... should start right after UPDATE"
echo "  5. [PHASE 2] Delay complete... should appear 2 seconds later"
echo "  6. [PHASE 2] Completed... should appear after API calls"
echo ""
echo "🎯 Expected behavior:"
echo "  - UI should show tasks after step 3"
echo "  - Time panel should show 'Loading...' from step 4-6"
echo "  - Time panel should populate after step 6"
