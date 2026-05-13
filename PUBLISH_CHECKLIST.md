# bb-browser-api 发布清单

## 发布前准备

### 1. 环境检查

- [ ] 已安装 Node.js >= 18.0.0
- [ ] 已安装 pnpm (`npm install -g pnpm`)
- [ ] 已登录 npm (`npm login`)
- [ ] 验证登录状态 (`npm whoami`)

### 2. 代码检查

- [ ] 所有代码已提交到 Git
- [ ] 工作区干净 (`git status`)
- [ ] 所有测试通过 (`pnpm test`)
- [ ] 代码已推送到 GitHub

### 3. 构建检查

```bash
# 安装依赖
pnpm install

# 运行构建
pnpm build

# 检查构建产物
ls dist/
# 应该包含: cli.js, mcp.js, provider.js, daemon.js
```

- [ ] 依赖安装成功
- [ ] 构建无错误
- [ ] dist 目录包含所有必需文件

### 4. 配置检查

```bash
# 运行检查脚本
node scripts/pre-publish-check.js
```

- [ ] package.json 配置正确
- [ ] 构建产物存在
- [ ] shebang 正确
- [ ] 必需文件存在
- [ ] .npmignore 配置正确
- [ ] 依赖配置合理

### 5. 本地测试

```bash
# 打包
npm pack

# 安装测试
npm install -g ./bb-browser-api-0.11.5.tgz

# 测试命令
bb-browser-api --version
bb-browser-api --help
bb-browser-api daemon start
bb-browser-api site list
```

- [ ] 打包成功
- [ ] 本地安装成功
- [ ] 命令可执行
- [ ] 基本功能正常

## 发布步骤

### 方式一：使用发布脚本（推荐）

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

### 方式二：手动发布

```bash
# 1. 更新版本号
npm version patch  # 或 minor / major

# 2. 发布到 npm
npm publish --access public

# 3. 提交版本更新
git add package.json
git commit -m "chore(release): v0.11.6"
git tag v0.11.6

# 4. 推送到 GitHub
git push
git push --tags
```

## 发布后验证

### 1. npm 包页面

- [ ] 访问 https://www.npmjs.com/package/bb-browser-api
- [ ] 版本号正确
- [ ] README 显示正常
- [ ] 文件列表正确

### 2. 全局安装测试

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
bb-browser-api open https://example.com
```

- [ ] 从 npm 安装成功
- [ ] 版本号正确
- [ ] 命令可执行
- [ ] 基本功能正常

### 3. MCP 集成测试

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

- [ ] MCP 服务器启动成功
- [ ] 可以调用 MCP 工具
- [ ] 功能正常

### 4. GitHub 更新

- [ ] 推送代码到 GitHub (`git push`)
- [ ] 推送标签到 GitHub (`git push --tags`)
- [ ] 创建 GitHub Release
- [ ] Release 包含更新日志
- [ ] Release 关联正确的 tag

## 发布后任务

### 1. 文档更新

- [ ] 更新 CHANGELOG.md
- [ ] 更新版本相关文档
- [ ] 更新示例代码中的版本号

### 2. 通知用户

- [ ] 在 GitHub 发布 Release 公告
- [ ] 更新项目 README（如有必要）
- [ ] 通知相关用户和社区

### 3. 监控

- [ ] 检查 npm 下载统计
- [ ] 监控 GitHub Issues
- [ ] 关注用户反馈

## 常见问题处理

### 发布失败

#### 问题：需要 2FA

```bash
npm publish --otp=123456
```

#### 问题：包名已被占用

修改 package.json 中的 name：

```json
{
  "name": "@your-username/bb-browser-api"
}
```

#### 问题：权限不足

```bash
npm login
npm publish --access public
```

### 发布后问题

#### 问题：命令找不到

检查：
1. `package.json` 中的 `bin` 字段
2. 构建产物是否包含 shebang
3. 文件权限（Linux/Mac）

#### 问题：功能异常

1. 检查构建产物是否完整
2. 检查依赖是否正确
3. 本地测试是否通过

#### 问题：需要撤销发布

```bash
# 72 小时内可以撤销
npm unpublish bb-browser-api@0.11.5

# 注意：撤销后 24 小时内无法重新发布相同版本
```

## 版本管理

### 语义化版本规则

- **MAJOR** (1.0.0): 不兼容的 API 变更
- **MINOR** (0.1.0): 向后兼容的功能新增
- **PATCH** (0.0.1): 向后兼容的问题修复

### 版本更新示例

| 变更类型 | 当前版本 | 新版本 | 命令 |
|---------|---------|--------|------|
| Bug 修复 | 0.11.5 | 0.11.6 | `npm version patch` |
| 新功能 | 0.11.5 | 0.12.0 | `npm version minor` |
| 重大变更 | 0.11.5 | 1.0.0 | `npm version major` |

## 相关文档

- [完整发布指南](docs/NPM_PUBLISH.md)
- [快速发布说明](PUBLISH_README.md)
- [发布配置总结](docs/PUBLISH_SUMMARY.md)

## 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues
