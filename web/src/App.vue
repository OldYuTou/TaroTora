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
  <div class="app-container">
    <!-- 桌面端侧边栏 -->
    <aside v-if="!isMobile && !isLoginPage" class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span class="logo-text">TaroTora</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in desktopNavItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ 'active': $route.path === item.path }"
        >
          <div class="nav-icon" v-html="item.icon"></div>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="connection-status" :class="{ 'connected': connected }">
          <span class="status-dot"></span>
          <span class="status-text">{{ connected ? '已连接' : '未连接' }}</span>
        </div>
        <button class="logout-btn" @click="logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>退出</span>
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main
      class="main-content"
      :class="{
        'login-page': isLoginPage,
        'has-mobile-nav': isMobile && !isLoginPage,
        'mobile-control-page': isMobile && isControlMobilePage
      }"
    >
      <!-- 消息通知容器 -->
      <div v-if="notifications.length > 0" class="notification-container">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="notification.type"
          @click="removeNotification(notification.id)"
        >
          <div class="notification-icon">
            <svg v-if="notification.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else-if="notification.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <svg v-else-if="notification.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
          </div>
          <button class="notification-close" @click.stop="removeNotification(notification.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <keep-alive>
        <router-view />
      </keep-alive>
    </main>

    <!-- 移动端底部导航 -->
    <nav v-if="isMobile && !isLoginPage" class="mobile-tab-bar">
      <router-link
        v-for="item in mobileNavItems"
        :key="item.path"
        :to="item.path"
        class="tab-item"
        :class="{ 'active': isActiveTab(item.path) }"
      >
        <div class="tab-icon" v-html="item.icon"></div>
        <span class="tab-label">{{ item.name }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'
import { normalizeServerUrl } from './utils/serverUrl'

const router = useRouter()
const route = useRoute()
const connected = ref(false)
const isMobile = ref(window.innerWidth <= 768)
const notifications = ref([])

const isLoginPage = computed(() => route.path === '/login')
const isControlMobilePage = computed(() => route.path === '/control-mobile' || route.path === '/terminal')

// 桌面端导航
const desktopNavItems = [
  {
    name: '文件管理',
    path: '/files',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
  },
  {
    name: '进程管理',
    path: '/processes',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>'
  },
  {
    name: '系统监控',
    path: '/monitor',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>'
  },
  {
    name: '终端',
    path: '/terminal',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>'
  }
]

// 移动端底部导航
const mobileNavItems = [
  {
    name: '文件',
    path: '/files-mobile',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
  },
  {
    name: '控制',
    path: '/control-mobile',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>'
  },
  {
    name: '设置',
    path: '/settings',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
  }
]

// 判断当前Tab是否激活
function isActiveTab(path) {
  if (path === '/control-mobile') {
    return route.path === '/control-mobile' || route.path === '/terminal'
  }
  if (path === '/processes-mobile') {
    return route.path === '/processes-mobile' || route.path === '/monitor'
  }
  if (path === '/files-mobile') {
    return route.path === '/files-mobile' || route.path === '/files'
  }
  return route.path === path
}

let socket = null

// 震动反馈
function vibrateFeedback(pattern = [50, 100, 50]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// 添加通知
function addNotification(data) {
  const id = Date.now()
  const notification = {
    id,
    ...data,
    time: new Date().toLocaleTimeString()
  }
  notifications.value.unshift(notification)

  if (notifications.value.length > 5) {
    notifications.value = notifications.value.slice(0, 5)
  }

  if (!document.hidden) {
    vibrateFeedback()
  }

  setTimeout(() => {
    removeNotification(id)
  }, 5000)
}

// 移除通知
function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

function connectSocket() {
  const token = localStorage.getItem('auth_token')
  const serverUrl = normalizeServerUrl(localStorage.getItem('server_url') || '')

  if (!token || !serverUrl) return
  localStorage.setItem('server_url', serverUrl)

  if (window.controlSocket?.connected) {
    connected.value = true
    return
  }

  if (socket) socket.disconnect()

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('WebSocket connected')
    connected.value = true
    socket.emit('auth', token)
  })

  socket.on('auth', (status) => {
    if (status === 'success') {
      connected.value = true
    }
  })

  socket.on('notification', (data) => {
    console.log('收到通知:', data)
    addNotification(data)
  })

  socket.on('disconnect', () => {
    connected.value = false
  })

  socket.on('connect_error', () => {
    connected.value = false
  })

  window.controlSocket = socket

  if (socket.connected) {
    connected.value = true
  }
}

function checkAuth() {
  const token = localStorage.getItem('auth_token')
  let serverUrl = normalizeServerUrl(localStorage.getItem('server_url') || '')

  if (!token || !serverUrl) {
    if (route.path !== '/login') {
      router.push('/login')
    }
    return false
  }

  const currentHost = window.location.hostname
  if (currentHost === '127.0.0.1' && serverUrl.includes('localhost')) {
    serverUrl = serverUrl.replace('localhost', '127.0.0.1')
  }

  axios.defaults.baseURL = serverUrl
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

  localStorage.setItem('server_url', serverUrl)

  connectSocket()

  return true
}

function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('server_url')
  router.push('/login')
}

function handleResize() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkAuth()
  handleResize()
  window.addEventListener('resize', handleResize)

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

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
/* Termius 风格配色变量 */
:root {
  --termius-bg: #0d1117;
  --termius-sidebar: #161b22;
  --termius-card: #21262d;
  --termius-border: #30363d;
  --termius-text: #c9d1d9;
  --termius-text-secondary: #8b949e;
  --termius-accent: #58a6ff;
  --termius-accent-hover: #79c0ff;
  --termius-success: #238636;
  --termius-warning: #f0883e;
  --termius-danger: #da3633;
  --termius-terminal-bg: #0d1117;
  --mobile-nav-height: 64px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--termius-bg);
  color: var(--termius-text);
}

.app-container {
  display: flex;
  height: 100vh;
  background: var(--termius-bg);
}

/* 桌面端侧边栏 */
.sidebar {
  width: 240px;
  background: var(--termius-sidebar);
  border-right: 1px solid var(--termius-border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--termius-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: var(--termius-accent);
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--termius-text);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--termius-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--termius-card);
  color: var(--termius-text);
}

.nav-item.active {
  background: rgba(88, 166, 255, 0.15);
  color: var(--termius-accent);
}

.nav-icon {
  width: 20px;
  height: 20px;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
}

.nav-text {
  font-size: 14px;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--termius-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--termius-card);
  font-size: 12px;
  color: var(--termius-text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--termius-danger);
}

.connection-status.connected .status-dot {
  background: var(--termius-success);
  box-shadow: 0 0 8px var(--termius-success);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--termius-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(218, 54, 51, 0.15);
  color: var(--termius-danger);
}

.logout-btn svg {
  width: 16px;
  height: 16px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: auto;
  background: var(--termius-bg);
  min-height: 0;
}

.main-content.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-content.has-mobile-nav {
  padding-bottom: var(--mobile-nav-height);
  overflow: hidden;
}

.main-content.mobile-control-page {
  height: calc(100vh - var(--mobile-nav-height));
  padding-bottom: 0;
}

/* 移动端底部导航 */
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--mobile-nav-height);
  background: var(--termius-sidebar);
  border-top: 1px solid var(--termius-border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 16px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 1000;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  color: var(--termius-text-secondary);
  text-decoration: none;
  transition: all 0.2s;
  border-radius: 8px;
  min-width: 64px;
}

.tab-item:hover {
  color: var(--termius-text);
}

.tab-item.active {
  color: var(--termius-accent);
}

.tab-icon {
  width: 24px;
  height: 24px;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
}

/* 消息通知 */
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.3s ease;
  cursor: pointer;
  transition: all 0.2s;
}

.notification-item:hover {
  transform: translateX(-4px);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-item.success {
  border-left: 3px solid #238636;
}

.notification-item.warning {
  border-left: 3px solid #f0883e;
}

.notification-item.error {
  border-left: 3px solid #f85149;
}

.notification-item.info {
  border-left: 3px solid #58a6ff;
}

.notification-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.notification-item.success .notification-icon {
  color: #3fb950;
}

.notification-item.warning .notification-icon {
  color: #f0883e;
}

.notification-item.error .notification-icon {
  color: #f85149;
}

.notification-item.info .notification-icon {
  color: #58a6ff;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 2px;
}

.notification-message {
  font-size: 12px;
  color: #8b949e;
  line-height: 1.4;
}

.notification-close {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #6e7681;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-close:hover {
  color: #c9d1d9;
}

.notification-close svg {
  width: 14px;
  height: 14px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .notification-item {
    padding: 12px;
  }
}
</style>
