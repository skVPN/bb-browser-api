#!/bin/bash
# 根目录清理脚本
# 将历史文档移动到 docs/archive 目录

set -e

echo "=========================================="
echo "根目录清理脚本"
echo "=========================================="
echo ""

# 创建归档目录
mkdir -p docs/archive/api-updates
mkdir -p docs/archive/features
mkdir -p docs/archive/fixes
mkdir -p docs/archive/deployment
mkdir -p docs/archive/troubleshooting
mkdir -p docs/archive/publish
mkdir -p docs/archive/implementation
mkdir -p docs/archive/misc

echo "1. 移动 API 更新文档..."
mv -v API_CHANGES_SUMMARY.md docs/archive/api-updates/ 2>/dev/null || true
mv -v API_UPDATE_v0.11.5.md docs/archive/api-updates/ 2>/dev/null || true
mv -v API_UPDATE_v0.11.6.md docs/archive/api-updates/ 2>/dev/null || true
mv -v NEW_APIS_SUMMARY.md docs/archive/api-updates/ 2>/dev/null || true
mv -v FETCH_API_SUMMARY.md docs/archive/api-updates/ 2>/dev/null || true
mv -v QUICK_START_NEW_APIS.md docs/archive/api-updates/ 2>/dev/null || true
mv -v CHANGELOG_NEW_APIS.md docs/archive/api-updates/ 2>/dev/null || true

echo ""
echo "2. 移动功能完成文档..."
mv -v CDP_URL功能完成.md docs/archive/features/ 2>/dev/null || true
mv -v 日志功能完成.md docs/archive/features/ 2>/dev/null || true
mv -v 发布成功.md docs/archive/features/ 2>/dev/null || true
mv -v 发布准备完成.md docs/archive/features/ 2>/dev/null || true

echo ""
echo "3. 移动修复文档..."
mv -v CREDENTIALS_FIX_SUMMARY.md docs/archive/fixes/ 2>/dev/null || true
mv -v CREDENTIALS_FIX_SUMMARY.zh-CN.md docs/archive/fixes/ 2>/dev/null || true
mv -v verify-credentials-fix.md docs/archive/fixes/ 2>/dev/null || true
mv -v 浏览器检测修复总结.md docs/archive/fixes/ 2>/dev/null || true
mv -v 修复完成清单.md docs/archive/fixes/ 2>/dev/null || true
mv -v CHANGELOG_v0.12.6-2.md docs/archive/fixes/ 2>/dev/null || true

echo ""
echo "4. 移动部署文档..."
mv -v DEPLOYMENT_SUMMARY.md docs/archive/deployment/ 2>/dev/null || true
mv -v FINAL_DEPLOYMENT.md docs/archive/deployment/ 2>/dev/null || true
mv -v DOCKER_OPTIMIZATION.md docs/archive/deployment/ 2>/dev/null || true
mv -v OPTIMIZATION_SUMMARY.md docs/archive/deployment/ 2>/dev/null || true
mv -v SERVER_REBUILD.md docs/archive/deployment/ 2>/dev/null || true
mv -v SERVER_QUICKSTART.md docs/archive/deployment/ 2>/dev/null || true

echo ""
echo "5. 移动故障排查文档..."
mv -v DEBUG_DOCKER.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v FIX_SUPERVISORD.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v MANUAL_FIX.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v QUICK_FIX.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v QUICKFIX.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v VNC_TROUBLESHOOTING.md docs/archive/troubleshooting/ 2>/dev/null || true
mv -v VALIDATION_GUIDE.md docs/archive/troubleshooting/ 2>/dev/null || true

echo ""
echo "6. 移动发布文档..."
mv -v PUBLISH_CHECKLIST.md docs/archive/publish/ 2>/dev/null || true
mv -v PUBLISH_README.md docs/archive/publish/ 2>/dev/null || true
mv -v PUBLISH_v0.12.2.md docs/archive/publish/ 2>/dev/null || true
mv -v README_PUBLISH_CN.md docs/archive/publish/ 2>/dev/null || true
mv -v NPM_注册指南.md docs/archive/publish/ 2>/dev/null || true
mv -v 使用访问令牌发布.md docs/archive/publish/ 2>/dev/null || true

echo ""
echo "7. 移动实现报告..."
mv -v IMPLEMENTATION_REPORT.md docs/archive/implementation/ 2>/dev/null || true
mv -v PORT_CHANGE_SUMMARY.md docs/archive/implementation/ 2>/dev/null || true
mv -v NODEJS_UPGRADE.md docs/archive/implementation/ 2>/dev/null || true

echo ""
echo "8. 移动其他文档..."
mv -v CHROME_PATH_DISCOVERY.md docs/archive/misc/ 2>/dev/null || true
mv -v SUPERVISORD_EXPLAINED.md docs/archive/misc/ 2>/dev/null || true
mv -v 常驻Chrome方案.md docs/archive/misc/ 2>/dev/null || true
mv -v 浏览器访问指南.md docs/archive/misc/ 2>/dev/null || true
mv -v 用户通知.md docs/archive/misc/ 2>/dev/null || true
mv -v 查看Chrome启动命令.md docs/archive/misc/ 2>/dev/null || true
mv -v CDP_URL使用说明.md docs/archive/misc/ 2>/dev/null || true
mv -v GIT_COMMIT_MESSAGE.md docs/archive/misc/ 2>/dev/null || true

echo ""
echo "9. 移动测试脚本到 scripts/..."
mv -v check-services.sh scripts/ 2>/dev/null || true
mv -v debug-chromium.sh scripts/ 2>/dev/null || true
mv -v diagnose-supervisord.sh scripts/ 2>/dev/null || true
mv -v diagnose.sh scripts/ 2>/dev/null || true
mv -v diagnose.bat scripts/ 2>/dev/null || true
mv -v docker-debug.sh scripts/ 2>/dev/null || true
mv -v fix-and-redeploy.sh scripts/ 2>/dev/null || true
mv -v fix-docker-build.sh scripts/ 2>/dev/null || true
mv -v fix-turbo-missing.sh scripts/ 2>/dev/null || true
mv -v fix-vnc.sh scripts/ 2>/dev/null || true
mv -v install-docker-compose-v2.sh scripts/ 2>/dev/null || true
mv -v quick-test.sh scripts/ 2>/dev/null || true
mv -v quick-test.bat scripts/ 2>/dev/null || true
mv -v test-fetch-debug.sh scripts/ 2>/dev/null || true
mv -v test-fetch-debug.bat scripts/ 2>/dev/null || true
mv -v test-setup.sh scripts/ 2>/dev/null || true
mv -v test-setup.bat scripts/ 2>/dev/null || true
mv -v verify-port-change.sh scripts/ 2>/dev/null || true
mv -v verify-port-change.bat scripts/ 2>/dev/null || true
mv -v validate-supervisord.py scripts/ 2>/dev/null || true
mv -v validate-supervisord-strict.py scripts/ 2>/dev/null || true

echo ""
echo "10. 移动测试文件到 test/..."
mv -v test-fetch-script.js test/ 2>/dev/null || true
mv -v test-url-parse.js test/ 2>/dev/null || true

echo ""
echo "11. 删除重复的快速修复文档（保留 QUICK_FIX_GUIDE.md）..."
rm -f QUICK_FIX.md QUICKFIX.md 2>/dev/null || true

echo ""
echo "=========================================="
echo "清理完成！"
echo "=========================================="
echo ""
echo "归档文档位置："
echo "  - docs/archive/api-updates/     - API 更新文档"
echo "  - docs/archive/features/        - 功能完成文档"
echo "  - docs/archive/fixes/           - 修复文档"
echo "  - docs/archive/deployment/      - 部署文档"
echo "  - docs/archive/troubleshooting/ - 故障排查文档"
echo "  - docs/archive/publish/         - 发布文档"
echo "  - docs/archive/implementation/  - 实现报告"
echo "  - docs/archive/misc/            - 其他文档"
echo ""
echo "脚本位置："
echo "  - scripts/                      - 所有脚本文件"
echo ""
echo "测试文件位置："
echo "  - test/                         - 所有测试文件"
echo ""
