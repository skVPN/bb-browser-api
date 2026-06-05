# CDP URL 功能完成说明

## 版本：v0.12.2

## 新增功能

### 1. daemon status 显示 CDP URL

现在 `bb-browser-api daemon status` 命令会显示当前连接的 CDP URL：

```bash
bb-browser-api daemon status
```

输出示例：
```
Daemon running: yes
CDP connected:  yes
CDP URL:        http://127.0.0.1:19825  ← 新增
Uptime:         5s
Global seq:     10
```

JSON 格式输出也包含 `cdpUrl` 字段：
```bash
bb-browser-api daemon status --json
```

```json
{
  "running": true,
  "cdpConnected": true,
  "cdpUrl": "http://127.0.0.1:19825",
  "uptime": 5,
  ...
}
```

### 2. daemon start 支持自定义 CDP URL

支持两种方式指定自定义 CDP URL：

#### 方式 1：使用 --cdp-url 标志
```bash
bb-browser-api daemon start --cdp-url http://localhost:9222
bb-browser-api daemon start --cdp-url http://128.1.174.28:8003
```

#### 方式 2：使用位置参数
```bash
bb-browser-api daemon start http://localhost:9222
bb-browser-api daemon start http://128.1.174.28:8003
```

## 修改的文件

1. **packages/daemon/src/http-server.ts**
   - 在 `handleStatus` 方法中添加 `cdpUrl` 字段到响应

2. **packages/cli/src/commands/daemon.ts**
   - 在 `statusCommand` 中显示 CDP URL
   - 在 `startCommand` 中，当指定 cdpUrl 时先停止旧 daemon

3. **packages/cli/src/index.ts**
   - 支持位置参数方式传递 CDP URL

4. **packages/cli/src/daemon-manager.ts**
   - 改进 URL 解析逻辑

## 使用场景

### 场景 1：连接到 Docker 容器中的 Chrome
```bash
# 启动 Chrome 容器
docker run -d -p 9222:9222 zenika/alpine-chrome --remote-debugging-port=9222

# 连接到容器中的 Chrome
bb-browser-api daemon start http://localhost:9222
bb-browser-api daemon status  # 查看连接状态
```

### 场景 2：连接到远程服务器的 Chrome
```bash
# 连接到远程 Chrome
bb-browser-api daemon start http://192.168.1.100:9222

# 查看连接状态
bb-browser-api daemon status
```

### 场景 3：连接到 Browserless
```bash
bb-browser-api daemon start http://localhost:3000
```

## 注意事项

1. **URL 格式**：必须包含协议（http:// 或 https://）和端口号
2. **自动重启**：当指定新的 CDP URL 时，会自动停止旧的 daemon 并使用新 URL 启动
3. **连接失败**：如果指定的 CDP URL 无法连接，daemon 可能会回退到本地 Chrome

## 发布到 npm

```bash
# 方式 1：使用发布脚本（推荐）
.\scripts\publish-with-token.ps1

# 方式 2：手动发布
npm publish --access public
```

## 安装新版本

```bash
# 卸载旧版本
npm uninstall -g bb-browser-api

# 安装新版本
npm install -g bb-browser-api@0.12.2

# 验证版本
bb-browser-api --version
```

## 测试

```bash
# 停止旧 daemon
bb-browser-api daemon shutdown

# 使用自定义 CDP URL 启动
bb-browser-api daemon start http://localhost:9222

# 查看状态（应该显示正确的 CDP URL）
bb-browser-api daemon status
```
