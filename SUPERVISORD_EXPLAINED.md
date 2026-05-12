# supervisord.conf 作用说明

## supervisord 是什么？

**supervisord** 是一个进程管理工具，用于在 Docker 容器中管理多个后台进程。

### 为什么需要它？

Docker 容器通常只运行一个主进程，但 bb-browser 需要同时运行 **6 个进程**：

```
1. Xvfb        - 虚拟显示器
2. fluxbox     - 窗口管理器
3. x11vnc      - VNC 服务器
4. noVNC       - 网页 VNC 客户端
5. Chromium    - 浏览器
6. bb-daemon   - bb-browser HTTP API 服务
```

supervisord 负责：
- ✅ 启动所有进程
- ✅ 监控进程状态
- ✅ 自动重启崩溃的进程
- ✅ 管理进程启动顺序（通过 priority）
- ✅ 收集进程日志

---

## 配置文件结构

### 1. supervisord 主配置

```ini
[supervisord]
nodaemon=true              # 前台运行（Docker 需要）
logfile=/dev/null          # 日志输出到 stdout
pidfile=/tmp/supervisord.pid
user=root
```

### 2. 进程配置（以 xvfb 为例）

```ini
[program:xvfb]
command=Xvfb :99 -screen 0 1280x900x24 -ac +extension GLX +render -noreset
autostart=true             # 自动启动
autorestart=true           # 崩溃后自动重启
startretries=3             # 重试次数
startsecs=2                # 启动成功的判断时间
stdout_logfile=/dev/stdout # 标准输出
stderr_logfile=/dev/stderr # 错误输出
priority=10                # 启动优先级（数字越小越先启动）
```

---

## 6 个进程的作用

### 1. Xvfb (priority=10)

**作用**：创建虚拟显示器

```
Xvfb :99 -screen 0 1280x900x24
```

- `:99` - 显示器编号
- `1280x900x24` - 分辨率和色深
- Chrome 在这个虚拟屏幕上渲染画面

**为什么需要**：Chrome 需要图形界面，但 Docker 容器没有真实显示器

---

### 2. fluxbox (priority=20)

**作用**：轻量级窗口管理器

```
fluxbox
```

**为什么需要**：Chrome 需要窗口管理器才能正常渲染

---

### 3. x11vnc (priority=30)

**作用**：VNC 服务器，把虚拟显示器的画面通过 VNC 协议暴露出去

```bash
x11vnc -display :99 -forever -shared -rfbport 5900
```

- `-display :99` - 连接到 Xvfb 虚拟显示器
- `-forever` - 持续运行
- `-shared` - 允许多个客户端连接
- `-rfbport 5900` - VNC 端口

**为什么需要**：让外部可以看到 Chrome 的画面

---

### 4. noVNC (priority=40)

**作用**：网页 VNC 客户端，把 VNC 转成 WebSocket

```
websockify --web /usr/share/novnc 6080 127.0.0.1:5900
```

- `6080` - WebSocket 端口
- `127.0.0.1:5900` - 连接到 x11vnc

**为什么需要**：让浏览器可以直接访问 VNC（不需要 VNC 客户端软件）

---

### 5. Chromium (priority=50)

**作用**：运行在虚拟显示器上的 Chrome 浏览器

```
chromium --no-sandbox --remote-debugging-port=9222 ...
```

- `--no-sandbox` - 禁用沙箱（Docker 容器需要）
- `--remote-debugging-port=9222` - 开启 CDP 远程调试
- `--user-data-dir=/data/chrome-profile` - 用户数据目录

**为什么需要**：这是 bb-browser 控制的浏览器

---

### 6. bb-daemon (priority=60)

**作用**：bb-browser HTTP API 服务

```
node /app/dist/daemon.js --host 0.0.0.0 --port 18888
```

- `--host 0.0.0.0` - 监听所有网卡
- `--port 18888` - HTTP API 端口
- `--cdp-port 9222` - 连接到 Chrome 的 CDP 端口

**为什么需要**：提供 HTTP API 接口，让外部可以控制 Chrome

---

## 启动顺序

```
priority=10  Xvfb        ← 先启动虚拟显示器
priority=20  fluxbox     ← 再启动窗口管理器
priority=30  x11vnc      ← 然后启动 VNC 服务器
priority=40  noVNC       ← 启动网页 VNC 客户端
priority=50  Chromium    ← 启动 Chrome（需要前面的都准备好）
priority=60  bb-daemon   ← 最后启动 API 服务（需要 Chrome 准备好）
```

---

## 架构图

```
用户浏览器
    ↓
http://host:6080/vnc.html (noVNC 网页)
    ↓
WebSocket (port 6080)
    ↓
websockify (noVNC)
    ↓
VNC (port 5900)
    ↓
x11vnc (VNC 服务器)
    ↓
Xvfb :99 (虚拟显示器)
    ↓
Chromium (浏览器) ←─── CDP (port 9222) ←─── bb-daemon (port 18888)
    ↑                                              ↑
fluxbox (窗口管理器)                          HTTP API
```

---

## 常用命令

### 查看所有进程状态

```bash
docker compose exec bb-browser supervisorctl status
```

输出：
```
xvfb                             RUNNING   pid 10, uptime 0:01:00
fluxbox                          RUNNING   pid 11, uptime 0:01:00
x11vnc                           RUNNING   pid 12, uptime 0:01:00
novnc                            RUNNING   pid 13, uptime 0:01:00
chromium                         RUNNING   pid 14, uptime 0:01:00
bb-daemon                        RUNNING   pid 15, uptime 0:01:00
```

### 重启单个进程

```bash
docker compose exec bb-browser supervisorctl restart chromium
docker compose exec bb-browser supervisorctl restart bb-daemon
```

### 查看进程日志

```bash
docker compose exec bb-browser supervisorctl tail -f chromium
docker compose exec bb-browser supervisorctl tail -f bb-daemon
```

### 停止/启动进程

```bash
docker compose exec bb-browser supervisorctl stop chromium
docker compose exec bb-browser supervisorctl start chromium
```

---

## 配置文件语法错误

### 常见错误

#### 1. 多行命令格式错误

❌ **错误**：
```ini
command=chromium
    --no-sandbox
    --disable-dev-shm-usage
```

✅ **正确**：
```ini
command=chromium --no-sandbox --disable-dev-shm-usage
```

#### 2. 引号嵌套问题

❌ **错误**：
```ini
command=/bin/sh -c "if [ -n \"$VAR\" ]; then echo \"test\"; fi"
```

✅ **正确**：使用独立脚本
```ini
command=/bin/sh /start-script.sh
```

#### 3. 环境变量引用

✅ **正确**：
```ini
command=Xvfb :%(ENV_DISPLAY_NUM)s
environment=DISPLAY=":%(ENV_DISPLAY_NUM)s"
```

---

## 为什么使用独立脚本？

### 之前（有问题）

```ini
[program:x11vnc]
command=/bin/sh -c "if [ -n \"$VNC_PASSWORD\" ]; then x11vnc ...; else x11vnc ...; fi"
```

**问题**：
- 引号嵌套复杂
- supervisord 解析困难
- 容易出现语法错误

### 现在（可靠）

```ini
[program:x11vnc]
command=/bin/sh /start-x11vnc.sh
```

```bash
# /start-x11vnc.sh
#!/bin/sh
if [ -n "$VNC_PASSWORD" ]; then
    x11vnc -storepasswd "$VNC_PASSWORD" /tmp/vncpass
    exec x11vnc -rfbauth /tmp/vncpass ...
else
    exec x11vnc -nopw ...
fi
```

**优点**：
- ✅ 语法清晰
- ✅ 易于调试
- ✅ 可以单独测试

---

## 总结

| 组件 | 作用 | 端口 | 依赖 |
|------|------|------|------|
| Xvfb | 虚拟显示器 | - | - |
| fluxbox | 窗口管理器 | - | Xvfb |
| x11vnc | VNC 服务器 | 5900 | Xvfb |
| noVNC | 网页 VNC 客户端 | 6080 | x11vnc |
| Chromium | 浏览器 | 9222 (CDP) | Xvfb, fluxbox |
| bb-daemon | HTTP API | 18888 | Chromium |

**supervisord.conf 的作用**：
- 管理这 6 个进程的生命周期
- 确保它们按正确顺序启动
- 自动重启崩溃的进程
- 收集所有进程的日志

**靠谱吗**：
- ✅ supervisord 是成熟的进程管理工具
- ✅ 被广泛用于 Docker 多进程场景
- ✅ 配置简单，易于调试
- ✅ 现在使用独立脚本，避免了引号嵌套问题
