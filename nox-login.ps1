# NoxInfluencer 自动登录脚本
# 使用方法：
#   .\nox-login.ps1
#   .\nox-login.ps1 -Username "your_email" -Password "your_password"
#   .\nox-login.ps1 -TabId "5312"

param(
    [string]$Username = "",
    [string]$Password = "",
    [string]$TabId = ""
)

Write-Host "=== NoxInfluencer 自动登录工具 ===" -ForegroundColor Cyan

# 如果没有提供 TabId，获取当前标签页
if ($TabId -eq "") {
    Write-Host "正在查找 NoxInfluencer 登录页面..." -ForegroundColor Yellow
    $tabs = bb-browser tab list --json | ConvertFrom-Json
    $noxTab = $tabs.data.tabs | Where-Object { $_.url -like "*noxinfluencer.com/login*" } | Select-Object -First 1
    
    if ($noxTab) {
        $TabId = $noxTab.tab
        Write-Host "找到登录页面，Tab ID: $TabId" -ForegroundColor Green
    } else {
        Write-Host "未找到 NoxInfluencer 登录页面，正在打开..." -ForegroundColor Yellow
        bb-browser open "https://cn.noxinfluencer.com/login?userType=brand"
        Start-Sleep -Seconds 2
        $tabs = bb-browser tab list --json | ConvertFrom-Json
        $noxTab = $tabs.data.tabs | Where-Object { $_.url -like "*noxinfluencer.com/login*" } | Select-Object -First 1
        $TabId = $noxTab.tab
    }
}

# 如果没有提供用户名密码，提示输入
if ($Username -eq "") {
    $Username = Read-Host "请输入 NoxInfluencer 用户名/邮箱"
}

if ($Password -eq "") {
    $SecurePassword = Read-Host "请输入密码" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "正在登录..." -ForegroundColor Yellow

# 构建登录 JavaScript
$loginScript = @"
(function(username, password) {
    const usernameInput = document.querySelector('input[type="text"][placeholder*="账号"]');
    const passwordInput = document.querySelector('input[type="password"][placeholder*="密码"]');
    const loginButton = document.querySelector('.auth-button.username');
    
    if (!usernameInput || !passwordInput || !loginButton) {
        return { error: '未找到登录表单元素' };
    }
    
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    setTimeout(() => loginButton.click(), 500);
    
    return { success: true, message: '登录请求已发送' };
})('$($Username.Replace("'", "\'"))', '$($Password.Replace("'", "\'"))');
"@

# 执行登录
$result = bb-browser eval $loginScript --tab $TabId --json | ConvertFrom-Json

if ($result.success) {
    Write-Host "✓ 登录信息已填充，正在提交..." -ForegroundColor Green
    Start-Sleep -Seconds 3
    
    # 检查是否登录成功
    $currentUrl = bb-browser get url --tab $TabId
    if ($currentUrl -notlike "*login*") {
        Write-Host "✓ 登录成功！" -ForegroundColor Green
    } else {
        Write-Host "⚠ 请检查浏览器，可能需要验证码或其他验证" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ 登录失败: $($result.data.error)" -ForegroundColor Red
}
