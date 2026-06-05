# 发布 v0.12.2 到 npm

## 发布步骤

在项目根目录 `d:\codegank\bb-browser` 运行：

```powershell
.\scripts\publish-with-token.ps1
```

然后输入你的 npm token（之前保存的那个）。

## 发布后验证

发布成功后，运行以下命令验证：

```bash
# 1. 查看 npm 上的版本
npm view bb-browser-api version

# 2. 卸载旧版本
npm uninstall -g bb-browser-api

# 3. 安装新版本
npm install -g bb-browser-api@0.12.2

# 4. 验证版本
bb-browser-api --version

# 5. 测试功能
bb-browser-api daemon shutdown
bb-browser-api daemon start http://localhost:9222
bb-browser-api daemon status
```

应该看到：
```
Daemon running: yes
CDP connected:  yes
CDP URL:        http://localhost:9222  ← 这里应该显示你指定的 URL
Uptime:         0s
Global seq:     0
```

## 新功能说明

### v0.12.2 更新内容

1. **daemon status 显示 CDP URL**
   - 现在可以看到 daemon 连接的 CDP 地址和端口

2. **daemon start 支持自定义 CDP URL**
   - 支持位置参数：`bb-browser-api daemon start http://localhost:9222`
   - 支持标志参数：`bb-browser-api daemon start --cdp-url http://localhost:9222`

3. **自动重启机制**
   - 当指定新的 CDP URL 时，会自动停止旧 daemon 并使用新 URL 启动

## 使用示例

### 连接到 Docker 容器中的 Chrome
```bash
docker run -d -p 9222:9222 zenika/alpine-chrome --remote-debugging-port=9222
bb-browser-api daemon start http://localhost:9222
```

### 连接到远程 Chrome
```bash
bb-browser-api daemon start http://192.168.1.100:9222
```

### 查看当前连接
```bash
bb-browser-api daemon status
# 或 JSON 格式
bb-browser-api daemon status --json
```
