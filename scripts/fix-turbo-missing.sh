#!/bin/bash
# 修复 turbo 缺失问题
# 问题：pnpm install --frozen-lockfile 不安装 devDependencies，导致 turbo 命令找不到

set -e

echo "================================================"
echo " 修复 turbo 缺失问题"
echo "================================================"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "[ERROR] 请在项目根目录运行此脚本"
    exit 1
fi

echo "[INFO] 修改 docker/entrypoint.sh..."

# 备份原文件
cp docker/entrypoint.sh docker/entrypoint.sh.bak

# 修改 pnpm install 命令，添加 --prod=false
sed -i 's/pnpm install --frozen-lockfile$/pnpm install --frozen-lockfile --prod=false/' docker/entrypoint.sh

echo "[SUCCESS] 修改完成！"
echo ""
echo "下一步："
echo "  1. 重启容器: docker compose restart bb-browser"
echo "  2. 查看日志: docker compose logs -f bb-browser"
echo ""
echo "如果需要恢复原文件："
echo "  mv docker/entrypoint.sh.bak docker/entrypoint.sh"
