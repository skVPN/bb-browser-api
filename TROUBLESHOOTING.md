# bb-browser 故障排除指南

## 错误：Failed to fetch

### 错误信息
```json
{"error":"Fetch error: Failed to fetch","hint":"Fetch 执行失败"}
```

### 原因分析

这个错误通常由以下原因引起：

1. ❌ Chrome 浏览器没有运行
2. ❌ CDP (Chrome DevTools Protocol) 连接未建立
3. ❌ 没有可用的浏览器标签页
4. ❌ 网络连接问题

### 解决步骤

#### 步骤 1: 运行诊断工具

**Windows:**
```bash
diagnose.bat
```

**Linux/macOS:**
```bash
chmod +x diagnose.sh
./diagnose.sh
```

#### 步骤 2: 检查 daemon 状态

```bash
curl http://localhost:6666/status
```

**期望输出：**
```json
{
  "running": true,
  "cdpConnected": true,
  "uptime": 123,
  "currentSeq": 456,
  "tabs": [...]
}
```

**关键检查点：**
- ✅ `cdpConnected: true` - CDP 已连接
- ✅ `tabs` 数组不为空 - 有可用的标签页

#### 步骤 3: 确保 Chrome 正在运行

1. **启动 Chrome 浏览器**
2. **打开至少一个标签页**（任何网页都可以）
3. **等待几秒钟**让 daemon 检测到 Chrome

#### 步骤 4: 重启 daemon

如果 CDP 未连接，重启 daemon：

```bash
# 停止 daemon
bb-browser daemon shutdown

# 重新启动
bb-browser daemon start
```

#### 步骤 5: 再次测试

```bash
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

## 常见错误及解决方案

### 1. Unauthorized

**错误：**
```json
{"error":"Unauthorized"}
```

**原因：** daemon 启动时配置了认证 token

**解决方案：**

**方法 A: 使用 token**
```bash
# 查看 token
cat ~/.bb-browser/daemon.json  # Linux/macOS
type %USERPROFILE%\.bb-browser\daemon.json  # Windows

# 使用 token
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

**方法 B: 禁用认证（本地开发）**
```bash
bb-browser daemon shutdown
bb-browser daemon start --token ""
```

### 2. Connection refused

**错误：**
```
curl: (7) Failed to connect to localhost port 6666: Connection refused
```

**原因：** daemon 未运行

**解决方案：**
```bash
bb-browser daemon start
```

### 3. Chrome not connected

**错误：**
```json
{"error":"Chrome not connected (CDP at 127.0.0.1:9222)"}
```

**原因：** Chrome 未运行或 CDP 端口不正确

**解决方案：**

1. **启动 Chrome**
2. **检查 CDP 端口：**
   ```bash
   # Windows
   netstat -ano | findstr :9222
   
   # Linux/macOS
   lsof -i :9222
   ```
3. **如果 Chrome 使用不同端口，指定 CDP 端口：**
   ```bash
   bb-browser daemon start --cdp-port 9223
   ```

### 4. No tabs available

**错误：** fetch 失败，status 显示 `tabs: []`

**原因：** Chrome 中没有打开的标签页

**解决方案：**
1. 在 Chrome 中打开任意网页
2. 等待几秒钟
3. 再次尝试

### 5. Network error

**错误：**
```json
{"error":"Fetch error: Network request failed"}
```

**原因：** 目标 URL 无法访问

**解决方案：**
1. 检查网络连接
2. 验证 URL 是否正确
3. 检查是否需要代理

## 调试技巧

### 1. 查看详细日志

前台运行 daemon 查看日志：

```bash
bb-browser daemon start
```

### 2. 测试简单请求

先测试一个简单的请求：

```bash
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get"}'
```

### 3. 检查 Chrome 标签页

```bash
# 列出所有标签页
bb-browser tab list
```

### 4. 手动打开标签页

```bash
# 打开一个新标签页
bb-browser open https://www.google.com
```

### 5. 测试 CDP 连接

```bash
# 直接访问 Chrome CDP
curl http://localhost:9222/json
```

## 完整诊断流程

```bash
# 1. 检查 daemon
curl http://localhost:6666/status

# 2. 检查 Chrome
# Windows: tasklist | findstr chrome
# Linux/macOS: ps aux | grep chrome

# 3. 检查端口
# Windows: netstat -ano | findstr :6666
# Linux/macOS: lsof -i :6666

# 4. 列出标签页
bb-browser tab list

# 5. 测试简单请求
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get"}'
```

## 环境要求

### 必需
- ✅ Chrome 浏览器已安装并运行
- ✅ Node.js 18+ 已安装
- ✅ bb-browser 已正确安装

### 可选
- Chrome 启用远程调试（通常自动启用）
- 防火墙允许本地端口 6666

## 获取帮助

如果问题仍未解决：

1. **运行诊断工具：**
   ```bash
   ./diagnose.bat  # Windows
   ./diagnose.sh   # Linux/macOS
   ```

2. **查看完整状态：**
   ```bash
   curl http://localhost:6666/status | jq
   ```

3. **检查 daemon 日志：**
   ```bash
   bb-browser daemon start  # 前台运行查看日志
   ```

4. **重置环境：**
   ```bash
   bb-browser daemon shutdown
   rm -rf ~/.bb-browser  # 删除配置
   bb-browser daemon start
   ```

## 快速修复命令

```bash
# 一键重启
bb-browser daemon shutdown && bb-browser daemon start

# 清理并重启
bb-browser daemon shutdown
rm -rf ~/.bb-browser
bb-browser daemon start

# 打开测试页面
bb-browser open https://www.google.com

# 测试 API
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

## 相关文档

- [API 文档](docs/api-fetch.md)
- [开发指南](DEVELOPMENT.md)
- [端口配置](docs/port-configuration.md)
