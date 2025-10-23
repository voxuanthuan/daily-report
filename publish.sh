#!/bin/bash

# Jira Daily Report - NPM Publishing Script
# This script helps you publish the package to NPM

set -e  # Exit on error

echo "🚀 Jira Daily Report - NPM Publishing"
echo "======================================"
echo ""

# Check if logged in to NPM
echo "📋 Step 1: Checking NPM authentication..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to NPM"
    echo "Please run: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
echo "✅ Logged in as: $NPM_USER"
echo ""

# Run tests
echo "🧪 Step 2: Running tests..."
npm run check-types
npm run lint
echo "✅ Tests passed"
echo ""

# Build production package
echo "📦 Step 3: Building production package..."
npm run package
echo "✅ Build complete"
echo ""

# Show what will be published
echo "📄 Step 4: Package contents preview..."
echo "Files that will be published:"
npm pack --dry-run 2>&1 | grep -E "npm notice" | head -20
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📌 Current version: $CURRENT_VERSION"
echo ""

# Ask for version bump
echo "🔢 Step 5: Version update"
echo "Current version: $CURRENT_VERSION"
echo ""
echo "Choose version bump:"
echo "  1) patch (bug fixes) - $CURRENT_VERSION -> $(npm version patch --no-git-tag-version --dry-run 2>&1 | grep -oP 'v\K[0-9.]+')"
echo "  2) minor (new features) - $CURRENT_VERSION -> $(npm version minor --no-git-tag-version --dry-run 2>&1 | grep -oP 'v\K[0-9.]+')"
echo "  3) major (breaking changes) - $CURRENT_VERSION -> $(npm version major --no-git-tag-version --dry-run 2>&1 | grep -oP 'v\K[0-9.]+')"
echo "  4) skip (keep current version)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        npm version patch
        echo "✅ Version bumped to patch"
        ;;
    2)
        npm version minor
        echo "✅ Version bumped to minor"
        ;;
    3)
        npm version major
        echo "✅ Version bumped to major"
        ;;
    4)
        echo "⏭️  Skipping version bump"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
echo ""

NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 Version to publish: $NEW_VERSION"
echo ""

# Confirm publication
echo "⚠️  Step 6: Ready to publish!"
echo ""
echo "Package: jira-daily-report"
echo "Version: $NEW_VERSION"
echo "Registry: https://registry.npmjs.org"
echo ""
read -p "Do you want to proceed with publication? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Publication cancelled"
    exit 0
fi

# Publish to NPM
echo ""
echo "📤 Publishing to NPM..."
npm publish

echo ""
echo "✅ Successfully published jira-daily-report@$NEW_VERSION!"
echo ""
echo "🎉 Users can now install with:"
echo "   npm install -g jira-daily-report"
echo ""
echo "📦 View on NPM:"
echo "   https://www.npmjs.com/package/jira-daily-report"
echo ""

# Push git tags
echo "📌 Don't forget to push git tags:"
echo "   git push && git push --tags"
echo ""
