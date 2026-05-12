# Docker 构建问题诊断

## 问题

执行 `docker compose up -d --build` 还是报错：
```
sh: 1: turbo: not found
ELIFECYCLE  Command failed.
```

## 原因分析

`--build` 重新构建了镜像，但 `entrypoint.sh` 是通过 **COPY** 指令复制到镜像中的，不是通过 volume 挂载的。

查看 Dockerfile：
```dockerfile
COPY docker/entrypoint.sh /entrypoint.sh
```

这意味着：
- ✅ 代码通过 volume 挂载（`./:/app`）
- ❌ `entrypoint.sh` 在镜像构建时就固定了
- ❌ 如果 `git pull` 之前就 build 了镜像，entrypoint.sh 还是旧版本

---

## 解决方案（3 选 1）

### 方案 1：重新构建镜像（推荐）

```bash
cd /home/ecs-user/bb-browser-api

# 确保代码是最新的
git pull

# 删除旧镜像，强制重新构建
docker compose down
docker rmi bb-browser:latest

# 重新构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f bb-browser
```

### 方案 2：手动修复容器内的 entrypoint.sh

```bash
# 进入容器
docker compose exec bb-browser sh

# 修改 entrypoint.sh
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' /entrypoint.sh

# 退出容器
exit

# 重启容器
docker compose restart bb-browser

# 查看日志
docker compose logs -f bb-browser
```

### 方案 3：直接在容器内安装并构建

```bash
# 进入容器
docker compose exec bb-browser bash

# 进入代码目录
cd /app

# 安装所有依赖（包括 devDependencies）
pnpm install --prod=false

# 构建项目
pnpm build

# 退出容器
exit

# 重启服务
docker compose restart bb-browser
```

---

## 验证 entrypoint.sh 是否已更新

### 在宿主机上检查

```bash
cd /home/ecs-user/bb-browser-api

# 查看 entrypoint.sh 内容
grep "prod=false" docker/entrypoint.sh

# 应该输出：
# pnpm install --frozen-lockfile --prod=false
```

### 在容器内检查

```bash
# 查看容器内的 entrypoint.sh
docker compose exec bb-browser grep "prod=false" /entrypoint.sh

# 如果没有输出，说明容器内的 entrypoint.sh 还是旧版本
```

---

## 推荐操作流程

```bash
# 1. 确保代码最新
cd /home/ecs-user/bb-browser-api
git pull

# 2. 验证 entrypoint.sh 已更新
grep "prod=false" docker/entrypoint.sh

# 3. 停止并删除容器和镜像
docker compose down
docker rmi bb-browser:latest

# 4. 重新构建（不使用缓存）
docker compose build --no-cache

# 5. 启动服务
docker compose up -d

# 6. 查看日志
docker compose logs -f bb-browser
```

---

## 如果还是不行

### 检查 Git 状态

```bash
cd /home/ecs-user/bb-browser-api

# 查看当前分支和提交
git log --oneline -5

# 应该看到最新的提交：
# eb91f45 文档: 添加 turbo not found 快速修复说明
# 76e742c z
# 1125956 x
```

### 手动查看 entrypoint.sh

```bash
cat docker/entrypoint.sh | grep -A 2 "node_modules"

# 应该输出：
# if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.modules.yaml" ]; then
#     echo "[startup] 安装依赖（包括 devDependencies，用于构建）..."
#     pnpm install --frozen-lockfile --prod=false
```

### 如果 entrypoint.sh 没有更新

说明 `git pull` 没有拉取到最新代码，手动修改：

```bash
cd /home/ecs-user/bb-browser-api

# 备份原文件
cp docker/entrypoint.sh docker/entrypoint.sh.bak

# 修改
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

# 验证
grep "prod=false" docker/entrypoint.sh

# 重新构建
docker compose down
docker rmi bb-browser:latest
docker compose up -d --build
```

---

## 终极方案：跳过 pnpm build

如果实在不行，可以修改 `entrypoint.sh`，跳过自动构建：

```bash
# 进入容器
docker compose exec bb-browser bash

# 手动安装和构建
cd /app
pnpm install --prod=false
pnpm build

# 修改 entrypoint.sh，注释掉构建部分
sed -i 's/pnpm build/# pnpm build/' /entrypoint.sh

# 退出并重启
exit
docker compose restart bb-browser
```

这样容器启动时就不会尝试构建，直接使用已经构建好的 `dist/` 目录。
