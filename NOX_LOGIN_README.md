# NoxInfluencer 自动登录工具

## 📋 概述

这个工具可以帮助你自动化 NoxInfluencer 的登录过程，支持命令行和脚本两种方式。

## 🚀 使用方法

### 方法 1：PowerShell 脚本（推荐）

#### 交互式登录（会提示输入用户名密码）
```powershell
.\nox-auto-login.ps1
```

#### 命令行传参登录
```powershell
.\nox-auto-login.ps1 -Username "your_email@example.com" -Password "your_password"
```

#### 指定标签页 ID
```powershell
.\nox-auto-login.ps1 -Username "your_email" -Password "your_password" -TabId "5312"
```

### 方法 2：直接使用 bb-browser 命令

#### 步骤 1：打开登录页面
```powershell
bb-browser open "https://cn.noxinfluencer.com/login?userType=brand"
```

#### 步骤 2：获取标签页 ID
```powershell
bb-browser tab list
```

#### 步骤 3：查看可交互元素
```powershell
bb-browser snapshot -i --tab <TAB_ID>
```

#### 步骤 4：填充表单并登录
```powershell
# 填充用户名（ref=1）
bb-browser fill "@1" "your_email@example.com" --tab <TAB_ID>

# 填充密码（ref=2）
bb-browser fill "@2" "your_password" --tab <TAB_ID>

# 点击登录按钮（ref=5）
bb-browser click "@5" --tab <TAB_ID>
```

### 方法 3：一行命令登录
```powershell
bb-browser fill "@1" "your_email" --tab 5312; bb-browser fill "@2" "your_password" --tab 5312; bb-browser click "@5" --tab 5312
```

## 📝 创建 site adapter

如果你想把登录功能集成到 bb-browser 的 site 命令中，可以创建一个 adapter：

### 创建 adapter 文件

在 `~/.bb-browser/sites/noxinfluencer/` 目录下创建 `login.js`：

```javascript
/* @meta
{
  "name": "noxinfluencer/login",
  "description": "登录 NoxInfluencer 账号",
  "domain": "cn.noxinfluencer.com",
  "args": {
    "username": {
      "required": true,
      "description": "用户名或邮箱"
    },
    "password": {
      "required": true,
      "description": "密码"
    }
  },
  "readOnly": false,
  "example": "bb-browser site noxinfluencer/login your_email@example.com your_password"
}
*/

async function login(args) {
  const { username, password } = args;
  
  if (!username || !password) {
    return {
      error: '缺少必需参数',
      hint: '请提供用户名和密码',
      usage: 'bb-browser site noxinfluencer/login <username> <password>'
    };
  }

  try {
    // 查找表单元素
    const usernameInput = document.querySelector('input[type="text"][placeholder*="账号"]');
    const passwordInput = document.querySelector('input[type="password"][placeholder*="密码"]');
    const loginButton = document.querySelector('.auth-button.username');

    if (!usernameInput || !passwordInput || !loginButton) {
      return {
        error: '未找到登录表单',
        hint: '请确保当前页面是 NoxInfluencer 登录页面',
        action: 'bb-browser open https://cn.noxinfluencer.com/login?userType=brand'
      };
    }

    // 填充表单
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 等待 Vue 更新
    await new Promise(resolve => setTimeout(resolve, 500));

    // 点击登录
    loginButton.click();

    // 等待登录完成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查登录状态
    const currentUrl = window.location.href;
    const isLoggedIn = !currentUrl.includes('/login');

    return {
      success: isLoggedIn,
      message: isLoggedIn ? '登录成功' : '登录中，请检查是否需要验证码',
      currentUrl,
      username: username.substring(0, 3) + '***'
    };

  } catch (error) {
    return {
      error: error.message,
      hint: '登录过程中发生错误'
    };
  }
}

// 导出函数
login;
```

### 使用 adapter

```powershell
# 登录
bb-browser site noxinfluencer/login "your_email@example.com" "your_password"

# 查看 adapter 信息
bb-browser site info noxinfluencer/login
```

## 🔍 调试技巧

### 查看网络请求
```powershell
# 清除网络记录
bb-browser network clear --tab <TAB_ID>

# 执行登录操作...

# 查看网络请求
bb-browser network requests --with-body --json --tab <TAB_ID>
```

### 查看控制台日志
```powershell
bb-browser console --tab <TAB_ID>
```

### 查看错误
```powershell
bb-browser errors --tab <TAB_ID>
```

### 截图
```powershell
bb-browser screenshot nox-debug.png --tab <TAB_ID>
```

## 📦 文件说明

- `nox-auto-login.ps1` - PowerShell 自动登录脚本（推荐使用）
- `nox-login-cli.js` - JavaScript 登录脚本（可通过 eval 执行）
- `nox-login-simple.js` - 简化版 JavaScript 脚本
- `login.js` - 单行压缩版脚本
- `NOX_LOGIN_README.md` - 本说明文档

## ⚠️ 注意事项

1. **安全性**：不要在公共场合或不安全的环境中使用明文密码
2. **验证码**：如果登录需要验证码，脚本会暂停，需要手动完成验证
3. **Tab ID**：每次打开新标签页，Tab ID 会变化，需要重新获取
4. **网络延迟**：如果网络较慢，可能需要增加等待时间

## 🎯 下一步

1. 分析登录 API 请求
2. 创建完整的 site adapter
3. 支持更多 NoxInfluencer 功能（搜索、数据获取等）

## 📚 相关文档

- [bb-browser 官方文档](https://github.com/epiral/bb-browser)
- [创建 site adapter 指南](https://github.com/epiral/bb-sites/blob/main/SKILL.md)
- [bb-browser guide](运行 `bb-browser guide` 查看)
