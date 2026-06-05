# 快速修复：turbo not found

## 问题

容器启动时报错：
```
sh: 1: turbo: not found
ELIFECYCLE  Command failed.
```

## 原因

`pnpm install --frozen-lockfile` 默认不安装 devDependencies，但构建需要的 `turbo` 在 devDependencies 中。

---

## 解决方案（3 选 1）

### 方案 1：修改 entrypoint.sh（推荐）

```bash
# 在服务器上执行
cd /home/ecs-user/bb-browser-api

# 拉取最新代码（已包含修复）
git pull

# 重启容器
docker compose restart bb-browser

# 查看日志
docker compose logs -f bb-browser
```

### 方案 2：手动修改 entrypoint.sh

```bash
cd /home/ecs-user/bb-browser-api

# 修改 entrypoint.sh
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

# 重启容器
docker compose restart bb-browser

# 查看日志
docker compose logs -f bb-browser
```

### 方案 3：在容器内手动安装

```bash
# 进入容器
docker compose exec bb-browser bash

# 安装所有依赖（包括 devDependencies）
cd /app
pnpm install --prod=false

# 构建项目
pnpm build

# 退出容器
exit

# 重启服务
docker compose restart bb-browser
```

---

## 验证

启动成功后，应该看到：

```
bb-browser  | [startup] 安装依赖（包括 devDependencies，用于构建）...
bb-browser  | [startup] 构建项目...
bb-browser  | [startup] 启动所有服务...
```

然后可以访问：
- noVNC: `http://<服务器IP>:6080/vnc.html`
- API: `http://<服务器IP>:18888`

---

## 测试 API

```bash
curl http://localhost:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get",
    "method": "GET"
  }'
```

---

## 如果还有问题

查看完整日志：

```bash
docker compose logs bb-browser
```

查看 supervisord 状态：

```bash
docker compose exec bb-browser supervisorctl status
```

查看单个服务日志：

```bash
docker compose exec bb-browser supervisorctl tail -f bb-daemon
```
