#!/bin/bash

# NPM 发布脚本
# 用法: ./scripts/publish.sh [patch|minor|major]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== bb-browser-api 发布脚本 ===${NC}\n"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查是否登录 npm
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}错误: 请先登录 npm (npm login)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm 登录状态正常${NC}"
echo -e "当前用户: $(npm whoami)\n"

# 检查工作区是否干净
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}警告: 工作区有未提交的更改${NC}"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "当前版本: ${YELLOW}${CURRENT_VERSION}${NC}\n"

# 确定版本更新类型
VERSION_TYPE=${1:-patch}
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}错误: 版本类型必须是 patch, minor 或 major${NC}"
    exit 1
fi

echo -e "${GREEN}步骤 1/6: 安装依赖${NC}"
pnpm install

echo -e "\n${GREEN}步骤 2/6: 运行构建${NC}"
pnpm build

echo -e "\n${GREEN}步骤 3/6: 运行测试${NC}"
if pnpm test 2>/dev/null; then
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${YELLOW}⚠ 未找到测试或测试失败${NC}"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "\n${GREEN}步骤 4/6: 更新版本号 (${VERSION_TYPE})${NC}"
npm version $VERSION_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "新版本: ${GREEN}${NEW_VERSION}${NC}"

echo -e "\n${GREEN}步骤 5/6: 本地打包测试${NC}"
npm pack
TARBALL="bb-browser-api-${NEW_VERSION}.tgz"
if [ -f "$TARBALL" ]; then
    echo -e "${GREEN}✓ 打包成功: ${TARBALL}${NC}"
    echo -e "\n包内容:"
    tar -tzf "$TARBALL" | head -20
    echo "..."
else
    echo -e "${RED}错误: 打包失败${NC}"
    exit 1
fi

echo -e "\n${GREEN}步骤 6/6: 发布到 npm${NC}"
echo -e "${YELLOW}即将发布版本 ${NEW_VERSION} 到 npm${NC}"
read -p "确认发布? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消发布${NC}"
    # 恢复版本号
    git checkout package.json 2>/dev/null || true
    rm -f "$TARBALL"
    exit 0
fi

# 发布
if npm publish --access public; then
    echo -e "\n${GREEN}✓ 发布成功!${NC}"
    
    # 提交版本更新
    git add package.json
    git commit -m "chore(release): v${NEW_VERSION}"
    git tag "v${NEW_VERSION}"
    
    echo -e "\n${GREEN}后续步骤:${NC}"
    echo "1. 推送代码和标签:"
    echo -e "   ${YELLOW}git push && git push --tags${NC}"
    echo "2. 在 GitHub 创建 Release"
    echo "3. 验证安装:"
    echo -e "   ${YELLOW}npm install -g bb-browser-api@${NEW_VERSION}${NC}"
    echo "4. 查看包页面:"
    echo -e "   ${YELLOW}https://www.npmjs.com/package/bb-browser-api${NC}"
else
    echo -e "\n${RED}✗ 发布失败${NC}"
    # 恢复版本号
    git checkout package.json 2>/dev/null || true
    exit 1
fi

# 清理
rm -f "$TARBALL"

echo -e "\n${GREEN}=== 发布完成 ===${NC}"
