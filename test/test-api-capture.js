/**
 * 测试 /api/capture 抓包接口
 * 
 * 使用方法：
 * 1. 确保 bb-browser daemon 正在运行
 * 2. 运行: node test/test-api-capture.js
 */

const DAEMON_URL = 'http://localhost:6666';

async function testCapture() {
  console.log('=== 测试 /api/capture 抓包接口 ===\n');

  // 测试 1: 访问 GitHub 并捕获 API 请求
  console.log('测试 1: 访问 GitHub 用户页面，捕获 API 请求');
  try {
    const response = await fetch(`${DAEMON_URL}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://github.com/octocat',
        pattern: 'api\\.github\\.com',  // 匹配 GitHub API 请求
        timeout: 5000
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  访问 URL: ${result.url}`);
      console.log(`  匹配模式: ${result.pattern}`);
      console.log(`  总请求数: ${result.totalRequests}`);
      console.log(`  匹配请求数: ${result.matchedRequests}`);
      
      if (result.requests && result.requests.length > 0) {
        console.log('\n  匹配的请求:');
        result.requests.forEach((req, index) => {
          console.log(`    ${index + 1}. ${req.method} ${req.url}`);
          console.log(`       状态: ${req.status || '未完成'}`);
          if (req.responseBody) {
            const bodyPreview = req.responseBody.substring(0, 100);
            console.log(`       响应体预览: ${bodyPreview}...`);
          }
        });
      }
    } else {
      console.log('✗ 请求失败:', result.error);
      console.log('  提示:', result.hint);
    }
  } catch (error) {
    console.log('✗ 请求异常:', error.message);
  }

  console.log('\n---\n');

  // 测试 2: 访问百度并捕获所有请求
  console.log('测试 2: 访问百度，捕获所有请求');
  try {
    const response = await fetch(`${DAEMON_URL}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.baidu.com',
        timeout: 3000
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  访问 URL: ${result.url}`);
      console.log(`  总请求数: ${result.totalRequests}`);
      console.log(`  匹配请求数: ${result.matchedRequests}`);
      
      if (result.requests && result.requests.length > 0) {
        console.log('\n  请求类型统计:');
        const typeCount = {};
        result.requests.forEach(req => {
          typeCount[req.type] = (typeCount[req.type] || 0) + 1;
        });
        Object.entries(typeCount).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
      }
    } else {
      console.log('✗ 请求失败:', result.error);
      console.log('  提示:', result.hint);
    }
  } catch (error) {
    console.log('✗ 请求异常:', error.message);
  }

  console.log('\n---\n');

  // 测试 3: 测试正则表达式过滤
  console.log('测试 3: 访问 Google，只捕获图片请求');
  try {
    const response = await fetch(`${DAEMON_URL}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.google.com',
        pattern: '\\.(png|jpg|jpeg|gif|webp)',  // 匹配图片文件
        timeout: 3000
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  访问 URL: ${result.url}`);
      console.log(`  匹配模式: ${result.pattern}`);
      console.log(`  总请求数: ${result.totalRequests}`);
      console.log(`  匹配请求数: ${result.matchedRequests}`);
      
      if (result.requests && result.requests.length > 0) {
        console.log('\n  匹配的图片请求:');
        result.requests.slice(0, 5).forEach((req, index) => {
          console.log(`    ${index + 1}. ${req.url}`);
        });
        if (result.requests.length > 5) {
          console.log(`    ... 还有 ${result.requests.length - 5} 个请求`);
        }
      }
    } else {
      console.log('✗ 请求失败:', result.error);
      console.log('  提示:', result.hint);
    }
  } catch (error) {
    console.log('✗ 请求异常:', error.message);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testCapture().catch(console.error);
