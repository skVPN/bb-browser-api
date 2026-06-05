@echo off
REM 根目录清理脚本（Windows 版本）
REM 将历史文档移动到 docs\archive 目录

echo ==========================================
echo 根目录清理脚本
echo ==========================================
echo.

REM 创建归档目录
if not exist docs\archive\api-updates mkdir docs\archive\api-updates
if not exist docs\archive\features mkdir docs\archive\features
if not exist docs\archive\fixes mkdir docs\archive\fixes
if not exist docs\archive\deployment mkdir docs\archive\deployment
if not exist docs\archive\troubleshooting mkdir docs\archive\troubleshooting
if not exist docs\archive\publish mkdir docs\archive\publish
if not exist docs\archive\implementation mkdir docs\archive\implementation
if not exist docs\archive\misc mkdir docs\archive\misc

echo 1. 移动 API 更新文档...
move /Y API_CHANGES_SUMMARY.md docs\archive\api-updates\ 2>nul
move /Y API_UPDATE_v0.11.5.md docs\archive\api-updates\ 2>nul
move /Y API_UPDATE_v0.11.6.md docs\archive\api-updates\ 2>nul
move /Y NEW_APIS_SUMMARY.md docs\archive\api-updates\ 2>nul
move /Y FETCH_API_SUMMARY.md docs\archive\api-updates\ 2>nul
move /Y QUICK_START_NEW_APIS.md docs\archive\api-updates\ 2>nul
move /Y CHANGELOG_NEW_APIS.md docs\archive\api-updates\ 2>nul

echo.
echo 2. 移动功能完成文档...
move /Y CDP_URL功能完成.md docs\archive\features\ 2>nul
move /Y 日志功能完成.md docs\archive\features\ 2>nul
move /Y 发布成功.md docs\archive\features\ 2>nul
move /Y 发布准备完成.md docs\archive\features\ 2>nul

echo.
echo 3. 移动修复文档...
move /Y CREDENTIALS_FIX_SUMMARY.md docs\archive\fixes\ 2>nul
move /Y CREDENTIALS_FIX_SUMMARY.zh-CN.md docs\archive\fixes\ 2>nul
move /Y verify-credentials-fix.md docs\archive\fixes\ 2>nul
move /Y 浏览器检测修复总结.md docs\archive\fixes\ 2>nul
move /Y 修复完成清单.md docs\archive\fixes\ 2>nul
move /Y CHANGELOG_v0.12.6-2.md docs\archive\fixes\ 2>nul

echo.
echo 4. 移动部署文档...
move /Y DEPLOYMENT_SUMMARY.md docs\archive\deployment\ 2>nul
move /Y FINAL_DEPLOYMENT.md docs\archive\deployment\ 2>nul
move /Y DOCKER_OPTIMIZATION.md docs\archive\deployment\ 2>nul
move /Y OPTIMIZATION_SUMMARY.md docs\archive\deployment\ 2>nul
move /Y SERVER_REBUILD.md docs\archive\deployment\ 2>nul
move /Y SERVER_QUICKSTART.md docs\archive\deployment\ 2>nul

echo.
echo 5. 移动故障排查文档...
move /Y DEBUG_DOCKER.md docs\archive\troubleshooting\ 2>nul
move /Y FIX_SUPERVISORD.md docs\archive\troubleshooting\ 2>nul
move /Y MANUAL_FIX.md docs\archive\troubleshooting\ 2>nul
move /Y QUICK_FIX.md docs\archive\troubleshooting\ 2>nul
move /Y QUICKFIX.md docs\archive\troubleshooting\ 2>nul
move /Y VNC_TROUBLESHOOTING.md docs\archive\troubleshooting\ 2>nul
move /Y VALIDATION_GUIDE.md docs\archive\troubleshooting\ 2>nul

echo.
echo 6. 移动发布文档...
move /Y PUBLISH_CHECKLIST.md docs\archive\publish\ 2>nul
move /Y PUBLISH_README.md docs\archive\publish\ 2>nul
move /Y PUBLISH_v0.12.2.md docs\archive\publish\ 2>nul
move /Y README_PUBLISH_CN.md docs\archive\publish\ 2>nul
move /Y NPM_注册指南.md docs\archive\publish\ 2>nul
move /Y 使用访问令牌发布.md docs\archive\publish\ 2>nul

echo.
echo 7. 移动实现报告...
move /Y IMPLEMENTATION_REPORT.md docs\archive\implementation\ 2>nul
move /Y PORT_CHANGE_SUMMARY.md docs\archive\implementation\ 2>nul
move /Y NODEJS_UPGRADE.md docs\archive\implementation\ 2>nul

echo.
echo 8. 移动其他文档...
move /Y CHROME_PATH_DISCOVERY.md docs\archive\misc\ 2>nul
move /Y SUPERVISORD_EXPLAINED.md docs\archive\misc\ 2>nul
move /Y 常驻Chrome方案.md docs\archive\misc\ 2>nul
move /Y 浏览器访问指南.md docs\archive\misc\ 2>nul
move /Y 用户通知.md docs\archive\misc\ 2>nul
move /Y 查看Chrome启动命令.md docs\archive\misc\ 2>nul
move /Y CDP_URL使用说明.md docs\archive\misc\ 2>nul
move /Y GIT_COMMIT_MESSAGE.md docs\archive\misc\ 2>nul

echo.
echo 9. 移动测试脚本到 scripts\...
move /Y check-services.sh scripts\ 2>nul
move /Y debug-chromium.sh scripts\ 2>nul
move /Y diagnose-supervisord.sh scripts\ 2>nul
move /Y diagnose.sh scripts\ 2>nul
move /Y diagnose.bat scripts\ 2>nul
move /Y docker-debug.sh scripts\ 2>nul
move /Y fix-and-redeploy.sh scripts\ 2>nul
move /Y fix-docker-build.sh scripts\ 2>nul
move /Y fix-turbo-missing.sh scripts\ 2>nul
move /Y fix-vnc.sh scripts\ 2>nul
move /Y install-docker-compose-v2.sh scripts\ 2>nul
move /Y quick-test.sh scripts\ 2>nul
move /Y quick-test.bat scripts\ 2>nul
move /Y test-fetch-debug.sh scripts\ 2>nul
move /Y test-fetch-debug.bat scripts\ 2>nul
move /Y test-setup.sh scripts\ 2>nul
move /Y test-setup.bat scripts\ 2>nul
move /Y verify-port-change.sh scripts\ 2>nul
move /Y verify-port-change.bat scripts\ 2>nul
move /Y validate-supervisord.py scripts\ 2>nul
move /Y validate-supervisord-strict.py scripts\ 2>nul

echo.
echo 10. 移动测试文件到 test\...
move /Y test-fetch-script.js test\ 2>nul
move /Y test-url-parse.js test\ 2>nul

echo.
echo ==========================================
echo 清理完成！
echo ==========================================
echo.
echo 归档文档位置：
echo   - docs\archive\api-updates\     - API 更新文档
echo   - docs\archive\features\        - 功能完成文档
echo   - docs\archive\fixes\           - 修复文档
echo   - docs\archive\deployment\      - 部署文档
echo   - docs\archive\troubleshooting\ - 故障排查文档
echo   - docs\archive\publish\         - 发布文档
echo   - docs\archive\implementation\  - 实现报告
echo   - docs\archive\misc\            - 其他文档
echo.
echo 脚本位置：
echo   - scripts\                      - 所有脚本文件
echo.
echo 测试文件位置：
echo   - test\                         - 所有测试文件
echo.
pause
