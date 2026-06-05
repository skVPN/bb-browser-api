#!/bin/bash
# Docker 容器内 bb-browser-api 调试脚本

echo "=== bb-browser-api Docker 调试 ==="
echo ""

echo "1. 检查 Chrome 进程"
ps aux | grep -i chrome | grep -v grep
echo ""

echo "2. 检查 CDP 端口"
netstat -tlnp | grep 9222 || ss -tlnp | grep 9222
echo ""

echo "3. 测试 CDP 连接"
curl -s http://localhost:9222/json/version | head -20
echo ""

echo "4. 检查 supervisord 状态"
if command -v supervisorctl &> /dev/null; then
    supervisorctl status
fi
echo ""

echo "5. 检查环境变量"
echo "BB_CDP_PORT=${BB_CDP_PORT}"
echo "BB_DAEMON_PORT=${BB_DAEMON_PORT}"
echo "BB_BROWSER_CDP_URL=${BB_BROWSER_CDP_URL}"
echo ""

echo "6. 检查 Chrome 可执行文件"
which google-chrome google-chrome-stable chromium-browser chromium 2>/dev/null
echo ""

echo "7. 测试启动 daemon"
echo "推荐命令："
echo "  bb-browser-api daemon start http://localhost:9222"
echo "或："
echo "  export BB_BROWSER_CDP_URL=http://localhost:9222"
echo "  bb-browser-api daemon start"
