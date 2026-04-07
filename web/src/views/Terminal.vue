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
      <el-button type="primary" @click="createTerminal" :disabled="connected">
        <el-icon><Plus /></el-icon> 新建终端
      </el-button>
      
      <el-button @click="closeTerminal" :disabled="!connected">
        <el-icon><Close /></el-icon> 关闭终端
      </el-button>
      
      <el-button @click="clearTerminal" :disabled="!connected">
        <el-icon><Delete /></el-icon> 清屏
      </el-button>
      
      <div class="terminal-info" v-if="terminalInfo">
        <el-tag type="info" size="small">
          PID: {{ terminalInfo.pid }} | Shell: {{ terminalInfo.shell }}
        </el-tag>
      </div>
    </div>
    
    <!-- 终端容器 -->
    <div ref="terminalContainer" class="terminal-container">
      <div v-if="!connected" class="terminal-placeholder">
        <el-empty description="点击「新建终端」开始连接">
          <template #image>
            <el-icon :size="60"><Terminal /></el-icon>
          </template>
        </el-empty>
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
import { ElMessage } from 'element-plus'

const terminalContainer = ref(null)
const connected = ref(false)
const terminalInfo = ref(null)

let term = null
let fitAddon = null
let socket = null

const token = localStorage.getItem('auth_token') || 'your-secret-token'

// 创建终端
function createTerminal() {
  if (term) {
    term.dispose()
  }
  
  // 初始化 xterm
  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
      black: '#1e1e1e',
      red: '#f48771',
      green: '#89d185',
      yellow: '#dcdcaa',
      blue: '#569cd6',
      magenta: '#c586c0',
      cyan: '#4ec9b0',
      white: '#d4d4d4'
    },
    cols: 80,
    rows: 24
  })
  
  // 添加插件
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())
  
  // 挂载到 DOM
  term.open(terminalContainer.value)
  fitAddon.fit()
  
  // 连接 WebSocket
  connectSocket()
}

// 连接 WebSocket
function connectSocket() {
  socket = io('/', {
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
    ElMessage.success('终端连接成功')
    
    // 绑定输入事件
    term.onData((data) => {
      socket.emit('terminal:input', data)
    })
    
    // 绑定 resize 事件
    term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows })
    })
  })
  
  socket.on('terminal:data', (data) => {
    term.write(data)
  })
  
  socket.on('terminal:exit', ({ exitCode }) => {
    ElMessage.info(`终端退出，代码: ${exitCode}`)
    connected.value = false
  })
  
  socket.on('terminal:error', (error) => {
    ElMessage.error('终端错误: ' + error)
    connected.value = false
  })
  
  socket.on('disconnect', () => {
    connected.value = false
    terminalInfo.value = null
  })
  
  socket.on('connect_error', (error) => {
    console.error('Connection error:', error)
    ElMessage.error('连接失败: ' + error.message)
  })
}

// 关闭终端
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

// 清屏
function clearTerminal() {
  if (term) {
    term.clear()
  }
}

// 窗口大小改变时自适应
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
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
}

.terminal-info {
  margin-left: auto;
}

.terminal-container {
  flex: 1;
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
  padding: 10px;
}

.terminal-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

:deep(.xterm) {
  height: 100%;
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}
</style>
