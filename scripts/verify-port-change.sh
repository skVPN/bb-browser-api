#!/bin/bash
# 验证端口修改

echo "🔍 验证 bb-browser 端口修改"
echo "=============================="

# 1. 检查常量定义
echo ""
echo "📋 1. 检查常量定义..."
PORT=$(grep "DAEMON_PORT = " packages/shared/src/constants.ts | grep -o "[0-9]*")
if [ "$PORT" = "6666" ]; then
    echo "✅ 常量定义正确: DAEMON_PORT = $PORT"
else
    echo "❌ 常量定义错误: DAEMON_PORT = $PORT (应该是 6666)"
    exit 1
fi

# 2. 检查测试脚本
echo ""
echo "📋 2. 检查测试脚本..."
JS_PORT=$(grep "DAEMON_PORT = " test/test-api-fetch.js | grep -o "[0-9]*")
PY_PORT=$(grep "DAEMON_PORT = " test/test-api-fetch.py | grep -o "[0-9]*")

if [ "$JS_PORT" = "6666" ]; then
    echo "✅ Node.js 测试脚本: $JS_PORT"
else
    echo "❌ Node.js 测试脚本: $JS_PORT (应该是 6666)"
fi

if [ "$PY_PORT" = "6666" ]; then
    echo "✅ Python 测试脚本: $PY_PORT"
else
    echo "❌ Python 测试脚本: $PY_PORT (应该是 6666)"
fi

# 3. 检查示例代码
echo ""
echo "📋 3. 检查示例代码..."
EXAMPLE_PORT=$(grep "DAEMON_URL = " examples/fetch-api-example.js | grep -o "[0-9]*")
if [ "$EXAMPLE_PORT" = "6666" ]; then
    echo "✅ 示例代码: $EXAMPLE_PORT"
else
    echo "❌ 示例代码: $EXAMPLE_PORT (应该是 6666)"
fi

# 4. 检查文档
echo ""
echo "📋 4. 检查文档..."
DOC_COUNT=$(grep -r "localhost:6666" docs/ | wc -l)
echo "✅ 文档中找到 $DOC_COUNT 处 localhost:6666 引用"

# 5. 检查构建
echo ""
echo "📋 5. 检查构建状态..."
if [ -f "dist/daemon.js" ]; then
    echo "✅ 构建文件存在"
else
    echo "⚠️  构建文件不存在，需要运行: pnpm build"
fi

echo ""
echo "🎉 验证完成！"
echo ""
echo "下一步："
echo "  1. 重新构建: pnpm build"
echo "  2. 启动 daemon: bb-browser daemon start"
echo "  3. 测试 API: curl http://localhost:6666/status"
echo ""
