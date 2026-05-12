# 快速开始 - 新增 API 接口

## 5 分钟上手指南

### 前置条件

1. 确保已安装 bb-browser
2. 确保 Chrome 浏览器正在运行

### 步骤 1: 启动 Daemon

```bash
bb-browser daemon start
```

输出示例：
```
Daemon started
CDP connected:  yes
Tabs:           5
```

### 步骤 2: 测试抓包接口

#### 使用 curl

```bash
curl -X POST http://localhost:6666/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "pattern": "api\\.github\\.com",
    "timeout": 5000
  }'
```

#### 使用 Node.js

```javascript
const response = await fetch('http://localhost:6666/api/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://api.github.com/users/octocat',
    pattern: 'api\\.github\\.com',
    timeout: 5000
  })
});

const result = await response.json();
console.log(`捕获了 ${result.matchedRequests} 个请求`);
console.log('第一个请求:', result.requests[0]);
```

#### 使用 Python

```python
import requests

response = requests.post(
    'http://localhost:6666/api/capture',
    json={
        'url': 'https://api.github.com/users/octocat',
        'pattern': r'api\.github\.com',
        'timeout': 5000
    }
)

result = response.json()
print(f"捕获了 {result['matchedRequests']} 个请求")
print(f"第一个请求: {result['requests'][0]}")
```

### 步骤 3: 测试存储接口

#### 使用 curl

```bash
curl -X POST http://localhost:6666/api/storage \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "https://github.com"
  }'
```

#### 使用 Node.js

```javascript
const response = await fetch('http://localhost:6666/api/storage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'https://github.com'
  })
});

const result = await response.json();
console.log(`Cookies: ${result.cookies.length} 个`);
console.log(`localStorage: ${Object.keys(result.localStorage).length} 个键`);
console.log(`sessionStorage: ${Object.keys(result.sessionStorage).length} 个键`);
```

#### 使用 Python

```python
import requests

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
```

### 步骤 4: 运行测试脚本

```bash
# 测试抓包接口
node test/test-api-capture.js

# 测试存储接口
node test/test-api-storage.js

# 运行综合测试
node test/test-new-apis.js
```

## 常见使用场景

### 场景 1: 捕获 API 请求

```javascript
// 捕获所有 API 请求
async function captureApiRequests(url) {
  const response = await fetch('http://localhost:6666/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      pattern: 'api\\.',  // 匹配包含 "api." 的 URL
      timeout: 5000
    })
  });

  const { requests } = await response.json();
  
  // 提取 API 数据
  return requests.map(req => ({
    url: req.url,
    method: req.method,
    status: req.status,
    data: req.responseBody ? JSON.parse(req.responseBody) : null
  }));
}

// 使用
const apiData = await captureApiRequests('https://example.com');
console.log('API 数据:', apiData);
```

### 场景 2: 获取登录状态

```javascript
// 检查用户是否登录
async function checkLoginStatus(domain) {
  const response = await fetch('http://localhost:6666/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain })
  });

  const { cookies, localStorage } = await response.json();
  
  // 查找会话 Cookie
  const sessionCookie = cookies.find(c => 
    c.name.includes('session') || c.name.includes('token')
  );
  
  return {
    isLoggedIn: !!sessionCookie,
    sessionId: sessionCookie?.value,
    userData: localStorage.user_data
  };
}

// 使用
const status = await checkLoginStatus('https://example.com');
console.log('登录状态:', status.isLoggedIn);
```

### 场景 3: 数据采集

```javascript
// 完整的数据采集流程
async function scrapeWebsite(url) {
  // 1. 访问页面并捕获请求
  const captureResp = await fetch('http://localhost:6666/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      timeout: 5000
    })
  });
  const { requests } = await captureResp.json();
  
  // 2. 获取存储数据
  const storageResp = await fetch('http://localhost:6666/api/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: new URL(url).origin
    })
  });
  const storage = await storageResp.json();
  
  // 3. 整合数据
  return {
    url: url,
    timestamp: Date.now(),
    networkRequests: requests.length,
    apiRequests: requests.filter(r => r.type === 'XHR' || r.type === 'Fetch'),
    cookies: storage.cookies,
    localStorage: storage.localStorage,
    sessionStorage: storage.sessionStorage
  };
}

// 使用
const data = await scrapeWebsite('https://example.com');
console.log('采集数据:', data);
```

### 场景 4: 监控 API 变化

```javascript
// 定期检查 API 是否有变化
async function monitorApi(url, interval = 60000) {
  let previousData = null;
  
  setInterval(async () => {
    const response = await fetch('http://localhost:6666/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        pattern: 'api\\.',
        timeout: 5000
      })
    });
    
    const { requests } = await response.json();
    const currentData = JSON.stringify(requests.map(r => ({
      url: r.url,
      status: r.status
    })));
    
    if (previousData && previousData !== currentData) {
      console.log('⚠️  API 发生变化！');
      console.log('新请求:', requests);
    }
    
    previousData = currentData;
  }, interval);
}

// 使用：每分钟检查一次
monitorApi('https://example.com/dashboard', 60000);
```

## 常见问题

### Q1: Daemon 未运行

**错误**：
```json
{
  "error": "Chrome not connected",
  "hint": "Make sure Chrome is running."
}
```

**解决**：
```bash
bb-browser daemon start
```

### Q2: 端口被占用

**错误**：
```
Error: listen EADDRINUSE: address already in use 127.0.0.1:6666
```

**解决**：
```bash
# 关闭旧的 daemon
bb-browser daemon shutdown

# 重新启动
bb-browser daemon start
```

### Q3: 捕获不到请求

**可能原因**：
1. timeout 太短，页面还没加载完
2. pattern 正则表达式不匹配
3. 页面使用了反爬虫机制

**解决**：
```javascript
// 增加 timeout
{
  "url": "https://example.com",
  "timeout": 10000  // 增加到 10 秒
}

// 不使用 pattern，捕获所有请求
{
  "url": "https://example.com",
  "timeout": 5000
  // 不提供 pattern 参数
}
```

### Q4: 获取不到存储数据

**可能原因**：
1. 域名格式不正确（缺少协议）
2. 页面还没加载完
3. 网站没有设置 Cookie 或存储数据

**解决**：
```javascript
// 确保域名包含协议
{
  "domain": "https://example.com"  // ✓ 正确
  // "domain": "example.com"       // ✗ 错误
}
```

## 性能建议

1. **合理设置 timeout**
   - 简单页面：2000-3000ms
   - 复杂页面：5000-10000ms

2. **使用正则过滤**
   ```javascript
   // 只捕获 API 请求
   { "pattern": "api\\." }
   
   // 只捕获图片
   { "pattern": "\\.(png|jpg|jpeg|gif|webp)" }
   ```

3. **批量处理**
   ```javascript
   // 并发处理多个 URL
   const urls = ['url1', 'url2', 'url3'];
   const results = await Promise.all(
     urls.map(url => captureApiRequests(url))
   );
   ```

## 下一步

- 📖 阅读 [完整 API 文档](./docs/api-capture-storage.md)
- 🧪 查看 [测试脚本](./test/)
- 📝 查看 [更新日志](./CHANGELOG_NEW_APIS.md)
- 💡 查看 [总结文档](./NEW_APIS_SUMMARY.md)

## 获取帮助

如果遇到问题：

1. 检查 daemon 是否正在运行
2. 查看 daemon 日志输出
3. 运行测试脚本验证功能
4. 查阅文档和示例代码

祝使用愉快！🎉
