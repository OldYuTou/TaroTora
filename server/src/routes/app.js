/**
 * TaroTora - Remote Control System
 * Copyright (C) 2026 OldYuTou
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * App 更新管理路由
 * 提供 APK 版本检查和下载功能
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// APK 存储目录
const APK_DIR = path.join(__dirname, '../../apk');
// 版本信息文件
const VERSION_FILE = path.join(APK_DIR, 'version.json');

// 默认版本信息
const defaultVersionInfo = {
  version: '1.0.0',
  versionCode: 1,
  filename: 'TaroTora.apk',
  updateUrl: '',
  changelog: '',
  forceUpdate: false,
  updatedAt: new Date().toISOString()
};

/**
 * 确保 APK 目录和版本文件存在
 */
async function ensureApkDirectory() {
  try {
    await fs.mkdir(APK_DIR, { recursive: true });
    try {
      await fs.access(VERSION_FILE);
    } catch {
      await fs.writeFile(VERSION_FILE, JSON.stringify(defaultVersionInfo, null, 2));
    }
  } catch (error) {
    console.error('Failed to create APK directory:', error);
  }
}

/**
 * 读取版本信息
 */
async function readVersionInfo() {
  try {
    await ensureApkDirectory();
    const data = await fs.readFile(VERSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read version info:', error);
    return defaultVersionInfo;
  }
}

/**
 * 保存版本信息
 */
async function saveVersionInfo(info) {
  try {
    await ensureApkDirectory();
    await fs.writeFile(VERSION_FILE, JSON.stringify(info, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save version info:', error);
    return false;
  }
}

/**
 * GET /api/app/version
 * 获取最新版本信息
 */
router.get('/version', async (req, res) => {
  try {
    const versionInfo = await readVersionInfo();

    // 检查 APK 文件是否存在
    const apkPath = path.join(APK_DIR, versionInfo.filename);
    let fileExists = false;
    let fileSize = 0;

    try {
      const stats = await fs.stat(apkPath);
      fileExists = stats.isFile();
      fileSize = stats.size;
    } catch {
      fileExists = false;
    }

    res.json({
      version: versionInfo.version,
      versionCode: versionInfo.versionCode,
      changelog: versionInfo.changelog,
      forceUpdate: versionInfo.forceUpdate,
      updatedAt: versionInfo.updatedAt,
      fileExists,
      fileSize,
      downloadUrl: fileExists ? '/api/app/download' : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/app/download
 * 下载最新 APK 文件
 */
router.get('/download', async (req, res) => {
  try {
    const versionInfo = await readVersionInfo();
    const apkPath = path.join(APK_DIR, versionInfo.filename);

    // 检查文件是否存在
    try {
      await fs.access(apkPath);
    } catch {
      return res.status(404).json({ error: 'APK file not found' });
    }

    const stats = await fs.stat(apkPath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'APK file not found' });
    }

    // 设置下载响应头
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${versionInfo.filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-App-Version', versionInfo.version);
    res.setHeader('X-App-Version-Code', versionInfo.versionCode.toString());

    // 使用流式传输
    const fileStream = fsSync.createReadStream(apkPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('APK download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download APK file' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/app/version
 * 更新版本信息（管理接口）
 */
router.post('/version', async (req, res) => {
  try {
    const { version, versionCode, changelog, forceUpdate } = req.body;

    if (!version || !versionCode) {
      return res.status(400).json({ error: 'Version and versionCode are required' });
    }

    const versionInfo = await readVersionInfo();

    // 更新版本信息
    versionInfo.version = version;
    versionInfo.versionCode = parseInt(versionCode);
    if (changelog !== undefined) versionInfo.changelog = changelog;
    if (forceUpdate !== undefined) versionInfo.forceUpdate = forceUpdate;
    versionInfo.updatedAt = new Date().toISOString();

    const saved = await saveVersionInfo(versionInfo);

    if (saved) {
      res.json({
        success: true,
        message: 'Version info updated successfully',
        versionInfo
      });
    } else {
      res.status(500).json({ error: 'Failed to save version info' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/app/upload
 * 上传新版本 APK（管理接口）
 */
router.post('/upload', async (req, res) => {
  try {
    // 检查是否有文件上传
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Multipart form data required' });
    }

    const Busboy = require('busboy');
    const busboy = Busboy({ headers: req.headers });

    let versionInfo = null;
    let fileSaved = false;

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'versionInfo') {
        try {
          versionInfo = JSON.parse(value);
        } catch {
          versionInfo = null;
        }
      }
    });

    busboy.on('file', async (fieldname, file, info) => {
      if (fieldname !== 'apk') {
        file.resume();
        return;
      }

      await ensureApkDirectory();

      const filename = versionInfo?.filename || 'TaroTora.apk';
      const savePath = path.join(APK_DIR, filename);

      // 如果文件已存在，先删除
      try {
        await fs.access(savePath);
        await fs.unlink(savePath);
      } catch {
        // 文件不存在，忽略错误
      }

      const writeStream = fsSync.createWriteStream(savePath);
      file.pipe(writeStream);

      writeStream.on('finish', async () => {
        fileSaved = true;

        // 更新版本信息
        if (versionInfo) {
          const currentInfo = await readVersionInfo();
          const newInfo = {
            ...currentInfo,
            ...versionInfo,
            filename,
            updatedAt: new Date().toISOString()
          };
          await saveVersionInfo(newInfo);
        }

        res.json({
          success: true,
          message: 'APK uploaded successfully',
          filename
        });
      });

      writeStream.on('error', (error) => {
        console.error('Failed to save APK:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to save APK file' });
        }
      });
    });

    busboy.on('error', (error) => {
      console.error('Upload error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload failed' });
      }
    });

    req.pipe(busboy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/app/info
 * 获取当前存储的 APK 信息（管理接口）
 */
router.get('/info', async (req, res) => {
  try {
    const versionInfo = await readVersionInfo();
    const apkPath = path.join(APK_DIR, versionInfo.filename);

    let fileStats = null;
    try {
      const stats = await fs.stat(apkPath);
      fileStats = {
        exists: true,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        modifiedAt: stats.mtime
      };
    } catch {
      fileStats = { exists: false };
    }

    res.json({
      ...versionInfo,
      file: fileStats,
      storagePath: APK_DIR
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
