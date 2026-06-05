@echo off
REM 验证端口修改

echo 🔍 验证 bb-browser 端口修改
echo ==============================

REM 1. 检查常量定义
echo.
echo 📋 1. 检查常量定义...
findstr "DAEMON_PORT = " packages\shared\src\constants.ts | findstr "6666" >nul
if %errorlevel% equ 0 (
    echo ✅ 常量定义正确: DAEMON_PORT = 6666
) else (
    echo ❌ 常量定义错误
    exit /b 1
)

REM 2. 检查测试脚本
echo.
echo 📋 2. 检查测试脚本...
findstr "DAEMON_PORT = 6666" test\test-api-fetch.js >nul
if %errorlevel% equ 0 (
    echo ✅ Node.js 测试脚本: 6666
) else (
    echo ❌ Node.js 测试脚本端口错误
)

findstr "DAEMON_PORT = 6666" test\test-api-fetch.py >nul
if %errorlevel% equ 0 (
    echo ✅ Python 测试脚本: 6666
) else (
    echo ❌ Python 测试脚本端口错误
)

REM 3. 检查示例代码
echo.
echo 📋 3. 检查示例代码...
findstr "127.0.0.1:6666" examples\fetch-api-example.js >nul
if %errorlevel% equ 0 (
    echo ✅ 示例代码: 6666
) else (
    echo ❌ 示例代码端口错误
)

REM 4. 检查文档
echo.
echo 📋 4. 检查文档...
findstr /S "localhost:6666" docs\*.md >nul
if %errorlevel% equ 0 (
    echo ✅ 文档中包含 localhost:6666 引用
) else (
    echo ⚠️  文档中未找到 localhost:6666
)

REM 5. 检查构建
echo.
echo 📋 5. 检查构建状态...
if exist "dist\daemon.js" (
    echo ✅ 构建文件存在
) else (
    echo ⚠️  构建文件不存在，需要运行: pnpm build
)

echo.
echo 🎉 验证完成！
echo.
echo 下一步：
echo   1. 重新构建: pnpm build
echo   2. 启动 daemon: bb-browser daemon start
echo   3. 测试 API: curl http://localhost:6666/status
echo.

pause
