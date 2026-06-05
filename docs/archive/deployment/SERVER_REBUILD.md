# 服务器端重新构建指令

## 优化说明

现在依赖已经在 Dockerfile 中预安装，不需要每次启动都安装。

---

## 快速操作（复制粘贴执行）

```bash
# 1. 进入项目目录
cd /home/ecs-user/bb-browser-api

# 2. 拉取最新代码
git pull

# 3. 停止并删除旧容器和镜像
docker compose down
docker rmi bb-browser:latest

# 4. 重新构建镜像（依赖在这一步安装）
docker compose build

# 5. 启动服务
docker compose up -d

# 6. 查看日志
docker compose logs -f bb-browser
```

---

## 预期输出

### 构建阶段（5-10 分钟）

```
Step 1/15 : FROM debian:trixie-slim
Step 2/15 : ARG NODE_VERSION=20
...
Step 10/15 : RUN pnpm install --frozen-lockfile --prod=false
 ---> Running in xxx
Lockfile is up to date, resolution step is skipped
Packages: +500
Progress: resolved 500, reused 0, downloaded 500, added 500
Done in 5m 30s
...
Successfully built xxx
Successfully tagged bb-browser:latest
```

### 启动阶段（1-2 分钟）

```
bb-browser  | ================================================
bb-browser  |  bb-browser 启动
bb-browser  |  noVNC 网页: http://<host>:6080/vnc.html
bb-browser  |  API:        http://<host>:18888
bb-browser  | ================================================
bb-browser  | [startup] 构建项目...
bb-browser  | [startup] 启动所有服务...
```

**注意**：不再有 "安装依赖" 的输出，因为依赖已经在镜像中了！

---

## 验证

### 1. 检查镜像大小

```bash
docker images bb-browser:latest
```

应该看到镜像体积约 1-2 GB（包含 node_modules）

### 2. 访问 noVNC

```
http://<服务器IP>:6080/vnc.html
```

### 3. 测试 API

```bash
curl http://localhost:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get", "method": "GET"}'
```

### 4. 查看服务状态

```bash
docker compose exec bb-browser supervisorctl status
```

---

## 日常开发

### 修改代码后

```bash
# 只需重启容器（秒级）
docker compose restart bb-browser

# 查看日志
docker compose logs -f bb-browser
```

**不需要重新 build 镜像！**

### 更新依赖后

```bash
# 修改 package.json 后，需要重新构建镜像
docker compose build
docker compose up -d
```

---

## 优势

| 操作 | 之前 | 现在 |
|------|------|------|
| 首次启动 | 5-10 分钟（安装依赖） | 1-2 分钟（只构建项目） |
| 改代码重启 | 1-2 分钟 | 1-2 分钟 |
| 更新依赖 | 5-10 分钟 | 5-10 分钟（重新 build） |
| 网络依赖 | 高（每次启动） | 低（只在 build 时） |

---

## 故障排查

### 问题 1：构建时报错 "turbo: not found"

**不会再出现**，因为依赖已经在 Dockerfile 中安装了！

### 问题 2：构建很慢

```bash
# 使用国内镜像加速
# 已经在 Dockerfile 中配置了 npmmirror.com
```

### 问题 3：依赖没有更新

```bash
# 强制重新构建（不使用缓存）
docker compose build --no-cache
```

### 问题 4：查看构建日志

```bash
# 保存构建日志
docker compose build 2>&1 | tee build.log
```

---

## 清理

### 删除旧镜像

```bash
# 查看所有镜像
docker images

# 删除旧的 bb-browser 镜像
docker rmi bb-browser:latest

# 删除悬空镜像
docker image prune -f
```

### 完全清理

```bash
# 停止并删除所有
docker compose down -v

# 删除镜像
docker rmi bb-browser:latest

# 删除构建缓存
docker builder prune -f
```

---

## 监控

### 查看镜像层

```bash
docker history bb-browser:latest
```

### 查看容器资源

```bash
docker stats bb-browser
```

### 查看 node_modules

```bash
# 进入容器
docker compose exec bb-browser bash

# 查看 node_modules
ls -lh /app/node_modules | head -20

# 查看 turbo 是否存在
ls -la /app/node_modules/.bin/turbo
```

---

## 总结

**关键变化**：
- ✅ 依赖在 Dockerfile 中预安装
- ✅ 首次启动快（1-2 分钟）
- ✅ 不再有 "turbo: not found" 错误
- ✅ 启动稳定（不依赖网络）

**注意事项**：
- 更新依赖需要重新 build 镜像
- 镜像体积变大（1-2 GB）
- 宿主机的 node_modules 不影响容器
