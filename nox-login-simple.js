/**
 * NoxInfluencer 简单登录脚本
 * 使用方法：
 * 1. 在浏览器中打开登录页面
 * 2. 运行此脚本，会弹出输入框要求输入用户名和密码
 */

(function() {
  // 弹出输入框获取用户名和密码
  const username = prompt('请输入 NoxInfluencer 用户名:');
  if (!username) {
    alert('已取消登录');
    return { cancelled: true };
  }

  const password = prompt('请输入密码:');
  if (!password) {
    alert('已取消登录');
    return { cancelled: true };
  }

  // 查找输入框
  const usernameInput = document.querySelector('input[type="text"][placeholder*="账号"]');
  const passwordInput = document.querySelector('input[type="password"][placeholder*="密码"]');
  const loginButton = document.querySelector('.auth-button.username');

  if (!usernameInput || !passwordInput || !loginButton) {
    alert('未找到登录表单元素');
    return { error: '未找到登录表单元素' };
  }

  // 填充用户名
  usernameInput.value = username;
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

  // 填充密码
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

  // 延迟点击登录按钮，确保 Vue 已更新
  setTimeout(() => {
    loginButton.click();
    console.log('登录按钮已点击');
  }, 500);

  return { 
    success: true, 
    message: '已填充用户名和密码，正在登录...' 
  };
})();
