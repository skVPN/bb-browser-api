@echo off
REM bb-browser 本地开发测试脚本 (Windows)

echo 🚀 bb-browser 本地开发环境设置
echo ================================

REM 1. 卸载全局版本
echo.
echo 📦 步骤 1: 卸载全局 bb-browser...
call npm uninstall -g bb-browser 2>nul

REM 2. 安装依赖
echo.
echo 📦 步骤 2: 安装依赖...
call pnpm install

REM 3. 构建项目
echo.
echo 🔨 步骤 3: 构建项目...
call pnpm build

REM 4. 链接到全局
echo.
echo 🔗 步骤 4: 链接本地版本到全局...
call npm link

REM 5. 验证安装
echo.
echo ✅ 步骤 5: 验证安装...
call bb-browser --version

echo.
echo 🎉 设置完成！
echo.
echo 下一步：
echo   1. 启动 daemon: bb-browser daemon start
echo   2. 测试 API: node test/test-api-fetch.js
echo   3. 运行示例: node examples/fetch-api-example.js
echo.

pause
