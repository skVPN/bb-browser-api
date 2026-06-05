# 浏览器检测问题快速修复指南

## 问题症状

```
bb-browser: Cannot find a Chromium-based browser.
```

## 快速诊断（30 秒）

```bash
# 进入容器
docker compose exec bb-browser bash

# 运行诊断
bash /diagnose-browser.sh
```

## 快速修复（3 种方法）

### 方法 1：使用环境变量（最快，0 分钟）

编辑 `docker-compose.yml`：

```yaml
environment:
  - BB_BROWSER_CDP_URL=http://127.0.0.1:9222
```

重启：
```bash
docker compose restart
```

### 方法 2：升级到修复版本（推荐，5 分钟）

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
pnpm build

# 3. 重新构建镜像
docker compose build

# 4. 重启
docker compose restart

# 5. 验证
docker compose exec bb-browser bb-browser-api daemon status
```

### 方法 3：手动启动 Chrome（临时方案，1 分钟）

```bash
# 进入容器
docker compose exec bb-browser bash

# 手动启动 Chrome
chromium --remote-debugging-port=9222 --no-sandbox --disable-dev-shm-usage &

# 启动 daemon
bb-browser-api daemon start
```

## 验证修复

```bash
# 测试 daemon
docker compose exec bb-browser bb-browser-api daemon status

# 运行完整测试
docker compose exec bb-browser bash /app/test/test-browser-detection.sh
```

## 常见问题

### Q1: 诊断脚本显示 "✓ 找到: /usr/bin/chromium"，但 daemon 仍启动失败

**A**: 检查 CDP 端口是否可访问：

```bash
docker compose exec bb-browser curl http://127.0.0.1:9222/json/version
```

如果失败，检查 Chrome 是否运行：

```bash
docker compose exec bb-browser supervisorctl status chromium
```

### Q2: 使用环境变量后仍然失败

**A**: 确保环境变量格式正确：

```yaml
# 正确
BB_BROWSER_CDP_URL=http://127.0.0.1:9222

# 错误（缺少协议）
BB_BROWSER_CDP_URL=127.0.0.1:9222

# 错误（使用 localhost 在某些环境可能失败）
BB_BROWSER_CDP_URL=http://localhost:9222
```

### Q3: 重新构建镜像后问题依然存在

**A**: 清理旧镜像和缓存：

```bash
# 停止容器
docker compose down

# 删除旧镜像
docker rmi bb-browser:latest

# 清理构建缓存
docker builder prune -f

# 重新构建（不使用缓存）
docker compose build --no-cache

# 启动
docker compose up -d
```

## 获取帮助

如果以上方法都无效，请收集以下信息并提交 Issue：

```bash
# 1. 诊断输出
docker compose exec bb-browser bash /diagnose-browser.sh > diagnose.txt

# 2. 测试输出
docker compose exec bb-browser bash /app/test/test-browser-detection.sh > test.txt

# 3. daemon 日志
docker compose exec bb-browser supervisorctl tail -100 bb-daemon > daemon.log

# 4. 环境信息
docker --version > env.txt
docker compose version >> env.txt
uname -a >> env.txt
```

提交 Issue：https://github.com/skVPN/bb-browser-api/issues

## 相关文档

- [详细修复说明](docs/browser-detection-fix.md)
- [部署文档](DEPLOY.md)
- [测试说明](test/README.md)
- [修复总结](浏览器检测修复总结.md)
