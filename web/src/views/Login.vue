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
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h1>TaroTora</h1>
          <p class="subtitle">Remote Control System</p>
          <span class="version-badge">v1.4.11</span>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label>服务器地址</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <input
                v-model="loginForm.server"
                type="text"
                placeholder="http://192.168.1.100:3000"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>访问令牌</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                v-model="loginForm.token"
                :type="showToken ? 'text' : 'password'"
                placeholder="REDACTED_TOKEN"
                required
              />
              <button type="button" class="toggle-btn" @click="showToken = !showToken">
                <svg v-if="showToken" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ error }}
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span v-else>连接服务器</span>
          </button>
        </form>

        <div class="login-tips">
          <div class="tip-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>确保手机和电脑在同一 WiFi 网络下</span>
          </div>
          <div class="tip-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>默认 Token: <code>REDACTED_TOKEN</code></span>
          </div>
        </div>
      </div>

      <div class="login-footer">
        <p>TaroTora Remote Control System</p>
        <p class="copyright">© 2026 OldYuTou · AGPL v3</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import axios from 'axios'
import { getDefaultServerUrl, normalizeServerUrl } from '../utils/serverUrl'

const router = useRouter()
const loading = ref(false)
const showToken = ref(false)
const error = ref('')

const storedServer = localStorage.getItem('server_url') || ''

const loginForm = reactive({
  server: normalizeServerUrl(storedServer) || getDefaultServerUrl(),
  token: localStorage.getItem('auth_token') || 'REDACTED_TOKEN'
})

async function handleLogin() {
  if (!loginForm.server || !loginForm.token) {
    error.value = '请填写完整信息'
    return
  }

  loading.value = true
  error.value = ''
  loginForm.server = normalizeServerUrl(loginForm.server)

  try {
    const response = await axios.get(`${loginForm.server}/health`, {
      headers: { Authorization: `Bearer ${loginForm.token}` },
      timeout: 10000
    })

    if (response.data.status === 'ok') {
      localStorage.setItem('server_url', loginForm.server)
      localStorage.setItem('auth_token', loginForm.token)

      axios.defaults.baseURL = loginForm.server
      axios.defaults.headers.common['Authorization'] = `Bearer ${loginForm.token}`

      const socket = io(loginForm.server, {
        auth: { token: loginForm.token },
        transports: ['websocket', 'polling']
      })

      socket.on('connect', () => {
        window.controlSocket = socket
        // 移动端跳转到控制页面（终端）
        const isMobile = window.innerWidth <= 768
        router.push(isMobile ? '/control-mobile' : '/files')
      })

      socket.on('connect_error', () => {
        error.value = 'WebSocket 连接失败'
        loading.value = false
      })
    }
  } catch (err) {
    console.error('Login error:', err)
    if (err.response?.status === 401) {
      error.value = '访问令牌错误'
    } else if (err.code === 'ECONNABORTED') {
      error.value = '连接超时，请检查服务器地址'
    } else {
      error.value = '无法连接到服务器'
    }
    loading.value = false
  }
}

onMounted(() => {
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
  background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  color: #58a6ff;
}

.logo svg {
  width: 100%;
  height: 100%;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #8b949e;
  font-size: 14px;
  font-weight: 400;
}

.version-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 10px;
  background: rgba(88, 166, 255, 0.15);
  border: 1px solid rgba(88, 166, 255, 0.3);
  border-radius: 12px;
  color: #58a6ff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #c9d1d9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #8b949e;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 42px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #f0f6fc;
  font-size: 14px;
  transition: all 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

.input-wrapper input::placeholder {
  color: #484f58;
}

.toggle-btn {
  position: absolute;
  right: 12px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #8b949e;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  color: #c9d1d9;
}

.toggle-btn svg {
  width: 18px;
  height: 18px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(248, 81, 73, 0.15);
  border: 1px solid rgba(248, 81, 73, 0.3);
  border-radius: 8px;
  color: #f85149;
  font-size: 13px;
}

.error-message svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.login-btn {
  height: 44px;
  background: #238636;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.login-btn:hover:not(:disabled) {
  background: #2ea043;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-tips {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #8b949e;
}

.tip-item svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.tip-item code {
  background: #21262d;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  color: #c9d1d9;
}

.login-footer {
  text-align: center;
  color: #6e7681;
  font-size: 12px;
}

.login-footer p {
  margin: 4px 0;
}

.login-footer .copyright {
  opacity: 0.7;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 24px;
  }

  .login-header h1 {
    font-size: 24px;
  }
}
</style>
