/**
 * 综合测试新增的两个 API 接口
 * 
 * 使用方法：
 * 1. 确保 bb-browser daemon 正在运行
 * 2. 运行: node test/test-new-apis.js
 */

import http from 'http';
const DAEMON_URL = 'http://localhost:18888';

// HTTP 请求辅助函数
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data)
          });
        } catch (e) {
          resolve({
            ok: false,
            status: res.statusCode,
            json: async () => ({ error: 'Invalid JSON' })
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// 替换 fetch 函数
const fetch = httpRequest;

// 检查 daemon 是否运行
async function checkDaemon() {
  try {
    const response = await fetch(`${DAEMON_URL}/status`, { method: 'GET' });
    const status = await response.json();
    console.log('✓ Daemon 正在运行');
    console.log(`  CDP 连接: ${status.cdpConnected ? '已连接' : '未连接'}`);
    console.log(`  运行时间: ${status.uptime} 秒`);
    console.log(`  当前标签页数: ${status.tabs?.length || 0}`);
    return true;
  } catch (error) {
    console.log('✗ Daemon 未运行或无法连接');
    console.log('  错误:', error.message);
    console.log('  请先运行: bb-browser daemon start');
    return false;
  }
}

// 测试抓包接口
async function testCapture() {
  console.log('\n=== 测试 1: 抓包接口 /api/capture ===\n');

  console.log('场景: 访问 GitHub API 文档页面，捕获 API 请求');
  try {
    const url = new URL(`${DAEMON_URL}/api/capture`);
    url.searchParams.set('url', 'https://api.github.com/users/octocat');
    url.searchParams.set('pattern', 'api\\.github\\.com');
    url.searchParams.set('timeout', '3000');
    
    const response = await fetch(url.toString(), { method: 'GET' });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 抓包成功');
      console.log(`  访问 URL: ${result.url}`);
      console.log(`  总请求数: ${result.totalRequests}`);
      console.log(`  匹配请求数: ${result.matchedRequests}`);
      
      if (result.requests && result.requests.length > 0) {
        const firstReq = result.requests[0];
        console.log('\n  第一个匹配的请求:');
        console.log(`    URL: ${firstReq.url}`);
        console.log(`    方法: ${firstReq.method}`);
        console.log(`    状态: ${firstReq.status || '未完成'}`);
        console.log(`    类型: ${firstReq.type}`);
        
        if (firstReq.responseBody) {
          try {
            const body = JSON.parse(firstReq.responseBody);
            console.log(`    响应体: JSON 对象，包含 ${Object.keys(body).length} 个字段`);
            if (body.login) console.log(`      - login: ${body.login}`);
            if (body.name) console.log(`      - name: ${body.name}`);
            if (body.public_repos !== undefined) console.log(`      - public_repos: ${body.public_repos}`);
          } catch {
            console.log(`    响应体: ${firstReq.responseBody.substring(0, 100)}...`);
          }
        }
      }
      return true;
    } else {
      console.log('✗ 抓包失败:', result.error);
      console.log('  提示:', result.hint);
      return false;
    }
  } catch (error) {
    console.log('✗ 请求异常:', error.message);
    return false;
  }
}

// 测试存储接口
async function testStorage() {
  console.log('\n=== 测试 2: 存储接口 /api/storage ===\n');

  console.log('场景: 获取 GitHub 的 Cookie 和存储数据');
  try {
    const url = new URL(`${DAEMON_URL}/api/storage`);
    url.searchParams.set('domain', 'https://github.com');
    
    const response = await fetch(url.toString(), { method: 'GET' });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 获取存储数据成功');
      console.log(`  域名: ${result.domain}`);
      console.log(`  Cookies 数量: ${result.cookies?.length || 0}`);
      console.log(`  localStorage 键数量: ${Object.keys(result.localStorage || {}).length}`);
      console.log(`  sessionStorage 键数量: ${Object.keys(result.sessionStorage || {}).length}`);
      
      if (result.cookies && result.cookies.length > 0) {
        console.log('\n  Cookie 示例 (前 3 个):');
        result.cookies.slice(0, 3).forEach((cookie, index) => {
          console.log(`    ${index + 1}. ${cookie.name}`);
          console.log(`       domain: ${cookie.domain}`);
          console.log(`       secure: ${cookie.secure}, httpOnly: ${cookie.httpOnly}`);
          console.log(`       session: ${cookie.session}`);
        });
      }
      
      if (result.localStorage && Object.keys(result.localStorage).length > 0) {
        console.log('\n  localStorage 键列表:');
        Object.keys(result.localStorage).slice(0, 5).forEach((key, index) => {
          console.log(`    ${index + 1}. ${key}`);
        });
      }
      
      return true;
    } else {
      console.log('✗ 获取存储数据失败:', result.error);
      console.log('  提示:', result.hint);
      return false;
    }
  } catch (error) {
    console.log('✗ 请求异常:', error.message);
    return false;
  }
}

// 测试组合场景
async function testCombined() {
  console.log('\n=== 测试 3: 组合场景 ===\n');

  console.log('场景: 先访问页面抓包，再获取存储数据');
  
  // 第一步：访问页面并抓包
  console.log('\n步骤 1: 访问百度首页并抓包');
  try {
    const captureUrl = new URL(`${DAEMON_URL}/api/capture`);
    captureUrl.searchParams.set('url', 'https://www.baidu.com');
    captureUrl.searchParams.set('timeout', '2000');
    
    const captureResponse = await fetch(captureUrl.toString(), { method: 'GET' });

    const captureResult = await captureResponse.json();
    
    if (captureResponse.ok) {
      console.log(`✓ 抓包成功，捕获 ${captureResult.totalRequests} 个请求`);
    } else {
      console.log('✗ 抓包失败:', captureResult.error);
      return false;
    }
  } catch (error) {
    console.log('✗ 抓包异常:', error.message);
    return false;
  }

  // 第二步：获取存储数据
  console.log('\n步骤 2: 获取百度的存储数据');
  try {
    const storageUrl = new URL(`${DAEMON_URL}/api/storage`);
    storageUrl.searchParams.set('domain', 'https://www.baidu.com');
    
    const storageResponse = await fetch(storageUrl.toString(), { method: 'GET' });

    const storageResult = await storageResponse.json();
    
    if (storageResponse.ok) {
      console.log('✓ 获取存储数据成功');
      console.log(`  Cookies: ${storageResult.cookies?.length || 0} 个`);
      console.log(`  localStorage: ${Object.keys(storageResult.localStorage || {}).length} 个键`);
      console.log(`  sessionStorage: ${Object.keys(storageResult.sessionStorage || {}).length} 个键`);
      
      // 显示一些有趣的 Cookie
      if (storageResult.cookies && storageResult.cookies.length > 0) {
        console.log('\n  Cookie 名称列表:');
        storageResult.cookies.forEach((cookie, index) => {
          console.log(`    ${index + 1}. ${cookie.name} (${cookie.domain})`);
        });
      }
      
      return true;
    } else {
      console.log('✗ 获取存储数据失败:', storageResult.error);
      return false;
    }
  } catch (error) {
    console.log('✗ 获取存储数据异常:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  bb-browser 新增 API 接口测试                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 检查 daemon 状态
  const daemonOk = await checkDaemon();
  if (!daemonOk) {
    console.log('\n测试终止：Daemon 未运行');
    process.exit(1);
  }

  // 运行测试
  const results = {
    capture: false,
    storage: false,
    combined: false
  };

  results.capture = await testCapture();
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒

  results.storage = await testStorage();
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒

  results.combined = await testCombined();

  // 输出测试总结
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  测试总结                                              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;

  console.log(`总测试数: ${total}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${total - passed}`);
  console.log('');

  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✓' : '✗';
    const label = {
      capture: '抓包接口',
      storage: '存储接口',
      combined: '组合场景'
    }[name];
    console.log(`${status} ${label}`);
  });

  console.log('\n测试完成！');
  
  if (passed === total) {
    console.log('🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查日志');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行出错:', error);
  process.exit(1);
});
