#!/bin/bash
# 浏览器检测修复验证脚本

set -e

echo "=========================================="
echo "浏览器检测修复验证"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_case() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ "$expected" = "pass" ]; then
            echo -e "${GREEN}✓ 通过${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗ 失败${NC} (预期失败但通过了)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        if [ "$expected" = "fail" ]; then
            echo -e "${GREEN}✓ 通过${NC} (预期失败)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${RED}✗ 失败${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
}

# 检查是否在 Docker 容器中
if [ -f "/.dockerenv" ]; then
    echo -e "${GREEN}✓ 在 Docker 容器中运行${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ 不在 Docker 容器中，某些测试可能失败${NC}"
    echo ""
fi

# 测试 1: 检查 chromium 可执行文件
echo "=== 阶段 1: 浏览器可执行文件检查 ==="
test_case "检查 /usr/bin/chromium 存在" "[ -f /usr/bin/chromium ]" "pass"
test_case "检查 /usr/bin/chromium 可执行" "[ -x /usr/bin/chromium ]" "pass"
test_case "chromium 命令可用" "command -v chromium" "pass"
echo ""

# 测试 2: 检查 CDP 端口
echo "=== 阶段 2: CDP 端口检查 ==="
CDP_PORT="${BB_CDP_PORT:-9222}"
test_case "CDP 端口 $CDP_PORT 可访问" "curl -sf http://127.0.0.1:$CDP_PORT/json/version" "pass"
echo ""

# 测试 3: 检查 bb-browser 构建
echo "=== 阶段 3: bb-browser 构建检查 ==="
test_case "dist/cli.js 存在" "[ -f /app/dist/cli.js ]" "pass"
test_case "dist/daemon.js 存在" "[ -f /app/dist/daemon.js ]" "pass"
test_case "bb-browser-api 命令可用" "command -v bb-browser-api" "pass"
echo ""

# 测试 4: 检查 daemon 功能
echo "=== 阶段 4: daemon 功能检查 ==="

# 先停止可能运行的 daemon
bb-browser-api daemon stop > /dev/null 2>&1 || true
sleep 2

# 启动 daemon
echo -n "启动 daemon ... "
if bb-browser-api daemon start > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 成功${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # 等待 daemon 就绪
    sleep 3
    
    # 检查 daemon 状态
    test_case "daemon 状态检查" "bb-browser-api daemon status" "pass"
    
    # 测试简单命令
    test_case "执行 tab list 命令" "bb-browser-api tab list" "pass"
    
    # 停止 daemon
    echo -n "停止 daemon ... "
    if bb-browser-api daemon stop > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 成功${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi
else
    echo -e "${RED}✗ 失败${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo ""
    echo -e "${RED}daemon 启动失败，跳过后续测试${NC}"
    echo ""
    echo "请运行诊断脚本："
    echo "  bash /diagnose-browser.sh"
fi

echo ""

# 测试 5: 检查诊断脚本
echo "=== 阶段 5: 诊断工具检查 ==="
test_case "诊断脚本存在" "[ -f /diagnose-browser.sh ]" "pass"
test_case "诊断脚本可执行" "[ -x /diagnose-browser.sh ]" "pass"
echo ""

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！浏览器检测修复成功。${NC}"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败。${NC}"
    echo ""
    echo "建议："
    echo "1. 运行诊断脚本: bash /diagnose-browser.sh"
    echo "2. 查看日志: supervisorctl tail -f bb-daemon"
    echo "3. 检查环境变量: env | grep BB_"
    exit 1
fi
