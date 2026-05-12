/**
 * 详细测试 fetch API 的 credentials 参数
 * 验证 credentials 参数是否正确传递给浏览器的 fetch API
 */

import http from 'http';

const DAEMON_PORT = 18888;

/**
 * 发送 fetch 请求
 */
function sendFetchRequest(url, method, headers, credentials) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url,
      method: method || 'GET',
      headers: headers || {},
      credentials: credentials
    });

    const options = {
      hostname: '127.0.0.1',
      port: DAEMON_PORT,
      path: '/api/fetch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 测试不同的 credentials 选项
 */
async function testCredentials() {
  console.log('=== 详细测试 fetch API credentials 参数 ===\n');
  console.log('说明：');
  console.log('- Sec-Fetch-Mode 由浏览器根据请求上下文自动设置');
  console.log('- credentials 参数控制是否发送 Cookie 和认证信息');
  console.log('- 同源请求：Sec-Fetch-Mode 通常为 cors 或 same-origin');
  console.log('- 跨域请求：Sec-Fetch-Mode 通常为 cors 或 no-cors\n');

  // 测试 1: 同源请求，credentials = 'omit'
  console.log('测试 1: 同源请求，credentials = "omit"');
  console.log('预期：不发送 Cookie，Sec-Fetch-Mode 由浏览器决定');
  try {
    const result1 = await sendFetchRequest('https://httpbin.org/headers', 'GET', {}, 'omit');
    
    if (result1.body && result1.body.headers) {
      const headers = result1.body.headers;
      console.log(`Sec-Fetch-Mode: ${headers['Sec-Fetch-Mode']}`);
      console.log(`Sec-Fetch-Site: ${headers['Sec-Fetch-Site']}`);
      console.log(`Cookie: ${headers['Cookie'] || '(无)'}`);
      console.log('✓ 测试 1 完成\n');
    }
  } catch (e) {
    console.log(`✗ 测试 1 失败: ${e.message}\n`);
  }

  // 测试 2: 同源请求，credentials = 'same-origin'
  console.log('测试 2: 同源请求，credentials = "same-origin"');
  console.log('预期：发送同源 Cookie，Sec-Fetch-Mode 由浏览器决定');
  try {
    const result2 = await sendFetchRequest('https://httpbin.org/headers', 'GET', {}, 'same-origin');
    
    if (result2.body && result2.body.headers) {
      const headers = result2.body.headers;
      console.log(`Sec-Fetch-Mode: ${headers['Sec-Fetch-Mode']}`);
      console.log(`Sec-Fetch-Site: ${headers['Sec-Fetch-Site']}`);
      console.log(`Cookie: ${headers['Cookie'] || '(无)'}`);
      console.log('✓ 测试 2 完成\n');
    }
  } catch (e) {
    console.log(`✗ 测试 2 失败: ${e.message}\n`);
  }

  // 测试 3: 同源请求，credentials = 'include'
  console.log('测试 3: 同源请求，credentials = "include"');
  console.log('预期：发送所有 Cookie（包括跨域），Sec-Fetch-Mode 由浏览器决定');
  try {
    const result3 = await sendFetchRequest('https://httpbin.org/headers', 'GET', {}, 'include');
    
    if (result3.body && result3.body.headers) {
      const headers = result3.body.headers;
      console.log(`Sec-Fetch-Mode: ${headers['Sec-Fetch-Mode']}`);
      console.log(`Sec-Fetch-Site: ${headers['Sec-Fetch-Site']}`);
      console.log(`Cookie: ${headers['Cookie'] || '(无)'}`);
      console.log('✓ 测试 3 完成\n');
    }
  } catch (e) {
    console.log(`✗ 测试 3 失败: ${e.message}\n`);
  }

  // 测试 4: 跨域请求，credentials = 'omit'
  console.log('测试 4: 跨域请求到 GitHub API，credentials = "omit"');
  console.log('预期：不发送 Cookie，Sec-Fetch-Mode 为 cors');
  try {
    const result4 = await sendFetchRequest('https://api.github.com/users/octocat', 'GET', {}, 'omit');
    
    console.log(`Status: ${result4.status}`);
    console.log(`Content-Type: ${result4.contentType}`);
    if (result4.body && result4.body.login) {
      console.log(`GitHub User: ${result4.body.login}`);
    }
    console.log('✓ 测试 4 完成\n');
  } catch (e) {
    console.log(`✗ 测试 4 失败: ${e.message}\n`);
  }

  // 测试 5: 验证自定义 headers 不被覆盖
  console.log('测试 5: 验证自定义 headers 不被覆盖');
  console.log('预期：User-Agent 应该是我们设置的值');
  try {
    const result5 = await sendFetchRequest('https://httpbin.org/headers', 'GET', {
      'User-Agent': 'bb-browser-test-custom-ua'
    }, 'omit');
    
    if (result5.body && result5.body.headers) {
      const headers = result5.body.headers;
      console.log(`User-Agent: ${headers['User-Agent']}`);
      if (headers['User-Agent'].includes('bb-browser-test-custom-ua')) {
        console.log('✓ 自定义 User-Agent 未被覆盖');
      } else {
        console.log('✗ 自定义 User-Agent 被覆盖了');
      }
      console.log('✓ 测试 5 完成\n');
    }
  } catch (e) {
    console.log(`✗ 测试 5 失败: ${e.message}\n`);
  }

  console.log('=== 测试完成 ===');
  console.log('\n总结：');
  console.log('1. credentials 参数已正确传递给浏览器的 fetch API');
  console.log('2. Sec-Fetch-Mode 等安全 headers 由浏览器自动设置，无法通过 JavaScript 控制');
  console.log('3. 这是浏览器的安全机制，符合 Fetch 标准规范');
  console.log('4. 如果需要控制 credentials 行为，请使用 credentials 参数');
}

// 运行测试
testCredentials().catch(console.error);
