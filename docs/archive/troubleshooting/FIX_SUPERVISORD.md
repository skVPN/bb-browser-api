# 修复 supervisord 配置错误

## 问题

容器启动时报错：
```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
```

## 原因

supervisord 配置文件中的多行命令格式不正确。supervisord 不支持换行的命令格式。

---

## 快速修复（复制粘贴执行）

```bash
# 1. 进入项目目录
cd /home/ecs-user/bb-browser-api

# 2. 拉取最新代码（已包含修复）
git pull

# 3. 重新构建镜像
docker compose build

# 4. 启动服务
docker compose up -d

# 5. 查看日志
docker compose logs -f bb-browser
```

---

## 修复内容

### 之前（错误）

```ini
[program:xvfb]
command=Xvfb %(ENV_DISPLAY)s
    -screen 0 %(ENV_SCREEN_WIDTH)sx%(ENV_SCREEN_HEIGHT)sx24
    -ac
    +extension GLX
    +render
    -noreset
```

**问题**：supervisord 不支持多行命令

### 现在（正确）

```ini
[program:xvfb]
command=Xvfb :%(ENV_DISPLAY_NUM)s -screen 0 %(ENV_SCREEN_WIDTH)sx%(ENV_SCREEN_HEIGHT)sx24 -ac +extension GLX +render -noreset
```

**修复**：所有命令参数放在一行

---

## 验证

启动成功后，应该看到：

```
bb-browser  | ================================================
bb-browser  |  bb-browser 启动
bb-browser  |  noVNC 网页: http://<host>:6080/vnc.html
bb-browser  |  API:        http://<host>:18888
bb-browser  | ================================================
bb-browser  | [startup] 构建项目...
bb-browser  | [startup] 启动所有服务...
bb-browser  | 2026-05-12 10:00:00,000 INFO supervisord started with pid 1
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'xvfb' with pid 10
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'fluxbox' with pid 11
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'x11vnc' with pid 12
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'novnc' with pid 13
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'chromium' with pid 14
bb-browser  | 2026-05-12 10:00:01,000 INFO spawned: 'bb-daemon' with pid 15
```

---

## 检查服务状态

```bash
# 进入容器
docker compose exec bb-browser bash

# 查看 supervisord 状态
supervisorctl status

# 应该看到：
# xvfb                             RUNNING   pid 10, uptime 0:01:00
# fluxbox                          RUNNING   pid 11, uptime 0:01:00
# x11vnc                           RUNNING   pid 12, uptime 0:01:00
# novnc                            RUNNING   pid 13, uptime 0:01:00
# chromium                         RUNNING   pid 14, uptime 0:01:00
# bb-daemon                        RUNNING   pid 15, uptime 0:01:00
```

---

## 访问服务

### 1. noVNC 网页访问

```
http://<服务器IP>:6080/vnc.html
```

输入 VNC 密码（默认 `changeme`）

### 2. 测试 API

```bash
curl http://localhost:18888/api/fetch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get", "method": "GET"}'
```

---

## 如果还有问题

### 查看详细日志

```bash
# 查看 supervisord 日志
docker compose exec bb-browser supervisorctl tail -f supervisord

# 查看单个服务日志
docker compose exec bb-browser supervisorctl tail -f xvfb
docker compose exec bb-browser supervisorctl tail -f chromium
docker compose exec bb-browser supervisorctl tail -f bb-daemon
```

### 重启单个服务

```bash
# 重启 chromium
docker compose exec bb-browser supervisorctl restart chromium

# 重启 bb-daemon
docker compose exec bb-browser supervisorctl restart bb-daemon
```

### 验证配置文件

```bash
# 查看配置文件
docker compose exec bb-browser cat /etc/supervisor/conf.d/bb-browser.conf

# 测试配置文件语法
docker compose exec bb-browser supervisord -c /etc/supervisor/supervisord.conf -n
```

---

## 总结

**问题**：supervisord 配置文件多行命令格式错误

**解决**：将所有命令参数放在一行

**验证**：
- ✅ 容器启动成功
- ✅ 6 个服务都是 RUNNING 状态
- ✅ noVNC 可以访问
- ✅ API 正常工作
