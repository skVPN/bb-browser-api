# bb-browser-api Chrome 路径发现机制

## 默认 Chrome 查找路径

`bb-browser-api daemon start` 会按照以下顺序查找 Chrome 浏览器：

### Windows 系统

按顺序查找以下路径：

1. `C:\Program Files\Google\Chrome\Application\chrome.exe`
2. `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
3. `%LOCALAPPDATA%\Google\Chrome Dev\Application\chrome.exe`
4. `%LOCALAPPDATA%\Google\Chrome SxS\Application\chrome.exe` (Canary)
5. `%LOCALAPPDATA%\Google\Chrome Beta\Application\chrome.exe`
6. `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
7. `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
8. `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`

### macOS 系统

按顺序查找以下路径：

1. `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
2. `/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev`
3. `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`
4. `/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta`
5. `/Applications/Arc.app/Contents/MacOS/Arc`
6. `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`
7. `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`

### Linux 系统

使用 `which` 命令按顺序查找：

1. `google-chrome`
2. `google-chrome-stable`
3. `chromium-browser`
4. `chromium`

实际路径示例：
- `/usr/bin/google-chrome`
- `/usr/bin/chromium-browser`
- `/snap/bin/chromium`

## CDP 端口发现优先级

`bb-browser-api daemon start` 按以下优先级查找 CDP 端点：

### 1. 环境变量（最高优先级）

```bash
export BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start
```

### 2. 命令行参数

```bash
bb-browser-api daemon start http://localhost:9222
# 或
bb-browser-api daemon start --cdp-url http://localhost:9222
# 或
bb-browser-api --port 9222 tab list
```

### 3. 已管理的浏览器

检查 `~/.bb-browser/browser/cdp-port` 文件，如果存在且可连接，使用该端口。

### 4. 文件缓存

检查 `/tmp/bb-browser-cdp-cache.json`（30秒有效期）

### 5. OpenClaw（如果使用 --openclaw 参数）

```bash
bb-browser-api --openclaw tab list
```

### 6. 自动启动浏览器（默认行为）

如果以上都不可用，自动启动 Chrome：

**启动参数：**
```bash
chrome.exe \
  --remote-debugging-port=19825 \
  --user-data-dir=%USERPROFILE%\.bb-browser\browser\user-data \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --disable-background-networking \
  --disable-component-update \
  --disable-features=Translate,MediaRouter \
  --disable-session-crashed-bubble \
  --hide-crash-restore-bubble \
  --use-mock-keychain \
  about:blank
```

**默认端口：** `19825`

**用户数据目录：**
- Windows: `%USERPROFILE%\.bb-browser\browser\user-data`
- macOS/Linux: `~/.bb-browser/browser/user-data`

**端口记录文件：**
- Windows: `%USERPROFILE%\.bb-browser\browser\cdp-port`
- macOS/Linux: `~/.bb-browser/browser/cdp-port`

### 7. OpenClaw 自动检测（最后尝试）

如果没有使用 `--openclaw` 参数，最后会尝试自动检测 OpenClaw。

## 如何指定自定义 Chrome 路径

### 方法 1：使用已运行的 Chrome

如果你已经手动启动了 Chrome（带 CDP 端口），直接指定端口：

```bash
# 手动启动 Chrome
chrome.exe --remote-debugging-port=9222

# 连接到该 Chrome
bb-browser-api daemon start http://localhost:9222
```

### 方法 2：使用环境变量

```bash
# Linux/macOS
export BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start

# Windows PowerShell
$env:BB_BROWSER_CDP_URL="http://localhost:9222"
bb-browser-api daemon start

# Windows CMD
set BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start
```

### 方法 3：连接到 Docker 容器中的 Chrome

```bash
# 启动 Chrome 容器
docker run -d -p 9222:9222 zenika/alpine-chrome --remote-debugging-port=9222

# 连接
bb-browser-api daemon start http://localhost:9222
```

### 方法 4：连接到远程 Chrome

```bash
bb-browser-api daemon start http://192.168.1.100:9222
```

## 查看当前使用的 Chrome

```bash
# 查看 daemon 状态
bb-browser-api daemon status

# 输出示例：
# Daemon running: yes
# CDP connected:  yes
# CDP URL:        http://127.0.0.1:19825  ← 这里显示当前连接的 CDP URL
# Uptime:         5s
```

## 常见问题

### Q: 如何知道 Chrome 是否被自动启动？

查看进程：

```bash
# Windows
tasklist | findstr chrome

# Linux/macOS
ps aux | grep chrome
```

查看用户数据目录：

```bash
# Windows
dir %USERPROFILE%\.bb-browser\browser

# Linux/macOS
ls -la ~/.bb-browser/browser
```

### Q: 如何停止自动启动的 Chrome？

```bash
# 停止 daemon（不会关闭 Chrome）
bb-browser-api daemon shutdown

# 手动关闭 Chrome
# Windows
taskkill /F /IM chrome.exe

# Linux/macOS
pkill -f "chrome.*remote-debugging-port"
```

### Q: 如何使用不同的 Chrome 配置文件？

自动启动的 Chrome 使用独立的配置文件（`~/.bb-browser/browser/user-data`），不会影响你的主 Chrome 配置。

如果想使用自己的配置文件，需要手动启动 Chrome：

```bash
# 使用自定义配置文件启动 Chrome
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\MyProfile"

# 连接
bb-browser-api daemon start http://localhost:9222
```

### Q: 为什么找不到 Chrome？

1. 确认 Chrome 已安装
2. 检查安装路径是否在上面列出的路径中
3. 如果安装在自定义路径，手动启动 Chrome 并指定 CDP URL

```bash
# 手动启动 Chrome（替换为你的实际路径）
"D:\CustomPath\chrome.exe" --remote-debugging-port=9222

# 连接
bb-browser-api daemon start http://localhost:9222
```

## 调试

查看 daemon 日志：

```bash
# 查看 daemon 进程
# Windows
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Linux
ps aux | grep daemon

# 查看 daemon 配置
cat ~/.bb-browser/daemon.json
```
