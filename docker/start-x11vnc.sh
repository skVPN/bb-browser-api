#!/bin/sh
# x11vnc 鍚姩鑴氭湰
# 鏍规嵁 VNC_PASSWORD 鐜鍙橀噺鍐冲畾鏄惁闇€瑕佸瘑鐮?
set -e

# 绛夊緟 Xvfb 鍚姩
echo "[x11vnc] 绛夊緟 Xvfb 鍚姩..."
sleep 2

# 妫€鏌?DISPLAY 鏄惁鍙敤
if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
    echo "[x11vnc] 閿欒: DISPLAY :${DISPLAY_NUM} 涓嶅彲鐢?
    echo "[x11vnc] 绛夊緟 5 绉掑悗閲嶈瘯..."
    sleep 5
    if ! xdpyinfo -display ":${DISPLAY_NUM}" >/dev/null 2>&1; then
        echo "[x11vnc] 閿欒: DISPLAY 浠嶇劧涓嶅彲鐢紝閫€鍑?
        exit 1
    fi
fi

echo "[x11vnc] DISPLAY :${DISPLAY_NUM} 宸插氨缁?

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
        -wait 5 \
        -nap
else
    echo "[x11vnc] 涓嶄娇鐢ㄥ瘑鐮?
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
