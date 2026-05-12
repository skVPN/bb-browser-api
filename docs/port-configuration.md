# bb-browser 端口配置说明

## 默认端口

bb-browser daemon 默认监听端口：**6666**

## 端口配置位置

端口常量定义在：`packages/shared/src/constants.ts`

```typescript
/** Daemon HTTP 服务端口 */
export const DAEMON_PORT = 6666;
```

## 修改端口

### 方法 1: 修改源码（永久修改）

1. 编辑 `packages/shared/src/constants.ts`：
   ```typescript
   export const DAEMON_PORT = 你的端口号;
   ```

2. 重新构建：
   ```bash
   pnpm build
   ```

3. 重新链接（如果使用本地开发）：
   ```bash
   npm link
   ```

### 方法 2: 命令行参数（临时修改）

启动 daemon 时指定端口：

```bash
bb-browser daemon start --port 8888
```

或者：

```bash
bb-browser daemon start -p 8888
```

## 验证端口

### 检查 daemon 状态

```bash
curl http://localhost:6666/status
```

### 测试 API

```bash
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

## 端口冲突处理

### 检查端口占用

**Windows:**
```bash
netstat -ano | findstr :6666
```

**Linux/macOS:**
```bash
lsof -i :6666
```

### 解决冲突

1. **停止占用端口的进程**
2. **或者使用其他端口**：
   ```bash
   bb-browser daemon start --port 7777
   ```

## 相关配置

### Daemon 主机地址

默认绑定到 `127.0.0.1`（仅本地访问）。

修改主机地址：

```bash
# 监听所有网络接口（允许远程访问）
bb-browser daemon start --host 0.0.0.0

# 仅 IPv4
bb-browser daemon start --host 127.0.0.1

# 仅 IPv6
bb-browser daemon start --host ::1
```

### Chrome CDP 端口

Chrome DevTools Protocol 默认端口：**9222**

修改 CDP 端口：

```bash
bb-browser daemon start --cdp-port 9223
```

## 完整命令示例

```bash
# 自定义所有端口
bb-browser daemon start \
  --host 127.0.0.1 \
  --port 6666 \
  --cdp-port 9222
```

## 环境变量

目前不支持通过环境变量配置端口，但可以通过命令行参数实现。

## 测试脚本端口配置

如果修改了默认端口，需要同步更新测试脚本：

### Node.js 测试脚本

`test/test-api-fetch.js`:
```javascript
const DAEMON_PORT = 6666;  // 修改这里
```

### Python 测试脚本

`test/test-api-fetch.py`:
```python
DAEMON_PORT = 6666  # 修改这里
```

### 示例代码

`examples/fetch-api-example.js`:
```javascript
const DAEMON_URL = 'http://127.0.0.1:6666';  // 修改这里
```

## 防火墙配置

如果需要远程访问，需要开放端口：

**Windows 防火墙:**
```bash
netsh advfirewall firewall add rule name="bb-browser" dir=in action=allow protocol=TCP localport=6666
```

**Linux (ufw):**
```bash
sudo ufw allow 6666/tcp
```

**Linux (iptables):**
```bash
sudo iptables -A INPUT -p tcp --dport 6666 -j ACCEPT
```

## 安全建议

1. **本地开发**: 使用 `127.0.0.1`（默认），仅本地访问
2. **远程访问**: 使用 `0.0.0.0` 并配置防火墙
3. **生产环境**: 
   - 使用反向代理（Nginx/Caddy）
   - 启用 HTTPS
   - 配置认证 token

## 端口历史

- **v0.11.5 之前**: 默认端口 19824
- **v0.11.5**: 修改为 6666（更简洁易记）

## 常见问题

### Q: 为什么改成 6666？

A: 6666 更简洁易记，且不太容易与其他服务冲突。

### Q: 可以使用 80 或 443 端口吗？

A: 可以，但需要管理员权限：
```bash
sudo bb-browser daemon start --port 80
```

### Q: 如何在 Docker 中配置端口？

A: 映射容器端口：
```bash
docker run -p 6666:6666 bb-browser
```

## 相关文档

- [API 文档](api-fetch.md)
- [开发指南](../DEVELOPMENT.md)
- [Daemon 配置](../README.md#daemon-configuration)
