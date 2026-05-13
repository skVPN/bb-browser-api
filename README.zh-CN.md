<div align="center">

# bb-browser

### 坏男孩浏览器 BadBoy Browser

**你的浏览器就是 API。不需要密钥，不需要爬虫，不需要模拟。**

[![npm](https://img.shields.io/npm/v/bb-browser?color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/bb-browser)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) · [中文](README.zh-CN.md)

</div>

---

> **Fork 说明 (skVPN/bb-browser-api)：** 本 fork 在 daemon 中新增了三个 HTTP API 接口，并将默认端口改为 **18888**。详见 [本 Fork 的改动](#本-fork-的改动)。

---

你已经登录了微博、知乎、B站、小红书、Twitter、GitHub、LinkedIn — bb-browser 让 AI Agent **直接用你的登录态**。

```bash
bb-browser site twitter/search "AI agent"       # 搜索推文
bb-browser site zhihu/hot                        # 知乎热榜
bb-browser site arxiv/search "transformer"       # 搜论文
bb-browser site eastmoney/stock "茅台"            # 实时股票行情
bb-browser site boss/search "AI 工程师"           # 搜职位
bb-browser site wikipedia/summary "Python"       # 维基百科摘要
bb-browser site youtube/transcript VIDEO_ID      # YouTube 字幕全文
bb-browser site stackoverflow/search "async"     # 搜 StackOverflow
```

**36 个平台，103 个命令，全部用你真实浏览器的登录态。** [完整列表 →](https://github.com/epiral/bb-sites)

## 核心理念

互联网是为浏览器构建的。AI Agent 一直试图通过 API 访问它 — 但 99% 的网站不提供 API。

bb-browser 翻转了这一逻辑：**不是让网站适配机器，而是让机器使用人的界面。** adapter 在你的浏览器 tab 里跑 `eval`，用你的 Cookie 调 `fetch()`，或者直接调用页面的 webpack 模块。网站以为是你在操作。因为**就是你**。

| | Playwright / Selenium | 爬虫库 | bb-browser |
|---|---|---|---|
| 浏览器 | 无头、隔离环境 | 没有浏览器 | 你的真实 Chrome |
| 登录态 | 没有，需重新登录 | 偷 Cookie | 已经在了 |
| 反爬检测 | 容易被识别 | 猫鼠游戏 | 无法检测 — 它就是用户 |
| 复杂鉴权 | 无法复制 | 需要逆向 | 页面自己处理 |

## 快速开始

### 安装

```bash
npm install -g bb-browser
```

### 使用

```bash
bb-browser site update        # 拉取社区适配器
bb-browser site recommend     # 看看哪些和你的浏览习惯匹配
bb-browser site zhihu/hot     # 开搜
```

### Docker 部署

如果需要在服务器上部署（带 VNC 网页访问），参见：

- **[快速部署指南](DEPLOY.md)** - 5 分钟快速上手
- **[完整部署文档](docs/docker-deployment.md)** - 详细配置和故障排查

```bash
# 快速启动
git clone https://github.com/skVPN/bb-browser-api.git
cd bb-browser-api
docker compose up -d

# 访问 http://<服务器IP>:6080/vnc.html 查看 Chrome 画面
# API: http://<服务器IP>:18888
```

### OpenClaw（无需安装扩展）

如果你使用 [OpenClaw](https://openclaw.ai)，bb-browser 可以直接通过 OpenClaw 内置浏览器运行，不需要额外安装 Chrome 扩展或 daemon：

```bash
bb-browser site reddit/hot --openclaw
bb-browser site xueqiu/hot-stock 5 --openclaw --jq '.items[] | {name, changePercent}'
```

ClawHub Skill: [bb-browser-openclaw](https://clawhub.ai/yan5xu/bb-browser)

### MCP 接入（Claude Code / Cursor）

```json
{
  "mcpServers": {
    "bb-browser": {
      "command": "npx",
      "args": ["-y", "bb-browser", "--mcp"]
    }
  }
}
```

## 36 个平台，103 个命令

社区驱动，通过 [bb-sites](https://github.com/epiral/bb-sites) 维护。每个命令一个 JS 文件。

| 类别 | 平台 | 命令 |
|------|------|------|
| **搜索引擎** | Google、百度、Bing、DuckDuckGo、搜狗微信 | search |
| **社交媒体** | Twitter/X、Reddit、微博、小红书、即刻、LinkedIn、虎扑 | search、feed、thread、user、notifications、hot |
| **新闻资讯** | BBC、Reuters、36氪、今日头条、东方财富 | headlines、search、newsflash、hot |
| **技术开发** | GitHub、StackOverflow、HackerNews、CSDN、博客园、V2EX、Dev.to、npm、PyPI、arXiv | search、issues、repo、top、thread、package |
| **视频平台** | YouTube、B站 | search、video、transcript、popular、comments、feed |
| **影音娱乐** | 豆瓣、IMDb、Genius、起点中文网 | movie、search、top250 |
| **财经股票** | 雪球、东方财富、Yahoo Finance | stock、hot-stock、feed、watchlist、search |
| **求职招聘** | BOSS直聘、LinkedIn | search、detail、profile |
| **知识百科** | Wikipedia、知乎、Open Library | search、summary、hot、question |
| **消费购物** | 什么值得买 | search |
| **实用工具** | 有道翻译、GSMArena、Product Hunt、携程 | translate、手机参数、热门产品 |

## 10 分钟，CLI 化任何网站

```bash
bb-browser guide    # 完整教程
```

跟你的 AI Agent 说：*"帮我把 XX 网站 CLI 化"*。它会读 guide，用 `network --with-body` 抓包逆向，写 adapter，测试，然后提 PR 到社区仓库。全程自动。

三种 adapter 复杂度：

| 层级 | 认证方式 | 代表 | 耗时 |
|------|----------|------|------|
| **Tier 1** | Cookie（直接 fetch） | Reddit、GitHub、V2EX | ~1 分钟 |
| **Tier 2** | Bearer + CSRF token | Twitter、知乎 | ~3 分钟 |
| **Tier 3** | Webpack 注入 / Pinia store | Twitter 搜索、小红书 | ~10 分钟 |

实测：**20 个 AI Agent 并发运行，每个独立逆向一个网站并产出可用的 adapter。** 将一个新网站纳入 Agent 可访问范围的边际成本趋近于零。

## 对 AI Agent 意味着什么

没有 bb-browser，AI Agent 的世界是：**文件系统 + 终端 + 少数有 API key 的服务。**

有了 bb-browser：**文件系统 + 终端 + 整个互联网。**

一个 Agent 现在可以在一分钟内：

```bash
# 跨平台调研任何话题
bb-browser site arxiv/search "retrieval augmented generation"
bb-browser site twitter/search "RAG"
bb-browser site github search rag-framework
bb-browser site stackoverflow/search "RAG implementation"
bb-browser site zhihu/search "RAG"
bb-browser site 36kr/newsflash
```

六个平台，六个维度，结构化 JSON。比任何人类研究员都快、都广。

## 同时也是完整的浏览器自动化工具

```bash
bb-browser open https://example.com
bb-browser snapshot -i                # 可访问性树
bb-browser click @3                   # 点击元素
bb-browser fill @5 "hello"            # 填写输入框
bb-browser eval "document.title"      # 执行 JS
bb-browser fetch URL --json           # 带登录态的 fetch
bb-browser network requests --with-body --json  # 抓包
bb-browser screenshot                 # 截图
```

所有命令支持 `--json` 输出、`--jq <expr>` 内联过滤、和 `--tab <id>` 多标签页并发操作。

```bash
bb-browser site xueqiu/hot-stock 5 --jq '.items[] | {name, changePercent}'
# {"name":"云天化","changePercent":"2.08%"}
# {"name":"东吴股份","changePercent":"-7.60%"}

bb-browser site info xueqiu/stock   # 查看 adapter 参数、示例、域名
```

## HTTP API 编程接入

Daemon 暴露 HTTP API 供直接集成。**默认端口：`18888`**（相比上游的 `19824` 已修改）。

```bash
# 启动 daemon
bb-browser daemon start

# Fetch API — 在浏览器上下文中执行请求
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "method": "GET",
    "credentials": "include"
  }'

# Capture API — 访问页面并捕获匹配的网络请求
curl "http://localhost:18888/api/capture?url=https://example.com&pattern=api"

# Storage API — 读取指定域名的 Cookie / localStorage / sessionStorage
curl "http://localhost:18888/api/storage?domain=baidu.com"
```

**核心优势：** 在你的真实浏览器上下文中执行，自动携带 Cookie 和登录态。

### Node.js 示例

```javascript
const response = await fetch('http://localhost:18888/api/fetch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.reddit.com/api/me.json',
    credentials: 'include',   // 发送 Cookie
  }),
});
const result = await response.json();
console.log(result.body);  // 你的 Reddit 用户数据
```

### Python 示例

```python
import requests

response = requests.post('http://localhost:18888/api/fetch', json={
    'url': 'https://api.github.com/users/octocat',
})
result = response.json()
print(result['body'])
```

**文档：** [API Fetch 指南](docs/api-fetch.md) · [抓包与存储指南](docs/api-capture-storage.md)

## Daemon 配置

Daemon 默认绑定 `127.0.0.1:18888`，可通过 `--host` 自定义监听地址：

```bash
bb-browser daemon --host 127.0.0.1    # 仅 IPv4（解决 macOS IPv6 问题）
bb-browser daemon --host 0.0.0.0      # 监听所有网卡（用于 Tailscale / ZeroTier 跨机器访问）
```

## 架构

```
AI Agent (Claude Code, Codex, Cursor 等)
       ┆ CLI 或 MCP (stdio)
       ▼
bb-browser CLI ──HTTP──▶ Daemon ──CDP WebSocket──▶ 你的真实浏览器
                           ┆
                    ┌──────┴──────┐
                    │ Per-tab     │
                    │ 事件缓存    │
                    │ (network,   │
                    │  console,   │
                    │  errors)    │
                    └─────────────┘
```

---

## 本 Fork 的改动

本 fork ([skVPN/bb-browser-api](https://github.com/skVPN/bb-browser-api)) 在上游 [epiral/bb-browser](https://github.com/epiral/bb-browser) 基础上做了以下改动：

### 1. 默认端口修改：`19824` → `18888`

**文件：** `packages/shared/src/constants.ts`

```diff
- export const DAEMON_PORT = 19824;
+ export const DAEMON_PORT = 18888;
```

### 2. 新增 HTTP API：`POST /api/fetch`

在浏览器上下文中执行 HTTP 请求（携带 Cookie、登录态等）。

**文件：** `packages/daemon/src/http-server.ts`、`packages/daemon/src/command-dispatch.ts`

**请求：**
```json
POST http://localhost:18888/api/fetch
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": { "Accept": "application/json" },
  "credentials": "include",
  "body": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | ✅ | 目标 URL |
| `method` | string | — | HTTP 方法，默认 `GET` |
| `headers` | object | — | 自定义请求头 |
| `credentials` | `omit` \| `same-origin` \| `include` | — | Cookie 发送策略，默认 `omit` |
| `body` | string | — | 请求体（POST/PUT 时使用） |
| `tabId` | string \| number | — | 指定使用的标签页 |

**响应：**
```json
{
  "status": 200,
  "contentType": "application/json",
  "body": { ... }
}
```

> **关于 `credentials`：** `Sec-Fetch-*` 等安全 headers 由浏览器自动设置，JavaScript 无法覆盖（这是浏览器安全规范）。`credentials` 字段控制是否发送 Cookie。

### 3. 新增 HTTP API：`GET /api/capture`

访问指定 URL 并捕获匹配的网络请求。

**文件：** `packages/daemon/src/http-server.ts`

```
GET http://localhost:18888/api/capture?url=https://example.com&pattern=api\.&timeout=5000
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `url` | ✅ | 要访问的页面 URL |
| `pattern` | — | 过滤请求的正则表达式 |
| `timeout` | — | 等待时间（毫秒），默认 `5000` |

**响应：**
```json
{
  "requests": [
    {
      "url": "https://example.com/api/data",
      "method": "GET",
      "status": 200,
      "responseBody": "..."
    }
  ]
}
```

### 4. 新增 HTTP API：`GET /api/storage`

读取指定域名的 Cookie、localStorage、sessionStorage。

**文件：** `packages/daemon/src/http-server.ts`

```
GET http://localhost:18888/api/storage?domain=example.com
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `domain` | ✅ | 要读取存储的域名 |

**响应：**
```json
{
  "cookies": [ { "name": "session", "value": "...", "domain": "example.com" } ],
  "localStorage": { "key": "value" },
  "sessionStorage": { "key": "value" }
}
```

### 5. `Request` 协议新增 `credentials` 字段

**文件：** `packages/shared/src/protocol.ts`

```typescript
export interface Request {
  // ...已有字段...
  /** fetch credentials 选项：omit | same-origin | include（默认：omit） */
  credentials?: "omit" | "same-origin" | "include";
}
```

之前的 fetch 实现硬编码了 `credentials: 'include'`，现在默认为 `'omit'`，并尊重调用方的选择。

---

## 许可证

MIT
