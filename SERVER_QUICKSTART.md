# 服务器端快速启动指令

## 当前问题：turbo not found

你的容器启动时报错：
```
sh: 1: turbo: not found
ELIFECYCLE  Command failed.
```

---

## 快速修复（复制粘贴执行）

```bash
# 1. 进入项目目录
cd /home/ecs-user/bb-browser-api

# 2. 拉取最新代码（已包含修复）
git pull

# 3. 重启容器
docker compose restart bb-browser

# 4. 查看日志（等待构建完成）
docker compose logs -f bb-browser
```

---

## 预期输出

启动成功后，应该看到：

```
bb-browser  | ================================================
bb-browser  |  bb-browser 启动
bb-browser  |  noVNC 网页: http://<host>:6080/vnc.html
bb-browser  |  API:        http://<host>:18888
bb-browser  | ================================================
bb-browser  | [startup] 安装依赖（包括 devDependencies，用于构建）...
bb-browser  | [startup] 构建项目...
bb-browser  | [startup] 启动所有服务...
```

构建需要 2-5 分钟，请耐心等待。

---

## 验证服务

### 1. 访问 noVNC

打开浏览器访问：
```
http://<你的服务器IP>:6080/vnc.html
```

输入 VNC 密码（`docker-compose.yml` 中配置的 `VNC_PASSWORD`，默认 `changeme`）

### 2. 测试 API

```bash
curl http://localhost:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get",
    "method": "GET"
  }'
```

应该返回 JSON 响应。

### 3. 查看服务状态

```bash
docker compose exec bb-browser supervisorctl status
```

应该看到 6 个服务都是 RUNNING 状态：
- xvfb
- fluxbox
- x11vnc
- novnc
- chromium
- bb-daemon

---

## 如果还有问题

### 查看完整日志

```bash
docker compose logs bb-browser
```

### 查看单个服务日志

```bash
# 查看 bb-daemon 日志
docker compose exec bb-browser supervisorctl tail -f bb-daemon

# 查看 chromium 日志
docker compose exec bb-browser supervisorctl tail -f chromium
```

### 重启单个服务

```bash
# 重启 bb-daemon
docker compose exec bb-browser supervisorctl restart bb-daemon

# 重启 chromium
docker compose exec bb-browser supervisorctl restart chromium
```

### 完全重新开始

```bash
# 停止并删除容器
docker compose down

# 重新启动
docker compose up -d

# 查看日志
docker compose logs -f bb-browser
```

---

## 更多文档

- [快速部署指南](DEPLOY.md)
- [完整部署文档](docs/docker-deployment.md)
- [快速修复指南](QUICKFIX.md)
- [服务器命令参考](SERVER_COMMANDS.md)
