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

// 检测是否为移动端
const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window
const isWindowsClient = navigator.platform?.toLowerCase().includes('win') || false

function createTerminal() {
  if (term) {
    term.dispose()
  }

  term = new Terminal({
    cursorBlink: true,
    fontSize: isMobile ? 12 : 14,
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
    cols: isMobile ? 40 : 80,
    rows: isMobile ? 40 : 24,
    scrollback: 10000,
    smoothScroll: true,
    allowTransparency: true,
    cursorStyle: 'block',
    // 移动端使用 DOM renderer 更稳定
    rendererType: isMobile ? 'dom' : 'canvas',
    // 禁用屏幕阅读器模式避免输入问题
    screenReaderMode: false,
    // 启用 windows 模式以更好地处理输入
    windowsMode: isWindowsClient,
    // 禁用装饰器避免渲染问题
    overviewRulerWidth: 0
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
      // 移动端输入后立即刷新，防止内容消失
      if (isMobile) {
        requestAnimationFrame(() => {
          if (term) {
            term.refresh(0, term.rows - 1)
          }
        })
      }
    })

    term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows })
    })

    // 移动端触摸滚动支持
    if (isMobile) {
      setupTouchScrolling()
    }

    // 请求历史记录
    socket.emit('terminal:history')
  })

  // 接收历史记录
  socket.on('terminal:history', ({ data }) => {
    if (data && term) {
      term.write(data)
    }
  })

  let touchStartY = 0
  let touchStartX = 0
  let isTouchScrolling = false

  function setupTouchScrolling() {
    const viewport = terminalContainer.value?.querySelector('.xterm-viewport')
    if (!viewport) return

    viewport.addEventListener('touchstart', handleTouchStart, { passive: false })
    viewport.addEventListener('touchmove', handleTouchMove, { passive: false })
    viewport.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
    isTouchScrolling = true
  }

  function handleTouchMove(e) {
    if (!isTouchScrolling || e.touches.length !== 1) return

    const touchY = e.touches[0].clientY
    const touchX = e.touches[0].clientX
    const deltaY = touchStartY - touchY
    const deltaX = Math.abs(touchStartX - touchX)

    // 如果垂直滑动距离大于水平滑动，认为是滚动操作
    if (Math.abs(deltaY) > deltaX && Math.abs(deltaY) > 10) {
      e.preventDefault()
      e.stopPropagation()

      // 计算滚动行数 (每 20 像素滚动一行)
      const linesToScroll = Math.round(deltaY / 20)
      if (linesToScroll !== 0 && term) {
        term.scrollLines(linesToScroll)
        touchStartY = touchY
      }
    }
  }

  function handleTouchEnd() {
    isTouchScrolling = false
  }

  socket.on('terminal:data', (data) => {
    if (term) {
      term.write(data)
      // 移动端输入后强制刷新，修复内容消失问题
      if (isMobile) {
        requestAnimationFrame(() => {
          term.refresh(0, term.rows - 1)
        })
      }
    }
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

let resizeTimeout = null
let lastViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight

function handleResize() {
  // 清除之前的定时器
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  // 延迟处理，等待键盘动画完成
  resizeTimeout = setTimeout(() => {
    const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight
    const viewportChanged = Math.abs(currentHeight - lastViewportHeight) > 50

    if (fitAddon && term) {
      // 如果是键盘弹出/收起，需要特殊处理
      if (viewportChanged) {
        lastViewportHeight = currentHeight

        // 刷新终端以修复可能的渲染问题
        term.refresh(0, term.rows - 1)

        // 重新计算尺寸
        fitAddon.fit()

        // 通知服务端新的尺寸
        if (socket && connected.value) {
          socket.emit('terminal:resize', {
            cols: term.cols,
            rows: term.rows
          })
        }
      } else {
        // 普通 resize，直接 fit
        fitAddon.fit()
        if (socket && connected.value) {
          socket.emit('terminal:resize', {
            cols: term.cols,
            rows: term.rows
          })
        }
      }
    }
  }, 300)
}

// 监听 Visual Viewport 变化（更准确地检测键盘弹出）
function setupVisualViewportListener() {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize)
  }
}

function removeVisualViewportListener() {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleResize)
  }
}

function handleVisibilityChange() {
  if (!document.hidden && term) {
    // 页面重新可见时刷新终端
    setTimeout(() => {
      term.refresh(0, term.rows - 1)
      if (fitAddon) {
        fitAddon.fit()
      }
    }, 100)
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  setupVisualViewportListener()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  removeVisualViewportListener()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
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
  overflow: auto;
  padding: 10px;
}

:deep(.xterm-viewport) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  background-color: #0d1117 !important;
  -webkit-overflow-scrolling: touch !important;
  touch-action: pan-y !important;
  width: 100% !important;
}

:deep(.xterm-screen) {
  touch-action: pan-y;
  width: 100% !important;
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

@media (max-width: 768px) {
  .terminal-page {
    padding: 12px;
    height: 100vh;
    overflow: hidden;
  }

  .toolbar {
    padding: 12px;
    flex-shrink: 0;
  }

  .tool-btn span {
    display: none;
  }

  .terminal-info {
    display: none;
  }

  .terminal-container {
    overflow: hidden;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.xterm) {
    height: 100%;
    overflow: hidden;
  }

  :deep(.xterm-viewport) {
    height: 100% !important;
    max-height: 100% !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  :deep(.xterm-screen) {
    height: auto !important;
    min-height: 100%;
  }
}
</style>
