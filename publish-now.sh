#!/bin/bash
echo "📦 Publishing jira-daily-report v0.1.96"
echo ""

# Check if logged in
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to NPM"
    echo ""
    echo "Please run:"
    echo "  npm login"
    echo ""
    exit 1
fi

echo "✅ Logged in as: $(npm whoami)"
echo ""

# Build
echo "🔨 Building production package..."
npm run package
echo ""

# Dry run
echo "🔍 Testing publication (dry run)..."
npm publish --dry-run
echo ""

# Confirm
read -p "Publish to NPM? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Publication cancelled"
    exit 0
fi

# Publish
echo ""
echo "📤 Publishing..."
npm publish

echo ""
echo "✅ Published successfully!"
echo ""
echo "🎉 Users can now install with:"
echo "   npm install -g jira-daily-report"
echo ""
echo "📌 Don't forget to push:"
echo "   git push && git push --tags"
echo ""
