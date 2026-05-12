#!/bin/sh
# bb-browser 启动脚本
# 代码通过 volume 挂载到 /app，启动时自动安装依赖并构建

set -e

DAEMON_PORT="${BB_DAEMON_PORT:-18888}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"

export DISPLAY=":${DISPLAY_NUM}"

echo "================================================"
echo " bb-browser 启动"
echo " noVNC 网页: http://<host>:${NOVNC_PORT}/vnc.html"
echo " API:        http://<host>:${DAEMON_PORT}"
echo "================================================"

# 创建必要目录
mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox

# ── 构建项目（依赖已在镜像中安装）─────────────────────
cd /app

if [ ! -f "package.json" ]; then
    echo "[ERROR] /app/package.json 不存在，请确认代码已挂载到 /app"
    exit 1
fi

# 检查依赖是否需要更新（package.json 有变化）
if [ "package.json" -nt "/app/node_modules/.modules.yaml" ] 2>/dev/null; then
    echo "[startup] 检测到依赖变化，重新安装..."
    pnpm install --frozen-lockfile --prod=false
fi

# dist 不存在或源码有更新时重新构建
if [ ! -f "dist/daemon.js" ]; then
    echo "[startup] 构建项目..."
    pnpm build
fi

echo "[startup] 启动所有服务..."
exec supervisord -c /etc/supervisor/supervisord.conf
