# 常驻 Chrome Docker 镜像
FROM zenika/alpine-chrome:latest

# 设置环境变量
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/

# 暴露端口
EXPOSE 9222

# 启动 Chrome（常驻模式）
CMD ["chromium-browser", \
     "--headless", \
     "--no-sandbox", \
     "--disable-dev-shm-usage", \
     "--disable-gpu", \
     "--remote-debugging-address=0.0.0.0", \
     "--remote-debugging-port=9222", \
     "--disable-software-rasterizer", \
     "--disable-extensions", \
     "about:blank"]
