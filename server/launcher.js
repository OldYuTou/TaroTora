/**
 * TaroTora - Remote Control System Launcher
 * Copyright (C) 2026 OldYuTou
 *
 * 交互式启动器 - 自动配置并启动服务器
 *
 * 用法:
 *   node launcher.js              # 交互式配置
 *   node launcher.js --quick      # 使用现有配置快速启动
 *   node launcher.js --config     # 仅生成配置不启动
 *
 * 环境变量快速配置:
 *   PORT=8080 AUTH_TOKEN=mypassword node launcher.js --quick
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const CONFIG_FILE = path.join(__dirname, '.env');

// 生成随机令牌
function generateRandomToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 默认配置
const DEFAULT_CONFIG = {
  PORT: '3000',
  AUTH_TOKEN: generateRandomToken(),
  FRP_ENABLED: 'false',
  FRP_SERVER_HOST: '',
  FRP_SERVER_PORT: '7000',
  FRP_TOKEN: '',
  FRP_REMOTE_PORT: '8300',
  FRP_TUNNEL_NAME: 'tarotora'
};

// 读取当前配置
function loadConfig() {
  const config = { ...DEFAULT_CONFIG };

  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^([A-Za-z_]+)=(.*)$/);
      if (match) {
        config[match[1]] = match[2].trim();
      }
    }
  }

  return config;
}

// 保存配置
function saveConfig(config) {
  const lines = [];
  lines.push('# TaroTora 服务端配置');
  lines.push('# 生成时间: ' + new Date().toISOString());
  lines.push('');
  lines.push('# 基本配置');
  lines.push(`PORT=${config.PORT}`);
  lines.push(`AUTH_TOKEN=${config.AUTH_TOKEN}`);
  lines.push('');
  lines.push('# FRP 内网穿透配置');
  lines.push(`FRP_ENABLED=${config.FRP_ENABLED}`);
  if (config.FRP_ENABLED === 'true') {
    lines.push(`FRP_SERVER_HOST=${config.FRP_SERVER_HOST}`);
    lines.push(`FRP_SERVER_PORT=${config.FRP_SERVER_PORT}`);
    lines.push(`FRP_TOKEN=${config.FRP_TOKEN}`);
    lines.push(`FRP_REMOTE_PORT=${config.FRP_REMOTE_PORT}`);
    lines.push(`FRP_TUNNEL_NAME=${config.FRP_TUNNEL_NAME || 'tarotora'}`);
  }

  fs.writeFileSync(CONFIG_FILE, lines.join('\n'), 'utf8');
}

// 显示标题
function showHeader() {
  console.log('\x1Bc');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║        TaroTora Remote Control System                  ║');
  console.log('║              远程控制服务端启动器                       ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log();
}

// 显示配置摘要
function showConfigSummary(config) {
  console.log('┌────────────────────────────────────────────────────────┐');
  console.log('│  当前配置                                              │');
  console.log('├────────────────────────────────────────────────────────┤');
  console.log(`│  服务端口: ${config.PORT.padEnd(42)}│`);
  console.log(`│  访问令牌: ${config.AUTH_TOKEN.substring(0, 20).padEnd(42)}│`);
  console.log('├────────────────────────────────────────────────────────┤');

  if (config.FRP_ENABLED === 'true') {
    console.log('│  FRP 内网穿透: 已启用                                  │');
    console.log(`│  服务端地址: ${(config.FRP_SERVER_HOST || '').padEnd(40)}│`);
    console.log(`│  远程映射端口: ${(config.FRP_REMOTE_PORT || '').padEnd(40)}│`);
  } else {
    console.log('│  FRP 内网穿透: 未启用                                  │');
  }

  console.log('└────────────────────────────────────────────────────────┘');
  console.log();
}

// 单个问题询问
function ask(rl, question, defaultValue = '') {
  return new Promise(resolve => {
    const prompt = defaultValue
      ? `${question} (默认: ${defaultValue}): `
      : `${question}: `;
    rl.question(prompt, answer => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// 询问是/否
function askYesNo(rl, question, defaultYes = true) {
  return new Promise(resolve => {
    const defaultText = defaultYes ? 'Y/n' : 'y/N';
    rl.question(`${question} (${defaultText}): `, answer => {
      const a = answer.trim().toLowerCase();
      if (a === '') {
        resolve(defaultYes);
      } else {
        resolve(a === 'y' || a === 'yes');
      }
    });
  });
}

// 交互式配置
async function interactiveConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const config = loadConfig();
  showHeader();

  const hasExistingConfig = fs.existsSync(CONFIG_FILE);

  if (hasExistingConfig) {
    console.log('检测到已有配置文件。\n');
    showConfigSummary(config);

    const useExisting = await askYesNo(rl, '是否使用现有配置启动', true);

    if (useExisting) {
      rl.close();
      return { config, shouldStart: true };
    }
    console.log('\n让我们重新配置...\n');
  }

  // 基本配置
  console.log('【基本配置】\n');

  config.PORT = await ask(rl, '服务端口', config.PORT);
  config.AUTH_TOKEN = await ask(rl, '访问令牌', config.AUTH_TOKEN);

  // FRP 配置
  console.log('\n【FRP 内网穿透配置】');
  console.log('如需从外网访问，请配置 FRP（需要自备 FRP 服务器）\n');

  const enableFrp = await askYesNo(rl, '是否启用 FRP 内网穿透', false);

  if (enableFrp) {
    config.FRP_ENABLED = 'true';
    config.FRP_SERVER_HOST = await ask(rl, 'FRP 服务端地址', config.FRP_SERVER_HOST);
    config.FRP_SERVER_PORT = await ask(rl, 'FRP 服务端端口', config.FRP_SERVER_PORT);
    config.FRP_TOKEN = await ask(rl, 'FRP 认证令牌', config.FRP_TOKEN);
    config.FRP_REMOTE_PORT = await ask(rl, '远程映射端口', config.FRP_REMOTE_PORT);
  } else {
    config.FRP_ENABLED = 'false';
  }

  saveConfig(config);
  console.log('\n✅ 配置已保存！\n');
  showConfigSummary(config);

  const startNow = await askYesNo(rl, '是否立即启动服务器', true);

  rl.close();
  return { config, shouldStart: startNow };
}

// 快速启动（使用现有配置或环境变量）
function quickStart() {
  const config = loadConfig();

  // 环境变量覆盖
  if (process.env.PORT) config.PORT = process.env.PORT;
  if (process.env.AUTH_TOKEN) config.AUTH_TOKEN = process.env.AUTH_TOKEN;
  if (process.env.FRP_ENABLED) config.FRP_ENABLED = process.env.FRP_ENABLED;
  if (process.env.FRP_SERVER_HOST) config.FRP_SERVER_HOST = process.env.FRP_SERVER_HOST;
  if (process.env.FRP_REMOTE_PORT) config.FRP_REMOTE_PORT = process.env.FRP_REMOTE_PORT;

  saveConfig(config);

  console.log('快速启动模式');
  showConfigSummary(config);

  return config;
}

// 启动服务器
function startServer() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                  正在启动服务器...                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const serverPath = path.join(__dirname, 'src', 'index.js');

  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: __dirname,
    env: process.env
  });

  serverProcess.on('close', code => {
    console.log(`\n服务器已退出 (退出码: ${code})`);
    console.log('\n按任意键关闭窗口...');
    process.stdin.once('data', () => {
      process.exit(code);
    });
  });

  serverProcess.on('error', err => {
    console.error('\n启动服务器失败:', err.message);
    console.log('\n请确保已安装 Node.js 并运行 npm install');
    console.log('按任意键关闭窗口...');
    process.stdin.once('data', () => {
      process.exit(1);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n\n正在关闭服务器...');
    serverProcess.kill('SIGINT');
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  // 快速模式
  if (args.includes('--quick') || args.includes('-q')) {
    quickStart();
    startServer();
    return;
  }

  // 仅配置模式
  if (args.includes('--config') || args.includes('-c')) {
    const { config, shouldStart } = await interactiveConfig();
    if (!shouldStart) {
      console.log('\n配置完成。下次运行 launcher.js --quick 快速启动。');
    }
    return;
  }

  // 交互式模式（默认）
  const { config, shouldStart } = await interactiveConfig();

  if (shouldStart) {
    startServer();
  } else {
    console.log('\n服务器未启动。');
    console.log('运行 launcher.js --quick 使用当前配置启动。\n');
    process.exit(0);
  }
}

// 运行
main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
