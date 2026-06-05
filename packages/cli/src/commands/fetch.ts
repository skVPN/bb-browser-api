/**
 * fetch 命令 - 在浏览器上下文中执行 fetch()，自动处理同源路由
 *
 * 用法：
 *   bb-browser fetch <url> [options]
 *   bb-browser fetch https://www.reddit.com/api/me.json
 *   bb-browser fetch /api/me.json                     # 相对路径，用当前 tab 的 origin
 *   bb-browser fetch https://www.reddit.com/... --json
 *   bb-browser fetch https://x.com/... --method POST --body '{"query":"..."}'
 *
 * 本质：curl，但带浏览器登录态。
 */

import { generateId, type Request, type Response, type TabInfo } from "@bb-browser/shared";
import { isUnderDomain } from "@bb-browser/shared";
import { sendCommand } from "../client.js";
import { ensureDaemonRunning } from "../daemon-manager.js";

export interface FetchOptions {
  json?: boolean;
  method?: string;
  body?: string;
  headers?: string;
  credentials?: "omit" | "same-origin" | "include";
  output?: string;
  tabId?: string | number;
  /**
   * 在指定域名下找/建一个 tab 来执行 fetch.
   * 用于规避目标子域是 about:blank 或跳转, 导致 "Failed to fetch" 的情况.
   * 例: --use-domain 3ue.com
   */
  useDomain?: string;
}

/**
 * 精确匹配 tab 的 origin
 */
function matchTabOrigin(tabUrl: string, targetHostname: string): boolean {
  try {
    const tabHostname = new URL(tabUrl).hostname;
    return tabHostname === targetHostname || tabHostname.endsWith("." + targetHostname);
  } catch {
    return false;
  }
}

/**
 * 找到匹配域名的 tab, 如果没有则新建.
 *
 * @param origin     目标 origin (用于在没有匹配 tab 时新建)
 * @param hostname   目标 hostname (用于精确匹配)
 * @param matchDomain 可选: 匹配范围扩大到这个根域 (例如 "3ue.com").
 *                    传入时会优先精确 host 匹配, 其次任意 tab 处于 matchDomain 之下.
 */
async function ensureTabForOrigin(
  origin: string,
  hostname: string,
  matchDomain?: string,
): Promise<number | string | undefined> {
  const listReq: Request = { id: generateId(), action: "tab_list" };
  const listResp: Response = await sendCommand(listReq);

  if (listResp.success && listResp.data?.tabs) {
    const tabs = listResp.data.tabs;

    // 1. 优先精确 host 匹配
    let matchingTab = tabs.find((tab: TabInfo) => matchTabOrigin(tab.url, hostname));

    // 2. 如果指定了 matchDomain, 退而求其次: 任意处于 matchDomain 下的 tab
    if (!matchingTab && matchDomain) {
      matchingTab = tabs.find((tab: TabInfo) => {
        try {
          return isUnderDomain(new URL(tab.url).hostname, matchDomain);
        } catch {
          return false;
        }
      });
    }

    if (matchingTab) {
      return matchingTab.tab ?? matchingTab.tabId;
    }
  }

  // 没有合适的 tab: 在根域名 (或 origin) 下新建一个
  const navigateTo = matchDomain ? `https://${matchDomain}` : origin;
  const newResp: Response = await sendCommand({
    id: generateId(),
    action: "tab_new",
    url: navigateTo,
  });
  if (!newResp.success) {
    throw new Error(`无法打开 ${navigateTo}: ${newResp.error}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return newResp.data?.tab ?? newResp.data?.tabId;
}

/**
 * 构造浏览器内执行的 fetch JS 代码
 * 修复 Codex review: headers 通过 JSON.stringify 传入，不做字符串拼接
 */
function buildFetchScript(url: string, options: FetchOptions): string {
  const method = (options.method || "GET").toUpperCase();
  const hasBody = options.body && method !== "GET" && method !== "HEAD";

  // headers 通过 JSON.parse 安全传入，避免代码注入
  let headersExpr = "{}";
  if (options.headers) {
    try {
      // 验证是合法 JSON
      JSON.parse(options.headers);
      headersExpr = options.headers;
    } catch {
      throw new Error(`--headers must be valid JSON. Got: ${options.headers}`);
    }
  }

  const credentials = options.credentials || "include";

  return `(async () => {
    try {
      const resp = await fetch(${JSON.stringify(url)}, {
        method: ${JSON.stringify(method)},
        credentials: ${JSON.stringify(credentials)},
        headers: ${headersExpr}${hasBody ? `,\n        body: ${JSON.stringify(options.body)}` : ""}
      });
      const contentType = resp.headers.get('content-type') || '';
      let body;
      if (contentType.includes('application/json') && resp.status !== 204) {
        try { body = await resp.json(); } catch { body = await resp.text(); }
      } else {
        body = await resp.text();
      }
      return JSON.stringify({
        status: resp.status,
        contentType,
        body
      });
    } catch (e) {
      return JSON.stringify({ error: e.message });
    }
  })()`;
}

export async function fetchCommand(
  url: string,
  options: FetchOptions = {}
): Promise<void> {
  if (!url) {
    throw new Error(
      "缺少 URL 参数\n" +
      "  用法: bb-browser fetch <url> [--json] [--method POST] [--body '{...}'] [--credentials omit|same-origin|include]\n" +
      "  示例: bb-browser fetch https://www.reddit.com/api/me.json --json"
    );
  }

  await ensureDaemonRunning();

  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  let targetTabId = options.tabId;

  if (isAbsolute) {
    let origin: string;
    let hostname: string;
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
      hostname = parsed.hostname;
    } catch {
      throw new Error(`无效的 URL: ${url}`);
    }

    // 计算匹配域: 显式指定的域名
    let matchDomain: string | undefined;
    if (typeof options.useDomain === "string" && options.useDomain) {
      matchDomain = options.useDomain.toLowerCase();
    }

    if (!targetTabId) {
      targetTabId = await ensureTabForOrigin(origin, hostname, matchDomain);
    }
  }

  const script = buildFetchScript(url, options);
  const evalReq: Request = { id: generateId(), action: "eval", script, tabId: targetTabId };
  const evalResp: Response = await sendCommand(evalReq);

  if (!evalResp.success) {
    throw new Error(`Fetch 失败: ${evalResp.error}`);
  }

  const rawResult = evalResp.data?.result;
  if (rawResult === undefined || rawResult === null) {
    throw new Error("Fetch 未返回结果");
  }

  let result: { status?: number; contentType?: string; body?: unknown; error?: string };
  try {
    result = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult as typeof result;
  } catch {
    console.log(rawResult);
    return;
  }

  if (result.error) {
    throw new Error(`Fetch error: ${result.error}`);
  }

  // 写文件
  if (options.output) {
    const { writeFileSync } = await import("node:fs");
    const content = typeof result.body === "object"
      ? JSON.stringify(result.body, null, 2)
      : String(result.body);
    writeFileSync(options.output, content, "utf-8");
    console.log(`已写入 ${options.output} (${result.status}, ${content.length} bytes)`);
    return;
  }

  // 输出
  if (typeof result.body === "object") {
    console.log(JSON.stringify(result.body, null, 2));
  } else {
    console.log(result.body);
  }
}
