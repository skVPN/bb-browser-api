# Fetch API Credentials 参数说明

## 问题背景

用户反馈：使用 `/api/fetch` 接口时，发现请求中的 `sec-fetch-mode` 等安全相关的 headers 都被设置为 `cors`，希望这些 headers 能由用户输入的 headers 决定。

## 问题分析

### 1. Sec-Fetch-* Headers 的特殊性

`Sec-Fetch-Mode`、`Sec-Fetch-Site`、`Sec-Fetch-Dest` 等 headers 是浏览器的**安全机制**，由浏览器根据请求上下文自动设置，**无法通过 JavaScript 代码控制**。

这些 headers 的值由以下因素决定：
- 请求的发起方式（fetch、XMLHttpRequest、导航等）
- 请求的目标（同源、跨域）
- 请求的类型（document、script、image 等）
- `credentials` 选项的值

### 2. Credentials 参数的作用

虽然无法直接控制 `Sec-Fetch-*` headers，但可以通过 `credentials` 参数控制：
- 是否发送 Cookie
- 是否发送 HTTP 认证信息
- 浏览器如何设置某些安全 headers

`credentials` 参数有三个可选值：

| 值 | 说明 | Cookie 行为 |
|---|---|---|
| `omit` | 不发送凭证 | 不发送任何 Cookie |
| `same-origin` | 仅同源请求发送凭证 | 仅发送同源 Cookie |
| `include` | 总是发送凭证 | 发送所有 Cookie（包括跨域） |

## 解决方案

### 修改内容

1. **在 `protocol.ts` 中添加 `credentials` 字段**
   ```typescript
   /** fetch credentials 选项（fetch 命令使用，可选值：omit, same-origin, include，默认 omit） */
   credentials?: "omit" | "same-origin" | "include";
   ```

2. **在 `command-dispatch.ts` 中使用用户提供的 credentials**
   ```typescript
   // 使用用户提供的 credentials，默认为 'omit' 以避免浏览器自动添加 CORS 相关的 headers
   const credentials = request.credentials || 'omit';
   
   const fetchScript = `(async () => {
     try {
       const resp = await fetch(${JSON.stringify(request.url)}, {
         method: ${JSON.stringify(method)},
         credentials: ${JSON.stringify(credentials)},
         headers: ${headersExpr}${hasBody ? `,\n            body: ${JSON.stringify(request.body)}` : ""}
       });
       // ...
     }
   })()`;
   ```

3. **在 `http-server.ts` 中传递 credentials 参数**
   ```typescript
   const request: Request = {
     id: `fetch-${Date.now()}`,
     action: "fetch",
     url: params.url,
     method: params.method,
     body: params.body,
     headers: params.headers,
     credentials: params.credentials,  // 新增
     tabId: targetTabId,
   };
   ```

### 默认值变更

- **之前**：硬编码为 `credentials: 'include'`
- **现在**：默认为 `credentials: 'omit'`

这样做的好处：
1. 避免浏览器自动添加不必要的 CORS 相关 headers
2. 更符合安全最佳实践（最小权限原则）
3. 用户可以根据需要显式指定 credentials 行为

## 使用示例

### 示例 1：不发送 Cookie（默认）

```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET"
  }'
```

### 示例 2：发送同源 Cookie

```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET",
    "credentials": "same-origin"
  }'
```

### 示例 3：总是发送 Cookie（包括跨域）

```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/data",
    "method": "GET",
    "credentials": "include"
  }'
```

## 测试结果

运行 `node test/test-credentials-detailed.js` 的测试结果显示：

1. ✅ `credentials` 参数已正确传递给浏览器的 fetch API
2. ✅ 不同的 `credentials` 值会影响 Cookie 的发送行为
3. ✅ `Sec-Fetch-Mode` 等安全 headers 由浏览器自动设置（符合规范）
4. ⚠️ 某些受保护的 headers（如 `User-Agent`）无法通过 JavaScript 修改

## 浏览器限制

根据 Fetch 标准规范，以下 headers 是**禁止修改的**（Forbidden header names）：

- `Accept-Charset`
- `Accept-Encoding`
- `Access-Control-Request-Headers`
- `Access-Control-Request-Method`
- `Connection`
- `Content-Length`
- `Cookie`
- `Cookie2`
- `Date`
- `DNT`
- `Expect`
- `Host`
- `Keep-Alive`
- `Origin`
- `Referer`
- `TE`
- `Trailer`
- `Transfer-Encoding`
- `Upgrade`
- `Via`
- 所有以 `Sec-` 开头的 headers（包括 `Sec-Fetch-Mode`）
- 所有以 `Proxy-` 开头的 headers

这些限制是浏览器的安全机制，无法绕过。

## 参考资料

- [Fetch Standard - Credentials](https://fetch.spec.whatwg.org/#concept-request-credentials-mode)
- [MDN - Fetch API - credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)
- [Forbidden header name](https://fetch.spec.whatwg.org/#forbidden-header-name)
