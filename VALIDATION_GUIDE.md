# supervisord 配置文件校验指南

## 问题背景

在 Windows 上编辑的配置文件默认使用 CRLF（`\r\n`）换行符，但 Docker 容器内的 Linux 环境需要 LF（`\n`）换行符。这会导致 supervisord 解析错误：

```
Error: Source contains parsing errors: '/etc/supervisor/conf.d/bb-browser.conf'
  [line 62]: '"\n'
```

## 解决方案

### 1. 本地校验工具

使用 `validate-supervisord-strict.py` 校验配置文件：

```bash
python validate-supervisord-strict.py docker/supervisord.conf
```

**检查项：**
- ✅ 语法解析（使用 Python configparser）
- ✅ environment 字段不能有引号
- ✅ command 字段必须在一行
- ✅ 必需字段检查
- ✅ 环境变量引用格式检查

### 2. 转换换行符

**Windows PowerShell：**

```powershell
# 转换单个文件
$content = Get-Content docker/supervisord.conf -Raw
$content = $content.Replace("`r`n", "`n")
[System.IO.File]::WriteAllText("docker/supervisord.conf", $content, [System.Text.UTF8Encoding]::new($false))

# 批量转换所有 Docker 配置文件
$files = @('docker/supervisord.conf', 'docker/entrypoint.sh', 'docker/start-x11vnc.sh')
foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "✅ $file"
}
```

**Linux/macOS：**

```bash
# 使用 dos2unix（需要安装）
dos2unix docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh

# 或使用 sed
sed -i 's/\r$//' docker/supervisord.conf
```

### 3. 验证转换结果

**检查文件是否为 LF：**

```powershell
# Windows PowerShell
Get-Content docker/supervisord.conf -Raw | Format-Hex | Select-Object -Last 3
# 应该只看到 0A，没有 0D 0A
```

```bash
# Linux/macOS
file docker/supervisord.conf
# 应该显示：ASCII text
# 如果是 CRLF 会显示：ASCII text, with CRLF line terminators
```

## supervisord 配置规则

### ✅ 正确写法

```ini
[program:example]
command=chromium --no-sandbox --remote-debugging-port=9222
environment=DISPLAY=:99,NODE_ENV=production
```

### ❌ 错误写法

```ini
[program:example]
# ❌ environment 不能有引号
environment="DISPLAY=:99"

# ❌ command 不能跨行
command=chromium \
    --no-sandbox \
    --remote-debugging-port=9222
```

### 复杂逻辑使用独立脚本

如果需要条件判断或复杂逻辑，使用独立脚本：

```ini
[program:x11vnc]
command=/bin/sh /start-x11vnc.sh
```

```bash
#!/bin/sh
# /start-x11vnc.sh
if [ -n "$VNC_PASSWORD" ]; then
    x11vnc -storepasswd "$VNC_PASSWORD" /tmp/vncpass
    exec x11vnc -rfbauth /tmp/vncpass -display ":${DISPLAY_NUM}"
else
    exec x11vnc -nopw -display ":${DISPLAY_NUM}"
fi
```

## 部署流程

1. **本地校验**

```bash
python validate-supervisord-strict.py docker/supervisord.conf
```

2. **提交代码**

```bash
git add docker/supervisord.conf docker/entrypoint.sh docker/start-x11vnc.sh
git commit -m "fix(docker): 修复 supervisord 配置文件换行符问题"
git push
```

3. **服务器部署**

```bash
cd /path/to/bb-browser
git pull
docker compose build
docker compose up -d
```

4. **验证服务**

```bash
# 查看容器日志
docker compose logs -f bb-browser

# 检查服务状态
docker compose exec bb-browser supervisorctl status

# 应该看到 6 个服务都是 RUNNING：
# xvfb                             RUNNING   pid 123, uptime 0:01:00
# fluxbox                          RUNNING   pid 124, uptime 0:01:00
# x11vnc                           RUNNING   pid 125, uptime 0:01:00
# novnc                            RUNNING   pid 126, uptime 0:01:00
# chromium                         RUNNING   pid 127, uptime 0:01:00
# bb-daemon                        RUNNING   pid 128, uptime 0:01:00
```

5. **测试访问**

- noVNC 网页：http://your-server:6080/vnc.html
- API 接口：http://your-server:18888

## 常见问题

### Q: 为什么本地校验通过，但 Docker 内还是报错？

A: 可能是换行符问题。Windows 编辑器默认使用 CRLF，需要转换为 LF。

### Q: 如何防止 Git 自动转换换行符？

A: 在 `.gitattributes` 中添加：

```
docker/supervisord.conf text eol=lf
docker/*.sh text eol=lf
```

### Q: 如何在 VS Code 中设置换行符？

A: 
1. 打开文件
2. 点击右下角的 "CRLF" 或 "LF"
3. 选择 "LF"
4. 保存文件

或在 `.vscode/settings.json` 中添加：

```json
{
  "files.eol": "\n",
  "[shellscript]": {
    "files.eol": "\n"
  },
  "[properties]": {
    "files.eol": "\n"
  }
}
```

## 参考资料

- [Supervisor Configuration File](http://supervisord.org/configuration.html)
- [Unix vs Windows Line Endings](https://www.aleksandrhovhannisyan.com/blog/crlf-vs-lf-normalizing-line-endings-in-git/)
