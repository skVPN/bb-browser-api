# 端口修改总结

## 修改内容

将 bb-browser daemon 的默认监听端口从 **19824** 修改为 **6666**。

## 修改的文件

### 核心代码（1 个文件）

✅ **`packages/shared/src/constants.ts`**
```typescript
// 修改前
export const DAEMON_PORT = 19824;

// 修改后
export const DAEMON_PORT = 6666;
```

### 测试脚本（3 个文件）

✅ **`test/test-api-fetch.js`**
```javascript
const DAEMON_PORT = 6666;  // 从 9222 改为 6666
```

✅ **`test/test-api-fetch.py`**
```python
DAEMON_PORT = 6666  # 从 9222 改为 6666
```

✅ **`examples/fetch-api-example.js`**
```javascript
const DAEMON_URL = 'http://127.0.0.1:6666';  // 从 9222 改为 6666
```

### 文档（批量更新）

✅ 所有 Markdown 文档中的端口引用已更新：
- `docs/api-fetch.md`
- `docs/api-fetch.zh-CN.md`
- `docs/api-fetch-implementation.md`
- `FETCH_API_SUMMARY.md`
- `DEVELOPMENT.md`
- `README.md`
- `test/README.md`

✅ 测试脚本：
- `quick-test.sh`
- `quick-test.bat`

### 新增文档

✅ **`docs/port-configuration.md`** - 端口配置详细说明

## 验证修改

### 1. 重新构建

```bash
pnpm build
```

✅ 构建成功

### 2. 启动 daemon

```bash
bb-browser daemon start
```

Daemon 现在监听在 `http://127.0.0.1:6666`

### 3. 测试 API

```bash
curl http://localhost:6666/status
```

```bash
curl -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

### 4. 运行测试

```bash
node test/test-api-fetch.js
```

## 使用新端口

### 启动 daemon

```bash
# 使用默认端口 6666
bb-browser daemon start

# 或指定其他端口
bb-browser daemon start --port 8888
```

### API 调用

```bash
# 默认端口
curl http://localhost:6666/api/fetch ...

# 自定义端口
curl http://localhost:8888/api/fetch ...
```

### Node.js 代码

```javascript
const DAEMON_URL = 'http://127.0.0.1:6666';

const response = await fetch(`${DAEMON_URL}/api/fetch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://api.github.com/users/octocat' }),
});
```

### Python 代码

```python
DAEMON_URL = "http://127.0.0.1:6666"

response = requests.post(f"{DAEMON_URL}/api/fetch", json={
    'url': 'https://api.github.com/users/octocat',
})
```

## 端口选择原因

### 为什么选择 6666？

1. **简洁易记**: 四个相同数字，容易记忆
2. **避免冲突**: 不太容易与常见服务冲突
3. **非特权端口**: 不需要管理员权限
4. **吉利数字**: 在中文文化中寓意顺利

### 常见端口对比

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | HTTP | 需要管理员权限 |
| 443 | HTTPS | 需要管理员权限 |
| 3000 | 开发服务器 | 常被占用 |
| 8080 | 代理/开发 | 常被占用 |
| 9222 | Chrome CDP | Chrome 调试端口 |
| **6666** | **bb-browser** | ✅ 本项目 |
| 19824 | 旧版 bb-browser | 之前的默认端口 |

## 兼容性说明

### 向后兼容

如果你之前使用的是旧版本（端口 19824），需要：

1. **更新代码**: 使用新端口 6666
2. **或指定端口**: `bb-browser daemon start --port 19824`

### 迁移步骤

1. 停止旧 daemon：
   ```bash
   bb-browser daemon shutdown
   ```

2. 更新到新版本：
   ```bash
   npm install -g bb-browser@latest
   # 或本地开发
   pnpm build && npm link
   ```

3. 启动新 daemon：
   ```bash
   bb-browser daemon start
   ```

4. 更新客户端代码中的端口号

## 检查端口占用

### Windows

```bash
netstat -ano | findstr :6666
```

### Linux/macOS

```bash
lsof -i :6666
```

### 如果端口被占用

```bash
# 使用其他端口
bb-browser daemon start --port 7777
```

## 防火墙配置

如果需要远程访问（不推荐用于生产环境）：

### Windows

```bash
netsh advfirewall firewall add rule name="bb-browser" dir=in action=allow protocol=TCP localport=6666
```

### Linux (ufw)

```bash
sudo ufw allow 6666/tcp
```

### Linux (iptables)

```bash
sudo iptables -A INPUT -p tcp --dport 6666 -j ACCEPT
```

## 安全建议

1. **本地开发**: 保持默认 `127.0.0.1`，仅本地访问
2. **远程访问**: 
   - 使用 VPN 或 SSH 隧道
   - 配置防火墙规则
   - 启用认证 token
3. **生产环境**: 
   - 使用反向代理（Nginx/Caddy）
   - 启用 HTTPS
   - 实施访问控制

## 相关文档

- [端口配置详细说明](docs/port-configuration.md)
- [API 文档](docs/api-fetch.md)
- [开发指南](DEVELOPMENT.md)

## 总结

✅ 端口已从 19824 修改为 6666  
✅ 所有相关文件已更新  
✅ 构建成功  
✅ 向后兼容（可通过 --port 参数指定）

**下一步**: 重新构建并测试

```bash
pnpm build
bb-browser daemon start
curl http://localhost:6666/status
```
