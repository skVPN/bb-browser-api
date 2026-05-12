#!/bin/sh
# bb-browser 启动脚本

set -e

DAEMON_PORT="${BB_DAEMON_PORT:-18888}"
CDP_PORT="${BB_CDP_PORT:-9222}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"

echo "================================================"
echo " bb-browser 启动"
echo " noVNC 网页访问: http://<host>:${NOVNC_PORT}/vnc.html"
echo " bb-browser API: http://<host>:${DAEMON_PORT}"
echo "================================================"

# 创建必要目录
mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox

# 设置 DISPLAY 环境变量
export DISPLAY=":${DISPLAY_NUM}"

# 如果传入了自定义命令（如 python app.py），后台启动 supervisord 再执行
if [ "$1" != "" ] && [ "$1" != "/entrypoint.sh" ]; then
    supervisord -c /etc/supervisor/supervisord.conf &

    # 等待 noVNC 就绪
    echo "等待服务启动..."
    i=0
    while [ $i -lt 30 ]; do
        if curl -sf "http://127.0.0.1:${NOVNC_PORT}" > /dev/null 2>&1; then
            echo "noVNC 已就绪"
            break
        fi
        sleep 1
        i=$((i + 1))
    done

    exec "$@"
else
    # 默认：前台运行 supervisord
    exec supervisord -c /etc/supervisor/supervisord.conf
fi
