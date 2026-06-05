@echo off
REM 快速测试新添加�?/api/fetch 功能

echo 🧪 快速测�?bb-browser /api/fetch API
echo =====================================

REM 检�?daemon 是否运行
echo.
echo 📋 检�?daemon 状�?..
curl -s http://localhost:6666/status >nul 2>&1
if errorlevel 1 (
    echo �?Daemon 未运�?
    echo    请先启动: bb-browser daemon start
    exit /b 1
)
echo �?Daemon 正在运行

REM 测试 1: 简�?GET 请求
echo.
echo 📋 测试 1: GitHub API GET 请求
curl -s -X POST http://localhost:6666/api/fetch ^
  -H "Content-Type: application/json" ^
  -d "{\"url\": \"https://api.github.com/users/octocat\"}"
echo.
echo �?测试 1 完成

REM 测试 2: POST 请求
echo.
echo 📋 测试 2: POST 请求
curl -s -X POST http://localhost:6666/api/fetch ^
  -H "Content-Type: application/json" ^
  -d "{\"url\": \"https://jsonplaceholder.typicode.com/posts\", \"method\": \"POST\", \"body\": \"{\\\"title\\\":\\\"test\\\",\\\"body\\\":\\\"test\\\",\\\"userId\\\":1}\", \"headers\": {\"Content-Type\": \"application/json\"}}"
echo.
echo �?测试 2 完成

echo.
echo 🎉 快速测试完成！
echo.
echo 运行完整测试�?
echo   Node.js: node test/test-api-fetch.js
echo   Python:  python test/test-api-fetch.py
echo.

pause
