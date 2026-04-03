const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STL_DIR = path.join(__dirname, 'stl');

// 确保 STL 目录存在
if (!fs.existsSync(STL_DIR)) {
  fs.mkdirSync(STL_DIR, { recursive: true });
}

// 静态文件服务
app.use(express.static('public'));
app.use('/stl', express.static(STL_DIR));

// API：获取 STL 文件列表
app.get('/api/stl-files', (req, res) => {
  try {
    const files = fs.readdirSync(STL_DIR)
      .filter(file => file.toLowerCase().endsWith('.stl'))
      .map(file => {
        const filePath = path.join(STL_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: `/stl/${file}`,
          size: stats.size,
          mtime: stats.mtime.getTime(),
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // 按修改时间倒序，最新的在前

    res.json({
      success: true,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('读取 STL 目录失败:', error);
    res.status(500).json({
      success: false,
      error: '读取文件列表失败'
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`STL Viewer 服务器运行在 http://localhost:${PORT}`);
  console.log(`STL 文件目录: ${STL_DIR}`);
});
