#!/bin/bash
set -e

echo "Building jira-report..."

OUTPUT_DIR="./bin"
CMD_PATH="./cmd/jira-report"
BINARY_NAME="jira-report"
LDFLAGS="-s -w"

mkdir -p "$OUTPUT_DIR"

go build -trimpath -ldflags="$LDFLAGS" -o "$OUTPUT_DIR/${BINARY_NAME}" "$CMD_PATH"

if command -v upx &>/dev/null; then
    echo "Compressing with UPX..."
    upx --best --lzma "$OUTPUT_DIR/${BINARY_NAME}" 2>/dev/null || true
fi

echo "Build complete!"
echo ""
echo "Binary size:"
du -sh "$OUTPUT_DIR/${BINARY_NAME}"
echo ""
echo "Run with: ./$OUTPUT_DIR/$BINARY_NAME tui"
