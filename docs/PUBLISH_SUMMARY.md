# bb-browser-api 发布配置总结

## 已完成的配置

### 1. 包名称更新

- **旧名称**: `bb-browser`
- **新名称**: `bb-browser-api`
- **全局安装**: `npm install -g bb-browser-api`

### 2. 可执行命令

安装后可使用以下命令：

```bash
bb-browser-api              # 主 CLI 命令
bb-browser-api-mcp          # MCP 服务器
bb-browser-api-provider     # Provider 服务
```

### 3. 仓库信息

- **GitHub**: https://github.com/skVPN/bb-browser-api
- **npm**: https://www.npmjs.com/package/bb-browser-api (待发布)
- **Issues**: https://github.com/skVPN/bb-browser-api/issues

### 4. 创建的文件

#### 发布脚本

- `scripts/publish.sh` - Linux/Mac 发布脚本
- `scripts/publish.ps1` - Windows PowerShell 发布脚本
- `scripts/pre-publish-check.js` - 发布前检查脚本

#### 文档

- `docs/NPM_PUBLISH.md` - 完整发布指南（详细步骤）
- `PUBLISH_README.md` - 快速发布说明（简明版）
- `docs/PUBLISH_SUMMARY.md` - 本文件（配置总结）

#### 配置文件

- `.npmignore` - npm 发布时忽略的文件

### 5. package.json 更新

```json
{
  "name": "bb-browser-api",
  "version": "0.11.5",
  "description": "Your browser is the API. CLI + MCP server for AI agents to control Chrome with your login state. Fork with HTTP API endpoints.",
  "bin": {
    "bb-browser-api": "./dist/cli.js",
    "bb-browser-api-mcp": "./dist/mcp.js",
    "bb-browser-api-provider": "./dist/provider.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/skVPN/bb-browser-api.git"
  },
  "scripts": {
    "publish:check": "node scripts/pre-publish-check.js",
    "publish:patch": "bash scripts/publish.sh patch",
    "publish:minor": "bash scripts/publish.sh minor",
    "publish:major": "bash scripts/publish.sh major"
  }
}
```

## 发布流程

### 快速发布（推荐）

#### Windows

```powershell
# 修复版本 (0.11.5 -> 0.11.6)
.\scripts\publish.ps1 patch

# 次版本 (0.11.5 -> 0.12.0)
.\scripts\publish.ps1 minor

# 主版本 (0.11.5 -> 1.0.0)
.\scripts\publish.ps1 major
```

#### Linux/Mac

```bash
# 修复版本
./scripts/publish.sh patch

# 次版本
./scripts/publish.sh minor

# 主版本
./scripts/publish.sh major
```

### 手动发布

```bash
# 1. 检查配置
pnpm publish:check

# 2. 构建
pnpm build

# 3. 更新版本
npm version patch

# 4. 发布
npm publish --access public

# 5. 推送到 GitHub
git push && git push --tags
```

## 发布前检查清单

运行检查脚本：

```bash
node scripts/pre-publish-check.js
```

检查项目：

- [x] package.json 配置完整（name, version, description, bin, files, repository, license）
- [x] 构建产物存在（dist/cli.js, dist/mcp.js, dist/provider.js, dist/daemon.js）
- [x] CLI 文件包含 shebang (`#!/usr/bin/env node`)
- [x] 必需文件存在（README.md, LICENSE, .npmignore）
- [x] .npmignore 配置正确（忽略源码和开发文件，保留 dist 和文档）
- [x] 依赖配置合理（dependencies 和 devDependencies 分离）
- [x] Node.js 版本要求明确（>=18.0.0）

## 首次发布步骤

### 1. 登录 npm

```bash
npm login
```

### 2. 验证登录

```bash
npm whoami
```

### 3. 检查包名可用性

```bash
npm view bb-browser-api
```

如果返回 404，说明包名可用。

### 4. 本地测试

```bash
# 打包
npm pack

# 安装测试
npm install -g ./bb-browser-api-0.11.5.tgz

# 测试命令
bb-browser-api --version
bb-browser-api --help
bb-browser-api daemon start
```

### 5. 发布

```bash
npm publish --access public
```

### 6. 验证发布

- 访问 npm 包页面: https://www.npmjs.com/package/bb-browser-api
- 测试全局安装: `npm install -g bb-browser-api`
- 验证命令: `bb-browser-api --version`

### 7. 推送到 GitHub

```bash
git push
git push --tags
```

### 8. 创建 GitHub Release

在 GitHub 仓库页面创建新的 Release，关联刚才推送的 tag。

## 版本管理

### 语义化版本

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.1.0): 向后兼容的功能新增
- **PATCH** (0.0.1): 向后兼容的问题修复

### 版本更新示例

```bash
# Bug 修复
npm version patch  # 0.11.5 -> 0.11.6

# 新功能
npm version minor  # 0.11.5 -> 0.12.0

# 重大变更
npm version major  # 0.11.5 -> 1.0.0
```

## 发布脚本功能

### publish.sh / publish.ps1

自动化发布流程：

1. ✓ 检查 npm 登录状态
2. ✓ 检查工作区状态
3. ✓ 安装依赖
4. ✓ 运行构建
5. ✓ 运行测试（可选）
6. ✓ 更新版本号
7. ✓ 本地打包测试
8. ✓ 发布到 npm
9. ✓ 创建 git commit 和 tag
10. ✓ 提示后续步骤

### pre-publish-check.js

发布前检查脚本，验证：

- package.json 配置完整性
- 构建产物存在性
- shebang 正确性
- 必需文件存在性
- .npmignore 配置合理性
- 依赖配置正确性
- Node.js 版本要求

## 常见问题

### Q: 如何撤销发布？

A: 在 72 小时内可以撤销：

```bash
npm unpublish bb-browser-api@0.11.5
```

### Q: 发布失败，提示需要 2FA？

A: 使用 OTP 参数：

```bash
npm publish --otp=123456
```

### Q: 包名已被占用？

A: 使用 scoped package：

```json
{
  "name": "@your-username/bb-browser-api"
}
```

### Q: 命令安装后找不到？

A: 检查：
1. `package.json` 中的 `bin` 字段是否正确
2. 构建产物是否包含 shebang
3. 文件权限是否正确（Linux/Mac）

## 自动化发布（可选）

### GitHub Actions

项目已包含 `.github/workflows/publish.yml`，可以配置自动发布：

1. 在 GitHub 仓库设置中添加 `NPM_TOKEN` secret
2. 推送 tag 时自动触发发布：

```bash
git tag v0.11.5
git push origin v0.11.5
```

### release-please

项目已配置 `release-please`，可以自动管理版本和 CHANGELOG：

1. 使用 Conventional Commits 格式提交代码
2. release-please 会自动创建 release PR
3. 合并 release PR 后自动发布

## 相关链接

- [完整发布指南](NPM_PUBLISH.md)
- [快速发布说明](../PUBLISH_README.md)
- [npm 文档](https://docs.npmjs.com/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)

## 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
