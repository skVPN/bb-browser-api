# supervisord 配置错误详解

## 错误信息

```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
  [line 62]: '"\n'
```

## 问题原因

这个错误有两个可能的原因：

### 1. 换行符问题（最常见）

**症状：** Windows 上编辑的文件使用 CRLF（`\r\n`）换行符，但 Linux 容器需要 LF（`\n`）

**解决方案：**

```bash
# 方法 1：使用 dos2unix（推荐）
dos2unix docker/supervisord.conf

# 方法 2：使用 sed
sed -i 's/\r$//' docker/supervisord.conf

# 方法 3：使用 Python
python3 -c "import sys; data = open('docker/supervisord.conf', 'rb').read(); open('docker/supervisord.conf', 'wb').write(data.replace(b'\r\n', b'\n'))"
```

### 2. environment 字段包含引号

**错误示例：**

```ini
[program:fluxbox]
environment="DISPLAY=:99"  # ❌ 错误：有引号
```

**正确写法：**

```ini
[program:fluxbox]
environment=DISPLAY=:99  # ✅ 正确：无引号
```

**多个环境变量：**

```ini
environment=DISPLAY=:99,NODE_ENV=production,PATH=/usr/local/bin:/usr/bin
```

## 快速诊断

### 在服务器上运行：

```bash
# 1. 诊断问题
bash diagnose-supervisord.sh

# 2. 快速修复并重新部署
bash fix-and-redeploy.sh
```

### 手动检查：

```bash
# 检查本地文件换行符
file docker/supervisord.conf
# 应该显示：ASCII text
# 如果显示：ASCII text, with CRLF line terminators，说明需要转换

# 检查是否有引号
grep 'environment=.*"' docker/supervisord.conf
# 如果有输出，说明有引号需要移除

# 查看第 62 行附近的内容
sed -n '60,65p' docker/supervisord.conf
```

## 完整修复流程

### 步骤 1：在服务器上拉取最新代码

```bash
cd /path/to/bb-browser
git pull
```

### 步骤 2：转换换行符

```bash
# 使用 dos2unix（需要安装）
sudo apt-get install dos2unix
dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh

# 或使用 sed
sed -i 's/\r$//' docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
```

### 步骤 3：验证配置

```bash
# 使用 Python 验证工具
python3 validate-supervisord-strict.py docker/supervisord.conf

# 或手动验证
grep 'environment=.*"' docker/supervisord.conf  # 应该无输出
file docker/supervisord.conf  # 应该显示 ASCII text（无 CRLF）
```

### 步骤 4：重新构建并启动

```bash
# 停止容器
docker compose down

# 重新构建镜像（使用 --no-cache 确保使用最新文件）
docker compose build --no-cache

# 启动容器
docker compose up -d

# 查看日志
docker compose logs -f bb-browser
```

### 步骤 5：验证服务

```bash
# 检查 supervisord 状态
docker compose exec bb-browser supervisorctl status

# 应该看到 6 个服务都是 RUNNING：
# xvfb                             RUNNING   pid 123, uptime 0:01:00
# fluxbox                          RUNNING   pid 124, uptime 0:01:00
# x11vnc                           RUNNING   pid 125, uptime 0:01:00
# novnc                            RUNNING   pid 126, uptime 0:01:00
# chromium                         RUNNING   pid 127, uptime 0:01:00
# bb-daemon                        RUNNING   pid 128, uptime 0:01:00
```

## 为什么会出现这个问题？

### Docker 构建过程

```
本地文件（Windows CRLF）
    ↓
COPY 到镜像（保持 CRLF）
    ↓
容器启动时 supervisord 读取配置
    ↓
Linux 的 supervisord 无法正确解析 CRLF
    ↓
报错：parsing errors
```

### 解决方案

1. **在 COPY 之前转换**（推荐）：在本地转换为 LF，然后 COPY 到镜像
2. **在 Dockerfile 中转换**：COPY 后使用 RUN 命令转换
3. **使用 .gitattributes**：强制 Git 使用 LF

## 预防措施

### 1. 添加 .gitattributes

```
# .gitattributes
docker/supervisord.conf text eol=lf
docker/*.sh text eol=lf
*.sh text eol=lf
```

### 2. 配置编辑器

**VS Code：**

```json
{
  "files.eol": "\n",
  "[shellscript]": {
    "files.eol": "\n"
  },
  "[properties]": {
    "files.eol": "\n"
  }
}
```

**Vim：**

```vim
:set fileformat=unix
```

**Sublime Text：**

```
View → Line Endings → Unix
```

### 3. Git 钩子

在 `.git/hooks/pre-commit` 中添加：

```bash
#!/bin/bash
# 检查 Docker 配置文件的换行符
if git diff --cached --name-only | grep -q "docker/"; then
    for file in docker/supervisord.conf docker/*.sh; do
        if [ -f "$file" ] && file "$file" | grep -q CRLF; then
            echo "错误: $file 使用 CRLF 换行符"
            echo "请运行: dos2unix $file"
            exit 1
        fi
    done
fi
```

## 常见问题

### Q: 为什么本地验证通过，但容器内还是报错？

A: 可能原因：
1. 容器使用的是旧镜像，需要 `docker compose build --no-cache`
2. 文件在 Git 传输过程中被转换，需要配置 `.gitattributes`
3. 编辑器自动转换了换行符，需要配置编辑器

### Q: 如何确认容器内的文件是否正确？

```bash
# 查看容器内配置文件
docker compose exec bb-browser cat /etc/supervisor/conf.d/bb-browser.conf | head -70

# 检查换行符（在容器内）
docker compose exec bb-browser file /etc/supervisor/conf.d/bb-browser.conf

# 检查是否有引号
docker compose exec bb-browser grep 'environment=.*"' /etc/supervisor/conf.d/bb-browser.conf
```

### Q: 为什么 `--no-cache` 很重要？

Docker 的层缓存可能导致使用旧文件。`--no-cache` 强制重新执行所有 COPY 命令，确保使用最新文件。

## 参考资料

- [Supervisor Configuration](http://supervisord.org/configuration.html)
- [Line Endings in Git](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings)
- [Docker COPY Command](https://docs.docker.com/engine/reference/builder/#copy)
