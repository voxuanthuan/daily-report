#!/bin/bash

set -e

CACHE_FILE="$HOME/.jira-daily-report-cache.json"
BINARY="./bin/jira-report"

echo "🧪 Testing Cache Functionality"
echo "================================"
echo ""

echo "1️⃣  Testing Cold Start (No Cache)"
echo "-----------------------------------"
rm -f "$CACHE_FILE"
echo "Cache file removed: $CACHE_FILE"
echo "Expected: App should load fresh data from API"
echo "Run: $BINARY tui"
echo "Press Ctrl+C to exit after verifying data loads"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "2️⃣  Testing Cache Creation"
echo "-----------------------------------"
if [ ! -f "$CACHE_FILE" ]; then
    echo "❌ Cache file was not created: $CACHE_FILE"
    exit 1
fi
echo "✅ Cache file exists: $CACHE_FILE"
ls -lh "$CACHE_FILE"
echo "Cache permissions:"
stat -c "%a %n" "$CACHE_FILE" || stat -f "%A %N" "$CACHE_FILE"
echo ""

echo "3️⃣  Testing Cache Contents"
echo "-----------------------------------"
echo "First few lines of cache:"
head -20 "$CACHE_FILE"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "4️⃣  Testing Warm Start (With Valid Cache)"
echo "-----------------------------------"
echo "Expected: App should show cached data immediately, then refresh"
echo "Look for: '📦 Loaded from cache' message in status bar"
echo "Run: $BINARY tui"
echo "Press Ctrl+C to exit after verifying cache loads"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "5️⃣  Testing Cache Expiration"
echo "-----------------------------------"
echo "Modifying cache to be expired (1 hour ago)..."

TEMP_CACHE=$(mktemp)
jq '.expiresAt = (now - 3600 | strftime("%Y-%m-%dT%H:%M:%S.000Z"))' "$CACHE_FILE" > "$TEMP_CACHE"
mv "$TEMP_CACHE" "$CACHE_FILE"

echo "✅ Cache modified to be expired"
echo "Expected: App should ignore expired cache and load fresh data"
echo "Run: $BINARY tui"
echo "Press Ctrl+C to exit after verifying"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "6️⃣  Testing Corrupted Cache"
echo "-----------------------------------"
echo "Corrupting cache file..."
echo "CORRUPTED" > "$CACHE_FILE"
echo "✅ Cache corrupted"
echo "Expected: App should handle error gracefully and load fresh data"
echo "Run: $BINARY tui"
echo "Press Ctrl+C to exit after verifying"
echo ""
read -p "Press Enter to continue..."

echo ""
echo "7️⃣  Testing Cache Disabled"
echo "-----------------------------------"
rm -f "$CACHE_FILE"
echo "Cache file removed"
echo "Expected: App should not create cache file when disabled"
echo "Run: JIRA_CACHE_ENABLED=false $BINARY tui"
echo "Press Ctrl+C to exit after verifying"
echo ""
read -p "Press Enter to continue..."

if [ -f "$CACHE_FILE" ]; then
    echo "❌ Cache file was created despite being disabled!"
    exit 1
fi
echo "✅ Cache file was not created (as expected)"

echo ""
echo "✅ All cache tests completed!"
echo ""
echo "Manual verification checklist:"
echo "  □ Cold start shows loading spinner"
echo "  □ Warm start shows cached data instantly"
echo "  □ Cache age indicator appears in status bar"
echo "  □ Fresh data replaces cache after background fetch"
echo "  □ Expired cache is ignored"
echo "  □ Corrupted cache is handled gracefully"
echo "  □ Cache can be disabled via config"
