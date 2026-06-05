#!/bin/bash
# 一键修复 Docker 构建问题
# 问题：turbo not found

set -e

echo "================================================"
echo " 修复 Docker 构建问题"
echo "================================================"

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "[ERROR] 请在项目根目录运行此脚本"
    exit 1
fi

echo ""
echo "[步骤 1/5] 检查 entrypoint.sh 是否已更新..."
if grep -q "prod=false" docker/entrypoint.sh; then
    echo "✅ entrypoint.sh 已包含修复"
else
    echo "❌ entrypoint.sh 未更新，正在修复..."
    cp docker/entrypoint.sh docker/entrypoint.sh.bak
    sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh
    echo "✅ 修复完成"
fi

echo ""
echo "[步骤 2/5] 停止并删除旧容器..."
docker compose down

echo ""
echo "[步骤 3/5] 删除旧镜像..."
docker rmi bb-browser:latest 2>/dev/null || echo "镜像不存在，跳过"

echo ""
echo "[步骤 4/5] 重新构建镜像（不使用缓存）..."
docker compose build --no-cache

echo ""
echo "[步骤 5/5] 启动服务..."
docker compose up -d

echo ""
echo "================================================"
echo " 修复完成！"
echo "================================================"
echo ""
echo "查看日志："
echo "  docker compose logs -f bb-browser"
echo ""
echo "预期输出："
echo "  [startup] 安装依赖（包括 devDependencies，用于构建）..."
echo "  [startup] 构建项目..."
echo "  [startup] 启动所有服务..."
echo ""
echo "访问服务："
echo "  noVNC: http://<服务器IP>:6080/vnc.html"
echo "  API:   http://<服务器IP>:18888"
echo ""
