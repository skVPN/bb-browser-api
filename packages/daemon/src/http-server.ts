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
import { COMMAND_TIMEOUT, DAEMON_PORT } from "@bb-browser/shared";
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
      };

      if (!params.url) {
        this.sendJson(res, 400, {
          error: "Missing url parameter",
          hint: "请求体必须包含 url 字段",
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
            hint: "Make sure Chrome is running. Try: bb-browser daemon shutdown && bb-browser tab list",
          });
          return;
        }
      }

      // 构建 fetch 请求
      // 如果没有指定 tabId，尝试为目标 URL 找到或创建一个同源的 tab
      let targetTabId = params.tabId;
      
      if (!targetTabId && params.url) {
        try {
          const targetUrl = new URL(params.url);
          const targetOrigin = targetUrl.origin;
          
          // 查找是否有同源的 tab
          const targets = (await this.cdp.getTargets()).filter((t) => t.type === "page");
          const sameOriginTab = targets.find((t) => {
            try {
              const tabUrl = new URL(t.url);
              return tabUrl.origin === targetOrigin;
            } catch {
              return false;
            }
          });
          
          if (sameOriginTab) {
            // 使用同源的 tab
            const tabState = this.cdp.tabManager.getTab(sameOriginTab.id);
            targetTabId = tabState?.shortId || sameOriginTab.id;
          } else {
            // 创建一个新的 tab 并导航到目标域名
            const newTabResp = await this.cdp.browserCommand<{ targetId: string }>(
              "Target.createTarget",
              { url: targetOrigin, background: true },
            );
            await this.cdp.attachAndEnable(newTabResp.targetId);
            const newTab = this.cdp.tabManager.getTab(newTabResp.targetId);
            targetTabId = newTab?.shortId || newTabResp.targetId;
            
            // 等待页面加载
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // 如果解析 URL 失败，使用默认逻辑
        }
      }
      
      const request: Request = {
        id: `fetch-${Date.now()}`,
        action: "fetch",
        url: params.url,
        method: params.method,
        body: params.body,
        headers: params.headers,
        credentials: params.credentials,
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
          hint: "Fetch 执行失败",
        });
        return;
      }

      // 返回 fetch 响应
      this.sendJson(res, 200, response.data?.fetchResponse ?? {
        error: "No fetch response data",
      });
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
      cdpConnected: this.cdp.connected,
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
