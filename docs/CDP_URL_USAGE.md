# 使用自定义 CDP URL

## 功能说明

`bb-browser-api` 现在支持连接到指定的 Chrome DevTools Protocol (CDP) URL 和端口，而不是自动发现本地 Chrome 实例。

## 使用方法

### 基本用法

```bash
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 连接到远程 Chrome

```bash
bb-browser-api daemon start --cdp-url http://192.168.1.100:9222
```

### 连接到不同端口

```bash
bb-browser-api daemon start --cdp-url http://localhost:9223
```

## 使用场景

### 1. 连接到已启动的 Chrome 实例

如果你已经手动启动了 Chrome 并指定了调试端口：

```bash
# 启动 Chrome（Windows）
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# 连接到该 Chrome 实例
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 2. 连接到 Docker 容器中的 Chrome

```bash
# 启动 Chrome 容器
docker run -d -p 9222:9222 \
  --name chrome \
  zenika/alpine-chrome \
  --no-sandbox \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222

# 连接到容器中的 Chrome
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 3. 连接到远程服务器上的 Chrome

```bash
# 在远程服务器上启动 Chrome
ssh user@remote-server "google-chrome --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0"

# 本地连接到远程 Chrome
bb-browser-api daemon start --cdp-url http://remote-server:9222
```

### 4. 使用 SSH 隧道连接

```bash
# 创建 SSH 隧道
ssh -L 9222:localhost:9222 user@remote-server

# 连接到隧道
bb-browser-api daemon start --cdp-url http://localhost:9222
```

## URL 格式

CDP URL 必须是完整的 HTTP URL：

### 正确格式 ✅

```bash
http://localhost:9222
http://127.0.0.1:9222
http://192.168.1.100:9222
http://chrome-server:9222
```

### 错误格式 ❌

```bash
localhost:9222          # 缺少协议
9222                    # 只有端口号
chrome://localhost:9222 # 错误的协议
```

## 默认行为

如果不指定 `--cdp-url` 参数，`bb-browser-api` 会：

1. 尝试自动发现本地运行的 Chrome 实例
2. 如果找不到，会自动启动 Chrome
3. 使用默认端口 19825

## 环境变量

你也可以使用环境变量设置 CDP URL：

```bash
# Windows
set BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start

# Linux/Mac
export BB_BROWSER_CDP_URL=http://localhost:9222
bb-browser-api daemon start
```

**注意**：命令行参数 `--cdp-url` 优先级高于环境变量。

## 故障排除

### 错误：Invalid CDP URL

**原因**：CDP URL 格式不正确

**解决**：确保 URL 格式为 `http://host:port`

```bash
# 错误
bb-browser-api daemon start --cdp-url localhost:9222

# 正确
bb-browser-api daemon start --cdp-url http://localhost:9222
```

### 错误：Cannot connect to CDP

**原因**：Chrome 未在指定端口运行，或端口被防火墙阻止

**解决**：

1. 确认 Chrome 正在运行：
   ```bash
   curl http://localhost:9222/json/version
   ```

2. 检查防火墙设置

3. 确认 Chrome 启动参数正确：
   ```bash
   --remote-debugging-port=9222
   --remote-debugging-address=0.0.0.0  # 允许远程连接
   ```

### 错误：Connection refused

**原因**：端口未开放或 Chrome 未监听该端口

**解决**：

1. 检查端口是否被占用：
   ```bash
   # Windows
   netstat -ano | findstr :9222
   
   # Linux/Mac
   lsof -i :9222
   ```

2. 重启 Chrome 并确保使用正确的端口

## 安全注意事项

### 1. 不要在公网暴露 CDP 端口

CDP 协议没有内置认证机制，任何能访问该端口的人都可以完全控制浏览器。

**不安全** ❌：
```bash
chrome --remote-debugging-address=0.0.0.0 --remote-debugging-port=9222
```

**安全** ✅：
```bash
# 只监听本地
chrome --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222

# 或使用 SSH 隧道访问远程 Chrome
ssh -L 9222:localhost:9222 user@remote-server
```

### 2. 使用防火墙

确保 CDP 端口只对可信 IP 开放：

```bash
# Linux (iptables)
iptables -A INPUT -p tcp --dport 9222 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 9222 -j DROP

# Windows (防火墙规则)
netsh advfirewall firewall add rule name="Chrome CDP" dir=in action=allow protocol=TCP localport=9222 remoteip=192.168.1.0/24
```

### 3. 使用专用 Chrome 实例

不要在用于日常浏览的 Chrome 实例上开启远程调试：

```bash
# 使用独立的用户数据目录
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

## 示例：完整工作流

### 本地开发

```bash
# 1. 启动 Chrome（调试模式）
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# 2. 启动 bb-browser-api daemon
bb-browser-api daemon start --cdp-url http://localhost:9222

# 3. 使用 bb-browser-api
bb-browser-api open https://example.com
bb-browser-api get text
```

### Docker 环境

```bash
# 1. 启动 Chrome 容器
docker run -d -p 9222:9222 \
  --name chrome \
  --shm-size=2gb \
  zenika/alpine-chrome \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222

# 2. 启动 bb-browser-api daemon
bb-browser-api daemon start --cdp-url http://localhost:9222

# 3. 使用 bb-browser-api
bb-browser-api site list
```

### CI/CD 环境

```yaml
# .github/workflows/test.yml
name: Test
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start Chrome
        run: |
          google-chrome --headless \
            --remote-debugging-port=9222 \
            --remote-debugging-address=0.0.0.0 \
            --no-sandbox \
            --disable-dev-shm-usage &
          sleep 5
      
      - name: Install bb-browser-api
        run: npm install -g bb-browser-api
      
      - name: Start daemon
        run: bb-browser-api daemon start --cdp-url http://localhost:9222
      
      - name: Run tests
        run: |
          bb-browser-api open https://example.com
          bb-browser-api get text
```

## 相关文档

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome 远程调试](https://developer.chrome.com/docs/devtools/remote-debugging/)
- [bb-browser-api 文档](../README.md)

## 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
