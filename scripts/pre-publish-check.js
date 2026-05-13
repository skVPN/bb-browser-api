#!/usr/bin/env node

/**
 * 发布前检查脚本
 * 验证包配置和构建产物
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = join(rootDir, filePath);
  if (existsSync(fullPath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} (未找到: ${filePath})`, 'red');
    return false;
  }
}

async function main() {
  log('\n=== bb-browser-api 发布前检查 ===\n', 'blue');
  
  let hasErrors = false;

  // 1. 检查 package.json
  log('1. 检查 package.json 配置', 'yellow');
  try {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    
    // 检查必需字段
    const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'files', 'repository', 'license'];
    for (const field of requiredFields) {
      if (packageJson[field]) {
        log(`  ✓ ${field}: ${typeof packageJson[field] === 'object' ? 'OK' : packageJson[field]}`, 'green');
      } else {
        log(`  ✗ 缺少字段: ${field}`, 'red');
        hasErrors = true;
      }
    }

    // 检查包名
    if (packageJson.name !== 'bb-browser-api') {
      log(`  ⚠ 包名不是 bb-browser-api: ${packageJson.name}`, 'yellow');
    }

    // 检查 bin 命令
    if (packageJson.bin) {
      log('  Bin 命令:', 'blue');
      for (const [cmd, path] of Object.entries(packageJson.bin)) {
        log(`    - ${cmd} -> ${path}`, 'blue');
      }
    }

  } catch (error) {
    log(`  ✗ 读取 package.json 失败: ${error.message}`, 'red');
    hasErrors = true;
  }

  // 2. 检查构建产物
  log('\n2. 检查构建产物', 'yellow');
  const distFiles = [
    'dist/cli.js',
    'dist/mcp.js',
    'dist/provider.js',
    'dist/daemon.js',
  ];
  
  for (const file of distFiles) {
    if (!checkFile(file, file)) {
      hasErrors = true;
    }
  }

  // 检查 shebang
  try {
    const cliContent = readFileSync(join(rootDir, 'dist/cli.js'), 'utf8');
    if (cliContent.startsWith('#!/usr/bin/env node')) {
      log('  ✓ CLI 文件包含正确的 shebang', 'green');
    } else {
      log('  ✗ CLI 文件缺少 shebang', 'red');
      hasErrors = true;
    }
  } catch (error) {
    log(`  ⚠ 无法检查 shebang: ${error.message}`, 'yellow');
  }

  // 3. 检查必需文件
  log('\n3. 检查必需文件', 'yellow');
  const requiredFiles = [
    'README.md',
    'LICENSE',
    '.npmignore',
  ];
  
  for (const file of requiredFiles) {
    if (!checkFile(file, file)) {
      hasErrors = true;
    }
  }

  // 4. 检查 .npmignore
  log('\n4. 检查 .npmignore 配置', 'yellow');
  try {
    const npmignore = readFileSync(join(rootDir, '.npmignore'), 'utf8');
    const shouldIgnore = ['node_modules', '.git', 'test', 'tests', '*.sh'];
    const shouldNotIgnore = ['dist', 'README.md', 'LICENSE'];
    
    for (const pattern of shouldIgnore) {
      if (npmignore.includes(pattern)) {
        log(`  ✓ 忽略 ${pattern}`, 'green');
      } else {
        log(`  ⚠ 建议忽略 ${pattern}`, 'yellow');
      }
    }

    // 检查不应该被忽略的文件（它们不应该出现在 .npmignore 中）
    for (const pattern of shouldNotIgnore) {
      // 检查是否在行首或前面有注释符号
      const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
      if (!regex.test(npmignore)) {
        log(`  ✓ 不忽略 ${pattern}`, 'green');
      } else {
        log(`  ✗ 不应忽略 ${pattern}`, 'red');
        hasErrors = true;
      }
    }
  } catch (error) {
    log(`  ⚠ 无法检查 .npmignore: ${error.message}`, 'yellow');
  }

  // 5. 检查依赖
  log('\n5. 检查依赖配置', 'yellow');
  try {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    
    if (packageJson.dependencies) {
      log(`  ✓ dependencies: ${Object.keys(packageJson.dependencies).length} 个`, 'green');
    }
    
    if (packageJson.devDependencies) {
      log(`  ✓ devDependencies: ${Object.keys(packageJson.devDependencies).length} 个`, 'green');
    }

    // 检查是否有不必要的依赖
    const unnecessaryDeps = ['nodemon', 'ts-node', 'jest', 'mocha'];
    for (const dep of unnecessaryDeps) {
      if (packageJson.dependencies?.[dep]) {
        log(`  ⚠ ${dep} 应该在 devDependencies 中`, 'yellow');
      }
    }
  } catch (error) {
    log(`  ⚠ 无法检查依赖: ${error.message}`, 'yellow');
  }

  // 6. 检查 Node.js 版本要求
  log('\n6. 检查 Node.js 版本要求', 'yellow');
  try {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    if (packageJson.engines?.node) {
      log(`  ✓ Node.js 版本要求: ${packageJson.engines.node}`, 'green');
    } else {
      log('  ⚠ 未指定 Node.js 版本要求', 'yellow');
    }
  } catch (error) {
    log(`  ⚠ 无法检查版本要求: ${error.message}`, 'yellow');
  }

  // 总结
  log('\n=== 检查完成 ===\n', 'blue');
  
  if (hasErrors) {
    log('✗ 发现错误，请修复后再发布', 'red');
    process.exit(1);
  } else {
    log('✓ 所有检查通过，可以发布', 'green');
    log('\n运行以下命令发布:', 'blue');
    log('  npm publish --access public', 'yellow');
    log('或使用发布脚本:', 'blue');
    log('  ./scripts/publish.sh [patch|minor|major]', 'yellow');
    log('  .\\scripts\\publish.ps1 [patch|minor|major]', 'yellow');
  }
}

main().catch(error => {
  log(`\n✗ 检查失败: ${error.message}`, 'red');
  process.exit(1);
});
