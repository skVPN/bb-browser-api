#!/bin/sh
# x11vnc startup script
# Decides whether to use password based on VNC_PASSWORD environment variable

set -e

# Wait for Xvfb to start
echo "[x11vnc] Waiting for Xvfb to start..."
sleep 2

# Check if DISPLAY is available
if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
    echo "[x11vnc] ERROR: DISPLAY :${DISPLAY_NUM} is not available"
    echo "[x11vnc] Waiting 5 seconds and retrying..."
    sleep 5
    if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
        echo "[x11vnc] ERROR: DISPLAY still not available, exiting"
        exit 1
    fi
fi

echo "[x11vnc] DISPLAY :${DISPLAY_NUM} is ready"

if [ -n "$VNC_PASSWORD" ]; then
    echo "[x11vnc] Using password protection"
    x11vnc -storepasswd "$VNC_PASSWORD" /tmp/vncpass
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -rfbauth /tmp/vncpass \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5 \
        -nap
else
    echo "[x11vnc] Not using password"
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -nopw \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5 \
        -nap
fi
