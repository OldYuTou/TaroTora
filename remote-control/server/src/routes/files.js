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
}});

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
      await fs.rmdir(resolvedPath, { recursive: true });
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
    const { oldPath, newName } = req.body;
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
    const { stdout } = await execPromise('wmic logicaldisk get name,size,freespace /format:csv');
    const lines = stdout.trim().split('\\n').slice(1); // 跳过标题
    
    const drives = [];
    for (const line of lines) {
      const parts = line.trim().split(',');
      if (parts.length >= 4) {
        drives.push({
          letter: parts[1],
          freeSpace: parseInt(parts[2]) || 0,
          totalSize: parseInt(parts[3]) || 0
        });
      }
    }
    
    res.json({ drives });
  } catch (error) {
    // Fallback: 返回常见盘符
    res.json({
      drives: ['C:', 'D:', 'E:'].map(letter => ({
        letter,
        freeSpace: 0,
        totalSize: 0
      }))
    });
  }
});

module.exports = router;
