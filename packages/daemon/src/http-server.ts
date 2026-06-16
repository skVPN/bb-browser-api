/**
 * HTTP Server for the CDP-direct daemon.
 *
 * Endpoints:
 *   POST /command   — receive Request, dispatch via CDP, return Response
 *   GET  /status    — daemon health + per-tab stats
 *   POST /shutdown  — graceful shutdown
 *
 * Bearer token authentication (optional, but enforced when token is set).
 * Two-phase startup: HTTP server starts immediately, CDP connects async.
 * Commands received before CDP is ready queue and wait.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import WebSocket, { WebSocketServer } from "ws";
import type { Request } from "@bb-browser/shared";
import { COMMAND_TIMEOUT, DAEMON_PORT, isUnderDomain } from "@bb-browser/shared";
import { CdpConnection } from "./cdp-connection.js";
import { dispatchRequest } from "./command-dispatch.js";

export interface HttpServerOptions {
  host?: string;
  port?: number;
  token?: string;
  cdp: CdpConnection;
  onShutdown?: () => void;
}

export class HttpServer {
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly token: string | null;
  private readonly cdp: CdpConnection;
  private readonly onShutdown?: () => void;
  private startTime = 0;

  constructor(options: HttpServerOptions) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? DAEMON_PORT;
    this.token = options.token ?? null;
    this.cdp = options.cdp;
    this.onShutdown = options.onShutdown;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // WebSocket upgrade: /ctrl?tabId=xxx -> screencast 控制通道
      //                   /cdp/devtools/* -> ws://127.0.0.1:cdpPort/devtools/*
      this.wss = new WebSocketServer({ noServer: true });
      this.server.on("upgrade", (req, socket, head) => {
        const url = req.url ?? "";
        if (url.startsWith("/ctrl")) {
          this.wss!.handleUpgrade(req, socket as Socket, head, (ws) => {
            this.handleCtrlWebSocket(req, ws);
          });
        } else if (url.startsWith("/cdp/")) {
          this.handleCdpWebSocketUpgrade(req, socket as Socket, head);
        } else {
          (socket as Socket).destroy();
        }
      });

      this.server.on("error", reject);

      this.server.listen(this.port, this.host, () => {
        this.startTime = Date.now();
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  get uptime(): number {
    if (this.startTime === 0) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  private checkAuth(req: IncomingMessage, res: ServerResponse): boolean {
    if (!this.token) return true;
    const auth = req.headers.authorization ?? "";
    if (auth === `Bearer ${this.token}`) return true;
    this.sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!this.checkAuth(req, res)) return;

    const url = req.url ?? "/";

    if (req.method === "POST" && url === "/command") {
      this.handleCommand(req, res);
    } else if (req.method === "POST" && url === "/api/fetch") {
      this.handleApiFetch(req, res);
    } else if (req.method === "GET" && url.startsWith("/api/capture")) {
      this.handleApiCapture(req, res);
    } else if (req.method === "GET" && url.startsWith("/api/storage")) {
      this.handleApiStorage(req, res);
    } else if (req.method === "GET" && url.startsWith("/api/screenshot")) {
      this.handleApiScreenshot(req, res);
    } else if (req.method === "POST" && url === "/api/cookies") {
      this.handleApiSetCookies(req, res);
    } else if (req.method === "POST" && url === "/api/input") {
      this.handleApiInput(req, res);
    } else if (url.startsWith("/cdp")) {
      // /cdp/* -> 反向代理到 Chrome DevTools (127.0.0.1:cdpPort)
      // 解决 Chrome 拒绝非本地 Host header 的安全限制.
      // 外部通过 :18888/cdp/json/version 访问, daemon 在容器内转发.
      this.handleCdpProxy(req, res);
    } else if (req.method === "GET" && url === "/status") {
      this.handleStatus(req, res);
    } else if (req.method === "POST" && url === "/shutdown") {
      this.handleShutdown(req, res);
    } else {
      this.sendJson(res, 404, { error: "Not found" });
    }
  }

  // ---------------------------------------------------------------------------
  // POST /command
  // ---------------------------------------------------------------------------

  private async handleCommand(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const request = JSON.parse(body) as Request;

      // Wait for CDP to be ready (two-phase startup)
      if (!this.cdp.connected) {
        try {
          await Promise.race([
            this.cdp.waitUntilReady(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("CDP connection timeout")), COMMAND_TIMEOUT),
            ),
          ]);
        } catch {
          const cdpTarget = `${this.cdp.host}:${this.cdp.port}`;
          const reason = this.cdp.lastError || "unknown";
          this.sendJson(res, 503, {
            id: request.id,
            success: false,
            error: `Chrome not connected (CDP at ${cdpTarget})`,
            reason,
            hint: "Make sure Chrome is running. Try: bb-browser daemon shutdown && bb-browser tab list",
          });
          return;
        }
      }

      // Dispatch with timeout
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Command timeout")), COMMAND_TIMEOUT),
      );
      const response = await Promise.race([
        dispatchRequest(this.cdp, request),
        timeout,
      ]);
      this.sendJson(res, 200, response);
    } catch (error) {
      this.sendJson(res, 400, {
        success: false,
        error: error instanceof Error ? error.message : "Invalid request",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/fetch
  // ---------------------------------------------------------------------------

  /**
   * 封装的 fetch API 路由
   * 
   * 请求体格式：
   * {
   *   "url": "https://example.com/api/data",
   *   "method": "GET",  // 可选，默认 GET
   *   "body": "...",    // 可选
   *   "headers": {},    // 可选
   *   "tabId": "..."    // 可选，指定 tab ID（支持短 ID）
   * }
   * 
   * 响应格式：
   * {
   *   "status": 200,
   *   "contentType": "application/json",
   *   "body": {...}
   * }
   */
  private async handleApiFetch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const params = JSON.parse(body) as {
        url: string;
        method?: string;
        body?: string;
        headers?: Record<string, string>;
        credentials?: "omit" | "same-origin" | "include";
        tabId?: string | number;
        /**
         * 仅在 inBrowser 模式下生效: 在指定域名下找/建一个 tab 来发请求.
         * 用于规避 about:blank / 跨域子域问题.
         */
        useDomain?: string;
        /**
         * 重定向处理 (默认 "follow"):
         *   "follow"  - 跟随到最终响应 (浏览器默认行为)
         *   "manual"  - 不跟随; 把 3xx 响应原样透传 (含 Location header).
         *               这种模式必须走 daemon 端 fetch (浏览器规范不允许 JS 拿到 opaque-redirect).
         *   "error"   - 遇到重定向直接报错; 同样会自动降级到 daemon 端 fetch.
         */
        redirect?: "follow" | "manual" | "error";
        /**
         * 强制选择请求路径:
         *   undefined / true (默认) - 在浏览器 tab 内执行 fetch (真实 Chrome stack, 反爬识别低,
         *                             SameSite/Service Worker 都正常)
         *   false                   - 在 daemon 端用 Node fetch + 浏览器 Cookie 执行
         *
         * 注意: redirect=manual / "error" 会自动强制 false (浏览器规范限制).
         */
        inBrowser?: boolean;
      };

      if (!params.url) {
        this.sendJson(res, 400, {
          error: "Missing url parameter",
          hint: "请求体必须包含 url 字段",
        });
        return;
      }

      // 等待 CDP 连接就绪 (两条路径都需要 CDP, 一条拿 cookie, 一条 attach tab)
      if (!this.cdp.connected) {
        try {
          await Promise.race([
            this.cdp.waitUntilReady(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("CDP connection timeout")), COMMAND_TIMEOUT),
            ),
          ]);
        } catch {
          const cdpTarget = `${this.cdp.host}:${this.cdp.port}`;
          const reason = this.cdp.lastError || "unknown";
          this.sendJson(res, 503, {
            error: `Chrome not connected (CDP at ${cdpTarget})`,
            reason,
            hint: "Make sure Chrome is running. Try: bb-browser daemon shutdown && bb-browser tab list",
          });
          return;
        }
      }

      // ---------------------------------------------------------------------
      // 路径选择:
      //   1. redirect=manual/error 或 inBrowser=false -> 强制 daemon 端 Node fetch
      //   2. 否则: 有对应域名 tab -> 浏览器内 fetch; 没有 -> daemon 端 Node fetch
      //
      // 设计理念: 已打开的 tab 说明用户曾访问过该站点, 浏览器内 fetch 是最真实的
      // (Chrome TLS/UA/Sec-Fetch-*/SameSite/Service Worker 全真).
      // 没有打开的 tab 时不自动新建 (避免意外导航), 退而用 daemon 端 fetch + Cookie 拷贝.
      // ---------------------------------------------------------------------
      const redirect = params.redirect ?? "follow";
      const browserCannotHandle = redirect === "manual" || redirect === "error";
      const forceDaemon = params.inBrowser === false || browserCannotHandle;

      if (forceDaemon) {
        await this.proxyNodeFetchWithBrowserCookies(res, {
          url: params.url,
          method: params.method ?? "GET",
          headers: params.headers,
          body: params.body,
          credentials: params.credentials ?? "include",
          redirect: params.redirect ?? "manual",
        });
        return;
      }

      // ---------------------------------------------------------------------
      // 尝试在已打开的同域 tab 内执行 fetch.
      // 如果没有找到合适的 tab, 降级到 daemon 端 Node fetch.
      // ---------------------------------------------------------------------

      // 解析目标 URL 用于选择 tab
      let targetTabId: string | number | undefined = params.tabId;

      if (!targetTabId && params.url) {
        try {
          const targetUrl = new URL(params.url);
          const targetOrigin = targetUrl.origin;
          const targetHost = targetUrl.hostname;

          // 计算 tab 的域名匹配规则:
          //   useDomain = "host.com" => 显式指定的字符串
          //   未提供                 => 完全 origin 匹配
          let matchDomain: string | null = null;
          if (typeof params.useDomain === "string" && params.useDomain) {
            matchDomain = params.useDomain.toLowerCase();
          }

          const targets = (await this.cdp.getTargets()).filter((t) => t.type === "page");

          let chosenTab: { id: string; url: string } | undefined;

          if (matchDomain) {
            // 在 matchDomain 范围内挑一个: 优先精确 host 匹配, 其次任意处于 matchDomain 之下
            chosenTab = targets.find((t) => {
              try { return new URL(t.url).hostname === targetHost; } catch { return false; }
            });
            if (!chosenTab) {
              chosenTab = targets.find((t) => {
                try { return isUnderDomain(new URL(t.url).hostname, matchDomain!); } catch { return false; }
              });
            }
          } else {
            // 默认: 完全 origin 匹配
            chosenTab = targets.find((t) => {
              try { return new URL(t.url).origin === targetOrigin; } catch { return false; }
            });
            // 退而求其次: 同 hostname (origin 可能 http vs https 不一致)
            if (!chosenTab) {
              chosenTab = targets.find((t) => {
                try { return new URL(t.url).hostname === targetHost; } catch { return false; }
              });
            }
          }

          if (chosenTab) {
            const tabState = this.cdp.tabManager.getTab(chosenTab.id);
            targetTabId = tabState?.shortId || chosenTab.id;
          }
        } catch {
          // URL 解析失败, targetTabId 保持 undefined
        }
      }

      // 没有找到合适的 tab -> 降级到 daemon 端 Node fetch
      // 此时 redirect 默认 manual (不跟随), 避免意外跟随到登录页返回 200 HTML.
      // 用户可显式传 "follow" 来覆盖.
      if (!targetTabId) {
        const daemonRedirect = params.redirect ?? "manual";
        await this.proxyNodeFetchWithBrowserCookies(res, {
          url: params.url,
          method: params.method ?? "GET",
          headers: params.headers,
          body: params.body,
          credentials: params.credentials ?? "include",
          redirect: daemonRedirect,
        });
        return;
      }

      const request: Request = {
        id: `fetch-${Date.now()}`,
        action: "fetch",
        url: params.url,
        method: params.method,
        body: params.body,
        headers: params.headers,
        credentials: params.credentials || "include",
        tabId: targetTabId,
      };

      // 执行命令
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Fetch timeout")), COMMAND_TIMEOUT),
      );
      const response = await Promise.race([
        dispatchRequest(this.cdp, request),
        timeout,
      ]);

      if (!response.success) {
        this.sendJson(res, 500, {
          error: response.error,
          hint: "Fetch 执行失败 (浏览器内)",
        });
        return;
      }

      // 把浏览器 fetch 返回的 { status, contentType, body } 透传成真正的 HTTP 响应.
      // 不再返回 JSON 信封.
      const fr = response.data?.fetchResponse;
      if (!fr) {
        this.sendJson(res, 500, { error: "No fetch response data" });
        return;
      }

      const status = fr.status && fr.status > 0 ? fr.status : 200;
      const contentType = fr.contentType || "application/octet-stream";
      res.setHeader("content-type", contentType);

      // body 可能是 string / object (浏览器 fetch handler 对 JSON 做了解析)
      let bodyBuf: Buffer;
      if (typeof fr.body === "string") {
        bodyBuf = Buffer.from(fr.body, "utf-8");
      } else if (fr.body === undefined || fr.body === null) {
        bodyBuf = Buffer.alloc(0);
      } else {
        // 之前被解析成对象的 JSON, 这里 stringify 回去保持原意
        bodyBuf = Buffer.from(JSON.stringify(fr.body), "utf-8");
      }

      res.setHeader("content-length", bodyBuf.length);
      res.writeHead(status);
      res.end(bodyBuf);
    } catch (error) {
      this.sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request",
        hint: "请求格式错误或执行失败",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/capture
  // ---------------------------------------------------------------------------

  /**
   * 抓包接口
   * 
   * 请求格式：
   * GET /api/capture?url=https://example.com&pattern=api\\.&timeout=5000
   * 
   * 参数说明：
   * - url: 要访问的页面 URL（必填）
   * - pattern: URL 匹配正则（可选）
   * - timeout: 等待时间（毫秒，可选，默认 5000）
   * 
   * 响应格式：
   * {
   *   "url": "...",
   *   "pattern": "...",
   *   "totalRequests": 50,
   *   "matchedRequests": 3,
   *   "requests": [...]
   * }
   */
  private async handleApiCapture(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // 解析 URL 参数
      const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
      const targetUrl = urlObj.searchParams.get('url');
      const pattern = urlObj.searchParams.get('pattern') || undefined;
      const timeout = parseInt(urlObj.searchParams.get('timeout') || '5000', 10);

      if (!targetUrl) {
        this.sendJson(res, 400, {
          error: "Missing url parameter",
          hint: "请求必须包含 url 参数，例如: /api/capture?url=https://example.com",
        });
        return;
      }

      // 等待 CDP 连接就绪
      if (!this.cdp.connected) {
        try {
          await Promise.race([
            this.cdp.waitUntilReady(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("CDP connection timeout")), COMMAND_TIMEOUT),
            ),
          ]);
        } catch {
          const cdpTarget = `${this.cdp.host}:${this.cdp.port}`;
          const reason = this.cdp.lastError || "unknown";
          this.sendJson(res, 503, {
            error: `Chrome not connected (CDP at ${cdpTarget})`,
            reason,
            hint: "Make sure Chrome is running.",
          });
          return;
        }
      }

      // 创建新 tab 用于抓包
      const created = await this.cdp.browserCommand<{ targetId: string }>(
        "Target.createTarget",
        { url: "about:blank", background: true },
      );
      await this.cdp.attachAndEnable(created.targetId);
      const tab = this.cdp.tabManager.getTab(created.targetId);
      
      if (!tab) {
        this.sendJson(res, 500, {
          error: "Failed to create tab",
          hint: "无法创建新标签页",
        });
        return;
      }

      try {
        // 清空网络请求缓存
        tab.clearNetwork();

        // 导航到目标页面
        await this.cdp.pageCommand(created.targetId, "Page.navigate", { url: targetUrl });

        // 等待网络请求完成
        const waitTime = timeout;
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // 获取所有网络请求
        const allRequests = tab.getNetworkRequests({}).items;

        // 如果提供了 pattern，进行过滤
        let filteredRequests = allRequests;
        if (pattern) {
          try {
            const regex = new RegExp(pattern);
            filteredRequests = allRequests.filter((req) => regex.test(req.url));
          } catch (e) {
            // 如果正则表达式无效，使用字符串匹配
            filteredRequests = allRequests.filter((req) => req.url.includes(pattern));
          }
        }

        // 获取响应体
        await Promise.all(
          filteredRequests.map(async (item) => {
            if (item.failed || item.responseBody !== undefined || item.bodyError !== undefined) return;
            try {
              const bodyResult = await this.cdp.sessionCommand<{ body: string; base64Encoded: boolean }>(
                created.targetId,
                "Network.getResponseBody",
                { requestId: item.requestId },
              );
              item.responseBody = bodyResult.body;
              item.responseBodyBase64 = bodyResult.base64Encoded;
            } catch (error) {
              item.bodyError = error instanceof Error ? error.message : String(error);
            }
          }),
        );

        // 返回结果
        this.sendJson(res, 200, {
          url: targetUrl,
          pattern: pattern,
          totalRequests: allRequests.length,
          matchedRequests: filteredRequests.length,
          requests: filteredRequests,
        });
      } finally {
        // 关闭 tab
        await this.cdp.browserCommand("Target.closeTarget", { targetId: created.targetId }).catch(() => {});
      }
    } catch (error) {
      this.sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request",
        hint: "请求格式错误或执行失败",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // GET /api/storage
  // ---------------------------------------------------------------------------

  /**
   * 存储接口
   * 
   * 请求格式：
   * GET /api/storage?domain=https://example.com
   * 
   * 参数说明：
   * - domain: 目标域名（必填，必须包含协议）
   * 
   * 响应格式：
   * {
   *   "domain": "https://example.com",
   *   "cookies": [...],
   *   "localStorage": {...},
   *   "sessionStorage": {...}
   * }
   */
  private async handleApiStorage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // 解析 URL 参数
      const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
      const domain = urlObj.searchParams.get('domain');

      if (!domain) {
        this.sendJson(res, 400, {
          error: "Missing domain parameter",
          hint: "请求必须包含 domain 参数，例如: /api/storage?domain=https://example.com",
        });
        return;
      }

      // 等待 CDP 连接就绪
      if (!this.cdp.connected) {
        try {
          await Promise.race([
            this.cdp.waitUntilReady(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("CDP connection timeout")), COMMAND_TIMEOUT),
            ),
          ]);
        } catch {
          const cdpTarget = `${this.cdp.host}:${this.cdp.port}`;
          const reason = this.cdp.lastError || "unknown";
          this.sendJson(res, 503, {
            error: `Chrome not connected (CDP at ${cdpTarget})`,
            reason,
            hint: "Make sure Chrome is running.",
          });
          return;
        }
      }

      // 查找或创建该域名的 tab
      let targetId: string | undefined;
      const targets = (await this.cdp.getTargets()).filter((t) => t.type === "page");
      
      // 尝试找到同域名的 tab
      const sameOriginTab = targets.find((t) => {
        try {
          const tabUrl = new URL(t.url);
          const targetUrl = new URL(domain);
          return tabUrl.origin === targetUrl.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginTab) {
        targetId = sameOriginTab.id;
      } else {
        // 创建新 tab 并导航到目标域名
        const created = await this.cdp.browserCommand<{ targetId: string }>(
          "Target.createTarget",
          { url: domain, background: true },
        );
        await this.cdp.attachAndEnable(created.targetId);
        targetId = created.targetId;
        
        // 等待页面加载
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // 获取 Cookies
      const cookiesResult = await this.cdp.sessionCommand<{
        cookies: Array<{
          name: string;
          value: string;
          domain: string;
          path: string;
          expires: number;
          size: number;
          httpOnly: boolean;
          secure: boolean;
          session: boolean;
          sameSite?: string;
        }>;
      }>(targetId, "Network.getCookies", {});

      // 获取 localStorage 和 sessionStorage
      const storageScript = `(() => {
        const local = {};
        const session = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) local[key] = localStorage.getItem(key);
          }
        } catch (e) {}
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) session[key] = sessionStorage.getItem(key);
          }
        } catch (e) {}
        return { localStorage: local, sessionStorage: session };
      })()`;

      const storageResult = await this.cdp.evaluate<{
        localStorage: Record<string, string>;
        sessionStorage: Record<string, string>;
      }>(targetId, storageScript, true);

      // 返回结果
      this.sendJson(res, 200, {
        domain: domain,
        cookies: cookiesResult.cookies,
        localStorage: storageResult?.localStorage ?? {},
        sessionStorage: storageResult?.sessionStorage ?? {},
      });
    } catch (error) {
      this.sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request",
        hint: "请求格式错误或执行失败",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // WS /ctrl?tabId=<id> — 控制页 WebSocket：screencast 推流 + 输入转发
  // ---------------------------------------------------------------------------

  /**
   * 控制页专用 WebSocket 通道。
   *
   * 建立连接后：
   *   1. 启动 Page.startScreencast（JPEG, quality=60, maxWidth=1280）
   *   2. 每帧通过 WS 发 binary JPEG（无 base64 开销）
   *   3. 客户端通过同一 WS 发 JSON 输入事件，直接转 CDP Input.*
   *   4. 断开时停止 screencast
   *
   * 客户端 -> 服务端消息格式（JSON）：
   *   { type: "mouseClick"|"mouseMove"|"wheel"|"keyDown"|"keyUp"|"navigate", ... }
   *
   * 服务端 -> 客户端消息：
   *   Binary: JPEG 帧数据
   *   Text JSON: { type: "meta", width, height } | { type: "error", message }
   */
  private async handleCtrlWebSocket(req: IncomingMessage, ws: WebSocket): Promise<void> {
    const urlObj = new URL(req.url ?? "/ctrl", `http://${req.headers.host ?? "localhost"}`);
    const tabId = urlObj.searchParams.get("tabId");

    if (!tabId) {
      ws.send(JSON.stringify({ type: "error", message: "缺少 tabId 参数" }));
      ws.close();
      return;
    }

    // 等待 CDP 就绪
    if (!this.cdp.connected) {
      try {
        await Promise.race([
          this.cdp.waitUntilReady(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("CDP timeout")), 10000)),
        ]);
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e) }));
        ws.close();
        return;
      }
    }

    // 确保 tab 已 attach
    try {
      await this.cdp.attachAndEnable(tabId);
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: `attach 失败: ${e instanceof Error ? e.message : String(e)}` }));
      ws.close();
      return;
    }

    // 获取页面尺寸，发给客户端用于坐标换算
    let pageWidth = 1280;
    let pageHeight = 720;
    try {
      const layout = await this.cdp.sessionCommand<{
        layoutViewport: { clientWidth: number; clientHeight: number };
      }>(tabId, "Page.getLayoutMetrics");
      pageWidth  = layout.layoutViewport.clientWidth  || 1280;
      pageHeight = layout.layoutViewport.clientHeight || 720;
    } catch { /* 使用默认值 */ }

    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "meta", width: pageWidth, height: pageHeight }));

    // 订阅 screencast 帧事件，直接把 JPEG binary 推给客户端
    const unsubscribe = this.cdp.onSessionEvent(tabId, "Page.screencastFrame", (params) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const data = params.data as string | undefined;
      const frameMetadata = params.metadata as Record<string, unknown> | undefined;
      const sessionId = params.sessionId as number | undefined;
      if (!data) return;

      // 发 binary JPEG（避免 base64 在 WS 上的额外开销）
      const buf = Buffer.from(data, "base64");
      ws.send(buf, { binary: true });

      // 更新页面尺寸（页面导航后尺寸可能变化）
      if (frameMetadata) {
        const w = frameMetadata.deviceWidth as number | undefined;
        const h = frameMetadata.deviceHeight as number | undefined;
        if (w && h && (w !== pageWidth || h !== pageHeight)) {
          pageWidth = w;
          pageHeight = h;
          ws.send(JSON.stringify({ type: "meta", width: w, height: h }));
        }
      }

      // 必须 ack，Chrome 才会继续推下一帧
      if (typeof sessionId === "number") {
        this.cdp.sessionCommand(tabId, "Page.screencastFrameAck", { sessionId }).catch(() => {});
      }
    });

    // 启动 screencast（尺寸先用页面实际尺寸，客户端连接后会发 resize 消息动态调整）
    let screencastWidth  = Math.max(pageWidth,  1280);
    let screencastHeight = Math.max(pageHeight, 720);
    const startScreencast = async (w: number, h: number) => {
      await this.cdp.sessionCommand(tabId, "Page.startScreencast", {
        format: "jpeg",
        quality: 75,
        maxWidth: w,
        maxHeight: h,
        everyNthFrame: 1,
      });
    };
    try {
      await startScreencast(screencastWidth, screencastHeight);
    } catch (e) {
      unsubscribe();
      ws.send(JSON.stringify({ type: "error", message: `startScreencast 失败: ${e instanceof Error ? e.message : String(e)}` }));
      ws.close();
      return;
    }

    // 处理客户端输入消息
    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      // resize 消息：客户端窗口尺寸变化，重启 screencast 以匹配分辨率
      if (msg.type === "resize") {
        const nw = Math.round(Number(msg.width  ?? screencastWidth));
        const nh = Math.round(Number(msg.height ?? screencastHeight));
        if (nw > 0 && nh > 0 && (nw !== screencastWidth || nh !== screencastHeight)) {
          screencastWidth  = nw;
          screencastHeight = nh;
          this.cdp.sessionCommand(tabId, "Page.stopScreencast").catch(() => {});
          startScreencast(nw, nh).catch(() => {});
        }
        return;
      }

      const { type: inputType } = msg;
      this.cdp.attachAndEnable(tabId).then(async () => {
        try {
          switch (inputType) {
            case "mouseClick": {
              const x = Number(msg.x ?? 0), y = Number(msg.y ?? 0);
              const button = (msg.button as string) || "left";
              await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
              await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button, clickCount: 1 });
              await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button, clickCount: 1 });
              break;
            }
            case "mouseMove": {
              const x = Number(msg.x ?? 0), y = Number(msg.y ?? 0);
              await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" });
              break;
            }
            case "wheel": {
              const x = Number(msg.x ?? 0), y = Number(msg.y ?? 0);
              await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: Number(msg.deltaX ?? 0), deltaY: Number(msg.deltaY ?? 0) });
              break;
            }
            case "keyDown": {
              const key = String(msg.key ?? ""), code = String(msg.code ?? key);
              const modifiers = Number(msg.modifiers ?? 0);
              const text = typeof msg.text === "string" ? msg.text : undefined;
              await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers, ...(text ? { text, unmodifiedText: text } : {}) });
              if (text && text.length === 1) {
                await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", { type: "char", key: text, text, unmodifiedText: text, modifiers });
              }
              break;
            }
            case "keyUp": {
              const key = String(msg.key ?? ""), code = String(msg.code ?? key);
              await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers: Number(msg.modifiers ?? 0) });
              break;
            }
            case "navigate": {
              const url = String(msg.url ?? "");
              if (url) await this.cdp.sessionCommand(tabId, "Page.navigate", { url });
              break;
            }
          }
        } catch { /* 忽略单次输入错误 */ }
      }).catch(() => {});
    });

    // 断开时清理
    ws.on("close", () => {
      unsubscribe();
      this.cdp.sessionCommand(tabId, "Page.stopScreencast").catch(() => {});
    });

    ws.on("error", () => {
      unsubscribe();
      this.cdp.sessionCommand(tabId, "Page.stopScreencast").catch(() => {});
    });
  }

  // ---------------------------------------------------------------------------
  // POST /api/input — 控制页专用：鼠标/键盘/导航直接转 CDP 原语
  // ---------------------------------------------------------------------------

  /**
   * 控制页直接输入端点，绕过 ref 查找，直接向 CDP 发送原始输入事件。
   *
   * 请求体 (JSON):
   *   { tabId: string, type: "mouseClick" | "mouseMove" | "wheel" | "keyDown" | "keyUp" | "navigate", ... }
   *
   * mouseClick: { tabId, type:"mouseClick", x, y, button?"left"|"right"|"middle" }
   * mouseMove:  { tabId, type:"mouseMove",  x, y }
   * wheel:      { tabId, type:"wheel",      x, y, deltaX, deltaY }
   * keyDown:    { tabId, type:"keyDown",    key, code?, text?, modifiers? }
   * keyUp:      { tabId, type:"keyUp",      key, code? }
   * navigate:   { tabId, type:"navigate",   url }
   *
   * 响应: { ok: true } 或 { error: string }
   */
  private async handleApiInput(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const raw = await this.readBody(req);
      const params = JSON.parse(raw) as Record<string, unknown>;

      const tabId = typeof params.tabId === "string" ? params.tabId : undefined;
      const inputType = typeof params.type === "string" ? params.type : "";

      if (!tabId) {
        this.sendJson(res, 400, { error: "缺少 tabId 参数" });
        return;
      }

      if (!this.cdp.connected) {
        this.sendJson(res, 503, { error: "CDP 未连接" });
        return;
      }

      // 确保 tab 已 attach
      await this.cdp.attachAndEnable(tabId);

      switch (inputType) {
        case "mouseClick": {
          // 先 move 到目标位置，再 down + up，模拟真实点击
          const x = Number(params.x ?? 0);
          const y = Number(params.y ?? 0);
          const button = (params.button as string) || "left";
          const clickCount = 1;
          await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", {
            type: "mouseMoved", x, y, button: "none",
          });
          await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", {
            type: "mousePressed", x, y, button, clickCount,
          });
          await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", {
            type: "mouseReleased", x, y, button, clickCount,
          });
          break;
        }

        case "mouseMove": {
          const x = Number(params.x ?? 0);
          const y = Number(params.y ?? 0);
          await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", {
            type: "mouseMoved", x, y, button: "none",
          });
          break;
        }

        case "wheel": {
          const x = Number(params.x ?? 0);
          const y = Number(params.y ?? 0);
          const deltaX = Number(params.deltaX ?? 0);
          const deltaY = Number(params.deltaY ?? 0);
          await this.cdp.sessionCommand(tabId, "Input.dispatchMouseEvent", {
            type: "mouseWheel", x, y, deltaX, deltaY,
          });
          break;
        }

        case "keyDown": {
          // 构造 CDP 键盘事件所需的字段
          const key = String(params.key ?? "");
          const code = String(params.code ?? key);
          // text 用于触发 insertText（可打印字符时有效）
          const text = typeof params.text === "string" ? params.text : undefined;
          const modifiers = Number(params.modifiers ?? 0);
          await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", {
            type: "keyDown", key, code, modifiers,
            ...(text ? { text, unmodifiedText: text } : {}),
          });
          // 对可打印字符额外发一个 char 事件，确保 keypress/input 事件触发
          if (text && text.length === 1) {
            await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", {
              type: "char", key: text, text, unmodifiedText: text, modifiers,
            });
          }
          break;
        }

        case "keyUp": {
          const key = String(params.key ?? "");
          const code = String(params.code ?? key);
          const modifiers = Number(params.modifiers ?? 0);
          await this.cdp.sessionCommand(tabId, "Input.dispatchKeyEvent", {
            type: "keyUp", key, code, modifiers,
          });
          break;
        }

        case "navigate": {
          const url = String(params.url ?? "");
          if (!url) {
            this.sendJson(res, 400, { error: "缺少 url 参数" });
            return;
          }
          await this.cdp.sessionCommand(tabId, "Page.navigate", { url });
          break;
        }

        default:
          this.sendJson(res, 400, { error: `未知输入类型: ${inputType}` });
          return;
      }

      this.sendJson(res, 200, { ok: true });
    } catch (e) {
      this.sendJson(res, 500, {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // POST /api/cookies
  // ---------------------------------------------------------------------------

  /**
   * 设置 Cookie (单个或批量).
   *
   * 请求体 (3 种风格, 任选其一):
   *
   * 1) 单个 cookie 对象:
   * {
   *   "url": "https://example.com",       // 用于推导 domain (与 domain 二选一)
   *   "domain": "example.com",            // 显式指定 domain (与 url 二选一, 优先 domain)
   *   "useDomain": "example.com",         // 可选, 强制覆盖 domain (例如目标 sub.example.com 改设到 example.com)
   *   "name": "session",
   *   "value": "abc123",
   *   "path": "/",                        // 可选, 默认 "/"
   *   "expires": 1893456000,              // 可选, Unix 秒, 不传则为 session cookie
   *   "maxAge": 3600,                     // 可选, 与 expires 二选一
   *   "httpOnly": false,
   *   "secure": true,
   *   "sameSite": "Lax"                   // "Strict" | "Lax" | "None"
   * }
   *
   * 2) 数组形式 (一次写多个):
   * { "url": "https://example.com", "cookies": [ {name, value, ...}, ... ] }
   *
   * 3) Set-Cookie 头字符串:
   * { "url": "https://example.com", "setCookie": "session=abc123; Path=/; Secure; HttpOnly" }
   * { "url": "https://example.com", "setCookie": ["a=1; Path=/", "b=2; Path=/"] }
   *
   * 响应:
   *   200 { "set": 2, "cookies": [ ... ] }
   *   400 { "error": "...", "hint": "..." }
   */
  private async handleApiSetCookies(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const raw = await this.readBody(req);
      const params = JSON.parse(raw) as SetCookiesRequest;

      // 等待 CDP
      if (!this.cdp.connected) {
        try {
          await Promise.race([
            this.cdp.waitUntilReady(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("CDP connection timeout")), COMMAND_TIMEOUT),
            ),
          ]);
        } catch {
          this.sendJson(res, 503, {
            error: `Chrome not connected (CDP at ${this.cdp.host}:${this.cdp.port})`,
            reason: this.cdp.lastError || "unknown",
            hint: "Make sure Chrome is running.",
          });
          return;
        }
      }

      // 推导默认 domain / url
      const defaultUrl = params.url;
      let defaultDomain = params.domain;
      if (!defaultDomain && defaultUrl) {
        try {
          defaultDomain = new URL(defaultUrl).hostname;
        } catch {}
      }
      if (typeof params.useDomain === "string" && params.useDomain) {
        defaultDomain = params.useDomain.toLowerCase();
      }

      // 收集所有要设置的 cookie
      const cookies: CdpCookieParam[] = [];

      // 1) 单条对象 (在顶层带 name+value)
      if (params.name && params.value !== undefined) {
        const c = buildCookieFromObject(params, defaultUrl, defaultDomain);
        if (c.error) {
          this.sendJson(res, 400, c.error);
          return;
        }
        cookies.push(c.cookie);
      }

      // 2) cookies 数组
      if (Array.isArray(params.cookies)) {
        for (const item of params.cookies) {
          const c = buildCookieFromObject(
            { ...item, useDomain: item.useDomain ?? params.useDomain },
            item.url ?? defaultUrl,
            item.domain ?? defaultDomain,
          );
          if (c.error) {
            this.sendJson(res, 400, c.error);
            return;
          }
          cookies.push(c.cookie);
        }
      }

      // 3) setCookie 字符串 (单个或数组)
      const setCookieRaw = params.setCookie;
      const setCookieList: string[] = Array.isArray(setCookieRaw)
        ? setCookieRaw
        : typeof setCookieRaw === "string"
          ? [setCookieRaw]
          : [];
      for (const headerStr of setCookieList) {
        const parsed = parseSetCookieHeader(headerStr, defaultUrl, defaultDomain);
        if (parsed.error) {
          this.sendJson(res, 400, parsed.error);
          return;
        }
        cookies.push(parsed.cookie);
      }

      if (cookies.length === 0) {
        this.sendJson(res, 400, {
          error: "Missing cookie data",
          hint: "请求体应包含 name+value, 或 cookies 数组, 或 setCookie 字符串",
        });
        return;
      }

      // 调用 CDP 写入
      await this.cdp.browserCommand("Storage.setCookies", { cookies });

      // 响应
      this.sendJson(res, 200, {
        set: cookies.length,
        cookies: cookies.map((c) => ({
          name: c.name,
          domain: c.domain,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          expires: c.expires,
        })),
      });
    } catch (error) {
      this.sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Invalid request",
        hint: "请求格式错误或执行失败",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: Node-side fetch with browser cookies — 完整透传响应
  // ---------------------------------------------------------------------------

  /**
   * 在 daemon 端用 Node fetch 执行请求, Cookie 从浏览器拷贝过来.
   * 然后把目标响应**原样**透传给调用方 (status / statusText / headers / body 全部),
   * 不包 JSON 信封.
   *
   * 这是 /api/fetch 的默认路径, 调用方就像在直接访问目标 URL, 但带浏览器登录态.
   */
  private async proxyNodeFetchWithBrowserCookies(
    res: ServerResponse,
    args: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      body?: string;
      credentials: "omit" | "same-origin" | "include";
      redirect: "follow" | "manual" | "error";
    },
  ): Promise<void> {
    // 收集 Cookie (除非 credentials=omit)
    let cookieHeader: string | undefined;
    if (args.credentials !== "omit") {
      try {
        // Storage.getCookies 是 browser-level 命令, 可以直接指定 urls 拿 cookie,
        // 不需要 attach 到任何 page target.
        // 注意: Network.getCookies 是 session-level (需要 target), 这里不能用.
        const result = await this.cdp.browserCommand<{
          cookies: Array<{ name: string; value: string }>;
        }>("Storage.getCookies", { browserContextId: undefined });
        
        // 手动过滤匹配目标 URL 域名的 cookie
        const targetUrl = new URL(args.url);
        const targetHost = targetUrl.hostname;
        
        const matchingCookies = result.cookies.filter((c: any) => {
          const cookieDomain = (c.domain || "").replace(/^\./, "");
          return targetHost === cookieDomain || targetHost.endsWith("." + cookieDomain);
        });
        
        if (matchingCookies.length > 0) {
          cookieHeader = matchingCookies.map((c) => `${c.name}=${c.value}`).join("; ");
        }
      } catch {
        // 如果 Storage.getCookies 失败, 尝试 fallback 到 Network.getAllCookies (也是 browser-level)
        try {
          const result = await this.cdp.browserCommand<{
            cookies: Array<{ name: string; value: string; domain: string }>;
          }>("Network.getAllCookies", {});
          
          const targetUrl = new URL(args.url);
          const targetHost = targetUrl.hostname;
          
          const matchingCookies = result.cookies.filter((c) => {
            const cookieDomain = (c.domain || "").replace(/^\./, "");
            return targetHost === cookieDomain || targetHost.endsWith("." + cookieDomain);
          });
          
          if (matchingCookies.length > 0) {
            cookieHeader = matchingCookies.map((c) => `${c.name}=${c.value}`).join("; ");
          }
        } catch {
          // 都拿不到就不带 cookie
        }
      }
    }

    // 构造请求头
    const headers: Record<string, string> = {
      ...(args.headers ?? {}),
    };
    if (cookieHeader) {
      headers["cookie"] = cookieHeader;
    }
    if (!Object.keys(headers).some((k) => k.toLowerCase() === "user-agent")) {
      headers["user-agent"] =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    const method = args.method.toUpperCase();
    const hasBody = args.body !== undefined && method !== "GET" && method !== "HEAD";

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(args.url, {
        method,
        headers,
        body: hasBody ? args.body : undefined,
        redirect: args.redirect,
      });
    } catch (e) {
      this.sendJson(res, 502, {
        error: e instanceof Error ? e.message : String(e),
        hint: "Upstream fetch failed (network error)",
      });
      return;
    }

    // 透传响应头. 跳过 hop-by-hop / 会破坏 Node http 响应的头.
    const skipHeaders = new Set([
      "transfer-encoding",
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "upgrade",
      "content-encoding", // body 已被 Node fetch 解码, 不能再说自己是 gzip
      "content-length", // 由 Node 重新计算
    ]);
    upstream.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        try {
          res.setHeader(key, value);
        } catch {
          // 个别 header 名/值可能非法, 忽略
        }
      }
    });

    res.writeHead(upstream.status, upstream.statusText || undefined);

    // 透传 body (3xx 通常空, 但仍可能有 HTML)
    if (upstream.body) {
      try {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.end(buf);
      } catch {
        res.end();
      }
    } else {
      res.end();
    }
  }

  // ---------------------------------------------------------------------------
  // /cdp/* — 反向代理到 Chrome DevTools Protocol + Viewer UI
  // ---------------------------------------------------------------------------

  /**
   * GET /cdp        → DevTools Viewer HTML (列出所有 tab, 点击打开 inspector)
   * GET /cdp?url=http://host:port → 查看指定 CDP 地址的 viewer
   * GET /cdp/*      → 反向代理到 Chrome DevTools HTTP API
   * WS  /cdp/*      → WebSocket 反向代理到 Chrome DevTools WS
   *
   * Chrome 强制检查 Host header: 非本地 IP 发来的请求会返回 403.
   * 通过这个代理, 外部客户端访问 :18888/cdp/...,
   * daemon 在容器内用 host=127.0.0.1 转发, 绕过 Chrome 的安全限制.
   */
  private async handleCdpProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const reqUrl = new URL(req.url ?? "/cdp", `http://${req.headers.host ?? "localhost"}`);
    const cdpPath = reqUrl.pathname.replace(/^\/cdp/, "") || "/";

    // GET /cdp (root, 可带 ?cdp= 参数) -> 返回 Viewer HTML
    if (cdpPath === "/" || cdpPath === "") {
      await this.handleCdpViewerPage(req, res, reqUrl);
      return;
    }

    // 代理其它路径到 Chrome CDP
    const cdpHost = this.cdp.host || "127.0.0.1";
    const cdpPort = this.cdp.port;
    const targetUrl = `http://${cdpHost}:${cdpPort}${cdpPath}`;

    try {
      const upstreamRes = await fetch(targetUrl, {
        method: req.method ?? "GET",
        headers: {
          host: `${cdpHost}:${cdpPort}`,
          ...(req.headers["accept"] ? { accept: req.headers["accept"] as string } : {}),
          ...(req.headers["content-type"] ? { "content-type": req.headers["content-type"] as string } : {}),
        },
        redirect: "follow",
      });

      const skipHeaders = new Set(["transfer-encoding", "connection", "keep-alive", "content-encoding", "content-length"]);
      upstreamRes.headers.forEach((value, key) => {
        if (!skipHeaders.has(key.toLowerCase())) {
          try { res.setHeader(key, value); } catch { /* ignore */ }
        }
      });

      res.setHeader("Access-Control-Allow-Origin", "*");
      const buf = Buffer.from(await upstreamRes.arrayBuffer());
      res.setHeader("content-length", buf.length);
      res.writeHead(upstreamRes.status);
      res.end(buf);
    } catch (e) {
      this.sendJson(res, 502, {
        error: e instanceof Error ? e.message : String(e),
        hint: "Chrome CDP not reachable",
      });
    }
  }

  /**
   * GET /cdp                       → 显示 daemon 连接的 Chrome 的 tab 列表
   * GET /cdp?cdp=http://host:port  → 显示指定 CDP 地址的 tab 列表
   * GET /cdp?url=https://example.com → 控制页：打开/找到该普通网页 tab 并显示控制界面
   *
   * 注意: ?cdp= 接受的是 Chrome CDP 地址 (如 http://localhost:9222)
   *       ?url= 接受的是普通网页 URL (如 https://www.youtube.com)
   */
  private async handleCdpViewerPage(req: IncomingMessage, res: ServerResponse, reqUrl: URL): Promise<void> {
    // 如果 ?url= 是普通网页 URL（不是 CDP 地址），转到控制页
    const urlParam = reqUrl.searchParams.get("url");
    if (urlParam) {
      // 判断是否是普通网页 URL（有 http(s) 协议，且不像 CDP 地址）
      try {
        const parsed = new URL(urlParam);
        // CDP 地址特征：hostname 是 localhost 或 IP，且 pathname 为空或仅有 "/"
        const isLocalHost = parsed.hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname);
        const hasNoPath = !parsed.pathname || parsed.pathname === "/";
        const looksLikeCdpAddress = isLocalHost && hasNoPath;
        // 不满足 CDP 特征，视为普通网页 URL，跳转到控制页
        if (!looksLikeCdpAddress) {
          await this.handleCdpControlPage(req, res, reqUrl, urlParam);
          return;
        }
      } catch {
        // URL 解析失败，走普通 viewer 流程
      }
    }

    // 支持 ?cdp= 参数指定远程 CDP 地址（?url= 已被上面的普通 URL 逻辑拦截）
    const rawParam = reqUrl.searchParams.get("cdp");
    let cdpHost = this.cdp.host || "127.0.0.1";
    let cdpPort = this.cdp.port;
    let cdpBaseUrl = `http://${cdpHost}:${cdpPort}`;
    let paramError = "";

    if (rawParam) {
      // 校验是否像 CDP 地址 (http://host:port)
      try {
        const parsed = new URL(rawParam);
        if (!parsed.hostname) throw new Error("缺少 hostname");
        const port = parseInt(parsed.port || "80", 10);
        if (isNaN(port) || port <= 0 || port > 65535) throw new Error("无效端口");
        // 简单检查: CDP 地址通常是 IP 或内网域名, 端口通常在 9000-19999 范围
        // 如果看起来像普通网页 (有路径 / 非数字端口等), 给出友好提示
        if (parsed.pathname && parsed.pathname !== "/") {
          paramError = `?cdp= 参数应该是 Chrome CDP 地址 (如 http://localhost:9222), 而不是网页 URL (${rawParam})`;
        } else {
          cdpHost = parsed.hostname;
          cdpPort = port;
          cdpBaseUrl = `http://${cdpHost}:${cdpPort}`;
        }
      } catch (e) {
        paramError = `无效的 CDP 地址: ${rawParam}。应该是 http://host:port 格式, 如 http://localhost:9222`;
      }
    }

    // 获取 tab 列表
    interface CdpTarget {
      id: string;
      type: string;
      title: string;
      url: string;
      webSocketDebuggerUrl?: string;
    }
    let targets: CdpTarget[] = [];
    let fetchError = "";

    if (!paramError) {
      try {
        const r = await fetch(`${cdpBaseUrl}/json/list`, {
          headers: { host: `${cdpHost}:${cdpPort}` },
          signal: AbortSignal.timeout(5000),
        });
        targets = await r.json() as CdpTarget[];
      } catch (e) {
        fetchError = e instanceof Error ? e.message : String(e);
      }
    }

    // 请求的 Host (外部访问的地址), 用于构造代理 WS URL
    const reqHost = req.headers["host"] || `localhost:${this.port}`;
    const currentCdpUrl = rawParam && !paramError ? rawParam : `http://${this.cdp.host || "127.0.0.1"}:${this.cdp.port}`;

    function escHtml(s: string): string {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const tabsHtml = targets
      .filter((t) => t.type === "page")
      .map((t) => {
        // 把 ws://host:port/devtools/page/xxx 替换成 ws://<外部host>/cdp/devtools/page/xxx
        const wsPath = t.webSocketDebuggerUrl
          ? t.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, "")
          : `/devtools/page/${t.id}`;
        const proxyWsHost = `${reqHost}/cdp${wsPath}`;

        // Chrome 官方 DevTools 前端
        const devtoolsUrl = `https://chrome-devtools-frontend.appspot.com/serve_rev/@9d2c8156a72129edca4785abb98866fad60ea338/inspector.html?ws=${encodeURIComponent(proxyWsHost)}`;

        const favicon = t.url.startsWith("http")
          ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(t.url).hostname)}`
          : "";

        return `
        <div class="tab-card">
          <div class="tab-info">
            ${favicon ? `<img class="favicon" src="${favicon}" onerror="this.style.display='none'" />` : '<div class="favicon-placeholder"></div>'}
            <div class="tab-text">
              <div class="tab-title">${escHtml(t.title || "(无标题)")}</div>
              <div class="tab-url">${escHtml(t.url)}</div>
            </div>
          </div>
          <div class="tab-actions">
            <a class="btn btn-devtools" href="${escHtml(devtoolsUrl)}" target="_blank">🔍 DevTools</a>
            <code class="tab-ws" title="ws://${escHtml(proxyWsHost)}">ws://…${escHtml(wsPath)}</code>
          </div>
        </div>`;
      })
      .join("\n");

    const allErrors = [paramError, fetchError].filter(Boolean);
    const errorHtml = allErrors.length > 0
      ? allErrors.map(e => `<div class="error-banner">⚠ ${escHtml(e)}</div>`).join("\n")
      : "";

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>bb-browser CDP Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }
    header { background: #1a1d27; border-bottom: 1px solid #2d3148; padding: 14px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    header h1 { font-size: 17px; font-weight: 600; color: #a78bfa; white-space: nowrap; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; flex-shrink: 0; }
    .cdp-form { display: flex; gap: 8px; flex: 1; min-width: 260px; }
    .cdp-input { flex: 1; background: #0f1117; border: 1px solid #2d3148; color: #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 13px; font-family: monospace; outline: none; }
    .cdp-input:focus { border-color: #4f46e5; }
    .cdp-btn { padding: 6px 14px; background: #4f46e5; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .cdp-btn:hover { background: #6366f1; }
    main { max-width: 960px; margin: 0 auto; padding: 20px 24px; }
    .info-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .info-card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 6px; padding: 8px 14px; font-size: 12px; color: #64748b; }
    .info-card code { color: #a78bfa; font-family: monospace; }
    .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
    .refresh-link { color: #4f46e5; font-size: 12px; text-decoration: none; cursor: pointer; }
    .tab-list { display: flex; flex-direction: column; gap: 8px; }
    .tab-card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: border-color 0.15s; }
    .tab-card:hover { border-color: #4f46e5; }
    .tab-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .favicon { width: 16px; height: 16px; border-radius: 2px; flex-shrink: 0; }
    .favicon-placeholder { width: 16px; height: 16px; background: #2d3148; border-radius: 2px; flex-shrink: 0; }
    .tab-text { min-width: 0; }
    .tab-title { font-size: 14px; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }
    .tab-url { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; margin-top: 2px; }
    .tab-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .btn { display: inline-block; padding: 5px 12px; border-radius: 5px; font-size: 13px; font-weight: 500; text-decoration: none; }
    .btn-devtools { background: #4f46e5; color: #fff; }
    .btn-devtools:hover { background: #6366f1; }
    .tab-ws { font-size: 11px; color: #475569; font-family: monospace; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty { text-align: center; padding: 40px; color: #475569; font-size: 14px; }
    .error-banner { background: #2d1a1a; border: 1px solid #7f1d1d; border-radius: 6px; padding: 10px 14px; color: #fca5a5; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <header>
    <span class="status-dot"></span>
    <h1>CDP Viewer</h1>
    <form class="cdp-form" method="GET" action="/cdp">
      <input class="cdp-input" type="text" name="cdp" value="${escHtml(currentCdpUrl)}" placeholder="http://localhost:9222 (Chrome CDP 地址)" />
      <button class="cdp-btn" type="submit">连接</button>
    </form>
  </header>
  <main>
    <div class="info-row">
      <div class="info-card">CDP: <code>${escHtml(cdpBaseUrl)}</code></div>
      <div class="info-card">代理: <code>ws://${escHtml(reqHost)}/cdp/devtools/page/&lt;id&gt;</code></div>
    </div>
    ${errorHtml}
    <div class="section-title">
      <span>标签页 (${targets.filter(t => t.type === "page").length})</span>
      <a class="refresh-link" href="?cdp=${encodeURIComponent(currentCdpUrl)}">↻ 刷新</a>
    </div>
    <div class="tab-list">
      ${targets.filter(t => t.type === "page").length > 0
        ? tabsHtml
        : `<div class="empty">${fetchError ? "连接失败" : "没有打开的标签页"}</div>`}
    </div>
  </main>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(html, "utf-8"));
    res.writeHead(200);
    res.end(html);
  }

  // ---------------------------------------------------------------------------
  // GET /cdp?url=<普通网页URL> — 远程控制页面
  // ---------------------------------------------------------------------------

  /**
   * 控制页: 用户输入普通 URL -> 找到/打开对应 tab -> 显示截图流 + 鼠标键盘控制
   *
   * 流程:
   *   1. 按 origin 在已有 tab 里找匹配的
   *   2. 没有就用 CDP 打开新 tab
   *   3. 渲染控制页面（截图轮询 + 鼠标/键盘事件转发）
   */
  private async handleCdpControlPage(
    req: IncomingMessage,
    res: ServerResponse,
    _reqUrl: URL,
    targetUrl: string,
  ): Promise<void> {
    function escHtml(s: string): string {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // 等待 CDP 就绪
    if (!this.cdp.connected) {
      try {
        await Promise.race([
          this.cdp.waitUntilReady(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("CDP connection timeout")), 10000),
          ),
        ]);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.writeHead(503);
        res.end(`<html><body style="background:#0f1117;color:#fca5a5;font-family:monospace;padding:40px">
          <h2>CDP 未连接</h2><p>${escHtml(errMsg)}</p>
          <p>请确认 Chrome 已启动，然后<a href="/cdp?url=${encodeURIComponent(targetUrl)}" style="color:#818cf8">刷新</a></p>
        </body></html>`);
        return;
      }
    }

    // 查找或创建对应 tab
    let tabId: string;
    let tabUrl = targetUrl;
    try {
      const targets = (await this.cdp.getTargets()).filter((t) => t.type === "page");
      let parsed: URL;
      try { parsed = new URL(targetUrl); } catch { parsed = new URL("about:blank"); }
      const targetOrigin = parsed.origin;

      // 先按 origin 匹配
      let found = targets.find((t) => {
        try { return new URL(t.url).origin === targetOrigin; } catch { return false; }
      });
      // 再按 hostname 匹配
      if (!found) {
        found = targets.find((t) => {
          try { return new URL(t.url).hostname === parsed.hostname; } catch { return false; }
        });
      }

      if (found) {
        tabId = found.id;
        tabUrl = found.url || targetUrl;
        // 确保 attach，直接复用已有 tab，不强制导航
        // 用户可以在控制页 URL 栏手动跳转
        await this.cdp.attachAndEnable(tabId);
      } else {
        // 创建新 tab
        const created = await this.cdp.browserCommand<{ targetId: string }>(
          "Target.createTarget",
          { url: targetUrl },
        );
        tabId = created.targetId;
        tabUrl = targetUrl;
        await this.cdp.attachAndEnable(tabId);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.writeHead(500);
      res.end(`<html><body style="background:#0f1117;color:#fca5a5;font-family:monospace;padding:40px">
        <h2>打开 Tab 失败</h2><p>${escHtml(errMsg)}</p>
        <a href="/cdp" style="color:#818cf8">返回列表</a>
      </body></html>`);
      return;
    }

    // 获取实际页面尺寸用于坐标计算
    let pageWidth = 1280;
    let pageHeight = 720;
    try {
      const layout = await this.cdp.sessionCommand<{
        layoutViewport: { clientWidth: number; clientHeight: number };
        visualViewport: { clientWidth: number; clientHeight: number };
        contentSize: { width: number; height: number };
      }>(tabId, "Page.getLayoutMetrics");
      pageWidth = layout.layoutViewport.clientWidth || 1280;
      pageHeight = layout.layoutViewport.clientHeight || 720;
    } catch {
      // 使用默认值
    }

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎮 ${escHtml(tabUrl)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }

    /* 截图铺满全屏 */
    #screen-wrap {
      position: fixed; inset: 0;
      cursor: crosshair;
    }
    #screen {
      width: 100%; height: 100%;
      object-fit: fill; display: block;
      user-select: none; -webkit-user-drag: none;
    }

    /* 悬浮 toolbar：默认隐藏，鼠标移到顶部 40px 触发显示 */
    #toolbar-trigger {
      position: fixed; top: 0; left: 0; right: 0; height: 40px;
      z-index: 99;
    }
    #toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(10,10,18,0.92);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(79,70,229,0.5);
      padding: 8px 12px;
      display: flex; align-items: center; gap: 8px;
      transform: translateY(-100%);
      transition: transform 0.18s ease;
    }
    /* 鼠标在 trigger 区或 toolbar 本身上时显示 */
    #toolbar-trigger:hover ~ #toolbar,
    #toolbar:hover { transform: translateY(0); }

    #toolbar a {
      color: #a78bfa; text-decoration: none; font-size: 18px; line-height: 1;
      flex-shrink: 0;
    }
    #url-form { display: flex; flex: 1; gap: 6px; }
    #url-input {
      flex: 1; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(79,70,229,0.5);
      color: #e2e8f0; border-radius: 6px;
      padding: 5px 12px; font-size: 13px; font-family: monospace;
      outline: none; min-width: 0;
    }
    #url-input:focus { border-color: #818cf8; background: rgba(255,255,255,0.12); }
    #url-btn {
      padding: 5px 14px; background: #4f46e5; color: #fff;
      border: none; border-radius: 6px; font-size: 13px; cursor: pointer;
      white-space: nowrap;
    }
    #url-btn:hover { background: #6366f1; }

    /* 状态角标：右下角悬浮 */
    #status-badge {
      position: fixed; bottom: 10px; right: 12px; z-index: 100;
      font-size: 11px; font-family: monospace;
      color: #475569; background: rgba(10,10,18,0.7);
      padding: 2px 8px; border-radius: 99px;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    #status-badge.ok  { color: #22c55e; }
    #status-badge.err { color: #f87171; }

    /* 加载 spinner */
    #spinner {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: 48px; height: 48px;
      border: 4px solid rgba(79,70,229,0.3);
      border-top-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: translate(-50%,-50%) rotate(360deg); } }

    /* 点击涟漪 */
    .click-ripple {
      position: fixed; width: 24px; height: 24px;
      border: 2px solid #818cf8; border-radius: 50%;
      pointer-events: none; z-index: 200;
      animation: ripple 0.5s ease-out forwards;
      transform: translate(-50%, -50%);
    }
    @keyframes ripple {
      0%   { opacity: 1; width: 12px; height: 12px; }
      100% { opacity: 0; width: 36px; height: 36px; }
    }
  </style>
</head>
<body>
  <!-- 顶部热区：鼠标移入触发 toolbar 显示 -->
  <div id="toolbar-trigger"></div>
  <div id="toolbar">
    <a href="/cdp" title="返回列表">⟵</a>
    <form id="url-form">
      <input id="url-input" type="text" value="${escHtml(tabUrl)}" placeholder="输入网页 URL..." autocomplete="off" spellcheck="false" />
      <button id="url-btn" type="submit">跳转</button>
    </form>
  </div>
  <span id="status-badge">⏳ 连接中</span>

  <div id="screen-wrap">
    <div id="spinner"></div>
    <img id="screen" alt="页面截图" style="display:none" draggable="false" />
  </div>

<script>
(function() {
  'use strict';

  const TAB_ID = ${JSON.stringify(tabId)};
  let PAGE_W = ${pageWidth};
  let PAGE_H = ${pageHeight};

  const screenWrap = document.getElementById('screen-wrap');
  const screenImg  = document.getElementById('screen');
  const spinner    = document.getElementById('spinner');
  const urlInput   = document.getElementById('url-input');
  const urlForm    = document.getElementById('url-form');
  const badge      = document.getElementById('status-badge');

  // ── WebSocket 控制通道 ──────────────────────────────────
  let ws = null;
  let wsReady = false;
  let reconnectTimer = null;
  let lastFrameAt = 0;

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = proto + '//' + location.host + '/ctrl?tabId=' + encodeURIComponent(TAB_ID);
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      wsReady = true;
      badge.textContent = '● 直播中';
      badge.className = 'ok';
      // 连接后立即告知服务端当前窗口尺寸，以便 screencast 匹配分辨率
      sendResize();
    };

    // Binary 帧 = JPEG 图像；Text JSON = meta/error 消息
    ws.onmessage = (evt) => {
      if (typeof evt.data === 'string') {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'meta') {
            PAGE_W = msg.width  || PAGE_W;
            PAGE_H = msg.height || PAGE_H;
          } else if (msg.type === 'error') {
            badge.textContent = '✕ ' + msg.message;
            badge.className = 'err';
          }
        } catch (_) {}
        return;
      }
      // Binary JPEG 帧
      const blob = new Blob([evt.data], { type: 'image/jpeg' });
      const url  = URL.createObjectURL(blob);
      const old  = screenImg.src;
      screenImg.onload = () => { if (old && old.startsWith('blob:')) URL.revokeObjectURL(old); };
      screenImg.src = url;
      screenImg.style.display = 'block';
      spinner.style.display = 'none';
      lastFrameAt = Date.now();
    };

    ws.onclose = () => {
      wsReady = false;
      badge.textContent = '○ 重连中…';
      badge.className = '';
      reconnectTimer = setTimeout(connect, 1500);
    };

    ws.onerror = () => {
      badge.textContent = '✕ 连接错误';
      badge.className = 'err';
    };
  }

  connect();

  // ── 发送窗口尺寸给服务端（调整 screencast 分辨率）────────
  function sendResize() {
    if (ws && wsReady) {
      ws.send(JSON.stringify({ type: 'resize', width: window.innerWidth, height: window.innerHeight }));
    }
  }

  // 窗口 resize 时节流发送（200ms）
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sendResize, 200);
  });

  // ── 发送输入事件（通过 WS，低延迟）─────────────────────
  function sendInput(body) {
    if (ws && wsReady) ws.send(JSON.stringify(body));
  }

  // ── 坐标换算（截图铺满全屏，直接用窗口尺寸缩放）────────
  function imgToPage(clientX, clientY) {
    const rect = screenImg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.round((clientX - rect.left) * (PAGE_W / rect.width)),
      y: Math.round((clientY - rect.top)  * (PAGE_H / rect.height)),
    };
  }

  // 点击涟漪效果
  function showRipple(clientX, clientY) {
    const el = document.createElement('div');
    el.className = 'click-ripple';
    el.style.left = clientX + 'px';
    el.style.top  = clientY + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // ── 右键菜单屏蔽 ─────────────────────────────────────────
  screenWrap.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── 鼠标按下（左/右/中键）────────────────────────────────
  const BUTTON_MAP = { 0: 'left', 1: 'middle', 2: 'right' };
  screenWrap.addEventListener('mousedown', (e) => {
    if (e.button === 2) e.preventDefault();
    const pos = imgToPage(e.clientX, e.clientY);
    if (!pos) return;
    if (e.button === 0) showRipple(e.clientX, e.clientY);
    sendInput({ type: 'mouseClick', x: pos.x, y: pos.y, button: BUTTON_MAP[e.button] || 'left' });
  });

  // ── 鼠标移动（节流 32ms）────────────────────────────────
  let mmTimer = null;
  screenWrap.addEventListener('mousemove', (e) => {
    if (mmTimer) return;
    mmTimer = setTimeout(() => {
      mmTimer = null;
      const pos = imgToPage(e.clientX, e.clientY);
      if (pos) sendInput({ type: 'mouseMove', x: pos.x, y: pos.y });
    }, 32);
  });

  // ── 滚动 ─────────────────────────────────────────────────
  screenWrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pos = imgToPage(e.clientX, e.clientY);
    if (!pos) return;
    sendInput({ type: 'wheel', x: pos.x, y: pos.y, deltaX: Math.round(e.deltaX), deltaY: Math.round(e.deltaY) });
  }, { passive: false });

  // ── 键盘 ─────────────────────────────────────────────────
  document.body.setAttribute('tabindex', '0');
  document.body.focus();
  screenWrap.addEventListener('mousedown', () => document.body.focus());

  const CDP_KEY_MAP = {
    ' ': 'Space', 'Enter': 'Return', 'Backspace': 'Backspace',
    'Delete': 'Delete', 'Escape': 'Escape', 'Tab': 'Tab',
    'Home': 'Home', 'End': 'End', 'PageUp': 'Prior', 'PageDown': 'Next',
    'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
    'Insert': 'Insert', 'CapsLock': 'CapsLock',
    'Shift': 'Shift', 'Control': 'Control', 'Alt': 'Alt', 'Meta': 'Meta',
  };
  function getModifiers(e) {
    return (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0);
  }

  document.addEventListener('keydown', (e) => {
    if (document.activeElement === urlInput) return;
    if (!e.ctrlKey || !['w','t','n'].includes(e.key.toLowerCase())) e.preventDefault();
    const key = CDP_KEY_MAP[e.key] || e.key;
    const code = e.code || key;
    const modifiers = getModifiers(e);
    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
    sendInput({ type: 'keyDown', key, code, modifiers, ...(isPrintable ? { text: e.key } : {}) });
  });

  document.addEventListener('keyup', (e) => {
    if (document.activeElement === urlInput) return;
    const key = CDP_KEY_MAP[e.key] || e.key;
    sendInput({ type: 'keyUp', key, code: e.code || key, modifiers: getModifiers(e) });
  });

  // ── URL 跳转 ─────────────────────────────────────────────
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let newUrl = urlInput.value.trim();
    if (!newUrl) return;
    if (newUrl.indexOf('://') === -1) newUrl = 'https://' + newUrl;
    urlInput.value = newUrl;
    badge.textContent = '⏳ 跳转中';
    badge.className = '';
    sendInput({ type: 'navigate', url: newUrl });
    setTimeout(() => {
      const encoded = encodeURIComponent(newUrl);
      history.replaceState(null, '', '/cdp?url=' + encoded);
      document.title = '🎮 ' + newUrl;
    }, 800);
  });

  // ── 页面隐藏时断开 WS（节省资源）────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(reconnectTimer);
      if (ws) { ws.onclose = null; ws.close(); ws = null; wsReady = false; }
    } else {
      connect();
    }
  });
})();
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(html, "utf-8"));
    res.writeHead(200);
    res.end(html);
  }

  // ---------------------------------------------------------------------------
  // GET /api/screenshot?tabId=<id> — 截图接口（返回 image/jpeg）
  // ---------------------------------------------------------------------------

  /**
   * 截图接口，供控制页轮询使用。
   * 返回 JPEG 二进制，不是 base64 JSON。
   * 响应头携带 x-page-width / x-page-height 供坐标换算。
   */
  private async handleApiScreenshot(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
      const tabId = urlObj.searchParams.get("tabId");

      if (!tabId) {
        this.sendJson(res, 400, { error: "Missing tabId parameter" });
        return;
      }

      if (!this.cdp.connected) {
        this.sendJson(res, 503, { error: "CDP not connected" });
        return;
      }

      // 确保 tab 已 attach
      await this.cdp.attachAndEnable(tabId);

      // 获取页面布局尺寸（可选，用于响应头）
      let pageWidth = 1280;
      let pageHeight = 720;
      try {
        const layout = await this.cdp.sessionCommand<{
          layoutViewport: { clientWidth: number; clientHeight: number };
        }>(tabId, "Page.getLayoutMetrics");
        pageWidth  = layout.layoutViewport.clientWidth  || 1280;
        pageHeight = layout.layoutViewport.clientHeight || 720;
      } catch {
        // 使用默认值
      }

      // 截图
      const result = await this.cdp.sessionCommand<{ data: string }>(
        tabId,
        "Page.captureScreenshot",
        { format: "jpeg", quality: 75, fromSurface: true },
      );

      const imgBuf = Buffer.from(result.data, "base64");

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Length", imgBuf.length);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("x-page-width",  String(pageWidth));
      res.setHeader("x-page-height", String(pageHeight));
      res.writeHead(200);
      res.end(imgBuf);
    } catch (error) {
      // 截图失败返回 503（客户端会重试）
      this.sendJson(res, 503, {
        error: error instanceof Error ? error.message : "Screenshot failed",
      });
    }
  }

  /**
   * WebSocket upgrade: /cdp/devtools/* -> ws://127.0.0.1:cdpPort/devtools/*
   * 用 net.Socket 做 TCP 层的透明隧道, 不解析 WS 帧.
   */
  private handleCdpWebSocketUpgrade(req: IncomingMessage, clientSocket: Socket, head: Buffer): void {
    import("node:net").then(({ createConnection }) => {
      const cdpHost = this.cdp.host || "127.0.0.1";
      const cdpPort = this.cdp.port;
      const wsPath = (req.url ?? "").replace(/^\/cdp/, "") || "/";

      const upstream = createConnection({ host: cdpHost, port: cdpPort }, () => {
        // 重写 Upgrade 请求, 强制 host 为本地
        const headers = [
          `GET ${wsPath} HTTP/1.1`,
          `Host: ${cdpHost}:${cdpPort}`,
          `Upgrade: websocket`,
          `Connection: Upgrade`,
          `Sec-WebSocket-Version: 13`,
          `Sec-WebSocket-Key: ${req.headers["sec-websocket-key"] ?? "dGhlIHNhbXBsZSBub25jZQ=="}`,
          "",
          "",
        ].join("\r\n");

        upstream.write(headers);
        if (head && head.length > 0) upstream.write(head);
      });

      upstream.on("error", () => clientSocket.destroy());
      clientSocket.on("error", () => upstream.destroy());

      // 双向 pipe (透明隧道)
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
  }

  // ---------------------------------------------------------------------------
  // GET /status
  // ---------------------------------------------------------------------------

  private handleStatus(_req: IncomingMessage, res: ServerResponse): void {
    const tabs = this.cdp.tabManager.allTabs().map((tab) => ({
      shortId: tab.shortId,
      targetId: tab.targetId,
      networkRequests: tab.networkRequests.size,
      consoleMessages: tab.consoleMessages.size,
      jsErrors: tab.jsErrors.size,
      lastActionSeq: tab.lastActionSeq,
    }));

    this.sendJson(res, 200, {
      running: true,
      host: this.host,
      port: this.port,
      cdpConnected: this.cdp.connected,
      cdpUrl: `http://${this.cdp.host}:${this.cdp.port}`,
      uptime: this.uptime,
      currentSeq: this.cdp.tabManager.currentSeq(),
      currentTargetId: this.cdp.currentTargetId,
      tabs,
    });
  }

  // ---------------------------------------------------------------------------
  // POST /shutdown
  // ---------------------------------------------------------------------------

  private handleShutdown(_req: IncomingMessage, res: ServerResponse): void {
    this.sendJson(res, 200, { code: 0, message: "Shutting down" });

    setTimeout(() => {
      if (this.onShutdown) {
        this.onShutdown();
      }
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }

  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers (module-level, used by handleApiSetCookies)
// ---------------------------------------------------------------------------

type CookieSameSite = "Strict" | "Lax" | "None";

interface CdpCookieParam {
  name: string;
  value: string;
  url?: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: CookieSameSite;
  expires?: number;
}

interface CookieInput {
  name?: string;
  value?: string;
  url?: string;
  domain?: string;
  path?: string;
  expires?: number; // Unix seconds
  maxAge?: number; // 与 expires 二选一
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  /** 强制覆盖 domain. 优先级高于 url 推导和 domain 字段. */
  useDomain?: string;
}

interface SetCookiesRequest extends CookieInput {
  cookies?: CookieInput[];
  setCookie?: string | string[];
}

interface BuildResult {
  cookie: CdpCookieParam;
  error?: undefined;
}
interface BuildError {
  cookie?: undefined;
  error: { error: string; hint?: string };
}

/**
 * 把一个 CookieInput 对象转成 CDP `Storage.setCookies` 接受的格式.
 */
function buildCookieFromObject(
  input: CookieInput,
  defaultUrl?: string,
  defaultDomain?: string,
): BuildResult | BuildError {
  if (!input.name) {
    return { error: { error: "Cookie missing 'name'", hint: "每个 cookie 必须有 name 字段" } };
  }
  if (input.value === undefined || input.value === null) {
    return {
      error: {
        error: `Cookie '${input.name}' missing 'value'`,
        hint: "每个 cookie 必须有 value 字段 (空字符串可接受)",
      },
    };
  }

  const cookie: CdpCookieParam = {
    name: input.name,
    value: String(input.value),
    path: input.path ?? "/",
  };

  if (input.url ?? defaultUrl) cookie.url = input.url ?? defaultUrl;
  const domain = input.domain ?? defaultDomain;
  if (domain) cookie.domain = domain;

  if (!cookie.url && !cookie.domain) {
    return {
      error: {
        error: `Cookie '${input.name}' missing url/domain`,
        hint: "请在请求顶层提供 url 或 domain, 或在每个 cookie 上单独提供",
      },
    };
  }

  if (typeof input.secure === "boolean") cookie.secure = input.secure;
  if (typeof input.httpOnly === "boolean") cookie.httpOnly = input.httpOnly;
  if (input.sameSite) {
    const ss = normalizeSameSite(input.sameSite);
    if (ss) cookie.sameSite = ss;
  }

  // expires / maxAge -> CDP expires (Unix 秒)
  if (typeof input.expires === "number") {
    cookie.expires = input.expires;
  } else if (typeof input.maxAge === "number") {
    cookie.expires = Math.floor(Date.now() / 1000) + input.maxAge;
  }

  return { cookie };
}

/**
 * 解析 `Set-Cookie` 头风格的字符串.
 *
 * 例:
 *   "session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600"
 */
function parseSetCookieHeader(
  raw: string,
  defaultUrl?: string,
  defaultDomain?: string,
): BuildResult | BuildError {
  if (!raw || typeof raw !== "string") {
    return { error: { error: "Invalid Set-Cookie string", hint: "setCookie 必须是非空字符串" } };
  }

  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { error: { error: "Empty Set-Cookie string" } };
  }

  // 第一段: name=value
  const first = parts[0];
  const eqIdx = first.indexOf("=");
  if (eqIdx <= 0) {
    return { error: { error: `Cannot parse '${first}' as 'name=value'` } };
  }
  const name = first.slice(0, eqIdx).trim();
  const value = first.slice(eqIdx + 1).trim();

  const input: CookieInput = { name, value };

  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const eq = seg.indexOf("=");
    const key = (eq < 0 ? seg : seg.slice(0, eq)).trim().toLowerCase();
    const val = eq < 0 ? "" : seg.slice(eq + 1).trim();
    switch (key) {
      case "path":
        input.path = val || "/";
        break;
      case "domain":
        // RFC: 前导点会被浏览器自动忽略, 这里规范化
        input.domain = val.replace(/^\./, "");
        break;
      case "expires": {
        const ts = Date.parse(val);
        if (!Number.isNaN(ts)) input.expires = Math.floor(ts / 1000);
        break;
      }
      case "max-age": {
        const n = Number(val);
        if (Number.isFinite(n)) input.maxAge = n;
        break;
      }
      case "secure":
        input.secure = true;
        break;
      case "httponly":
        input.httpOnly = true;
        break;
      case "samesite":
        input.sameSite = val;
        break;
      default:
        // 未知属性忽略
        break;
    }
  }

  return buildCookieFromObject(input, defaultUrl, defaultDomain);
}

function normalizeSameSite(v: string): CookieSameSite | null {
  const s = String(v).trim().toLowerCase();
  if (s === "strict") return "Strict";
  if (s === "lax") return "Lax";
  if (s === "none") return "None";
  return null;
}
