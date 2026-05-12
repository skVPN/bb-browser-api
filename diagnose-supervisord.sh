#!/bin/bash
# supervisord 配置诊断脚本
# 在服务器上运行此脚本来诊断问题

set -e

echo "=========================================="
echo "supervisord 配置诊断"
echo "=========================================="
echo

# 1. 检查本地文件
echo "1️⃣  检查本地 docker/supervisord.conf"
echo "----------------------------------------"
if [ -f "docker/supervisord.conf" ]; then
    echo "✅ 文件存在"
    
    # 检查换行符
    if file docker/supervisord.conf | grep -q "CRLF"; then
        echo "❌ 文件使用 CRLF 换行符（Windows 格式）"
        echo "   需要转换为 LF（Unix 格式）"
    else
        echo "✅ 文件使用 LF 换行符（Unix 格式）"
    fi
    
    # 检查是否有引号
    if grep -n 'environment=.*"' docker/supervisord.conf; then
        echo "❌ 发现 environment 字段包含引号："
        grep -n 'environment=.*"' docker/supervisord.conf
    else
        echo "✅ environment 字段没有引号"
    fi
    
    # 显示第 60-65 行
    echo
    echo "📄 第 60-65 行内容："
    sed -n '60,65p' docker/supervisord.conf | cat -n
else
    echo "❌ 文件不存在"
fi

echo
echo "2️⃣  检查容器内的配置文件"
echo "----------------------------------------"
if docker compose ps | grep -q bb-browser; then
    echo "✅ 容器正在运行"
    
    echo
    echo "📄 容器内配置文件第 60-65 行："
    docker compose exec -T bb-browser sed -n '60,65p' /etc/supervisor/conf.d/bb-browser.conf | cat -n
    
    echo
    echo "🔍 检查容器内是否有引号："
    if docker compose exec -T bb-browser grep 'environment=.*"' /etc/supervisor/conf.d/bb-browser.conf; then
        echo "❌ 容器内配置文件有引号！"
    else
        echo "✅ 容器内配置文件没有引号"
    fi
    
    echo
    echo "📊 supervisord 进程状态："
    docker compose exec -T bb-browser supervisorctl status || echo "❌ supervisord 未运行"
else
    echo "⚠️  容器未运行"
fi

echo
echo "3️⃣  Git 状态"
echo "----------------------------------------"
echo "当前分支："
git branch --show-current
echo
echo "最近 3 次提交："
git log --oneline -3
echo
echo "本地与远程的差异："
git status -sb

echo
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo
echo "💡 如果容器内配置文件有问题，请执行："
echo "   1. git pull                    # 拉取最新代码"
echo "   2. docker compose down         # 停止容器"
echo "   3. docker compose build        # 重新构建镜像"
echo "   4. docker compose up -d        # 启动容器"
