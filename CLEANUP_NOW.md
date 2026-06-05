# 立即清理根目录

## 快速执行（2 分钟）

### Linux/macOS

```bash
# 1. 运行清理脚本
bash scripts/cleanup-root.sh

# 2. 查看结果
ls -1 | wc -l
# 应该从 100+ 减少到 ~20

# 3. 提交
git add .
git commit -m "重构(docs): 清理根目录，归档历史文档"
git push
```

### Windows

```cmd
REM 1. 运行清理脚本
scripts\cleanup-root.bat

REM 2. 查看结果
dir /b | find /c /v ""

REM 3. 提交
git add .
git commit -m "重构(docs): 清理根目录，归档历史文档"
git push
```

## 清理内容

### 移动到 `docs/archive/`
- ✅ API 更新文档（7 个文件）
- ✅ 功能完成文档（4 个文件）
- ✅ 修复文档（6 个文件）
- ✅ 部署文档（6 个文件）
- ✅ 故障排查文档（7 个文件）
- ✅ 发布文档（6 个文件）
- ✅ 实现报告（3 个文件）
- ✅ 其他文档（8 个文件）

### 移动到 `scripts/`
- ✅ 所有 `.sh` 脚本（~20 个）
- ✅ 所有 `.bat` 脚本（~5 个）
- ✅ 所有 `.py` 脚本（~2 个）

### 移动到 `test/`
- ✅ 所有 `test-*.js` 文件（~2 个）

## 清理后的根目录

```
bb-browser/
├── README.md                  ← 项目主文档
├── README.zh-CN.md
├── CHANGELOG.md
├── LICENSE
├── DEVELOPMENT.md
├── AGENTS.md
├── DEPLOY.md
├── TROUBLESHOOTING.md
├── QUICK_FIX_GUIDE.md
├── SERVER_COMMANDS.md
├── package.json
├── docker-compose.yml
├── Dockerfile
└── ... (配置文件)
```

## 验证

```bash
# 查看根目录文件数
ls -1 | wc -l
# 预期：~20 个

# 查看归档文档
ls -R docs/archive/
# 预期：47+ 个文件，分类清晰

# 查看脚本
ls scripts/
# 预期：27+ 个脚本

# 查看测试
ls test/
# 预期：3+ 个文件
```

## 回滚（如果需要）

```bash
# 如果清理后有问题，可以回滚
git reset --hard HEAD~1
```

## 详细说明

查看完整的清理方案：[根目录清理方案.md](根目录清理方案.md)

## 立即执行！

```bash
bash scripts/cleanup-root.sh
```

就这么简单！🎉
