<div align="center">

# bb-browser-api

### BadBoy Browser API

**Your browser is the API. No keys. No bots. No scrapers.**

[![npm](https://img.shields.io/npm/v/bb-browser-api?color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/bb-browser-api)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) · [中文](README.zh-CN.md)

</div>

---

> **Fork Note (skVPN/bb-browser-api):** This fork adds three new HTTP API endpoints to the daemon and changes the default port to **18888**. Install with `npm install -g bb-browser-api`. See [What's Changed in This Fork](#whats-changed-in-this-fork) for details.
>
> **Original Project:** [epiral/bb-browser](https://github.com/epiral/bb-browser)

---

You're already logged into Twitter, Reddit, YouTube, Zhihu, Bilibili, LinkedIn, GitHub — bb-browser lets AI agents **use that directly**.

```bash
bb-browser-api site twitter/search "AI agent"       # search tweets
bb-browser-api site zhihu/hot                        # trending on Zhihu
bb-browser-api site arxiv/search "transformer"       # search papers
bb-browser-api site eastmoney/stock "茅台"            # real-time stock quote
bb-browser-api site boss/search "AI engineer"        # search jobs
bb-browser site wikipedia/summary "Python"       # Wikipedia summary
bb-browser site youtube/transcript VIDEO_ID      # full transcript
bb-browser site stackoverflow/search "async"     # search SO questions
```

**103 commands across 36 platforms.** All using your real browser's login state. [Full list →](https://github.com/epiral/bb-sites)

## The idea

The internet was built for browsers. AI agents have been trying to access it through APIs — but 99% of websites don't offer one.

bb-browser flips this: **instead of forcing websites to provide machine interfaces, let machines use the human interface directly.** The adapter runs `eval` inside your browser tab, calls `fetch()` with your cookies, or invokes the page's own webpack modules. The website thinks it's you. Because it **is** you.

| | Playwright / Selenium | Scraping libs | bb-browser |
|---|---|---|---|
| Browser | Headless, isolated | No browser | Your real Chrome |
| Login state | None, must re-login | Cookie extraction | Already there |
| Anti-bot | Detected easily | Cat-and-mouse | Invisible — it IS the user |
| Complex auth | Can't replicate | Reverse engineer | Page handles it itself |

## Quick Start

### Install

```bash
npm install -g bb-browser-api
```

### Use

```bash
bb-browser-api site update        # pull community adapters
bb-browser-api site recommend     # see which adapters match your browsing habits
bb-browser-api site zhihu/hot     # go
```

### OpenClaw (no extension needed)

If you use [OpenClaw](https://openclaw.ai), bb-browser-api runs directly through OpenClaw's built-in browser — no Chrome extension or daemon required:

```bash
bb-browser-api site reddit/hot --openclaw
bb-browser-api site xueqiu/hot-stock 5 --openclaw --jq '.items[] | {name, changePercent}'
```

Skill on ClawHub: [bb-browser-openclaw](https://clawhub.ai/yan5xu/bb-browser)

### MCP (Claude Code / Cursor)

```json
{
  "mcpServers": {
    "bb-browser-api": {
      "command": "npx",
      "args": ["-y", "bb-browser-api", "--mcp"]
    }
  }
}
```

## 36 platforms, 103 commands

Community-driven via [bb-sites](https://github.com/epiral/bb-sites). One JS file per command.

| Category | Platforms | Commands |
|----------|-----------|----------|
| **Search** | Google, Baidu, Bing, DuckDuckGo, Sogou WeChat | search |
| **Social** | Twitter/X, Reddit, Weibo, Xiaohongshu, Jike, LinkedIn, Hupu | search, feed, thread, user, notifications, hot |
| **News** | BBC, Reuters, 36kr, Toutiao, Eastmoney | headlines, search, newsflash, hot |
| **Dev** | GitHub, StackOverflow, HackerNews, CSDN, cnblogs, V2EX, Dev.to, npm, PyPI, arXiv | search, issues, repo, top, thread, package |
| **Video** | YouTube, Bilibili | search, video, transcript, popular, comments, feed |
| **Entertainment** | Douban, IMDb, Genius, Qidian | movie, search, top250 |
| **Finance** | Xueqiu, Eastmoney, Yahoo Finance | stock, hot stocks, feed, watchlist, search |
| **Jobs** | BOSS Zhipin, LinkedIn | search, detail, profile |
| **Knowledge** | Wikipedia, Zhihu, Open Library | search, summary, hot, question |
| **Shopping** | SMZDM | search deals |
| **Tools** | Youdao, GSMArena, Product Hunt, Ctrip | translate, phone specs, trending products |

## 10 minutes to add any website

```bash
bb-browser guide    # full tutorial
```

Tell your AI agent: *"turn XX website into a CLI"*. It reads the guide, reverse-engineers the API with `network --with-body`, writes the adapter, tests it, and submits a PR. All autonomously.

Three tiers of adapter complexity:

| Tier | Auth method | Example | Time |
|------|-------------|---------|------|
| **1** | Cookie (fetch directly) | Reddit, GitHub, V2EX | ~1 min |
| **2** | Bearer + CSRF token | Twitter, Zhihu | ~3 min |
| **3** | Webpack injection / Pinia store | Twitter search, Xiaohongshu | ~10 min |

We tested this: **20 AI agents ran in parallel, each independently reverse-engineered a website and produced a working adapter.** The marginal cost of adding a new website to the agent-accessible internet is approaching zero.

## What this means for AI agents

Without bb-browser, an AI agent's world is: **files + terminal + a few APIs with keys.**

With bb-browser: **files + terminal + the entire internet.**

An agent can now, in under a minute:

```bash
# Cross-platform research on any topic
bb-browser site arxiv/search "retrieval augmented generation"
bb-browser site twitter/search "RAG"
bb-browser site github search rag-framework
bb-browser site stackoverflow/search "RAG implementation"
bb-browser site zhihu/search "RAG"
bb-browser site 36kr/newsflash
```

Six platforms, six dimensions, structured JSON. Faster and broader than any human researcher.

## Also a full browser automation tool

```bash
bb-browser-api open https://example.com
bb-browser-api snapshot -i                # accessibility tree
bb-browser-api click @3                   # click element
bb-browser-api fill @5 "hello"            # fill input
bb-browser-api eval "document.title"      # run JS
bb-browser-api fetch URL --json           # authenticated fetch
bb-browser-api network requests --with-body --json  # capture traffic
bb-browser-api screenshot                 # take screenshot
```

All commands support `--json` output, `--jq <expr>` for inline filtering, and `--tab <id>` for concurrent multi-tab operations.

```bash
bb-browser-api site xueqiu/hot-stock 5 --jq '.items[] | {name, changePercent}'
# {"name":"云天化","changePercent":"2.08%"}
# {"name":"东吴股份","changePercent":"-7.60%"}

bb-browser-api site info xueqiu/stock   # view adapter args, example, domain
```

## HTTP API for programmatic access

The daemon exposes an HTTP API for direct integration. **Default port: `18888`** (changed from upstream's `19824`).

```bash
# Start daemon
bb-browser-api daemon start

# Fetch API — execute a request inside the browser context
curl -X POST http://localhost:18888/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/users/octocat",
    "method": "GET",
    "credentials": "include"
  }'

# Capture API — visit a URL and capture matching network requests
curl "http://localhost:18888/api/capture?url=https://example.com&pattern=api"

# Storage API — read cookies / localStorage / sessionStorage for a domain
curl "http://localhost:18888/api/storage?domain=example.com"
```

**Key advantage:** Executes in your real browser context with cookies and login state automatically included.

### Node.js example

```javascript
const response = await fetch('http://localhost:18888/api/fetch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.reddit.com/api/me.json',
    credentials: 'include',   // send cookies
  }),
});
const result = await response.json();
console.log(result.body);  // Your Reddit user data
```

### Python example

```python
import requests

response = requests.post('http://localhost:18888/api/fetch', json={
    'url': 'https://api.github.com/users/octocat',
})
result = response.json()
print(result['body'])
```

**Documentation:** [API Fetch Guide](docs/api-fetch.md) · [Capture & Storage Guide](docs/api-capture-storage.md)

## Daemon configuration

The daemon binds to `127.0.0.1:18888` by default. You can customize the host with `--host`:

```bash
bb-browser-api daemon --host 127.0.0.1    # IPv4 only (fix macOS IPv6 issues)
bb-browser-api daemon --host 0.0.0.0      # listen on all interfaces (for Tailscale / ZeroTier remote access)
```

## Architecture

```
AI Agent (Claude Code, Codex, Cursor, etc.)
       ┆ CLI or MCP (stdio)
       ▼
bb-browser CLI ──HTTP──▶ Daemon ──CDP WebSocket──▶ Your Real Browser
                           ┆
                    ┌──────┴──────┐
                    │ Per-tab     │
                    │ event cache │
                    │ (network,   │
                    │  console,   │
                    │  errors)    │
                    └─────────────┘
```

---

## What's Changed in This Fork

This fork ([skVPN/bb-browser-api](https://github.com/skVPN/bb-browser-api)) adds the following changes on top of the upstream [epiral/bb-browser](https://github.com/epiral/bb-browser):

### 1. Default port changed: `19824` → `18888`

**File:** `packages/shared/src/constants.ts`

```diff
- export const DAEMON_PORT = 19824;
+ export const DAEMON_PORT = 18888;
```

### 2. New HTTP API: `POST /api/fetch`

Execute an HTTP request inside the browser context (with cookies, login state, etc.).

**File:** `packages/daemon/src/http-server.ts`, `packages/daemon/src/command-dispatch.ts`

**Request:**
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | ✅ | Target URL |
| `method` | string | — | HTTP method, default `GET` |
| `headers` | object | — | Custom request headers |
| `credentials` | `omit` \| `same-origin` \| `include` | — | Cookie behavior, default `omit` |
| `body` | string | — | Request body (for POST/PUT) |
| `tabId` | string \| number | — | Specific tab to use |

**Response:**
```json
{
  "status": 200,
  "contentType": "application/json",
  "body": { ... }
}
```

> **Note on `credentials`:** `Sec-Fetch-*` headers are set by the browser automatically and cannot be overridden via JavaScript — this is a browser security requirement. The `credentials` field controls whether cookies are sent.

### 3. New HTTP API: `GET /api/capture`

Visit a URL and capture network requests matching a pattern.

**File:** `packages/daemon/src/http-server.ts`

```
GET http://localhost:18888/api/capture?url=https://example.com&pattern=api\.&timeout=5000
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | ✅ | Page URL to visit |
| `pattern` | — | Regex to filter captured requests |
| `timeout` | — | Wait time in ms, default `5000` |

**Response:**
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

### 4. New HTTP API: `GET /api/storage`

Read cookies, localStorage, and sessionStorage for a domain.

**File:** `packages/daemon/src/http-server.ts`

```
GET http://localhost:18888/api/storage?domain=example.com
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `domain` | ✅ | Domain to read storage from |

**Response:**
```json
{
  "cookies": [ { "name": "session", "value": "...", "domain": "example.com" } ],
  "localStorage": { "key": "value" },
  "sessionStorage": { "key": "value" }
}
```

### 5. `credentials` field added to `Request` protocol

**File:** `packages/shared/src/protocol.ts`

```typescript
export interface Request {
  // ...existing fields...
  /** fetch credentials option: omit | same-origin | include (default: omit) */
  credentials?: "omit" | "same-origin" | "include";
}
```

Previously the fetch implementation hardcoded `credentials: 'include'`. It now defaults to `'omit'` and respects the caller's choice.

---

## License

MIT
