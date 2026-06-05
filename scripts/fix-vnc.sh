#!/bin/bash
# 淇 VNC 杩炴帴闂

set -e

echo "=========================================="
echo "淇 VNC 杩炴帴闂"
echo "=========================================="
echo

# 1. 妫€鏌ュ鍣ㄧ姸鎬?echo "1锔忊儯  妫€鏌ュ鍣ㄧ姸鎬?.."
if ! docker compose ps | grep -q bb-browser; then
    echo "鉂?瀹瑰櫒鏈繍琛岋紝鍚姩瀹瑰櫒..."
    docker compose up -d
    sleep 10
fi

# 2. 妫€鏌?supervisord 鐘舵€?echo
echo "2锔忊儯  妫€鏌?supervisord 鏈嶅姟鐘舵€?.."
docker compose exec bb-browser supervisorctl status

# 3. 閲嶅惎澶辫触鐨勬湇鍔?echo
echo "3锔忊儯  閲嶅惎鎵€鏈夋湇鍔?.."
docker compose exec bb-browser supervisorctl restart all

# 4. 绛夊緟鏈嶅姟鍚姩
echo
echo "4锔忊儯  绛夊緟鏈嶅姟鍚姩锛?0绉掞級..."
sleep 10

# 5. 鍐嶆妫€鏌ョ姸鎬?echo
echo "5锔忊儯  妫€鏌ユ湇鍔＄姸鎬?.."
docker compose exec bb-browser supervisorctl status

# 6. 妫€鏌ョ鍙?echo
echo "6锔忊儯  妫€鏌ョ鍙ｇ洃鍚?.."
echo "VNC (5900):"
docker compose exec bb-browser sh -c "netstat -tlnp 2>/dev/null | grep 5900 || echo '鉂?鏈洃鍚?"
echo
echo "noVNC (6080):"
docker compose exec bb-browser sh -c "netstat -tlnp 2>/dev/null | grep 6080 || echo '鉂?鏈洃鍚?"

# 7. 鏌ョ湅 x11vnc 鏃ュ織
echo
echo "7锔忊儯  x11vnc 鏃ュ織锛堟渶鍚?20 琛岋級..."
docker compose exec bb-browser supervisorctl tail -20 x11vnc

echo
echo "=========================================="
echo "淇瀹屾垚"
echo "=========================================="
echo
echo "馃寪 璁块棶 noVNC锛?
echo "   http://$(hostname -I | awk '{print $1}'):6080/vnc.html"
echo
echo "馃挕 濡傛灉浠嶇劧鏃犳硶杩炴帴锛岃鏌ョ湅瀹屾暣鏃ュ織锛?
echo "   docker compose logs -f bb-browser"
