# bb-browser 鏈€缁堥儴缃叉寚鍗?

## 馃幆 鍦ㄦ湇鍔″櫒涓婃墽琛岋紙瀹屾暣娴佺▼锛?

```bash
# 1. 杩涘叆椤圭洰鐩綍
cd /path/to/bb-browser

# 2. 鎷夊彇鏈€鏂颁唬鐮?
git pull

# 3. 鍋滄骞跺垹闄ゆ棫瀹瑰櫒
docker compose down

# 4. 閲嶆柊鏋勫缓闀滃儚
docker compose build

# 5. 鍚姩瀹瑰櫒
docker compose up -d

# 6. 绛夊緟 30 绉掕鏈嶅姟鍚姩
sleep 30

# 7. 妫€鏌ユ湇鍔＄姸鎬?
docker compose exec bb-browser supervisorctl status
```

## 鉁?楠岃瘉鏈嶅姟

### 1. 妫€鏌ユ墍鏈夋湇鍔＄姸鎬?

```bash
docker compose exec bb-browser supervisorctl status
```

搴旇鐪嬪埌 6 涓湇鍔￠兘鏄?`RUNNING`锛?

```
xvfb        RUNNING   pid 123, uptime 0:01:00
fluxbox     RUNNING   pid 124, uptime 0:01:00
x11vnc      RUNNING   pid 125, uptime 0:01:00
novnc       RUNNING   pid 126, uptime 0:01:00
chromium    RUNNING   pid 127, uptime 0:01:00
bb-daemon   RUNNING   pid 128, uptime 0:01:00
```

### 2. 妫€鏌ョ鍙ｇ洃鍚?

```bash
docker compose exec bb-browser netstat -tlnp | grep -E '5900|6080|18888'
```

搴旇鐪嬪埌锛?

```
tcp  0  0  0.0.0.0:5900   0.0.0.0:*  LISTEN  125/x11vnc
tcp  0  0  0.0.0.0:6080   0.0.0.0:*  LISTEN  126/websockify
tcp  0  0  0.0.0.0:18888  0.0.0.0:*  LISTEN  128/node
```

### 3. 璁块棶鏈嶅姟

- **noVNC 缃戦〉**锛歨ttp://your-server:6080/vnc.html
- **API 鎺ュ彛**锛歨ttp://your-server:18888

## 馃敡 濡傛灉閬囧埌闂

### 闂 1锛歴upervisord 瑙ｆ瀽閿欒

```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
```

**瑙ｅ喅锛?*

```bash
# 杞崲鎹㈣绗?
sed -i 's/\r$//' docker/supervisord.conf

# 閲嶅惎瀹瑰櫒
docker compose restart bb-browser
```

### 闂 2锛歺11vnc 杩炴帴澶辫触

```
Failed to connect to 127.0.0.1:5900: [Errno 111] Connection refused
```

**瑙ｅ喅锛?*

```bash
# 杩愯淇鑴氭湰
bash fix-vnc.sh

# 鎴栨墜鍔ㄩ噸鍚湇鍔?
docker compose exec bb-browser supervisorctl restart x11vnc
```

### 闂 3锛歟ntrypoint.sh 璇硶閿欒

```
/entrypoint.sh: 52: Syntax error: "else" unexpected
```

**瑙ｅ喅锛?*

```bash
# 鎷夊彇鏈€鏂颁唬鐮侊紙宸蹭慨澶嶏級
git pull

# 閲嶆柊鏋勫缓
docker compose down
docker compose build
docker compose up -d
```

### 闂 4锛氫腑鏂囦贡鐮?

鎵€鏈夎剼鏈枃浠剁幇鍦ㄩ兘浣跨敤鑻辨枃娉ㄩ噴锛岄伩鍏嶇紪鐮侀棶棰樸€?

## 馃搳 璇婃柇宸ュ叿

### check-services.sh

鍏ㄩ潰妫€鏌ユ墍鏈夋湇鍔＄姸鎬侊細

```bash
bash check-services.sh
```

### fix-vnc.sh

鑷姩淇 VNC 杩炴帴闂锛?

```bash
bash fix-vnc.sh
```

### diagnose-supervisord.sh

璇婃柇 supervisord 閰嶇疆闂锛?

```bash
bash diagnose-supervisord.sh
```

## 馃寪 鍏充簬 noVNC SSL 璀﹀憡

濡傛灉娴忚鍣ㄦ樉绀猴細

```
noVNC requires a secure context (TLS). Expect crashes!
```

杩欏彧鏄鍛婏紝涓嶅奖鍝嶅姛鑳姐€傝В鍐虫柟妗堬細

### 鏂规 1锛歋SH 绔彛杞彂锛堟帹鑽愶級

鍦ㄦ湰鍦版墽琛岋細

```bash
ssh -L 6080:localhost:6080 -L 18888:localhost:18888 user@your-server
```

鐒跺悗璁块棶锛?

```
http://localhost:6080/vnc.html
```

### 鏂规 2锛氭祻瑙堝櫒璁剧疆锛堜粎鐢ㄤ簬寮€鍙戯級

**Chrome/Edge锛?*

1. 璁块棶 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 娣诲姞锛歚http://your-server-ip:6080`
3. 閲嶅惎娴忚鍣?

### 鏂规 3锛氶厤缃?HTTPS锛堢敓浜х幆澧冿級

鍙傝€?`docker/nginx.conf` 閰嶇疆 Nginx 鍙嶅悜浠ｇ悊 + Let's Encrypt銆?

## 馃摑 鏌ョ湅鏃ュ織

```bash
# 瀹炴椂鏃ュ織
docker compose logs -f bb-browser

# 鏈€杩?100 琛?
docker compose logs --tail=100 bb-browser

# 鐗瑰畾鏈嶅姟鐨勬棩蹇?
docker compose exec bb-browser supervisorctl tail -f x11vnc
docker compose exec bb-browser supervisorctl tail -f bb-daemon
```

## 馃攧 鏃ュ父缁存姢

### 淇敼閰嶇疆鍚?

```bash
# 缂栬緫閰嶇疆鏂囦欢
vim docker/supervisord.conf

# 杞崲鎹㈣绗︼紙濡傛灉鍦?Windows 涓婄紪杈戯級
sed -i 's/\r$//' docker/supervisord.conf

# 閲嶅惎瀹瑰櫒锛堥厤缃枃浠堕€氳繃 volume 鎸傝浇锛屼笉闇€瑕侀噸鏂版瀯寤猴級
docker compose restart bb-browser
```

### 鏇存柊浠ｇ爜鍚?

```bash
git pull
docker compose restart bb-browser
```

### 渚濊禆鍙樺寲鍚?

```bash
git pull
docker compose down
docker compose build
docker compose up -d
```

## 馃摎 鐩稿叧鏂囨。

- **VNC_TROUBLESHOOTING.md** - VNC 杩炴帴闂鎺掓煡鎸囧崡
- **DEPLOYMENT_SUMMARY.md** - 閮ㄧ讲鏂规鎬荤粨
- **SUPERVISORD_EXPLAINED.md** - supervisord 璇︾粏璇存槑
- **QUICK_FIX.md** - 蹇€熶慨澶嶆寚鍗?
- **VALIDATION_GUIDE.md** - 閰嶇疆鏂囦欢鏍￠獙鎸囧崡

## 馃帀 閮ㄧ讲瀹屾垚

濡傛灉鎵€鏈夋湇鍔￠兘鏄?`RUNNING` 鐘舵€侊紝鎭枩浣狅紝閮ㄧ讲鎴愬姛锛?

璁块棶锛?
- **noVNC**锛歨ttp://your-server:6080/vnc.html
- **API**锛歨ttp://your-server:18888

## 馃挕 鎻愮ず

1. **棣栨鍚姩闇€瑕佺瓑寰?30 绉?*锛岃鎵€鏈夋湇鍔″畬鍏ㄥ惎鍔?
2. **閰嶇疆鏂囦欢閫氳繃 volume 鎸傝浇**锛屼慨鏀瑰悗鍙渶 restart锛屼笉闇€瑕?rebuild
3. **鎵€鏈夎剼鏈娇鐢ㄨ嫳鏂囨敞閲?*锛岄伩鍏嶇紪鐮侀棶棰?
4. **鑷姩淇 CRLF**锛宔ntrypoint.sh 鍚姩鏃朵細鑷姩杞崲鎹㈣绗?

## 馃啒 闇€瑕佸府鍔╋紵

濡傛灉閬囧埌闂锛岃锛?

1. 杩愯 `bash check-services.sh` 妫€鏌ユ湇鍔＄姸鎬?
2. 鏌ョ湅鏃ュ織 `docker compose logs -f bb-browser`
3. 鏌ョ湅鐩稿叧鏂囨。锛堜笂闈㈠垪鍑虹殑锛?
4. 鎻愪氦 Issue 鍒?GitHub

---

**浠撳簱鍦板潃**锛歨ttps://github.com/skVPN/bb-browser-api.git
