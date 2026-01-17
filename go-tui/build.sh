#!/bin/bash
# Optimized build script for jira-report TUI

set -e

echo "🔨 Building jira-report with optimizations..."

# Build with optimization flags
# -s: Strip symbol table
# -w: Strip DWARF debugging information
go build -ldflags="-s -w" -o bin/jira-report ./cmd/jira-report

echo "✅ Build complete!"
echo ""
echo "📊 Binary size:"
du -sh bin/jira-report
echo ""
echo "🚀 Run with: ./bin/jira-report tui"
