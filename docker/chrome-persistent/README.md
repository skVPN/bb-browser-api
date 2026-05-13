# 常驻 Chrome Docker 方案

## 问题

Browserless 的 Chrome 不是常驻的，每次请求时才启动，用完就关闭。

## 解决方案

### 方案 1: Selenium（推荐）

```bash
# 启动常驻 Chrome + VNC
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --name chrome-persistent \
  selenium/standalone-chrome:latest
```

**特点**：
- ✅ Chrome 常驻运行
- ✅ 有 VNC 界面（http://localhost:7900，密码：secret）
- ✅ CDP 端口始终可用
- ✅ 开箱即用

**使用**：
```bash
# 连接
bb-browser-api daemon start --cdp-url http://localhost:9222

# 操作
bb-browser-api open https://example.com
```

---

### 方案 2: 自定义 Docker 镜像

#### 使用 Dockerfile

```bash
# 构建镜像
docker build -t chrome-persistent .

# 运行
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --name chrome \
  chrome-persistent
```

#### 使用 Docker Compose

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down
```

---

### 方案 3: 直接使用 zenika/alpine-chrome

```bash
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --name chrome-persistent \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --disable-gpu \
  about:blank
```

**特点**：
- ✅ Chrome 常驻运行
- ✅ 轻量级（Alpine Linux）
- ❌ 没有 VNC 界面

---

### 方案 4: 使用 browserless/chrome（常驻模式）

Browserless 也支持常驻模式，需要配置：

```bash
docker run -d -p 3000:3000 -p 9222:9222 \
  --name browserless \
  -e "PREBOOT_CHROME=true" \
  -e "KEEP_ALIVE=true" \
  -e "CONNECTION_TIMEOUT=-1" \
  browserless/chrome:latest
```

**环境变量说明**：
- `PREBOOT_CHROME=true` - 预启动 Chrome
- `KEEP_ALIVE=true` - 保持连接
- `CONNECTION_TIMEOUT=-1` - 永不超时

---

## 方案对比

| 方案 | 常驻 | VNC | 轻量 | 推荐度 |
|------|------|-----|------|--------|
| Selenium | ✅ | ✅ | ❌ | ⭐⭐⭐⭐⭐ |
| zenika/alpine-chrome | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Browserless（配置） | ✅ | ✅ | ❌ | ⭐⭐⭐ |
| 自定义镜像 | ✅ | ❌ | ✅ | ⭐⭐⭐ |

---

## 推荐配置

### 开发环境（需要可视化）

```bash
# Selenium + VNC
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  --name chrome-dev \
  selenium/standalone-chrome:latest
```

### 生产环境（轻量级）

```bash
# Alpine Chrome
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  --name chrome-prod \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --disable-gpu \
  about:blank
```

---

## 验证 Chrome 是否常驻

```bash
# 检查容器状态
docker ps

# 检查 CDP 端点
curl http://localhost:9222/json/version

# 应该返回 Chrome 版本信息，说明 Chrome 正在运行
```

---

## 连接 bb-browser-api

```bash
# 启动 daemon
bb-browser-api daemon start --cdp-url http://localhost:9222

# 检查状态
bb-browser-api daemon status

# 使用
bb-browser-api open https://github.com
bb-browser-api get text
```

---

## 常见问题

### Q: Chrome 启动后立即退出？

A: 增加 `--shm-size`：
```bash
docker run -d --shm-size="4g" ...
```

### Q: 如何查看 Chrome 日志？

A: 
```bash
docker logs chrome-persistent
```

### Q: 如何重启 Chrome？

A:
```bash
docker restart chrome-persistent
```

### Q: 如何保存 Chrome 数据？

A: 使用 volume：
```bash
docker run -d -p 9222:9222 \
  -v chrome-data:/data \
  --shm-size="2g" \
  zenika/alpine-chrome \
  --user-data-dir=/data \
  ...
```

---

## 性能优化

### 1. 增加共享内存

```bash
--shm-size="4g"
```

### 2. 禁用不需要的功能

```bash
--disable-extensions \
--disable-plugins \
--disable-images \
--disable-javascript  # 如果不需要 JS
```

### 3. 限制资源

```bash
docker run -d \
  --cpus="2" \
  --memory="2g" \
  --shm-size="2g" \
  ...
```

---

## 安全建议

1. **不要暴露到公网**
   ```bash
   # 只监听本地
   -p 127.0.0.1:9222:9222
   ```

2. **使用防火墙**
   ```bash
   iptables -A INPUT -p tcp --dport 9222 -s 192.168.1.0/24 -j ACCEPT
   iptables -A INPUT -p tcp --dport 9222 -j DROP
   ```

3. **定期重启**
   ```bash
   # 每天凌晨 3 点重启
   0 3 * * * docker restart chrome-persistent
   ```

---

## 总结

**最推荐的方案**：

```bash
# 开发环境（需要看到界面）
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  selenium/standalone-chrome:latest

# 生产环境（轻量级）
docker run -d -p 9222:9222 \
  --shm-size="2g" \
  --restart unless-stopped \
  zenika/alpine-chrome \
  --no-sandbox \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  about:blank
```

**连接**：
```bash
bb-browser-api daemon start --cdp-url http://localhost:9222
```

**Chrome 会一直运行，不会自动关闭！** ✅
