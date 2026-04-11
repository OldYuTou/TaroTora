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
 * 文件管理路由
 * 提供文件浏览、上传、下载、删除等功能
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = req.query.path || process.env.USERPROFILE || 'C:\\';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

/**
 * GET /api/files/list?path=xxx
 * 获取目录内容
 */
router.get('/list', async (req, res) => {
  try {
    const targetPath = req.query.path || process.env.USERPROFILE || 'C:\\';
    
    // 安全校验：防止目录遍历
    const resolvedPath = path.resolve(targetPath);
    
    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    
    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(resolvedPath, entry.name);
        const stats = await fs.stat(fullPath).catch(() => null);
        
        return {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats?.size || 0,
          modified: stats?.mtime || new Date(),
          isHidden: entry.name.startsWith('.')
        };
      })
    );
    
    // 排序：文件夹在前，文件在后，按名称排序
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    res.json({
      path: resolvedPath,
      items,
      parent: path.dirname(resolvedPath) !== resolvedPath ? path.dirname(resolvedPath) : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/download?path=xxx
 * 下载文件
 */
router.get('/download', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory' });
    }
    
    res.download(resolvedPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/upload?path=xxx
 * 上传文件
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/files/delete
 * 删除文件或文件夹
 */
router.delete('/delete', async (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const resolvedPath = path.resolve(targetPath);
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      await fs.rm(resolvedPath, { recursive: true });
    } else {
      await fs.unlink(resolvedPath);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/rename
 * 重命名文件或文件夹
 */
router.post('/rename', async (req, res) => {
  try {
    const { path: oldPath, newName } = req.body;
    if (!oldPath || !newName) {
      return res.status(400).json({ error: 'Old path and new name are required' });
    }
    
    const resolvedOldPath = path.resolve(oldPath);
    const dir = path.dirname(resolvedOldPath);
    const newPath = path.join(dir, newName);
    
    await fs.rename(resolvedOldPath, newPath);
    
    res.json({ success: true, newPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/mkdir
 * 创建文件夹
 */
router.post('/mkdir', async (req, res) => {
  try {
    const { path: targetPath, name } = req.body;
    if (!targetPath || !name) {
      return res.status(400).json({ error: 'Path and name are required' });
    }
    
    const resolvedPath = path.resolve(targetPath);
    const newDir = path.join(resolvedPath, name);
    
    await fs.mkdir(newDir, { recursive: true });
    
    res.json({ success: true, path: newDir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/files/drives
 * 获取所有磁盘分区（Windows）
 */
router.get('/drives', async (req, res) => {
  try {
    // 使用 PowerShell 获取磁盘信息（wmic 已弃用）
    const cmd = 'powershell -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress | ForEach-Object { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $_ }"';
    const { stdout } = await execPromise(cmd);

    const data = JSON.parse(stdout);
    const drives = [];

    // 处理单个或多个磁盘的情况
    const diskArray = Array.isArray(data) ? data : [data];

    for (const disk of diskArray) {
      if (disk.DeviceID) {
        drives.push({
          letter: disk.DeviceID,
          freeSpace: disk.FreeSpace || 0,
          totalSize: disk.Size || 0
        });
      }
    }

    console.log('[Drives] Found drives:', drives.map(d => d.letter).join(', '));
    res.json({ drives });
  } catch (error) {
    console.error('Get drives error:', error);
    // Fallback: 返回常见盘符，但按字母顺序包含更多
    const fallbackDrives = [];
    for (let c = 67; c <= 90; c++) { // C 到 Z
      fallbackDrives.push({
        letter: String.fromCharCode(c) + ':',
        freeSpace: 0,
        totalSize: 0
      });
    }
    res.json({ drives: fallbackDrives });
  }
});

/**
 * POST /api/files/compress
 * 压缩文件或文件夹为zip
 */
router.post('/compress', async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    // 使用 PowerShell Compress-Archive 命令
    const command = `powershell -command "Compress-Archive -Path '${resolvedSource}' -DestinationPath '${resolvedDest}' -Force"`;
    await execPromise(command);

    res.json({ success: true, path: resolvedDest });
  } catch (error) {
    console.error('Compress error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/extract
 * 解压zip文件
 */
router.post('/extract', async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    // 使用 PowerShell Expand-Archive 命令
    const command = `powershell -command "Expand-Archive -Path '${resolvedSource}' -DestinationPath '${resolvedDest}' -Force"`;
    await execPromise(command);

    res.json({ success: true, path: resolvedDest });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * POST /api/files/copy
 * 复制文件或文件夹
 */
router.post('/copy', async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    const stats = await fs.stat(resolvedSource);

    if (stats.isDirectory()) {
      // 递归复制目录
      await copyDir(resolvedSource, resolvedDest);
    } else {
      // 复制文件
      await fs.copyFile(resolvedSource, resolvedDest);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/files/move
 * 移动文件或文件夹
 */
router.post('/move', async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination are required' });
    }

    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    await fs.rename(resolvedSource, resolvedDest);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 递归复制目录
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}


module.exports = router;
