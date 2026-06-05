#!/bin/bash
# 安装 docker-compose v2 脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "================================================"
echo " 安装 docker-compose v2"
echo "================================================"

# 检测系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "[ERROR] 无法检测系统版本"
    exit 1
fi

echo "[INFO] 检测到系统: $OS $VERSION"

# 检查是否已安装 docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] 未检测到 Docker，请先安装 Docker"
    exit 1
fi

echo "[INFO] Docker 版本: $(docker --version)"

# 方法 1: 尝试通过 apt 安装 docker-compose-plugin
echo ""
echo "[INFO] 尝试方法 1: 通过 apt 安装 docker-compose-plugin..."

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # 更新包列表
    echo "[INFO] 更新包列表..."
    apt-get update || true
    
    # 尝试安装
    if apt-get install -y docker-compose-plugin 2>/dev/null; then
        echo "[SUCCESS] 通过 apt 安装成功！"
        docker compose version
        exit 0
    else
        echo "[WARN] apt 安装失败，尝试方法 2..."
    fi
fi

# 方法 2: 直接下载二进制
echo ""
echo "[INFO] 方法 2: 直接下载二进制文件..."

# 获取最新版本号
echo "[INFO] 获取最新版本号..."
COMPOSE_VERSION=$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "v2.24.5")
echo "[INFO] 最新版本: $COMPOSE_VERSION"

# 下载（优先使用 GitHub，失败则用镜像）
DOWNLOAD_URL="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)"
MIRROR_URL="https://ghproxy.com/${DOWNLOAD_URL}"

echo "[INFO] 下载 docker-compose..."
if curl -L "$DOWNLOAD_URL" -o /tmp/docker-compose 2>/dev/null; then
    echo "[INFO] 从 GitHub 下载成功"
elif curl -L "$MIRROR_URL" -o /tmp/docker-compose 2>/dev/null; then
    echo "[INFO] 从镜像下载成功"
else
    echo "[ERROR] 下载失败"
    exit 1
fi

# 安装
echo "[INFO] 安装到 /usr/local/bin/docker-compose..."
mv /tmp/docker-compose /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 创建软链接（让 docker compose 命令可用）
echo "[INFO] 创建软链接..."
mkdir -p /usr/libexec/docker/cli-plugins
ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose

# 验证安装
echo ""
echo "================================================"
echo " 安装完成！"
echo "================================================"
docker compose version

echo ""
echo "[INFO] 现在可以使用以下命令："
echo "  docker compose version"
echo "  docker compose up -d"
echo "  docker compose logs -f"
echo ""

# 检查是否有旧版本
if command -v docker-compose &> /dev/null; then
    OLD_VERSION=$(docker-compose --version 2>/dev/null || echo "unknown")
    echo "[WARN] 检测到旧版本 docker-compose: $OLD_VERSION"
    echo "[WARN] 建议卸载旧版本："
    echo "  sudo pip uninstall docker-compose"
    echo "  sudo apt-get remove docker-compose"
    echo "  sudo rm -f /usr/bin/docker-compose"
    echo ""
fi

echo "[SUCCESS] 安装完成！"
