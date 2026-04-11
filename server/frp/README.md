# FRP 客户端集成目录

此目录用于存放 FRP 客户端可执行文件，实现内网穿透功能。

TaroTora 已集成 FRP 客户端自动管理功能，只需将 `frpc` 可执行文件放入此目录即可。

## 快速开始

### 方式一：自动下载（推荐）

运行下载脚本自动获取对应系统的 frpc：

```bash
cd server/frp
node download-frpc.js
```

### 方式二：手动下载

访问 https://github.com/fatedier/frp/releases 下载对应系统的 frpc 可执行文件：

**Windows (64位):**
- 下载 `frp_*_windows_amd64.zip`
- 解压后将 `frpc.exe` 复制到此目录

**Windows (32位):**
- 下载 `frp_*_windows_386.zip`
- 解压后将 `frpc.exe` 复制到此目录

**Linux:**
- 下载对应架构的压缩包
- 解压后将 `frpc` 复制到此目录并赋予执行权限：`chmod +x frpc`

### 2. 配置服务端

编辑 `.env` 文件：

```env
# 启用 FRP
FRP_ENABLED=true

# FRP 服务端配置
FRP_SERVER_HOST=你的frp服务器IP或域名
FRP_SERVER_PORT=7000
FRP_TOKEN=你的frp认证令牌

# 映射端口（公网服务器上开放的端口）
FRP_REMOTE_PORT=8300
```

### 3. 启动服务器

运行 `npm start`，FRP 会自动启动并将本地端口映射到公网。

## 目录结构

```
frp/
├── README.md       # 本说明文件
├── frpc.exe        # Windows 可执行文件
└── frpc            # Linux/macOS 可执行文件
```

## 注意事项

- 不要提交 frpc 可执行文件到 Git 仓库（已添加 .gitignore）
- 确保 frpc 版本与服务器端 frps 版本兼容
- 公网服务器需要开放相应的端口（FRP_SERVER_PORT 和 FRP_REMOTE_PORT）
