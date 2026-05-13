# 常驻 Chrome 方案速查

## 问题

Browserless 的 Chrome 不是常驻的，每次请求时才启动。

## 解决方案

### 🥇 方案 1: Selenium（最推荐）

```bash
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  --name chrome \
  selenium/standalone-chrome:latest
```

**优点**：
- ✅ Chrome 常驻运行
- ✅ 有 VNC 界面（http://localhost:7900，密码：secret）
- ✅ 开箱即用

---

### 🥈 方案 2: Alpine Chrome（轻量级）

```bash
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  --name chrome \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --disable-gpu \
  about:blank
```

**优点**：
- ✅ Chrome 常驻运行
- ✅ 轻量级（Alpine Linux）
- ❌ 没有 VNC 界面

---

### 🥉 方案 3: Browserless（常驻模式）

```bash
docker run -d -p 3000:3000 -p 9222:9222 \
  --name browserless \
  -e "PREBOOT_CHROME=true" \
  -e "KEEP_ALIVE=true" \
  -e "CONNECTION_TIMEOUT=-1" \
  browserless/chrome:latest
```

**优点**：
- ✅ Chrome 常驻运行
- ✅ 有 Web UI（http://localhost:3000）
- ✅ 功能强大

---

## 验证 Chrome 是否常驻

```bash
# 检查容器状态
docker ps

# 检查 CDP 端点（应该立即返回）
curl http://localhost:9222/json/version
```

如果返回 Chrome 版本信息，说明 Chrome 正在常驻运行！

---

## 连接 bb-browser-api

```bash
# 启动 daemon
bb-browser-api daemon start --cdp-url http://localhost:9222

# 使用
bb-browser-api open https://github.com
bb-browser-api get text
bb-browser-api screenshot
```

---

## 快速对比

| 方案 | 常驻 | VNC | 大小 | 推荐 |
|------|------|-----|------|------|
| Selenium | ✅ | ✅ | 大 | ⭐⭐⭐⭐⭐ |
| Alpine Chrome | ✅ | ❌ | 小 | ⭐⭐⭐⭐ |
| Browserless | ✅ | ✅ | 大 | ⭐⭐⭐ |

---

## 推荐配置

### 开发环境（需要看界面）

```bash
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  selenium/standalone-chrome:latest
```

### 生产环境（轻量级）

```bash
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  zenika/alpine-chrome \
  --no-sandbox \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  about:blank
```

---

## 完整示例

```bash
# 1. 启动常驻 Chrome
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  --name chrome \
  selenium/standalone-chrome:latest

# 2. 验证 Chrome 正在运行
curl http://localhost:9222/json/version

# 3. 连接 bb-browser-api
bb-browser-api daemon start --cdp-url http://localhost:9222

# 4. 使用（Chrome 会一直运行）
bb-browser-api open https://github.com
bb-browser-api get text

# 5. 在浏览器中查看（可选）
# 访问：http://localhost:7900
# 密码：secret
```

---

## 常见问题

### Q: 如何确认 Chrome 是常驻的？

A: 运行多次请求，Chrome 不会重启：
```bash
bb-browser-api open https://example.com
bb-browser-api open https://github.com
# Chrome 不会重启，会复用同一个实例
```

### Q: Chrome 占用内存太多？

A: 限制资源：
```bash
docker run -d \
  --cpus="2" \
  --memory="2g" \
  --shm-size="2g" \
  ...
```

### Q: 如何重启 Chrome？

A:
```bash
docker restart chrome
```

---

## 详细文档

查看完整文档：[docker/chrome-persistent/README.md](docker/chrome-persistent/README.md)

---

**现在 Chrome 会一直运行，不会自动关闭了！** ✅
