<!--
  TaroTora - Remote Control System
  Copyright (C) 2026 OldYuTou

  移动端控制页面 - 多终端管理
-->

<template>
  <div class="control-mobile">
    <!-- 空白状态 - 没有终端时显示 -->
    <div v-if="terminals.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
      <h3>没有运行的终端</h3>
      <p>在文件管理中长按文件夹<br>选择"在此处打开终端"<br>即可创建新终端</p>
    </div>

    <!-- 有终端时的界面 -->
    <template v-else>
      <!-- 终端标签栏 - 可左右滑动 -->
      <div class="terminal-tabs-container">
        <div class="terminal-tabs" ref="tabsRef">
          <div
            v-for="(terminal, index) in terminals"
            :key="terminal.id"
            class="terminal-tab"
            :class="{ active: activeTerminalIndex === index }"
            @click="switchTerminal(index)"
          >
            <span class="tab-name">{{ terminal.name }}</span>
            <button class="tab-close" @click.stop="closeTerminal(index)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 终端内容区 -->
      <div class="terminal-container">
        <div
          v-for="(terminal, index) in terminals"
          :key="terminal.id"
          class="terminal-panel"
          :class="{ active: activeTerminalIndex === index }"
        >
          <div class="terminal-header">
            <div class="terminal-path">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>{{ terminal.cwd }}</span>
            </div>
          </div>
          <div class="terminal-body">
            <div :ref="el => setTerminalRef(el, index)" class="xterm-container"></div>
            <!-- 透明覆盖层：阻止点击直达 xterm 内部的 textarea，但允许滚动和选择 -->
            <div
              class="terminal-overlay"
              @touchstart.passive="handleTerminalTouch(index)"
              @mousedown.prevent
            ></div>
          </div>
        </div>
      </div>

      <!-- 终端工具栏 -->
      <div class="terminal-toolbar">
        <button class="tool-btn" @click="showNewTerminalDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>新建终端</span>
        </button>
        <button class="tool-btn mode-toggle" :class="{ active: inputMode }" @click="toggleInputMode">
          <svg v-if="inputMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
            <line x1="6" y1="8" x2="6" y2="8"></line>
            <line x1="10" y1="8" x2="10" y2="8"></line>
            <line x1="14" y1="8" x2="14" y2="8"></line>
            <line x1="18" y1="8" x2="18" y2="8"></line>
            <line x1="6" y1="12" x2="6" y2="12"></line>
            <line x1="10" y1="12" x2="10" y2="12"></line>
            <line x1="14" y1="12" x2="14" y2="12"></line>
            <line x1="18" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="16" x2="6" y2="16"></line>
            <line x1="10" y1="16" x2="10" y2="16"></line>
            <line x1="14" y1="16" x2="14" y2="16"></line>
            <line x1="18" y1="16" x2="18" y2="16"></line>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>{{ inputMode ? '输入' : '浏览' }}</span>
        </button>
      </div>
    </template>

    <!-- 调试信息面板 -->
    <div v-if="showDebug && debugInfo.length > 0" class="debug-panel">
      <div class="debug-header">
        <span>调试信息</span>
        <button class="debug-clear" @click="clearDebug">清除</button>
      </div>
      <div class="debug-content">
        <div v-for="(msg, idx) in debugInfo" :key="idx" class="debug-line" :class="msg.type">
          <span class="debug-time">{{ msg.time }}</span>
          <span class="debug-text">{{ msg.text }}</span>
        </div>
      </div>
    </div>

    <!-- 新建终端对话框 -->
    <div v-if="newTerminalDialogVisible" class="modal-overlay" @click.self="newTerminalDialogVisible = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>新建终端</h3>
          <button class="close-btn" @click="newTerminalDialogVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label>工作目录</label>
            <input
              v-model="newTerminalCwd"
              type="text"
              class="text-input"
              placeholder="例如: C:\\Users"
            />
          </div>
          <div class="input-group">
            <label>终端名称（可选）</label>
            <input
              v-model="newTerminalName"
              type="text"
              class="text-input"
              placeholder="默认使用目录名"
            />
          </div>
          <button class="confirm-btn" @click="createNewTerminal">创建终端</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

// 终端列表
const terminals = ref([])
const activeTerminalIndex = ref(0)
const tabsRef = ref(null)
const terminalRefs = ref([])
const inputRefs = ref([])

// 调试信息
const debugInfo = ref([])

// 添加调试信息
function addDebug(text, type = 'info') {
  // 如果调试信息未开启，则不记录
  if (!showDebug.value) return

  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  debugInfo.value.unshift({ time, text, type })
  // 只保留最近50条
  if (debugInfo.value.length > 50) {
    debugInfo.value = debugInfo.value.slice(0, 50)
  }
}

// 清除调试信息
function clearDebug() {
  debugInfo.value = []
}

// 对话框
const newTerminalDialogVisible = ref(false)
const newTerminalCwd = ref('C:\\')
const newTerminalName = ref('')

// Socket 连接
let socket = null
let termInstances = []

// 生成唯一ID（基于路径，便于恢复）
function generateId(cwd) {
  // 如果有路径，使用路径哈希作为ID的一部分，便于恢复
  if (cwd) {
    const pathHash = cwd.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0).toString(36)
    return `term_${pathHash}_${Date.now().toString(36)}`
  }
  return 'term_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4)
}

// 设置终端引用
function setTerminalRef(el, index) {
  if (el) {
    terminalRefs.value[index] = el
  }
}

// 设置输入框引用
function setInputRef(el, index) {
  if (el) {
    inputRefs.value[index] = el
  }
}

// 切换输入/浏览模式
function toggleInputMode() {
  inputMode.value = !inputMode.value

  // 更新所有终端的覆盖层状态
  nextTick(() => {
    terminals.value.forEach((_, index) => {
      updateOverlayState(index)
    })
  })

  showToast(inputMode.value ? '输入模式：点击终端可唤起键盘' : '浏览模式：可自由滚动和选择文本')
}

// 更新覆盖层状态
function updateOverlayState(index) {
  const container = terminalRefs.value[index]
  if (!container) return

  const panel = container.closest('.terminal-panel')
  if (!panel) return

  const overlay = panel.querySelector('.terminal-overlay')
  if (!overlay) return

  if (inputMode.value) {
    // 输入模式：隐藏覆盖层，允许点击直达 textarea
    overlay.style.pointerEvents = 'none'
    overlay.style.display = 'none'
  } else {
    // 浏览模式：显示覆盖层，阻止点击唤起键盘
    overlay.style.pointerEvents = 'auto'
    overlay.style.display = 'block'
  }
}

// 处理终端区域触摸
function handleTerminalTouch(index) {
  // 在输入模式下，不阻止事件，允许唤起键盘
  // 在浏览模式下，覆盖层会阻止事件
}

// 跟踪输入状态
const inputBuffers = ref([])

// 调试信息显示开关
const showDebug = ref(false)

// 输入模式开关 - true为输入模式(点击唤起键盘)，false为浏览模式(可滚动)
const inputMode = ref(false)

// 加载调试设置
function loadDebugSetting() {
  const saved = localStorage.getItem('show_debug_info')
  showDebug.value = saved === 'true'
}

// 处理移动端输入
function handleMobileInput(event, index) {
  const term = termInstances[index]
  const textarea = event.target
  if (!term || !textarea) return

  const value = textarea.value
  const buffer = inputBuffers[index] || ''

  // 计算新增的内容
  if (value.length > buffer.length) {
    const newChars = value.slice(buffer.length)
    // 直接发送到后端，不在本地显示
    sendInputToTerminal(index, newChars)
  }

  // 更新缓冲区
  inputBuffers[index] = value
}

// 处理组合输入结束（如中文输入法）
function handleCompositionEnd(event, index) {
  const term = termInstances[index]
  if (!term) return

  const data = event.data
  if (data) {
    sendInputToTerminal(index, data)
  }

  // 清空输入框和缓冲区
  event.target.value = ''
  inputBuffers[index] = ''
}

// 处理按键按下
function handleMobileKeydown(event, index) {
  const term = termInstances[index]
  if (!term) return

  const key = event.key

  // 特殊按键处理
  switch (key) {
    case 'Enter':
      sendInputToTerminal(index, '\r')
      event.preventDefault()
      break
    case 'Backspace':
      sendInputToTerminal(index, '\x7f')
      event.preventDefault()
      break
    case 'Tab':
      sendInputToTerminal(index, '\t')
      event.preventDefault()
      break
    case 'ArrowUp':
      sendInputToTerminal(index, '\x1b[A')
      event.preventDefault()
      break
    case 'ArrowDown':
      sendInputToTerminal(index, '\x1b[B')
      event.preventDefault()
      break
    case 'ArrowRight':
      sendInputToTerminal(index, '\x1b[C')
      event.preventDefault()
      break
    case 'ArrowLeft':
      sendInputToTerminal(index, '\x1b[D')
      event.preventDefault()
      break
    case 'Home':
      sendInputToTerminal(index, '\x1b[H')
      event.preventDefault()
      break
    case 'End':
      sendInputToTerminal(index, '\x1b[F')
      event.preventDefault()
      break
    case 'Escape':
      sendInputToTerminal(index, '\x1b')
      event.preventDefault()
      break
  }

  // Ctrl 组合键
  if (event.ctrlKey) {
    const char = event.key.toLowerCase()
    if (char >= 'a' && char <= 'z') {
      const code = char.charCodeAt(0) - 96
      sendInputToTerminal(index, String.fromCharCode(code))
      event.preventDefault()
    }
  }
}

// 处理按键释放
function handleMobileKeyup(event, index) {
  const textarea = event.target
  // 如果输入框被清空（如回车后），重置缓冲区
  if (textarea.value === '') {
    inputBuffers[index] = ''
  }
}

// 发送输入到终端
function sendInputToTerminal(index, data) {
  const termInstance = termInstances[index]
  if (!termInstance) return

  const terminalId = termInstance.id

  // 直接发送到 socket，让后端返回显示
  if (socket && socket.connected) {
    socket.emit('terminal-input', { terminalId, data })
  }
}

// 初始化 Socket 连接
function initSocket() {
  const serverUrl = localStorage.getItem('server_url') || window.location.origin
  const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

  addDebug('初始化 Socket, URL: ' + serverUrl)
  addDebug('window.io 可用: ' + !!window.io)
  addDebug('已有 socket: ' + !!window.controlSocket)

  // 优先使用现有的 socket
  if (window.controlSocket) {
    socket = window.controlSocket
    addDebug('使用已有 socket, 状态: ' + (socket.connected ? '已连接' : '未连接'))
  } else if (window.io) {
    // 创建新 socket
    addDebug('创建新 socket: ' + serverUrl)
    socket = window.io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    window.controlSocket = socket

    // 监听连接事件
    socket.on('connect', () => {
      addDebug('Socket 已连接', 'success')
    })

    socket.on('connect_error', (err) => {
      addDebug('Socket 连接错误: ' + err.message, 'error')
    })

    socket.on('disconnect', (reason) => {
      addDebug('Socket 断开: ' + reason, 'warning')
    })
  } else {
    addDebug('错误: window.io 不可用!', 'error')
  }

  if (socket) {
    addDebug('绑定终端事件...')

    // 发送 auth 确保服务器已认证（如果需要）
    const token = localStorage.getItem('auth_token')
    if (token && !socket.authSent) {
      addDebug('发送 auth 认证')
      socket.emit('auth', token)
      socket.authSent = true
    }

    // 绑定终端相关事件
    socket.off('terminal-output') // 先移除旧的监听器
    socket.on('terminal-output', (data) => {
      addDebug('收到输出: ' + data.terminalId.substring(0, 8) + '...')
      const term = termInstances.find(t => t.id === data.terminalId)
      if (term) {
        term.xterm.write(data.data)
      }
    })

    socket.off('terminal-exit')
    socket.on('terminal-exit', (data) => {
      addDebug('终端退出: ' + data.terminalId.substring(0, 8), 'warning')
      const index = terminals.value.findIndex(t => t.id === data.terminalId)
      if (index !== -1) {
        closeTerminal(index)
      }
    })

    socket.off('terminal-created')
    socket.on('terminal-created', (data) => {
      addDebug('终端创建成功: ' + data.terminalId.substring(0, 8) + ' PID:' + data.pid + (data.resumed ? ' [恢复]' : ''), 'success')
      // 找到对应的终端并显示连接成功
      const termInstance = termInstances.find(t => t.id === data.terminalId)
      if (termInstance) {
        termInstance.xterm.writeln('')
        if (data.resumed) {
          termInstance.xterm.writeln('\x1b[33m✓ 已恢复之前的终端会话 (PID: ' + data.pid + ')\x1b[0m')
        } else {
          termInstance.xterm.writeln('\x1b[32m✓ 终端已连接 (PID: ' + data.pid + ')\x1b[0m')
        }
        termInstance.xterm.writeln('')
      }
    })

    socket.off('terminal-error')
    socket.on('terminal-error', (data) => {
      addDebug('终端错误: ' + JSON.stringify(data), 'error')
    })
  }
}

// 创建终端
async function createTerminal(cwd, name, existingId = null) {
  const id = existingId || generateId(cwd)
  const terminalName = name || cwd.split('\\').pop() || '终端'

  addDebug((existingId ? '恢复终端: ' : '创建终端: ') + id.substring(0, 8) + ' ' + terminalName)

  terminals.value.push({
    id,
    name: terminalName,
    cwd,
    createdAt: Date.now()
  })

  // 切换到新终端
  activeTerminalIndex.value = terminals.value.length - 1

  // 等待 DOM 更新后初始化 xterm
  await nextTick()
  addDebug('DOM 更新完成，初始化 xterm')
  await initXterm(id, activeTerminalIndex.value)

  // 通过 socket 启动远程终端 - 确保 socket 已连接
  addDebug('Socket 状态: ' + (socket ? (socket.connected ? '已连接' : '未连接') : 'null'))

  if (socket && socket.connected) {
    addDebug('发送创建终端命令: ' + id.substring(0, 8) + ' 路径: ' + cwd)
    socket.emit('terminal-create', { terminalId: id, cwd })
  } else if (socket) {
    // 如果 socket 还没连接，等待连接后再发送
    addDebug('等待 socket 连接...', 'warning')
    socket.once('connect', () => {
      addDebug('Socket 已连接，创建终端: ' + id.substring(0, 8))
      socket.emit('terminal-create', { terminalId: id, cwd })
    })
  } else {
    addDebug('错误: Socket 不可用', 'error')
    // 显示错误到终端
    const termInstance = termInstances.find(t => t.id === id)
    if (termInstance) {
      termInstance.xterm.writeln('')
      termInstance.xterm.writeln('\x1b[31m错误: Socket 连接不可用\x1b[0m')
    }
  }
}

// 初始化 xterm
async function initXterm(id, index) {
  const container = terminalRefs.value[index]
  if (!container) return

  // 清空容器
  container.innerHTML = ''

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#c9d1d9',
      selectionBackground: '#264f78',
      black: '#0d1117',
      red: '#f85149',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#f778ba',
      cyan: '#39c5cf',
      white: '#c9d1d9'
    },
    scrollback: 10000,
    allowProposedApi: true,
    // 启用平滑滚动
    smoothScrollDuration: 125,
    macOptionIsMeta: true
  })

  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  term.open(container)
  fitAddon.fit()

  // 先显示本地提示
  term.writeln('\x1b[36m正在连接到服务器终端...\x1b[0m')
  term.writeln('')

  // 确保容器可以获得焦点
  container.tabIndex = 0
  container.style.outline = 'none'

  // xterm 输入直接发送到后端（用于物理键盘输入）
  term.onData((data) => {
    if (socket && socket.connected) {
      socket.emit('terminal-input', { terminalId: id, data })
    }
  })

  // 处理 resize
  term.onResize(({ cols, rows }) => {
    if (socket) {
      socket.emit('terminal-resize', { terminalId: id, cols, rows })
    }
  })

  // 处理 resize
  term.onResize(({ cols, rows }) => {
    if (socket) {
      socket.emit('terminal-resize', { terminalId: id, cols, rows })
    }
  })

  termInstances.push({ id, xterm: term, fitAddon })

  // 触发初始 resize
  setTimeout(() => {
    fitAddon.fit()
    // 初始化覆盖层状态（默认为浏览模式）
    updateOverlayState(index)
  }, 100)
}

// 切换终端
function switchTerminal(index) {
  activeTerminalIndex.value = index
  // 重新调整大小，更新覆盖层状态
  nextTick(() => {
    const term = termInstances[index]
    if (term) {
      term.fitAddon.fit()
    }
    // 更新当前终端的覆盖层状态
    updateOverlayState(index)
  })
}

// 关闭终端
function closeTerminal(index) {
  const terminal = terminals.value[index]
  if (!terminal) return

  // 通知服务器关闭终端
  if (socket) {
    socket.emit('terminal-close', { terminalId: terminal.id })
  }

  // 销毁 xterm 实例
  const termInstance = termInstances.find(t => t.id === terminal.id)
  if (termInstance) {
    termInstance.xterm.dispose()
    const termIndex = termInstances.findIndex(t => t.id === terminal.id)
    if (termIndex !== -1) {
      termInstances.splice(termIndex, 1)
    }
  }

  // 移除终端
  terminals.value.splice(index, 1)
  terminalRefs.value.splice(index, 1)

  // 调整活动终端索引
  if (activeTerminalIndex.value >= terminals.value.length) {
    activeTerminalIndex.value = Math.max(0, terminals.value.length - 1)
  }

  // 重新调整当前终端大小
  nextTick(() => {
    const currentTerm = termInstances[activeTerminalIndex.value]
    if (currentTerm) {
      currentTerm.fitAddon.fit()
    }
  })
}

// 关闭所有终端
function closeAllTerminals() {
  if (!confirm('确定要关闭所有终端吗？')) return

  // 从后往前关闭，避免索引问题
  for (let i = terminals.value.length - 1; i >= 0; i--) {
    closeTerminal(i)
  }
}

// 处理快捷键
function handleKeydown(event) {
  // Ctrl+D 关闭所有终端
  if (event.ctrlKey && event.key === 'd') {
    event.preventDefault()
    closeAllTerminals()
  }
}

// 清屏
function clearTerminal() {
  const term = termInstances[activeTerminalIndex.value]
  if (term) {
    term.xterm.clear()
  }
}

// 显示新建终端对话框
function showNewTerminalDialog() {
  newTerminalCwd.value = 'C:\\'
  newTerminalName.value = ''
  newTerminalDialogVisible.value = true
}

// 创建新终端
function createNewTerminal() {
  if (!newTerminalCwd.value) {
    alert('请输入工作目录')
    return
  }
  createTerminal(newTerminalCwd.value, newTerminalName.value)
  newTerminalDialogVisible.value = false
}

// 检查从文件管理传递过来的终端启动请求
async function checkPendingTerminal() {
  const pendingCwd = localStorage.getItem('pending_terminal_cwd')
  const pendingName = localStorage.getItem('pending_terminal_name')

  addDebug('检查待创建终端: ' + pendingCwd)

  if (pendingCwd) {
    localStorage.removeItem('pending_terminal_cwd')
    localStorage.removeItem('pending_terminal_name')

    // 确保 socket 已连接
    if (socket && !socket.connected) {
      addDebug('等待 socket 连接后再创建终端...', 'warning')
      await new Promise(resolve => {
        const checkConnection = () => {
          if (socket && socket.connected) {
            addDebug('Socket 已连接，正在创建终端')
            resolve()
          } else if (!socket) {
            addDebug('错误: Socket 变为 null', 'error')
            resolve()
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }

    if (socket && socket.connected) {
      await createTerminal(pendingCwd, pendingName)
    } else {
      addDebug('错误: Socket 不可用，无法创建终端', 'error')
    }
  }
}

// 监听窗口大小变化
function handleResize() {
  const term = termInstances[activeTerminalIndex.value]
  if (term) {
    term.fitAddon.fit()
  }
}

// 加载已存在的终端列表
async function loadExistingTerminals() {
  addDebug('正在获取服务器上的终端列表...')

  // 等待 socket 连接
  if (!socket) {
    addDebug('Socket 未初始化，延迟获取终端列表', 'warning')
    setTimeout(loadExistingTerminals, 500)
    return
  }

  // 如果还没连接，等待连接
  if (!socket.connected) {
    addDebug('等待 socket 连接后获取终端列表...', 'warning')
    socket.once('connect', () => {
      addDebug('Socket 已连接，获取终端列表')
      requestTerminalList()
    })
    return
  }

  requestTerminalList()
}

// 请求终端列表
function requestTerminalList() {
  // 先移除旧的监听器避免重复
  socket.off('terminal-list')

  // 监听终端列表响应
  socket.on('terminal-list', async (serverTerminals) => {
    addDebug(`收到终端列表: ${serverTerminals.length} 个终端`, 'success')

    // 清空本地列表（因为 xterm 实例已经被销毁）
    terminals.value = []
    termInstances = []
    terminalRefs.value = []

    if (serverTerminals.length === 0) {
      addDebug('服务器上没有活跃终端')
      return
    }

    // 为每个已存在的终端创建本地界面并连接
    for (const serverTerm of serverTerminals) {
      addDebug(`恢复终端: ${serverTerm.id.substring(0, 8)} 路径: ${serverTerm.cwd}`)
      await createTerminal(serverTerm.cwd, serverTerm.id.split('_')[1] || '终端', serverTerm.id)
    }
  })

  // 发送请求
  socket.emit('terminal-list')
}

onMounted(() => {
  initSocket()
  loadExistingTerminals()
  checkPendingTerminal()
  window.addEventListener('resize', handleResize)
  // 添加全局快捷键监听
  document.addEventListener('keydown', handleKeydown)
  // 加载调试设置
  loadDebugSetting()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeydown)
  // 离开页面时只销毁 xterm 实例，不断开服务器终端连接
  // 这样用户重新进入时可以恢复终端
  terminals.value.forEach((t) => {
    const termInstance = termInstances.find(ti => ti.id === t.id)
    if (termInstance) {
      termInstance.xterm.dispose()
    }
  })
  termInstances = []
})
</script>

<style scoped>
.control-mobile {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

/* 空白状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6e7681;
  text-align: center;
  padding: 40px 20px;
}

.empty-state svg {
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
  opacity: 0.3;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #c9d1d9;
  margin: 0 0 12px;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.8;
  margin: 0;
}

/* 终端标签栏 */
.terminal-tabs-container {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.terminal-tabs-container::-webkit-scrollbar {
  display: none;
}

.terminal-tabs {
  display: flex;
  padding: 8px 8px 0;
  gap: 4px;
  min-width: min-content;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #21262d;
  border: 1px solid #30363d;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  color: #8b949e;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 100px;
  max-width: 200px;
}

.terminal-tab.active {
  background: #0d1117;
  color: #58a6ff;
  border-color: #30363d;
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #6e7681;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.tab-close svg {
  width: 14px;
  height: 14px;
}

.tab-close:hover {
  background: rgba(248, 81, 73, 0.2);
  color: #f85149;
}

/* 终端容器 */
.terminal-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.terminal-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  flex-direction: column;
}

.terminal-panel.active {
  display: flex;
}

.terminal-header {
  padding: 8px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.terminal-path {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8b949e;
  font-size: 12px;
  font-family: 'Consolas', monospace;
}

.terminal-path svg {
  width: 14px;
  height: 14px;
  color: #58a6ff;
}

.terminal-path span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-body {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.xterm-container {
  width: 100%;
  height: 100%;
}

/* 移动端输入框 - 默认完全隐藏，点击键盘按钮时临时显示 */
.mobile-input {
  position: absolute;
  bottom: -1000px; /* 移出屏幕 */
  left: 0;
  width: 100%;
  height: 1px;
  opacity: 0;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: transparent;
  z-index: -1;
  resize: none;
  pointer-events: none;
}

.mobile-input:focus {
  outline: none;
}

/* 终端工具栏 */
.terminal-toolbar {
  position: fixed;
  bottom: 56px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 0;
  background: #161b22;
  border-top: 1px solid #30363d;
  z-index: 100;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 24px;
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn svg {
  width: 22px;
  height: 22px;
}

.tool-btn:active {
  color: #58a6ff;
}

.tool-btn.danger:active {
  color: #f85149;
}

.tool-btn.mode-toggle.active {
  color: #3fb950;
  background: rgba(63, 185, 80, 0.15);
  border-radius: 8px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f0f6fc;
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #8b949e;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 20px;
}

.input-group {
  margin-bottom: 16px;
}

.input-group label {
  display: block;
  font-size: 13px;
  color: #8b949e;
  margin-bottom: 0;
}

.text-input {
  width: 100%;
  padding: 12px 16px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 14px;
  transition: all 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15);
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  background: #2ea043;
}

/* 终端容器 - 相对定位，用于放置覆盖层 */
.terminal-body {
  flex: 1;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.xterm-container {
  width: 100%;
  height: 100%;
}

/* 透明覆盖层 - 阻止点击直达 textarea，但允许滚动和选择 */
.terminal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 5;
  touch-action: pan-y;
  user-select: text;
  -webkit-user-select: text;
}

/* xterm 样式覆盖 */
:deep(.xterm) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.xterm-screen) {
  width: 100% !important;
  background: #0d1117 !important;
}

:deep(.xterm-viewport) {
  width: 100% !important;
  background: #0d1117 !important;
  overflow-y: auto !important;
}:deep(.xterm .xterm-screen canvas) {
  width: 100% !important;
}

/* 移动端输入框 - 默认完全隐藏，点击键盘按钮时临时显示 */
.mobile-input {
  position: absolute;
  bottom: -1000px;
  left: 0;
  width: 100%;
  height: 1px;
  opacity: 0;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: transparent;
  z-index: -1;
  resize: none;
  pointer-events: none;
}

.mobile-input:focus {
  outline: none;
}

/* 调试面板 */
.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 300px;
  max-height: 200px;
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid #30363d;
  border-radius: 8px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #21262d;
  border-bottom: 1px solid #30363d;
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #c9d1d9;
}

.debug-clear {
  background: #da3633;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}

.debug-content {
  overflow-y: auto;
  padding: 0;
  font-family: 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.4;
}

.debug-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  word-break: break-all;
}

.debug-time {
  color: #6e7681;
  flex-shrink: 0;
}

.debug-text {
  color: #c9d1d9;
}

.debug-line.error .debug-text {
  color: #f85149;
}

.debug-line.warning .debug-text {
  color: #f0883e;
}

.debug-line.success .debug-text {
  color: #3fb950;
}
</style>
