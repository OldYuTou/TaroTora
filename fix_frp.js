const fs = require('fs');
const code = `const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class FrpClient {
  constructor() {
    this.frpcProcess = null;
    this.enabled = process.env.FRP_ENABLED === 'true';
    this.serverHost = process.env.FRP_SERVER_HOST;
    this.serverPort = parseInt(process.env.FRP_SERVER_PORT) || 7000;
    this.token = process.env.FRP_TOKEN;
    this.remotePort = parseInt(process.env.FRP_REMOTE_PORT) || 8300;
    this.tunnelName = process.env.FRP_TUNNEL_NAME || 'tarotora';
    this.localPort = parseInt(process.env.PORT) || 3000;
    this.frpcPath = this.getFrpcPath();
  }

  getFrpcPath() {
    if (process.env.FRPC_PATH) return process.env.FRPC_PATH;
    const builtinPaths = [
      path.join(__dirname, '..', 'frp', 'frpc.exe'),
      path.join(__dirname, '..', 'frp', 'frpc'),
    ];
    for (const p of builtinPaths) {
      if (fs.existsSync(p)) return p;
    }
    try {
      if (os.platform() === 'win32') {
        execSync('where frpc', { stdio: 'ignore' });
        return 'frpc';
      } else {
        execSync('which frpc', { stdio: 'ignore' });
        return 'frpc';
      }
    } catch { return null; }
  }

  isAvailable() {
    if (!this.frpcPath) return false;
    try {
      const cmd = this.frpcPath === 'frpc' ? 'frpc --version' : \`"\${this.frpcPath}" --version\`;
      execSync(cmd, { stdio: 'ignore' });
      return true;
    } catch { return false; }
  }

  async start() {
    if (!this.enabled) {
      console.log('📡 FRP: 未启用');
      return { success: false, reason: 'disabled' };
    }
    if (!this.serverHost || this.serverHost === 'your-frp-server.com') {
      console.log('📡 FRP: 未配置服务端地址');
      return { success: false, reason: 'not_configured' };
    }
    if (!this.isAvailable()) {
      console.log('❌ FRP: 未找到 frpc');
      return { success: false, reason: 'not_found' };
    }

    const args = [
      'tcp',
      \`--server_addr=\${this.serverHost}:\${this.serverPort}\`,
      \`--token=\${this.token}\`,
      \`--proxy_name=\${this.tunnelName}\`,
      '--local_ip=127.0.0.1',
      \`--local_port=\${this.localPort}\`,
      \`--remote_port=\${this.remotePort}\`
    ];

    console.log(\`📡 FRP: 正在启动...\`);
    console.log(\`   \${this.localPort} → \${this.serverHost}:\${this.remotePort}\`);

    this.frpcProcess = spawn(this.frpcPath, args, { detached: false, windowsHide: true });

    return new Promise((resolve) => {
      let connected = false;
      let errorOutput = '';

      this.frpcProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('login to server success')) {
          connected = true;
          console.log('✅ FRP: 连接成功！');
          resolve({ success: true, url: \`\${this.serverHost}:\${this.remotePort}\` });
        }
      });

      this.frpcProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

      this.frpcProcess.on('close', (code) => {
        if (!connected) {
          console.error(\`❌ FRP: 失败 (码 \${code})\`);
          if (errorOutput) console.error('   ', errorOutput.substring(0, 200));
          resolve({ success: false, reason: 'connection_failed', error: errorOutput });
        }
      });

      setTimeout(() => {
        if (!connected) {
          console.error('❌ FRP: 超时');
          this.stop();
          resolve({ success: false, reason: 'timeout' });
        }
      }, 30000);
    });
  }

  stop() {
    if (this.frpcProcess) {
      this.frpcProcess.kill('SIGTERM');
      this.frpcProcess = null;
    }
    console.log('📡 FRP: 已停止');
  }
}

module.exports = FrpClient;
`;

fs.writeFileSync('F:/studying/ytf/TaroTora/server/src/frp-client.js', code);
console.log('FRP client updated');
