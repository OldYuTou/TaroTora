<!--
  TaroTora - Remote Control System
  Copyright (C) 2026 OldYuTou

  移动端控制页面 - 多终端管理
-->

<template>
  <div
    ref="controlMobileRef"
    class="control-mobile"
    :class="{ 'keyboard-active': isKeyboardVisible }"
    :style="controlMobileStyle"
  >
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
            <div
              :ref="el => setTerminalRef(el, index)"
              class="xterm-container"
              @touchstart="handleTerminalTouchStart($event, index)"
              @touchmove.prevent="handleTerminalTouchMove"
              @touchend="handleTerminalTouchEnd"
              @touchcancel="clearTerminalTouch"
            ></div>
            <textarea
              :ref="el => setInputRef(el, index)"
              class="mobile-input"
              rows="1"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              inputmode="text"
              enterkeyhint="enter"
              @input="handleMobileInput($event, index)"
              @compositionstart="handleCompositionStart(index)"
              @compositionend="handleCompositionEnd($event, index)"
              @keydown="handleMobileKeydown($event, index)"
              @keyup="handleMobileKeyup($event, index)"
              @blur="handleMobileInputBlur(index)"
            ></textarea>
            <!-- 透明覆盖层：默认浏览，仅处理滚动、选择和长按菜单 -->
            <div
              class="terminal-overlay"
              @touchstart="handleTerminalTouchStart($event, index)"
              @touchmove.prevent="handleTerminalTouchMove"
              @touchend="handleTerminalTouchEnd"
              @touchcancel="clearTerminalTouch"
              @contextmenu.prevent="handleTerminalContextMenu($event, index)"
              @mousedown.prevent
            ></div>
          </div>
        </div>
      </div>

      <!-- 终端工具栏 -->
      <div v-if="inputMode && comboPanelVisible" class="combo-panel">
        <div class="combo-panel-header">
          <span class="combo-panel-title">组合键</span>
          <span v-if="comboPendingLabel" class="combo-panel-status">{{ comboPendingLabel }} + 字母</span>
        </div>
        <div class="combo-panel-grid">
          <button
            class="combo-key-btn"
            @pointerdown.prevent
            @click.prevent="sendComboSpecialKey('tab', activeTerminalIndex)"
          >
            Tab
          </button>
          <button
            class="combo-key-btn modifier"
            :class="{ active: comboModifierState.ctrl }"
            @pointerdown.prevent
            @click.prevent="toggleComboModifier('ctrl', activeTerminalIndex)"
          >
            Ctrl
          </button>
          <button
            class="combo-key-btn modifier"
            :class="{ active: comboModifierState.alt }"
            @pointerdown.prevent
            @click.prevent="toggleComboModifier('alt', activeTerminalIndex)"
          >
            Alt
          </button>
          <button
            class="combo-key-btn"
            @pointerdown.prevent
            @click.prevent="sendComboSpecialKey('esc', activeTerminalIndex)"
          >
            Esc
          </button>
          <button
            class="combo-key-btn modifier"
            :class="{ active: comboModifierState.shift }"
            @pointerdown.prevent
            @click.prevent="toggleComboModifier('shift', activeTerminalIndex)"
          >
            Shift
          </button>
          <button
            class="combo-key-btn"
            @pointerdown.prevent
            @click.prevent="sendComboSpecialKey('enter', activeTerminalIndex)"
          >
            Enter
          </button>
        </div>
      </div>
      <div class="terminal-toolbar">
        <button
          v-if="!inputMode"
          class="tool-btn reminder-toggle"
          :class="{ active: terminals[activeTerminalIndex]?.reminderEnabled }"
          :aria-pressed="terminals[activeTerminalIndex]?.reminderEnabled ? 'true' : 'false'"
          title="提醒"
          @click="toggleActiveTerminalReminder"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            <path d="M4 4 2 6"></path>
            <path d="M20 4 22 6"></path>
          </svg>
          <span>提醒</span>
        </button>
        <button
          v-else
          class="tool-btn combo-toggle"
          :class="{ active: comboPanelVisible || hasActiveComboModifiers }"
          :aria-pressed="comboPanelVisible ? 'true' : 'false'"
          title="组合键"
          @pointerdown.prevent
          @click.prevent="toggleComboPanel(activeTerminalIndex)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="8" height="6" rx="1.5"></rect>
            <rect x="13" y="4" width="8" height="6" rx="1.5"></rect>
            <rect x="3" y="14" width="8" height="6" rx="1.5"></rect>
            <path d="M15 17h4"></path>
            <path d="M17 15v4"></path>
          </svg>
          <span>组合键</span>
        </button>
        <button class="tool-btn" @click="showNewTerminalDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>新建终端</span>
        </button>
        <button
          class="tool-btn mode-toggle"
          :class="{ active: inputMode }"
          @pointerdown.prevent="handleKeyboardTogglePointerDown(activeTerminalIndex, $event)"
          @click.prevent="handleKeyboardToggleClick(activeTerminalIndex)"
        >
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
          <span>{{ inputMode ? '输入中' : '键盘' }}</span>
        </button>
      </div>

      <div v-if="terminalContextMenu.visible" class="terminal-context-backdrop" @click="hideTerminalContextMenu">
        <div
          class="terminal-context-menu"
          :style="{ left: `${terminalContextMenu.x}px`, top: `${terminalContextMenu.y}px` }"
          @click.stop
        >
          <button
            class="terminal-context-item"
            :disabled="!terminalContextMenu.canCopy"
            @click="copyTerminalSelection"
          >
            复制选中内容
          </button>
          <button class="terminal-context-item" @click="pasteClipboardToTerminal">
            粘贴到终端
          </button>
        </div>
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
import { Capacitor, registerPlugin } from '@capacitor/core'
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { getDefaultServerUrl, normalizeServerUrl } from '../utils/serverUrl'
import { ensureTerminalReminderPermission } from '../utils/terminalReminder'
import { ensureControlSocket } from '../utils/controlSocket'

const KeyboardState = registerPlugin('KeyboardState')

// 终端列表
const terminals = ref([])
const activeTerminalIndex = ref(0)
const tabsRef = ref(null)
const controlMobileRef = ref(null)
const terminalRefs = ref([])
const inputRefs = ref([])
const terminalContextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  index: -1,
  canCopy: false
})

const TAP_MOVE_LIMIT = 18
const GESTURE_THRESHOLD = 4
const LONG_PRESS_DELAY = 550
const LONG_PRESS_SELECT_MOVE_LIMIT = 6
const TERMINAL_SCROLLBACK_LINES = 50000
const TERMINAL_TOUCH_SCROLL_SENSITIVITY = 1.6
const KEYBOARD_VISIBLE_THRESHOLD = 80
const KEYBOARD_SAFE_GAP = 12

const isKeyboardVisible = ref(false)
const keyboardViewportHeight = ref('')
const controlMobileStyle = computed(() => ({
  ...(isKeyboardVisible.value && keyboardViewportHeight.value
    ? { '--control-mobile-height': keyboardViewportHeight.value }
    : {})
}))

let terminalTouchState = null
let longPressTimer = null
let keyboardCloseSyncTimer = null
let terminalResizeObserver = null
let nativeKeyboardListenerHandle = null
let keyboardToggleClickSuppressUntil = 0
const terminalOutputQueues = new Map()

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

function clearTerminalOutputQueue(terminalId) {
  const queue = terminalOutputQueues.get(terminalId)
  if (queue?.rafId) {
    cancelAnimationFrame(queue.rafId)
  }
  terminalOutputQueues.delete(terminalId)
}

function flushTerminalOutput(terminalId) {
  const queue = terminalOutputQueues.get(terminalId)
  if (!queue) return

  queue.rafId = null
  const term = termInstances.find(t => t.id === terminalId)
  if (!term) {
    terminalOutputQueues.delete(terminalId)
    return
  }

  const output = queue.chunks.join('')
  queue.chunks = []
  if (output) {
    term.xterm.write(output)
    const index = terminals.value.findIndex(t => t.id === terminalId)
    if (index !== -1) {
      requestAnimationFrame(() => {
        scrollTerminalToBottom(index)
        term.xterm.refresh?.(0, term.xterm.rows - 1)
      })
    }
  }

  if (queue.chunks.length > 0 && !queue.rafId) {
    queue.rafId = requestAnimationFrame(() => flushTerminalOutput(terminalId))
  }
}

function enqueueTerminalOutput(terminalId, data) {
  let queue = terminalOutputQueues.get(terminalId)
  if (!queue) {
    queue = { chunks: [], rafId: null }
    terminalOutputQueues.set(terminalId, queue)
  }

  queue.chunks.push(data)
  if (!queue.rafId) {
    queue.rafId = requestAnimationFrame(() => flushTerminalOutput(terminalId))
  }
}

function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'terminal-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add('show'), 10)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 1800)
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

function getTerminalNameFromCwd(cwd) {
  if (!cwd) return '终端'
  const normalized = String(cwd).replace(/[\\/]+$/, '')
  const parts = normalized.split(/[\\/]+/).filter(Boolean)
  return parts.at(-1) || normalized || '终端'
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

function getTerminalInstance(index = activeTerminalIndex.value) {
  const terminal = terminals.value[index]
  if (!terminal) return null
  return termInstances.find(t => t.id === terminal.id) || termInstances[index] || null
}

function getTerminalViewport(index) {
  return terminalRefs.value[index]?.querySelector('.xterm-viewport') || null
}

function getTerminalScreen(index) {
  return terminalRefs.value[index]?.querySelector('.xterm-screen') || terminalRefs.value[index] || null
}

function getTerminalLineHeight(index) {
  const term = getTerminalInstance(index)
  const containerHeight = terminalRefs.value[index]?.clientHeight || 0
  if (term?.xterm?.rows && containerHeight) {
    return Math.max(12, containerHeight / term.xterm.rows)
  }
  return 18
}

function scrollTerminalByTouch(index, deltaY) {
  const term = getTerminalInstance(index)?.xterm
  const viewport = getTerminalViewport(index)
  if (!term || !viewport) return

  const pixelDelta = -deltaY * TERMINAL_TOUCH_SCROLL_SENSITIVITY
  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const currentScrollTop = viewport.scrollTop || 0
  const targetScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + pixelDelta))

  if (Math.abs(targetScrollTop - currentScrollTop) >= 0.25) {
    viewport.scrollTop = targetScrollTop
    viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
    requestAnimationFrame(() => term.refresh?.(0, term.rows - 1))
    return
  }

  const buffer = term?.buffer?.active
  if (!buffer || !terminalTouchState) return

  const lineHeight = getTerminalLineHeight(index)
  terminalTouchState.scrollRemainder += pixelDelta
  const lineDelta = Math.trunc(terminalTouchState.scrollRemainder / lineHeight)
  if (lineDelta === 0) return

  const maxLine = Math.max(0, buffer.baseY || 0)
  const currentLine = buffer.viewportY || 0
  const targetLine = Math.max(0, Math.min(maxLine, currentLine + lineDelta))

  if (targetLine !== currentLine) {
    term.scrollToLine(targetLine)
    terminalTouchState.scrollRemainder -= lineDelta * lineHeight
  }
}

function refreshTerminalViewport(index = activeTerminalIndex.value, shouldFit = false) {
  const term = getTerminalInstance(index)
  if (!term) return

  requestAnimationFrame(() => {
    if (shouldFit) {
      term.fitAddon?.fit()
      emitTerminalResize(term)
    }
    term.xterm?.refresh?.(0, term.xterm.rows - 1)
  })
}

function fitTerminalToContainer(index = activeTerminalIndex.value, repeatFrames = 2) {
  const term = getTerminalInstance(index)
  const container = terminalRefs.value[index]
  if (!term || !container) return

  const fit = (framesLeft) => {
    term.fitAddon?.fit()
    emitTerminalResize(term)
    term.xterm?.refresh?.(0, term.xterm.rows - 1)

    if (framesLeft > 0) {
      requestAnimationFrame(() => fit(framesLeft - 1))
    }
  }

  requestAnimationFrame(() => fit(repeatFrames))
}

function getTerminalSize(term) {
  const xterm = term?.xterm
  return {
    cols: Math.max(20, Math.floor(Number(xterm?.cols) || 80)),
    rows: Math.max(8, Math.floor(Number(xterm?.rows) || 24))
  }
}

function emitTerminalResize(term) {
  if (!socket || !term?.id || !term?.xterm) return
  socket.emit('terminal-resize', {
    terminalId: term.id,
    ...getTerminalSize(term)
  })
}

function scrollTerminalToBottom(index) {
  const term = getTerminalInstance(index)?.xterm
  if (!term) return

  const originalSmoothScrollDuration = term.options.smoothScrollDuration
  term.options.smoothScrollDuration = 0
  term.scrollToBottom?.()
  const buffer = term.buffer?.active
  if (buffer) {
    term.scrollToLine?.(Math.max(0, buffer.baseY || 0))
  }
  const viewport = getTerminalViewport(index)
  if (viewport) {
    viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    viewport.dispatchEvent(new Event('scroll', { bubbles: true }))
  }
  term.options.smoothScrollDuration = originalSmoothScrollDuration
}

function keepTerminalCursorVisible(index = activeTerminalIndex.value, shouldFit = false, repeatFrames = 2) {
  const term = getTerminalInstance(index)
  if (!term) return

  const sync = (framesLeft) => {
    if (shouldFit) {
      term.fitAddon?.fit()
      emitTerminalResize(term)
    }
    scrollTerminalToBottom(index)
    term.xterm?.refresh?.(0, term.xterm.rows - 1)

    if (framesLeft > 0) {
      requestAnimationFrame(() => sync(framesLeft - 1))
    }
  }

  requestAnimationFrame(() => sync(repeatFrames))
}

function clearKeyboardCloseSync() {
  if (keyboardCloseSyncTimer) {
    clearTimeout(keyboardCloseSyncTimer)
    keyboardCloseSyncTimer = null
  }
}

function exitMobileInputMode(index = activeTerminalIndex.value, shouldBlur = false) {
  const input = inputRefs.value[index]

  if (shouldBlur && input && document.activeElement === input) {
    input.blur()
  }

  if (!inputMode.value && !isKeyboardVisible.value) {
    return
  }

  inputMode.value = false
  resetComboInputState()
  startKeyboardCloseSync(index)
}

function startKeyboardCloseSync(index = activeTerminalIndex.value) {
  clearKeyboardCloseSync()
  isKeyboardVisible.value = false
  keyboardViewportHeight.value = ''

  nextTick(() => refreshTerminalViewport(index, true))
  keyboardCloseSyncTimer = setTimeout(() => {
    keepTerminalCursorVisible(index, true, 2)
    keyboardCloseSyncTimer = null
  }, 360)
}

function syncKeyboardViewport() {
  const viewport = window.visualViewport
  const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 0

  if (!viewport || !layoutHeight) {
    isKeyboardVisible.value = false
    keyboardViewportHeight.value = ''
    fitTerminalToContainer(activeTerminalIndex.value)
    return
  }

  const wasKeyboardVisible = isKeyboardVisible.value
  const keyboardOverlap = Math.max(0, layoutHeight - viewport.height - viewport.offsetTop)
  const viewportShrunk = viewport.height < layoutHeight - KEYBOARD_VISIBLE_THRESHOLD
  const keyboardNowVisible = inputMode.value && (keyboardOverlap > KEYBOARD_VISIBLE_THRESHOLD || viewportShrunk)

  if (inputMode.value && wasKeyboardVisible && !keyboardNowVisible) {
    exitMobileInputMode(activeTerminalIndex.value, true)
    return
  }

  isKeyboardVisible.value = keyboardNowVisible
  if (isKeyboardVisible.value) {
    keyboardViewportHeight.value = `${Math.max(220, viewport.height - KEYBOARD_SAFE_GAP)}px`
  } else {
    keyboardViewportHeight.value = ''
  }

  nextTick(() => {
    if (inputMode.value) {
      keepTerminalCursorVisible(activeTerminalIndex.value, true)
    } else {
      fitTerminalToContainer(activeTerminalIndex.value)
    }
  })
}

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function getDistance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function hasFocusedTerminalInput() {
  return inputRefs.value.some(input => input && document.activeElement === input)
}

function focusTerminalInput(index = activeTerminalIndex.value) {
  hideTerminalContextMenu()
  clearKeyboardCloseSync()
  const input = inputRefs.value[index]
  if (!input) return

  inputMode.value = true
  input.value = ''
  inputBuffers.value[index] = ''

  nextTick(() => {
    window.scrollTo?.(0, 0)
    input.focus({ preventScroll: true })
    syncKeyboardViewport()
    setTimeout(syncKeyboardViewport, 260)
    addDebug('已唤起终端键盘')
  })
}

async function hideNativeKeyboard() {
  if (Capacitor.getPlatform?.() !== 'android') {
    return false
  }

  try {
    const result = await KeyboardState.hide()
    return Boolean(result?.hidden)
  } catch (error) {
    addDebug(`原生收键盘失败: ${error.message}`, 'warning')
    return false
  }
}

async function toggleTerminalInputMode(index = activeTerminalIndex.value) {
  if (inputMode.value || isKeyboardVisible.value || hasFocusedTerminalInput()) {
    exitMobileInputMode(index, true)
    await hideNativeKeyboard()
    return
  }

  focusTerminalInput(index)
}

function handleKeyboardTogglePointerDown(index = activeTerminalIndex.value, event) {
  if (typeof event?.button === 'number' && event.button !== 0) {
    return
  }

  keyboardToggleClickSuppressUntil = Date.now() + 700
  void toggleTerminalInputMode(index)
}

function handleKeyboardToggleClick(index = activeTerminalIndex.value) {
  if (Date.now() < keyboardToggleClickSuppressUntil) {
    return
  }

  void toggleTerminalInputMode(index)
}

function handleMobileInputBlur(index = activeTerminalIndex.value) {
  exitMobileInputMode(index)
}

function syncKeyboardStateFromNative(state = {}) {
  const visible = !!state.visible
  const height = Math.max(0, Number(state.height) || 0)

  if (!inputMode.value && !hasFocusedTerminalInput()) {
    return
  }

  if (!visible) {
    exitMobileInputMode(activeTerminalIndex.value, true)
    return
  }

  const layoutHeight = window.innerHeight || document.documentElement.clientHeight || 0
  const estimatedViewportHeight = height > 0 && layoutHeight > 0
    ? Math.max(0, layoutHeight - height)
    : (window.visualViewport?.height || layoutHeight)

  isKeyboardVisible.value = true
  keyboardViewportHeight.value = estimatedViewportHeight
    ? `${Math.max(220, estimatedViewportHeight - KEYBOARD_SAFE_GAP)}px`
    : ''

  nextTick(() => keepTerminalCursorVisible(activeTerminalIndex.value, true))
}

async function setupNativeKeyboardListener() {
  if (Capacitor.getPlatform?.() !== 'android') {
    return
  }

  try {
    nativeKeyboardListenerHandle = await KeyboardState.addListener('keyboardStateChange', state => {
      syncKeyboardStateFromNative(state)
    })

    const state = await KeyboardState.getState()
    syncKeyboardStateFromNative(state)
  } catch (error) {
    addDebug(`原生键盘监听不可用: ${error.message}`, 'warning')
  }
}

// 保持覆盖层常驻：浏览、滚动和选择都经过覆盖层手势处理，输入只通过键盘按钮触发。
function updateOverlayState(index) {
  const container = terminalRefs.value[index]
  const panel = container?.closest('.terminal-panel')
  const overlay = panel?.querySelector('.terminal-overlay')
  if (!overlay) return

  overlay.style.pointerEvents = 'auto'
  overlay.style.display = 'block'
}

function forwardMouseToTerminal(type, point, index, buttons = 1) {
  const target = getTerminalScreen(index)
  if (!target || !point) return

  target.dispatchEvent(new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: point.clientX,
    clientY: point.clientY,
    screenX: point.screenX,
    screenY: point.screenY,
    button: 0,
    buttons
  }))
}

function selectTerminalWordAt(index, point) {
  forwardMouseToTerminal('mousedown', point, index, 1)
  forwardMouseToTerminal('mouseup', point, index, 0)
  forwardMouseToTerminal('mousedown', point, index, 1)
  forwardMouseToTerminal('mouseup', point, index, 0)
  forwardMouseToTerminal('dblclick', point, index, 0)
}

function startTerminalSelection(index, touch) {
  if (!terminalTouchState || terminalTouchState.selectionStarted) return
  terminalTouchState.selectionStarted = true
  forwardMouseToTerminal('mousedown', terminalTouchState.startPoint, index, 1)
  forwardMouseToTerminal('mousemove', touch, index, 1)
}

function showTerminalContextMenu(index, x, y) {
  clearLongPressTimer()
  const term = getTerminalInstance(index)
  const hasSelection = Boolean(term?.xterm?.hasSelection?.() && term.xterm.getSelection())
  const menuWidth = 160
  const menuHeight = 96

  terminalContextMenu.value = {
    visible: true,
    x: Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8)),
    index,
    canCopy: hasSelection
  }

  navigator.vibrate?.(15)
}

function hideTerminalContextMenu() {
  terminalContextMenu.value.visible = false
}

function handleTerminalContextMenu(event, index) {
  event.preventDefault()
  showTerminalContextMenu(index, event.clientX, event.clientY)
}

function handleTerminalTouchStart(event, index) {
  if (event.touches.length !== 1) {
    clearTerminalTouch()
    return
  }

  hideTerminalContextMenu()

  const touch = event.touches[0]

  terminalTouchState = {
    index,
    startPoint: {
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY
    },
    lastPoint: {
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY
    },
    scrollRemainder: 0,
    gesture: null,
    selectionStarted: false,
    longPressTriggered: false,
    selectionMoved: false
  }

  clearLongPressTimer()
  longPressTimer = setTimeout(() => {
    if (!terminalTouchState || terminalTouchState.gesture) return
    terminalTouchState.longPressTriggered = true
    terminalTouchState.gesture = 'select'
    terminalTouchState.selectionStarted = true
    forwardMouseToTerminal('mousedown', terminalTouchState.startPoint, index, 1)
    showToast('拖动选择终端文本，松开后复制')
    navigator.vibrate?.(15)
  }, LONG_PRESS_DELAY)
}

function handleTerminalTouchMove(event) {
  if (!terminalTouchState || event.touches.length !== 1) return

  const touch = event.touches[0]
  const dx = touch.clientX - terminalTouchState.startPoint.clientX
  const dy = touch.clientY - terminalTouchState.startPoint.clientY

  if (Math.abs(dx) > TAP_MOVE_LIMIT || Math.abs(dy) > TAP_MOVE_LIMIT) {
    clearLongPressTimer()
  }

  if (!terminalTouchState.gesture && Math.max(Math.abs(dx), Math.abs(dy)) > GESTURE_THRESHOLD) {
    terminalTouchState.gesture = Math.abs(dy) >= Math.abs(dx) ? 'scroll' : 'select'
  }

  if (terminalTouchState.gesture === 'scroll') {
    const deltaY = touch.clientY - terminalTouchState.lastPoint.clientY
    scrollTerminalByTouch(terminalTouchState.index, deltaY)
    event.preventDefault()
  } else if (terminalTouchState.gesture === 'select') {
    if (terminalTouchState.longPressTriggered) {
      const moved = getDistance(
        { x: touch.clientX, y: touch.clientY },
        { x: terminalTouchState.startPoint.clientX, y: terminalTouchState.startPoint.clientY }
      )
      terminalTouchState.selectionMoved = terminalTouchState.selectionMoved || moved > LONG_PRESS_SELECT_MOVE_LIMIT
    }
    startTerminalSelection(terminalTouchState.index, touch)
    forwardMouseToTerminal('mousemove', touch, terminalTouchState.index, 1)
    event.preventDefault()
  }

  terminalTouchState.lastPoint = {
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY
  }
}

function handleTerminalTouchEnd(event) {
  clearLongPressTimer()

  if (!terminalTouchState) return

  const state = terminalTouchState
  if (state.gesture === 'select' && state.selectionStarted) {
    if (state.longPressTriggered && !state.selectionMoved) {
      forwardMouseToTerminal('mouseup', state.lastPoint, state.index, 0)
      selectTerminalWordAt(state.index, state.startPoint)
    } else {
      forwardMouseToTerminal('mouseup', state.lastPoint, state.index, 0)
    }
    setTimeout(() => {
      showTerminalContextMenu(state.index, state.lastPoint.clientX, state.lastPoint.clientY)
    }, 80)
    event.preventDefault()
  }

  terminalTouchState = null
}

function clearTerminalTouch() {
  clearLongPressTimer()
  if (terminalTouchState?.gesture === 'select' && terminalTouchState.selectionStarted) {
    forwardMouseToTerminal('mouseup', terminalTouchState.lastPoint, terminalTouchState.index, 0)
  }
  terminalTouchState = null
}

async function copyTerminalSelection() {
  const index = terminalContextMenu.value.index
  const selection = getTerminalInstance(index)?.xterm?.getSelection?.() || ''

  if (!selection) {
    showToast('没有选中的终端文本')
    hideTerminalContextMenu()
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(selection)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = selection
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    showToast('已复制选中内容')
  } catch (error) {
    showToast('复制失败: ' + error.message)
  } finally {
    hideTerminalContextMenu()
  }
}

async function pasteClipboardToTerminal() {
  const index = terminalContextMenu.value.index
  try {
    let text = ''
    if (navigator.clipboard?.readText) {
      text = await navigator.clipboard.readText()
    } else {
      text = prompt('请输入要粘贴到终端的文本') || ''
    }

    if (text) {
      sendInputToTerminal(index, text)
      showToast('已粘贴到终端')
    }
  } catch (error) {
    const text = prompt('无法读取系统剪贴板，请手动粘贴文本') || ''
    if (text) {
      sendInputToTerminal(index, text)
      showToast('已粘贴到终端')
    } else {
      showToast('粘贴失败: ' + error.message)
    }
  } finally {
    hideTerminalContextMenu()
  }
}

// 跟踪输入状态
const inputBuffers = ref([])
const composingInputs = ref([])

// 调试信息显示开关
const showDebug = ref(false)

// 输入模式开关 - true为输入模式(点击唤起键盘)，false为浏览模式(可滚动)
const inputMode = ref(false)
const comboPanelVisible = ref(false)
const comboModifierState = ref({
  ctrl: false,
  alt: false,
  shift: false
})
const hasActiveComboModifiers = computed(() => (
  comboModifierState.value.ctrl
  || comboModifierState.value.alt
  || comboModifierState.value.shift
))
const comboPendingLabel = computed(() => {
  const labels = []
  if (comboModifierState.value.ctrl) labels.push('Ctrl')
  if (comboModifierState.value.alt) labels.push('Alt')
  if (comboModifierState.value.shift) labels.push('Shift')
  return labels.join('+')
})

function resetComboInputState({ keepPanel = false } = {}) {
  comboModifierState.value = {
    ctrl: false,
    alt: false,
    shift: false
  }
  if (!keepPanel) {
    comboPanelVisible.value = false
  }
}

function restoreActiveTerminalInputFocus(index = activeTerminalIndex.value) {
  if (!inputMode.value) return

  const input = inputRefs.value[index]
  if (!input) return

  nextTick(() => {
    input.focus({ preventScroll: true })
    syncKeyboardViewport()
  })
}

function toggleComboPanel(index = activeTerminalIndex.value) {
  if (!inputMode.value) return

  comboPanelVisible.value = !comboPanelVisible.value
  if (!comboPanelVisible.value) {
    resetComboInputState()
    return
  }

  restoreActiveTerminalInputFocus(index)
}

function toggleComboModifier(modifier, index = activeTerminalIndex.value) {
  if (!(modifier in comboModifierState.value)) return

  comboPanelVisible.value = true
  comboModifierState.value[modifier] = !comboModifierState.value[modifier]
  restoreActiveTerminalInputFocus(index)
}

function toShiftedCharacter(char) {
  if (!char) return char

  if (char >= 'a' && char <= 'z') {
    return char.toUpperCase()
  }

  const shiftedMap = {
    '1': '!',
    '2': '@',
    '3': '#',
    '4': '$',
    '5': '%',
    '6': '^',
    '7': '&',
    '8': '*',
    '9': '(',
    '0': ')',
    '-': '_',
    '=': '+',
    '[': '{',
    ']': '}',
    '\\': '|',
    ';': ':',
    '\'': '"',
    ',': '<',
    '.': '>',
    '/': '?',
    '`': '~'
  }

  return shiftedMap[char] || char
}

function toControlCharacter(char) {
  if (!char) return null

  const upper = char.toUpperCase()
  if (upper >= 'A' && upper <= 'Z') {
    return String.fromCharCode(upper.charCodeAt(0) - 64)
  }

  const controlMap = {
    '@': '\x00',
    ' ': '\x00',
    '[': '\x1b',
    '\\': '\x1c',
    ']': '\x1d',
    '^': '\x1e',
    '_': '\x1f'
  }

  return controlMap[upper] || null
}

function buildComboPayload(char) {
  if (!char) return ''

  let outputChar = comboModifierState.value.shift
    ? toShiftedCharacter(char)
    : char

  if (comboModifierState.value.ctrl) {
    outputChar = toControlCharacter(outputChar) || outputChar
  }

  return `${comboModifierState.value.alt ? '\x1b' : ''}${outputChar}`
}

function consumePendingComboInput(index, rawValue) {
  if (!hasActiveComboModifiers.value || !rawValue) {
    return false
  }

  const characters = Array.from(rawValue)
  if (!characters.length) {
    return false
  }

  const [firstChar, ...restChars] = characters
  const payload = buildComboPayload(firstChar)
  if (payload) {
    sendInputToTerminal(index, payload)
  }

  const remainingText = restChars.join('')
  if (remainingText) {
    sendInputToTerminal(index, remainingText)
  }

  resetComboInputState({ keepPanel: true })
  keepTerminalCursorVisible(index)
  return true
}

function sendComboSpecialKey(key, index = activeTerminalIndex.value) {
  const payloadMap = {
    tab: '\t',
    esc: '\x1b',
    enter: '\r'
  }

  const payload = payloadMap[key]
  if (!payload) return

  sendInputToTerminal(index, payload)
  keepTerminalCursorVisible(index)
  restoreActiveTerminalInputFocus(index)
}

watch(isKeyboardVisible, (visible, previousVisible) => {
  if (!visible && previousVisible && inputMode.value) {
    exitMobileInputMode(activeTerminalIndex.value)
  }
})

// 加载调试设置
function loadDebugSetting() {
  const saved = localStorage.getItem('show_debug_info')
  showDebug.value = saved === 'true'
}

// 处理移动端输入
function handleMobileInput(event, index) {
  const textarea = event.target
  if (!getTerminalInstance(index) || !textarea || composingInputs.value[index]) return

  const value = textarea.value
  if (consumePendingComboInput(index, value)) {
    textarea.value = ''
    inputBuffers.value[index] = ''
    return
  }

  if (value) {
    sendInputToTerminal(index, value)
  }

  textarea.value = ''
  inputBuffers.value[index] = ''
  keepTerminalCursorVisible(index)
}

function handleCompositionStart(index) {
  composingInputs.value[index] = true
}

// 处理组合输入结束（如中文输入法）
function handleCompositionEnd(event, index) {
  if (!getTerminalInstance(index)) return

  composingInputs.value[index] = false
  const data = event.target.value || event.data
  if (consumePendingComboInput(index, data)) {
    event.target.value = ''
    inputBuffers.value[index] = ''
    return
  }

  if (data) {
    sendInputToTerminal(index, data)
  }

  // 清空输入框和缓冲区
  event.target.value = ''
  inputBuffers.value[index] = ''
  keepTerminalCursorVisible(index)
}

// 处理按键按下
function handleMobileKeydown(event, index) {
  const term = getTerminalInstance(index)
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
    inputBuffers.value[index] = ''
  }
}

// 发送输入到终端
function sendInputToTerminal(index, data) {
  const termInstance = getTerminalInstance(index)
  if (!termInstance) return

  const terminalId = termInstance.id

  // 直接发送到 socket，让后端返回显示
  if (socket && socket.connected) {
    const terminal = terminals.value[index]
    if (terminal && data) {
      terminal.hasUserMessage = true
    }
    socket.emit('terminal-input', { terminalId, data })
  }
}

function handleSocketTerminalReminderReady(data) {
  const terminal = terminals.value.find(t => t.id === data.terminalId)
  if (!terminal) return

  terminal.hasUserMessage = false
  if (data.name) {
    terminal.name = data.name
  }
  addDebug('终端提醒就绪: ' + terminal.name, 'success')
}

function handleSocketTerminalReminderUpdated(data) {
  const terminal = terminals.value.find(t => t.id === data.terminalId)
  if (!terminal) return

  terminal.reminderEnabled = Boolean(data.reminderEnabled)
  terminal.hasUserMessage = Boolean(data.hasUserMessage)
  if (data.name) {
    terminal.name = data.name
  }
}

function handleSocketTerminalOutput(data) {
  addDebug('收到输出: ' + data.terminalId.substring(0, 8) + '...')
  enqueueTerminalOutput(data.terminalId, data.data)
}

function handleSocketTerminalExit(data) {
  addDebug('终端退出: ' + data.terminalId.substring(0, 8), 'warning')
  const index = terminals.value.findIndex(t => t.id === data.terminalId)
  if (index !== -1) {
    closeTerminal(index, { confirmClose: false })
  }
}

function handleSocketTerminalCreated(data) {
  addDebug('终端创建成功: ' + data.terminalId.substring(0, 8) + ' PID:' + data.pid + (data.resumed ? ' [恢复]' : ''), 'success')
  const terminal = terminals.value.find(t => t.id === data.terminalId)
  if (terminal) {
    terminal.reminderEnabled = Boolean(data.reminderEnabled)
    terminal.hasUserMessage = Boolean(data.hasUserMessage)
    if (data.name) {
      terminal.name = data.name
    }
  }
  const termInstance = termInstances.find(t => t.id === data.terminalId)
  if (termInstance) {
    termInstance.xterm.writeln('')
    if (data.resumed) {
      termInstance.xterm.writeln('\x1b[33m✓ 已恢复之前的终端会话 (PID: ' + data.pid + ')\x1b[0m')
    } else {
      termInstance.xterm.writeln('\x1b[32m✓ 终端已连接 (PID: ' + data.pid + ')\x1b[0m')
    }
    termInstance.xterm.writeln('')
    emitTerminalResize(termInstance)
  }
}

function handleSocketTerminalError(data) {
  addDebug('终端错误: ' + JSON.stringify(data), 'error')
}

async function handleSocketTerminalList(serverTerminals) {
  addDebug(`收到终端列表: ${serverTerminals.length} 个终端`, 'success')

  terminals.value = []
  termInstances = []
  terminalRefs.value = []

  if (serverTerminals.length === 0) {
    addDebug('服务器上没有活跃终端')
    return
  }

  for (const serverTerm of serverTerminals) {
    addDebug(`恢复终端: ${serverTerm.id.substring(0, 8)} 路径: ${serverTerm.cwd}`)
    await createTerminal(serverTerm.cwd, serverTerm.name, serverTerm.id, serverTerm)
  }
}

function handleSocketConnect() {
  addDebug('Socket 已连接', 'success')
}

function handleSocketConnectError(err) {
  addDebug('Socket 连接错误: ' + err.message, 'error')
}

function handleSocketDisconnect(reason) {
  addDebug('Socket 断开: ' + reason, 'warning')
}

// 初始化 Socket 连接
function initSocket() {
  const serverUrl = normalizeServerUrl(localStorage.getItem('server_url') || '') || getDefaultServerUrl()
  const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'
  const hadExistingSocket = !!window.controlSocket

  addDebug('初始化 Socket, URL: ' + serverUrl)
  addDebug('已有 socket: ' + hadExistingSocket)

  socket = ensureControlSocket({ serverUrl, token })

  if (!socket) {
    addDebug('错误: 无法初始化 socket', 'error')
    return
  }

  addDebug((hadExistingSocket ? '复用' : '创建') + ' socket, 状态: ' + (socket.connected ? '已连接' : '未连接'))

  socket.off('connect', handleSocketConnect)
  socket.on('connect', handleSocketConnect)

  socket.off('connect_error', handleSocketConnectError)
  socket.on('connect_error', handleSocketConnectError)

  socket.off('disconnect', handleSocketDisconnect)
  socket.on('disconnect', handleSocketDisconnect)

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
    socket.off('terminal-output', handleSocketTerminalOutput)
    socket.on('terminal-output', handleSocketTerminalOutput)

    socket.off('terminal-reminder-ready', handleSocketTerminalReminderReady)
    socket.on('terminal-reminder-ready', handleSocketTerminalReminderReady)

    socket.off('terminal-reminder-updated', handleSocketTerminalReminderUpdated)
    socket.on('terminal-reminder-updated', handleSocketTerminalReminderUpdated)

    socket.off('terminal-exit', handleSocketTerminalExit)
    socket.on('terminal-exit', handleSocketTerminalExit)

    socket.off('terminal-created', handleSocketTerminalCreated)
    socket.on('terminal-created', handleSocketTerminalCreated)

    socket.off('terminal-error', handleSocketTerminalError)
    socket.on('terminal-error', handleSocketTerminalError)
  }
}

// 创建终端
async function createTerminal(cwd, name, existingId = null, initialState = {}) {
  const id = existingId || generateId(cwd)
  const terminalName = name || getTerminalNameFromCwd(cwd)

  addDebug((existingId ? '恢复终端: ' : '创建终端: ') + id.substring(0, 8) + ' ' + terminalName)

  terminals.value.push({
    id,
    name: terminalName,
    cwd,
    createdAt: Date.now(),
    reminderEnabled: Boolean(initialState.reminderEnabled),
    hasUserMessage: Boolean(initialState.hasUserMessage)
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
    const termInstance = termInstances.find(t => t.id === id)
    socket.emit('terminal-create', {
      terminalId: id,
      cwd,
      name: terminalName,
      ...getTerminalSize(termInstance)
    })
  } else if (socket) {
    // 如果 socket 还没连接，等待连接后再发送
    addDebug('等待 socket 连接...', 'warning')
    socket.once('connect', () => {
      addDebug('Socket 已连接，创建终端: ' + id.substring(0, 8))
      const termInstance = termInstances.find(t => t.id === id)
      socket.emit('terminal-create', {
        terminalId: id,
        cwd,
        name: terminalName,
        ...getTerminalSize(termInstance)
      })
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
    scrollback: TERMINAL_SCROLLBACK_LINES,
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
      const terminal = terminals.value.find(t => t.id === id)
      if (terminal && data) {
        terminal.hasUserMessage = true
      }
      socket.emit('terminal-input', { terminalId: id, data })
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
    fitTerminalToContainer(index)
    // 初始化覆盖层状态（默认为浏览模式）
    updateOverlayState(index)
  }, 100)
  setTimeout(() => fitTerminalToContainer(index), 350)
}

// 切换终端
function switchTerminal(index) {
  activeTerminalIndex.value = index
  resetComboInputState()
  // 重新调整大小，更新覆盖层状态
  nextTick(() => {
    const term = termInstances[index]
    if (term) {
      fitTerminalToContainer(index)
    }
    // 更新当前终端的覆盖层状态
    updateOverlayState(index)
  })
}

async function toggleActiveTerminalReminder() {
  const terminal = terminals.value[activeTerminalIndex.value]
  if (!terminal) return

  if (!terminal.reminderEnabled) {
    const allowed = await ensureTerminalReminderPermission()
    if (!allowed) {
      showToast('请允许通知权限后再开启提醒')
      return
    }
  }

  terminal.reminderEnabled = !terminal.reminderEnabled
  if (socket && socket.connected) {
    socket.emit('terminal-set-reminder', {
      terminalId: terminal.id,
      enabled: terminal.reminderEnabled,
      name: terminal.name
    })
  }
  addDebug(`终端提醒已${terminal.reminderEnabled ? '开启' : '关闭'}: ${terminal.name}`)
}

// 关闭终端
function closeTerminal(index, { confirmClose = true } = {}) {
  const terminal = terminals.value[index]
  if (!terminal) return

  if (confirmClose) {
    const title = terminal.name || getTerminalNameFromCwd(terminal.cwd)
    if (!confirm(`确定要关闭终端「${title}」吗？\n\n关闭后该终端进程会被结束。`)) {
      return
    }
  }

  clearTerminalOutputQueue(terminal.id)

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
  resetComboInputState()

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
    closeTerminal(i, { confirmClose: false })
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
  fitTerminalToContainer(activeTerminalIndex.value)
  syncKeyboardViewport()
}

function handleVisualViewportResize() {
  syncKeyboardViewport()
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
  socket.off('terminal-list', handleSocketTerminalList)
  socket.on('terminal-list', handleSocketTerminalList)

  socket.emit('terminal-list')
}

onMounted(() => {
  initSocket()
  // 延迟检查待处理终端，确保 socket 已连接
  setTimeout(() => {
    checkPendingTerminal()
  }, 500)
  loadExistingTerminals()
  syncKeyboardViewport()
  if (typeof ResizeObserver !== 'undefined' && controlMobileRef.value) {
    terminalResizeObserver = new ResizeObserver(() => {
      fitTerminalToContainer(activeTerminalIndex.value)
    })
    terminalResizeObserver.observe(controlMobileRef.value)
  }
  window.addEventListener('resize', handleResize)
  window.visualViewport?.addEventListener('resize', handleVisualViewportResize)
  window.visualViewport?.addEventListener('scroll', handleVisualViewportResize)
  // 添加全局快捷键监听
  document.addEventListener('keydown', handleKeydown)
  // 加载调试设置
  loadDebugSetting()
  setupNativeKeyboardListener()
})

onUnmounted(() => {
  clearTerminalTouch()
  clearKeyboardCloseSync()
  terminalResizeObserver?.disconnect()
  terminalResizeObserver = null
  hideTerminalContextMenu()
  window.removeEventListener('resize', handleResize)
  window.visualViewport?.removeEventListener('resize', handleVisualViewportResize)
  window.visualViewport?.removeEventListener('scroll', handleVisualViewportResize)
  document.removeEventListener('keydown', handleKeydown)
  nativeKeyboardListenerHandle?.remove?.()
  nativeKeyboardListenerHandle = null
  // 离开页面时只销毁 xterm 实例，不断开服务器终端连接
  // 这样用户重新进入时可以恢复终端
  terminals.value.forEach((t) => {
    clearTerminalOutputQueue(t.id)
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
  width: 100vw;
  max-width: 100vw;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  overflow: hidden;
  min-height: 0;
}

.control-mobile.keyboard-active {
  height: var(--control-mobile-height);
  max-height: var(--control-mobile-height);
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
  width: 100%;
  max-width: 100vw;
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.terminal-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 100vw;
  display: none;
  flex-direction: column;
  min-height: 0;
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
  width: 100%;
  max-width: 100vw;
  flex: 1;
  overflow: hidden;
  padding: 0;
  min-height: 0;
}

.xterm-container {
  width: 100%;
  max-width: 100vw;
  height: 100%;
}

/* 移动端输入框 - 默认完全隐藏，点击键盘按钮时临时显示 */
.mobile-input {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: transparent;
  z-index: 1;
  resize: none;
  pointer-events: none;
  transform: translateZ(0);
}

.mobile-input:focus {
  outline: none;
}

/* 终端工具栏 */
.combo-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 10px;
  background: #161b22;
  border-top: 1px solid #30363d;
  border-bottom: 1px solid #30363d;
}

.combo-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.combo-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #f0f6fc;
}

.combo-panel-status {
  font-size: 12px;
  color: #58a6ff;
}

.combo-panel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.combo-key-btn {
  min-height: 40px;
  padding: 8px 10px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.combo-key-btn:active {
  border-color: #58a6ff;
  color: #58a6ff;
}

.combo-key-btn.modifier.active {
  background: rgba(88, 166, 255, 0.16);
  border-color: #58a6ff;
  color: #58a6ff;
}

.terminal-toolbar {
  flex-shrink: 0;
  position: relative;
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

.tool-btn.reminder-toggle.active {
  color: #f2cc60;
  background: rgba(242, 204, 96, 0.14);
  border-radius: 8px;
}

.tool-btn.combo-toggle.active {
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.15);
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
  width: 100%;
  max-width: 100vw;
  flex: 1;
  overflow: hidden;
  padding: 0;
  position: relative;
  min-height: 0;
}

.xterm-container {
  width: 100%;
  max-width: 100vw;
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
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.terminal-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: transparent;
}

.terminal-context-menu {
  position: fixed;
  min-width: 160px;
  overflow: hidden;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
}

.terminal-context-item {
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: #c9d1d9;
  font-size: 14px;
  text-align: left;
}

.terminal-context-item:active {
  background: #21262d;
  color: #58a6ff;
}

.terminal-context-item:disabled {
  color: #6e7681;
  opacity: 0.55;
}

/* xterm 样式覆盖 */
:deep(.xterm) {
  width: 100% !important;
  max-width: 100vw !important;
  height: 100% !important;
}

:deep(.xterm-screen) {
  width: 100% !important;
  max-width: 100vw !important;
  background: #0d1117 !important;
  z-index: 1 !important;
}

:deep(.xterm-viewport) {
  left: auto !important;
  right: 0 !important;
  width: 1px !important;
  max-width: 1px !important;
  background: transparent !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  z-index: 0 !important;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

:global(.terminal-toast) {
  position: fixed;
  left: 50%;
  bottom: 128px;
  z-index: 2500;
  max-width: calc(100vw - 40px);
  padding: 10px 16px;
  background: rgba(22, 27, 34, 0.96);
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #f0f6fc;
  font-size: 13px;
  opacity: 0;
  transform: translate(-50%, 12px);
  transition: opacity 0.2s, transform 0.2s;
}

:global(.terminal-toast.show) {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* 移动端输入框 - 默认完全隐藏，点击键盘按钮时临时显示 */
.mobile-input {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: transparent;
  z-index: 1;
  resize: none;
  pointer-events: none;
  transform: translateZ(0);
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
