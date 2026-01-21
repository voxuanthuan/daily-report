#!/bin/bash

set -e

echo "Building jira-report for all platforms..."

OUTPUT_DIR="./bin"
CMD_PATH="./cmd/jira-report"
BINARY_NAME="jira-report"

LDFLAGS="-s -w"

mkdir -p "$OUTPUT_DIR"

echo "Building for Linux amd64..."
GOOS=linux GOARCH=amd64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-linux-amd64" "$CMD_PATH"

echo "Building for Linux arm64..."
GOOS=linux GOARCH=arm64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-linux-arm64" "$CMD_PATH"

echo "Building for macOS amd64..."
GOOS=darwin GOARCH=amd64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-darwin-amd64" "$CMD_PATH"

echo "Building for macOS arm64..."
GOOS=darwin GOARCH=arm64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-darwin-arm64" "$CMD_PATH"

echo "Building for Windows amd64..."
GOOS=windows GOARCH=amd64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-windows-amd64.exe" "$CMD_PATH"

echo "Building for Windows arm64..."
GOOS=windows GOARCH=arm64 go build -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}-windows-arm64.exe" "$CMD_PATH"

echo ""
echo "✅ All binaries built successfully!"
echo ""
ls -lh "$OUTPUT_DIR"
