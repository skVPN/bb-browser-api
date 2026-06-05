/**
 * NoxInfluencer 自动登录脚本
 * 使用方法：bb-browser eval "$(cat nox-login.js)" --tab <tabId>
 * 或者：node -e "console.log(require('fs').readFileSync('nox-login.js', 'utf8'))" | bb-browser eval - --tab <tabId>
 */

(async function noxLogin(username, password) {
  // 如果没有提供参数，从 prompt 获取
  if (!username) {
    username = prompt('请输入用户名:');
  }
  if (!password) {
    password = prompt('请输入密码:');
  }

  if (!username || !password) {
    return { error: '用户名或密码不能为空' };
  }

  try {
    // 查找输入框
    const usernameInput = document.querySelector('input[type="text"][placeholder*="账号"]');
    const passwordInput = document.querySelector('input[type="password"][placeholder*="密码"]');
    const loginButton = document.querySelector('.auth-button.username');

    if (!usernameInput || !passwordInput || !loginButton) {
      return { 
        error: '未找到登录表单元素',
        found: {
          usernameInput: !!usernameInput,
          passwordInput: !!passwordInput,
          loginButton: !!loginButton
        }
      };
    }

    // 填充用户名
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 填充密码
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 等待一小段时间确保 Vue 更新
    await new Promise(resolve => setTimeout(resolve, 500));

    // 监听网络请求
    const originalFetch = window.fetch;
    let loginRequest = null;
    
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('login') || url.includes('auth'))) {
        loginRequest = { url, options: args[1] };
      }
      return originalFetch.apply(this, args);
    };

    // 点击登录按钮
    loginButton.click();

    // 等待登录完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 恢复原始 fetch
    window.fetch = originalFetch;

    // 检查是否登录成功（URL 变化或者有 token）
    const currentUrl = window.location.href;
    const hasToken = document.cookie.includes('token') || 
                     localStorage.getItem('token') || 
                     sessionStorage.getItem('token');

    return {
      success: true,
      message: '登录请求已发送',
      currentUrl,
      hasToken,
      loginRequest,
      cookies: document.cookie
    };

  } catch (error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
})('YOUR_USERNAME', 'YOUR_PASSWORD');
