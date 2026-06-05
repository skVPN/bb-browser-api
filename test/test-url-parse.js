// 测试 URL 解析
const testUrl = "http://128.1.174.28:8003/json";
console.log("测试 URL:", testUrl);

try {
  const url = new URL(testUrl);
  console.log("hostname:", url.hostname);
  console.log("port:", url.port);
  console.log("port (parsed):", url.port ? parseInt(url.port, 10) : 9222);
} catch (error) {
  console.error("解析失败:", error.message);
}
