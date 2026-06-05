#!/usr/bin/env python3
"""
supervisord.conf 配置文件验证脚本
"""

import sys
from configparser import ConfigParser

def validate_supervisord_conf(filepath):
    """验证 supervisord 配置文件"""
    print(f"验证配置文件: {filepath}")
    print("=" * 60)
    
    try:
        config = ConfigParser()
        config.read(filepath, encoding='utf-8')
        
        print("✅ 配置文件语法正确！")
        print()
        
        # 显示所有 section
        print("配置的 sections:")
        for section in config.sections():
            print(f"  - [{section}]")
        
        print()
        
        # 检查每个 program
        programs = [s for s in config.sections() if s.startswith('program:')]
        print(f"找到 {len(programs)} 个程序配置:")
        
        for program in programs:
            name = program.replace('program:', '')
            command = config.get(program, 'command', fallback='N/A')
            priority = config.get(program, 'priority', fallback='N/A')
            
            print(f"\n  [{name}]")
            print(f"    priority: {priority}")
            print(f"    command: {command[:80]}...")
            
            # 检查 environment
            if config.has_option(program, 'environment'):
                env = config.get(program, 'environment')
                print(f"    environment: {env}")
        
        return True
        
    except Exception as e:
        print(f"❌ 配置文件有错误:")
        print(f"   {type(e).__name__}: {e}")
        return False

if __name__ == '__main__':
    filepath = 'docker/supervisord.conf'
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
    
    success = validate_supervisord_conf(filepath)
    sys.exit(0 if success else 1)
