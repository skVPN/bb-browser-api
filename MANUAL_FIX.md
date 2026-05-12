# 手动修复：turbo not found

## 问题

执行 `docker compose up -d --build` 还是报错：
```
sh: 1: turbo: not found
```

## 原因

`entrypoint.sh` 是在镜像构建时复制进去的，不是通过 volume 挂载的。如果在 `git pull` 之前就构建了镜像，容器内的 `entrypoint.sh` 还是旧版本。

---

## 快速修复（复制粘贴执行）

```bash
# 1. 进入项目目录
cd /home/ecs-user/bb-browser-api

# 2. 确保代码最新
git pull

# 3. 验证 entrypoint.sh 已更新
grep "prod=false" docker/entrypoint.sh
# 应该有输出，如果没有，执行下面的命令手动修复：
# sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

# 4. 停止并删除容器和镜像
docker compose down
docker rmi bb-browser:latest

# 5. 重新构建（不使用缓存）
docker compose build --no-cache

# 6. 启动服务
docker compose up -d

# 7. 查看日志
docker compose logs -f bb-browser
```

---

## 方案 2：直接在容器内修复（更快）

如果不想重新构建镜像（构建需要 5-10 分钟），可以直接在容器内修复：

```bash
# 1. 启动容器（即使报错也会启动）
docker compose up -d

# 2. 进入容器
docker compose exec bb-browser bash

# 3. 安装所有依赖
cd /app
pnpm install --prod=false

# 4. 构建项目
pnpm build

# 5. 退出容器
exit

# 6. 重启服务
docker compose restart bb-browser

# 7. 查看日志
docker compose logs -f bb-browser
```

---

## 验证修复

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

然后访问：
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

## 如果还是不行

### 检查 entrypoint.sh 内容

```bash
# 在宿主机上
cat docker/entrypoint.sh | grep -A 2 "node_modules"

# 应该输出：
# if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.modules.yaml" ]; then
#     echo "[startup] 安装依赖（包括 devDependencies，用于构建）..."
#     pnpm install --frozen-lockfile --prod=false
```

### 检查容器内的 entrypoint.sh

```bash
docker compose exec bb-browser cat /entrypoint.sh | grep "prod=false"

# 如果没有输出，说明容器内的 entrypoint.sh 还是旧版本
# 需要重新构建镜像
```

### 手动修改 entrypoint.sh

```bash
cd /home/ecs-user/bb-browser-api

# 备份
cp docker/entrypoint.sh docker/entrypoint.sh.bak

# 修改
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

# 验证
grep "prod=false" docker/entrypoint.sh

# 重新构建
docker compose down
docker rmi bb-browser:latest
docker compose build --no-cache
docker compose up -d
```

---

## 推荐方案

**如果时间充足**：使用方案 1（重新构建镜像），一劳永逸

**如果需要快速修复**：使用方案 2（容器内修复），5 分钟搞定

---

## 联系支持

如果以上方案都不行，请提供以下信息：

```bash
# 1. Git 状态
cd /home/ecs-user/bb-browser-api
git log --oneline -3

# 2. entrypoint.sh 内容
cat docker/entrypoint.sh | grep -A 3 "pnpm install"

# 3. 容器日志
docker compose logs bb-browser | tail -50

# 4. 容器内 entrypoint.sh
docker compose exec bb-browser cat /entrypoint.sh | grep -A 3 "pnpm install"
```
