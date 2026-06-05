# bb-browser Docker 部署方案总结

## 🎯 核心改进

### 1. 配置文件通过 volume 挂载

**之前：** 配置文件在构建时 COPY 到镜像
```dockerfile
COPY docker/supervisord.conf /etc/supervisor/conf.d/bb-browser.conf
```

**现在：** 配置文件通过 volume 挂载
```yaml
volumes:
  - ./docker/supervisord.conf:/etc/supervisor/conf.d/bb-browser.conf:ro
```

**优点：**
- ✅ 修改配置后只需 `docker compose restart`，不需要重新构建镜像
- ✅ 更灵活，方便调试和修改
- ✅ 启动时自动检测并修复 CRLF 换行符问题

### 2. 自动修复换行符

`entrypoint.sh` 在启动时自动检测并转换 CRLF 为 LF：

```bash
if file "$CONF_FILE" 2>/dev/null | grep -q "CRLF"; then
    echo "[startup] ⚠️  检测到 CRLF 换行符，自动转换为 LF..."
    sed -i 's/\r$//' "$CONF_FILE"
    echo "[startup] ✅ 换行符转换完成"
fi
```

**好处：**
- 即使在 Windows 上编辑了配置文件，容器启动时也会自动修复
- 不需要手动转换换行符
- 防止 supervisord 解析错误

## 📦 部署架构

```
宿主机                          容器内
─────────────────────────────────────────────────
./docker/supervisord.conf  →  /etc/supervisor/conf.d/bb-browser.conf
./docker/entrypoint.sh     →  /entrypoint.sh
./docker/start-x11vnc.sh   →  /start-x11vnc.sh
./                         →  /app (代码)
```

## 🚀 部署流程

### 首次部署

```bash
# 1. 克隆代码
git clone https://github.com/skVPN/bb-browser-api.git
cd bb-browser-api

# 2. 构建镜像（只需一次）
docker compose build

# 3. 启动容器
docker compose up -d

# 4. 查看日志
docker compose logs -f bb-browser
```

### 修改配置后

```bash
# 1. 编辑配置文件
vim docker/supervisord.conf

# 2. 转换换行符（如果在 Windows 上编辑）
sed -i 's/\r$//' docker/supervisord.conf

# 3. 重启容器即可生效
docker compose restart bb-browser
```

**不需要重新构建镜像！**

### 修复 CRLF 问题

如果遇到 supervisord 解析错误：

```bash
cd /path/to/bb-browser
git pull
bash fix-and-redeploy.sh
```

## 🔧 工具和脚本

### 1. validate-supervisord-strict.py

本地校验配置文件：

```bash
python validate-supervisord-strict.py docker/supervisord.conf
```

检查项：
- ✅ 语法解析
- ✅ environment 字段不能有引号
- ✅ command 字段必须在一行
- ✅ 必需字段检查

### 2. diagnose-supervisord.sh

服务器端诊断脚本：

```bash
bash diagnose-supervisord.sh
```

诊断内容：
- 本地文件换行符
- 容器内配置文件
- supervisord 进程状态
- Git 状态

### 3. fix-and-redeploy.sh

一键修复并重新部署：

```bash
bash fix-and-redeploy.sh
```

自动执行：
1. 拉取最新代码
2. 转换换行符
3. 验证配置文件
4. 重启容器

## 📊 服务验证

### 检查服务状态

```bash
docker compose exec bb-browser supervisorctl status
```

应该看到 6 个服务都是 `RUNNING`：

```
xvfb        RUNNING   pid 123, uptime 0:01:00
fluxbox     RUNNING   pid 124, uptime 0:01:00
x11vnc      RUNNING   pid 125, uptime 0:01:00
novnc       RUNNING   pid 126, uptime 0:01:00
chromium    RUNNING   pid 127, uptime 0:01:00
bb-daemon   RUNNING   pid 128, uptime 0:01:00
```

### 访问服务

- **noVNC 网页**：http://your-server:6080/vnc.html
- **API 接口**：http://your-server:18888

### 查看日志

```bash
# 实时日志
docker compose logs -f bb-browser

# 最近 100 行
docker compose logs --tail=100 bb-browser

# 特定服务的日志
docker compose exec bb-browser supervisorctl tail -f bb-daemon
```

## 🛡️ 预防措施

### 1. .gitattributes

强制 Docker 配置文件使用 LF 换行符：

```
docker/supervisord.conf text eol=lf
docker/*.sh text eol=lf
*.sh text eol=lf
```

### 2. VS Code 配置

`.vscode/settings.json`：

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

### 3. 编辑器设置

- **VS Code**：右下角点击 "CRLF" → 选择 "LF"
- **Vim**：`:set fileformat=unix`
- **Sublime Text**：View → Line Endings → Unix

## 📚 相关文档

- [QUICK_FIX.md](./QUICK_FIX.md) - 快速修复指南
- [SUPERVISORD_EXPLAINED.md](./SUPERVISORD_EXPLAINED.md) - 详细的问题说明
- [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) - 配置文件校验指南

## 🔄 更新流程

### 拉取最新代码

```bash
cd /path/to/bb-browser
git pull
docker compose restart bb-browser
```

### 重新构建镜像（依赖变化时）

```bash
docker compose down
docker compose build
docker compose up -d
```

## ⚠️ 常见问题

### Q: 为什么要用 volume 挂载配置文件？

A: 
- 修改配置后只需 restart，不需要重新构建镜像（节省时间）
- 更灵活，方便调试和修改
- 启动时自动修复 CRLF 问题

### Q: 如果配置文件有语法错误怎么办？

A: 
1. 使用 `validate-supervisord-strict.py` 本地验证
2. 查看容器日志：`docker compose logs bb-browser`
3. 修复后 `docker compose restart bb-browser`

### Q: 为什么有时候需要 `--no-cache`？

A: 现在不需要了！配置文件通过 volume 挂载，修改后直接 restart 即可。

### Q: 如何确认容器内的配置文件是否正确？

```bash
# 查看配置文件
docker compose exec bb-browser cat /etc/supervisor/conf.d/bb-browser.conf

# 检查换行符
docker compose exec bb-browser file /etc/supervisor/conf.d/bb-browser.conf
```

## 🎉 总结

通过将配置文件改为 volume 挂载，我们实现了：

1. ✅ **更快的迭代**：修改配置后只需 restart
2. ✅ **自动修复**：启动时自动转换 CRLF 为 LF
3. ✅ **更灵活**：方便调试和修改配置
4. ✅ **更可靠**：减少了构建镜像的次数，降低了出错概率

现在你可以放心地在 Windows 上编辑配置文件，容器启动时会自动处理换行符问题！
