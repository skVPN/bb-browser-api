# Fetch API Credentials 说明

## 什么是 credentials？

`credentials` 是 Fetch API 的一个选项，控制浏览器是否在请求中发送 Cookie 和 HTTP 认证信息。

## 三种模式

### 1. `"include"` - 总是发送（推荐，默认值）

```typescript
fetch(url, { credentials: "include" })
```

**行为**：
- 同源请求：发送 Cookie
- 跨域请求：也发送 Cookie（需要服务器 CORS 配置支持）

**适用场景**：
- ✅ 需要使用浏览器的登录态
- ✅ 访问需要认证的 API
- ✅ bb-browser 的核心使用场景

**示例**：
```bash
# 使用浏览器的登录态访问 Reddit API
bb-browser fetch https://www.reddit.com/api/me.json --json

# 显式指定（默认就是 include，可以省略）
bb-browser fetch https://www.reddit.com/api/me.json --credentials include --json
```

### 2. `"same-origin"` - 仅同源发送

```typescript
fetch(url, { credentials: "same-origin" })
```

**行为**：
- 同源请求：发送 Cookie
- 跨域请求：不发送 Cookie

**适用场景**：
- 只访问同域名的 API
- 不需要跨域携带 Cookie

**示例**：
```bash
# 只在同源时发送 Cookie
bb-browser fetch https://example.com/api/data --credentials same-origin
```

### 3. `"omit"` - 从不发送

```typescript
fetch(url, { credentials: "omit" })
```

**行为**：
- 同源请求：不发送 Cookie
- 跨域请求：不发送 Cookie

**适用场景**：
- 访问公开 API（不需要认证）
- 避免 CORS 预检请求
- 测试未登录状态

**示例**：
```bash
# 不发送 Cookie（测试未登录状态）
bb-browser fetch https://api.github.com/users/octocat --credentials omit --json
```

## bb-browser 的默认值

**默认值：`"include"`**

### 为什么默认是 `"include"`？

bb-browser 的核心价值是**使用用户的真实登录态**：

1. **用户已经登录**：用户在浏览器中已经登录了各种网站
2. **直接使用 Cookie**：bb-browser 直接使用这些 Cookie，无需重新登录
3. **避免反爬检测**：使用真实的用户 Cookie，网站无法检测

### 对比其他工具

| 工具 | 默认 credentials | 说明 |
|------|-----------------|------|
| **bb-browser** | `"include"` | 使用浏览器的登录态 |
| 原生 fetch | `"same-origin"` | 只在同源时发送 |
| axios | 不发送 | 需要手动配置 |
| curl | 不发送 | 需要手动传 Cookie |

## 使用示例

### 示例 1：访问需要登录的 API

```bash
# Reddit API（需要登录）
bb-browser fetch https://www.reddit.com/api/me.json --json

# 知乎 API（需要登录）
bb-browser fetch https://www.zhihu.com/api/v4/me --json

# Twitter API（需要登录）
bb-browser fetch https://api.twitter.com/1.1/account/verify_credentials.json --json
```

### 示例 2：测试未登录状态

```bash
# 测试未登录时的响应
bb-browser fetch https://www.reddit.com/api/me.json --credentials omit --json
```

### 示例 3：HTTP API 调用

```bash
# 使用 HTTP API（默认 include）
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.reddit.com/api/me.json"
  }'

# 显式指定 credentials
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.reddit.com/api/me.json",
    "credentials": "include"
  }'

# 不发送 Cookie
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "credentials": "omit"
  }'
```

### 示例 4：MCP 工具调用

```json
{
  "name": "bb_browser_fetch",
  "arguments": {
    "url": "https://www.reddit.com/api/me.json",
    "credentials": "include"
  }
}
```

## CORS 注意事项

### 跨域请求 + credentials: "include"

当使用 `credentials: "include"` 进行跨域请求时，服务器必须：

1. **设置 `Access-Control-Allow-Credentials: true`**
2. **不能使用通配符 `*`**：
   - ❌ `Access-Control-Allow-Origin: *`
   - ✅ `Access-Control-Allow-Origin: https://example.com`

### 示例：CORS 错误

```
Access to fetch at 'https://api.example.com/data' from origin 'https://example.com' 
has been blocked by CORS policy: The value of the 'Access-Control-Allow-Origin' 
header in the response must not be the wildcard '*' when the request's credentials 
mode is 'include'.
```

**解决方案**：
1. 使用 `credentials: "omit"` 或 `"same-origin"`
2. 或者让服务器正确配置 CORS

## 常见问题

### Q1: 为什么我的请求没有带 Cookie？

**A**: 检查 `credentials` 设置：

```bash
# 确保使用 include（或省略，因为默认就是 include）
bb-browser fetch https://example.com/api --credentials include
```

### Q2: 如何查看请求是否带了 Cookie？

**A**: 使用 `network` 命令查看请求详情：

```bash
# 1. 开启网络监控
bb-browser network --with-body

# 2. 执行 fetch
bb-browser fetch https://example.com/api

# 3. 查看请求头
# 会显示 Cookie 请求头
```

### Q3: 跨域请求报 CORS 错误怎么办？

**A**: 三种解决方案：

1. **使用 `omit`**（如果不需要 Cookie）：
   ```bash
   bb-browser fetch https://api.example.com/data --credentials omit
   ```

2. **让服务器支持 CORS + credentials**（如果你控制服务器）

3. **使用代理**（如果你不控制服务器）

### Q4: 如何在 HTTP API 中设置 credentials？

**A**: 在请求体中添加 `credentials` 字段：

```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/api",
    "credentials": "include"
  }'
```

## 最佳实践

### 1. 默认使用 `"include"`

大多数情况下，使用默认值即可：

```bash
# 推荐：使用默认值
bb-browser fetch https://example.com/api

# 不推荐：显式指定（除非有特殊需求）
bb-browser fetch https://example.com/api --credentials include
```

### 2. 测试时使用 `"omit"`

测试未登录状态时，显式使用 `"omit"`：

```bash
# 测试未登录状态
bb-browser fetch https://example.com/api --credentials omit
```

### 3. 公开 API 使用 `"omit"`

访问不需要认证的公开 API 时，使用 `"omit"` 避免不必要的 Cookie 发送：

```bash
# 公开 API
bb-browser fetch https://api.github.com/users/octocat --credentials omit
```

### 4. 跨域请求注意 CORS

跨域请求 + `credentials: "include"` 需要服务器支持，否则使用 `"omit"`：

```bash
# 如果服务器不支持 CORS + credentials
bb-browser fetch https://api.example.com/data --credentials omit
```

## 相关文档

- [Fetch API 文档](api-fetch.zh-CN.md)
- [网络监控](../README.zh-CN.md#网络监控)
- [HTTP API 文档](../SERVER_COMMANDS.md)

## 参考资料

- [MDN: Fetch API - credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
