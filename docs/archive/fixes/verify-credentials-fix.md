# Credentials 参数修复验证清单

## 修改的文件

### 1. 核心代码修改

- [x] `packages/shared/src/protocol.ts`
  - 添加 `credentials?: "omit" | "same-origin" | "include"` 字段

- [x] `packages/daemon/src/command-dispatch.ts`
  - 使用 `request.credentials || 'omit'` 替代硬编码的 `'include'`
  - 在 fetchScript 中使用用户提供的 credentials 值

- [x] `packages/daemon/src/http-server.ts`
  - 在 params 类型定义中添加 `credentials` 字段
  - 在构建 Request 对象时传递 `credentials` 参数

### 2. 测试脚本

- [x] `test/test-credentials.js`
  - 基本的 credentials 参数测试

- [x] `test/test-credentials-detailed.js`
  - 详细的 credentials 参数测试
  - 包含同源和跨域请求测试
  - 验证自定义 headers 的行为

### 3. 文档

- [x] `docs/api-fetch-credentials.md`
  - Credentials 参数的详细说明
  - 浏览器限制说明
  - 使用示例

- [x] `API_UPDATE_v0.11.6.md`
  - API 更新日志
  - 向后兼容性说明
  - 迁移指南

- [x] `CREDENTIALS_FIX_SUMMARY.md`
  - 问题分析和解决方案总结
  - 完整的使用示例
  - 测试结果

## 验证步骤

### 1. 构建项目

```bash
pnpm build
```

预期结果：✅ 构建成功，无错误

### 2. 启动 daemon

```bash
node dist/daemon.js
```

预期结果：✅ daemon 在 18888 端口启动成功

### 3. 运行测试

```bash
# 基本测试
node test/test-credentials.js

# 详细测试
node test/test-credentials-detailed.js
```

预期结果：
- ✅ 所有测试通过
- ✅ credentials 参数正确传递
- ✅ 不同的 credentials 值产生不同的行为

### 4. 手动测试

#### 测试 1：默认行为（omit）
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/headers"}'
```

预期：不发送 Cookie

#### 测试 2：same-origin
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/headers", "credentials": "same-origin"}'
```

预期：仅发送同源 Cookie

#### 测试 3：include
```bash
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/headers", "credentials": "include"}'
```

预期：发送所有 Cookie

## 关键变更总结

### 默认值变更
- **之前**：`credentials: 'include'`（硬编码）
- **现在**：`credentials: 'omit'`（默认值）

### 用户影响
- ✅ 用户可以控制 Cookie 的发送行为
- ✅ 更符合安全最佳实践
- ⚠️ 如果之前依赖自动发送 Cookie，需要显式指定 `credentials: 'include'`

### 技术说明
- ✅ `credentials` 参数已正确实现
- ⚠️ `Sec-Fetch-*` headers 由浏览器控制，无法通过 JavaScript 修改
- ⚠️ 某些受保护的 headers（如 `User-Agent`）无法通过 JavaScript 修改

## 完成状态

- [x] 代码修改完成
- [x] 测试脚本创建完成
- [x] 文档编写完成
- [x] 构建测试通过
- [x] 功能测试通过

## 相关文档

1. [Credentials 参数说明](docs/api-fetch-credentials.md)
2. [API 更新日志 v0.11.6](API_UPDATE_v0.11.6.md)
3. [修复总结](CREDENTIALS_FIX_SUMMARY.md)
4. [API Fetch 实现文档](docs/api-fetch-implementation.md)
5. [API Fetch 使用文档](docs/api-fetch.md)
6. [API Fetch 中文文档](docs/api-fetch.zh-CN.md)

## 下一步

1. 更新 package.json 版本号为 0.11.6
2. 提交代码到 git
3. 发布新版本
