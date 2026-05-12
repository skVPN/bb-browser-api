#!/bin/sh
# x11vnc 启动脚本
# 根据 VNC_PASSWORD 环境变量决定是否需要密码

set -e

if [ -n "$VNC_PASSWORD" ]; then
    echo "[x11vnc] 使用密码保护"
    x11vnc -storepasswd "$VNC_PASSWORD" /tmp/vncpass
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -rfbauth /tmp/vncpass \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5
else
    echo "[x11vnc] 不使用密码"
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -nopw \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5
fi
