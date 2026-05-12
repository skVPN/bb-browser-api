# API Documentation: Capture & Storage

bb-browser daemon 提供了两个强大的 HTTP API 接口，用于网络抓包和存储数据获取。

## 目录

- [抓包接口 `/api/capture`](#抓包接口-apicapture)
- [存储接口 `/api/storage`](#存储接口-apistorage)
- [使用示例](#使用示例)

---

## 抓包接口 `/api/capture`

访问指定 URL 并捕获匹配的网络请求及其响应。

### 端点

```
POST http://localhost:6666/api/capture
```

### 请求体

```json
{
  "url": "https://example.com/page",
  "pattern": "api\\.example\\.com",
  "timeout": 5000
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 要访问的页面 URL |
| `pattern` | string | 否 | URL 匹配正则表达式（不提供则返回所有请求） |
| `timeout` | number | 否 | 等待时间（毫秒），默认 5000 |

### 响应格式

```json
{
  "url": "https://example.com/page",
  "pattern": "api\\.example\\.com",
  "totalRequests": 50,
  "matchedRequests": 3,
  "requests": [
    {
      "requestId": "...",
      "url": "https://api.example.com/data",
      "method": "GET",
      "type": "XHR",
      "timestamp": 1234567890,
      "status": 200,
      "statusText": "OK",
      "requestHeaders": {
        "User-Agent": "...",
        "Accept": "application/json"
      },
      "requestBody": "...",
      "responseHeaders": {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      "responseBody": "{...}",
      "responseBodyBase64": false,
      "mimeType": "application/json"
    }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | string | 访问的页面 URL |
| `pattern` | string | 使用的匹配模式 |
| `totalRequests` | number | 捕获的总请求数 |
| `matchedRequests` | number | 匹配模式的请求数 |
| `requests` | array | 匹配的请求列表 |

#### 请求对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `requestId` | string | 请求唯一标识 |
| `url` | string | 请求 URL |
| `method` | string | HTTP 方法（GET, POST 等） |
| `type` | string | 资源类型（Document, XHR, Script, Image 等） |
| `timestamp` | number | 请求时间戳 |
| `status` | number | HTTP 状态码 |
| `statusText` | string | 状态文本 |
| `requestHeaders` | object | 请求头 |
| `requestBody` | string | 请求体 |
| `responseHeaders` | object | 响应头 |
| `responseBody` | string | 响应体 |
| `responseBodyBase64` | boolean | 响应体是否为 base64 编码 |
| `mimeType` | string | 响应 MIME 类型 |
| `failed` | boolean | 请求是否失败 |
| `failureReason` | string | 失败原因 |

### 使用场景

1. **API 调试**：捕获页面发起的 API 请求，查看请求参数和响应数据
2. **逆向工程**：分析网站的网络通信模式
3. **性能分析**：统计页面加载的资源类型和数量
4. **数据采集**：提取页面异步加载的数据

### 示例

#### 捕获 GitHub API 请求

```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/octocat",
    "pattern": "api\\.github\\.com",
    "timeout": 5000
  }'
```

#### 捕获所有图片请求

```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com",
    "pattern": "\\.(png|jpg|jpeg|gif|webp)",
    "timeout": 3000
  }'
```

#### 捕获所有请求（不过滤）

```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com",
    "timeout": 3000
  }'
```

---

## 存储接口 `/api/storage`

获取指定域名的 Cookie、localStorage 和 sessionStorage 数据。

### 端点

```
POST http://localhost:6666/api/storage
```

### 请求体

```json
{
  "domain": "https://example.com"
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `domain` | string | 是 | 目标域名（必须包含协议，如 https://） |

### 响应格式

```json
{
  "domain": "https://example.com",
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".example.com",
      "path": "/",
      "expires": 1735689600,
      "size": 128,
      "httpOnly": true,
      "secure": true,
      "session": false,
      "sameSite": "Lax"
    }
  ],
  "localStorage": {
    "user_preferences": "{\"theme\":\"dark\"}",
    "last_visit": "2026-05-08"
  },
  "sessionStorage": {
    "temp_data": "..."
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `domain` | string | 查询的域名 |
| `cookies` | array | Cookie 列表 |
| `localStorage` | object | localStorage 键值对 |
| `sessionStorage` | object | sessionStorage 键值对 |

#### Cookie 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | Cookie 名称 |
| `value` | string | Cookie 值 |
| `domain` | string | Cookie 所属域名 |
| `path` | string | Cookie 路径 |
| `expires` | number | 过期时间（Unix 时间戳） |
| `size` | number | Cookie 大小（字节） |
| `httpOnly` | boolean | 是否仅 HTTP 访问 |
| `secure` | boolean | 是否仅 HTTPS 传输 |
| `session` | boolean | 是否为会话 Cookie |
| `sameSite` | string | SameSite 属性（Strict, Lax, None） |

### 使用场景

1. **会话管理**：获取和分析网站的登录状态
2. **数据提取**：提取存储在浏览器中的用户数据
3. **调试**：查看网站使用的存储机制
4. **安全审计**：检查 Cookie 的安全属性

### 示例

#### 获取 GitHub 的存储数据

```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "https://github.com"
  }'
```

#### 获取百度的存储数据

```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "https://www.baidu.com"
  }'
```

---

## 使用示例

### Node.js 示例

```javascript
// 抓包示例
async function captureRequests() {
  const response = await fetch('http://localhost:6666/api/capture', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://api.github.com/users/octocat',
      pattern: 'api\\.github\\.com',
      timeout: 5000
    })
  });

  const result = await response.json();
  console.log(`捕获了 ${result.matchedRequests} 个匹配的请求`);
  
  result.requests.forEach(req => {
    console.log(`${req.method} ${req.url} - ${req.status}`);
    if (req.responseBody) {
      console.log('响应:', JSON.parse(req.responseBody));
    }
  });
}

// 存储数据示例
async function getStorage() {
  const response = await fetch('http://localhost:6666/api/storage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: 'https://github.com'
    })
  });

  const result = await response.json();
  console.log(`Cookies: ${result.cookies.length} 个`);
  console.log(`localStorage: ${Object.keys(result.localStorage).length} 个键`);
  console.log(`sessionStorage: ${Object.keys(result.sessionStorage).length} 个键`);
  
  // 显示 Cookie 名称
  result.cookies.forEach(cookie => {
    console.log(`- ${cookie.name} (${cookie.domain})`);
  });
}
```

### Python 示例

```python
import requests
import json

# 抓包示例
def capture_requests():
    response = requests.post(
        'http://localhost:6666/api/capture',
        json={
            'url': 'https://api.github.com/users/octocat',
            'pattern': r'api\.github\.com',
            'timeout': 5000
        }
    )
    
    result = response.json()
    print(f"捕获了 {result['matchedRequests']} 个匹配的请求")
    
    for req in result['requests']:
        print(f"{req['method']} {req['url']} - {req['status']}")
        if req.get('responseBody'):
            body = json.loads(req['responseBody'])
            print(f"响应: {body}")

# 存储数据示例
def get_storage():
    response = requests.post(
        'http://localhost:6666/api/storage',
        json={
            'domain': 'https://github.com'
        }
    )
    
    result = response.json()
    print(f"Cookies: {len(result['cookies'])} 个")
    print(f"localStorage: {len(result['localStorage'])} 个键")
    print(f"sessionStorage: {len(result['sessionStorage'])} 个键")
    
    # 显示 Cookie 名称
    for cookie in result['cookies']:
        print(f"- {cookie['name']} ({cookie['domain']})")

if __name__ == '__main__':
    capture_requests()
    get_storage()
```

---

## 错误处理

### 常见错误

#### 1. Daemon 未运行

```json
{
  "error": "Chrome not connected (CDP at 127.0.0.1:9222)",
  "reason": "connection refused",
  "hint": "Make sure Chrome is running."
}
```

**解决方法**：启动 daemon
```bash
bb-browser daemon start
```

#### 2. 缺少必填参数

```json
{
  "error": "Missing url parameter",
  "hint": "请求体必须包含 url 字段"
}
```

**解决方法**：检查请求体是否包含所有必填字段

#### 3. 无效的域名

```json
{
  "error": "Invalid URL",
  "hint": "请求格式错误或执行失败"
}
```

**解决方法**：确保 domain 参数包含完整的 URL（包括协议）

---

## 性能建议

1. **合理设置 timeout**：根据页面复杂度调整等待时间
   - 简单页面：2000-3000ms
   - 复杂页面：5000-10000ms

2. **使用正则过滤**：只捕获需要的请求，减少数据传输
   ```json
   {
     "pattern": "api\\.(github|example)\\.com"
   }
   ```

3. **批量操作**：如果需要多次查询，考虑复用已打开的 tab

4. **清理资源**：抓包接口会自动关闭创建的 tab，无需手动清理

---

## 安全注意事项

1. **本地访问**：默认只监听 127.0.0.1，不对外暴露
2. **敏感数据**：Cookie 和存储数据可能包含敏感信息，请妥善保管
3. **HTTPS**：建议只在 HTTPS 网站上使用，避免中间人攻击
4. **权限控制**：在生产环境中应添加认证机制

---

## 更新日志

### v0.11.5 (2026-05-08)

- ✨ 新增 `/api/capture` 抓包接口
- ✨ 新增 `/api/storage` 存储接口
- 🐛 修复 fetch 接口的 CORS 问题
- 📝 完善 API 文档

---

## 相关文档

- [API Fetch 接口文档](./api-fetch.md)
- [端口配置说明](./port-configuration.md)
- [bb-browser 开发指南](../DEVELOPMENT.md)
