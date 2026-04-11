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
const appRoutes = require('./routes/app');
const terminalSocket = require('./routes/terminal');
const FrpClient = require('./frp-client');

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

// FRP 客户端实例
const frpClient = new FrpClient();

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

// API 路由
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/processes', authMiddleware, processRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/app', authMiddleware, appRoutes);

// 健康检查（需要认证）
app.get('/health', authMiddleware, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// FRP 内网穿透 API
app.get('/api/frp/status', authMiddleware, (req, res) => {
  res.json(frpClient.getStatus());
});

app.post('/api/frp/start', authMiddleware, async (req, res) => {
  const result = await frpClient.start();
  if (result.success) {
    res.json({ success: true, url: result.url, message: 'FRP 启动成功' });
  } else {
    res.status(400).json({ success: false, message: result.reason });
  }
});

app.post('/api/frp/stop', authMiddleware, (req, res) => {
  frpClient.stop();
  res.json({ success: true, message: 'FRP 已停止' });
});

// 静态文件服务（前端页面）
const webDistPath = path.join(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// 所有其他路由返回 index.html（支持前端路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// 存储已认证的客户端
const connectedClients = new Map();

// WebSocket 终端
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 立即绑定终端事件（无论是否认证）
  terminalSocket(socket);

  // 验证 Token
  socket.on('auth', (token) => {
    if (token !== AUTH_TOKEN) {
      socket.emit('error', 'Authentication failed');
      socket.disconnect();
      return;
    }
    socket.emit('auth', 'success');

    // 保存客户端信息
    connectedClients.set(socket.id, {
      socket: socket,
      connectedAt: new Date()
    });

    // 发送欢迎消息
    socket.emit('notification', {
      type: 'success',
      title: '连接成功',
      message: '已连接到远程控制服务器',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket.id);
  });
});

// 添加 HTTP API 用于向客户端推送消息
app.post('/api/notify', authMiddleware, (req, res) => {
  const { title, message, type = 'info' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const notification = {
    type,
    title,
    message,
    timestamp: new Date().toISOString()
  };

  // 向所有连接的客户端广播消息
  let sentCount = 0;
  connectedClients.forEach((client, socketId) => {
    try {
      client.socket.emit('notification', notification);
      sentCount++;
    } catch (error) {
      console.error(`Failed to send notification to ${socketId}:`, error);
    }
  });

  res.json({
    success: true,
    sentCount,
    message: `Notification sent to ${sentCount} client(s)`
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Remote Control Server running on port ${PORT}`);
  console.log(`📁 File manager: http://localhost:${PORT}/api/files`);
  console.log(`🖥️  Process manager: http://localhost:${PORT}/api/processes`);

  // 启动 FRP 内网穿透
  frpClient.start().then(result => {
    if (result.success) {
      console.log(`🌐 公网访问: http://${result.url}`);
    }
  });
});

// 进程退出时清理
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  frpClient.stop();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  frpClient.stop();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, io, frpClient };
