# Docker 部署指南

## 问题诊断

### 1. docker-compose v1 的 KeyError: 'id' bug

**症状**：
```
KeyError: 'id'
Exception in thread Thread-4 (watch_events)
```

**原因**：docker-compose v1（Python 版本）的已知 bug

**解决方案**：升级到 docker-compose v2（Go 版本）

---

## 安装 docker-compose v2

### 方法 1：通过 Docker CLI Plugin（推荐）

```bash
# Ubuntu/Debian
# 1. 更新 Docker 仓库配置
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 2. 添加 Docker 官方 GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. 添加 Docker 仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. 安装 docker-compose-plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 5. 验证安装
docker compose version
```

### 方法 2：直接下载二进制（适用于任何 Linux）

```bash
# 1. 下载最新版本（替换 v2.24.5 为最新版本号）
COMPOSE_VERSION="v2.24.5"
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

# 2. 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 3. 创建软链接（让 docker compose 命令可用）
sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose

# 4. 验证安装
docker compose version
```

### 方法 3：使用国内镜像加速（如果 GitHub 下载慢）

```bash
# 使用 ghproxy 镜像
COMPOSE_VERSION="v2.24.5"
sudo curl -L "https://ghproxy.com/https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose
docker compose version
```

---

## 卸载旧版本 docker-compose v1

```bash
# 如果是通过 pip 安装的
sudo pip uninstall docker-compose

# 如果是通过 apt 安装的
sudo apt-get remove docker-compose

# 删除旧的二进制文件
sudo rm -f /usr/bin/docker-compose
```

---

## 构建和运行

### 1. 构建镜像

```bash
cd /home/ecs-user/bb-browser-api

# 使用 docker compose v2（注意是空格不是横杠）
docker compose build
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 只看 bb-browser 服务
docker compose logs -f bb-browser
```

### 4. 停止服务

```bash
docker compose down
```

### 5. 重启服务（代码改动后）

```bash
# 代码通过 volume 挂载，改代码后只需重启容器，不需要重新 build
docker compose restart bb-browser
```

---

## 访问服务

### 1. noVNC 网页访问

打开浏览器访问：
```
http://<服务器IP>:6080/vnc.html
```

**VNC 密码**：在 `docker-compose.yml` 中配置的 `VNC_PASSWORD`（默认 `changeme`）

### 2. bb-browser HTTP API

```bash
# 测试 API 是否正常
curl http://<服务器IP>:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get",
    "method": "GET"
  }'
```

---

## 常见问题

### Q1: 构建时报错 `turbo: not found`

**症状**：
```
sh: 1: turbo: not found
ELIFECYCLE  Command failed.
```

**原因**：`pnpm install --frozen-lockfile` 默认不安装 devDependencies，但 `turbo` 在 devDependencies 中

**解决方案 1（推荐）**：修改 `docker/entrypoint.sh`

```bash
# 在服务器上执行
cd /home/ecs-user/bb-browser-api

# 修改 entrypoint.sh
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

# 重启容器
docker compose restart bb-browser

# 查看日志
docker compose logs -f bb-browser
```

**解决方案 2**：手动在容器内安装

```bash
# 进入容器
docker compose exec bb-browser bash

# 安装所有依赖
cd /app
pnpm install --prod=false

# 构建
pnpm build

# 退出容器
exit

# 重启服务
docker compose restart bb-browser
```

### Q2: 构建时 apt-get update 很慢

**A**: 已经配置了中科大镜像源（http 协议避免 SSL 证书问题）

### Q3: 需要中文字体支持

**A**: 编辑 `Dockerfile`，取消注释 `fonts-noto-cjk`：

```dockerfile
# 字体（fonts-liberation 足够，fonts-noto-cjk 体积 100MB+ 仅中文网页需要）
fonts-noto-cjk \
fonts-liberation \
```

### Q4: 改代码后需要重新 build 吗？

**A**: 不需要！代码通过 volume 挂载，改完代码后只需：

```bash
# 在容器内重新构建
docker compose exec bb-browser sh -c "cd /app && pnpm build"

# 重启服务
docker compose restart bb-browser
```

或者直接重启（entrypoint.sh 会自动检测并重新构建）：

```bash
docker compose restart bb-browser
```

### Q5: VNC 连接提示密码错误

**A**: 检查 `docker-compose.yml` 中的 `VNC_PASSWORD` 环境变量，留空则不需要密码：

```yaml
environment:
  VNC_PASSWORD: ""  # 留空不需要密码
```

---

## 架构说明

```
浏览器 → noVNC(6080) → websockify → x11vnc(5900) → Xvfb(:99) → Chrome + fluxbox
                                                                      ↓
                                                            bb-browser daemon(18888)
```

**组件说明**：

1. **Xvfb** - 虚拟显示器，Chrome 在上面渲染画面
2. **fluxbox** - 轻量级窗口管理器，让 Chrome 窗口能正常显示
3. **x11vnc** - VNC 服务器，把虚拟显示器的画面通过 VNC 协议暴露
4. **websockify** - WebSocket 代理，把 VNC 转成 WebSocket
5. **noVNC** - 网页 VNC 客户端，让浏览器可以直接访问
6. **Chromium** - 运行在虚拟显示器上，开启 CDP 远程调试
7. **bb-browser daemon** - HTTP API 服务，通过 CDP 控制 Chrome

所有进程由 **supervisord** 管理，自动重启。

---

## 性能优化

### 1. 减小镜像体积

- 已去掉 `procps`（非必要）
- 默认不安装 `fonts-noto-cjk`（100MB+，仅中文网页需要）
- 合并 `apt-get update` 到一个 RUN 层
- 使用 `--no-install-recommends` 避免安装推荐包

### 2. 加速构建

- 使用国内 apt 源（中科大 http 源）
- 使用国内 npm 源（npmmirror.com）
- 代码通过 volume 挂载，不打包进镜像

### 3. 运行时优化

- `shm_size: 512mb` - 增加共享内存，避免 Chrome 崩溃
- `cap_add: SYS_ADMIN` + `seccomp:unconfined` - Chrome 沙箱需要
- `node_modules` 用独立 volume - 避免宿主机和容器的 node_modules 冲突

---

## 监控和调试

### 查看容器状态

```bash
docker compose ps
```

### 查看资源占用

```bash
docker stats bb-browser
```

### 进入容器调试

```bash
docker compose exec bb-browser bash
```

### 查看 supervisord 进程状态

```bash
docker compose exec bb-browser supervisorctl status
```

### 重启单个服务

```bash
# 重启 chromium
docker compose exec bb-browser supervisorctl restart chromium

# 重启 bb-daemon
docker compose exec bb-browser supervisorctl restart bb-daemon
```

---

## 生产环境建议

1. **修改 VNC 密码**：不要使用默认的 `changeme`
2. **配置反向代理**：使用 Nginx/Caddy 添加 HTTPS 和访问控制
3. **限制资源**：在 `docker-compose.yml` 中添加 `mem_limit` 和 `cpus`
4. **定期备份**：备份 `chrome-profile` 和 `bb-browser-data` volumes
5. **监控日志**：使用 `docker compose logs` 或集成到日志系统

---

## 更新日志

- 2026-05-12: 初始版本，基于 debian:trixie-slim
- 优化：去掉 `fonts-noto-cjk`（默认），减小镜像体积
- 优化：代码通过 volume 挂载，改代码不需要重新 build
