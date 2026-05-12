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

# ── 安装依赖 + 构建（代码从 volume 挂载进来）─────────────
cd /app

if [ ! -f "package.json" ]; then
    echo "[ERROR] /app/package.json 不存在，请确认代码已挂载到 /app"
    exit 1
fi

# node_modules 不存在或 package.json 有更新时重新安装
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.modules.yaml" ]; then
    echo "[startup] 安装依赖（包括 devDependencies，用于构建）..."
    pnpm install --frozen-lockfile --prod=false
fi

# dist 不存在或源码有更新时重新构建
if [ ! -f "dist/daemon.js" ]; then
    echo "[startup] 构建项目..."
    pnpm build
fi

echo "[startup] 启动所有服务..."
exec supervisord -c /etc/supervisor/supervisord.conf
