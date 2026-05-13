# NPM 发布指南

## 项目信息

- **包名称**: `bb-browser-api`
- **全局安装命令**: `npm install -g bb-browser-api`
- **可执行命令**: `bb-browser-api`, `bb-browser-api-mcp`, `bb-browser-api-provider`

## 发布前准备

### 1. 确保已登录 npm

```bash
npm login
```

输入你的 npm 账号信息：
- Username
- Password
- Email
- 2FA code（如果启用了双因素认证）

验证登录状态：
```bash
npm whoami
```

### 2. 检查包名是否可用

```bash
npm view bb-browser-api
```

如果显示 404 或 "npm ERR! code E404"，说明包名可用。

### 3. 构建项目

```bash
# 安装依赖
pnpm install

# 运行构建
pnpm build

# 检查构建产物
ls dist/
```

确保 `dist/` 目录包含以下文件：
- `cli.js`
- `mcp.js`
- `provider.js`

### 4. 测试本地安装

```bash
# 打包但不发布
npm pack

# 这会生成 bb-browser-api-0.11.5.tgz 文件
# 在其他目录测试安装
npm install -g /path/to/bb-browser-api-0.11.5.tgz

# 测试命令
bb-browser-api --version
bb-browser-api --help
```

## 发布流程

### 方式一：标准发布

```bash
# 1. 确保在项目根目录
cd d:\codegank\bb-browser

# 2. 更新版本号（可选）
npm version patch  # 0.11.5 -> 0.11.6
# 或
npm version minor  # 0.11.5 -> 0.12.0
# 或
npm version major  # 0.11.5 -> 1.0.0

# 3. 发布到 npm
npm publish

# 如果是第一次发布，可能需要添加 --access public
npm publish --access public
```

### 方式二：使用 pnpm 发布

```bash
pnpm publish --access public
```

### 方式三：发布到特定 tag

```bash
# 发布为 beta 版本
npm publish --tag beta

# 发布为 next 版本
npm publish --tag next

# 用户安装时需要指定 tag
npm install -g bb-browser-api@beta
```

## 发布后验证

### 1. 检查 npm 包页面

访问：https://www.npmjs.com/package/bb-browser-api

确认：
- 版本号正确
- README 显示正常
- 文件列表正确

### 2. 测试全局安装

```bash
# 卸载本地测试版本
npm uninstall -g bb-browser-api

# 从 npm 安装
npm install -g bb-browser-api

# 验证版本
bb-browser-api --version

# 测试基本功能
bb-browser-api daemon start
bb-browser-api site list
```

### 3. 测试 MCP 集成

在 Claude Desktop 或 Cursor 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "bb-browser-api": {
      "command": "npx",
      "args": ["-y", "bb-browser-api", "--mcp"]
    }
  }
}
```

## 版本管理策略

### 语义化版本（Semantic Versioning）

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.1.0): 向后兼容的功能新增
- **PATCH** (0.0.1): 向后兼容的问题修复

### 推荐的版本更新流程

```bash
# 1. 修复 bug
npm version patch
git push && git push --tags
npm publish

# 2. 新增功能
npm version minor
git push && git push --tags
npm publish

# 3. 重大变更
npm version major
git push && git push --tags
npm publish
```

## 常见问题

### 1. 发布失败：需要 2FA

如果你的 npm 账号启用了双因素认证：

```bash
npm publish --otp=123456
```

将 `123456` 替换为你的 2FA 验证码。

### 2. 包名已被占用

如果 `bb-browser-api` 已被占用，可以考虑：
- `@your-username/bb-browser-api` (scoped package)
- `bb-browser-http-api`
- `badboy-browser-api`

修改 `package.json` 中的 `name` 字段即可。

### 3. 发布后无法安装

检查 `package.json` 中的 `files` 字段：

```json
"files": [
  "dist",
  "packages/shared/buildDomTree.js",
  "README.md",
  "LICENSE"
]
```

确保包含了所有必需的文件。

### 4. 命令找不到

确保 `package.json` 中的 `bin` 字段正确：

```json
"bin": {
  "bb-browser-api": "./dist/cli.js",
  "bb-browser-api-mcp": "./dist/mcp.js",
  "bb-browser-api-provider": "./dist/provider.js"
}
```

并且这些文件的第一行包含 shebang：

```javascript
#!/usr/bin/env node
```

## 撤销发布

如果发布后发现问题，可以在 72 小时内撤销：

```bash
# 撤销特定版本
npm unpublish bb-browser-api@0.11.5

# 撤销整个包（慎用！）
npm unpublish bb-browser-api --force
```

**注意**: 撤销后的包名和版本号 24 小时内无法重新发布。

## 自动化发布（可选）

### 使用 GitHub Actions

项目已包含 `.github/workflows/publish.yml`，可以配置自动发布：

1. 在 GitHub 仓库设置中添加 `NPM_TOKEN` secret
2. 推送 tag 时自动触发发布：

```bash
git tag v0.11.5
git push origin v0.11.5
```

### 使用 release-please

项目已配置 `release-please`，可以自动管理版本和 CHANGELOG：

1. 合并 PR 时使用 Conventional Commits 格式
2. release-please 会自动创建 release PR
3. 合并 release PR 后自动发布

## 发布检查清单

- [ ] 代码已提交并推送到 GitHub
- [ ] 运行 `pnpm build` 成功
- [ ] 运行 `pnpm test` 通过（如有测试）
- [ ] 更新 `CHANGELOG.md`
- [ ] 更新版本号
- [ ] 本地测试 `npm pack` 和安装
- [ ] 已登录 npm (`npm whoami`)
- [ ] 执行 `npm publish`
- [ ] 验证 npm 包页面
- [ ] 测试全局安装
- [ ] 更新文档中的版本号引用
- [ ] 创建 GitHub Release
- [ ] 通知用户更新

## 相关链接

- npm 包页面: https://www.npmjs.com/package/bb-browser-api
- GitHub 仓库: https://github.com/skVPN/bb-browser-api
- npm 文档: https://docs.npmjs.com/
- 语义化版本: https://semver.org/lang/zh-CN/
