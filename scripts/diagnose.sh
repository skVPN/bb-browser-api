#!/bin/bash
# 诊断 bb-browser daemon 状态

echo "🔍 bb-browser 诊断工具"
echo "====================="

# 1. 检查 daemon 状态
echo ""
echo "📋 1. 检查 daemon 状态..."
STATUS=$(curl -s http://localhost:6666/status)
if [ $? -eq 0 ]; then
    echo "✅ Daemon 正在运行"
    echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
else
    echo "❌ Daemon 未运行"
    echo "   请先启动: bb-browser daemon start"
    exit 1
fi

# 2. 检查 CDP 连接
echo ""
echo "📋 2. 检查 CDP 连接..."
CDP_CONNECTED=$(echo "$STATUS" | grep -o '"cdpConnected":[^,}]*' | cut -d':' -f2)
if [ "$CDP_CONNECTED" = "true" ]; then
    echo "✅ CDP 已连接"
else
    echo "❌ CDP 未连接"
    echo "   Chrome 可能没有运行或 CDP 端口不正确"
fi

# 3. 检查 tabs
echo ""
echo "📋 3. 检查 tabs..."
TAB_COUNT=$(echo "$STATUS" | grep -o '"tabs":\[[^]]*\]' | grep -o '{' | wc -l)
echo "   当前 tabs 数量: $TAB_COUNT"

if [ "$TAB_COUNT" -eq 0 ]; then
    echo "⚠️  没有可用的 tab"
    echo "   建议: 在 Chrome 中打开一个新标签页"
fi

# 4. 检查 Chrome 进程
echo ""
echo "📋 4. 检查 Chrome 进程..."
if pgrep -f "chrome" > /dev/null; then
    echo "✅ Chrome 进程正在运行"
else
    echo "❌ Chrome 进程未运行"
    echo "   请启动 Chrome 浏览器"
fi

# 5. 检查 CDP 端口
echo ""
echo "📋 5. 检查 CDP 端口..."
if lsof -i :9222 > /dev/null 2>&1; then
    echo "✅ CDP 端口 9222 正在监听"
elif lsof -i :19825 > /dev/null 2>&1; then
    echo "✅ CDP 端口 19825 正在监听"
else
    echo "❌ CDP 端口未监听"
    echo "   Chrome 可能没有启用远程调试"
fi

echo ""
echo "💡 建议："
echo "   1. 确保 Chrome 正在运行"
echo "   2. 打开至少一个标签页"
echo "   3. 如果问题持续，重启 daemon:"
echo "      bb-browser daemon shutdown"
echo "      bb-browser daemon start"
echo ""
