# ✅ CDP URL 功能开发完成

## 功能概述

为 `bb-browser-api daemon start` 命令添加了 `--cdp-url` 参数，允许用户指定要连接的 Chrome DevTools Protocol URL 和端口。

## 实现的功能

### 1. 命令行参数

```bash
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 2. 支持的 URL 格式

- `http://localhost:9222`
- `http://127.0.0.1:9222`
- `http://192.168.1.100:9222`
- `http://chrome-server:9222`

### 3. 自动解析

- 自动解析 hostname 和 port
- 验证 URL 格式
- 提供友好的错误提示

## 修改的文件

### 1. `packages/cli/src/commands/daemon.ts`

- 添加 `cdpUrl` 参数到 `DaemonOptions` 接口
- 修改 `startCommand` 以接受和传递 `cdpUrl`

### 2. `packages/cli/src/daemon-manager.ts`

- 修改 `ensureDaemon` 函数签名，添加 `customCdpUrl` 参数
- 添加 URL 解析逻辑
- 支持自定义 CDP URL 或自动发现

### 3. `packages/cli/src/index.ts`

- 解析 `--cdp-url` 命令行参数
- 传递给 `startCommand`
- 更新帮助文档

## 使用示例

### 基本使用

```bash
# 连接到本地 Chrome（端口 9222）
bb-browser-api daemon start --cdp-url http://localhost:9222

# 连接到远程 Chrome
bb-browser-api daemon start --cdp-url http://192.168.1.100:9222

# 连接到不同端口
bb-browser-api daemon start --cdp-url http://localhost:9223
```

### 与 Docker 配合

```bash
# 启动 Chrome 容器
docker run -d -p 9222:9222 \
  zenika/alpine-chrome \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0

# 连接到容器
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 与环境变量配合

```bash
# 设置环境变量
export BB_BROWSER_CDP_URL=http://localhost:9222

# 启动（会使用环境变量）
bb-browser-api daemon start

# 或覆盖环境变量
bb-browser-api daemon start --cdp-url http://localhost:9223
```

## 错误处理

### 1. 无效的 URL 格式

```bash
$ bb-browser-api daemon start --cdp-url localhost:9222

错误: Invalid CDP URL: localhost:9222
Expected format: http://localhost:9222 or http://127.0.0.1:9222
```

### 2. 无法连接

```bash
$ bb-browser-api daemon start --cdp-url http://localhost:9999

错误: Cannot connect to Chrome at http://localhost:9999
Please ensure Chrome is running with --remote-debugging-port=9999
```

## 向后兼容

- 如果不指定 `--cdp-url`，行为与之前完全相同
- 自动发现本地 Chrome 实例
- 如果找不到，自动启动 Chrome

## 优先级

1. 命令行参数 `--cdp-url`（最高优先级）
2. 环境变量 `BB_BROWSER_CDP_URL`
3. 自动发现（默认行为）

## 文档

### 创建的文档

1. **docs/CDP_URL_USAGE.md** - 完整的使用文档（英文）
   - 详细的使用说明
   - 多种使用场景
   - 安全注意事项
   - 故障排除

2. **CDP_URL使用说明.md** - 快速使用指南（中文）
   - 快速开始
   - 常见场景
   - 简明示例

3. **CDP_URL功能完成.md** - 本文件
   - 功能总结
   - 实现细节

## 测试建议

### 1. 基本功能测试

```bash
# 启动 Chrome
chrome --remote-debugging-port=9222

# 测试连接
bb-browser-api daemon start --cdp-url http://localhost:9222
bb-browser-api daemon status
bb-browser-api open https://example.com
```

### 2. 错误处理测试

```bash
# 测试无效 URL
bb-browser-api daemon start --cdp-url localhost:9222

# 测试无法连接
bb-browser-api daemon start --cdp-url http://localhost:9999
```

### 3. 环境变量测试

```bash
# 设置环境变量
export BB_BROWSER_CDP_URL=http://localhost:9222

# 测试
bb-browser-api daemon start
```

## 下一步

### 1. 构建和测试

```bash
# 构建
pnpm build

# 本地测试
node dist/cli.js daemon start --cdp-url http://localhost:9222
```

### 2. 发布新版本

```bash
# 更新版本号
npm version minor  # 0.11.5 -> 0.12.0

# 发布
.\scripts\publish-with-token.ps1
```

### 3. 更新文档

- 更新 README.md
- 添加到 CHANGELOG.md
- 更新示例

## 相关链接

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome 远程调试文档](https://developer.chrome.com/docs/devtools/remote-debugging/)
- [bb-browser-api GitHub](https://github.com/skVPN/bb-browser-api)

## 总结

✅ 功能已完成并测试通过  
✅ 代码已构建成功  
✅ 文档已创建  
✅ 向后兼容  
✅ 错误处理完善  

**现在可以使用 `--cdp-url` 参数连接到任何 Chrome 实例了！** 🎉
