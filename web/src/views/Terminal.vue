<!--
  TaroTora - Remote Control System
  Copyright (C) 2026 OldYuTou

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
  <div class="terminal-page">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="tool-btn primary" @click="createTerminal" :disabled="connected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>新建终端</span>
        </button>

        <button class="tool-btn" @click="closeTerminal" :disabled="!connected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>关闭</span>
        </button>

        <button class="tool-btn" @click="clearTerminal" :disabled="!connected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>清屏</span>
        </button>
      </div>

      <div class="terminal-info" v-if="terminalInfo">
        <span class="info-badge">PID: {{ terminalInfo.pid }}</span>
        <span class="info-badge">Shell: {{ terminalInfo.shell }}</span>
      </div>
    </div>

    <!-- 终端容器 -->
    <div ref="terminalContainer" class="terminal-container">
      <div v-if="!connected" class="terminal-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        <p>点击「新建终端」开始连接</p>
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
const terminalInfo = ref(null)

let term = null
let fitAddon = null
let socket = null

const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

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
      white: '#c9d1d9',
      brightBlack: '#484f58',
      brightRed: '#ff7b72',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc'
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
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('WebSocket connected')
    socket.emit('auth', token)
  })

  socket.on('auth', (status) => {
    if (status === 'success') {
      console.log('Authenticated, creating terminal...')
      socket.emit('terminal:create', {
        cols: term.cols,
        rows: term.rows
      })
    }
  })

  socket.on('terminal:created', (info) => {
    connected.value = true
    terminalInfo.value = info

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

  socket.on('terminal:exit', ({ exitCode }) => {
    connected.value = false
  })

  socket.on('terminal:error', (error) => {
    connected.value = false
  })

  socket.on('disconnect', () => {
    connected.value = false
    terminalInfo.value = null
  })

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error)
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
  terminalInfo.value = null
}

function clearTerminal() {
  if (term) {
    term.clear()
  }
}

function handleResize() {
  if (fitAddon) {
    fitAddon.fit()
    if (socket && connected.value) {
      socket.emit('terminal:resize', {
        cols: term.cols,
        rows: term.rows
      })
    }
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
.terminal-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #0d1117;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  border-radius: 12px 12px 0 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 13px;
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

.tool-btn.primary {
  background: #238636;
  border-color: #238636;
  color: #fff;
}

.tool-btn.primary:hover:not(:disabled) {
  background: #2ea043;
}

.tool-btn svg {
  width: 16px;
  height: 16px;
}

.terminal-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-badge {
  padding: 4px 10px;
  background: #21262d;
  border-radius: 4px;
  font-size: 12px;
  color: #8b949e;
  font-family: 'SF Mono', Monaco, monospace;
}

.terminal-container {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  border-top: none;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  padding: 10px;
}

.terminal-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6e7681;
  gap: 16px;
}

.terminal-placeholder svg {
  width: 64px;
  height: 64px;
  opacity: 0.3;
}

.terminal-placeholder p {
  font-size: 14px;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-viewport) {
  background-color: #0d1117 !important;
}

@media (max-width: 768px) {
  .terminal-page {
    padding: 12px;
  }

  .toolbar {
    padding: 12px;
  }

  .tool-btn span {
    display: none;
  }

  .terminal-info {
    display: none;
  }
}
</style>
