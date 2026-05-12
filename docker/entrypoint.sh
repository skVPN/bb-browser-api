#!/bin/sh
# bb-browser startup script
# Code is mounted via volume to /app, dependencies are installed at startup

set -e

DAEMON_PORT="${BB_DAEMON_PORT:-18888}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"

export DISPLAY=":${DISPLAY_NUM}"

echo "================================================"
echo " bb-browser startup"
echo " noVNC web: http://<host>:${NOVNC_PORT}/vnc.html"
echo " API:       http://<host>:${DAEMON_PORT}"
echo "================================================"

# Create necessary directories
mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox

# Build project (dependencies already installed in image)
cd /app

if [ ! -f "package.json" ]; then
    echo "[ERROR] /app/package.json not found, please ensure code is mounted to /app"
    exit 1
fi

# Check if dependencies need to be updated (package.json has changed)
if [ "package.json" -nt "/app/node_modules/.modules.yaml" ] 2>/dev/null; then
    echo "[startup] Detected dependency changes, reinstalling..."
    pnpm install --frozen-lockfile --prod=false
fi

# Rebuild if dist doesn't exist or source code has been updated
if [ ! -f "dist/daemon.js" ]; then
    echo "[startup] Building project..."
    pnpm build
fi

echo "[startup] Starting all services..."

# Fix supervisord config file line endings (prevent Windows CRLF issues)
CONF_FILE="/etc/supervisor/conf.d/bb-browser.conf"
if [ -f "$CONF_FILE" ]; then
    # Check for CRLF line endings
    if file "$CONF_FILE" 2>/dev/null | grep -q "CRLF"; then
        echo "[startup] WARNING: Detected CRLF line endings, converting to LF..."
        sed -i 's/\r$//' "$CONF_FILE"
        echo "[startup] OK: Line ending conversion complete"
    else
        echo "[startup] OK: Config file line endings are correct"
    fi
else
    echo "[startup] ERROR: Config file not found: $CONF_FILE"
    exit 1
fi

exec supervisord -c /etc/supervisor/supervisord.conf
