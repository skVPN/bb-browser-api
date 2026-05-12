# Docker 优化方案说明

## 优化策略

### 之前的问题

1. **依赖每次启动都安装**：`entrypoint.sh` 中执行 `pnpm install`，首次启动需要 5-10 分钟
2. **turbo not found**：因为 `pnpm install --frozen-lockfile` 在生产环境不安装 devDependencies

### 优化后的方案

**核心思想**：依赖在镜像构建时安装，代码通过 volume 挂载

```
镜像层次：
├─ 系统依赖（Chromium, Node.js, etc.）
├─ pnpm
├─ package.json + pnpm-lock.yaml
└─ node_modules（预安装）← 新增

运行时：
├─ 代码通过 volume 挂载（./:/app）
└─ node_modules 使用镜像中的（匿名 volume）
```

---

## 关键改动

### 1. Dockerfile 中预安装依赖

```dockerfile
# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/*/package.json ./packages/*/

# 预安装依赖（包括 devDependencies）
RUN pnpm install --frozen-lockfile --prod=false
```

**好处**：
- ✅ 利用 Docker 层缓存（只有依赖变化时才重新安装）
- ✅ 首次启动快（依赖已安装）
- ✅ turbo 和 tsup 已经在镜像中

### 2. docker-compose.yml 使用匿名 volume

```yaml
volumes:
  - ./:/app                              # 代码挂载
  - /app/node_modules                    # 使用镜像中的 node_modules
  - /app/packages/shared/node_modules    # 子包的 node_modules
  - /app/packages/cli/node_modules
  - /app/packages/daemon/node_modules
  - /app/packages/mcp/node_modules
```

**原理**：
- 匿名 volume（`/app/node_modules`）优先级高于 bind mount（`./:/app`）
- 宿主机的 `./node_modules` 不会覆盖容器内的 `/app/node_modules`
- 容器使用镜像中预安装的 node_modules

### 3. entrypoint.sh 简化

```bash
# 只在依赖变化时重新安装
if [ "package.json" -nt "/app/node_modules/.modules.yaml" ]; then
    echo "[startup] 检测到依赖变化，重新安装..."
    pnpm install --frozen-lockfile --prod=false
fi

# 构建项目
if [ ! -f "dist/daemon.js" ]; then
    pnpm build
fi
```

**好处**：
- ✅ 正常情况下不需要安装依赖（秒级启动）
- ✅ 只有 package.json 变化时才重新安装

---

## 使用场景

### 场景 1：首次部署

```bash
# 1. 构建镜像（安装依赖）
docker compose build

# 2. 启动服务
docker compose up -d

# 3. 查看日志
docker compose logs -f bb-browser
```

**时间**：
- 构建镜像：5-10 分钟（安装依赖）
- 启动容器：1-2 分钟（构建项目）

### 场景 2：修改代码

```bash
# 1. 在宿主机上修改代码
vim packages/daemon/src/index.ts

# 2. 重启容器
docker compose restart bb-browser

# 3. 查看日志
docker compose logs -f bb-browser
```

**时间**：
- 重启：秒级
- 重新构建：1-2 分钟

### 场景 3：更新依赖

```bash
# 1. 修改 package.json
vim package.json

# 2. 重新构建镜像
docker compose build

# 3. 重启服务
docker compose up -d
```

**时间**：
- 重新构建镜像：5-10 分钟（重新安装依赖）

---

## Docker 层缓存优化

### 缓存策略

```dockerfile
# 层 1：系统依赖（很少变化）
RUN apt-get update && apt-get install -y ...

# 层 2：Node.js 和 pnpm（很少变化）
RUN curl -fsSL ... | bash -
RUN npm install -g pnpm

# 层 3：package.json（偶尔变化）
COPY package.json pnpm-lock.yaml ./

# 层 4：node_modules（依赖 package.json）
RUN pnpm install --frozen-lockfile --prod=false

# 层 5：配置文件（偶尔变化）
COPY docker/supervisord.conf ...
```

**好处**：
- 只有 package.json 变化时，才重新执行层 4
- 系统依赖和 Node.js 使用缓存（秒级）

---

## 对比

| 指标 | 之前（entrypoint 安装） | 现在（Dockerfile 安装） |
|------|------------------------|------------------------|
| 首次启动 | 5-10 分钟 | 1-2 分钟 |
| 改代码后重启 | 1-2 分钟 | 1-2 分钟 |
| 更新依赖 | 5-10 分钟 | 5-10 分钟（重新 build） |
| 镜像体积 | 小 | 大（包含 node_modules） |
| 启动稳定性 | 低（网络问题） | 高（依赖已安装） |

---

## 注意事项

### 1. 宿主机的 node_modules

宿主机上的 `node_modules` 会被容器内的覆盖（通过匿名 volume）。

如果需要在宿主机上运行命令：

```bash
# 在宿主机上安装依赖
pnpm install

# 或者在容器内运行
docker compose exec bb-browser pnpm <command>
```

### 2. 依赖更新

修改 `package.json` 后，必须重新构建镜像：

```bash
docker compose build
docker compose up -d
```

### 3. 清理旧镜像

```bash
# 删除旧镜像
docker rmi bb-browser:latest

# 重新构建
docker compose build --no-cache
```

---

## 故障排查

### 问题 1：依赖没有更新

```bash
# 强制重新构建
docker compose build --no-cache
```

### 问题 2：node_modules 冲突

```bash
# 删除宿主机的 node_modules
rm -rf node_modules packages/*/node_modules

# 重启容器
docker compose restart bb-browser
```

### 问题 3：构建失败

```bash
# 查看构建日志
docker compose build 2>&1 | tee build.log

# 检查 package.json 是否正确
cat package.json
```

---

## 性能对比

### 首次启动

**之前**：
```
启动容器 → 安装依赖（5-10 分钟）→ 构建项目（1-2 分钟）→ 启动服务
```

**现在**：
```
构建镜像（5-10 分钟，只需一次）→ 启动容器 → 构建项目（1-2 分钟）→ 启动服务
```

### 日常开发

**之前**：
```
改代码 → 重启容器 → 检查依赖（可能重新安装）→ 重新构建 → 启动
```

**现在**：
```
改代码 → 重启容器 → 重新构建 → 启动（秒级）
```

---

## 总结

| 优点 | 缺点 |
|------|------|
| ✅ 首次启动快 | ❌ 镜像体积大 |
| ✅ 启动稳定（不依赖网络） | ❌ 更新依赖需要重新 build |
| ✅ 利用 Docker 缓存 | ❌ 宿主机 node_modules 被覆盖 |
| ✅ 开发体验好 | |

**推荐场景**：开发、测试、生产环境都适用
