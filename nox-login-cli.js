/**
 * NoxInfluencer CLI 登录脚本
 * 
 * 使用方法：
 * 方式1（交互式）：
 *   bb-browser eval "$(Get-Content nox-login-cli.js -Raw)" --tab 5312
 * 
 * 方式2（命令行传参）：
 *   $username = "your_email@example.com"
 *   $password = "your_password"
 *   bb-browser eval "(function(u,p){const ui=document.querySelector('input[type=\"text\"][placeholder*=\"账号\"]');const pi=document.querySelector('input[type=\"password\"][placeholder*=\"密码\"]');const btn=document.querySelector('.auth-button.username');if(!ui||!pi||!btn)return{error:'未找到表单'};ui.value=u;ui.dispatchEvent(new Event('input',{bubbles:true}));pi.value=p;pi.dispatchEvent(new Event('input',{bubbles:true}));setTimeout(()=>btn.click(),500);return{success:true}})('$username','$password')" --tab 5312
 */

// 主登录函数
function noxLogin(username, password) {
  // 如果没有提供参数，使用 prompt
  if (!username) {
    username = prompt('请输入 NoxInfluencer 用户名/邮箱:');
    if (!username) return { cancelled: true, message: '已取消登录' };
  }
  
  if (!password) {
    password = prompt('请输入密码:');
    if (!password) return { cancelled: true, message: '已取消登录' };
  }

  // 查找表单元素
  const usernameInput = document.querySelector('input[type="text"][placeholder*="账号"]');
  const passwordInput = document.querySelector('input[type="password"][placeholder*="密码"]');
  const loginButton = document.querySelector('.auth-button.username');

  if (!usernameInput || !passwordInput || !loginButton) {
    return { 
      error: '未找到登录表单元素',
      debug: {
        usernameInput: !!usernameInput,
        passwordInput: !!passwordInput,
        loginButton: !!loginButton,
        allInputs: document.querySelectorAll('input').length
      }
    };
  }

  // 填充用户名
  usernameInput.value = username;
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
  usernameInput.dispatchEvent(new Event('blur', { bubbles: true }));

  // 填充密码
  passwordInput.value = password;
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));

  // 延迟点击登录按钮
  setTimeout(() => {
    console.log('点击登录按钮...');
    loginButton.click();
  }, 500);

  return { 
    success: true, 
    message: '已填充登录信息，正在提交...',
    username: username.substring(0, 3) + '***' // 只显示前3个字符
  };
}

// 如果直接运行（没有参数），使用交互式模式
noxLogin();
