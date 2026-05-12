# 快速修复 supervisord 配置错误

## 错误信息

```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
  [line 62]: '"\n'
```

## 在服务器上执行以下命令

### 方法 1：一键修复（推荐）

```bash
cd /path/to/bb-browser
git pull
bash fix-and-redeploy.sh
```

这个脚本会自动：
1. ✅ 拉取最新代码
2. ✅ 转换换行符为 LF
3. ✅ 验证配置文件
4. ✅ 停止容器
5. ✅ 重新构建镜像（使用 --no-cache）
6. ✅ 启动容器
7. ✅ 显示服务状态

### 方法 2：手动修复

```bash
# 1. 拉取最新代码
cd /path/to/bb-browser
git pull

# 2. 转换换行符
dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
# 如果没有 dos2unix，使用 sed：
# sed -i 's/\r$//' docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh

# 3. 重新构建并启动
docker compose down
docker compose build --no-cache
docker compose up -d

# 4. 查看日志
docker compose logs -f bb-browser
```

## 验证服务

```bash
# 检查 supervisord 状态
docker compose exec bb-browser supervisorctl status

# 应该看到 6 个服务都是 RUNNING：
# xvfb        RUNNING   pid 123, uptime 0:01:00
# fluxbox     RUNNING   pid 124, uptime 0:01:00
# x11vnc      RUNNING   pid 125, uptime 0:01:00
# novnc       RUNNING   pid 126, uptime 0:01:00
# chromium    RUNNING   pid 127, uptime 0:01:00
# bb-daemon   RUNNING   pid 128, uptime 0:01:00
```

## 访问服务

- **noVNC 网页**：http://your-server:6080/vnc.html
- **API 接口**：http://your-server:18888

## 诊断工具

如果问题仍然存在，运行诊断脚本：

```bash
bash diagnose-supervisord.sh
```

## 详细说明

- 📖 [SUPERVISORD_EXPLAINED.md](./SUPERVISORD_EXPLAINED.md) - 详细的问题说明和解决方案
- 📖 [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) - 配置文件校验指南

## 问题原因

Windows 上编辑的文件使用 CRLF（`\r\n`）换行符，但 Linux 容器需要 LF（`\n`）换行符。

## 预防措施

已添加 `.gitattributes` 文件，强制 Docker 配置文件使用 LF 换行符。
