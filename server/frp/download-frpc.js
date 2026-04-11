/**
 * FRP 客户端下载脚本
 * 自动下载对应系统的 frpc 可执行文件
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const VERSION = '0.61.2'; // FRP 版本
const TEMP_DIR = os.tmpdir();

function getDownloadUrl() {
  const platform = os.platform();
  const arch = os.arch();

  let platformName;
  let archName;

  // 平台映射
  switch (platform) {
    case 'win32':
      platformName = 'windows';
      break;
    case 'darwin':
      platformName = 'darwin';
      break;
    case 'linux':
      platformName = 'linux';
      break;
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }

  // 架构映射
  switch (arch) {
    case 'x64':
      archName = 'amd64';
      break;
    case 'ia32':
      archName = '386';
      break;
    case 'arm64':
      archName = 'arm64';
      break;
    case 'arm':
      archName = 'arm';
      break;
    default:
      throw new Error(`不支持的架构: ${arch}`);
  }

  const filename = `frp_${VERSION}_${platformName}_${archName}`;
  const extension = platform === 'win32' ? '.zip' : '.tar.gz';

  return {
    url: `https://github.com/fatedier/frp/releases/download/v${VERSION}/${filename}${extension}`,
    filename: `${filename}${extension}`,
    binaryName: platform === 'win32' ? 'frpc.exe' : 'frpc'
  };
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`正在下载: ${url}`);

    const file = fs.createWriteStream(dest);
    https.get(url, { followRedirect: true }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // 处理重定向
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r下载进度: ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        process.stdout.write('\n');
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function extractArchive(archivePath, destDir, binaryName) {
  const platform = os.platform();

  console.log(`正在解压: ${path.basename(archivePath)}`);

  if (platform === 'win32') {
    // Windows: 使用 PowerShell 解压
    try {
      execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`, {
        stdio: 'inherit'
      });
    } catch (error) {
      console.log('尝试使用 tar 解压...');
      execSync(`tar -xf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
    }
  } else {
    // Linux/macOS: 使用 tar
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
  }

  // 查找解压后的目录
  const extractedDir = fs.readdirSync(destDir).find(d => d.startsWith('frp_'));
  if (!extractedDir) {
    throw new Error('解压后未找到 frp 目录');
  }

  const sourcePath = path.join(destDir, extractedDir, binaryName);
  const targetPath = path.join(__dirname, binaryName);

  // 移动文件
  fs.copyFileSync(sourcePath, targetPath);

  // 非 Windows 系统添加执行权限
  if (platform !== 'win32') {
    fs.chmodSync(targetPath, 0o755);
  }

  // 清理临时文件
  fs.rmSync(path.join(destDir, extractedDir), { recursive: true, force: true });
  fs.unlinkSync(archivePath);
}

async function main() {
  console.log('=== FRP 客户端下载工具 ===\n');

  try {
    const { url, filename, binaryName } = getDownloadUrl();
    const archivePath = path.join(TEMP_DIR, filename);

    // 检查是否已存在
    const targetPath = path.join(__dirname, binaryName);
    if (fs.existsSync(targetPath)) {
      console.log(`✅ ${binaryName} 已存在，无需下载`);
      console.log(`   位置: ${targetPath}`);
      console.log('\n如需重新下载，请先删除现有文件');
      return;
    }

    // 下载
    await downloadFile(url, archivePath);
    console.log('✅ 下载完成\n');

    // 解压
    extractArchive(archivePath, TEMP_DIR, binaryName);
    console.log('✅ 解压完成\n');

    // 验证
    const version = execSync(`"${targetPath}" --version`, { encoding: 'utf8' }).trim();
    console.log(`✅ ${binaryName} 安装成功`);
    console.log(`   版本: ${version}`);
    console.log(`   位置: ${targetPath}\n`);
    console.log('现在你可以启动服务器并启用 FRP 内网穿透功能了！');
    console.log('配置说明: server/frp/README.md');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.log('\n如果自动下载失败，请手动下载：');
    console.log('https://github.com/fatedier/frp/releases');
    process.exit(1);
  }
}

main();
