#!/bin/bash
# Benchmark script to measure loading performance

echo "🚀 Jira Daily Report - Performance Benchmark"
echo "=============================================="
echo ""
echo "This script will help you measure the performance improvements."
echo ""
echo "Pre-requisites:"
echo "1. Ensure you have valid Jira credentials configured"
echo "2. Run from the go-tui directory"
echo ""

# Check if binary exists
if [ ! -f "./bin/jira-report" ]; then
    echo "❌ Binary not found. Building first..."
    go build -o bin/jira-report ./cmd/jira-report
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check errors above."
        exit 1
    fi
    echo "✅ Build successful!"
    echo ""
fi

echo "📊 Measuring startup time..."
echo ""
echo "The app will start and you can measure:"
echo "1. Time to first screen (tasks appearing)"
echo "2. Time to worklogs appearing"
echo "3. Total time to full load"
echo ""
echo "Expected improvements with optimizations:"
echo "  • Tasks: 1-2 seconds (was 3-5 seconds)"
echo "  • Worklogs: 2-3 seconds total (was 4-7 seconds)"
echo "  • Total: ~2-3 seconds (was 5-7 seconds)"
echo ""
echo "Press Enter to start the app..."
read

# Start the app with time measurement
echo ""
echo "⏱️  Starting app..."
echo ""

# Measure time and run app
/usr/bin/time -f "\n\n⏱️  Time Statistics:\n   Real: %E\n   User: %U\n   System: %S" ./bin/jira-report tui

echo ""
echo "✅ Benchmark complete!"
echo ""
echo "Compare your results to the expected improvements above."
