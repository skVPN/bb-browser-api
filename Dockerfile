# ============================================================
# bb-browser daemon — Docker 镜像
# 基础镜像：python:3.11-slim-trixie (Debian trixie)
#
# 包含：
#   - Python 3.11（来自基础镜像）
#   - Node.js 20 LTS
#   - Chromium（无头浏览器，通过 CDP 供 daemon 使用）
#   - bb-browser daemon（监听 18888 端口）
# ============================================================

FROM python:3.11-slim-trixie

# ── 构建参数 ──────────────────────────────────────────────
ARG NODE_VERSION=20
ARG DAEMON_PORT=18888
ARG CDP_PORT=9222

# ── 环境变量 ──────────────────────────────────────────────
ENV DEBIAN_FRONTEND=noninteractive \
    # Node.js
    NODE_ENV=production \
    # Chromium 无头模式所需
    CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --disable-gpu --headless=new" \
    # bb-browser daemon 端口
    BB_DAEMON_PORT=${DAEMON_PORT} \
    BB_CDP_PORT=${CDP_PORT} \
    # 数据目录
    BB_BROWSER_HOME=/data/bb-browser \
    # Python 不缓冲输出
    PYTHONUNBUFFERED=1

# ── 1. 安装系统依赖 ───────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Node.js 安装工具
    curl \
    gnupg \
    ca-certificates \
    # Chromium 及其运行时依赖
    chromium \
    chromium-driver \
    # 进程管理
    supervisor \
    # 其他工具
    tini \
    && rm -rf /var/lib/apt/lists/*

# ── 2. 安装 Node.js ───────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version \
    && npm --version

# ── 3. 安装 pnpm ──────────────────────────────────────────
RUN npm install -g pnpm@9.15.0

# ── 4. 复制项目并构建 bb-browser ──────────────────────────
WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json tsup.config.ts ./
COPY packages/shared/package.json packages/shared/
COPY packages/daemon/package.json packages/daemon/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp/package.json packages/mcp/

# 安装依赖（仅生产依赖 + 构建工具）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/ packages/
COPY bin/ bin/

# 构建（生成 dist/daemon.js）
RUN pnpm build

# ── 5. 安装 Python 依赖（可选，按需修改） ─────────────────
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    fi

# ── 6. 配置 supervisord ───────────────────────────────────
# supervisord 负责同时管理 Chromium 和 bb-browser daemon
COPY docker/supervisord.conf /etc/supervisor/conf.d/bb-browser.conf

# ── 7. 启动脚本 ───────────────────────────────────────────
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ── 8. 数据目录 ───────────────────────────────────────────
RUN mkdir -p /data/bb-browser

# ── 9. 暴露端口 ───────────────────────────────────────────
# bb-browser daemon HTTP API
EXPOSE ${DAEMON_PORT}
# Chrome CDP（容器内部使用，通常不对外暴露）
# EXPOSE ${CDP_PORT}

# ── 10. 健康检查 ──────────────────────────────────────────
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -sf http://127.0.0.1:${DAEMON_PORT}/status | grep -q '"running"' || exit 1

# ── 11. 启动 ──────────────────────────────────────────────
# tini 作为 PID 1，处理僵尸进程
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/entrypoint.sh"]
