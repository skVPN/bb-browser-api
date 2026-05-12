# Docker 部署指南

## 架构说明

容器内运行三个进程，由 `supervisord` 统一管理：

```
容器
├── supervisord (PID 1 via tini)
│   ├── chromium --headless=new --remote-debugging-port=9222
│   └── node dist/daemon.js --host 0.0.0.0 --port 18888 --cdp-port 9222
└── [可选] 你的 Python 业务代码
```

**为什么用 supervisord？**  
Chromium 和 daemon 需要同时运行，supervisord 负责：
- 按顺序启动（先 Chromium，再 daemon）
- 任一进程崩溃时自动重启
- 统一管理日志输出

## 快速开始

### 方式一：docker-compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f bb-browser

# 测试 API
curl http://localhost:18888/status

# 停止
docker-compose down
```

### 方式二：docker build + run

```bash
# 构建镜像
docker build -t bb-browser:latest .

# 运行
docker run -d \
  --name bb-browser \
  -p 18888:18888 \
  --shm-size=256m \
  --cap-add=SYS_ADMIN \
  --security-opt seccomp=unconfined \
  -v chrome-profile:/data/chrome-profile \
  -v bb-browser-data:/data/bb-browser \
  bb-browser:latest

# 查看状态
docker logs -f bb-browser
```

## 使用 API

daemon 启动后，在宿主机直接调用：

```bash
# 检查状态
curl http://localhost:18888/status

# Fetch API（在浏览器上下文中执行请求）
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'

# 抓包 API
curl "http://localhost:18888/api/capture?url=https://example.com&pattern=api"

# 存储 API（读取 Cookie）
curl "http://localhost:18888/api/storage?domain=example.com"
```

## 在容器内运行 Python 脚本

如果你的 Python 代码需要调用 bb-browser API：

```bash
# 方式一：exec 进入容器
docker exec -it bb-browser python3 -c "
import requests
resp = requests.post('http://127.0.0.1:18888/api/fetch',
    json={'url': 'https://httpbin.org/get'})
print(resp.json())
"

# 方式二：在 entrypoint 中运行（修改 docker-compose.yml 的 command）
# command: python /app/your_script.py
```

## 持久化登录态

Chrome 用户数据（Cookie、登录态）存储在 `chrome-profile` volume 中。

```bash
# 查看 volume
docker volume inspect bb-browser_chrome-profile

# 备份
docker run --rm \
  -v bb-browser_chrome-profile:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/chrome-profile.tar.gz -C /data .

# 恢复
docker run --rm \
  -v bb-browser_chrome-profile:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/chrome-profile.tar.gz -C /data
```

## 常见问题

### Chromium 启动失败

```
错误：Running as root without --no-sandbox is not supported
```

解决：Dockerfile 中已加入 `--no-sandbox`，或在 docker-compose.yml 中添加：
```yaml
cap_add:
  - SYS_ADMIN
```

### /dev/shm 不足

```
错误：[0000/000000.000000:FATAL:memory.cc] Out of memory
```

解决：增大 shm_size：
```yaml
shm_size: "512mb"
```

### daemon 连接 CDP 超时

检查 Chromium 是否正常启动：
```bash
docker exec bb-browser curl -s http://127.0.0.1:9222/json/version
```

### 端口冲突

修改 docker-compose.yml 中的端口映射：
```yaml
ports:
  - "18889:18888"  # 宿主机 18889 → 容器 18888
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BB_DAEMON_PORT` | `18888` | daemon HTTP 端口 |
| `BB_CDP_PORT` | `9222` | Chrome CDP 端口 |
| `BB_BROWSER_HOME` | `/data/bb-browser` | 数据目录 |
| `CDP_TIMEOUT` | `30` | 等待 CDP 就绪的超时秒数 |

## 镜像大小优化

当前镜像包含完整 Chromium，体积约 800MB~1GB。如需减小：

1. **使用多阶段构建**：构建阶段用完整镜像，运行阶段只复制 `dist/`
2. **使用外部 Chrome**：不在容器内安装 Chromium，通过 `--cdp-host` 连接宿主机的 Chrome
3. **使用 chrome-headless-shell**：比完整 Chromium 小约 30%

### 连接宿主机 Chrome（最小化方案）

```bash
# 宿主机启动 Chrome（开启远程调试）
google-chrome --remote-debugging-port=9222 --headless=new &

# 容器只运行 daemon，连接宿主机 Chrome
docker run -d \
  --name bb-daemon-only \
  -p 18888:18888 \
  --add-host=host.docker.internal:host-gateway \
  -e BB_CDP_HOST=host.docker.internal \
  -e BB_CDP_PORT=9222 \
  bb-browser:latest \
  node /app/dist/daemon.js \
    --host 0.0.0.0 \
    --port 18888 \
    --cdp-host host.docker.internal \
    --cdp-port 9222
```
