#!/bin/sh
# bb-browser 鍚姩鑴氭湰
# 浠ｇ爜閫氳繃 volume 鎸傝浇鍒?/app锛屽惎鍔ㄦ椂鑷姩瀹夎渚濊禆骞舵瀯寤?set -e

DAEMON_PORT="${BB_DAEMON_PORT:-18888}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"

export DISPLAY=":${DISPLAY_NUM}"

echo "================================================"
echo " bb-browser 鍚姩"
echo " noVNC 缃戦〉: http://<host>:${NOVNC_PORT}/vnc.html"
echo " API:        http://<host>:${DAEMON_PORT}"
echo "================================================"

# 鍒涘缓蹇呰鐩綍
mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox

# 鈹€鈹€ 鏋勫缓椤圭洰锛堜緷璧栧凡鍦ㄩ暅鍍忎腑瀹夎锛夆攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
cd /app

if [ ! -f "package.json" ]; then
    echo "[ERROR] /app/package.json 涓嶅瓨鍦紝璇风‘璁や唬鐮佸凡鎸傝浇鍒?/app"
    exit 1
fi

# 妫€鏌ヤ緷璧栨槸鍚﹂渶瑕佹洿鏂帮紙package.json 鏈夊彉鍖栵級
if [ "package.json" -nt "/app/node_modules/.modules.yaml" ] 2>/dev/null; then
    echo "[startup] 妫€娴嬪埌渚濊禆鍙樺寲锛岄噸鏂板畨瑁?.."
    pnpm install --frozen-lockfile --prod=false
fi

# dist 涓嶅瓨鍦ㄦ垨婧愮爜鏈夋洿鏂版椂閲嶆柊鏋勫缓
if [ ! -f "dist/daemon.js" ]; then
    echo "[startup] 鏋勫缓椤圭洰..."
    pnpm build
fi

echo "[startup] 鍚姩鎵€鏈夋湇鍔?.."

# 鈹€鈹€ 淇 supervisord 閰嶇疆鏂囦欢鎹㈣绗︼紙闃叉 Windows CRLF 闂锛夆攢鈹€
CONF_FILE="/etc/supervisor/conf.d/bb-browser.conf"
if [ -f "$CONF_FILE" ]; then
    # 妫€鏌ユ槸鍚︽湁 CRLF 鎹㈣绗?    if file "$CONF_FILE" 2>/dev/null | grep -q "CRLF"; then
        echo "[startup] 鈿狅笍  妫€娴嬪埌 CRLF 鎹㈣绗︼紝鑷姩杞崲涓?LF..."
        sed -i 's/\r$//' "$CONF_FILE"
        echo "[startup] 鉁?鎹㈣绗﹁浆鎹㈠畬鎴?
    else
        echo "[startup] 鉁?閰嶇疆鏂囦欢鎹㈣绗︽甯?
    fi
else
    echo "[startup] 鉂?閰嶇疆鏂囦欢涓嶅瓨鍦? $CONF_FILE"
    exit 1
fi

exec supervisord -c /etc/supervisor/supervisord.conf
