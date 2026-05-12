#!/bin/sh
# x11vnc 閸氼垰濮╅懘姘拱
# 閺嶈宓?VNC_PASSWORD 閻滎垰顣ㄩ崣姗€鍣洪崘鍐茬暰閺勵垰鎯侀棁鈧憰浣哥槕閻?
set -e

if [ -n "$VNC_PASSWORD" ]; then
    echo "[x11vnc] 娴ｈ法鏁ょ€靛棛鐖滄穱婵囧Б"
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
    echo "[x11vnc] 娑撳秳濞囬悽銊ョ槕閻?
    exec x11vnc \
        -display ":${DISPLAY_NUM}" \
        -forever \
        -shared \
        -nopw \
        -rfbport "${VNC_PORT}" \
        -noxdamage \
        -wait 5
fi
