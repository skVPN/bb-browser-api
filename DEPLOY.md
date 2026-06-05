# 快速部署指南

## 前置条件

- 已安装 Docker
- 服务器开放端口：6080（noVNC）、18888（API）

---

## 步骤 1: 安装 docker-compose v2

### 快速安装（推荐）

```bash
# 下载并运行安装脚本
curl -fsSL https://raw.githubusercontent.com/skVPN/bb-browser-api/main/install-docker-compose-v2.sh | sudo bash
```

### 手动安装

```bash
# 方法 A: 通过 apt（Ubuntu/Debian）
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 方法 B: 直接下载二进制
COMPOSE_VERSION="v2.24.5"
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose
```

### 验证安装

```bash
docker compose version
# 输出应该是 v2.x.x（不是 v1.x.x）
```

---

## 步骤 2: 克隆代码

```bash
cd /home/ecs-user
git clone https://github.com/skVPN/bb-browser-api.git
cd bb-browser-api
```

---

## 步骤 3: 配置（可选）

编辑 `docker-compose.yml`：

```yaml
environment:
  # VNC 密码（留空则不需要密码）
  VNC_PASSWORD: "your-secure-password"
  
  # 屏幕分辨率
  SCREEN_WIDTH: "1280"
  SCREEN_HEIGHT: "900"
```

---

## 步骤 4: 构建和启动

```bash
# 构建镜像（首次需要 5-10 分钟）
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

---

## 步骤 5: 访问服务

### noVNC 网页访问

打开浏览器访问：
```
http://<服务器IP>:6080/vnc.html
```

输入 VNC 密码（如果配置了），即可看到 Chrome 浏览器画面。

### API 测试

```bash
curl http://<服务器IP>:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get",
    "method": "GET"
  }'
```

---

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f bb-browser

# 重启服务
docker compose restart bb-browser

# 停止服务
docker compose down

# 进入容器调试
docker compose exec bb-browser bash
```

---

## 代码更新

代码通过 volume 挂载，改代码后不需要重新 build 镜像：

```bash
# 方法 1: 在宿主机上改代码，然后重启容器
git pull
docker compose restart bb-browser

# 方法 2: 在容器内重新构建
docker compose exec bb-browser sh -c "cd /app && pnpm build"
docker compose restart bb-browser
```

---

## 故障排查

### 问题 1: docker-compose 报错 `KeyError: 'id'`

**原因**：使用了旧版本 docker-compose v1

**解决**：升级到 v2（见步骤 1）

### 问题 2: 构建时 apt-get update 很慢

**原因**：网络问题

**解决**：已配置中科大镜像源，如果还是慢可以换其他源：

编辑 `Dockerfile`，修改这一行：
```dockerfile
printf 'Types: deb\nURIs: http://mirrors.aliyun.com/debian\n...'
```

### 问题 3: noVNC 页面打不开

**检查**：
```bash
# 查看容器是否运行
docker compose ps

# 查看日志
docker compose logs bb-browser

# 检查端口是否监听
netstat -tlnp | grep 6080
```

### 问题 4: API 返回 502

**原因**：bb-browser daemon 未启动

**检查**：
```bash
# 进入容器
docker compose exec bb-browser bash

# 查看 supervisord 状态
supervisorctl status

# 查看 bb-daemon 日志
supervisorctl tail -f bb-daemon
```

### 问题 5: daemon 启动失败，提示 "Cannot find a Chromium-based browser"

**症状**：
```
bb-browser: Cannot find a Chromium-based browser.
Please do one of the following:
  1. Install Google Chrome, Edge, or Brave
  2. Start Chrome with: google-chrome --remote-debugging-port=19825
  3. Set BB_BROWSER_CDP_URL=http://host:port
  4. Use: bb-browser-api daemon start --cdp-url http://localhost:9222
```

**原因**：浏览器检测逻辑未找到已安装的 Chromium

**解决方案**：

1. **运行诊断脚本**（推荐）：
```bash
# 进入容器
docker compose exec bb-browser bash

# 运行诊断
bash /diagnose-browser.sh
```

2. **手动检查浏览器**：
```bash
# 检查 chromium 是否存在
which chromium
ls -lh /usr/bin/chromium

# 检查 CDP 端口是否可访问
curl http://127.0.0.1:9222/json/version
```

3. **使用环境变量指定 CDP URL**：
编辑 `docker-compose.yml`，添加：
```yaml
environment:
  - BB_BROWSER_CDP_URL=http://127.0.0.1:9222
```

4. **重启服务**：
```bash
docker compose restart
```

**注意**：v0.12.6-1 及以上版本已修复此问题，优先检查 `/usr/bin/chromium` 路径。

---

## 性能优化

### 1. 减小镜像体积

默认不安装中文字体（节省 100MB+），如果需要中文网页支持：

编辑 `Dockerfile`，取消注释：
```dockerfile
fonts-noto-cjk \
fonts-liberation \
```

### 2. 调整资源限制

编辑 `docker-compose.yml`：
```yaml
services:
  bb-browser:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 安全建议

1. **修改 VNC 密码**：不要使用默认密码
2. **配置防火墙**：只开放必要端口
3. **使用反向代理**：添加 HTTPS 和访问控制
4. **定期更新**：`git pull && docker compose restart`

---

## 更多文档

- [完整部署文档](docs/docker-deployment.md)
- [API 文档](docs/api-fetch.zh-CN.md)
- [开发指南](DEVELOPMENT.md)

---

## 问题反馈

- GitHub Issues: https://github.com/skVPN/bb-browser-api/issues
- 原项目: https://github.com/zed-io/bb-browser
