#!/bin/sh
# x11vnc 鍚姩鑴氭湰
# 鏍规嵁 VNC_PASSWORD 鐜鍙橀噺鍐冲畾鏄惁闇€瑕佸瘑鐮?
set -e

if [ -n "$VNC_PASSWORD" ]; then
    echo "[x11vnc] 浣跨敤瀵嗙爜淇濇姢"
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
    echo "[x11vnc] 涓嶄娇鐢ㄥ瘑鐮?
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -nopw \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5
fi
