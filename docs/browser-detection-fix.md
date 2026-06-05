# 浏览器检测问题修复说明

## 问题描述

在 Docker 容器中，`bb-browser-api daemon start` 启动失败，提示：

```
bb-browser: Cannot find a Chromium-based browser.
Please do one of the following:
  1. Install Google Chrome, Edge, or Brave
  2. Start Chrome with: google-chrome --remote-debugging-port=19825
  3. Set BB_BROWSER_CDP_URL=http://host:port
  4. Use: bb-browser-api daemon start --cdp-url http://localhost:9222
```

但实际上容器中已经安装了 Chromium（`/usr/bin/chromium`）。

## 根本原因

`packages/cli/src/cdp-discovery.ts` 中的 `findBrowserExecutable()` 函数在 Linux 平台上：

1. 首先使用 `which` 命令查找浏览器
2. 如果 `which` 命令失败，才检查常见的绝对路径

在某些 Docker 环境中，`which` 命令可能因为各种原因失败（权限、PATH 配置等），导致即使浏览器已安装也检测不到。

## 修复方案

调整检测顺序，**优先检查绝对路径**，然后才使用 `which` 命令：

```typescript
if (process.platform === "linux") {
  // 优先检查常见的绝对路径（Docker 容器中更可靠）
  const commonPaths = [
    "/usr/bin/chromium",           // Debian/Ubuntu chromium 包
    "/usr/bin/google-chrome",      // Google Chrome 官方包
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",   // 旧版 Ubuntu
    "/snap/bin/chromium",          // Snap 安装
    "/usr/local/bin/google-chrome",
  ];
  
  for (const candidatePath of commonPaths) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  
  // 如果绝对路径都找不到，尝试使用 which 命令
  const candidates = ["chromium", "google-chrome", "google-chrome-stable", "chromium-browser"];
  for (const candidate of candidates) {
    try {
      const resolved = execSync(`which ${candidate}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (resolved && existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // which 命令失败，继续尝试下一个
    }
  }
  
  return null;
}
```

## 验证修复

### 1. 重新构建项目

```bash
pnpm build
```

### 2. 重新构建 Docker 镜像

```bash
docker compose build
```

### 3. 启动容器

```bash
docker compose up -d
```

### 4. 运行诊断脚本

```bash
docker compose exec bb-browser bash /diagnose-browser.sh
```

预期输出应该显示：
- ✓ 找到: /usr/bin/chromium
- CDP 端点可访问

### 5. 测试 daemon 启动

```bash
docker compose exec bb-browser bb-browser-api daemon status
```

应该显示 daemon 正在运行。

## 诊断工具

新增了 `/diagnose-browser.sh` 脚本，用于诊断浏览器检测问题：

```bash
docker compose exec bb-browser bash /diagnose-browser.sh
```

该脚本会检查：
1. 常见浏览器路径是否存在
2. `which` 命令能否找到浏览器
3. 浏览器版本信息
4. CDP 端口是否可访问
5. 相关环境变量

## 替代方案

如果修复后仍有问题，可以使用环境变量显式指定 CDP URL：

编辑 `docker-compose.yml`：

```yaml
environment:
  - BB_BROWSER_CDP_URL=http://127.0.0.1:9222
```

这样 daemon 会跳过浏览器检测，直接连接到指定的 CDP 端点。

## 相关文件

- `packages/cli/src/cdp-discovery.ts` - 浏览器检测逻辑
- `docker/diagnose-browser.sh` - 诊断脚本
- `Dockerfile` - 容器镜像构建
- `DEPLOY.md` - 部署文档（包含故障排查）

## 版本信息

- 修复版本：v0.12.6-1+
- 修复日期：2026-05-15
- 影响范围：Docker 部署环境
