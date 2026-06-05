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
    } else if (req.method === "POST" && url === "/api/cookies") {
      this.handleApiSetCookies(req, res);
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
          redirect,
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
      if (!targetTabId) {
        await this.proxyNodeFetchWithBrowserCookies(res, {
          url: params.url,
          method: params.method ?? "GET",
          headers: params.headers,
          body: params.body,
          credentials: params.credentials ?? "include",
          redirect,
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
