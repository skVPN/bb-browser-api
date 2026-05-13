# 在浏览器中访问 Chrome

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| noVNC + Chrome | 完整 GUI，可视化操作 | 资源占用高 | 调试、演示、远程控制 |
| Chrome DevTools | 轻量，功能强大 | 只能调试，不能操作 | 开发调试 |
| Playwright Inspector | 专为自动化设计 | 需要 Playwright | 自动化测试 |
| Browserless | 云端浏览器服务 | 需要付费 | 生产环境 |

---

## 方案 1: noVNC + Chrome（推荐）

### 什么是 noVNC？

noVNC 是一个基于 HTML5 的 VNC 客户端，可以在浏览器中远程访问桌面环境。

### Docker 一键部署

#### 使用 selenium/standalone-chrome

```bash
# 启动带 VNC 的 Chrome 容器
docker run -d -p 4444:4444 -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  --name chrome-vnc \
  selenium/standalone-chrome:latest

# 访问方式：
# 1. VNC 界面：http://localhost:7900 (密码: secret)
# 2. CDP 端口：http://localhost:9222
# 3. Selenium：http://localhost:4444
```

#### 使用 browserless/chrome

```bash
# 启动 browserless（商业方案，功能更强）
docker run -d -p 3000:3000 -p 9222:9222 \
  --name browserless \
  browserless/chrome:latest

# 访问方式：
# 1. Web 界面：http://localhost:3000
# 2. CDP 端口：http://localhost:9222
```

### 连接 bb-browser-api

```bash
# 启动容器后，连接到 CDP
bb-browser-api daemon start --cdp-url http://localhost:9222

# 使用
bb-browser-api open https://example.com
```

### 完整示例

```bash
# 1. 启动 Chrome 容器（带 VNC）
docker run -d -p 4444:4444 -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  selenium/standalone-chrome:latest

# 2. 在浏览器中打开 VNC 界面
# 访问：http://localhost:7900
# 密码：secret

# 3. 连接 bb-browser-api
bb-browser-api daemon start --cdp-url http://localhost:9222

# 4. 操作 Chrome（在 VNC 界面中可以看到实时操作）
bb-browser-api open https://github.com
bb-browser-api snapshot
bb-browser-api screenshot
```

---

## 方案 2: Chrome DevTools Protocol UI

### 使用 Chrome DevTools

Chrome 自带的 DevTools 可以远程连接到其他 Chrome 实例。

#### 步骤：

```bash
# 1. 启动目标 Chrome（开启远程调试）
chrome --remote-debugging-port=9222

# 2. 在另一个 Chrome 中访问
chrome://inspect

# 3. 点击 "Configure" 添加：
localhost:9222

# 4. 在 "Remote Target" 中可以看到所有标签页
# 点击 "inspect" 即可调试
```

### 使用 chrome-remote-interface-inspector

```bash
# 安装
npm install -g chrome-remote-interface-inspector

# 启动
chrome-remote-interface-inspector --port 9222

# 访问：http://localhost:9223
```

---

## 方案 3: 自建 Web UI

### 使用 Puppeteer Recorder

```bash
# 安装
npm install -g @puppeteer/recorder

# 启动
puppeteer-recorder --port 9222

# 访问：http://localhost:8080
```

### 使用 Playwright Inspector

```bash
# 安装 Playwright
npm install -g playwright

# 启动 Inspector
PWDEBUG=1 playwright codegen https://example.com

# 会打开一个 Inspector 窗口，可以录制和调试
```

---

## 方案 4: Browserless（商业方案）

### 特点

- 完整的 Web UI
- 支持多用户
- 会话管理
- 录屏功能
- API 接口

### 部署

```bash
# Docker 部署
docker run -d -p 3000:3000 \
  -e "TOKEN=your-secret-token" \
  browserless/chrome:latest

# 访问：http://localhost:3000
```

### 功能

1. **Web 界面**：http://localhost:3000
2. **实时预览**：可以看到浏览器实时画面
3. **会话管理**：管理多个浏览器会话
4. **API 接口**：RESTful API
5. **录屏**：自动录制操作视频

---

## 方案 5: 自定义 Web UI（最灵活）

如果你想完全自定义，可以使用以下技术栈：

### 技术栈

- **后端**：Node.js + Puppeteer/Playwright
- **前端**：React/Vue + WebSocket
- **实时画面**：Canvas + WebSocket 传输截图

### 简单示例

```javascript
// server.js
const express = require('express');
const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

let browser, page;

// 启动浏览器
(async () => {
  browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222'
  });
  page = await browser.newPage();
})();

// WebSocket 连接
wss.on('connection', (ws) => {
  // 定时发送截图
  setInterval(async () => {
    if (page) {
      const screenshot = await page.screenshot({ encoding: 'base64' });
      ws.send(JSON.stringify({ type: 'screenshot', data: screenshot }));
    }
  }, 1000);

  // 接收命令
  ws.on('message', async (message) => {
    const cmd = JSON.parse(message);
    if (cmd.type === 'navigate') {
      await page.goto(cmd.url);
    } else if (cmd.type === 'click') {
      await page.click(cmd.selector);
    }
  });
});

app.listen(3000);
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Chrome Remote Control</title>
</head>
<body>
  <canvas id="screen"></canvas>
  <input id="url" placeholder="URL">
  <button onclick="navigate()">Go</button>

  <script>
    const ws = new WebSocket('ws://localhost:8080');
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'screenshot') {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = 'data:image/png;base64,' + msg.data;
      }
    };

    function navigate() {
      const url = document.getElementById('url').value;
      ws.send(JSON.stringify({ type: 'navigate', url }));
    }
  </script>
</body>
</html>
```

---

## 推荐方案总结

### 快速开始（最简单）

```bash
# 使用 selenium/standalone-chrome
docker run -d -p 7900:7900 -p 9222:9222 \
  --shm-size="2g" \
  selenium/standalone-chrome:latest

# 浏览器访问：http://localhost:7900 (密码: secret)
# bb-browser-api 连接：
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 生产环境（功能最强）

```bash
# 使用 browserless
docker run -d -p 3000:3000 -p 9222:9222 \
  -e "TOKEN=your-secret-token" \
  browserless/chrome:latest

# 浏览器访问：http://localhost:3000
```

### 开发调试（最轻量）

```bash
# 使用 Chrome DevTools
chrome --remote-debugging-port=9222

# 在另一个 Chrome 中访问：chrome://inspect
# 添加：localhost:9222
```

---

## Docker Compose 完整配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  chrome:
    image: selenium/standalone-chrome:latest
    ports:
      - "4444:4444"  # Selenium
      - "7900:7900"  # noVNC
      - "9222:9222"  # CDP
    shm_size: 2gb
    environment:
      - SE_VNC_NO_PASSWORD=1  # 不需要密码
      - SE_SCREEN_WIDTH=1920
      - SE_SCREEN_HEIGHT=1080

  bb-browser-api:
    image: node:18
    working_dir: /app
    command: >
      sh -c "npm install -g bb-browser-api &&
             bb-browser-api daemon start --cdp-url http://chrome:9222"
    depends_on:
      - chrome
    ports:
      - "18888:18888"  # bb-browser-api daemon
```

启动：

```bash
docker-compose up -d

# 访问 VNC：http://localhost:7900
# 使用 bb-browser-api：
curl http://localhost:18888/api/fetch -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}'
```

---

## 安全注意事项

1. **不要在公网暴露 VNC 端口**
   - 使用 SSH 隧道或 VPN
   - 配置防火墙规则

2. **设置强密码**
   ```bash
   docker run -d -p 7900:7900 \
     -e VNC_PASSWORD=your-strong-password \
     selenium/standalone-chrome
   ```

3. **使用 HTTPS**
   - 配置反向代理（Nginx/Caddy）
   - 启用 SSL/TLS

4. **限制访问 IP**
   ```bash
   # 只允许特定 IP 访问
   iptables -A INPUT -p tcp --dport 7900 -s 192.168.1.0/24 -j ACCEPT
   iptables -A INPUT -p tcp --dport 7900 -j DROP
   ```

---

## 相关资源

- [Selenium Docker Images](https://github.com/SeleniumHQ/docker-selenium)
- [Browserless](https://www.browserless.io/)
- [noVNC](https://novnc.com/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Puppeteer](https://pptr.dev/)
- [Playwright](https://playwright.dev/)

---

## 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
