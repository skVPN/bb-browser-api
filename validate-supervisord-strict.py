#!/usr/bin/env python3
"""
supervisord.conf 严格验证脚本
模拟 supervisord 的解析方式
"""

import sys
import re

def validate_supervisord_strict(filepath):
    """严格验证 supervisord 配置文件"""
    print(f"严格验证配置文件: {filepath}")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    current_section = None
    line_num = 0
    
    for i, line in enumerate(lines, 1):
        line_num = i
        stripped = line.strip()
        
        # 跳过空行和注释
        if not stripped or stripped.startswith(';') or stripped.startswith('#'):
            continue
        
        # Section 头
        if stripped.startswith('[') and stripped.endswith(']'):
            current_section = stripped[1:-1]
            print(f"第 {i} 行: [{current_section}]")
            continue
        
        # 键值对
        if '=' in stripped:
            key, value = stripped.split('=', 1)
            key = key.strip()
            value = value.strip()
            
            # 检查 environment 字段的引号
            if key == 'environment':
                # 检查是否有不必要的引号
                if '"' in value or "'" in value:
                    errors.append(f"第 {i} 行: environment 字段不应该包含引号")
                    errors.append(f"  当前值: {value}")
                    clean_value = value.replace('"', '').replace("'", '')
                    errors.append(f"  应该是: {clean_value}")
                
                # 检查格式
                if '=' not in value:
                    errors.append(f"第 {i} 行: environment 格式错误，应该是 KEY=VALUE")
                else:
                    env_key, env_value = value.split('=', 1)
                    if '"' in env_value or "'" in env_value:
                        errors.append(f"第 {i} 行: environment 的值不应该有引号")
                        errors.append(f"  错误: {key}={value}")
                        clean_env_value = env_value.replace('"', '').replace("'", '')
                        errors.append(f"  正确: {key}={env_key}={clean_env_value}")
            
            # 检查 command 字段的引号
            if key == 'command':
                # 检查是否有未闭合的引号
                quote_count = value.count('"')
                if quote_count % 2 != 0:
                    errors.append(f"第 {i} 行: command 字段有未闭合的引号")
                
                # 检查是否有复杂的 shell 脚本
                if 'if [' in value or 'then' in value or 'fi' in value:
                    warnings.append(f"第 {i} 行: command 包含复杂 shell 脚本，建议使用独立脚本")
    
    print()
    
    if errors:
        print("❌ 发现错误:")
        for error in errors:
            print(f"  {error}")
        print()
        return False
    
    if warnings:
        print("⚠️  警告:")
        for warning in warnings:
            print(f"  {warning}")
        print()
    
    print("✅ 配置文件验证通过！")
    return True

if __name__ == '__main__':
    filepath = 'docker/supervisord.conf'
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
    
    success = validate_supervisord_strict(filepath)
    sys.exit(0 if success else 1)
