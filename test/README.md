# 测试脚本说明

## 浏览器检测修复验证

### 快速测试

在 Docker 容器中运行：

```bash
docker compose exec bb-browser bash /app/test/test-browser-detection.sh
```

### 测试内容

脚本会执行以下测试：

#### 阶段 1: 浏览器可执行文件检查
- ✓ 检查 `/usr/bin/chromium` 存在
- ✓ 检查 `/usr/bin/chromium` 可执行
- ✓ `chromium` 命令可用

#### 阶段 2: CDP 端口检查
- ✓ CDP 端口可访问（默认 9222）

#### 阶段 3: bb-browser 构建检查
- ✓ `dist/cli.js` 存在
- ✓ `dist/daemon.js` 存在
- ✓ `bb-browser-api` 命令可用

#### 阶段 4: daemon 功能检查
- ✓ 启动 daemon
- ✓ daemon 状态检查
- ✓ 执行 `tab list` 命令
- ✓ 停止 daemon

#### 阶段 5: 诊断工具检查
- ✓ 诊断脚本存在
- ✓ 诊断脚本可执行

### 预期输出

成功时：

```
==========================================
浏览器检测修复验证
==========================================

✓ 在 Docker 容器中运行

=== 阶段 1: 浏览器可执行文件检查 ===
测试 1: 检查 /usr/bin/chromium 存在 ... ✓ 通过
测试 2: 检查 /usr/bin/chromium 可执行 ... ✓ 通过
测试 3: chromium 命令可用 ... ✓ 通过

=== 阶段 2: CDP 端口检查 ===
测试 4: CDP 端口 9222 可访问 ... ✓ 通过

=== 阶段 3: bb-browser 构建检查 ===
测试 5: dist/cli.js 存在 ... ✓ 通过
测试 6: dist/daemon.js 存在 ... ✓ 通过
测试 7: bb-browser-api 命令可用 ... ✓ 通过

=== 阶段 4: daemon 功能检查 ===
启动 daemon ... ✓ 成功
测试 8: daemon 状态检查 ... ✓ 通过
测试 9: 执行 tab list 命令 ... ✓ 通过
停止 daemon ... ✓ 成功

=== 阶段 5: 诊断工具检查 ===
测试 10: 诊断脚本存在 ... ✓ 通过
测试 11: 诊断脚本可执行 ... ✓ 通过

==========================================
测试总结
==========================================
总测试数: 11
通过: 11
失败: 0

✓ 所有测试通过！浏览器检测修复成功。
```

### 失败时的处理

如果测试失败，脚本会提供建议：

```
✗ 有 X 个测试失败。

建议：
1. 运行诊断脚本: bash /diagnose-browser.sh
2. 查看日志: supervisorctl tail -f bb-daemon
3. 检查环境变量: env | grep BB_
```

## 诊断脚本

如果测试失败，运行诊断脚本获取详细信息：

```bash
docker compose exec bb-browser bash /diagnose-browser.sh
```

诊断脚本会检查：
1. 常见浏览器路径
2. `which` 命令结果
3. 浏览器版本
4. CDP 端口状态
5. 环境变量

## 手动测试

### 1. 检查浏览器

```bash
docker compose exec bb-browser which chromium
docker compose exec bb-browser ls -lh /usr/bin/chromium
docker compose exec bb-browser chromium --version
```

### 2. 检查 CDP 端口

```bash
docker compose exec bb-browser curl http://127.0.0.1:9222/json/version
```

### 3. 测试 daemon

```bash
# 启动
docker compose exec bb-browser bb-browser-api daemon start

# 状态
docker compose exec bb-browser bb-browser-api daemon status

# 停止
docker compose exec bb-browser bb-browser-api daemon stop
```

### 4. 查看日志

```bash
# supervisord 状态
docker compose exec bb-browser supervisorctl status

# daemon 日志
docker compose exec bb-browser supervisorctl tail -f bb-daemon

# chromium 日志
docker compose exec bb-browser supervisorctl tail -f chromium
```

## 持续集成

可以将测试脚本集成到 CI/CD 流程中：

```yaml
# .github/workflows/test-docker.yml
name: Test Docker Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker compose build
      
      - name: Start container
        run: docker compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run tests
        run: docker compose exec -T bb-browser bash /app/test/test-browser-detection.sh
      
      - name: Show logs on failure
        if: failure()
        run: |
          docker compose logs
          docker compose exec -T bb-browser bash /diagnose-browser.sh
```

## 相关文档

- [修复说明](../docs/browser-detection-fix.md)
- [部署文档](../DEPLOY.md)
- [更新日志](../CHANGELOG_v0.12.6-2.md)
