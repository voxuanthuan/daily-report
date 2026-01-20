#!/bin/bash

# Build binaries for all platforms

set -e

echo "Building jira-report for all platforms..."

OUTPUT_DIR="./bin"
CMD_PATH="./cmd/jira-report"
BINARY_NAME="jira-report"

mkdir -p "$OUTPUT_DIR"

# Build for Linux amd64
echo "Building for Linux amd64..."
GOOS=linux GOARCH=amd64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-linux-amd64" "$CMD_PATH"

# Build for Linux arm64
echo "Building for Linux arm64..."
GOOS=linux GOARCH=arm64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-linux-arm64" "$CMD_PATH"

# Build for macOS amd64 (Intel)
echo "Building for macOS amd64..."
GOOS=darwin GOARCH=amd64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-darwin-amd64" "$CMD_PATH"

# Build for macOS arm64 (Apple Silicon)
echo "Building for macOS arm64..."
GOOS=darwin GOARCH=arm64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-darwin-arm64" "$CMD_PATH"

# Build for Windows amd64
echo "Building for Windows amd64..."
GOOS=windows GOARCH=amd64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-windows-amd64.exe" "$CMD_PATH"

# Build for Windows arm64
echo "Building for Windows arm64..."
GOOS=windows GOARCH=arm64 go build -o "$OUTPUT_DIR/${BINARY_NAME}-windows-arm64.exe" "$CMD_PATH"

# Create a default binary for current platform
echo "Creating default binary for current platform..."
go build -o "$OUTPUT_DIR/${BINARY_NAME}" "$CMD_PATH"

echo ""
echo "✅ All binaries built successfully!"
echo ""
ls -lh "$OUTPUT_DIR"
