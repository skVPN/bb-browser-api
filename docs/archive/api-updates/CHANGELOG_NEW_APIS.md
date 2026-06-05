# 更新日志 - 新增 API 接口

## [v0.11.5] - 2026-05-08

### ✨ 新增功能

#### 1. 抓包接口 `/api/capture`

访问指定 URL 并捕获匹配的网络请求及其响应。

**特性**：
- 🌐 自动访问目标页面
- 🔍 支持正则表达式过滤
- 📦 自动获取完整的请求和响应数据
- 🧹 自动清理资源（关闭 tab）
- ⏱️ 可配置超时时间

**使用示例**：
```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "pattern": "api\\.github\\.com",
    "timeout": 5000
  }'
```

#### 2. 存储接口 `/api/storage`

获取指定域名的 Cookie、localStorage 和 sessionStorage 数据。

**特性**：
- 🍪 获取所有 Cookie（包括 HttpOnly）
- 💾 获取 localStorage 数据
- 🔐 获取 sessionStorage 数据
- 🔄 智能复用已有 tab
- 🎯 自动处理同源策略

**使用示例**：
```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "https://github.com"
  }'
```

### 🐛 Bug 修复

- 修复了 `/api/fetch` 接口的 CORS 问题
- 修复了在 `about:blank` 页面执行 fetch 失败的问题
- 优化了 tab 选择逻辑，优先使用同源 tab

### 📝 文档更新

- 新增 [API 抓包和存储接口文档](./docs/api-capture-storage.md)
- 新增测试脚本：
  - `test/test-api-capture.js` - 抓包接口测试
  - `test/test-api-storage.js` - 存储接口测试
  - `test/test-new-apis.js` - 综合测试
- 新增 [新增 API 总结文档](./NEW_APIS_SUMMARY.md)

### 🧪 测试

所有新增接口均已通过完整测试：

```
✓ 抓包接口 - 成功捕获 GitHub API 请求
✓ 存储接口 - 成功获取 Cookie 和存储数据
✓ 组合场景 - 成功完成复杂场景测试
```

### 📊 测试覆盖

- ✅ 基本功能测试
- ✅ 正则表达式过滤测试
- ✅ 错误处理测试
- ✅ 资源清理测试
- ✅ 组合场景测试

### 🎯 使用场景

1. **API 逆向工程** - 分析网站的 API 调用
2. **数据采集** - 提取页面异步加载的数据
3. **会话管理** - 获取和分析登录状态
4. **安全审计** - 检查 Cookie 的安全属性
5. **性能分析** - 统计页面资源加载情况

### 🔧 技术实现

**修改的文件**：
- `packages/daemon/src/http-server.ts` - 添加新路由和处理方法

**核心技术**：
- Chrome DevTools Protocol (CDP)
- Network.getCookies - 获取 Cookie
- Network.getResponseBody - 获取响应体
- Runtime.evaluate - 执行 JavaScript 获取存储数据
- Target.createTarget - 创建新 tab

### 📈 性能优化

- 自动资源管理，避免内存泄漏
- 智能 tab 复用，减少资源消耗
- 按需获取响应体，减少数据传输
- 可配置超时时间，避免长时间等待

### 🔒 安全性

- 默认只监听 127.0.0.1，不对外暴露
- 本地开发模式无需 token 认证
- 每个请求使用独立的 tab，数据隔离
- 提供完整的错误提示和解决方案

### 🚀 快速开始

1. 启动 daemon：
```bash
bb-browser daemon start
```

2. 测试抓包接口：
```bash
node test/test-api-capture.js
```

3. 测试存储接口：
```bash
node test/test-api-storage.js
```

4. 运行综合测试：
```bash
node test/test-new-apis.js
```

### 📚 相关文档

- [API 详细文档](./docs/api-capture-storage.md)
- [新增 API 总结](./NEW_APIS_SUMMARY.md)
- [API Fetch 接口文档](./docs/api-fetch.md)
- [端口配置说明](./docs/port-configuration.md)

### 🙏 致谢

感谢所有参与测试和反馈的用户！

---

**完整更新日志**: [CHANGELOG.md](./CHANGELOG.md)
