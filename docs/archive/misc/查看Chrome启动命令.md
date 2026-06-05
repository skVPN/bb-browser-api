# 如何查看 Chrome 启动命令

## 问题

用户想知道 `bb-browser-api daemon start` 启动 Chrome 时使用的完整命令。

## 解决方案

从 v0.12.7 开始，daemon 启动时会自动显示 Chrome 启动命令。

## 使用方法

### 在 Docker 容器中

```bash
# 方法 1：直接运行（推荐）
docker compose exec bb-browser bb-browser-api daemon start

# 方法 2：进入容器后运行
docker compose exec bb-browser bash
bb-browser-api daemon start
```

### 输出示例

```
[bb-browser] Searching for browser executable on Linux...
[bb-browser] Found browser at: /usr/bin/chromium
[bb-browser] Launching Chrome: /usr/bin/chromium --remote-debugging-port=19825 --user-data-dir=/root/.bb-browser/browser/user-data --no-first-run --no-default-browser-check --disable-sync --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter --disable-session-crashed-bubble --hide-crash-restore-bubble --use-mock-keychain --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu about:blank
[bb-browser] Discovering Chrome CDP endpoint...
[bb-browser] CDP endpoint found: 127.0.0.1:19825
[bb-browser] Starting daemon: /usr/bin/node /app/dist/daemon.js --cdp-host 127.0.0.1 --cdp-port 19825
```

## 提取启动命令

从日志中找到以 `[bb-browser] Launching Chrome:` 开头的行，后面就是完整的启动命令。

### 示例命令

```bash
/usr/bin/chromium \
  --remote-debugging-port=19825 \
  --user-data-dir=/root/.bb-browser/browser/user-data \
  --no-first-run \
  --no-default-browser-check \
  --disable-sync \
  --disable-background-networking \
  --disable-component-update \
  --disable-features=Translate,MediaRouter \
  --disable-session-crashed-bubble \
  --hide-crash-restore-bubble \
  --use-mock-keychain \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  about:blank
```

## 手动测试启动命令

复制日志中的命令，手动运行测试：

```bash
# 进入容器
docker compose exec bb-browser bash

# 停止现有的 Chrome 进程
pkill chromium

# 手动运行启动命令（从日志复制）
/usr/bin/chromium --remote-debugging-port=19825 --user-data-dir=/root/.bb-browser/browser/user-data --no-first-run --no-default-browser-check --disable-sync --disable-background-networking --disable-component-update --disable-features=Translate,MediaRouter --disable-session-crashed-bubble --hide-crash-restore-bubble --use-mock-keychain --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu about:blank &

# 等待几秒
sleep 5

# 检查 CDP 端口
curl http://127.0.0.1:19825/json/version
```

## 查看 supervisord 管理的 Chrome

如果 Chrome 由 supervisord 管理（Docker 容器中的默认方式）：

```bash
# 查看 Chrome 进程状态
docker compose exec bb-browser supervisorctl status chromium

# 查看 Chrome 日志
docker compose exec bb-browser supervisorctl tail -f chromium

# 重启 Chrome
docker compose exec bb-browser supervisorctl restart chromium
```

## 常见参数说明

| 参数 | 说明 |
|------|------|
| `--remote-debugging-port=19825` | CDP 调试端口 |
| `--user-data-dir=/root/.bb-browser/browser/user-data` | 用户数据目录 |
| `--no-sandbox` | 禁用沙箱（root 用户必需） |
| `--disable-setuid-sandbox` | 禁用 setuid 沙箱 |
| `--disable-dev-shm-usage` | 禁用 /dev/shm（Docker 中推荐） |
| `--disable-gpu` | 禁用 GPU 加速 |
| `--headless=new` | 无头模式（无 DISPLAY 时自动添加） |

## 修改启动参数

如果需要修改 Chrome 启动参数，编辑 `docker/start-chromium.sh`：

```bash
exec chromium \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --remote-debugging-address=0.0.0.0 \
    --remote-debugging-port="${BB_CDP_PORT}" \
    --user-data-dir=/data/chrome-profile \
    # 在这里添加自定义参数
    --your-custom-flag \
    about:blank
```

然后重启容器：

```bash
docker compose restart
```

## 故障排查

### 问题 1：看不到日志

**原因**：stdio 被重定向

**解决**：
```bash
# 停止 daemon
docker compose exec bb-browser bb-browser-api daemon stop

# 前台运行
docker compose exec bb-browser bb-browser-api daemon start
```

### 问题 2：Chrome 启动失败

**症状**：日志显示 "Failed to launch Chrome"

**解决**：
```bash
# 检查浏览器文件
docker compose exec bb-browser ls -lh /usr/bin/chromium

# 检查权限
docker compose exec bb-browser chmod +x /usr/bin/chromium

# 手动测试启动
docker compose exec bb-browser /usr/bin/chromium --version
```

### 问题 3：CDP 端口不可访问

**症状**：Chrome 启动了但 CDP 端口连接失败

**解决**：
```bash
# 检查端口监听
docker compose exec bb-browser netstat -tlnp | grep 19825

# 检查防火墙
docker compose exec bb-browser iptables -L

# 测试连接
docker compose exec bb-browser curl http://127.0.0.1:19825/json/version
```

## 相关文档

- [调试日志说明](docs/debug-logging.md)
- [浏览器检测修复](docs/browser-detection-fix.md)
- [快速修复指南](QUICK_FIX_GUIDE.md)
- [部署文档](DEPLOY.md)
