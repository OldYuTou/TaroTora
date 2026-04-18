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
├── .github/
│   └── workflows/       # GitHub Actions 配置
│       ├── build-android.yml       # Release 构建
│       └── build-android-debug.yml # Debug 构建
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
│   ├── vite.config.js
│   ├── capacitor.config.json  # Capacitor 配置
│   └── android/           # Android 项目（构建生成）
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

## 🔧 环境变量配置

本项目使用环境变量进行配置，**请务必在运行前正确填写所有必填项**。

### 1. 服务端环境变量 (`server/.env`)

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入你的实际配置
```

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| **AUTH_TOKEN** | **是** | 认证令牌，客户端连接时必须提供。⚠️ **生产环境必须修改，不要使用默认值** | `your-secret-token-here` |
| PORT | 否 | 服务监听端口 | `3000` |
| FRP_ENABLED | 否 | 是否启用 FRP 内网穿透 | `false` |
| FRP_SERVER_HOST | 条件 | FRP 服务端地址（FRP_ENABLED=true 时必填） | - |
| FRP_SERVER_PORT | 否 | FRP 服务端端口 | `7000` |
| FRP_TOKEN | 条件 | FRP 认证令牌（FRP_ENABLED=true 时必填） | - |
| FRP_REMOTE_PORT | 条件 | 公网映射端口（FRP_ENABLED=true 时必填） | - |
| FRP_TUNNEL_NAME | 否 | FRP 隧道名称 | `tarotora` |
| FRPC_PATH | 否 | frpc 可执行文件路径（不在 PATH 时需指定） | - |

**最小配置示例（仅本地使用）：**
```
AUTH_TOKEN=your-strong-secret-token
```

**完整配置示例（含 FRP 穿透）：**
```
PORT=3000
AUTH_TOKEN=your-strong-secret-token

FRP_ENABLED=true
FRP_SERVER_HOST=your-frp-server.com
FRP_SERVER_PORT=7000
FRP_TOKEN=your-frp-token
FRP_REMOTE_PORT=8300
FRP_TUNNEL_NAME=tarotora
```

### 2. 前端环境变量 (`web/.env`)

**仅在使用 Capacitor 构建 Android APK 时需要配置。**

```bash
cd web
cp .env.example .env
# 编辑 .env 文件，填入你的实际配置
```

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| **VITE_PUBLIC_SERVER_URL** | **是（构建 APK 时）** | 公网服务器地址，用于 APK 自动纠正缓存地址 | `https://your-domain.com` |

> **注意**：该变量仅在构建时注入，运行时修改 `.env` 不会生效，需要重新执行 `npm run build`。

**配置示例：**
```
VITE_PUBLIC_SERVER_URL=https://your-domain.com
```

如果不配置，APK 中的自动地址纠正功能将不会生效，用户需要手动输入服务器地址。

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

## 📱 Android App 构建

本项目支持构建 Android APK，可通过 GitHub Actions 自动构建。

### 方式一：GitHub Actions 自动构建（推荐）

#### Debug 版本（无需配置）
每次推送到 `master` 或 `develop` 分支时，会自动构建 Debug APK。

在 Actions 页面下载构建好的 APK 文件。

#### Release 版本（需要签名配置）

1. **生成签名密钥**（本地执行）：
```bash
keytool -genkey -v -keystore tarotora.keystore -alias tarotora -keyalg RSA -keysize 2048 -validity 10000
# 转换为 base64
cat tarotora.keystore | base64
```

2. **配置 GitHub Secrets**：
在仓库 Settings → Secrets and variables → Actions 中添加：
- `SIGNING_KEY`: 上面生成的 base64 编码的密钥文件
- `ALIAS`: 密钥别名（如：tarotora）
- `KEY_STORE_PASSWORD`: 密钥库密码
- `KEY_PASSWORD`: 密钥密码

3. **创建 Release**：
推送带有 `v` 前缀的标签，会自动构建并发布到 GitHub Releases：
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 方式二：本地构建

#### 前置要求
- Node.js 20+
- Java 17
- Android Studio（用于 SDK）
- Android SDK 34

#### 构建步骤

```bash
cd remote-control/web

# 1. 安装依赖
npm install

# 2. 构建 Vue 应用
npm run build

# 3. 添加 Android 平台（首次）
npm run cap:add:android

# 4. 同步代码到 Android 项目
npm run cap:sync

# 5. 打开 Android Studio 构建（或命令行构建）
npm run cap:open
# 或者在 android 目录执行：
# ./gradlew assembleDebug    # Debug 版本
# ./gradlew assembleRelease  # Release 版本
```

构建完成后，APK 文件位于：
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### 自定义配置

如需修改 App 名称、图标或包名，编辑：
- `web/capacitor.config.json` - Capacitor 配置
- `web/android/app/src/main/res/` - Android 资源文件

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
- **移动端**: Capacitor (Android)
- **穿透**: FRP (Fast Reverse Proxy)
- **CI/CD**: GitHub Actions

## 📝 许可证

MIT License
