/**
 * 测试 fetch API 的 credentials 参数
 * 验证不同的 credentials 选项对 sec-fetch-mode 等 headers 的影响
 */

import http from 'http';

const DAEMON_PORT = 18888;
const TEST_URL = 'https://httpbin.org/headers';

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
  console.log('=== 测试 fetch API credentials 参数 ===\n');

  // 测试 1: 不指定 credentials（默认为 omit）
  console.log('测试 1: 不指定 credentials（默认为 omit）');
  try {
    const result1 = await sendFetchRequest(TEST_URL, 'GET', {
      'User-Agent': 'bb-browser-test'
    });
    
    console.log('完整响应:', JSON.stringify(result1, null, 2));
    
    if (result1.body) {
      // body 可能已经是对象了
      const headers = typeof result1.body === 'string' ? JSON.parse(result1.body) : result1.body;
      console.log('返回的 headers:', JSON.stringify(headers, null, 2));
      console.log('✓ 测试 1 通过\n');
    } else {
      console.log('✗ 测试 1 失败: 没有返回 body\n');
    }
  } catch (e) {
    console.log(`✗ 测试 1 失败: ${e.message}\n`);
  }

  // 测试 2: credentials = 'omit'
  console.log('测试 2: credentials = "omit"');
  try {
    const result2 = await sendFetchRequest(TEST_URL, 'GET', {
      'User-Agent': 'bb-browser-test'
    }, 'omit');
    
    if (result2.body) {
      const headers = typeof result2.body === 'string' ? JSON.parse(result2.body) : result2.body;
      console.log('返回的 headers:', JSON.stringify(headers, null, 2));
      console.log('✓ 测试 2 通过\n');
    } else {
      console.log('✗ 测试 2 失败: 没有返回 body\n');
    }
  } catch (e) {
    console.log(`✗ 测试 2 失败: ${e.message}\n`);
  }

  // 测试 3: credentials = 'same-origin'
  console.log('测试 3: credentials = "same-origin"');
  try {
    const result3 = await sendFetchRequest(TEST_URL, 'GET', {
      'User-Agent': 'bb-browser-test'
    }, 'same-origin');
    
    if (result3.body) {
      const headers = typeof result3.body === 'string' ? JSON.parse(result3.body) : result3.body;
      console.log('返回的 headers:', JSON.stringify(headers, null, 2));
      console.log('✓ 测试 3 通过\n');
    } else {
      console.log('✗ 测试 3 失败: 没有返回 body\n');
    }
  } catch (e) {
    console.log(`✗ 测试 3 失败: ${e.message}\n`);
  }

  // 测试 4: credentials = 'include'
  console.log('测试 4: credentials = "include"');
  try {
    const result4 = await sendFetchRequest(TEST_URL, 'GET', {
      'User-Agent': 'bb-browser-test'
    }, 'include');
    
    if (result4.body) {
      const headers = typeof result4.body === 'string' ? JSON.parse(result4.body) : result4.body;
      console.log('返回的 headers:', JSON.stringify(headers, null, 2));
      console.log('✓ 测试 4 通过\n');
    } else {
      console.log('✗ 测试 4 失败: 没有返回 body\n');
    }
  } catch (e) {
    console.log(`✗ 测试 4 失败: ${e.message}\n`);
  }

  console.log('=== 测试完成 ===');
}

// 运行测试
testCredentials().catch(console.error);
