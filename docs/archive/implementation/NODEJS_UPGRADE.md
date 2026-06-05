# Node.js 升级指南

## 问题

bb-browser-api v0.12.2 使用了可选链操作符 (`?.`)，需要 Node.js 14+ 才能运行。

错误信息：
```
SyntaxError: Unexpected token '.'
```

## 检查当前版本

```bash
node --version
```

如果版本低于 v14.0.0，需要升级。

## 升级方法

### 方法 1：使用 nvm（推荐）

nvm (Node Version Manager) 是管理多个 Node.js 版本的最佳工具。

#### 1. 安装 nvm

```bash
# 下载并安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc
# 或
source ~/.zshrc
```

#### 2. 安装 Node.js 18 LTS（推荐）

```bash
# 安装 Node.js 18 LTS
nvm install 18

# 设置为默认版本
nvm alias default 18

# 使用该版本
nvm use 18

# 验证版本
node --version
```

#### 3. 重新安装 bb-browser-api

```bash
npm uninstall -g bb-browser-api
npm install -g bb-browser-api@0.12.2
```

### 方法 2：使用 NodeSource 仓库（Ubuntu/Debian）

```bash
# 移除旧版本
sudo apt-get remove nodejs npm

# 添加 NodeSource 仓库（Node.js 18.x）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
sudo apt-get install -y nodejs

# 验证版本
node --version
npm --version

# 重新安装 bb-browser-api
npm uninstall -g bb-browser-api
npm install -g bb-browser-api@0.12.2
```

### 方法 3：使用 NodeSource 仓库（CentOS/RHEL）

```bash
# 移除旧版本
sudo yum remove nodejs npm

# 添加 NodeSource 仓库（Node.js 18.x）
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# 安装 Node.js
sudo yum install -y nodejs

# 验证版本
node --version
npm --version

# 重新安装 bb-browser-api
npm uninstall -g bb-browser-api
npm install -g bb-browser-api@0.12.2
```

### 方法 4：从官方网站下载二进制文件

```bash
# 下载 Node.js 18 LTS
cd /tmp
wget https://nodejs.org/dist/v18.20.0/node-v18.20.0-linux-x64.tar.xz

# 解压
tar -xf node-v18.20.0-linux-x64.tar.xz

# 移动到 /usr/local
sudo mv node-v18.20.0-linux-x64 /usr/local/nodejs

# 创建软链接
sudo ln -sf /usr/local/nodejs/bin/node /usr/bin/node
sudo ln -sf /usr/local/nodejs/bin/npm /usr/bin/npm
sudo ln -sf /usr/local/nodejs/bin/npx /usr/bin/npx

# 验证版本
node --version
npm --version

# 重新安装 bb-browser-api
npm uninstall -g bb-browser-api
npm install -g bb-browser-api@0.12.2
```

## 验证安装

升级完成后，运行以下命令验证：

```bash
# 检查 Node.js 版本（应该 >= 14.0.0）
node --version

# 检查 bb-browser-api 版本
bb-browser-api --version

# 测试运行
bb-browser-api daemon status
```

## 推荐版本

- **Node.js 18 LTS**（推荐）- 长期支持版本，稳定可靠
- **Node.js 20 LTS** - 最新 LTS 版本
- **最低要求**：Node.js 14+

## 常见问题

### Q: 升级后 npm 全局包找不到？

```bash
# 检查 npm 全局安装路径
npm config get prefix

# 确保该路径在 PATH 中
echo $PATH

# 如果不在，添加到 ~/.bashrc 或 ~/.zshrc
echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Q: 权限问题？

```bash
# 方法 1：使用 nvm（推荐，不需要 sudo）
# 按照上面的 nvm 安装步骤

# 方法 2：修改 npm 全局目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Q: 多个 Node.js 版本冲突？

```bash
# 使用 nvm 管理多个版本
nvm list                    # 查看已安装版本
nvm use 18                  # 切换到 Node.js 18
nvm alias default 18        # 设置默认版本
```

## Docker 环境

如果在 Docker 容器中运行，修改 Dockerfile：

```dockerfile
# 使用 Node.js 18 基础镜像
FROM node:18-alpine

# 或者在现有镜像中安装
RUN apk add --no-cache nodejs npm
```

## 快速命令（推荐）

```bash
# 一键升级（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash && \
source ~/.bashrc && \
nvm install 18 && \
nvm use 18 && \
nvm alias default 18 && \
npm install -g bb-browser-api@0.12.2 && \
bb-browser-api --version
```
