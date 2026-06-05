#!/bin/bash
# 快速测试新添加�?/api/fetch 功能

echo "🧪 快速测�?bb-browser /api/fetch API"
echo "====================================="

# 检�?daemon 是否运行
echo ""
echo "📋 检�?daemon 状�?.."
curl -s http://localhost:6666/status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "�?Daemon 未运�?
    echo "   请先启动: bb-browser daemon start"
    exit 1
fi
echo "�?Daemon 正在运行"

# 测试 1: 简�?GET 请求
echo ""
echo "📋 测试 1: GitHub API GET 请求"
RESULT=$(curl -s -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.github.com/users/octocat"}')

STATUS=$(echo $RESULT | grep -o '"status":[0-9]*' | cut -d':' -f2)
if [ "$STATUS" = "200" ]; then
    echo "�?成功 (状态码: $STATUS)"
    echo "   响应: $(echo $RESULT | head -c 100)..."
else
    echo "�?失败"
    echo "   响应: $RESULT"
fi

# 测试 2: POST 请求
echo ""
echo "📋 测试 2: POST 请求"
RESULT=$(curl -s -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://jsonplaceholder.typicode.com/posts",
    "method": "POST",
    "body": "{\"title\":\"test\",\"body\":\"test\",\"userId\":1}",
    "headers": {"Content-Type": "application/json"}
  }')

STATUS=$(echo $RESULT | grep -o '"status":[0-9]*' | cut -d':' -f2)
if [ "$STATUS" = "201" ]; then
    echo "�?成功 (状态码: $STATUS)"
else
    echo "�?失败"
    echo "   响应: $RESULT"
fi

echo ""
echo "🎉 快速测试完成！"
echo ""
echo "运行完整测试�?
echo "  Node.js: node test/test-api-fetch.js"
echo "  Python:  python test/test-api-fetch.py"
echo ""
