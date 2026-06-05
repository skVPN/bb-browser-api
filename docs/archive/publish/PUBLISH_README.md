# bb-browser-api 发布说明

## 快速发布

### Windows 用户

```powershell
# 方式 1: 使用 PowerShell 脚本（推荐）
.\scripts\publish.ps1 patch   # 修复版本 0.11.5 -> 0.11.6
.\scripts\publish.ps1 minor   # 次版本 0.11.5 -> 0.12.0
.\scripts\publish.ps1 major   # 主版本 0.11.5 -> 1.0.0

# 方式 2: 使用 npm 命令
pnpm build
npm version patch
npm publish --access public
```

### Linux/Mac 用户

```bash
# 方式 1: 使用 Bash 脚本（推荐）
./scripts/publish.sh patch   # 修复版本
./scripts/publish.sh minor   # 次版本
./scripts/publish.sh major   # 主版本

# 方式 2: 使用 pnpm 脚本
pnpm publish:patch
pnpm publish:minor
pnpm publish:major

# 方式 3: 使用 npm 命令
pnpm build
npm version patch
npm publish --access public
```

## 发布前检查

```bash
# 运行检查脚本
node scripts/pre-publish-check.js

# 或使用 pnpm
pnpm publish:check
```

检查项目包括：
- ✓ package.json 配置完整性
- ✓ 构建产物存在性
- ✓ shebang 正确性
- ✓ 必需文件存在性
- ✓ .npmignore 配置
- ✓ 依赖配置合理性

## 首次发布

### 1. 登录 npm

```bash
npm login
```

输入你的 npm 账号信息。

### 2. 检查包名是否可用

```bash
npm view bb-browser-api
```

如果返回 404，说明包名可用。

### 3. 构建项目

```bash
pnpm install
pnpm build
```

### 4. 本地测试

```bash
# 打包
npm pack

# 安装测试
npm install -g ./bb-browser-api-0.11.5.tgz

# 测试命令
bb-browser-api --version
bb-browser-api --help
```

### 5. 发布

```bash
npm publish --access public
```

## 发布后验证

### 1. 检查 npm 包页面

访问: https://www.npmjs.com/package/bb-browser-api

### 2. 测试安装

```bash
# 卸载本地版本
npm uninstall -g bb-browser-api

# 从 npm 安装
npm install -g bb-browser-api

# 验证
bb-browser-api --version
bb-browser-api daemon start
```

### 3. 推送到 GitHub

```bash
git push
git push --tags
```

### 4. 创建 GitHub Release

在 GitHub 仓库页面创建新的 Release，关联刚才推送的 tag。

## 版本号规则

遵循语义化版本（Semantic Versioning）：

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.1.0): 向后兼容的功能新增
- **PATCH** (0.0.1): 向后兼容的问题修复

示例：
- 修复 bug: `0.11.5` -> `0.11.6` (patch)
- 新增功能: `0.11.5` -> `0.12.0` (minor)
- 重大变更: `0.11.5` -> `1.0.0` (major)

## 常见问题

### Q: 发布失败，提示需要 2FA

A: 如果你的 npm 账号启用了双因素认证：

```bash
npm publish --otp=123456
```

将 `123456` 替换为你的 2FA 验证码。

### Q: 包名已被占用

A: 可以使用 scoped package：

```json
{
  "name": "@your-username/bb-browser-api"
}
```

或选择其他名称：
- `bb-browser-http-api`
- `badboy-browser-api`

### Q: 命令安装后找不到

A: 检查 `package.json` 中的 `bin` 字段是否正确，并确保构建产物包含 shebang：

```javascript
#!/usr/bin/env node
```

### Q: 如何撤销发布

A: 在 72 小时内可以撤销：

```bash
npm unpublish bb-browser-api@0.11.5
```

**注意**: 撤销后的包名和版本号 24 小时内无法重新发布。

## 自动化发布（可选）

项目已配置 GitHub Actions，可以通过推送 tag 自动发布：

1. 在 GitHub 仓库设置中添加 `NPM_TOKEN` secret
2. 推送 tag：

```bash
git tag v0.11.5
git push origin v0.11.5
```

GitHub Actions 会自动构建并发布到 npm。

## 相关文档

- [完整发布指南](docs/NPM_PUBLISH.md)
- [npm 文档](https://docs.npmjs.com/)
- [语义化版本](https://semver.org/lang/zh-CN/)

## 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
