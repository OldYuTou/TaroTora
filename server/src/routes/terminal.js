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
 * 支持持久化终端会话 - 断开后终端继续运行，可重新连接
 */

const pty = require('node-pty');
const fs = require('fs');
const os = require('os');

// 存储所有持久化终端会话 - key: terminalId
const persistentSessions = new Map();

// 存储 socket 与终端的映射关系 - key: socket.id, value: Set<terminalId>
const socketTerminals = new Map();

const MAX_OUTPUT_BUFFER_SIZE = 10 * 1024 * 1024;
const TERMINAL_REMINDER_IDLE_MS = 5 * 1000;
let terminalReminderSequence = 0;

// 自动清理已禁用 - 终端会一直保持运行直到用户手动关闭
// 不再清理无连接的终端，用户需要通过 terminal-close 主动关闭

function normalizeTerminalSize(cols, rows) {
  return {
    cols: Math.max(20, Math.min(300, Math.floor(Number(cols) || 80))),
    rows: Math.max(8, Math.min(200, Math.floor(Number(rows) || 24)))
  };
}

function resizeTerminalProcess(ptyProcess, cols, rows) {
  const size = normalizeTerminalSize(cols, rows);
  ptyProcess.resize(size.cols, size.rows);
  return size;
}

function appendOutputBuffer(session, data) {
  session.outputBuffer.push(data);
  session.outputBufferSize += Buffer.byteLength(data, 'utf8');

  while (session.outputBufferSize > MAX_OUTPUT_BUFFER_SIZE && session.outputBuffer.length > 0) {
    session.outputBufferSize -= Buffer.byteLength(session.outputBuffer.shift(), 'utf8');
  }
}

function getTerminalNameFromCwd(cwd) {
  if (!cwd) return '终端';
  const normalized = String(cwd).replace(/[\\/]+$/, '');
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) || normalized || '终端';
}

function resolveTerminalDisplayName(name, cwd) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  return trimmedName || getTerminalNameFromCwd(cwd);
}

function clearTerminalReminderTimer(session) {
  if (session?.reminderIdleTimer) {
    clearTimeout(session.reminderIdleTimer);
    session.reminderIdleTimer = null;
  }
}

function clearPendingTerminalReminder(session) {
  if (session) {
    session.pendingReminder = null;
  }
}

function buildPendingTerminalReminder(session) {
  terminalReminderSequence += 1;
  return {
    reminderId: `${session.id}:${terminalReminderSequence}`,
    terminalId: session.id,
    cwd: session.cwd,
    name: session.displayName,
    quietMs: TERMINAL_REMINDER_IDLE_MS,
    readyAt: Date.now()
  };
}

function getTerminalReminderState() {
  let enabledCount = 0;
  let pendingCount = 0;

  persistentSessions.forEach((session) => {
    if (session.reminderEnabled) {
      enabledCount += 1;
    }
    if (session.pendingReminder) {
      pendingCount += 1;
    }
  });

  return {
    enabledCount,
    pendingCount,
    hasEnabledReminders: enabledCount > 0
  };
}

function pullPendingTerminalReminders() {
  const reminders = [];

  persistentSessions.forEach((session) => {
    if (!session.pendingReminder) return;
    reminders.push({ ...session.pendingReminder });
    clearPendingTerminalReminder(session);
  });

  reminders.sort((a, b) => a.readyAt - b.readyAt);

  return {
    reminders,
    monitoring: getTerminalReminderState()
  };
}

function acknowledgePendingTerminalReminder({ reminderId, terminalId } = {}) {
  let consumed = false;

  persistentSessions.forEach((session) => {
    if (!session.pendingReminder) return;

    const matchesReminderId = reminderId && session.pendingReminder.reminderId === reminderId;
    const matchesTerminalId = !reminderId && terminalId && session.id === terminalId;

    if (matchesReminderId || matchesTerminalId) {
      clearPendingTerminalReminder(session);
      consumed = true;
    }
  });

  return {
    consumed,
    monitoring: getTerminalReminderState()
  };
}

function emitToTerminalConnections(namespace, session, eventName, data) {
  session.connections.forEach(socketId => {
    const clientSocket = namespace.sockets.get(socketId);
    if (clientSocket) {
      clientSocket.emit(eventName, data);
    }
  });
}

function scheduleTerminalReminder(namespace, session) {
  if (!session.hasUserMessage) return;

  clearTerminalReminderTimer(session);
  const lastOutputAt = session.lastOutputAt;

  session.reminderIdleTimer = setTimeout(() => {
    if (!session.hasUserMessage || session.lastOutputAt !== lastOutputAt) {
      return;
    }

    session.hasUserMessage = false;
    session.reminderIdleTimer = null;

    if (session.reminderEnabled) {
      session.pendingReminder = buildPendingTerminalReminder(session);
      emitToTerminalConnections(namespace, session, 'terminal-reminder-ready', {
        ...session.pendingReminder
      });
    }
  }, TERMINAL_REMINDER_IDLE_MS);
}

/**
 * 创建或恢复终端会话
 * @param {Socket} socket - Socket.IO 连接
 * @param {string} terminalId - 终端 ID
 * @param {Object} options - 终端选项
 */
async function createOrResumeTerminal(socket, terminalId, options = {}) {
  const { cwd, cols = 80, rows = 24, name } = options;
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const size = normalizeTerminalSize(cols, rows);

  // 检查路径是否存在，不存在则使用 home 目录
  console.log(`[Terminal] createOrResumeTerminal called with cwd: "${cwd}"`);
  let workingDir = cwd || os.homedir();
  console.log(`[Terminal] Using workingDir: "${workingDir}"`);
  if (cwd) {
    try {
      fs.accessSync(cwd, fs.constants.F_OK);
    } catch (err) {
      console.log(`[Terminal] Path not found: ${cwd}, falling back to home directory`);
      workingDir = os.homedir();
    }
  }

  // 检查是否已存在该终端
  const existingSession = persistentSessions.get(terminalId);

  if (existingSession) {
    console.log(`[Terminal] Resuming existing terminal: ${terminalId}, PID: ${existingSession.process.pid}`);
    resizeTerminalProcess(existingSession.process, size.cols, size.rows);
    existingSession.displayName = resolveTerminalDisplayName(name || existingSession.displayName, existingSession.cwd);

    // 添加新的连接到该终端
    existingSession.connections.add(socket.id);
    existingSession.lastActivity = Date.now();

    // 更新 socket 映射
    if (!socketTerminals.has(socket.id)) {
      socketTerminals.set(socket.id, new Set());
    }
    socketTerminals.get(socket.id).add(terminalId);

    // 发送历史输出。终端进程不会因手机端断开而停止，重连时用缓存回放最近输出。
    const history = existingSession.outputBuffer.join('');
    if (history) {
      socket.emit('terminal-output', { terminalId, data: history });
    }

    // 通知客户端终端已恢复
    socket.emit('terminal-created', {
      terminalId,
      pid: existingSession.process.pid,
      shell: existingSession.shell,
      cwd: existingSession.cwd,
      name: existingSession.displayName,
      reminderEnabled: existingSession.reminderEnabled,
      hasUserMessage: existingSession.hasUserMessage,
      resumed: true
    });

    return;
  }

  // 创建新终端
  try {
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: size.cols,
      rows: size.rows,
      cwd: workingDir,
      env: process.env,
      useConpty: process.platform === 'win32'
    });

    // 创建会话记录
    const session = {
      id: terminalId,
      process: ptyProcess,
      shell: shell,
      cwd: workingDir,
      displayName: resolveTerminalDisplayName(name, workingDir),
      connections: new Set([socket.id]),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      lastOutputAt: 0,
      lastDisconnectTime: null,
      outputBuffer: [], // 输出缓存，用于恢复连接
      outputBufferSize: 0,
      hasUserMessage: false,
      reminderIdleTimer: null,
      reminderEnabled: false,
      pendingReminder: null
    };

    persistentSessions.set(terminalId, session);

    // 更新 socket 映射
    if (!socketTerminals.has(socket.id)) {
      socketTerminals.set(socket.id, new Set());
    }
    socketTerminals.get(socket.id).add(terminalId);

    // 转发 PTY 输出到所有连接的客户端
    ptyProcess.onData((data) => {
      appendOutputBuffer(session, data);
      session.lastOutputAt = Date.now();
      clearPendingTerminalReminder(session);

      // 发送给所有连接的客户端
      emitToTerminalConnections(socket.nsp, session, 'terminal-output', { terminalId, data });
      scheduleTerminalReminder(socket.nsp, session);
    });

    // 处理 PTY 退出
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[Terminal] Process exited: ${terminalId}, exitCode: ${exitCode}`);

      // 通知所有连接的客户端
      emitToTerminalConnections(socket.nsp, session, 'terminal-exit', { terminalId, exitCode, signal });
      clearTerminalReminderTimer(session);

      // 清理会话
      persistentSessions.delete(terminalId);
    });

    // 通知客户端终端已就绪
    socket.emit('terminal-created', {
      terminalId,
      pid: ptyProcess.pid,
      shell: shell,
      cwd: workingDir,
      name: session.displayName,
      reminderEnabled: session.reminderEnabled,
      hasUserMessage: session.hasUserMessage,
      resumed: false
    });

    console.log(`[Terminal] Created new terminal: ${terminalId}, PID: ${ptyProcess.pid}, CWD: ${workingDir}`);
  } catch (error) {
    console.error('[Terminal] Create error:', error);
    socket.emit('terminal-error', { terminalId, error: error.message });
  }
}

/**
 * 初始化终端 Socket 处理
 * @param {Socket} socket - Socket.IO 连接
 */
function terminalSocket(socket) {
  // 存储认证状态
  const AUTH_TOKEN = process.env.AUTH_TOKEN || 'default-token';
  let isAuthenticated = socket.data?.isAuthenticated === true;

  if (isAuthenticated) {
    socket.emit('auth', 'success');
  }

  // 监听认证事件
  socket.on('auth', (token) => {
    if (isAuthenticated || token === AUTH_TOKEN) {
      isAuthenticated = true;
      socket.data.isAuthenticated = true;
      socket.emit('auth', 'success');
    } else {
      socket.emit('auth', 'error');
    }
  });

  // 创建或恢复终端会话（新版多终端API）
  socket.on('terminal-create', async ({ terminalId, cwd, cols = 80, rows = 24, name }) => {
    // 检查认证状态
    if (!isAuthenticated) {
      socket.emit('terminal-error', { terminalId, error: 'Not authenticated' });
      return;
    }

    if (!terminalId) {
      socket.emit('terminal-error', { error: '缺少终端ID' });
      return;
    }

    console.log();
    console.log(`[Terminal] Received cwd from client: "${cwd}"`);
    await createOrResumeTerminal(socket, terminalId, { cwd, cols, rows, name });
  });

  // 接收客户端输入（新版API）
  socket.on('terminal-input', ({ terminalId, data }) => {
    const session = persistentSessions.get(terminalId);
    if (session && session.connections.has(socket.id)) {
      session.process.write(data);
      session.lastActivity = Date.now();
      if (data) {
        session.hasUserMessage = true;
        clearPendingTerminalReminder(session);
      }
    }
  });

  // 调整终端大小（新版API）
  socket.on('terminal-resize', ({ terminalId, cols, rows }) => {
    const session = persistentSessions.get(terminalId);
    if (session && session.connections.has(socket.id)) {
      resizeTerminalProcess(session.process, cols, rows);
    }
  });

  socket.on('terminal-set-reminder', ({ terminalId, enabled, name }) => {
    const session = persistentSessions.get(terminalId);
    if (!session || !session.connections.has(socket.id)) {
      socket.emit('terminal-error', { terminalId, error: 'Terminal not found' });
      return;
    }

    session.reminderEnabled = Boolean(enabled);
    session.displayName = resolveTerminalDisplayName(name || session.displayName, session.cwd);
    if (!session.reminderEnabled) {
      clearPendingTerminalReminder(session);
    }

    emitToTerminalConnections(socket.nsp, session, 'terminal-reminder-updated', {
      terminalId,
      reminderEnabled: session.reminderEnabled,
      hasUserMessage: session.hasUserMessage,
      name: session.displayName,
      cwd: session.cwd
    });
  });

  // 关闭指定终端（新版API）- 点击叉叉真正关闭终端
  socket.on('terminal-close', ({ terminalId }) => {
    const session = persistentSessions.get(terminalId);
    if (session) {
      console.log(`[Terminal] User requested close: ${terminalId}, PID: ${session.process.pid}`);

      // 真正 kill 终端进程
      try {
        session.process.kill();
      } catch (err) {
        console.error(`[Terminal] Error killing process: ${err.message}`);
      }

      clearTerminalReminderTimer(session);

      // 清理会话
      persistentSessions.delete(terminalId);

      // 从所有 socket 映射中移除
      socketTerminals.forEach((terminals, socketId) => {
        terminals.delete(terminalId);
      });

      socket.emit('terminal-closed', { terminalId });
    }
  });

  // 获取活跃的终端列表
  socket.on('terminal-list', () => {
    if (!isAuthenticated) {
      socket.emit('terminal-error', { error: 'Not authenticated' });
      return;
    }

    const terminals = [];
    persistentSessions.forEach((session, terminalId) => {
      terminals.push({
        id: terminalId,
        shell: session.shell,
        cwd: session.cwd,
        name: session.displayName,
        createdAt: session.createdAt,
        connections: session.connections.size,
        isConnected: session.connections.has(socket.id),
        reminderEnabled: session.reminderEnabled,
        hasUserMessage: session.hasUserMessage
      });
    });

    socket.emit('terminal-list', terminals);
  });

  // ========== 旧版单终端API（向后兼容）==========

  let legacyPtyProcess = null;
  let legacyOutputBuffer = []; // 历史记录缓存
  const MAX_BUFFER_SIZE = 100 * 1024; // 最大缓存 100KB

  // 创建新终端会话（旧版API）
  socket.on('terminal:create', (options = {}) => {
    try {
      // 如果已有会话，先关闭
      if (legacyPtyProcess) {
        legacyPtyProcess.kill();
      }

      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const cwd = options.cwd || os.homedir();

      // 创建 PTY 进程
      legacyPtyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: cwd,
        env: process.env,
        useConpty: process.platform === 'win32'
      });

      // 转发 PTY 输出到客户端并缓存
      legacyPtyProcess.onData((data) => {
        // 缓存输出
        legacyOutputBuffer.push(data);
        // 限制缓存大小
        let totalSize = legacyOutputBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
        while (totalSize > MAX_BUFFER_SIZE && legacyOutputBuffer.length > 0) {
          totalSize -= legacyOutputBuffer.shift().length;
        }
        socket.emit('terminal:data', data);
      });

      // 处理 PTY 退出
      legacyPtyProcess.onExit(({ exitCode, signal }) => {
        socket.emit('terminal:exit', { exitCode, signal });
        legacyPtyProcess = null;
        legacyOutputBuffer = []; // 清空缓存
      });

      // 通知客户端终端已就绪
      socket.emit('terminal:created', {
        pid: legacyPtyProcess.pid,
        shell: shell,
        cwd: cwd
      });

      console.log(`[Terminal] Legacy terminal created for ${socket.id}, PID: ${legacyPtyProcess.pid}`);
    } catch (error) {
      socket.emit('terminal:error', error.message);
    }
  });

  // 获取终端历史记录（旧版API）
  socket.on('terminal:history', () => {
    if (!isAuthenticated) {
      socket.emit('terminal:error', 'Not authenticated');
      return;
    }

    const history = legacyOutputBuffer.join('');
    socket.emit('terminal:history', { data: history });
  });

  // 接收客户端输入（旧版API）
  socket.on('terminal:input', (data) => {
    if (legacyPtyProcess) {
      legacyPtyProcess.write(data);
    }
  });

  // 调整终端大小（旧版API）
  socket.on('terminal:resize', ({ cols, rows }) => {
    if (legacyPtyProcess) {
      legacyPtyProcess.resize(cols, rows);
    }
  });

  // 关闭终端（旧版API）
  socket.on('terminal:close', () => {
    if (legacyPtyProcess) {
      legacyPtyProcess.kill();
      legacyPtyProcess = null;
      socket.emit('terminal:closed');
    }
  });

  // 断开连接时只清理映射关系，不关闭终端（终端会一直运行直到用户手动关闭）
  socket.on('disconnect', () => {
    const terminalIds = socketTerminals.get(socket.id);

    if (terminalIds) {
      terminalIds.forEach(terminalId => {
        const session = persistentSessions.get(terminalId);
        if (session) {
          session.connections.delete(socket.id);
          console.log(`[Terminal] Client disconnected: ${socket.id}, terminal ${terminalId} still running (${session.connections.size} other connections)`);
        }
      });

      socketTerminals.delete(socket.id);
    }

    // 清理旧版单终端会话
    if (legacyPtyProcess) {
      legacyPtyProcess.kill();
      legacyPtyProcess = null;
    }
  });
}

module.exports = terminalSocket;
module.exports.getTerminalReminderState = getTerminalReminderState;
module.exports.pullPendingTerminalReminders = pullPendingTerminalReminders;
module.exports.acknowledgePendingTerminalReminder = acknowledgePendingTerminalReminder;
