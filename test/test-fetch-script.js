// 测试 fetch 脚本构建

const url = "https://api.github.com/users/octocat";
const method = "GET";
const headersExpr = "{}";

// 这是我们在 command-dispatch.ts 中构建的脚本
const fetchScript = `(async () => {
  try {
    const resp = await fetch(${JSON.stringify(url)}, {
      method: ${JSON.stringify(method)},
      credentials: 'include',
      headers: ${headersExpr}
    });
    const contentType = resp.headers.get('content-type') || '';
    let body;
    if (contentType.includes('application/json') && resp.status !== 204) {
      try { body = await resp.json(); } catch { body = await resp.text(); }
    } else {
      body = await resp.text();
    }
    return {
      status: resp.status,
      contentType,
      body
    };
  } catch (e) {
    return { 
      error: e.message,
      errorName: e.name,
      errorStack: e.stack,
      currentUrl: location.href
    };
  }
})()`;

console.log("生成的脚本：");
console.log(fetchScript);
console.log("\n");

// 测试脚本是否有语法错误
try {
  eval(fetchScript);
  console.log("✅ 脚本语法正确");
} catch (e) {
  console.log("❌ 脚本语法错误:", e.message);
}
