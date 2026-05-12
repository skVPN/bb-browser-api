#!/bin/bash
# 蹇€熶慨澶嶅苟閲嶆柊閮ㄧ讲鑴氭湰

set -e

echo "=========================================="
echo "bb-browser 蹇€熶慨澶嶅拰閲嶆柊閮ㄧ讲"
echo "=========================================="
echo

# 1. 鎷夊彇鏈€鏂颁唬鐮?echo "1锔忊儯  鎷夊彇鏈€鏂颁唬鐮?.."
git pull

# 2. 杞崲鎹㈣绗︼紙闃叉 Windows 缂栬緫鍣ㄤ慨鏀癸級
echo
echo "2锔忊儯  杞崲鎹㈣绗︿负 LF..."
if command -v dos2unix &> /dev/null; then
    dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
    echo "鉁?浣跨敤 dos2unix 杞崲瀹屾垚"
else
    # 浣跨敤 sed 杞崲
    sed -i 's/\r$//' docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
    echo "鉁?浣跨敤 sed 杞崲瀹屾垚"
fi

# 3. 楠岃瘉閰嶇疆鏂囦欢
echo
echo "3锔忊儯  楠岃瘉閰嶇疆鏂囦欢..."
if command -v python3 &> /dev/null; then
    python3 validate-supervisord-strict.py docker/supervisord.conf
elif command -v python &> /dev/null; then
    python validate-supervisord-strict.py docker/supervisord.conf
else
    echo "鈿狅笍  鏈壘鍒?Python锛岃烦杩囬獙璇?
fi

# 4. 閲嶅惎瀹瑰櫒锛堥厤缃枃浠堕€氳繃 volume 鎸傝浇锛屼笉闇€瑕侀噸鏂版瀯寤猴級
echo
echo "4锔忊儯  閲嶅惎瀹瑰櫒..."
docker compose restart bb-browser

# 5. 绛夊緟鏈嶅姟鍚姩
echo
echo "5锔忊儯  绛夊緟鏈嶅姟鍚姩锛?0绉掞級..."
sleep 30

# 6. 妫€鏌ユ湇鍔＄姸鎬?echo
echo "6锔忊儯  妫€鏌ユ湇鍔＄姸鎬?.."
docker compose logs --tail=50 bb-browser

echo
echo "=========================================="
echo "閮ㄧ讲瀹屾垚"
echo "=========================================="
echo
echo "馃搳 妫€鏌ユ湇鍔＄姸鎬侊細"
echo "   docker compose exec bb-browser supervisorctl status"
echo
echo "馃摑 鏌ョ湅鏃ュ織锛?
echo "   docker compose logs -f bb-browser"
echo
echo "馃寪 璁块棶鏈嶅姟锛?
echo "   noVNC: http://$(hostname -I | awk '{print $1}'):6080/vnc.html"
echo "   API:   http://$(hostname -I | awk '{print $1}'):18888"
echo
echo "馃挕 鎻愮ず锛?
echo "   閰嶇疆鏂囦欢宸查€氳繃 volume 鎸傝浇锛屼慨鏀瑰悗鍙渶 restart 鍗冲彲鐢熸晥"
echo "   docker compose restart bb-browser"

