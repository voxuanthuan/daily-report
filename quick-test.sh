#!/bin/bash
# Quick CLI Test Script

echo "🧪 Testing Jira Daily Report CLI"
echo "=================================="
echo ""

# Test 1: Version
echo "✓ Test 1: Check version"
jira-report --version
echo ""

# Test 2: Help
echo "✓ Test 2: Display help"
jira-report generate --help | head -10
echo ""

# Test 3: Config status
echo "✓ Test 3: Check config files"
if [ -f .jira-report.json ]; then
    echo "  ✓ Local config exists: .jira-report.json"
else
    echo "  ✗ No local config found"
fi

if [ -f ~/.jira-report.json ]; then
    echo "  ✓ Global config exists: ~/.jira-report.json"
else
    echo "  ✗ No global config found"
fi
echo ""

# Test 4: Show config (if available)
echo "✓ Test 4: Show current configuration"
if [ -f .jira-report.json ] || [ -f ~/.jira-report.json ]; then
    jira-report config show 2>/dev/null || echo "  ⚠ Config exists but may need credentials"
else
    echo "  ⚠ No config found. Run: jira-report config init"
fi
echo ""

echo "=================================="
echo "✅ Basic CLI tests completed!"
echo ""
echo "Next steps:"
echo "1. Add your credentials to .jira-report.json"
echo "2. Run: jira-report generate"
echo ""
