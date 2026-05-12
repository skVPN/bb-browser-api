#!/bin/sh
# bb-browser Docker 启动脚本
# 负责：
#   1. 创建必要目录
#   2. 等待 Chromium CDP 就绪
#   3. 启动 supervisord（管理 Chromium + daemon）

set -e

DAEMON_PORT="${BB_DAEMON_PORT:-18888}"
CDP_PORT="${BB_CDP_PORT:-9222}"
CDP_TIMEOUT="${CDP_TIMEOUT:-30}"

echo "[entrypoint] 启动 bb-browser 容器..."
echo "[entrypoint] Daemon 端口: ${DAEMON_PORT}"
echo "[entrypoint] CDP 端口: ${CDP_PORT}"

# 创建数据目录
mkdir -p /data/bb-browser /data/chrome-profile

# 如果传入了自定义命令（如 python app.py），先启动 supervisord 在后台，再执行自定义命令
if [ "$1" != "" ] && [ "$1" != "/entrypoint.sh" ]; then
    echo "[entrypoint] 后台启动 supervisord..."
    supervisord -c /etc/supervisor/supervisord.conf &
    SUPERVISOR_PID=$!

    # 等待 daemon 就绪
    echo "[entrypoint] 等待 bb-browser daemon 就绪..."
    i=0
    while [ $i -lt $CDP_TIMEOUT ]; do
        if curl -sf "http://127.0.0.1:${DAEMON_PORT}/status" > /dev/null 2>&1; then
            echo "[entrypoint] daemon 已就绪"
            break
        fi
        sleep 1
        i=$((i + 1))
    done

    if [ $i -ge $CDP_TIMEOUT ]; then
        echo "[entrypoint] 警告: daemon 启动超时，继续执行..."
    fi

    # 执行用户命令
    exec "$@"
else
    # 默认：前台运行 supervisord
    echo "[entrypoint] 前台启动 supervisord..."
    exec supervisord -c /etc/supervisor/supervisord.conf
fi
