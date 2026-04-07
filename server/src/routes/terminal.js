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
 * WebSocket 终端处理
 * 提供远程命令行功能
 */

const pty = require('node-pty');
const os = require('os');

// 存储所有 PTY 会话
const sessions = new Map();

/**
 * 初始化终端 Socket 处理
 * @param {Socket} socket - Socket.IO 连接
 */
function terminalSocket(socket) {
  let ptyProcess = null;
  
  // 创建新终端会话
  socket.on('terminal:create', (options = {}) => {
    try {
      // 如果已有会话，先关闭
      if (ptyProcess) {
        ptyProcess.kill();
      }
      
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const cwd = options.cwd || os.homedir();
      
      // 创建 PTY 进程
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: cwd,
        env: process.env,
        useConpty: process.platform === 'win32'
      });
      
      // 存储会话
      sessions.set(socket.id, ptyProcess);
      
      // 转发 PTY 输出到客户端
      ptyProcess.onData((data) => {
        socket.emit('terminal:data', data);
      });
      
      // 处理 PTY 退出
      ptyProcess.onExit(({ exitCode, signal }) => {
        socket.emit('terminal:exit', { exitCode, signal });
        sessions.delete(socket.id);
        ptyProcess = null;
      });
      
      // 通知客户端终端已就绪
      socket.emit('terminal:created', {
        pid: ptyProcess.pid,
        shell: shell,
        cwd: cwd
      });
      
      console.log(`Terminal created for ${socket.id}, PID: ${ptyProcess.pid}`);
    } catch (error) {
      socket.emit('terminal:error', error.message);
    }
  });
  
  // 接收客户端输入
  socket.on('terminal:input', (data) => {
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });
  
  // 调整终端大小
  socket.on('terminal:resize', ({ cols, rows }) => {
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  });
  
  // 关闭终端
  socket.on('terminal:close', () => {
    if (ptyProcess) {
      ptyProcess.kill();
      sessions.delete(socket.id);
      ptyProcess = null;
      socket.emit('terminal:closed');
    }
  });
  
  // 断开连接时清理
  socket.on('disconnect', () => {
    if (ptyProcess) {
      ptyProcess.kill();
      sessions.delete(socket.id);
    }
  });
}

module.exports = terminalSocket;
