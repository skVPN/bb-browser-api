@echo off
REM 诊断 bb-browser daemon 状态

echo 🔍 bb-browser 诊断工具
echo =====================

REM 1. 检查 daemon 状态
echo.
echo 📋 1. 检查 daemon 状态...
curl -s http://localhost:6666/status > status.json
if %errorlevel% equ 0 (
    echo ✅ Daemon 正在运行
    type status.json
) else (
    echo ❌ Daemon 未运行
    echo    请先启动: bb-browser daemon start
    del status.json 2>nul
    exit /b 1
)

REM 2. 检查 CDP 连接
echo.
echo 📋 2. 检查 CDP 连接...
findstr "cdpConnected.*true" status.json >nul
if %errorlevel% equ 0 (
    echo ✅ CDP 已连接
) else (
    echo ❌ CDP 未连接
    echo    Chrome 可能没有运行或 CDP 端口不正确
)

REM 3. 检查 tabs
echo.
echo 📋 3. 检查 tabs...
findstr "tabs" status.json
echo    如果 tabs 为空数组，请在 Chrome 中打开一个新标签页

REM 4. 检查 Chrome 进程
echo.
echo 📋 4. 检查 Chrome 进程...
tasklist | findstr "chrome.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Chrome 进程正在运行
) else (
    echo ❌ Chrome 进程未运行
    echo    请启动 Chrome 浏览器
)

REM 5. 检查端口
echo.
echo 📋 5. 检查端口监听...
netstat -ano | findstr ":6666" >nul
if %errorlevel% equ 0 (
    echo ✅ Daemon 端口 6666 正在监听
) else (
    echo ❌ Daemon 端口 6666 未监听
)

netstat -ano | findstr ":9222" >nul
if %errorlevel% equ 0 (
    echo ✅ CDP 端口 9222 正在监听
) else (
    netstat -ano | findstr ":19825" >nul
    if %errorlevel% equ 0 (
        echo ✅ CDP 端口 19825 正在监听
    ) else (
        echo ❌ CDP 端口未监听
        echo    Chrome 可能没有启用远程调试
    )
)

del status.json 2>nul

echo.
echo 💡 建议：
echo    1. 确保 Chrome 正在运行
echo    2. 打开至少一个标签页
echo    3. 如果问题持续，重启 daemon:
echo       bb-browser daemon shutdown
echo       bb-browser daemon start
echo.

pause
