# supervisord.conf 本地验证指南

## 问题

服务器上报错：
```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
  [line 62]: '"\n'
```

## 根本原因

supervisord 的 `environment` 字段**不应该包含引号**。

### 错误示例

```ini
environment=DISPLAY=":99"                      # ❌ 错误
environment=BB_BROWSER_HOME="/data/bb-browser" # ❌ 错误
```

### 正确示例

```ini
environment=DISPLAY=:99                        # ✅ 正确
environment=BB_BROWSER_HOME=/data/bb-browser   # ✅ 正确
```

---

## 本地验证方法

### 方法 1：使用 Python 验证脚本（推荐）

```bash
# 在项目根目录运行
python validate-supervisord-strict.py
```

**输出示例**：
```
严格验证配置文件: docker/supervisord.conf
============================================================
第 1 行: [supervisord]
第 8 行: [program:xvfb]
第 20 行: [program:fluxbox]
第 33 行: [program:x11vnc]
第 45 行: [program:novnc]
第 57 行: [program:chromium]
第 70 行: [program:bb-daemon]

✅ 配置文件验证通过！
```

### 方法 2：检查引号

```bash
# Windows PowerShell
Get-Content docker\supervisord.conf | Select-String -Pattern '"'

# Linux/Mac
grep '"' docker/supervisord.conf
```

**应该没有输出**（或只在注释中有引号）

### 方法 3：检查 environment 字段

```bash
# Windows PowerShell
Get-Content docker\supervisord.conf | Select-String -Pattern 'environment='

# Linux/Mac
grep 'environment=' docker/supervisord.conf
```

**正确输出**：
```
environment=DISPLAY=:99
environment=DISPLAY=:99
environment=BB_BROWSER_HOME=/data/bb-browser
```

**错误输出**（有引号）：
```
environment=DISPLAY=":99"
environment=BB_BROWSER_HOME="/data/bb-browser"
```

---

## 验证脚本说明

### validate-supervisord-strict.py

**功能**：
- ✅ 检查 `environment` 字段是否有引号
- ✅ 检查 `command` 字段是否有未闭合的引号
- ✅ 警告复杂的 shell 脚本（建议使用独立脚本）
- ✅ 显示所有 section 和行号

**使用**：
```bash
python validate-supervisord-strict.py [配置文件路径]
```

**示例**：
```bash
# 验证默认配置
python validate-supervisord-strict.py

# 验证指定文件
python validate-supervisord-strict.py docker/supervisord.conf
```

---

## supervisord 配置规则

### 1. environment 字段

**格式**：`environment=KEY1=VALUE1,KEY2=VALUE2`

**规则**：
- ❌ 不要使用引号包裹值
- ❌ 不要使用引号包裹整个字段
- ✅ 多个环境变量用逗号分隔
- ✅ 值中如果有空格，使用 `%(ENV_VAR)s` 引用环境变量

**示例**：
```ini
# 单个环境变量
environment=DISPLAY=:99

# 多个环境变量
environment=DISPLAY=:99,PATH=/usr/bin:/bin

# 引用环境变量
environment=DISPLAY=:%(ENV_DISPLAY_NUM)s
```

### 2. command 字段

**规则**：
- ✅ 所有参数放在一行
- ❌ 不要使用多行格式
- ❌ 避免复杂的 shell 脚本
- ✅ 复杂逻辑使用独立脚本

**错误示例**：
```ini
command=chromium
    --no-sandbox
    --disable-dev-shm-usage
```

**正确示例**：
```ini
command=chromium --no-sandbox --disable-dev-shm-usage
```

**复杂脚本（不推荐）**：
```ini
command=/bin/sh -c "if [ -n \"$VAR\" ]; then echo \"test\"; fi"
```

**使用独立脚本（推荐）**：
```ini
command=/bin/sh /start-script.sh
```

### 3. 引号使用

**规则**：
- ✅ `command` 中的 shell 脚本可以使用引号
- ❌ `environment` 字段不要使用引号
- ✅ 路径中有空格时使用引号（但尽量避免空格）

---

## 常见错误

### 错误 1：environment 有引号

```ini
environment=BB_BROWSER_HOME="/data/bb-browser"
```

**错误信息**：
```
Error: Source contains parsing errors
  [line XX]: '"\n'
```

**修复**：
```ini
environment=BB_BROWSER_HOME=/data/bb-browser
```

### 错误 2：多行 command

```ini
command=chromium
    --no-sandbox
```

**错误信息**：
```
Error: Source contains parsing errors
```

**修复**：
```ini
command=chromium --no-sandbox
```

### 错误 3：复杂 shell 脚本

```ini
command=/bin/sh -c "if [ -n \"$VNC_PASSWORD\" ]; then x11vnc ...; fi"
```

**问题**：引号嵌套复杂，容易出错

**修复**：使用独立脚本
```ini
command=/bin/sh /start-x11vnc.sh
```

---

## 验证流程

### 1. 修改配置文件后

```bash
# 1. 本地验证
python validate-supervisord-strict.py

# 2. 检查引号
grep '"' docker/supervisord.conf

# 3. 提交代码
git add docker/supervisord.conf
git commit -m "修复: supervisord 配置"
git push

# 4. 服务器上测试
cd /home/ecs-user/bb-browser-api
git pull
docker compose build
docker compose up -d
docker compose logs -f bb-browser
```

### 2. 如果还有错误

```bash
# 查看具体错误行
docker compose logs bb-browser | grep "line"

# 进入容器检查
docker compose exec bb-browser cat /etc/supervisor/conf.d/bb-browser.conf

# 手动测试配置
docker compose exec bb-browser supervisord -c /etc/supervisor/supervisord.conf -n
```

---

## 总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `[line XX]: '"\n'` | environment 有引号 | 移除引号 |
| 多行命令错误 | command 换行 | 合并为一行 |
| 引号嵌套错误 | shell 脚本复杂 | 使用独立脚本 |

**验证工具**：
- ✅ `validate-supervisord-strict.py` - 严格验证
- ✅ `grep '"' docker/supervisord.conf` - 检查引号
- ✅ `grep 'environment=' docker/supervisord.conf` - 检查 environment

**最佳实践**：
- ✅ 修改配置后立即本地验证
- ✅ 使用独立脚本处理复杂逻辑
- ✅ environment 字段不使用引号
- ✅ command 字段所有参数放一行
