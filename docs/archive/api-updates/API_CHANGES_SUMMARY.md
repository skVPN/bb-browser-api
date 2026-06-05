# API 接口变更总结

## 变更内容

### 1. 请求方式改为 GET

两个新增的 API 接口已从 POST 改为 GET 请求，参数通过 URL query string 传递。

#### 抓包接口

**之前（POST）**:
```bash
curl -X POST http://localhost:18888/api/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "pattern": "api\\.", "timeout": 5000}'
```

**现在（GET）**:
```bash
curl "http://localhost:18888/api/capture?url=https://example.com&pattern=api\\.&timeout=5000"
```

#### 存储接口

**之前（POST）**:
```bash
curl -X POST http://localhost:18888/api/storage \
  -H "Content-Type: application/json" \
  -d '{"domain": "https://example.com"}'
```

**现在（GET）**:
```bash
curl "http://localhost:18888/api/storage?domain=https://example.com"
```

### 2. 端口改为 18888

Daemon 默认端口从 6666 改为 18888。

**修改的文件**:
- `packages/shared/src/constants.ts` - `DAEMON_PORT = 18888`

**启动命令**:
```bash
# 使用默认端口 18888
node dist/daemon.js

# 或指定端口
node dist/daemon.js --port 18888
```

## API 文档

### GET /api/capture

捕获网页的网络请求。

**参数**:
- `url` (必填) - 要访问的页面 URL
- `pattern` (可选) - URL 匹配正则表达式
- `timeout` (可选) - 等待时间（毫秒），默认 5000

**示例**:
```bash
curl "http://localhost:18888/api/capture?url=https://api.github.com/users/octocat&pattern=api\\.github\\.com&timeout=3000"
```

**响应**:
```json
{
  "url": "https://api.github.com/users/octocat",
  "pattern": "api\\.github\\.com",
  "totalRequests": 1,
  "matchedRequests": 1,
  "requests": [
    {
      "url": "https://api.github.com/users/octocat",
      "method": "GET",
      "status": 200,
      "responseBody": "{...}"
    }
  ]
}
```

### GET /api/storage

获取指定域名的存储数据。

**参数**:
- `domain` (必填) - 目标域名（必须包含协议，如 https://）

**示例**:
```bash
curl "http://localhost:18888/api/storage?domain=https://github.com"
```

**响应**:
```json
{
  "domain": "https://github.com",
  "cookies": [
    {
      "name": "session_id",
      "value": "...",
      "domain": ".github.com",
      "secure": true,
      "httpOnly": true
    }
  ],
  "localStorage": {},
  "sessionStorage": {}
}
```

## 测试

### 启动 Daemon

```bash
# 方式 1: 直接运行
node dist/daemon.js

# 方式 2: 使用 CLI
npx bb-browser daemon start
```

### 测试接口

```bash
# 测试抓包接口
curl "http://localhost:18888/api/capture?url=https://api.github.com/users/octocat"

# 测试存储接口
curl "http://localhost:18888/api/storage?domain=https://github.com"

# 检查状态
curl "http://localhost:18888/status"
```

## 注意事项

1. **URL 编码**: 在 URL 中使用特殊字符时需要进行 URL 编码
   ```bash
   # 正则表达式中的反斜杠需要编码
   pattern=api\\.github\\.com  # 正确
   ```

2. **端口配置**: 如果需要使用其他端口，可以通过命令行参数指定
   ```bash
   node dist/daemon.js --port 8080
   ```

3. **CORS**: 接口已配置 CORS，允许跨域访问

4. **认证**: 本地开发时（127.0.0.1）无需 token 认证

## 更新日志

- ✅ 2026-05-08: 将 POST 请求改为 GET 请求
- ✅ 2026-05-08: 端口从 6666 改为 18888
- ✅ 2026-05-08: 所有测试通过

## 相关文档

- [完整 API 文档](./docs/api-capture-storage.md)
- [快速开始指南](./QUICK_START_NEW_APIS.md)
- [实现报告](./IMPLEMENTATION_REPORT.md)
