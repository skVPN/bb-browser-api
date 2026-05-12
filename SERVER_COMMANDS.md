# 服务器端快速命令参考

## 安装 docker-compose v2

```bash
# 方法 1: 使用安装脚本（推荐）
curl -fsSL https://raw.githubusercontent.com/skVPN/bb-browser-api/main/install-docker-compose-v2.sh | sudo bash

# 方法 2: 手动下载二进制
COMPOSE_VERSION="v2.24.5"
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo mkdir -p /usr/libexec/docker/cli-plugins
sudo ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose

# 验证
docker compose version
```

---

## 部署 bb-browser

```bash
# 1. 克隆代码
cd /home/ecs-user
git clone https://github.com/skVPN/bb-browser-api.git
cd bb-browser-api

# 2. 构建镜像
docker compose build

# 3. 启动服务
docker compose up -d

# 4. 查看日志
docker compose logs -f
```

---

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志（所有服务）
docker compose logs -f

# 查看日志（只看 bb-browser）
docker compose logs -f bb-browser

# 重启服务
docker compose restart bb-browser

# 停止服务
docker compose down

# 停止并删除 volumes
docker compose down -v

# 进入容器
docker compose exec bb-browser bash

# 查看资源占用
docker stats bb-browser
```

---

## 代码更新

```bash
# 拉取最新代码
git pull

# 重启容器（代码通过 volume 挂载，不需要重新 build）
docker compose restart bb-browser

# 如果需要重新构建（Dockerfile 有改动）
docker compose build
docker compose up -d
```

---

## 调试命令

```bash
# 进入容器
docker compose exec bb-browser bash

# 查看 supervisord 进程状态
docker compose exec bb-browser supervisorctl status

# 查看单个服务日志
docker compose exec bb-browser supervisorctl tail -f bb-daemon
docker compose exec bb-browser supervisorctl tail -f chromium
docker compose exec bb-browser supervisorctl tail -f x11vnc

# 重启单个服务
docker compose exec bb-browser supervisorctl restart bb-daemon
docker compose exec bb-browser supervisorctl restart chromium

# 手动重新构建项目
docker compose exec bb-browser sh -c "cd /app && pnpm build"
```

---

## 测试 API

```bash
# 测试 fetch API
curl http://localhost:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get",
    "method": "GET"
  }'

# 测试 capture API
curl "http://localhost:18888/api/capture?url=https://example.com&pattern=api"

# 测试 storage API
curl "http://localhost:18888/api/storage?domain=example.com"
```

---

## 访问服务

```bash
# noVNC 网页访问
http://<服务器IP>:6080/vnc.html

# API 访问
http://<服务器IP>:18888
```

---

## 故障排查

### 检查端口监听

```bash
netstat -tlnp | grep 6080
netstat -tlnp | grep 18888
```

### 检查防火墙

```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 6080
sudo ufw allow 18888

# CentOS/RHEL
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=6080/tcp --permanent
sudo firewall-cmd --add-port=18888/tcp --permanent
sudo firewall-cmd --reload
```

### 查看容器网络

```bash
docker network ls
docker network inspect bb-browser-api_default
```

### 清理并重新开始

```bash
# 停止并删除所有
docker compose down -v

# 删除镜像
docker rmi bb-browser:latest

# 重新构建
docker compose build --no-cache
docker compose up -d
```

---

## 性能监控

```bash
# 实时资源占用
docker stats bb-browser

# 查看容器详细信息
docker inspect bb-browser

# 查看 volume 使用情况
docker volume ls
docker volume inspect bb-browser-api_chrome-profile
```

---

## 备份和恢复

```bash
# 备份 volumes
docker run --rm \
  -v bb-browser-api_chrome-profile:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/chrome-profile-backup.tar.gz -C /data .

# 恢复 volumes
docker run --rm \
  -v bb-browser-api_chrome-profile:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/chrome-profile-backup.tar.gz -C /data
```

---

## 卸载

```bash
# 停止并删除容器和 volumes
cd /home/ecs-user/bb-browser-api
docker compose down -v

# 删除镜像
docker rmi bb-browser:latest

# 删除代码
cd ..
rm -rf bb-browser-api
```

---

## 常见问题

### Q: 构建时报错 `turbo: not found`

```bash
# 快速修复：拉取最新代码（已包含修复）
git pull
docker compose restart bb-browser

# 或手动修改
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh
docker compose restart bb-browser
```

详见：[QUICKFIX.md](QUICKFIX.md)

### Q: docker-compose 报错 `KeyError: 'id'`

A: 使用了旧版本 docker-compose v1，需要升级到 v2

### Q: 构建时 apt-get update 很慢

A: 已配置中科大镜像源，如果还是慢可以换其他源

### Q: noVNC 页面打不开

A: 检查容器是否运行、端口是否监听、防火墙是否开放

### Q: API 返回 502

A: bb-browser daemon 未启动，查看日志排查

### Q: 需要中文字体支持

A: 编辑 Dockerfile，取消注释 `fonts-noto-cjk`

---

## 更多文档

- [快速部署指南](DEPLOY.md)
- [完整部署文档](docs/docker-deployment.md)
- [API 文档](docs/api-fetch.zh-CN.md)
