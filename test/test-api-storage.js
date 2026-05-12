/**
 * 测试 /api/storage 存储接口
 * 
 * 使用方法：
 * 1. 确保 bb-browser daemon 正在运行
 * 2. 运行: node test/test-api-storage.js
 */

const DAEMON_URL = 'http://localhost:6666';

async function testStorage() {
  console.log('=== 测试 /api/storage 存储接口 ===\n');

  // 测试 1: 获取 GitHub 的存储数据
  console.log('测试 1: 获取 GitHub 的存储数据');
  try {
    const response = await fetch(`${DAEMON_URL}/api/storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'https://github.com'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  域名: ${result.domain}`);
      console.log(`  Cookies 数量: ${result.cookies?.length || 0}`);
      console.log(`  localStorage 键数量: ${Object.keys(result.localStorage || {}).length}`);
      console.log(`  sessionStorage 键数量: ${Object.keys(result.sessionStorage || {}).length}`);
      
      if (result.cookies && result.cookies.length > 0) {
        console.log('\n  Cookies 示例:');
        result.cookies.slice(0, 3).forEach((cookie, index) => {
          console.log(`    ${index + 1}. ${cookie.name} = ${cookie.value.substring(0, 30)}...`);
          console.log(`       domain: ${cookie.domain}, path: ${cookie.path}`);
          console.log(`       secure: ${cookie.secure}, httpOnly: ${cookie.httpOnly}`);
        });
        if (result.cookies.length > 3) {
          console.log(`    ... 还有 ${result.cookies.length - 3} 个 cookies`);
        }
      }
      
      if (result.localStorage && Object.keys(result.localStorage).length > 0) {
        console.log('\n  localStorage 示例:');
        Object.entries(result.localStorage).slice(0, 3).forEach(([key, value], index) => {
          const valuePreview = String(value).substring(0, 50);
          console.log(`    ${index + 1}. ${key} = ${valuePreview}...`);
        });
      }
      
      if (result.sessionStorage && Object.keys(result.sessionStorage).length > 0) {
        console.log('\n  sessionStorage 示例:');
        Object.entries(result.sessionStorage).slice(0, 3).forEach(([key, value], index) => {
          const valuePreview = String(value).substring(0, 50);
          console.log(`    ${index + 1}. ${key} = ${valuePreview}...`);
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

  // 测试 2: 获取百度的存储数据
  console.log('测试 2: 获取百度的存储数据');
  try {
    const response = await fetch(`${DAEMON_URL}/api/storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'https://www.baidu.com'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  域名: ${result.domain}`);
      console.log(`  Cookies 数量: ${result.cookies?.length || 0}`);
      console.log(`  localStorage 键数量: ${Object.keys(result.localStorage || {}).length}`);
      console.log(`  sessionStorage 键数量: ${Object.keys(result.sessionStorage || {}).length}`);
      
      if (result.cookies && result.cookies.length > 0) {
        console.log('\n  Cookies 列表:');
        result.cookies.forEach((cookie, index) => {
          console.log(`    ${index + 1}. ${cookie.name}`);
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

  // 测试 3: 获取 Google 的存储数据
  console.log('测试 3: 获取 Google 的存储数据');
  try {
    const response = await fetch(`${DAEMON_URL}/api/storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'https://www.google.com'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ 请求成功');
      console.log(`  域名: ${result.domain}`);
      console.log(`  Cookies 数量: ${result.cookies?.length || 0}`);
      console.log(`  localStorage 键数量: ${Object.keys(result.localStorage || {}).length}`);
      console.log(`  sessionStorage 键数量: ${Object.keys(result.sessionStorage || {}).length}`);
      
      // 显示 Cookie 的域名分布
      if (result.cookies && result.cookies.length > 0) {
        console.log('\n  Cookie 域名分布:');
        const domainCount = {};
        result.cookies.forEach(cookie => {
          domainCount[cookie.domain] = (domainCount[cookie.domain] || 0) + 1;
        });
        Object.entries(domainCount).forEach(([domain, count]) => {
          console.log(`    ${domain}: ${count} 个`);
        });
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
testStorage().catch(console.error);
