#!/usr/bin/env node
/**
 * bb-browser Fetch API 使用示例
 * 
 * 这个示例展示了如何通过 HTTP API 调用 bb-browser 的 fetch 功能
 */

const http = require('http');

const DAEMON_URL = 'http://127.0.0.1:6666';

/**
 * 封装的 bb-browser fetch 函数
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

    const req = http.request(`${DAEMON_URL}/api/fetch`, {
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
 * 示例 1: 获取 GitHub 用户信息
 */
async function example1() {
  console.log('\n📌 示例 1: 获取 GitHub 用户信息');
  console.log('─'.repeat(50));
  
  const result = await bbFetch('https://api.github.com/users/octocat');
  
  console.log(`状态码: ${result.status}`);
  console.log(`内容类型: ${result.contentType}`);
  console.log(`用户名: ${result.body.login}`);
  console.log(`名称: ${result.body.name}`);
  console.log(`公开仓库: ${result.body.public_repos}`);
  console.log(`关注者: ${result.body.followers}`);
}

/**
 * 示例 2: POST 请求创建资源
 */
async function example2() {
  console.log('\n📌 示例 2: POST 请求创建资源');
  console.log('─'.repeat(50));
  
  const result = await bbFetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: 'bb-browser 测试',
      body: '这是通过 bb-browser API 创建的文章',
      userId: 1,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  console.log(`状态码: ${result.status}`);
  console.log(`创建的资源 ID: ${result.body.id}`);
  console.log(`标题: ${result.body.title}`);
}

/**
 * 示例 3: 自定义请求头
 */
async function example3() {
  console.log('\n📌 示例 3: 自定义请求头');
  console.log('─'.repeat(50));
  
  const result = await bbFetch('https://httpbin.org/headers', {
    headers: {
      'X-Custom-Header': 'bb-browser-example',
      'X-Request-ID': `req-${Date.now()}`,
    },
  });
  
  console.log(`状态码: ${result.status}`);
  console.log('发送的请求头:');
  console.log(JSON.stringify(result.body.headers, null, 2));
}

/**
 * 示例 4: 处理需要登录的 API
 * 
 * 这个示例展示了 bb-browser 的核心优势：
 * 在浏览器上下文中执行，自动携带 Cookie 和登录态
 */
async function example4() {
  console.log('\n📌 示例 4: 使用浏览器登录态');
  console.log('─'.repeat(50));
  console.log('提示: 这个示例需要你先在浏览器中登录 Reddit');
  console.log('1. 打开 https://www.reddit.com 并登录');
  console.log('2. 然后运行这个示例\n');
  
  try {
    const result = await bbFetch('https://www.reddit.com/api/me.json');
    
    if (result.body.error) {
      console.log('❌ 未登录或登录已过期');
      console.log('   请先在浏览器中访问 https://www.reddit.com 并登录');
    } else {
      console.log(`✅ 已登录用户: ${result.body.data.name}`);
      console.log(`   Karma: ${result.body.data.total_karma}`);
      console.log(`   创建时间: ${new Date(result.body.data.created_utc * 1000).toLocaleDateString()}`);
    }
  } catch (error) {
    console.log(`⚠️  请求失败: ${error.message}`);
  }
}

/**
 * 示例 5: 错误处理
 */
async function example5() {
  console.log('\n📌 示例 5: 错误处理');
  console.log('─'.repeat(50));
  
  try {
    await bbFetch('https://httpbin.org/status/404');
    console.log('请求成功（404 也是成功的响应）');
  } catch (error) {
    console.log(`捕获到错误: ${error.message}`);
  }
  
  try {
    await bbFetch('https://this-domain-does-not-exist-12345.com');
  } catch (error) {
    console.log(`网络错误: ${error.message}`);
  }
}

/**
 * 示例 6: 批量请求
 */
async function example6() {
  console.log('\n📌 示例 6: 并发批量请求');
  console.log('─'.repeat(50));
  
  const users = ['octocat', 'torvalds', 'gvanrossum'];
  
  console.log(`正在获取 ${users.length} 个用户的信息...`);
  
  const results = await Promise.all(
    users.map(username => 
      bbFetch(`https://api.github.com/users/${username}`)
    )
  );
  
  console.log('\n结果:');
  results.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.body.login}: ${result.body.public_repos} 个仓库`);
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 bb-browser Fetch API 使用示例');
  console.log('═'.repeat(50));
  
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    await example6();
    
    console.log('\n✅ 所有示例运行完成！');
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    console.error('\n请确保:');
    console.error('  1. bb-browser daemon 正在运行: bb-browser daemon start');
    console.error('  2. Chrome 浏览器已启动');
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = { bbFetch };
