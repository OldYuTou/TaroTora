<!--
  TaroTora - Remote Control System
  Copyright (C) 2026 OldYuTou

  控制页面 - 包含终端和远程操控功能
-->

<template>
  <div class="control-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span>远程控制</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" :class="{ 'active': connected }" @click="toggleTerminal">
          <span class="status-indicator" :class="{ 'connected': connected }"></span>
          {{ connected ? '已连接' : '连接终端' }}
        </button>
      </div>
    </div>

    <!-- 功能卡片网格 -->
    <div class="control-grid">
      <!-- 终端卡片 -->
      <div class="control-card terminal-card" :class="{ 'expanded': showTerminal }">
        <div class="card-header" @click="toggleTerminal">
          <div class="card-icon terminal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-title">命令行终端</div>
            <div class="card-desc">{{ connected ? '终端运行中' : '点击连接远程终端' }}</div>
          </div>
          <div class="card-arrow" :class="{ 'expanded': showTerminal }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <div v-if="showTerminal" class="terminal-section">
          <div class="terminal-toolbar">
            <button class="tool-btn" @click.stop="clearTerminal" :disabled="!connected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              清屏
            </button>
            <button class="tool-btn danger" @click.stop="closeTerminal" :disabled="!connected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              断开
            </button>
          </div>
          <div ref="terminalContainer" class="terminal-container">
            <div v-if="!connected" class="terminal-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
              <p>点击上方"连接终端"按钮开始连接</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 屏幕投屏卡片（预留） -->
      <div class="control-card disabled">
        <div class="card-header">
          <div class="card-icon screen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-title">实时屏幕</div>
            <div class="card-desc">查看并操控远程屏幕（即将推出）</div>
          </div>
          <div class="badge-soon">即将推出</div>
        </div>
      </div>

      <!-- 远程鼠标卡片（预留） -->
      <div class="control-card disabled">
        <div class="card-header">
          <div class="card-icon mouse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="3" width="12" height="18" rx="6" ry="6"></rect>
              <line x1="12" y1="7" x2="12" y2="11"></line>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-title">远程鼠标</div>
            <div class="card-desc">触控板模式操控远程鼠标（即将推出）</div>
          </div>
          <div class="badge-soon">即将推出</div>
        </div>
      </div>

      <!-- 快捷指令卡片 -->
      <div class="control-card">
        <div class="card-header" @click="showQuickCommands = !showQuickCommands">
          <div class="card-icon command">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <div class="card-info">
            <div class="card-title">快捷指令</div>
            <div class="card-desc">常用命令一键执行</div>
          </div>
          <div class="card-arrow" :class="{ 'expanded': showQuickCommands }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <div v-if="showQuickCommands" class="quick-commands">
          <button
            v-for="cmd in quickCommands"
            :key="cmd.name"
            class="command-btn"
            @click="sendCommand(cmd.command)"
            :disabled="!connected"
          >
            <span class="cmd-name">{{ cmd.name }}</span>
            <span class="cmd-preview">{{ cmd.command }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { io } from 'socket.io-client'
import 'xterm/css/xterm.css'

const terminalContainer = ref(null)
const connected = ref(false)
const showTerminal = ref(false)
const showQuickCommands = ref(false)

let term = null
let fitAddon = null
let socket = null

const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

const quickCommands = [
  { name: '查看目录', command: 'ls -la\r' },
  { name: '当前路径', command: 'pwd\r' },
  { name: '系统信息', command: 'systeminfo | findstr /B /C:"OS"\r' },
  { name: 'IP 地址', command: 'ipconfig | findstr IPv4\r' },
  { name: '清空屏幕', command: 'cls\r' },
  { name: '任务列表', command: 'tasklist | head -20\r' }
]

function toggleTerminal() {
  showTerminal.value = !showTerminal.value
  if (showTerminal.value && !connected.value) {
    setTimeout(() => {
      createTerminal()
    }, 100)
  }
}

function createTerminal() {
  if (term) {
    term.dispose()
  }

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#58a6ff',
      selectionBackground: '#264f78',
      black: '#0d1117',
      red: '#f85149',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#c9d1d9'
    },
    cols: 80,
    rows: 24
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())

  term.open(terminalContainer.value)
  fitAddon.fit()

  connectSocket()
}

function connectSocket() {
  const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3000'

  socket = io(serverUrl, {
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    socket.emit('auth', token)
  })

  socket.on('auth', (status) => {
    if (status === 'success') {
      socket.emit('terminal:create', {
        cols: term.cols,
        rows: term.rows
      })
    }
  })

  socket.on('terminal:created', (info) => {
    connected.value = true
    term.onData((data) => {
      socket.emit('terminal:input', data)
    })
    term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows })
    })
  })

  socket.on('terminal:data', (data) => {
    term.write(data)
  })

  socket.on('terminal:exit', () => {
    connected.value = false
  })

  socket.on('terminal:error', () => {
    connected.value = false
  })

  socket.on('disconnect', () => {
    connected.value = false
  })
}

function closeTerminal() {
  if (socket) {
    socket.emit('terminal:close')
  }
  if (term) {
    term.dispose()
    term = null
  }
  connected.value = false
}

function clearTerminal() {
  if (term) {
    term.clear()
  }
}

function sendCommand(command) {
  if (term && connected.value) {
    term.write(command)
    socket.emit('terminal:input', command)
  }
}

function handleResize() {
  if (fitAddon && connected.value) {
    fitAddon.fit()
    socket.emit('terminal:resize', {
      cols: term.cols,
      rows: term.rows
    })
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  closeTerminal()
})
</script>

<style scoped>
.control-page {
  height: 100%;
  background: #0d1117;
  overflow-y: auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
}

.header-title svg {
  width: 24px;
  height: 24px;
  color: #58a6ff;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #8b949e;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.active {
  background: rgba(35, 134, 54, 0.15);
  border-color: #238636;
  color: #3fb950;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8b949e;
}

.status-indicator.connected {
  background: #3fb950;
  box-shadow: 0 0 8px #3fb950;
}

.control-grid {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}

.control-card.disabled {
  opacity: 0.6;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.card-header:hover:not(.disabled) {
  background: rgba(88, 166, 255, 0.05);
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-icon.terminal {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.card-icon.screen {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.card-icon.mouse {
  background: rgba(201, 209, 217, 0.15);
  color: #8b949e;
}

.card-icon.command {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 2px;
}

.card-desc {
  font-size: 12px;
  color: #8b949e;
}

.card-arrow {
  width: 20px;
  height: 20px;
  color: #6e7681;
  transition: transform 0.3s;
}

.card-arrow.expanded {
  transform: rotate(180deg);
}

.card-arrow svg {
  width: 100%;
  height: 100%;
}

.badge-soon {
  padding: 4px 8px;
  background: #30363d;
  border-radius: 4px;
  font-size: 11px;
  color: #8b949e;
}

/* 终端区域 */
.terminal-section {
  border-top: 1px solid #30363d;
}

.terminal-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #0d1117;
  border-bottom: 1px solid #30363d;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: #30363d;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.danger {
  color: #f85149;
}

.tool-btn svg {
  width: 14px;
  height: 14px;
}

.terminal-container {
  height: 400px;
  background: #0d1117;
  padding: 12px;
}

.terminal-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6e7681;
  gap: 12px;
}

.terminal-placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.3;
}

.terminal-placeholder p {
  font-size: 13px;
}

/* 快捷指令 */
.quick-commands {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  background: #0d1117;
  border-top: 1px solid #30363d;
}

.command-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.command-btn:hover:not(:disabled) {
  background: #30363d;
  border-color: #58a6ff;
}

.command-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cmd-name {
  font-size: 13px;
  font-weight: 500;
  color: #c9d1d9;
}

.cmd-preview {
  font-size: 11px;
  color: #6e7681;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-viewport) {
  background-color: #0d1117 !important;
}
</style>
