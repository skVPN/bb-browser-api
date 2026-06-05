# npm 账号注册指南

## 方式一：通过命令行注册（推荐）

### 1. 运行注册命令

```bash
npm adduser
```

### 2. 按提示输入信息

系统会依次提示你输入：

- **Username** (用户名)
  - 只能包含小写字母、数字、连字符和下划线
  - 例如：`alexfu` 或 `alex-fu`
  
- **Password** (密码)
  - 至少 10 个字符
  - 输入时不会显示，这是正常的
  
- **Email** (邮箱)
  - 必须是有效的邮箱地址
  - 例如：`alex.fu@example.com`

### 3. 验证邮箱

- npm 会发送验证邮件到你的邮箱
- 打开邮件，点击验证链接
- 验证完成后，账号就激活了

### 4. 验证登录

```bash
npm whoami
```

如果显示你的用户名，说明登录成功！

---

## 方式二：通过网页注册

### 1. 访问 npm 官网

打开浏览器，访问：https://www.npmjs.com/signup

### 2. 填写注册信息

- **Username** (用户名)
- **Email Address** (邮箱地址)
- **Password** (密码)

### 3. 完成人机验证

点击 "I'm not a robot" 完成验证

### 4. 验证邮箱

- 检查邮箱，找到 npm 发送的验证邮件
- 点击邮件中的验证链接

### 5. 在命令行登录

注册完成后，在命令行登录：

```bash
npm login
```

输入你刚才注册的用户名、密码和邮箱。

---

## 注册后的步骤

### 1. 验证登录状态

```bash
npm whoami
```

### 2. 查看个人信息

```bash
npm profile get
```

### 3. 开始发布

登录成功后，就可以发布包了：

```bash
# 使用发布脚本
.\scripts\publish.ps1 patch

# 或手动发布
npm publish --access public
```

---

## 常见问题

### Q: 用户名已被占用？

A: 尝试其他用户名，例如：
- `alexfu`
- `alex-fu`
- `alexfu-dev`
- `fu-alex`

### Q: 邮箱已被注册？

A: 如果你之前注册过，直接使用 `npm login` 登录即可。

### Q: 没有收到验证邮件？

A: 
1. 检查垃圾邮件文件夹
2. 等待几分钟后重试
3. 在 npm 网站重新发送验证邮件

### Q: 忘记密码？

A: 访问 https://www.npmjs.com/forgot 重置密码

---

## 安全建议

### 1. 启用双因素认证（2FA）

登录后，建议启用 2FA 增强安全性：

```bash
npm profile enable-2fa auth-and-writes
```

### 2. 使用强密码

- 至少 12 个字符
- 包含大小写字母、数字和特殊字符
- 不要使用常见密码

### 3. 保护 npm token

- 不要在代码中硬编码 token
- 不要提交 token 到 Git
- 定期更换 token

---

## 下一步

注册并登录成功后：

1. ✅ 验证登录：`npm whoami`
2. ✅ 检查包名可用性：`npm view bb-browser-api`
3. ✅ 运行发布前检查：`node scripts/pre-publish-check.js`
4. ✅ 发布包：`.\scripts\publish.ps1 patch`

---

## 相关链接

- npm 官网：https://www.npmjs.com/
- npm 注册页面：https://www.npmjs.com/signup
- npm 文档：https://docs.npmjs.com/
- npm CLI 文档：https://docs.npmjs.com/cli/

---

**准备好了吗？让我们开始注册吧！** 🚀
