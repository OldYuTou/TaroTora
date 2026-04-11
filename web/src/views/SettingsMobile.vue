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
  <div class="settings-mobile">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>设置</span>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 版本信息卡片 -->
      <div class="settings-card">
        <div class="card-title">版本信息</div>
        <div class="version-info">
          <div class="version-row">
            <span class="version-label">当前版本</span>
            <span class="version-value">{{ currentVersion }}</span>
          </div>
          <div class="version-row" v-if="latestVersion">
            <span class="version-label">最新版本</span>
            <span class="version-value" :class="{ 'has-update': hasUpdate }">{{ latestVersion }}</span>
          </div>
          <div class="version-status" v-if="checking">
            <div class="spinner-small"></div>
            <span>正在检查更新...</span>
          </div>
          <div class="version-status" v-else-if="hasUpdate">
            <span class="update-badge">有新版本</span>
          </div>
          <div class="version-status" v-else-if="checked">
            <span class="up-to-date">已是最新版本</span>
          </div>
        </div>
        <button class="settings-btn primary" @click="checkUpdate" :disabled="checking">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>{{ checking ? '检查中...' : '检查更新' }}</span>
        </button>
        <button v-if="hasUpdate" class="settings-btn update" @click="downloadUpdate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>下载更新</span>
        </button>
      </div>

      <!-- 系统监控卡片 -->
      <div class="settings-card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          系统监控
        </div>
        <div class="monitor-grid">
          <div class="monitor-item">
            <div class="monitor-icon cpu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="14" x2="23" y2="14"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="14" x2="4" y2="14"></line>
              </svg>
            </div>
            <div class="monitor-info">
              <span class="monitor-value">{{ systemInfo.cpuUsage }}%</span>
              <span class="monitor-label">CPU</span>
            </div>
            <div class="monitor-bar">
              <div class="monitor-fill" :style="{ width: systemInfo.cpuUsage + '%' }" :class="getProgressClass(systemInfo.cpuUsage)"></div>
            </div>
          </div>

          <div class="monitor-item">
            <div class="monitor-icon memory">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"></path>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
              </svg>
            </div>
            <div class="monitor-info">
              <span class="monitor-value">{{ formatBytes(systemInfo.memoryUsed) }}</span>
              <span class="monitor-label">内存</span>
            </div>
            <div class="monitor-bar">
              <div class="monitor-fill" :style="{ width: systemInfo.memoryUsage + '%' }" :class="getProgressClass(systemInfo.memoryUsage)"></div>
            </div>
          </div>

          <div class="monitor-item">
            <div class="monitor-icon disk">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2v20M2 12h20"></path>
              </svg>
            </div>
            <div class="monitor-info">
              <span class="monitor-value">{{ systemInfo.diskUsage }}%</span>
              <span class="monitor-label">磁盘</span>
            </div>
            <div class="monitor-bar">
              <div class="monitor-fill" :style="{ width: systemInfo.diskUsage + '%' }" :class="getProgressClass(systemInfo.diskUsage)"></div>
            </div>
          </div>

          <div class="monitor-item">
            <div class="monitor-icon uptime">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="monitor-info">
              <span class="monitor-value">{{ systemInfo.uptime }}</span>
              <span class="monitor-label">运行时间</span>
            </div>
          </div>
        </div>
        <div class="monitor-details" v-if="systemInfo.platform !== '-'">
          <div class="detail-item">
            <span class="detail-label">系统</span>
            <span class="detail-value">{{ systemInfo.platform }} {{ systemInfo.arch }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">主机名</span>
            <span class="detail-value">{{ systemInfo.hostname }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">内存</span>
            <span class="detail-value">{{ formatBytes(systemInfo.memoryUsed) }} / {{ formatBytes(systemInfo.memoryTotal) }}</span>
          </div>
        </div>
      </div>

      <!-- 调试设置卡片 -->
      <div class="settings-card">
        <div class="card-title">调试设置</div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">显示调试信息</span>
            <span class="setting-desc">在控制页面显示终端调试日志</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="showDebugInfo" @change="saveDebugSetting">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- 服务器信息卡片 -->
      <div class="settings-card">
        <div class="card-title">服务器信息</div>
        <div class="server-info">
          <div class="info-row">
            <span class="info-label">服务器地址</span>
            <span class="info-value">{{ serverUrl }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">连接状态</span>
            <span class="info-value" :class="{ connected: connected, disconnected: !connected }">
              {{ connected ? '已连接' : '未连接' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 账户操作卡片 -->
      <div class="settings-card">
        <div class="card-title">账户</div>
        <button class="settings-btn danger" @click="logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>退出登录</span>
        </button>
      </div>

      <!-- 关于卡片 -->
      <div class="settings-card">
        <div class="card-title">关于</div>
        <div class="about-info">
          <div class="about-row">
            <span class="about-label">应用名称</span>
            <span class="about-value">TaroTora</span>
          </div>
          <div class="about-row">
            <span class="about-label">开发者</span>
            <span class="about-value">OldYuTou</span>
          </div>
          <div class="about-row">
            <span class="about-label">许可证</span>
            <span class="about-value">AGPL v3</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 更新下载对话框 -->
    <div v-if="downloadDialogVisible" class="modal-overlay" @click.self="cancelDownload">
      <div class="modal-content download-modal">
        <div class="modal-header">
          <h3>下载更新</h3>
          <button class="close-btn" @click="cancelDownload">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body download-body">
          <div class="download-info">
            <div class="download-version">{{ latestVersion }}</div>
            <div class="download-size" v-if="apkSize">{{ formatSize(apkSize) }}</div>
          </div>
          <div class="download-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: downloadProgress + '%' }"></div>
            </div>
            <div class="progress-text">{{ downloadProgress }}%</div>
          </div>
          <div class="download-status">{{ downloadStatus }}</div>
          <div v-if="downloadProgress === 100" class="download-actions">
            <button class="install-btn" @click="installApk">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M2 12h20"></path>
              </svg>
              <span>立即安装</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 当前版本号
const currentVersion = ref('1.4.2')
const latestVersion = ref('')
const hasUpdate = ref(false)
const checking = ref(false)
const checked = ref(false)
const serverUrl = ref(localStorage.getItem('server_url') || '')
const connected = ref(false)

// 下载相关
const downloadDialogVisible = ref(false)
const downloadProgress = ref(0)
const downloadStatus = ref('')
const apkSize = ref(0)
const API_BASE = '/api'
const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

// 系统监控数据
const systemInfo = ref({
  cpuUsage: 0,
  memoryTotal: 0,
  memoryUsed: 0,
  memoryFree: 0,
  memoryUsage: 0,
  diskUsage: 0,
  uptime: '-',
  platform: '-',
  arch: '-',
  hostname: '-'
})
let monitorTimer = null

// 调试设置
const showDebugInfo = ref(false)

// 加载调试设置
function loadDebugSetting() {
  const saved = localStorage.getItem('show_debug_info')
  showDebugInfo.value = saved === 'true'
}

// 保存调试设置
function saveDebugSetting() {
  localStorage.setItem('show_debug_info', showDebugInfo.value.toString())
  showToast(showDebugInfo.value ? '调试信息已开启' : '调试信息已关闭')
}

// 加载系统监控数据
async function loadSystemInfo() {
  try {
    const res = await axios.get(`${API_BASE}/system/info`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    })
    const data = res.data
    systemInfo.value = {
      cpuUsage: data.cpuUsage || 0,
      memoryTotal: data.memoryTotal || 0,
      memoryUsed: data.memoryUsed || 0,
      memoryFree: data.memoryFree || 0,
      memoryUsage: data.memoryUsage || 0,
      diskUsage: data.diskUsage || 0,
      uptime: data.uptime || '-',
      platform: data.platform || '-',
      arch: data.arch || '-',
      hostname: data.hostname || '-'
    }
  } catch (error) {
    console.error('加载系统信息失败:', error)
  }
}

// 获取进度条颜色
function getProgressClass(percentage) {
  if (percentage < 50) return 'success'
  if (percentage < 80) return 'warning'
  return 'danger'
}

// 格式化字节
function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 检查更新
async function checkUpdate() {
  checking.value = true
  checked.value = false

  try {
    const response = await axios.get(`${API_BASE}/app/version`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    })

    if (response.data) {
      latestVersion.value = response.data.version
      apkSize.value = response.data.size || 0

      // 比较版本号
      if (compareVersion(response.data.version, currentVersion.value) > 0) {
        hasUpdate.value = true
      } else {
        hasUpdate.value = false
      }
    }

    checked.value = true
  } catch (error) {
    console.error('检查更新失败:', error)
    showToast('检查更新失败')
  } finally {
    checking.value = false
  }
}

// 比较版本号
function compareVersion(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0
    const b = parts2[i] || 0
    if (a > b) return 1
    if (a < b) return -1
  }
  return 0
}

// 存储下载的APK数据
let downloadedApkData = null

// 下载更新
async function downloadUpdate() {
  downloadDialogVisible.value = true
  downloadProgress.value = 0
  downloadStatus.value = '准备下载...'

  try {
    const response = await axios.get(`${API_BASE}/app/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          downloadProgress.value = percent
          downloadStatus.value = `正在下载... ${percent}%`
        }
      }
    })

    downloadStatus.value = '下载完成，点击安装按钮保存APK'
    downloadedApkData = response.data
  } catch (error) {
    console.error('下载失败:', error)
    downloadStatus.value = '下载失败'
    showToast('下载失败')
  }
}

// 存储下载的APK Blob URL
let downloadedApkBlobUrl = null

// 检测是否为小米手机
function isXiaomi() {
  const userAgent = navigator.userAgent.toLowerCase()
  return /xiaomi|miui|redmi/.test(userAgent)
}

// 安装APK
async function installApk() {
  try {
    downloadStatus.value = '准备安装...'

    // 检查是否在 Capacitor 环境中
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Installer) {
      const downloadUrl = `${API_BASE}/app/download`

      try {
        const result = await window.Capacitor.Plugins.Installer.installApk({
          url: downloadUrl,
          fileName: `TaroTora-v${latestVersion.value}.apk`,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (result.needPermission) {
          showToast('请允许安装未知来源应用，然后再次点击安装')
          downloadStatus.value = '需要安装权限 - 请授权后重试'
        } else if (result.status === 'downloading') {
          showToast('开始下载更新...')
          downloadStatus.value = '正在下载APK...'
        } else if (result.success) {
          showToast('安装程序已启动')
          downloadStatus.value = '安装程序已启动'
        }
      } catch (error) {
        console.error('调用安装插件失败:', error)

        // 如果插件调用失败，尝试使用浏览器下载
        if (downloadedApkData) {
          downloadStatus.value = '尝试使用浏览器下载...'
          fallbackDownload()
        } else {
          throw error
        }
      }
    } else {
      // 降级方案：使用浏览器下载
      fallbackDownload()
    }
  } catch (error) {
    console.error('安装失败:', error)
    downloadStatus.value = '安装失败: ' + (error.message || '未知错误')
    showToast('安装失败: ' + (error.message || '未知错误'))
  }
}

// 降级下载方案
function fallbackDownload() {
  if (!downloadedApkData) {
    showToast('未找到下载的APK文件')
    return
  }

  const blob = new Blob([downloadedApkData], { type: 'application/vnd.android.package-archive' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `TaroTora-v${latestVersion.value}.apk`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)

  downloadStatus.value = 'APK已保存到下载目录，请手动安装'
  showToast('APK已保存，请在下载目录中点击安装')
}

function cancelDownload() {
  downloadDialogVisible.value = false
}

// 退出登录
function logout() {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('server_url')
    router.push('/login')
  }
}

// 格式化大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Toast 提示
function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'settings-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.classList.add('show'), 10)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => document.body.removeChild(toast), 300)
  }, 2000)
}

// 检查连接状态
function checkConnection() {
  connected.value = window.controlSocket?.connected || false
}

onMounted(() => {
  checkConnection()
  // 自动检查更新
  checkUpdate()
  // 加载系统监控数据
  loadSystemInfo()
  // 定时刷新系统监控
  monitorTimer = setInterval(loadSystemInfo, 5000)
  // 加载调试设置
  loadDebugSetting()
})

onUnmounted(() => {
  if (monitorTimer) {
    clearInterval(monitorTimer)
  }
})
</script>

<style scoped>
.settings-mobile {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  padding-bottom: 70px;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
}

.header-title svg {
  width: 24px;
  height: 24px;
  color: #58a6ff;
}

/* 设置内容 */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

/* 版本信息 */
.version-info {
  margin-bottom: 16px;
}

.version-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #21262d;
}

.version-row:last-child {
  border-bottom: none;
}

/* 系统监控样式 */
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title svg {
  width: 18px;
  height: 18px;
  color: #58a6ff;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.monitor-item {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.monitor-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.monitor-icon svg {
  width: 20px;
  height: 20px;
}

.monitor-icon.cpu {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.monitor-icon.memory {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.monitor-icon.disk {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.monitor-icon.uptime {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.monitor-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.monitor-value {
  font-size: 18px;
  font-weight: 700;
  color: #f0f6fc;
}

.monitor-label {
  font-size: 12px;
  color: #8b949e;
}

.monitor-bar {
  height: 4px;
  background: #21262d;
  border-radius: 2px;
  overflow: hidden;
}

.monitor-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.monitor-fill.success {
  background: #238636;
}

.monitor-fill.warning {
  background: #f0883e;
}

.monitor-fill.danger {
  background: #f85149;
}

.monitor-details {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 12px;
  color: #8b949e;
}

.detail-value {
  font-size: 12px;
  color: #c9d1d9;
  font-weight: 500;
}

.version-label {
  color: #8b949e;
  font-size: 14px;
}

.version-value {
  color: #c9d1d9;
  font-size: 14px;
  font-weight: 500;
}

.version-value.has-update {
  color: #3fb950;
}

.version-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.update-badge {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.up-to-date {
  color: #6e7681;
}

/* 服务器信息 */
.server-info, .about-info {
  margin-bottom: 16px;
}

.info-row, .about-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #21262d;
}

.info-row:last-child, .about-row:last-child {
  border-bottom: none;
}

.info-label, .about-label {
  color: #8b949e;
  font-size: 14px;
}

.info-value, .about-value {
  color: #c9d1d9;
  font-size: 14px;
}

.info-value.connected {
  color: #3fb950;
}

.info-value.disconnected {
  color: #f85149;
}

/* 设置按钮 */
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  margin-bottom: 8px;
}

.settings-btn:last-child {
  margin-bottom: 0;
}

.settings-btn svg {
  width: 18px;
  height: 18px;
}

.settings-btn.primary {
  background: #238636;
  color: #fff;
}

.settings-btn.primary:hover:not(:disabled) {
  background: #2ea043;
}

.settings-btn.update {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  border: 1px solid rgba(88, 166, 255, 0.3);
}

.settings-btn.update:hover {
  background: rgba(88, 166, 255, 0.25);
}

.settings-btn.danger {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
  border: 1px solid rgba(248, 81, 73, 0.3);
}

.settings-btn.danger:hover {
  background: rgba(248, 81, 73, 0.25);
}

.settings-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 下载对话框 */
.download-modal {
  max-width: 340px;
}

.download-body {
  padding: 24px;
}

.download-info {
  text-align: center;
  margin-bottom: 20px;
}

.download-version {
  font-size: 18px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 4px;
}

.download-size {
  font-size: 13px;
  color: #8b949e;
}

.download-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #238636, #3fb950);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #c9d1d9;
  font-weight: 500;
}

.download-status {
  text-align: center;
  font-size: 13px;
  color: #8b949e;
}

/* 下载操作按钮 */
.download-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.install-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 32px;
  background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(35, 134, 54, 0.3);
}

.install-btn svg {
  width: 20px;
  height: 20px;
}

.install-btn:hover {
  background: linear-gradient(135deg, #2ea043 0%, #3fb950 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(35, 134, 54, 0.4);
}

.install-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(35, 134, 54, 0.3);
}

/* Toast */
.settings-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #238636;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 3000;
  opacity: 0;
  transition: all 0.3s ease;
}

.settings-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
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

.close-btn:hover {
  color: #c9d1d9;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-item:first-of-type {
  padding-top: 0;
}

.setting-item:last-of-type {
  padding-bottom: 0;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  color: #c9d1d9;
  font-weight: 500;
}

.setting-desc {
  font-size: 12px;
  color: #8b949e;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #30363d;
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #238636;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

input:focus + .slider {
  box-shadow: 0 0 1px #238636;
}
</style>
