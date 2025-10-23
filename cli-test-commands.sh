#!/bin/bash

echo "=== Jira Daily Report CLI Testing Guide ==="
echo ""

echo "1. Check CLI is installed:"
echo "   jira-report --version"
echo ""

echo "2. View help:"
echo "   jira-report --help"
echo "   jira-report generate --help"
echo "   jira-report config --help"
echo ""

echo "3. Show current configuration (safe - masks secrets):"
echo "   jira-report config show"
echo ""

echo "4. Generate report (console output):"
echo "   jira-report generate"
echo ""

echo "5. Generate report with options:"
echo "   jira-report generate -s              # Silent mode"
echo "   jira-report generate -o report.txt   # Save to file"
echo "   jira-report generate -f json         # JSON format"
echo "   jira-report generate -c              # Copy to clipboard (needs clipboardy)"
echo ""

echo "6. Test different output formats:"
echo "   jira-report generate -f text -o report-text.txt"
echo "   jira-report generate -f json -o report-json.json"
echo "   jira-report generate -f markdown -o report.md"
echo ""

echo "7. Create global config (optional):"
echo "   jira-report config init --global"
echo "   # Creates ~/.jira-report.json"
echo ""

