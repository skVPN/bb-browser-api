#!/bin/bash
# bb-browser 本地开发测试脚本

echo "🚀 bb-browser 本地开发环境设置"
echo "================================"

# 1. 卸载全局版本
echo ""
echo "📦 步骤 1: 卸载全局 bb-browser..."
npm uninstall -g bb-browser 2>/dev/null || true

# 2. 安装依赖
echo ""
echo "📦 步骤 2: 安装依赖..."
pnpm install

# 3. 构建项目
echo ""
echo "🔨 步骤 3: 构建项目..."
pnpm build

# 4. 链接到全局
echo ""
echo "🔗 步骤 4: 链接本地版本到全局..."
npm link

# 5. 验证安装
echo ""
echo "✅ 步骤 5: 验证安装..."
bb-browser --version

echo ""
echo "🎉 设置完成！"
echo ""
echo "下一步："
echo "  1. 启动 daemon: bb-browser daemon start"
echo "  2. 测试 API: node test/test-api-fetch.js"
echo "  3. 运行示例: node examples/fetch-api-example.js"
echo ""
