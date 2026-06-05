# CDP URL 使用说明

## 新功能：连接到指定的 Chrome 实例

现在 `bb-browser-api` 支持连接到指定的 Chrome DevTools Protocol (CDP) URL，而不是自动发现本地 Chrome。

## 快速开始

### 基本用法

```bash
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 常见场景

#### 1. 连接到已启动的 Chrome

```bash
# 先启动 Chrome（Windows）
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# 然后连接
bb-browser-api daemon start --cdp-url http://localhost:9222
```

#### 2. 连接到 Docker 中的 Chrome

```bash
# 启动 Chrome 容器
docker run -d -p 9222:9222 zenika/alpine-chrome --remote-debugging-port=9222

# 连接
bb-browser-api daemon start --cdp-url http://localhost:9222
```

#### 3. 连接到远程 Chrome

```bash
bb-browser-api daemon start --cdp-url http://192.168.1.100:9222
```

## URL 格式

必须是完整的 HTTP URL：

✅ **正确**：
- `http://localhost:9222`
- `http://127.0.0.1:9222`
- `http://192.168.1.100:9222`

❌ **错误**：
- `localhost:9222` （缺少协议）
- `9222` （只有端口）

## 默认行为

如果不指定 `--cdp-url`，会自动发现或启动本地 Chrome。

## 环境变量

也可以使用环境变量：

```bash
# Windows
set BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start

# Linux/Mac
export BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start
```

## 安全提示

⚠️ **不要在公网暴露 CDP 端口！**

CDP 没有认证机制，任何人都可以完全控制浏览器。

**安全做法**：
- 只监听本地：`--remote-debugging-address=127.0.0.1`
- 使用 SSH 隧道访问远程 Chrome
- 配置防火墙规则

## 故障排除

### 无法连接

1. 确认 Chrome 正在运行：
   ```bash
   curl http://localhost:9222/json/version
   ```

2. 检查防火墙设置

3. 确认 Chrome 启动参数正确

### 端口被占用

```bash
# Windows
netstat -ano | findstr :9222

# Linux/Mac
lsof -i :9222
```

## 完整示例

```bash
# 1. 启动 Chrome
chrome --remote-debugging-port=9222

# 2. 启动 daemon
bb-browser-api daemon start --cdp-url http://localhost:9222

# 3. 使用
bb-browser-api open https://example.com
bb-browser-api get text
bb-browser-api screenshot
```

## 详细文档

查看完整文档：[docs/CDP_URL_USAGE.md](docs/CDP_URL_USAGE.md)

## 支持

如有问题，请提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
