# 🔧 远程控制工具

一款跨平台远程控制工具，支持通过手机/浏览器远程控制 Windows 电脑。

## ✨ 功能特性

- 📁 **文件管理器** - 浏览、上传、下载、删除、重命名文件
- 🖥️ **进程管理器** - 查看进程列表、结束进程
- 💻 **Web 终端** - 远程命令行操作
- 🔒 **Token 认证** - 简单安全的身份验证
- 🌐 **公网访问** - 通过 FRP 实现内网穿透

## 📁 项目结构

```
remote-control/
├── server/              # 被控端服务端（Windows）
│   ├── src/
│   │   ├── index.js     # 主入口
│   │   └── routes/
│   │       ├── files.js     # 文件管理 API
│   │       ├── processes.js # 进程管理 API
│   │       └── terminal.js  # 终端 WebSocket
│   ├── package.json
│   └── .env.example
├── web/                 # 控制端前端
│   ├── src/
│   │   ├── views/
│   │   │   ├── FileManager.vue
│   │   │   ├── ProcessManager.vue
│   │   │   └── Terminal.vue
│   │   └── App.vue
│   ├── package.json
│   └── vite.config.js
└── frp/                 # FRP 穿透配置
    ├── frps.toml        # 服务端配置
    └── frpc.toml        # 客户端配置
```

## 🚀 快速开始

### 1. 被控端部署（Windows 电脑）

```bash
# 进入服务端目录
cd server

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，设置你的认证 Token
# AUTH_TOKEN=your-secret-token

# 启动服务
npm start
```

服务将在 `http://localhost:3000` 运行。

### 2. 前端开发（可选，用于本地测试）

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 运行。

### 3. 公网部署（FRP 穿透）

#### 服务端（公网服务器）

1. 下载 FRP：
```bash
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64
```

2. 复制配置文件：
```bash
cp /path/to/frps.toml ./frps.toml
# 编辑 frps.toml，设置你的 token
```

3. 启动 FRP 服务端：
```bash
./frps -c frps.toml
```

#### 客户端（被控端 Windows）

1. 下载 Windows 版 FRP：
https://github.com/fatedier/frp/releases

2. 复制配置文件：
```
将 frpc.toml 放到 frp 目录下
编辑 frpc.toml，设置 server_addr 和 token
```

3. 启动 FRP 客户端：
```cmd
frpc.exe -c frpc.toml
```

### 4. 访问

- **本地访问**: http://localhost:5173（前端开发模式）
- **公网访问**: http://your-domain.com:7500（通过 FRP）

## 🔧 配置说明

### 服务端环境变量 (.env)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| AUTH_TOKEN | 认证 Token | your-secret-token |

### FRP 配置

#### frps.toml（公网服务器）

```toml
[common]
bind_port = 7000
token = your-frp-token-here
```

#### frpc.toml（被控端）

```toml
[common]
server_addr = your-server-ip
server_port = 7000
token = your-frp-token-here

[remote-control-tcp]
type = tcp
local_ip = 127.0.0.1
local_port = 3000
remote_port = 3000
```

## 📱 使用说明

### 首次使用

1. 在被控端电脑上启动服务端
2. 启动 FRP 客户端（如果需要公网访问）
3. 在手机/其他电脑浏览器中访问公网地址
4. 首次访问需要在浏览器控制台设置 Token：
   ```js
   localStorage.setItem('auth_token', 'your-secret-token')
   location.reload()
   ```

### 文件管理

- 双击文件夹进入
- 右键点击文件/文件夹打开菜单
- 支持上传、下载、删除、重命名

### 进程管理

- 实时显示进程列表（每5秒自动刷新）
- 点击进程选中
- 点击「结束进程」按钮结束选中进程

### 终端

- 点击「新建终端」连接
- 支持 PowerShell 命令
- 支持清屏、关闭终端

## ⚠️ 安全提示

1. **修改默认 Token** - 不要使用默认的 `your-secret-token`
2. **使用 HTTPS** - 生产环境建议配置 HTTPS
3. **限制访问IP** - 在服务器防火墙中限制访问来源
4. **定期更新** - 保持系统和依赖更新

## 🔨 技术栈

- **后端**: Node.js + Express + Socket.IO + node-pty
- **前端**: Vue3 + Element Plus + Xterm.js
- **穿透**: FRP (Fast Reverse Proxy)

## 📝 许可证

MIT License
