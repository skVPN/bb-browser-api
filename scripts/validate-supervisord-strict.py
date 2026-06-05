#!/usr/bin/env python3
"""
supervisord 配置文件严格校验工具

用法：
    python validate-supervisord-strict.py docker/supervisord.conf

检查项：
1. 语法解析（使用 configparser）
2. environment 字段不能有引号
3. command 字段必须在一行
4. 必需字段检查
"""

import sys
import re
from configparser import ConfigParser
from pathlib import Path


def validate_supervisord_config(config_path: str) -> tuple[bool, list[str]]:
    """
    校验 supervisord 配置文件
    
    返回：(是否通过, 错误列表)
    """
    errors = []
    
    # 1. 检查文件是否存在
    if not Path(config_path).exists():
        return False, [f"文件不存在: {config_path}"]
    
    # 2. 读取原始内容（用于检查引号）
    with open(config_path, 'r', encoding='utf-8') as f:
        raw_content = f.read()
        lines = raw_content.splitlines()
    
    # 3. 检查 environment 字段是否有引号
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('environment='):
            # 检查是否有引号
            if '"' in stripped or "'" in stripped:
                errors.append(
                    f"第 {i} 行: environment 字段不能使用引号\n"
                    f"  错误: {stripped}\n"
                    f"  正确: environment=KEY=VALUE,KEY2=VALUE2"
                )
    
    # 4. 使用 configparser 解析（检查语法）
    try:
        parser = ConfigParser(strict=False, interpolation=None)
        parser.read(config_path, encoding='utf-8')
    except Exception as e:
        errors.append(f"配置文件解析失败: {e}")
        return False, errors
    
    # 5. 检查每个 program 的必需字段
    for section in parser.sections():
        if section.startswith('program:'):
            program_name = section.split(':', 1)[1]
            
            # 检查 command 字段
            if not parser.has_option(section, 'command'):
                errors.append(f"[{section}] 缺少 command 字段")
            else:
                command = parser.get(section, 'command')
                # 检查 command 是否跨行（简单检查）
                if '\n' in command:
                    errors.append(
                        f"[{section}] command 字段不能跨行\n"
                        f"  请将所有参数放在一行"
                    )
    
    # 6. 检查 %(ENV_xxx)s 变量引用格式
    env_var_pattern = re.compile(r'%\(ENV_\w+\)s')
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if '%(ENV_' in stripped:
            # 检查格式是否正确
            matches = env_var_pattern.findall(stripped)
            if not matches:
                errors.append(
                    f"第 {i} 行: 环境变量引用格式错误\n"
                    f"  错误: {stripped}\n"
                    f"  正确格式: %(ENV_VARIABLE_NAME)s"
                )
    
    return len(errors) == 0, errors


def main():
    if len(sys.argv) < 2:
        print("用法: python validate-supervisord-strict.py <config-file>")
        print("示例: python validate-supervisord-strict.py docker/supervisord.conf")
        sys.exit(1)
    
    config_path = sys.argv[1]
    
    print(f"🔍 校验配置文件: {config_path}")
    print("=" * 60)
    
    passed, errors = validate_supervisord_config(config_path)
    
    if passed:
        print("✅ 配置文件校验通过！")
        print("\n可以安全部署：")
        print("  docker compose build")
        print("  docker compose up -d")
        sys.exit(0)
    else:
        print("❌ 配置文件校验失败！")
        print(f"\n发现 {len(errors)} 个错误：\n")
        for i, error in enumerate(errors, 1):
            print(f"{i}. {error}")
            print()
        sys.exit(1)


if __name__ == '__main__':
    main()
