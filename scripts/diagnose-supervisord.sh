#!/bin/bash
# supervisord 閰嶇疆璇婃柇鑴氭湰
# 鍦ㄦ湇鍔″櫒涓婅繍琛屾鑴氭湰鏉ヨ瘖鏂棶棰?
set -e

echo "=========================================="
echo "supervisord 閰嶇疆璇婃柇"
echo "=========================================="
echo

# 1. 妫€鏌ユ湰鍦版枃浠?echo "1锔忊儯  妫€鏌ユ湰鍦?docker/supervisord.conf"
echo "----------------------------------------"
if [ -f "docker/supervisord.conf" ]; then
    echo "鉁?鏂囦欢瀛樺湪"
    
    # 妫€鏌ユ崲琛岀
    if file docker/supervisord.conf | grep -q "CRLF"; then
        echo "鉂?鏂囦欢浣跨敤 CRLF 鎹㈣绗︼紙Windows 鏍煎紡锛?
        echo "   闇€瑕佽浆鎹负 LF锛圲nix 鏍煎紡锛?
    else
        echo "鉁?鏂囦欢浣跨敤 LF 鎹㈣绗︼紙Unix 鏍煎紡锛?
    fi
    
    # 妫€鏌ユ槸鍚︽湁寮曞彿
    if grep -n 'environment=.*"' docker/supervisord.conf; then
        echo "鉂?鍙戠幇 environment 瀛楁鍖呭惈寮曞彿锛?
        grep -n 'environment=.*"' docker/supervisord.conf
    else
        echo "鉁?environment 瀛楁娌℃湁寮曞彿"
    fi
    
    # 鏄剧ず绗?60-65 琛?    echo
    echo "馃搫 绗?60-65 琛屽唴瀹癸細"
    sed -n '60,65p' docker/supervisord.conf | cat -n
else
    echo "鉂?鏂囦欢涓嶅瓨鍦?
fi

echo
echo "2锔忊儯  妫€鏌ュ鍣ㄥ唴鐨勯厤缃枃浠?
echo "----------------------------------------"
if docker compose ps | grep -q bb-browser; then
    echo "鉁?瀹瑰櫒姝ｅ湪杩愯"
    
    echo
    echo "馃搫 瀹瑰櫒鍐呴厤缃枃浠剁 60-65 琛岋細"
    docker compose exec -T bb-browser sed -n '60,65p' /etc/supervisor/conf.d/bb-browser.conf | cat -n
    
    echo
    echo "馃攳 妫€鏌ュ鍣ㄥ唴鏄惁鏈夊紩鍙凤細"
    if docker compose exec -T bb-browser grep 'environment=.*"' /etc/supervisor/conf.d/bb-browser.conf; then
        echo "鉂?瀹瑰櫒鍐呴厤缃枃浠舵湁寮曞彿锛?
    else
        echo "鉁?瀹瑰櫒鍐呴厤缃枃浠舵病鏈夊紩鍙?
    fi
    
    echo
    echo "馃搳 supervisord 杩涚▼鐘舵€侊細"
    docker compose exec -T bb-browser supervisorctl status || echo "鉂?supervisord 鏈繍琛?
else
    echo "鈿狅笍  瀹瑰櫒鏈繍琛?
fi

echo
echo "3锔忊儯  Git 鐘舵€?
echo "----------------------------------------"
echo "褰撳墠鍒嗘敮锛?
git branch --show-current
echo
echo "鏈€杩?3 娆℃彁浜わ細"
git log --oneline -3
echo
echo "鏈湴涓庤繙绋嬬殑宸紓锛?
git status -sb

echo
echo "=========================================="
echo "璇婃柇瀹屾垚"
echo "=========================================="
echo
echo "馃挕 濡傛灉瀹瑰櫒鍐呴厤缃枃浠舵湁闂锛岃鎵ц锛?
echo "   1. git pull                    # 鎷夊彇鏈€鏂颁唬鐮?
echo "   2. docker compose down         # 鍋滄瀹瑰櫒"
echo "   3. docker compose build        # 閲嶆柊鏋勫缓闀滃儚"
echo "   4. docker compose up -d        # 鍚姩瀹瑰櫒"
