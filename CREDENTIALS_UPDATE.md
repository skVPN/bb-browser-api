# Fetch API Credentials 默认值更新

## 更新内容

### 修改前
```typescript
const credentials = request.credentials || 'omit';
```

### 修改后
```typescript
const credentials = request.credentials || 'include';
```

## 为什么修改？

### bb-browser 的核心价值

bb-browser 的核心价值是**使用用户的真实登录态（Cookie）**：

1. **用户已经登录**：用户在浏览器中已经登录了各种网站（Reddit、Twitter、知乎等）
2. **直接使用 Cookie**：bb-browser 直接使用这些 Cookie，无需重新登录
3. **避免反爬检测**：使用真实的用户 Cookie，网站无法检测是机器人

### `credentials: "omit"` 的问题

- ❌ **不发送 Cookie**：即使是同源请求也不发送
- ❌ **无法使用登录态**：需要登录的 API 会返回 401 或未登录状态
- ❌ **违背设计初衷**：bb-browser 的核心功能失效

### `credentials: "include"` 的优势

- ✅ **总是发送 Cookie**：同源和跨域请求都发送
- ✅ **使用登录态**：可以访问需要认证的 API
- ✅ **符合设计初衷**：充分利用浏览器的登录状态

## 影响范围

### 1. CLI 命令

```bash
# 之前：不带 Cookie（需要显式指定 --credentials include）
bb-browser fetch https://www.reddit.com/api/me.json

# 现在：自动带 Cookie
bb-browser fetch https://www.reddit.com/api/me.json
```

### 2. HTTP API

```bash
# 之前：不带 Cookie
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.reddit.com/api/me.json"}'

# 现在：自动带 Cookie
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.reddit.com/api/me.json"}'
```

### 3. MCP 工具

```json
// 之前：不带 Cookie
{
  "name": "bb_browser_fetch",
  "arguments": {
    "url": "https://www.reddit.com/api/me.json"
  }
}

// 现在：自动带 Cookie
{
  "name": "bb_browser_fetch",
  "arguments": {
    "url": "https://www.reddit.com/api/me.json"
  }
}
```

## 向后兼容

### 如果需要不发送 Cookie

显式指定 `credentials: "omit"`：

```bash
# CLI
bb-browser fetch https://api.github.com/users/octocat --credentials omit

# HTTP API
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "credentials": "omit"
  }'

# MCP
{
  "name": "bb_browser_fetch",
  "arguments": {
    "url": "https://api.github.com/users/octocat",
    "credentials": "omit"
  }
}
```

## 修改的文件

1. **packages/shared/src/protocol.ts**
   - 更新注释：默认值从 `omit` 改为 `include`

2. **packages/daemon/src/command-dispatch.ts**
   - 已经是 `include`（之前已修改）

3. **packages/daemon/src/http-server.ts**
   - 已经是 `include`（之前已修改）

4. **packages/shared/src/commands.ts**
   - Zod schema 默认值已经是 `include`

## 测试验证

### 测试 1：访问需要登录的 API

```bash
# 测试 Reddit API（需要登录）
bb-browser fetch https://www.reddit.com/api/me.json --json

# 预期：返回用户信息（如果已登录）
# 之前：返回 401 或未登录状态
```

### 测试 2：访问公开 API

```bash
# 测试 GitHub API（公开）
bb-browser fetch https://api.github.com/users/octocat --json

# 预期：正常返回（即使带了 Cookie 也不影响）
```

### 测试 3：显式使用 omit

```bash
# 测试不发送 Cookie
bb-browser fetch https://www.reddit.com/api/me.json --credentials omit --json

# 预期：返回未登录状态
```

## 使用场景

### 场景 1：访问需要登录的 API（默认）

```bash
# Reddit
bb-browser fetch https://www.reddit.com/api/me.json --json

# 知乎
bb-browser fetch https://www.zhihu.com/api/v4/me --json

# Twitter
bb-browser fetch https://api.twitter.com/1.1/account/verify_credentials.json --json
```

### 场景 2：访问公开 API

```bash
# 使用默认值（include）也可以
bb-browser fetch https://api.github.com/users/octocat --json

# 或者显式使用 omit（避免不必要的 Cookie）
bb-browser fetch https://api.github.com/users/octocat --credentials omit --json
```

### 场景 3：测试未登录状态

```bash
# 显式使用 omit 测试未登录状态
bb-browser fetch https://www.reddit.com/api/me.json --credentials omit --json
```

## CORS 注意事项

### 跨域请求 + credentials: "include"

当使用 `credentials: "include"` 进行跨域请求时，服务器必须：

1. **设置 `Access-Control-Allow-Credentials: true`**
2. **不能使用通配符 `*`**：
   - ❌ `Access-Control-Allow-Origin: *`
   - ✅ `Access-Control-Allow-Origin: https://example.com`

### 如果遇到 CORS 错误

```
Access to fetch at 'https://api.example.com/data' from origin 'https://example.com' 
has been blocked by CORS policy: The value of the 'Access-Control-Allow-Origin' 
header in the response must not be the wildcard '*' when the request's credentials 
mode is 'include'.
```

**解决方案**：
1. 使用 `credentials: "omit"` 或 `"same-origin"`
2. 或者让服务器正确配置 CORS

## 文档更新

1. **docs/fetch-credentials.md** - 新增详细的 credentials 说明文档
2. **packages/shared/src/protocol.ts** - 更新注释
3. **CREDENTIALS_UPDATE.md** - 本文档

## 相关链接

- [Fetch Credentials 详细说明](docs/fetch-credentials.md)
- [Fetch API 文档](docs/api-fetch.zh-CN.md)
- [MDN: Fetch API - credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)

## 版本信息

- **更新版本**：v0.12.11+
- **更新日期**：2026-05-15
- **影响范围**：所有使用 fetch 命令的场景
- **向后兼容**：是（可以显式指定 `omit`）

## 总结

这次更新将 `credentials` 的默认值从 `"omit"` 改为 `"include"`，使 bb-browser 能够充分利用浏览器的登录态，实现其核心价值：**让 AI Agent 直接使用你的登录态访问各种网站 API**。

如果需要不发送 Cookie，可以显式指定 `--credentials omit`，保持向后兼容。
