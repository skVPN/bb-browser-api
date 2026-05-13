# 使用访问令牌发布到 npm
# 用法: .\scripts\publish-with-token.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== 使用访问令牌发布 bb-browser-api ===" -ForegroundColor Green
Write-Host ""

# 提示用户输入令牌
Write-Host "请粘贴你的 npm 访问令牌（输入时不会显示）:" -ForegroundColor Yellow
$token = Read-Host -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

if ([string]::IsNullOrWhiteSpace($tokenPlain)) {
    Write-Host "错误: 令牌不能为空" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "正在发布..." -ForegroundColor Green

# 使用令牌发布
$env:NPM_TOKEN = $tokenPlain
try {
    npm publish --access public --//registry.npmjs.org/:_authToken=$tokenPlain
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ 发布成功!" -ForegroundColor Green
        Write-Host ""
        Write-Host "查看你的包:" -ForegroundColor Green
        Write-Host "https://www.npmjs.com/package/bb-browser-api" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "测试安装:" -ForegroundColor Green
        Write-Host "npm install -g bb-browser-api" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "✗ 发布失败" -ForegroundColor Red
        exit 1
    }
} finally {
    # 清除令牌
    $env:NPM_TOKEN = $null
    $tokenPlain = $null
}
