# Git 提交信息

## 提交类型

```
修复(docker): 优化 Linux 浏览器检测逻辑，优先检查绝对路径
```

## 详细描述

```
修复 Docker 容器中浏览器检测失败的问题

问题：
- 在 Docker 容器中启动 daemon 时，即使已安装 Chromium，仍提示找不到浏览器
- 原因是检测逻辑优先使用 which 命令，在某些环境中可能失败

修复：
- 调整检测顺序，优先检查常见的绝对路径（/usr/bin/chromium 等）
- which 命令作为备用方案
- 新增诊断脚本 diagnose-browser.sh
- 新增自动化测试脚本 test-browser-detection.sh

影响范围：
- 仅 Docker 部署环境
- 向后兼容，无破坏性变更

相关文件：
- packages/cli/src/cdp-discovery.ts - 核心修复
- docker/diagnose-browser.sh - 诊断工具
- test/test-browser-detection.sh - 测试脚本
- DEPLOY.md - 更新故障排查章节
- docs/browser-detection-fix.md - 详细修复说明
- CHANGELOG_v0.12.6-2.md - 更新日志
```

## 提交命令

```bash
# 1. 查看修改的文件
git status

# 2. 添加所有修改
git add packages/cli/src/cdp-discovery.ts
git add docker/diagnose-browser.sh
git add test/test-browser-detection.sh
git add test/README.md
git add Dockerfile
git add DEPLOY.md
git add docs/browser-detection-fix.md
git add CHANGELOG_v0.12.6-2.md
git add 浏览器检测修复总结.md
git add GIT_COMMIT_MESSAGE.md

# 3. 提交
git commit -m "修复(docker): 优化 Linux 浏览器检测逻辑，优先检查绝对路径

修复 Docker 容器中浏览器检测失败的问题

问题：
- 在 Docker 容器中启动 daemon 时，即使已安装 Chromium，仍提示找不到浏览器
- 原因是检测逻辑优先使用 which 命令，在某些环境中可能失败

修复：
- 调整检测顺序，优先检查常见的绝对路径（/usr/bin/chromium 等）
- which 命令作为备用方案
- 新增诊断脚本 diagnose-browser.sh
- 新增自动化测试脚本 test-browser-detection.sh

影响范围：
- 仅 Docker 部署环境
- 向后兼容，无破坏性变更

相关文档：
- docs/browser-detection-fix.md - 详细修复说明
- CHANGELOG_v0.12.6-2.md - 更新日志
- 浏览器检测修复总结.md - 修复总结"

# 4. 推送到远程仓库
git push origin main
```

## 验证步骤

提交后，建议执行以下验证：

```bash
# 1. 重新构建项目
pnpm build

# 2. 重新构建 Docker 镜像
docker compose build

# 3. 启动容器
docker compose up -d

# 4. 运行测试
docker compose exec bb-browser bash /app/test/test-browser-detection.sh

# 5. 运行诊断
docker compose exec bb-browser bash /diagnose-browser.sh

# 6. 测试 daemon
docker compose exec bb-browser bb-browser-api daemon status
```

## 发布说明

如果需要发布新版本到 npm：

```bash
# 1. 更新版本号（如果需要）
npm version patch  # 0.12.7 -> 0.12.8

# 2. 构建
pnpm build

# 3. 发布
npm publish

# 4. 创建 git tag
git tag v0.12.8
git push origin v0.12.8
```

## 相关 Issue

如果有相关的 GitHub Issue，在提交信息中引用：

```
修复(docker): 优化 Linux 浏览器检测逻辑，优先检查绝对路径

Fixes #123
Closes #456
```
