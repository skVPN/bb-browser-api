# ============================================================
# bb-browser daemon — Docker 镜像（含 VNC 可视化）
# 基础镜像：python:3.11-slim-trixie (Debian trixie)
#
# 包含：
#   - Python 3.11（来自基础镜像）
#   - Node.js 20 LTS
#   - Xvfb（虚拟显示器）
#   - x11vnc（VNC 服务器）
#   - noVNC（网页 VNC 客户端，6080 端口）
#   - Chromium（有界面模式，运行在虚拟显示器上）
#   - bb-browser daemon（监听 18888 端口，连接 Chrome CDP）
#   - fluxbox（轻量窗口管理器，让 Chrome 窗口正常显示）
# ============================================================

FROM python:3.11-slim-trixie

# ── 构建参数 ──────────────────────────────────────────────
ARG NODE_VERSION=20
ARG DAEMON_PORT=18888
ARG CDP_PORT=9222
ARG VNC_PORT=5900
ARG NOVNC_PORT=6080
ARG DISPLAY_NUM=99
ARG SCREEN_WIDTH=1280
ARG SCREEN_HEIGHT=900

# ── 环境变量 ──────────────────────────────────────────────
ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    # 虚拟显示器
    DISPLAY=:${DISPLAY_NUM} \
    DISPLAY_NUM=${DISPLAY_NUM} \
    SCREEN_WIDTH=${SCREEN_WIDTH} \
    SCREEN_HEIGHT=${SCREEN_HEIGHT} \
    # 端口
    BB_DAEMON_PORT=${DAEMON_PORT} \
    BB_CDP_PORT=${CDP_PORT} \
    VNC_PORT=${VNC_PORT} \
    NOVNC_PORT=${NOVNC_PORT} \
    # VNC 密码（空 = 不需要密码）
    VNC_PASSWORD="" \
    # 数据目录
    BB_BROWSER_HOME=/data/bb-browser \
    PYTHONUNBUFFERED=1

# ── 1. 安装系统依赖 ───────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 基础工具
    curl gnupg ca-certificates tini \
    # 虚拟显示器
    xvfb \
    # VNC 服务器
    x11vnc \
    # noVNC 依赖
    novnc websockify \
    # 轻量窗口管理器（让 Chrome 窗口正常渲染）
    fluxbox \
    # Chromium
    chromium \
    # 字体（网页正常显示中文等）
    fonts-noto-cjk \
    fonts-liberation \
    # 进程管理
    supervisor \
    # 其他
    procps \
    && rm -rf /var/lib/apt/lists/*

# ── 2. 安装 Node.js ───────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

# ── 3. 安装 pnpm ──────────────────────────────────────────
RUN npm install -g pnpm@9.15.0

# ── 4. 构建 bb-browser ────────────────────────────────────
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json tsup.config.ts ./
COPY packages/shared/package.json packages/shared/
COPY packages/daemon/package.json packages/daemon/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp/package.json packages/mcp/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY bin/ bin/

RUN pnpm build

# ── 5. 安装 Python 依赖 ───────────────────────────────────
COPY requirements.txt* ./
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    fi

# ── 6. supervisord 配置 ───────────────────────────────────
COPY docker/supervisord.conf /etc/supervisor/conf.d/bb-browser.conf

# ── 7. 启动脚本 ───────────────────────────────────────────
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ── 8. 数据目录 ───────────────────────────────────────────
RUN mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox
# fluxbox 最小配置，避免启动时询问
RUN echo "session.screen0.toolbar.visible: false" > /root/.fluxbox/init

# ── 9. 暴露端口 ───────────────────────────────────────────
EXPOSE ${NOVNC_PORT}   
# noVNC 网页访问（主要入口）
EXPOSE ${VNC_PORT}     
# 原生 VNC 客户端（可选）
EXPOSE ${DAEMON_PORT}  
# bb-browser HTTP API

# ── 10. 健康检查 ──────────────────────────────────────────
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -sf http://127.0.0.1:${NOVNC_PORT} > /dev/null || exit 1

# ── 11. 启动 ──────────────────────────────────────────────
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/entrypoint.sh"]
