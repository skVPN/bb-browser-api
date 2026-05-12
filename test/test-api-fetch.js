#!/usr/bin/env node
/**
 * bb-browser /api/fetch 端点测试脚本
 * 
 * 使用方法：
 *   1. 启动 Chrome 和 daemon: bb-browser daemon start
 *   2. 运行测试: node test/test-api-fetch.js
 */

const http = require('http');

const DAEMON_HOST = '127.0.0.1';
const DAEMON_PORT = 6666;

/**
 * 发送 fetch 请求到 bb-browser daemon
 */
async function bbFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      url,
      method: options.method || 'GET',
      body: options.body,
      headers: options.headers,
      tabId: options.tabId,
    });

    const req = http.request({
      hostname: DAEMON_HOST,
      port: DAEMON_PORT,
      path: '/api/fetch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || 'Unknown error'}`));
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * 检查 daemon 状态
 */
async function checkDaemonStatus() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: DAEMON_HOST,
      port: DAEMON_PORT,
      path: '/status',
      method: 'GET',
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 测试用例
 */
async function runTests() {
  console.log('🧪 bb-browser /api/fetch 测试\n');

  // 测试 1: 检查 daemon 状态
  console.log('📋 测试 1: 检查 daemon 状态');
  try {
    const status = await checkDaemonStatus();
    console.log(`✅ Daemon 运行中 (uptime: ${status.uptime}s, CDP: ${status.cdpConnected})`);
    console.log(`   当前 seq: ${status.currentSeq}, tabs: ${status.tabs?.length || 0}\n`);
  } catch (error) {
    console.error(`❌ Daemon 未运行: ${error.message}`);
    console.error('   请先启动: bb-browser daemon start\n');
    process.exit(1);
  }

  // 测试 2: 简单 GET 请求
  console.log('📋 测试 2: GitHub API GET 请求');
  try {
    const result = await bbFetch('https://api.github.com/users/octocat');
    console.log(`✅ 状态: ${result.status}, 类型: ${result.contentType}`);
    console.log(`   用户: ${result.body.login}, 名称: ${result.body.name}`);
    console.log(`   仓库数: ${result.body.public_repos}\n`);
  } catch (error) {
    console.error(`❌ 失败: ${error.message}\n`);
  }

  // 测试 3: JSON 响应解析
  console.log('📋 测试 3: JSONPlaceholder API');
  try {
    const result = await bbFetch('https://jsonplaceholder.typicode.com/posts/1');
    console.log(`✅ 状态: ${result.status}`);
    console.log(`   标题: ${result.body.title}`);
    console.log(`   用户ID: ${result.body.userId}\n`);
  } catch (error) {
    console.error(`❌ 失败: ${error.message}\n`);
  }

  // 测试 4: POST 请求
  console.log('📋 测试 4: POST 请求');
  try {
    const result = await bbFetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Post',
        body: 'This is a test',
        userId: 1,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ 状态: ${result.status}`);
    console.log(`   创建的 ID: ${result.body.id}\n`);
  } catch (error) {
    console.error(`❌ 失败: ${error.message}\n`);
  }

  // 测试 5: 自定义 headers
  console.log('📋 测试 5: 自定义请求头');
  try {
    const result = await bbFetch('https://httpbin.org/headers', {
      headers: {
        'X-Custom-Header': 'bb-browser-test',
        'User-Agent': 'bb-browser-api-test/1.0',
      },
    });
    console.log(`✅ 状态: ${result.status}`);
    console.log(`   请求头已发送: ${JSON.stringify(result.body.headers, null, 2).substring(0, 200)}...\n`);
  } catch (error) {
    console.error(`❌ 失败: ${error.message}\n`);
  }

  // 测试 6: 错误处理 - 无效 URL
  console.log('📋 测试 6: 错误处理（无效 URL）');
  try {
    await bbFetch('invalid-url');
    console.error('❌ 应该抛出错误但没有\n');
  } catch (error) {
    console.log(`✅ 正确捕获错误: ${error.message}\n`);
  }

  // 测试 7: 错误处理 - 缺少 URL
  console.log('📋 测试 7: 错误处理（缺少 URL）');
  try {
    const payload = JSON.stringify({ method: 'GET' });
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: DAEMON_HOST,
        port: DAEMON_PORT,
        path: '/api/fetch',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          if (res.statusCode === 400 && result.error) {
            resolve(result);
          } else {
            reject(new Error('应该返回 400 错误'));
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    console.log('✅ 正确返回 400 错误\n');
  } catch (error) {
    console.error(`❌ 失败: ${error.message}\n`);
  }

  console.log('🎉 测试完成！');
}

// 运行测试
runTests().catch((error) => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});
