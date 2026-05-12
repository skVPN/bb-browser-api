# 🎉 bb-browser v0.11.5 - 新增 API 接口

## 新功能

### 1. 🔍 抓包接口 `/api/capture`

一行代码，捕获任何网站的网络请求！

```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat", "pattern": "api\\."}'
```

**特性**：
- ✅ 自动访问页面
- ✅ 捕获所有网络请求
- ✅ 正则表达式过滤
- ✅ 完整的请求和响应数据
- ✅ 自动资源清理

### 2. 🍪 存储接口 `/api/storage`

获取任何域名的 Cookie 和存储数据！

```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{"domain": "https://github.com"}'
```

**特性**：
- ✅ 获取所有 Cookie（包括 HttpOnly）
- ✅ 获取 localStorage
- ✅ 获取 sessionStorage
- ✅ 智能 tab 复用

## 使用场景

### API 逆向工程
```javascript
// 捕获网站的 API 调用
const { requests } = await fetch('http://localhost:6666/api/capture', {
  method: 'POST',
  body: JSON.stringify({ url: 'https://example.com', pattern: 'api\\.' })
}).then(r => r.json());

console.log('API 请求:', requests);
```

### 会话管理
```javascript
// 获取登录状态
const { cookies } = await fetch('http://localhost:6666/api/storage', {
  method: 'POST',
  body: JSON.stringify({ domain: 'https://example.com' })
}).then(r => r.json());

const session = cookies.find(c => c.name === 'session_id');
console.log('会话 ID:', session?.value);
```

### 数据采集
```javascript
// 完整的数据采集流程
async function scrape(url) {
  // 1. 访问页面并抓包
  const capture = await fetch('http://localhost:6666/api/capture', {
    method: 'POST',
    body: JSON.stringify({ url })
  }).then(r => r.json());
  
  // 2. 获取存储数据
  const storage = await fetch('http://localhost:6666/api/storage', {
    method: 'POST',
    body: JSON.stringify({ domain: new URL(url).origin })
  }).then(r => r.json());
  
  return { capture, storage };
}
```

## 快速开始

1. **启动 daemon**
```bash
bb-browser daemon start
```

2. **测试接口**
```bash
# 测试抓包
node test/test-api-capture.js

# 测试存储
node test/test-api-storage.js

# 综合测试
node test/test-new-apis.js
```

## 文档

- 📖 [完整 API 文档](./docs/api-capture-storage.md)
- 🚀 [快速开始指南](./QUICK_START_NEW_APIS.md)
- 📝 [更新日志](./CHANGELOG_NEW_APIS.md)
- 💡 [实现总结](./NEW_APIS_SUMMARY.md)
- 📊 [实现报告](./IMPLEMENTATION_REPORT.md)

## 测试结果

```
✓ 抓包接口 - 成功捕获 GitHub API 请求
✓ 存储接口 - 成功获取 Cookie 和存储数据
✓ 组合场景 - 成功完成复杂场景测试

🎉 所有测试通过！
```

## 技术亮点

- 🚀 **自动资源管理** - 自动创建和关闭 tab
- 🎯 **智能 tab 复用** - 优先使用已有的同源 tab
- 🔍 **灵活过滤** - 支持正则表达式匹配
- 📦 **完整数据** - 请求头、响应头、请求体、响应体
- ⚡ **高性能** - 异步处理，互不影响

## 安全性

- 🔒 默认只监听 127.0.0.1
- 🛡️ 本地开发无需 token
- 🔐 每个请求独立 tab
- ✅ 完善的错误处理

## 升级

```bash
npm install -g bb-browser@latest
```

## 获取帮助

- 📖 查看文档
- 🧪 运行测试脚本
- 💬 提交 Issue

---

**版本**: v0.11.5  
**发布日期**: 2026-05-08  
**状态**: ✅ 稳定版本
