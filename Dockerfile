# ============================================================
# bb-browser — 纯运行环境镜像
# 基础镜像：debian:trixie-slim
#
# 策略：镜像只装依赖，代码通过 volume 挂载进来
# 好处：代码改动不需要重新 build 镜像
# ============================================================

FROM debian:trixie-slim

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
    DISPLAY=:${DISPLAY_NUM} \
    DISPLAY_NUM=${DISPLAY_NUM} \
    SCREEN_WIDTH=${SCREEN_WIDTH} \
    SCREEN_HEIGHT=${SCREEN_HEIGHT} \
    BB_DAEMON_PORT=${DAEMON_PORT} \
    BB_CDP_PORT=${CDP_PORT} \
    VNC_PORT=${VNC_PORT} \
    NOVNC_PORT=${NOVNC_PORT} \
    VNC_PASSWORD="" \
    BB_BROWSER_HOME=/data/bb-browser \
    PYTHONUNBUFFERED=1

# ── 换国内 apt 源（用 http 避免 SSL 鸡生蛋问题）────────────
RUN sed -i 's|https://deb.debian.org|http://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true; \
    printf 'Types: deb\nURIs: http://mirrors.ustc.edu.cn/debian\nSuites: trixie trixie-updates\nComponents: main contrib non-free non-free-firmware\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\nTypes: deb\nURIs: http://mirrors.ustc.edu.cn/debian-security\nSuites: trixie-security\nComponents: main contrib non-free non-free-firmware\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n' \
    > /etc/apt/sources.list.d/debian.sources

# ── 安装所有运行时依赖 + Node.js（合并为一个 RUN，只跑一次 apt-get update）
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 基础工具
    curl ca-certificates tini \
    # 虚拟显示 + VNC
    xvfb x11vnc novnc websockify \
    # 窗口管理器（Chrome 渲染需要）
    fluxbox \
    # Chromium
    chromium \
    # 字体（fonts-liberation 足够，fonts-noto-cjk 体积 100MB+ 仅中文网页需要）
    fonts-liberation \
    # 进程管理
    supervisor \
    && \
    # 安装 Node.js（setup 脚本内部会 apt-get update，所以放在同一层末尾）
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    # 清理，减小镜像体积
    rm -rf /var/lib/apt/lists/* && \
    node --version && npm --version

# ── 安装 pnpm ─────────────────────────────────────────────
RUN npm install -g pnpm@9.15.0 --registry=https://registry.npmmirror.com

# ── 代码目录（由 volume 挂载）────────────────────────────
WORKDIR /app

# ── 预安装依赖（利用 Docker 缓存）────────────────────────
# 只复制 package.json 和 lock 文件，利用 Docker 层缓存
# 这样只有依赖变化时才重新安装，代码变化不影响这一层
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/
COPY packages/daemon/package.json ./packages/daemon/
COPY packages/mcp/package.json ./packages/mcp/

# 安装所有依赖（包括 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile --prod=false

# ── 配置文件 ──────────────────────────────────────────────
# supervisord.conf 通过 volume 挂载，方便修改
# 只复制启动脚本到镜像
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/start-x11vnc.sh /start-x11vnc.sh
RUN chmod +x /entrypoint.sh /start-x11vnc.sh

# ── 数据目录 ──────────────────────────────────────────────
RUN mkdir -p /data/bb-browser /data/chrome-profile /root/.fluxbox \
    && echo "session.screen0.toolbar.visible: false" > /root/.fluxbox/init

# ── 暴露端口 ──────────────────────────────────────────────
EXPOSE ${NOVNC_PORT} ${VNC_PORT} ${DAEMON_PORT}

# ── 健康检查 ──────────────────────────────────────────────
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -sf http://127.0.0.1:${NOVNC_PORT} > /dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/entrypoint.sh"]
