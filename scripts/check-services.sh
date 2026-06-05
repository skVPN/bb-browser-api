#!/bin/bash
# 妫€鏌ュ鍣ㄥ唴鎵€鏈夋湇鍔＄殑鐘舵€?
echo "=========================================="
echo "妫€鏌?bb-browser 瀹瑰櫒鏈嶅姟鐘舵€?
echo "=========================================="
echo

# 1. 妫€鏌ュ鍣ㄦ槸鍚﹁繍琛?echo "1锔忊儯  瀹瑰櫒鐘舵€侊細"
docker compose ps bb-browser
echo

# 2. 妫€鏌?supervisord 杩涚▼
echo "2锔忊儯  supervisord 杩涚▼鐘舵€侊細"
docker compose exec bb-browser supervisorctl status
echo

# 3. 妫€鏌ョ鍙ｇ洃鍚?echo "3锔忊儯  绔彛鐩戝惉鐘舵€侊細"
echo "VNC (5900):"
docker compose exec bb-browser netstat -tlnp | grep 5900 || echo "鉂?VNC 绔彛鏈洃鍚?
echo
echo "noVNC (6080):"
docker compose exec bb-browser netstat -tlnp | grep 6080 || echo "鉂?noVNC 绔彛鏈洃鍚?
echo
echo "API (18888):"
docker compose exec bb-browser netstat -tlnp | grep 18888 || echo "鉂?API 绔彛鏈洃鍚?
echo

# 4. 妫€鏌?X11 鏄剧ず
echo "4锔忊儯  X11 鏄剧ず鐘舵€侊細"
docker compose exec bb-browser ps aux | grep Xvfb | grep -v grep || echo "鉂?Xvfb 鏈繍琛?
echo

# 5. 妫€鏌?x11vnc 杩涚▼
echo "5锔忊儯  x11vnc 杩涚▼锛?
docker compose exec bb-browser ps aux | grep x11vnc | grep -v grep || echo "鉂?x11vnc 鏈繍琛?
echo

# 6. 鏌ョ湅鏈€杩戠殑鏃ュ織
echo "6锔忊儯  鏈€杩戠殑鏃ュ織锛堟渶鍚?50 琛岋級锛?
docker compose logs --tail=50 bb-browser
echo

echo "=========================================="
echo "璇婃柇瀹屾垚"
echo "=========================================="
