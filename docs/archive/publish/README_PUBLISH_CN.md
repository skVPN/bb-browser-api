# bb-browser-api 发布说明

## 项目已准备好发布到 npm！

### 📦 包信息

- **包名**: `bb-browser-api`
- **版本**: `0.11.5`
- **安装**: `npm install -g bb-browser-api`

### ✅ 已完成的准备工作

1. ✅ 包名称和命令已更新
2. ✅ 创建了自动化发布脚本
3. ✅ 创建了完整的发布文档
4. ✅ 配置了 .npmignore
5. ✅ 更新了 README
6. ✅ 通过了发布前检查

### 🚀 快速发布

#### Windows

```powershell
# 1. 登录 npm
npm login

# 2. 运行发布脚本
.\scripts\publish.ps1 patch
```

#### Linux/Mac

```bash
# 1. 登录 npm
npm login

# 2. 运行发布脚本
./scripts/publish.sh patch
```

### 📚 文档

- **快速指南**: [PUBLISH_README.md](PUBLISH_README.md)
- **详细指南**: [docs/NPM_PUBLISH.md](docs/NPM_PUBLISH.md)
- **检查清单**: [PUBLISH_CHECKLIST.md](PUBLISH_CHECKLIST.md)
- **配置总结**: [docs/PUBLISH_SUMMARY.md](docs/PUBLISH_SUMMARY.md)
- **完成说明**: [发布准备完成.md](发布准备完成.md)

### 🔍 发布前检查

```bash
node scripts/pre-publish-check.js
```

### 📋 首次发布步骤

1. **登录 npm**
   ```bash
   npm login
   npm whoami
   ```

2. **检查包名可用性**
   ```bash
   npm view bb-browser-api
   ```
   如果返回 404，说明包名可用。

3. **本地测试**
   ```bash
   npm pack
   npm install -g ./bb-browser-api-0.11.5.tgz
   bb-browser-api --version
   ```

4. **发布**
   ```bash
   npm publish --access public
   ```
   或使用发布脚本：
   ```bash
   .\scripts\publish.ps1 patch  # Windows
   ./scripts/publish.sh patch   # Linux/Mac
   ```

5. **推送到 GitHub**
   ```bash
   git push
   git push --tags
   ```

6. **创建 GitHub Release**
   在 GitHub 仓库页面创建新的 Release。

### 🎯 版本管理

- **patch** (0.11.5 → 0.11.6): Bug 修复
- **minor** (0.11.5 → 0.12.0): 新功能
- **major** (0.11.5 → 1.0.0): 重大变更

### ⚠️ 注意事项

1. 确保已登录 npm (`npm login`)
2. 确保包名可用 (`npm view bb-browser-api`)
3. 确保所有代码已提交到 Git
4. 运行发布前检查 (`node scripts/pre-publish-check.js`)
5. 本地测试通过后再发布

### 🆘 常见问题

**Q: 发布失败，提示需要 2FA？**

A: 使用 OTP 参数：
```bash
npm publish --otp=123456
```

**Q: 包名已被占用？**

A: 使用 scoped package：
```json
{
  "name": "@your-username/bb-browser-api"
}
```

**Q: 如何撤销发布？**

A: 72 小时内可以撤销：
```bash
npm unpublish bb-browser-api@0.11.5
```

### 🔗 相关链接

- GitHub: https://github.com/skVPN/bb-browser-api
- npm: https://www.npmjs.com/package/bb-browser-api (待发布)
- 原始项目: https://github.com/epiral/bb-browser

### 💬 支持

如有问题，请在 GitHub 提交 Issue：
https://github.com/skVPN/bb-browser-api/issues

---

**准备好了吗？开始发布吧！** 🎉
