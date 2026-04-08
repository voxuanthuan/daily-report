#!/bin/bash

set -e

echo "Building jira-report for all platforms..."

OUTPUT_DIR="./bin"
CMD_PATH="./cmd/jira-report"
BINARY_NAME="jira-report"

LDFLAGS="-s -w"

mkdir -p "$OUTPUT_DIR"

PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
    "windows/arm64"
)

for platform in "${PLATFORMS[@]}"; do
    IFS='/' read -r GOOS GOARCH <<< "$platform"
    suffix="-${GOOS}-${GOARCH}"
    [[ "$GOOS" == "windows" ]] && suffix+=".exe"

    echo "Building for $GOOS/$GOARCH..."
    CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" \
        go build -trimpath -ldflags="$LDFLAGS" \
        -o "$OUTPUT_DIR/${BINARY_NAME}${suffix}" "$CMD_PATH"
done

if command -v upx &>/dev/null; then
    echo ""
    echo "Compressing with UPX..."
    for f in "$OUTPUT_DIR"/${BINARY_NAME}-*; do
        [[ "$f" == *".exe" ]] && continue
        upx --best --lzma "$f" 2>/dev/null || true
    done
fi

echo ""
echo "All binaries built successfully!"
echo ""
ls -lh "$OUTPUT_DIR"
