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
 * 远程控制被控端主入口
 * 提供文件管理、进程管理、Web终端功能
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const fileRoutes = require('./routes/files');
const processRoutes = require('./routes/processes');
const systemRoutes = require('./routes/system');
const terminalSocket = require('./routes/terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'default-token';

// 中间件
app.use(cors());
app.use(express.json());

// 简单 Token 验证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// 路由
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/processes', authMiddleware, processRoutes);
app.use('/api/system', authMiddleware, systemRoutes);

// 静态文件服务（前端页面）
const webDistPath = path.join(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// 健康检查（需要认证）
app.get('/health', authMiddleware, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 所有其他路由返回 index.html（支持前端路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// WebSocket 终端
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 验证 Token
  socket.on('auth', (token) => {
    if (token !== AUTH_TOKEN) {
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }
    socket.emit('auth', 'success');
    terminalSocket(socket);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Remote Control Server running on port ${PORT}`);
  console.log(`📁 File manager: http://localhost:${PORT}/api/files`);
  console.log(`🖥️  Process manager: http://localhost:${PORT}/api/processes`);
});

module.exports = { app, server, io };
