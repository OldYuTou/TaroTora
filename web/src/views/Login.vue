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
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <el-icon :size="48" class="logo-icon"><Monitor /></el-icon>
        <h1>远程控制</h1>
        <p class="subtitle">Remote Control System</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="server">
          <el-input
            v-model="loginForm.server"
            placeholder="服务器地址 (如: http://localhost:3000)"
            :prefix-icon="Connection"
            size="large"
          />
        </el-form-item>
        
        <el-form-item prop="token">
          <el-input
            v-model="loginForm.token"
            type="password"
            placeholder="访问令牌 (Token)"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-tips">
        <el-alert
          title="首次使用提示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <div>
              默认 Token: <code>your-secret-token</code>
              <br>
              请在被控端的 .env 文件中修改
            </div>
          </template>
        </el-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Monitor, Lock, Connection } from '@element-plus/icons-vue'
import { io } from 'socket.io-client'
import axios from 'axios'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  server: localStorage.getItem('server_url') || '',
  token: localStorage.getItem('auth_token') || ''
})

const loginRules = {
  server: [
    { required: true, message: '请输入服务器地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '地址格式不正确', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入访问令牌', trigger: 'blur' },
    { min: 6, message: '令牌长度不能少于6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  
  try {
    // 测试连接
    const response = await axios.get(`${loginForm.server}/health`, {
      headers: { Authorization: `Bearer ${loginForm.token}` }
    })
    
    if (response.data.status === 'ok') {
      // 保存登录信息
      localStorage.setItem('server_url', loginForm.server)
      localStorage.setItem('auth_token', loginForm.token)
      
      // 设置 axios 默认配置
      axios.defaults.baseURL = loginForm.server
      axios.defaults.headers.common['Authorization'] = `Bearer ${loginForm.token}`

      // 建立 WebSocket 连接
      const socket = io(loginForm.server, {
        transports: ['websocket', 'polling']
      })

      socket.on('connect', () => {
        socket.emit('auth', loginForm.token)
      })

      socket.on('auth', (status) => {
        if (status === 'success') {
          console.log('WebSocket authenticated')
        }
      })

      // 保存到全局
      window.controlSocket = socket

      ElMessage.success('登录成功')
      router.push('/files')
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.response?.status === 401 
      ? '访问令牌错误' 
      : '无法连接到服务器，请检查地址和令牌')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 如果已有登录信息，尝试自动登录
  if (loginForm.server && loginForm.token) {
    handleLogin()
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  color: #667eea;
  margin-bottom: 16px;
}

.login-header h1 {
  font-size: 28px;
  color: #303133;
  margin: 0 0 8px;
}

.subtitle {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.login-tips {
  margin-top: 20px;
}

.login-tips code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

:deep(.el-input__inner) {
  height: 44px;
}
</style>
