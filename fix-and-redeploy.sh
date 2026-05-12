#!/bin/bash
# 快速修复并重新部署脚本

set -e

echo "=========================================="
echo "bb-browser 快速修复和重新部署"
echo "=========================================="
echo

# 1. 拉取最新代码
echo "1️⃣  拉取最新代码..."
git pull

# 2. 转换换行符（防止 Windows 编辑器修改）
echo
echo "2️⃣  转换换行符为 LF..."
if command -v dos2unix &> /dev/null; then
    dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
    echo "✅ 使用 dos2unix 转换完成"
else
    # 使用 sed 转换
    sed -i 's/\r$//' docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
    echo "✅ 使用 sed 转换完成"
fi

# 3. 验证配置文件
echo
echo "3️⃣  验证配置文件..."
if command -v python3 &> /dev/null; then
    python3 validate-supervisord-strict.py docker/supervisord.conf
elif command -v python &> /dev/null; then
    python validate-supervisord-strict.py docker/supervisord.conf
else
    echo "⚠️  未找到 Python，跳过验证"
fi

# 4. 停止容器
echo
echo "4️⃣  停止容器..."
docker compose down

# 5. 重新构建镜像
echo
echo "5️⃣  重新构建镜像..."
docker compose build --no-cache

# 6. 启动容器
echo
echo "6️⃣  启动容器..."
docker compose up -d

# 7. 等待服务启动
echo
echo "7️⃣  等待服务启动（30秒）..."
sleep 30

# 8. 检查服务状态
echo
echo "8️⃣  检查服务状态..."
docker compose logs --tail=50 bb-browser

echo
echo "=========================================="
echo "部署完成"
echo "=========================================="
echo
echo "📊 检查服务状态："
echo "   docker compose exec bb-browser supervisorctl status"
echo
echo "📝 查看日志："
echo "   docker compose logs -f bb-browser"
echo
echo "🌐 访问服务："
echo "   noVNC: http://$(hostname -I | awk '{print $1}'):6080/vnc.html"
echo "   API:   http://$(hostname -I | awk '{print $1}'):18888"
