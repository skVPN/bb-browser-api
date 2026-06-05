# 项目结构说明

## 根目录文件

### 核心文档
```
README.md              - 项目主文档（英文）
README.zh-CN.md        - 项目主文档（中文）
CHANGELOG.md           - 变更日志
LICENSE                - 开源许可证
PRIVACY.md             - 隐私政策
```

### 开发文档
```
DEVELOPMENT.md         - 开发指南
AGENTS.md              - Agent 开发规范
```

### 部署文档
```
DEPLOY.md              - 快速部署指南
TROUBLESHOOTING.md     - 故障排查指南
QUICK_FIX_GUIDE.md     - 快速修复指南
SERVER_COMMANDS.md     - 服务器命令参考
```

### 配置文件
```
package.json           - 项目配置
pnpm-workspace.yaml    - pnpm 工作空间配置
pnpm-lock.yaml         - 依赖锁定文件
turbo.json             - Turbo 构建配置
tsconfig.base.json     - TypeScript 基础配置
tsup.config.ts         - 打包配置
eslint.config.mjs      - ESLint 配置
```

### Docker 相关
```
Dockerfile             - Docker 镜像构建文件
docker-compose.yml     - Docker Compose 配置
.dockerignore          - Docker 忽略文件
```

### Git 相关
```
.gitignore             - Git 忽略文件
.gitattributes         - Git 属性配置
```

### 发布相关
```
.npmignore             - npm 发布忽略文件
.release-please-manifest.json  - 发布配置
release-please-config.json     - 发布配置
```

### 其他
```
clip.json              - Clip 配置
requirements.txt       - Python 依赖（如果有）
```

## 目录结构

### `/packages` - 核心代码
```
packages/
├── shared/            - 共享类型和工具
├── cli/               - 命令行工具
├── daemon/            - 后台服务
└── mcp/               - MCP 服务器
```

### `/docs` - 文档目录
```
docs/
├── api-fetch.zh-CN.md         - Fetch API 文档
├── browser-detection-fix.md   - 浏览器检测修复说明
├── debug-logging.md           - 调试日志说明
├── docker-deployment.md       - Docker 部署详细文档
└── archive/                   - 归档文档
    ├── api-updates/           - API 更新历史
    ├── features/              - 功能完成记录
    ├── fixes/                 - 修复记录
    ├── deployment/            - 部署历史
    ├── troubleshooting/       - 故障排查历史
    ├── publish/               - 发布记录
    ├── implementation/        - 实现报告
    └── misc/                  - 其他文档
```

### `/scripts` - 脚本目录
```
scripts/
├── cleanup-root.sh            - 根目录清理脚本
├── cleanup-root.bat           - 根目录清理脚本（Windows）
├── check-services.sh          - 检查服务状态
├── diagnose.sh                - 诊断脚本
├── docker-debug.sh            - Docker 调试脚本
├── fix-*.sh                   - 各种修复脚本
├── test-*.sh                  - 测试脚本
└── validate-*.py              - 验证脚本
```

### `/test` - 测试目录
```
test/
├── test-browser-detection.sh  - 浏览器检测测试
├── test-fetch-script.js       - Fetch 测试脚本
├── test-url-parse.js          - URL 解析测试
└── README.md                  - 测试说明
```

### `/docker` - Docker 相关文件
```
docker/
├── entrypoint.sh              - 容器入口脚本
├── start-chromium.sh          - Chrome 启动脚本
├── start-x11vnc.sh            - VNC 启动脚本
├── diagnose-browser.sh        - 浏览器诊断脚本
└── supervisord.conf           - Supervisord 配置
```

### `/examples` - 示例代码
```
examples/
└── (各种使用示例)
```

### `/skills` - Skills 定义
```
skills/
└── (各种 skill 定义)
```

### `/bin` - 可执行文件
```
bin/
└── bb-browser-provider.ts     - Provider 入口
```

### `/dist` - 构建输出
```
dist/
├── cli.js                     - CLI 构建产物
├── daemon.js                  - Daemon 构建产物
├── mcp.js                     - MCP 构建产物
└── provider.js                - Provider 构建产物
```

### 其他目录
```
.github/                       - GitHub 配置（CI/CD、Issue 模板等）
.husky/                        - Git hooks
.turbo/                        - Turbo 缓存
node_modules/                  - 依赖包
```

## 文件组织原则

### 1. 根目录保持简洁
- 只保留核心文档和配置文件
- 历史文档移到 `docs/archive/`
- 脚本文件移到 `scripts/`
- 测试文件移到 `test/`

### 2. 文档分类清晰
- 当前文档：根目录和 `docs/`
- 历史文档：`docs/archive/`
- 按类型归档：api-updates、features、fixes 等

### 3. 脚本集中管理
- 所有脚本放在 `scripts/` 目录
- 按功能命名：`check-*`、`diagnose-*`、`fix-*`、`test-*`
- 提供 `.sh` 和 `.bat` 两个版本

### 4. 测试独立目录
- 所有测试文件放在 `test/` 目录
- 包含测试脚本和测试数据
- 提供 README 说明

## 清理指南

### 运行清理脚本

**Linux/macOS:**
```bash
bash scripts/cleanup-root.sh
```

**Windows:**
```cmd
scripts\cleanup-root.bat
```

### 手动清理

如果需要手动清理，按以下顺序：

1. **移动历史文档到归档目录**
   ```bash
   mv API_*.md docs/archive/api-updates/
   mv *_SUMMARY.md docs/archive/
   ```

2. **移动脚本到 scripts 目录**
   ```bash
   mv *.sh scripts/
   mv *.bat scripts/
   mv *.py scripts/
   ```

3. **移动测试文件到 test 目录**
   ```bash
   mv test-*.js test/
   ```

4. **删除重复文件**
   ```bash
   rm -f QUICK_FIX.md QUICKFIX.md
   ```

### 清理后验证

```bash
# 检查根目录文件数量（应该大幅减少）
ls -1 | wc -l

# 检查归档目录
ls -R docs/archive/

# 检查脚本目录
ls scripts/

# 检查测试目录
ls test/
```

## 维护建议

### 1. 新文档放置
- **临时文档**：根目录（完成后移到归档）
- **永久文档**：`docs/` 目录
- **历史文档**：`docs/archive/` 目录

### 2. 脚本管理
- 新脚本直接放在 `scripts/` 目录
- 提供 Linux 和 Windows 两个版本
- 添加注释说明用途

### 3. 定期清理
- 每个版本发布后清理一次
- 将完成的功能文档移到归档
- 删除过时的临时文件

### 4. 文档更新
- 保持 README 简洁明了
- 详细内容放在 `docs/` 目录
- 更新 CHANGELOG

## 相关文档

- [开发指南](../DEVELOPMENT.md)
- [部署指南](../DEPLOY.md)
- [归档文档说明](archive/README.md)
- [测试说明](../test/README.md)
