import { ensureDaemon, getDaemonStatus, stopDaemon } from "../daemon-manager.js";
import {
  buildManagedChromeArgs,
  findBrowserExecutable,
  formatLaunchCommand,
  isManagedBrowserRunning,
} from "../cdp-discovery.js";

export interface DaemonOptions {
  json?: boolean;
  cdpUrl?: string;  // 用户指定的 CDP URL，例如 http://localhost:9222
}

export async function statusCommand(
  options: DaemonOptions = {}
): Promise<void> {
  const status = await getDaemonStatus();

  if (!status) {
    if (options.json) {
      console.log(JSON.stringify({ running: false }));
    } else {
      console.log("Daemon not running");
      console.log("\n\u{1F4A1} 启动: bb-browser daemon start");
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Human-readable output
  console.log(`Daemon running: ${status.running ? "yes" : "no"}`);
  console.log(`API:            http://${status.host ?? "0.0.0.0"}:${status.port ?? 18888}`);
  console.log(`CDP connected:  ${status.cdpConnected ? "yes" : "no"}`);
  console.log(`CDP URL:        ${status.cdpUrl ?? "N/A"}`);
  console.log(`Uptime:         ${formatUptime(status.uptime as number)}`);
  console.log(`Global seq:     ${status.currentSeq ?? "N/A"}`);

  const tabs = status.tabs as Array<{
    shortId: string;
    targetId: string;
    networkRequests: number;
    consoleMessages: number;
    jsErrors: number;
    lastActionSeq: number;
  }> | undefined;

  if (tabs && tabs.length > 0) {
    console.log(`\nTabs (${tabs.length}):`);
    for (const tab of tabs) {
      const active = tab.targetId === status.currentTargetId ? " *" : "";
      console.log(
        `  ${tab.shortId}${active}  net:${tab.networkRequests} console:${tab.consoleMessages} err:${tab.jsErrors} seq:${tab.lastActionSeq}`
      );
    }
  } else {
    console.log("\nNo tabs");
  }

  if (status.cdpConnected === false) {
    console.log("\n⚠️ Chrome 未连接。运行 bb-browser daemon stop && bb-browser tab list 重新启动");
  } else {
    console.log("\n\u{1F4A1} 停止: bb-browser daemon stop");
  }
}

export async function startCommand(
  options: DaemonOptions = {}
): Promise<void> {
  // 如果指定了 cdpUrl，先停止旧的 daemon 以确保使用新的 CDP URL
  if (options.cdpUrl) {
    await stopDaemon();
  }

  // 在 spawn daemon 之前, 把 "将要启动的 Chrome 命令" 打印出来,
  // 这样用户能看到具体执行了什么. daemon 是 detached 子进程, 它内部的 stdout
  // 会被丢弃, 所以这条信息必须在前台进程里打印.
  if (!options.json) {
    if (options.cdpUrl) {
      console.log(`[bb-browser] 将连接已有的 CDP: ${options.cdpUrl}`);
    } else {
      const managedRunning = await isManagedBrowserRunning();
      if (managedRunning) {
        console.log("[bb-browser] 已检测到 bb-browser 受管 Chrome 在运行, 将复用");
      } else {
        const executable = findBrowserExecutable();
        if (executable) {
          const args = buildManagedChromeArgs();
          console.log("[bb-browser] 将启动 Chrome:");
          console.log(`  ${formatLaunchCommand(executable, args)}`);
        } else {
          console.log("[bb-browser] 未找到本地 Chrome, 将尝试使用现有 CDP 端点");
        }
      }
    }
  }

  await ensureDaemon(options.cdpUrl);
  const status = await getDaemonStatus();
  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log("Daemon started");
    if (status) {
      console.log(`API:            http://${status.host ?? "0.0.0.0"}:${status.port ?? 18888}`);
      console.log(`CDP connected:  ${status.cdpConnected ? "yes" : "no"}`);
      console.log(`CDP URL:        ${status.cdpUrl ?? "N/A"}`);
      const tabs = status.tabs as Array<{ shortId: string }> | undefined;
      console.log(`Tabs:           ${tabs?.length ?? 0}`);
    }
  }
}

export async function shutdownCommand(
  options: DaemonOptions = {}
): Promise<void> {
  const ok = await stopDaemon();
  if (options.json) {
    console.log(JSON.stringify({ stopped: ok }));
  } else {
    console.log(ok ? "Daemon stopped" : "Daemon was not running");
  }
}

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
