#!/bin/bash
# Debug chromium startup issues

echo "=========================================="
echo "Chromium 鍚姩璋冭瘯"
echo "=========================================="
echo

# 1. 妫€鏌?chromium 杩涚▼
echo "1锔忊儯  Chromium 杩涚▼锛?
docker compose exec bb-browser ps aux | grep chromium | grep -v grep || echo "鉂?chromium 鏈繍琛?
echo

# 2. 妫€鏌?9222 绔彛
echo "2锔忊儯  CDP 绔彛 (9222) 鐩戝惉鐘舵€侊細"
docker compose exec bb-browser sh -c "netstat -tlnp 2>/dev/null | grep 9222 || echo '鉂?绔彛 9222 鏈洃鍚?"
echo

# 3. 妫€鏌?Xvfb
echo "3锔忊儯  Xvfb 杩涚▼锛?
docker compose exec bb-browser ps aux | grep Xvfb | grep -v grep || echo "鉂?Xvfb 鏈繍琛?
echo

# 4. 妫€鏌?DISPLAY
echo "4锔忊儯  DISPLAY 鐜鍙橀噺锛?
docker compose exec bb-browser sh -c 'echo $DISPLAY'
echo

# 5. 娴嬭瘯 DISPLAY 鍙敤鎬?echo "5锔忊儯  娴嬭瘯 DISPLAY 鍙敤鎬э細"
docker compose exec bb-browser sh -c "xdpyinfo -display :99 >/dev/null 2>&1 && echo '鉁?DISPLAY :99 鍙敤' || echo '鉂?DISPLAY :99 涓嶅彲鐢?"
echo

# 6. 鏌ョ湅 chromium 鏃ュ織
echo "6锔忊儯  Chromium 鏃ュ織锛堟渶鍚?30 琛岋級锛?
docker compose exec bb-browser supervisorctl tail -30 chromium
echo

# 7. 鏌ョ湅 supervisord 鐘舵€?echo "7锔忊儯  Supervisord 鏈嶅姟鐘舵€侊細"
docker compose exec bb-browser supervisorctl status
echo

# 8. 灏濊瘯鎵嬪姩鍚姩 chromium锛堟祴璇曪級
echo "8锔忊儯  娴嬭瘯鎵嬪姩鍚姩 chromium锛?
echo "鎵ц鍛戒护锛?
echo "docker compose exec bb-browser sh -c 'DISPLAY=:99 chromium --no-sandbox --disable-dev-shm-usage --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir=/tmp/test-profile --no-first-run about:blank &'"
echo
echo "鐒跺悗妫€鏌ワ細"
echo "docker compose exec bb-browser netstat -tlnp | grep 9222"

echo
echo "=========================================="
echo "璋冭瘯瀹屾垚"
echo "=========================================="
