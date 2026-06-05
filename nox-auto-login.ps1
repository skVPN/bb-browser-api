# NoxInfluencer 自动登录脚本
# 使用 bb-browser 命令来操作浏览器

param(
    [Parameter(Mandatory=$false)]
    [string]$Username,
    
    [Parameter(Mandatory=$false)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [string]$TabId = "5312"
)

Write-Host "`n=== NoxInfluencer 自动登录 ===" -ForegroundColor Cyan

# 如果没有提供用户名，提示输入
if ([string]::IsNullOrEmpty($Username)) {
    $Username = Read-Host "`n请输入用户名/邮箱"
}

# 如果没有提供密码，提示输入
if ([string]::IsNullOrEmpty($Password)) {
    $SecurePassword = Read-Host "请输入密码" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

Write-Host "`n正在填充登录信息..." -ForegroundColor Yellow

# 使用 bb-browser 命令填充表单
try {
    # 填充用户名 (ref=1)
    Write-Host "填充用户名..." -ForegroundColor Gray
    bb-browser fill "@1" "$Username" --tab $TabId | Out-Null
    
    Start-Sleep -Milliseconds 500
    
    # 填充密码 (ref=2)
    Write-Host "填充密码..." -ForegroundColor Gray
    bb-browser fill "@2" "$Password" --tab $TabId | Out-Null
    
    Start-Sleep -Milliseconds 500
    
    # 点击登录按钮 (ref=5)
    Write-Host "点击登录按钮..." -ForegroundColor Gray
    bb-browser click "@5" --tab $TabId | Out-Null
    
    Write-Host "`n✓ 登录请求已发送！" -ForegroundColor Green
    Write-Host "正在等待登录完成..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 3
    
    # 检查是否登录成功
    $currentUrl = bb-browser get url --tab $TabId
    
    if ($currentUrl -notlike "*login*") {
        Write-Host "`n✓ 登录成功！当前页面: $currentUrl" -ForegroundColor Green
    } else {
        Write-Host "`n⚠ 仍在登录页面，可能需要验证码或其他验证" -ForegroundColor Yellow
        Write-Host "请检查浏览器窗口" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n✗ 登录失败: $_" -ForegroundColor Red
}

Write-Host ""
