# v0.12.6-2 更新日志

## 修复 (Fix)

### Docker 容器中浏览器检测失败

**问题**：在 Docker 容器中启动 daemon 时，即使已安装 Chromium，仍提示 "Cannot find a Chromium-based browser"

**根本原因**：
- 浏览器检测逻辑优先使用 `which` 命令
- 在某些 Docker 环境中，`which` 命令可能失败
- 导致即使浏览器已安装也检测不到

**修复方案**：
- 调整检测顺序，优先检查常见的绝对路径
- 将 `/usr/bin/chromium` 放在检测列表首位（Debian/Ubuntu 默认路径）
- `which` 命令作为备用方案

**影响文件**：
- `packages/cli/src/cdp-discovery.ts`

**测试验证**：
```bash
# 重新构建
pnpm build

# 重新构建镜像
docker compose build

# 启动容器
docker compose up -d

# 运行诊断
docker compose exec bb-browser bash /diagnose-browser.sh

# 测试 daemon
docker compose exec bb-browser bb-browser-api daemon status
```

## 新增 (Feature)

### 浏览器检测诊断脚本

新增 `/diagnose-browser.sh` 脚本，用于诊断浏览器检测问题：

```bash
docker compose exec bb-browser bash /diagnose-browser.sh
```

**检查项目**：
1. 常见浏览器路径是否存在
2. `which` 命令能否找到浏览器
3. 浏览器版本信息
4. CDP 端口是否可访问
5. 相关环境变量

**新增文件**：
- `docker/diagnose-browser.sh`

### 详细的启动日志

`bb-browser-api daemon start` 现在会显示详细的启动日志：

```
[bb-browser] Searching for browser executable on Linux...
[bb-browser] Found browser at: /usr/bin/chromium
[bb-browser] Launching Chrome: /usr/bin/chromium --remote-debugging-port=19825 ...
[bb-browser] Discovering Chrome CDP endpoint...
[bb-browser] CDP endpoint found: 127.0.0.1:19825
[bb-browser] Starting daemon: /usr/bin/node /app/dist/daemon.js --cdp-host 127.0.0.1 --cdp-port 19825
```

**日志内容**：
- 浏览器检测过程
- Chrome 完整启动命令
- CDP 端点发现
- Daemon 启动命令

**用途**：
- 诊断浏览器检测问题
- 验证 Chrome 启动参数
- 调试 CDP 连接问题

**新增文件**：
- `docs/debug-logging.md` - 日志说明文档

## 文档 (Documentation)

### 更新部署文档

在 `DEPLOY.md` 中新增故障排查章节：

**问题 5: daemon 启动失败，提示 "Cannot find a Chromium-based browser"**

包含：
- 症状描述
- 原因分析
- 解决方案（4 种方法）
- 版本说明

### 新增修复说明文档

创建 `docs/browser-detection-fix.md`，详细说明：
- 问题描述
- 根本原因
- 修复方案（代码级别）
- 验证步骤
- 诊断工具使用
- 替代方案

## 构建 (Build)

### 更新 Dockerfile

将诊断脚本复制到容器中：

```dockerfile
COPY docker/diagnose-browser.sh /diagnose-browser.sh
RUN chmod +x /diagnose-browser.sh
```

## 兼容性

- **向后兼容**：是
- **影响范围**：仅 Docker 部署环境
- **最低版本要求**：Node.js 18+

## 升级指南

### 从 v0.12.6-1 升级

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建项目
pnpm build

# 3. 重新构建 Docker 镜像
docker compose build

# 4. 重启容器
docker compose restart

# 5. 验证
docker compose exec bb-browser bb-browser-api daemon status
```

### 全新部署

按照 `DEPLOY.md` 中的快速开始步骤操作即可。

## 相关链接

- [部署文档](DEPLOY.md)
- [修复说明](docs/browser-detection-fix.md)
- [Docker 部署文档](docs/docker-deployment.md)

## 贡献者

- @skVPN - 问题诊断和修复

## 下一步计划

- [ ] 添加更多浏览器路径支持（Firefox、Edge 等）
- [ ] 优化 CDP 连接重试逻辑
- [ ] 改进错误提示信息
