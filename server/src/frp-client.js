/**
 * TaroTora - Remote Control System
 * Copyright (C) 2026 OldYuTou
 *
 * FRP 内网穿透客户端管理模块
 * 用于自动将本地服务映射到公网服务器
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class FrpClient {
  constructor() {
    this.frpcProcess = null;
    this.configPath = null;
    this.enabled = process.env.FRP_ENABLED === 'true';
    this.serverHost = process.env.FRP_SERVER_HOST;
    this.serverPort = parseInt(process.env.FRP_SERVER_PORT) || 7000;
    this.token = process.env.FRP_TOKEN;
    this.remotePort = parseInt(process.env.FRP_REMOTE_PORT) || 8300;
    this.tunnelName = process.env.FRP_TUNNEL_NAME || 'tarotora';
    this.localPort = parseInt(process.env.PORT) || 3000;

    // FRP 可执行文件路径（优先使用项目内置）
    this.frpcPath = this.getFrpcPath();
  }

  /**
   * 获取 frpc 可执行文件路径
   * 优先顺序：环境变量 > 项目内置 > 系统 PATH
   */
  getFrpcPath() {
    const platform = os.platform();

    // 1. 首先检查环境变量（最高优先级）
    if (process.env.FRPC_PATH) {
      return process.env.FRPC_PATH;
    }

    // 2. 检查项目内置的 frpc（集成目录）
    const builtinPaths = [
      path.join(__dirname, '..', 'frp', 'frpc.exe'),  // Windows
      path.join(__dirname, '..', 'frp', 'frpc'),      // Linux/macOS
    ];

    for (const p of builtinPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 3. 检查系统 PATH
    try {
      if (platform === 'win32') {
        execSync('where frpc', { stdio: 'ignore' });
        return 'frpc';
      } else {
        execSync('which frpc', { stdio: 'ignore' });
        return 'frpc';
      }
    } catch {
      return null;
    }
  }

  /**
   * 检查 FRP 是否可用
   */
  isAvailable() {
    if (!this.frpcPath) {
      return false;
    }

    try {
      if (this.frpcPath === 'frpc') {
        execSync('frpc --version', { stdio: 'ignore' });
      } else {
        execSync(`"${this.frpcPath}" --version`, { stdio: 'ignore' });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成 FRP 配置文件
   */
  generateConfig() {
    const config = `[common]
server_addr = ${this.serverHost}
server_port = ${this.serverPort}
token = ${this.token}

[${this.tunnelName}]
type = tcp
local_ip = 127.0.0.1
local_port = ${this.localPort}
remote_port = ${this.remotePort}
`;

    // 创建临时配置文件
    const tempDir = os.tmpdir();
    this.configPath = path.join(tempDir, `frpc_${Date.now()}.ini`);
    fs.writeFileSync(this.configPath, config, 'utf8');

    return this.configPath;
  }

  /**
   * 启动 FRP 客户端
   */
  async start() {
    if (!this.enabled) {
      console.log('📡 FRP: 未启用（设置 FRP_ENABLED=true 开启）');
      return { success: false, reason: 'disabled' };
    }

    if (!this.serverHost || this.serverHost === 'your-frp-server.com') {
      console.log('📡 FRP: 未配置服务端地址（请设置 FRP_SERVER_HOST）');
      return { success: false, reason: 'not_configured' };
    }

    if (!this.isAvailable()) {
      console.log('❌ FRP: 未找到 frpc 可执行文件');
      console.log('   请将 frpc 放到 server/frp/ 目录下，或设置 FRPC_PATH 环境变量');
      console.log('   下载地址: https://github.com/fatedier/frp/releases');
      console.log('   详细说明: server/frp/README.md');
      return { success: false, reason: 'not_found' };
    }

    // 生成配置文件
    this.generateConfig();

    // 启动 frpc
    const args = ['-c', this.configPath];

    console.log(`📡 FRP: 正在启动内网穿透...`);
    console.log(`   本地端口: ${this.localPort} → 远程 ${this.serverHost}:${this.remotePort}`);

    this.frpcProcess = spawn(this.frpcPath, args, {
      detached: false,
      windowsHide: true
    });

    return new Promise((resolve) => {
      let connected = false;
      let errorOutput = '';

      this.frpcProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('login to server success')) {
          connected = true;
          console.log('✅ FRP: 内网穿透连接成功！');
          console.log(`   公网访问地址: ${this.serverHost}:${this.remotePort}`);
          resolve({
            success: true,
            url: `${this.serverHost}:${this.remotePort}`,
            localPort: this.localPort,
            remotePort: this.remotePort
          });
        }
      });

      this.frpcProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      this.frpcProcess.on('close', (code) => {
        if (!connected) {
          console.error(`❌ FRP: 连接失败 (退出码 ${code})`);
          if (errorOutput) {
            console.error('   错误:', errorOutput.substring(0, 200));
          }
          this.cleanup();
          resolve({ success: false, reason: 'connection_failed', error: errorOutput });
        }
      });

      // 超时处理
      setTimeout(() => {
        if (!connected) {
          console.error('❌ FRP: 连接超时');
          this.stop();
          resolve({ success: false, reason: 'timeout' });
        }
      }, 30000);
    });
  }

  /**
   * 停止 FRP 客户端
   */
  stop() {
    if (this.frpcProcess) {
      this.frpcProcess.kill('SIGTERM');
      this.frpcProcess = null;
    }
    this.cleanup();
    console.log('📡 FRP: 已停止');
  }

  /**
   * 清理临时文件
   */
  cleanup() {
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        fs.unlinkSync(this.configPath);
      } catch (e) {
        // 忽略删除错误
      }
      this.configPath = null;
    }
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      enabled: this.enabled,
      available: this.isAvailable(),
      connected: this.frpcProcess !== null && !this.frpcProcess.killed,
      frpcPath: this.frpcPath,
      serverHost: this.serverHost,
      remotePort: this.remotePort,
      localPort: this.localPort
    };
  }
}

module.exports = FrpClient;
