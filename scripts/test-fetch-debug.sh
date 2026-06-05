#!/bin/bash
# 调试 fetch 错误

echo "🔍 调试 bb-browser fetch 错误"
echo "=============================="

# 1. 测试简单的 eval
echo ""
echo "📋 1. 测试基本 eval..."
curl -s -X POST http://localhost:6666/command \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-1",
    "action": "eval",
    "script": "document.title"
  }' | python3 -m json.tool

# 2. 测试 fetch 到 httpbin（支持 CORS）
echo ""
echo "📋 2. 测试 fetch 到 httpbin.org..."
curl -s -X POST http://localhost:6666/api/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/get"
  }' | python3 -m json.tool

# 3. 测试详细的 fetch 脚本
echo ""
echo "📋 3. 测试详细的 fetch 脚本（查看错误）..."
curl -s -X POST http://localhost:6666/command \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-3",
    "action": "eval",
    "script": "(async () => { try { const resp = await fetch(\"https://api.github.com/users/octocat\"); return { ok: true, status: resp.status }; } catch (e) { return { ok: false, error: e.message, stack: e.stack }; } })()"
  }' | python3 -m json.tool

echo ""
echo "💡 分析："
echo "   - 如果 test-1 成功，说明 eval 工作正常"
echo "   - 如果 test-2 成功，说明 fetch 本身工作正常"
echo "   - 如果 test-3 失败，查看具体错误信息"
echo ""
