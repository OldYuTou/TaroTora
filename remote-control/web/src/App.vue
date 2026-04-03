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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const connected = ref(false)

const isLoginPage = computed(() => route.path === '/login')

// 检查是否已登录
function checkAuth() {
  const token = localStorage.getItem('auth_token')
  const serverUrl = localStorage.getItem('server_url')
  
  if (!token || !serverUrl) {
    if (route.path !== '/login') {
      router.push('/login')
    }
    return false
  }
  
  // 设置 axios 默认配置
  axios.defaults.baseURL = serverUrl
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  
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
  
  // 尝试连接 WebSocket
  const token = localStorage.getItem('auth_token')
  if (token) {
    const socket = io('/', {
      autoConnect: false
    })
    
    socket.on('connect', () => {
      connected.value = true
      socket.emit('auth', token)
    })
    
    socket.on('disconnect', () => {
      connected.value = false
    })
    
    // 保存到全局
    window.controlSocket = socket
  }
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
