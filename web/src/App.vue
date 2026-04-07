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
  <el-container class="app-container">
    <!-- 侧边栏导航 - 只在非登录页面显示 -->
    <el-aside v-if="!isLoginPage" width="200px" class="sidebar">
      <div class="logo">
        <el-icon><Monitor /></el-icon>
        <span>远程控制</span>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        class="nav-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/files">
          <el-icon><Folder /></el-icon>
          <span>文件管理</span>
        </el-menu-item>
        
        <el-menu-item index="/processes">
          <el-icon><Cpu /></el-icon>
          <span>进程管理</span>
        </el-menu-item>
        
        <el-menu-item index="/monitor">
          <el-icon><TrendCharts /></el-icon>
          <span>系统监控</span>
        </el-menu-item>
        
        <el-menu-item index="/terminal">
          <el-icon><Terminal /></el-icon>
          <span>终端</span>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <div class="connection-status">
          <el-tag :type="connected ? 'success' : 'danger'" size="small">
            {{ connected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
        <el-button type="danger" size="small" class="logout-btn" @click="logout">
          <el-icon><SwitchButton /></el-icon> 退出
        </el-button>
      </div>
    </el-aside>
    
    <!-- 主内容区 -->
    <el-main :class="['main-content', { 'login-page': isLoginPage }]">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const connected = ref(false)

const isLoginPage = computed(() => route.path === '/login')

let socket = null

// 连接 WebSocket
function connectSocket() {
  const token = localStorage.getItem('auth_token')
  const serverUrl = localStorage.getItem('server_url')

  if (!token || !serverUrl) return

  // 如果已有全局连接且已连接，直接更新状态
  if (window.controlSocket?.connected) {
    connected.value = true
    return
  }

  // 断开旧连接
  if (socket) {
    socket.disconnect()
  }

  socket = io(serverUrl, {
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('WebSocket connected')
    connected.value = true
    socket.emit('auth', token)
  })

  socket.on('auth', (status) => {
    console.log('Auth status:', status)
    if (status === 'success') {
      connected.value = true
    }
  })

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected')
    connected.value = false
  })

  socket.on('connect_error', (err) => {
    console.error('WebSocket error:', err)
    connected.value = false
  })

  // 保存到全局
  window.controlSocket = socket

  // 如果已经连接（快速连接情况），立即更新状态
  if (socket.connected) {
    connected.value = true
  }
}

// 检查是否已登录
function checkAuth() {
  const token = localStorage.getItem('auth_token')
  let serverUrl = localStorage.getItem('server_url')

  if (!token || !serverUrl) {
    if (route.path !== '/login') {
      router.push('/login')
    }
    return false
  }

  // 处理 localhost 和 127.0.0.1 不一致的问题
  const currentHost = window.location.hostname
  if (currentHost === '127.0.0.1' && serverUrl.includes('localhost')) {
    serverUrl = serverUrl.replace('localhost', '127.0.0.1')
  } else if (currentHost === 'localhost' && serverUrl.includes('127.0.0.1')) {
    // 保持原样
  }

  // 设置 axios 默认配置
  axios.defaults.baseURL = serverUrl
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

  // 更新 localStorage 中的地址
  localStorage.setItem('server_url', serverUrl)

  // 连接 WebSocket
  connectSocket()

  return true
}

// 退出登录
function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('server_url')
  ElMessage.success('已退出登录')
  router.push('/login')
}

onMounted(() => {
  checkAuth()

  // 路由守卫
  router.beforeEach((to, from, next) => {
    if (to.path === '/login') {
      next()
    } else {
      const isAuth = checkAuth()
      if (isAuth) {
        next()
      } else {
        next('/login')
      }
    }
  })
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  height: 100vh;
}

.sidebar {
  background: #304156;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
}

.logo .el-icon {
  font-size: 24px;
  margin-right: 10px;
}

.nav-menu {
  flex: 1;
  border-right: none;
}

.sidebar-footer {
  padding: 15px;
  border-top: 1px solid #1f2d3d;
}

.connection-status {
  text-align: center;
  margin-bottom: 10px;
}

.logout-btn {
  width: 100%;
}

.main-content {
  padding: 0;
  background: #f0f2f5;
  overflow: auto;
}

.main-content.login-page {
  padding: 0;
  background: transparent;
}
</style>
