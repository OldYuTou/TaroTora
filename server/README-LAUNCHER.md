# TaroTora 服务端启动器使用说明

## 快速启动

### 方式一：使用交互式启动器（推荐）

1. **双击运行** `TaroTora-Launcher.bat`

2. **首次运行配置**：
   ```
   服务端口 (默认: 3000): 3000
   访问令牌 (默认: xxxxxxxx): 你的自定义令牌
   
   是否启用 FRP 内网穿透？ (Y/n): n
   是否立即启动服务器？ (Y/n): Y
   ```

3. **完成！** 服务器将自动启动

### 方式二：使用传统方式

```bash
# 安装依赖
npm install

# 配置环境变量（编辑 .env 文件）
# 或者直接运行 start.bat

# 启动服务器
npm start
```

## 配置文件说明

配置文件 `.env` 位于 `server/` 目录下：

```env
# 基本配置
PORT=3000
AUTH_TOKEN=你的访问令牌

# FRP 内网穿透（可选）
FRP_ENABLED=false
FRP_SERVER_HOST=你的frp服务器
FRP_SERVER_PORT=7000
FRP_TOKEN=frp认证令牌
FRP_REMOTE_PORT=8300
```

## 目录结构

```
server/
├── TaroTora-Launcher.bat   # 交互式启动器（双击运行）
├── launcher.js             # 启动器脚本
├── start.bat               # 传统启动脚本
├── src/
│   └── index.js           # 主服务器
├── frp/
│   ├── frpc.exe           # FRP 客户端（可选）
│   └── download-frpc.js   # FRP 下载工具
└── .env                   # 配置文件（自动生成）
```

## 打包成独立可执行文件

如需创建不依赖 Node.js 的可执行文件：

### 方法 1：使用 pkg（需要联网）

```bash
# 安装打包工具
npm install -g pkg

# 打包成可执行文件
pkg launcher.js --targets node18-win-x64 --output TaroTora-Server.exe
```

### 方法 2：使用 nexe

```bash
npm install -g nexe
nexe launcher.js -o TaroTora-Server.exe
```

## 注意事项

1. **首次运行**会自动安装 npm 依赖
2. **端口号**如果 3000 被占用，可以选择其他端口
3. **访问令牌**建议设置复杂密码，用于客户端连接认证
4. **防火墙**可能需要允许 Node.js 通过防火墙

## 故障排除

### 提示 "未检测到 Node.js"

下载并安装 Node.js：
- https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi

### 提示 "安装依赖失败"

检查网络连接，或使用淘宝镜像：
```bash
npm config set registry https://registry.npmmirror.com
```

### 端口被占用

在配置时选择其他端口，如 3001、8080 等。
