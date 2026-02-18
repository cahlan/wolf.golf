#!/bin/bash
# Installs system dependencies for Playwright Chromium without sudo.
# Only needed on systems missing libasound2 (the only dep Chromium requires
# that isn't typically present on Ubuntu/Debian server installs).

set -e

EXTRACT_DIR="/tmp/libasound_extract"

if [ -f "$EXTRACT_DIR/usr/lib/x86_64-linux-gnu/libasound.so.2" ]; then
  echo "✅ libasound already installed at $EXTRACT_DIR"
  exit 0
fi

echo "📦 Downloading libasound2..."
cd /tmp
apt-get download libasound2t64 2>/dev/null || apt-get download libasound2 2>/dev/null
DEB=$(ls libasound2*.deb 2>/dev/null | head -1)

if [ -z "$DEB" ]; then
  echo "❌ Could not download libasound2. Try: sudo apt-get install libasound2"
  exit 1
fi

mkdir -p "$EXTRACT_DIR"
dpkg-deb -x "$DEB" "$EXTRACT_DIR"
rm "$DEB"
echo "✅ libasound installed to $EXTRACT_DIR"
echo "   Tests will use LD_LIBRARY_PATH=$EXTRACT_DIR/usr/lib/x86_64-linux-gnu"
