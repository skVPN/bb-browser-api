# 调试日志说明

## 新增的调试日志

从 v0.12.7 开始，`bb-browser-api daemon start` 会显示详细的启动日志，帮助诊断问题。

## 日志内容

### 1. 浏览器检测日志

```
[bb-browser] Searching for browser executable on Linux...
[bb-browser] Found browser at: /usr/bin/chromium
```

或者如果使用 `which` 命令：

```
[bb-browser] Searching for browser executable on Linux...
[bb-browser] No browser found in common paths, trying 'which' command...
[bb-browser] Found browser via 'which chromium': /usr/bin/chromium
```

如果找不到浏览器：

```
[bb-browser] Searching for browser executable on Linux...
[bb-browser] No browser found in common paths, trying 'which' command...
[bb-browser] No browser executable found
```

### 2. Chrome 启动命令

```
[bb-browser] Launching Chrome: /usr/bin/chromium --remote-debugging-port=19825 --user-data-dir=/root/.bb-browser/browser/user-data --no-first-run --no-default-browser-check --disable-sync --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter --disable-session-crashed-bubble --hide-crash-restore-bubble --use-mock-keychain --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu about:blank
```

如果启动失败：

```
[bb-browser] Failed to launch Chrome: spawn ENOENT
```

### 3. CDP 端点发现

```
[bb-browser] Discovering Chrome CDP endpoint...
[bb-browser] CDP endpoint found: 127.0.0.1:19825
```

或者使用自定义 CDP URL：

```
[bb-browser] Using custom CDP URL: http://127.0.0.1:9222
[bb-browser] CDP endpoint found: 127.0.0.1:9222
```

### 4. Daemon 启动

```
[bb-browser] Starting daemon: /usr/bin/node /app/dist/daemon.js --cdp-host 127.0.0.1 --cdp-port 19825
```

## 完整示例

### 成功启动

```bash
$ bb-browser-api daemon start

[bb-browser] Searching for browser executable on Linux...
[bb-browser] Found browser at: /usr/bin/chromium
[bb-browser] Launching Chrome: /usr/bin/chromium --remote-debugging-port=19825 --user-data-dir=/root/.bb-browser/browser/user-data --no-first-run --no-default-browser-check --disable-sync --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter --disable-session-crashed-bubble --hide-crash-restore-bubble --use-mock-keychain --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu about:blank
[bb-browser] Discovering Chrome CDP endpoint...
[bb-browser] CDP endpoint found: 127.0.0.1:19825
[bb-browser] Starting daemon: /usr/bin/node /app/dist/daemon.js --cdp-host 127.0.0.1 --cdp-port 19825

Daemon started successfully
```

### 使用自定义 CDP URL

```bash
$ bb-browser-api daemon start --cdp-url http://127.0.0.1:9222

[bb-browser] Using custom CDP URL: http://127.0.0.1:9222
[bb-browser] CDP endpoint found: 127.0.0.1:9222
[bb-browser] Starting daemon: /usr/bin/node /app/dist/daemon.js --cdp-host 127.0.0.1 --cdp-port 9222

Daemon started successfully
```

### 找不到浏览器

```bash
$ bb-browser-api daemon start

[bb-browser] Searching for browser executable on Linux...
[bb-browser] No browser found in common paths, trying 'which' command...
[bb-browser] No browser executable found

Error: bb-browser: Cannot find a Chromium-based browser.

Please do one of the following:
  1. Install Google Chrome, Edge, or Brave
  2. Start Chrome with: google-chrome --remote-debugging-port=19825
  3. Set BB_BROWSER_CDP_URL=http://host:port
  4. Use: bb-browser-api daemon start --cdp-url http://localhost:9222
```

## 在 Docker 中查看日志

### 方法 1：直接运行命令

```bash
docker compose exec bb-browser bb-browser-api daemon start
```

### 方法 2：查看 supervisord 日志

```bash
# 查看 bb-daemon 日志
docker compose exec bb-browser supervisorctl tail -f bb-daemon

# 查看 chromium 日志
docker compose exec bb-browser supervisorctl tail -f chromium
```

### 方法 3：查看容器日志

```bash
docker compose logs -f bb-browser
```

## 调试技巧

### 1. 验证 Chrome 启动命令

从日志中复制 Chrome 启动命令，手动运行测试：

```bash
docker compose exec bb-browser bash

# 复制日志中的命令，例如：
/usr/bin/chromium --remote-debugging-port=19825 --user-data-dir=/root/.bb-browser/browser/user-data --no-first-run --no-default-browser-check --disable-sync --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter --disable-session-crashed-bubble --hide-crash-restore-bubble --use-mock-keychain --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu about:blank
```

### 2. 检查 CDP 端口

```bash
# 等待几秒让 Chrome 启动
sleep 5

# 检查 CDP 端口
curl http://127.0.0.1:19825/json/version
```

### 3. 检查进程

```bash
# 检查 Chrome 进程
ps aux | grep chromium

# 检查端口监听
netstat -tlnp | grep 19825
```

## 常见问题

### Q1: 日志显示 "Running as root without --no-sandbox is not supported"

**A**: 这是 Chrome 的警告，但 `--no-sandbox` 参数已经添加。如果仍然失败，检查：

1. 是否有其他 Chrome 进程在运行
2. 是否有权限问题
3. 是否缺少依赖库

```bash
# 检查 Chrome 进程
ps aux | grep chromium

# 杀死旧进程
pkill chromium

# 重新启动
bb-browser-api daemon start
```

### Q2: 日志显示 "Failed to launch Chrome: spawn ENOENT"

**A**: 浏览器可执行文件不存在或没有执行权限：

```bash
# 检查文件
ls -lh /usr/bin/chromium

# 检查权限
chmod +x /usr/bin/chromium

# 检查是否是符号链接
readlink -f /usr/bin/chromium
```

### Q3: 没有看到任何日志

**A**: 可能是 stdio 被重定向了。尝试：

```bash
# 前台运行（不使用 supervisord）
docker compose exec bb-browser bash
bb-browser-api daemon stop
bb-browser-api daemon start
```

## 禁用日志

如果不需要详细日志，可以设置环境变量：

```yaml
# docker-compose.yml
environment:
  - BB_BROWSER_QUIET=true
```

或者重定向到文件：

```bash
bb-browser-api daemon start > /var/log/bb-browser.log 2>&1
```

## 相关文档

- [浏览器检测修复](browser-detection-fix.md)
- [快速修复指南](../QUICK_FIX_GUIDE.md)
- [部署文档](../DEPLOY.md)
