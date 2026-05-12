# 快速修复 supervisord 配置错误

## 错误信息

```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
  [line 62]: '"\n'
```

## ✨ 新方案：配置文件通过 volume 挂载

从现在开始，`supervisord.conf` 通过 volume 挂载，**修改配置后只需 restart，不需要重新构建镜像**。

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
4. ✅ 重启容器（不需要重新构建）

### 方法 2：手动修复

```bash
# 1. 拉取最新代码
cd /path/to/bb-browser
git pull

# 2. 转换换行符
dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
# 如果没有 dos2unix，使用 sed：
# sed -i 's/\r$//' docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh

# 3. 重启容器（配置文件会自动重新挂载）
docker compose restart bb-browser

# 4. 查看日志
docker compose logs -f bb-browser
```

## 🎯 配置文件修改流程（新）

以后修改 `docker/supervisord.conf` 后：

```bash
# 1. 转换换行符（如果在 Windows 上编辑）
sed -i 's/\r$//' docker/supervisord.conf

# 2. 重启容器即可生效
docker compose restart bb-browser
```

**不需要重新构建镜像！**

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
