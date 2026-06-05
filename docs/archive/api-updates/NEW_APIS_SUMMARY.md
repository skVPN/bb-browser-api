# bb-browser 新增 API 接口总结

## 概述

本次更新为 bb-browser daemon 添加了两个强大的 HTTP API 接口：

1. **抓包接口** (`/api/capture`) - 访问页面并捕获网络请求
2. **存储接口** (`/api/storage`) - 获取域名的 Cookie 和存储数据

## 实现细节

### 修改的文件

1. **packages/daemon/src/http-server.ts**
   - 添加了 `/api/capture` 路由处理
   - 添加了 `/api/storage` 路由处理
   - 实现了 `handleApiCapture()` 方法
   - 实现了 `handleApiStorage()` 方法

### 核心功能

#### 1. 抓包接口 (`/api/capture`)

**功能**：
- 创建新 tab 访问指定 URL
- 捕获所有网络请求
- 支持正则表达式过滤
- 自动获取响应体
- 完成后自动关闭 tab

**实现要点**：
- 使用 `Target.createTarget` 创建新 tab
- 使用 `tab.getNetworkRequests()` 获取请求列表
- 使用 `Network.getResponseBody` 获取响应体
- 支持正则表达式和字符串匹配

**请求示例**：
```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "pattern": "api\\.github\\.com",
    "timeout": 5000
  }'
```

**响应示例**：
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
      "responseBody": "{\"login\":\"octocat\",...}"
    }
  ]
}
```

#### 2. 存储接口 (`/api/storage`)

**功能**：
- 查找或创建指定域名的 tab
- 获取该域名的所有 Cookie
- 获取 localStorage 数据
- 获取 sessionStorage 数据

**实现要点**：
- 使用 `Network.getCookies` 获取 Cookie
- 使用 `Runtime.evaluate` 执行脚本获取存储数据
- 支持同源 tab 复用
- 自动等待页面加载

**请求示例**：
```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "https://github.com"
  }'
```

**响应示例**：
```json
{
  "domain": "https://github.com",
  "cookies": [
    {
      "name": "logged_in",
      "value": "yes",
      "domain": ".github.com",
      "secure": true,
      "httpOnly": true
    }
  ],
  "localStorage": {},
  "sessionStorage": {
    "temp_key": "temp_value"
  }
}
```

## 测试结果

### 测试脚本

创建了三个测试脚本：

1. **test/test-api-capture.js** - 抓包接口专项测试
2. **test/test-api-storage.js** - 存储接口专项测试
3. **test/test-new-apis.js** - 综合测试

### 测试结果

```
╔════════════════════════════════════════════════════════╗
║  bb-browser 新增 API 接口测试                          ║
╚════════════════════════════════════════════════════════╝

✓ Daemon 正在运行
  CDP 连接: 已连接
  运行时间: 666 秒
  当前标签页数: 5

=== 测试 1: 抓包接口 /api/capture ===
✓ 抓包成功
  访问 URL: https://api.github.com/users/octocat
  总请求数: 1
  匹配请求数: 1

=== 测试 2: 存储接口 /api/storage ===
✓ 获取存储数据成功
  域名: https://github.com
  Cookies 数量: 6
  localStorage 键数量: 0
  sessionStorage 键数量: 1

=== 测试 3: 组合场景 ===
✓ 抓包成功，捕获 70 个请求
✓ 获取存储数据成功
  Cookies: 10 个
  localStorage: 9 个键

╔════════════════════════════════════════════════════════╗
║  测试总结                                              ║
╚════════════════════════════════════════════════════════╝

总测试数: 3
通过: 3
失败: 0

🎉 所有测试通过！
```

## 使用场景

### 1. API 逆向工程

```javascript
// 捕获网站的 API 请求
const response = await fetch('http://localhost:6666/api/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    pattern: 'api\\.',
    timeout: 5000
  })
});

const { requests } = await response.json();
requests.forEach(req => {
  console.log(`${req.method} ${req.url}`);
  console.log('请求体:', req.requestBody);
  console.log('响应体:', req.responseBody);
});
```

### 2. 会话管理

```javascript
// 获取登录状态
const response = await fetch('http://localhost:6666/api/storage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'https://example.com'
  })
});

const { cookies, localStorage } = await response.json();
const sessionCookie = cookies.find(c => c.name === 'session_id');
console.log('会话 ID:', sessionCookie?.value);
console.log('用户数据:', localStorage.user_data);
```

### 3. 数据采集

```javascript
// 组合使用：先访问页面，再获取数据
async function scrapeData(url) {
  // 1. 访问页面并抓包
  const captureResp = await fetch('http://localhost:6666/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, timeout: 5000 })
  });
  const { requests } = await captureResp.json();
  
  // 2. 获取存储数据
  const storageResp = await fetch('http://localhost:6666/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: new URL(url).origin })
  });
  const storage = await storageResp.json();
  
  return { requests, storage };
}
```

## 技术亮点

1. **自动资源管理**：抓包接口自动创建和关闭 tab，避免资源泄漏
2. **智能 tab 复用**：存储接口优先使用已有的同源 tab
3. **灵活的过滤**：支持正则表达式和字符串匹配
4. **完整的响应数据**：自动获取请求和响应的完整信息
5. **错误处理**：提供友好的错误提示和解决方案

## 性能优化

1. **并发控制**：每个请求独立处理，互不影响
2. **超时机制**：可配置的超时时间，避免长时间等待
3. **按需获取**：响应体按需获取，减少不必要的数据传输
4. **资源清理**：及时关闭不需要的 tab，释放内存

## 安全考虑

1. **本地访问**：默认只监听 127.0.0.1
2. **无认证模式**：本地开发时不需要 token
3. **数据隔离**：每个请求使用独立的 tab
4. **敏感数据**：Cookie 和存储数据需要妥善保管

## 后续优化建议

1. **流式响应**：对于大量请求，支持流式返回
2. **WebSocket 支持**：捕获 WebSocket 消息
3. **请求重放**：支持修改和重放捕获的请求
4. **过滤增强**：支持更复杂的过滤条件（状态码、内容类型等）
5. **持久化**：支持将捕获的数据保存到文件

## 文档

- [API 详细文档](./docs/api-capture-storage.md)
- [测试脚本](./test/)
  - test-api-capture.js
  - test-api-storage.js
  - test-new-apis.js

## 版本信息

- **版本**: v0.11.5
- **日期**: 2026-05-08
- **状态**: ✅ 已完成并测试通过

## 总结

本次更新成功为 bb-browser 添加了两个实用的 API 接口，极大地增强了其在网络抓包和数据提取方面的能力。所有功能均已通过完整测试，可以投入使用。
