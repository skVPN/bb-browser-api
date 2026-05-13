# NPM 发布脚本 (PowerShell)
# 用法: .\scripts\publish.ps1 [patch|minor|major]

param(
    [ValidateSet('patch', 'minor', 'major')]
    [string]$VersionType = 'patch'
)

$ErrorActionPreference = "Stop"

Write-Host "=== bb-browser-api 发布脚本 ===" -ForegroundColor Green
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "package.json")) {
    Write-Host "错误: 请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查是否登录 npm
try {
    $npmUser = npm whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "未登录"
    }
    Write-Host "✓ npm 登录状态正常" -ForegroundColor Green
    Write-Host "当前用户: $npmUser"
    Write-Host ""
} catch {
    Write-Host "错误: 请先登录 npm (npm login)" -ForegroundColor Red
    exit 1
}

# 检查工作区是否干净
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "警告: 工作区有未提交的更改" -ForegroundColor Yellow
    $continue = Read-Host "是否继续? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 1
    }
}

# 获取当前版本
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Write-Host "当前版本: $currentVersion" -ForegroundColor Yellow
Write-Host ""

Write-Host "步骤 1/6: 安装依赖" -ForegroundColor Green
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤 2/6: 运行构建" -ForegroundColor Green
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤 3/6: 运行测试" -ForegroundColor Green
pnpm test 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 测试通过" -ForegroundColor Green
} else {
    Write-Host "⚠ 未找到测试或测试失败" -ForegroundColor Yellow
    $continue = Read-Host "是否继续? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 1
    }
}

Write-Host ""
Write-Host "步骤 4/6: 更新版本号 ($VersionType)" -ForegroundColor Green
npm version $VersionType --no-git-tag-version
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 版本更新失败" -ForegroundColor Red
    exit 1
}

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$newVersion = $packageJson.version
Write-Host "新版本: $newVersion" -ForegroundColor Green

Write-Host ""
Write-Host "步骤 5/6: 本地打包测试" -ForegroundColor Green
npm pack
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 打包失败" -ForegroundColor Red
    git checkout package.json
    exit 1
}

$tarball = "bb-browser-api-$newVersion.tgz"
if (Test-Path $tarball) {
    Write-Host "✓ 打包成功: $tarball" -ForegroundColor Green
} else {
    Write-Host "错误: 打包文件未找到" -ForegroundColor Red
    git checkout package.json
    exit 1
}

Write-Host ""
Write-Host "步骤 6/6: 发布到 npm" -ForegroundColor Green
Write-Host "即将发布版本 $newVersion 到 npm" -ForegroundColor Yellow
$confirm = Read-Host "确认发布? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "已取消发布" -ForegroundColor Yellow
    git checkout package.json
    Remove-Item $tarball -ErrorAction SilentlyContinue
    exit 0
}

# 发布
npm publish --access public
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ 发布成功!" -ForegroundColor Green
    
    # 提交版本更新
    git add package.json
    git commit -m "chore(release): v$newVersion"
    git tag "v$newVersion"
    
    Write-Host ""
    Write-Host "后续步骤:" -ForegroundColor Green
    Write-Host "1. 推送代码和标签:"
    Write-Host "   git push && git push --tags" -ForegroundColor Yellow
    Write-Host "2. 在 GitHub 创建 Release"
    Write-Host "3. 验证安装:"
    Write-Host "   npm install -g bb-browser-api@$newVersion" -ForegroundColor Yellow
    Write-Host "4. 查看包页面:"
    Write-Host "   https://www.npmjs.com/package/bb-browser-api" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✗ 发布失败" -ForegroundColor Red
    git checkout package.json
    exit 1
}

# 清理
Remove-Item $tarball -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== 发布完成 ===" -ForegroundColor Green
