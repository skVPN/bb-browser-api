# VNC 杩炴帴闂鎺掓煡鎸囧崡

## 闂鐜拌薄

```
Failed to connect to 127.0.0.1:5900: [Errno 111] Connection refused
```

杩欒〃绀?x11vnc 鏈嶅姟娌℃湁姝ｅ父鍚姩銆?

## 蹇€熶慨澶?

### 鍦ㄦ湇鍔″櫒涓婃墽琛岋細

```bash
cd /path/to/bb-browser
git pull
docker compose down
docker compose build
docker compose up -d
```

绛夊緟 30 绉掑悗锛岃繍琛岃瘖鏂剼鏈細

```bash
bash check-services.sh
```

濡傛灉鏈嶅姟浠嶇劧鏈夐棶棰橈紝杩愯淇鑴氭湰锛?

```bash
bash fix-vnc.sh
```

## 鎵嬪姩鎺掓煡姝ラ

### 1. 妫€鏌ュ鍣ㄧ姸鎬?

```bash
docker compose ps
```

搴旇鐪嬪埌 `bb-browser` 瀹瑰櫒鐘舵€佷负 `Up`銆?

### 2. 妫€鏌?supervisord 鏈嶅姟鐘舵€?

```bash
docker compose exec bb-browser supervisorctl status
```

搴旇鐪嬪埌 6 涓湇鍔￠兘鏄?`RUNNING`锛?

```
xvfb        RUNNING   pid 123, uptime 0:01:00
fluxbox     RUNNING   pid 124, uptime 0:01:00
x11vnc      RUNNING   pid 125, uptime 0:01:00  鈫?閲嶇偣妫€鏌ヨ繖涓?
novnc       RUNNING   pid 126, uptime 0:01:00
chromium    RUNNING   pid 127, uptime 0:01:00
bb-daemon   RUNNING   pid 128, uptime 0:01:00
```

### 3. 濡傛灉 x11vnc 鐘舵€佷笉鏄?RUNNING

鏌ョ湅 x11vnc 鏃ュ織锛?

```bash
docker compose exec bb-browser supervisorctl tail -50 x11vnc
```

甯歌閿欒锛?

#### 閿欒 1锛欴ISPLAY 涓嶅彲鐢?

```
[x11vnc] 閿欒: DISPLAY :99 涓嶅彲鐢?
```

**鍘熷洜锛?* Xvfb 杩樻病鏈夊惎鍔ㄥ畬鎴?

**瑙ｅ喅锛?* 閲嶅惎 x11vnc

```bash
docker compose exec bb-browser supervisorctl restart x11vnc
```

#### 閿欒 2锛氱鍙ｅ凡琚崰鐢?

```
bind: Address already in use
```

**鍘熷洜锛?* 5900 绔彛琚崰鐢?

**瑙ｅ喅锛?* 閲嶅惎鎵€鏈夋湇鍔?

```bash
docker compose exec bb-browser supervisorctl restart all
```

### 4. 妫€鏌ョ鍙ｇ洃鍚?

```bash
docker compose exec bb-browser netstat -tlnp | grep 5900
```

搴旇鐪嬪埌锛?

```
tcp  0  0  0.0.0.0:5900  0.0.0.0:*  LISTEN  125/x11vnc
```

### 5. 鏌ョ湅瀹屾暣鏃ュ織

```bash
docker compose logs -f bb-browser
```

鏌ユ壘鍖呭惈 `x11vnc` 鎴?`ERROR` 鐨勮銆?

## noVNC SSL 璀﹀憡

濡傛灉鐪嬪埌锛?

```
noVNC requires a secure context (TLS). Expect crashes!
```

杩欏彧鏄鍛婏紝涓嶅奖鍝嶅姛鑳姐€傛湁浠ヤ笅鍑犵瑙ｅ喅鏂规锛?

### 鏂规 1锛氫娇鐢?localhost锛堟帹鑽愮敤浜庢湰鍦帮級

```
http://localhost:6080/vnc.html  鉁?涓嶄細鎶ヨ鍛?
```

### 鏂规 2锛歋SH 绔彛杞彂锛堟帹鑽愮敤浜庤繙绋嬶級

鍦ㄦ湰鍦版墽琛岋細

```bash
ssh -L 6080:localhost:6080 user@your-server
```

鐒跺悗璁块棶锛?

```
http://localhost:6080/vnc.html
```

### 鏂规 3锛氶厤缃?HTTPS锛堟帹鑽愮敤浜庣敓浜э級

鍙傝€?`docker/nginx.conf` 閰嶇疆 Nginx 鍙嶅悜浠ｇ悊 + Let's Encrypt銆?

### 鏂规 4锛氭祻瑙堝櫒璁剧疆锛堜粎鐢ㄤ簬寮€鍙戯級

**Chrome/Edge锛?*

1. 璁块棶 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 娣诲姞浣犵殑鏈嶅姟鍣ㄥ湴鍧€锛歚http://192.168.1.100:6080`
3. 閲嶅惎娴忚鍣?

## 甯歌闂

### Q: 涓轰粈涔?x11vnc 鍚姩澶辫触锛?

A: 鍙兘鐨勫師鍥狅細
1. Xvfb 杩樻病鏈夊惎鍔ㄥ畬鎴愶紙绛夊緟鍑犵鍚庨噸璇曪級
2. DISPLAY 鐜鍙橀噺閰嶇疆閿欒
3. 绔彛琚崰鐢?
4. 鏂囦欢鏉冮檺闂

### Q: 濡備綍閲嶅惎鍗曚釜鏈嶅姟锛?

```bash
# 閲嶅惎 x11vnc
docker compose exec bb-browser supervisorctl restart x11vnc

# 閲嶅惎鎵€鏈夋湇鍔?
docker compose exec bb-browser supervisorctl restart all
```

### Q: 濡備綍鏌ョ湅鍗曚釜鏈嶅姟鐨勬棩蹇楋紵

```bash
# 鏌ョ湅 x11vnc 鏃ュ織
docker compose exec bb-browser supervisorctl tail -f x11vnc

# 鏌ョ湅鏈€杩?50 琛?
docker compose exec bb-browser supervisorctl tail -50 x11vnc
```

### Q: 瀹瑰櫒鍚姩鍚庨渶瑕佺瓑澶氫箙锛?

閫氬父闇€瑕?20-30 绉掞細
- Xvfb 鍚姩锛?-3 绉?
- fluxbox 鍚姩锛?-2 绉?
- x11vnc 鍚姩锛?-3 绉?
- novnc 鍚姩锛?-2 绉?
- chromium 鍚姩锛?-10 绉?
- bb-daemon 鍚姩锛?-10 绉?

### Q: 濡備綍纭鏈嶅姟宸茬粡瀹屽叏鍚姩锛?

```bash
# 鏂规硶 1锛氭鏌ュ仴搴风姸鎬?
docker compose ps

# 鏂规硶 2锛氭鏌ユ墍鏈夋湇鍔＄姸鎬?
docker compose exec bb-browser supervisorctl status

# 鏂规硶 3锛氭鏌ョ鍙?
docker compose exec bb-browser netstat -tlnp | grep -E '5900|6080|18888'
```

## 璇婃柇宸ュ叿

### check-services.sh

鍏ㄩ潰妫€鏌ユ墍鏈夋湇鍔＄姸鎬侊細

```bash
bash check-services.sh
```

杈撳嚭鍖呮嫭锛?
- 瀹瑰櫒鐘舵€?
- supervisord 杩涚▼鐘舵€?
- 绔彛鐩戝惉鐘舵€?
- X11 鏄剧ず鐘舵€?
- x11vnc 杩涚▼
- 鏈€杩戠殑鏃ュ織

### fix-vnc.sh

鑷姩淇 VNC 杩炴帴闂锛?

```bash
bash fix-vnc.sh
```

鑷姩鎵ц锛?
1. 妫€鏌ュ鍣ㄧ姸鎬?
2. 妫€鏌?supervisord 鐘舵€?
3. 閲嶅惎鎵€鏈夋湇鍔?
4. 绛夊緟鏈嶅姟鍚姩
5. 楠岃瘉绔彛鐩戝惉
6. 鏄剧ず x11vnc 鏃ュ織

## 璁块棶鏈嶅姟

淇瀹屾垚鍚庯紝璁块棶锛?

- **noVNC 缃戦〉**锛歨ttp://your-server:6080/vnc.html
- **API 鎺ュ彛**锛歨ttp://your-server:18888

## 鐩稿叧鏂囨。

- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - 閮ㄧ讲鏂规鎬荤粨
- [QUICK_FIX.md](./QUICK_FIX.md) - 蹇€熶慨澶嶆寚鍗?
- [SUPERVISORD_EXPLAINED.md](./SUPERVISORD_EXPLAINED.md) - supervisord 璇︾粏璇存槑
