#!/bin/sh
# Chromium startup script with proper error handling

set -e

echo "[chromium] Waiting for Xvfb to be ready..."
sleep 3

# Check if DISPLAY is available
if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
    echo "[chromium] ERROR: DISPLAY :${DISPLAY_NUM} is not available"
    echo "[chromium] Waiting 5 seconds and retrying..."
    sleep 5
    if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
        echo "[chromium] ERROR: DISPLAY still not available, exiting"
        exit 1
    fi
fi

echo "[chromium] DISPLAY :${DISPLAY_NUM} is ready"

# Create user data directory
mkdir -p /data/chrome-profile
chmod 777 /data/chrome-profile

echo "[chromium] Starting chromium with CDP on port ${BB_CDP_PORT}..."

# Start chromium
exec chromium \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --remote-debugging-address=0.0.0.0 \
    --remote-debugging-port="${BB_CDP_PORT}" \
    --user-data-dir=/data/chrome-profile \
    --no-first-run \
    --no-default-browser-check \
    --disable-translate \
    --disable-extensions \
    --disable-background-networking \
    --disable-sync \
    --metrics-recording-only \
    --disable-default-apps \
    --mute-audio \
    --no-pings \
    --window-size="${SCREEN_WIDTH},${SCREEN_HEIGHT}" \
    --start-maximized \
    about:blank
