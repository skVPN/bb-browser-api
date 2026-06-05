# API 更新日志 v0.11.6

## 更新时间
2026-05-08

## 更新内容

### 1. 添加 `credentials` 参数支持

#### 问题描述
用户反馈：使用 `/api/fetch` 接口时，发现请求中的 `sec-fetch-mode` 等安全相关的 headers 都被设置为 `cors`，希望这些 headers 能由用户输入的 headers 决定。

#### 根本原因
- 之前的实现中，fetch 调用硬编码了 `credentials: 'include'`
- 这导致浏览器自动设置 `Sec-Fetch-Mode: cors`
- `Sec-Fetch-*` headers 是浏览器的安全机制，无法通过 JavaScript 直接控制

#### 解决方案
添加 `credentials` 参数，允许用户控制凭证发送行为：

**新增字段：**
```typescript
credentials?: "omit" | "same-origin" | "include"
```

**默认值变更：**
- 之前：硬编码为 `'include'`
- 现在：默认为 `'omit'`

**影响：**
- 用户可以根据需要显式指定 credentials 行为
- 默认不发送 Cookie，更符合安全最佳实践
- 减少不必要的 CORS 相关 headers

### 2. 修改的文件

#### `packages/shared/src/protocol.ts`
```typescript
export interface Request {
  // ... 其他字段
  /** fetch credentials 选项（fetch 命令使用，可选值：omit, same-origin, include，默认 omit） */
  credentials?: "omit" | "same-origin" | "include";
}
```

#### `packages/daemon/src/command-dispatch.ts`
```typescript
// 使用用户提供的 credentials，默认为 'omit'
const credentials = request.credentials || 'omit';

const fetchScript = `(async () => {
  try {
    const resp = await fetch(${JSON.stringify(request.url)}, {
      method: ${JSON.stringify(method)},
      credentials: ${JSON.stringify(credentials)},  // 使用用户提供的值
      headers: ${headersExpr}${hasBody ? `,\n            body: ${JSON.stringify(request.body)}` : ""}
    });
    // ...
  }
})()`;
```

#### `packages/daemon/src/http-server.ts`
```typescript
const params = JSON.parse(body) as {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  credentials?: "omit" | "same-origin" | "include";  // 新增
  tabId?: string | number;
};

const request: Request = {
  id: `fetch-${Date.now()}`,
  action: "fetch",
  url: params.url,
  method: params.method,
  body: params.body,
  headers: params.headers,
  credentials: params.credentials,  // 传递给 dispatchRequest
  tabId: targetTabId,
};
```

### 3. API 使用示例

#### 示例 1：不发送 Cookie（默认）
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET"
  }'
```

#### 示例 2：发送同源 Cookie
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET",
    "credentials": "same-origin"
  }'
```

#### 示例 3：总是发送 Cookie（包括跨域）
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET",
    "credentials": "include"
  }'
```

### 4. 重要说明

#### Sec-Fetch-* Headers 的限制
`Sec-Fetch-Mode`、`Sec-Fetch-Site`、`Sec-Fetch-Dest` 等 headers 是浏览器的安全机制，由浏览器根据请求上下文自动设置，**无法通过 JavaScript 代码控制**。

这些 headers 的值由以下因素决定：
- 请求的发起方式（fetch、XMLHttpRequest、导航等）
- 请求的目标（同源、跨域）
- 请求的类型（document、script、image 等）
- `credentials` 选项的值

#### 禁止修改的 Headers
根据 Fetch 标准规范，以下 headers 是禁止修改的：
- 所有以 `Sec-` 开头的 headers（包括 `Sec-Fetch-Mode`）
- `User-Agent`、`Cookie`、`Host`、`Origin`、`Referer` 等
- 完整列表见：[Forbidden header name](https://fetch.spec.whatwg.org/#forbidden-header-name)

### 5. 测试

#### 测试脚本
- `test/test-credentials.js` - 基本 credentials 测试
- `test/test-credentials-detailed.js` - 详细 credentials 测试

#### 运行测试
```bash
# 启动 daemon
node dist/daemon.js

# 运行测试
node test/test-credentials-detailed.js
```

#### 测试结果
✅ `credentials` 参数已正确传递给浏览器的 fetch API  
✅ 不同的 `credentials` 值会影响 Cookie 的发送行为  
✅ `Sec-Fetch-Mode` 等安全 headers 由浏览器自动设置（符合规范）  
⚠️ 某些受保护的 headers（如 `User-Agent`）无法通过 JavaScript 修改

### 6. 向后兼容性

**破坏性变更：**
- 默认 credentials 从 `'include'` 改为 `'omit'`
- 如果之前依赖自动发送 Cookie 的行为，需要显式指定 `credentials: 'include'`

**迁移指南：**
```javascript
// 之前（自动发送 Cookie）
fetch('http://localhost:18888/api/fetch', {
  method: 'POST',
  body: JSON.stringify({ url: 'https://api.example.com/data' })
})

// 现在（需要显式指定）
fetch('http://localhost:18888/api/fetch', {
  method: 'POST',
  body: JSON.stringify({ 
    url: 'https://api.example.com/data',
    credentials: 'include'  // 显式指定
  })
})
```

### 7. 相关文档

- [API Fetch 实现文档](docs/api-fetch-implementation.md)
- [API Fetch 使用文档](docs/api-fetch.md)
- [API Fetch 中文文档](docs/api-fetch.zh-CN.md)
- [Credentials 参数说明](docs/api-fetch-credentials.md)

### 8. 参考资料

- [Fetch Standard - Credentials](https://fetch.spec.whatwg.org/#concept-request-credentials-mode)
- [MDN - Fetch API - credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)
- [Forbidden header name](https://fetch.spec.whatwg.org/#forbidden-header-name)
