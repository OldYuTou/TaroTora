<!--
  TaroTora - Remote Control System
  Copyright (C) 2026 OldYuTou

  移动端进程与系统监控页面 - 合并进程管理和系统监控功能
-->

<template>
  <div class="processes-mobile">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-title">
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
        <span>进程与系统</span>
      </div>
      <button class="refresh-btn" @click="refresh" :class="{ 'spinning': loading }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      </button>
    </div>

    <!-- 系统概览卡片 -->
    <div class="system-overview">
      <div class="stat-card" @click="activeTab = 'cpu'">
        <div class="stat-icon" :class="getCpuClass(systemInfo.cpuUsage)">
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
        <div class="stat-info">
          <div class="stat-value" :class="getCpuClass(systemInfo.cpuUsage)">{{ systemInfo.cpuUsage }}%</div>
          <div class="stat-label">CPU</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon memory">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"></path>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value memory">{{ formatBytes(systemInfo.memoryUsed) }}</div>
          <div class="stat-label">内存 / {{ formatBytes(systemInfo.memoryTotal) }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon disk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2v20M2 12h20"></path>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value disk">{{ systemInfo.diskUsage }}%</div>
          <div class="stat-label">磁盘</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon uptime">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value uptime">{{ systemInfo.uptime }}</div>
          <div class="stat-label">运行时间</div>
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ 'active': activeTab === 'processes' }"
        @click="activeTab = 'processes'"
      >
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
        <span>进程</span>
        <span class="tab-badge" v-if="filteredProcesses.length">{{ filteredProcesses.length }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ 'active': activeTab === 'system' }"
        @click="activeTab = 'system'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>系统</span>
      </button>
      <button
        class="tab-btn"
        :class="{ 'active': activeTab === 'disks' }"
        @click="activeTab = 'disks'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2v20M2 12h20"></path>
        </svg>
        <span>磁盘</span>
      </button>
    </div>

    <!-- 进程列表 -->
    <div v-if="activeTab === 'processes'" class="tab-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索进程..."
        />
        <button v-if="searchText" class="clear-btn" @click="searchText = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 进程列表 -->
      <div v-if="loading && processes.length === 0" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredProcesses.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
        <p>{{ searchText ? '未找到匹配的进程' : '暂无进程' }}</p>
      </div>

      <div v-else class="process-list">
        <div
          v-for="process in filteredProcesses"
          :key="process.pid"
          class="process-item"
          :class="{ 'selected': selectedProcess?.pid === process.pid, 'system': isSystemProcess(process.name) }"
          @click="selectProcess(process)"
        >
          <div class="process-main">
            <div class="process-icon">
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
            <div class="process-info">
              <div class="process-name">{{ process.name }}</div>
              <div class="process-meta">
                <span class="pid">PID: {{ process.pid }}</span>
                <span class="status" :class="process.status === 'Running' ? 'running' : 'suspended'">
                  {{ process.status === 'Running' ? '运行中' : '无响应' }}
                </span>
              </div>
            </div>
          </div>
          <div class="process-stats">
            <div class="stat-cpu">
              <div class="cpu-bar">
                <div class="cpu-fill" :style="{ width: Math.min(process.cpu || 0, 100) + '%' }" :class="getCpuBarClass(process.cpu)"></div>
              </div>
              <span class="cpu-text">{{ (process.cpu || 0).toFixed(1) }}%</span>
            </div>
            <div class="stat-mem">{{ process.memory?.toFixed(1) }} MB</div>
          </div>
          <button
            v-if="selectedProcess?.pid === process.pid"
            class="kill-btn"
            @click.stop="killProcess(process)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div v-if="activeTab === 'system'" class="tab-content">
      <div class="info-card">
        <div class="card-title">系统信息</div>
        <div class="info-list">
          <div class="info-item">
            <span class="label">操作系统</span>
            <span class="value">{{ systemInfo.platform }} {{ systemInfo.arch }}</span>
          </div>
          <div class="info-item">
            <span class="label">主机名</span>
            <span class="value">{{ systemInfo.hostname }}</span>
          </div>
          <div class="info-item">
            <span class="label">CPU 型号</span>
            <span class="value">{{ systemInfo.cpuModel }}</span>
          </div>
          <div class="info-item">
            <span class="label">CPU 核心</span>
            <span class="value">{{ systemInfo.cpuCores }} 核</span>
          </div>
          <div class="info-item">
            <span class="label">运行时间</span>
            <span class="value">{{ systemInfo.uptimeDetail }}</span>
          </div>
          <div class="info-item">
            <span class="label">当前时间</span>
            <span class="value">{{ systemInfo.currentTime }}</span>
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="card-title">内存详情</div>
        <div class="memory-detail">
          <div class="memory-item">
            <span class="label">总内存</span>
            <span class="value">{{ formatBytes(systemInfo.memoryTotal) }}</span>
          </div>
          <div class="memory-item">
            <span class="label">已使用</span>
            <span class="value used">{{ formatBytes(systemInfo.memoryUsed) }}</span>
          </div>
          <div class="memory-item">
            <span class="label">可用</span>
            <span class="value free">{{ formatBytes(systemInfo.memoryFree) }}</span>
          </div>
        </div>
        <div class="memory-bar">
          <div class="memory-fill" :style="{ width: systemInfo.memoryUsage + '%' }" :class="getProgressClass(systemInfo.memoryUsage)"></div>
        </div>
      </div>
    </div>

    <!-- 磁盘信息 -->
    <div v-if="activeTab === 'disks'" class="tab-content">
      <div v-if="diskPartitions.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2v20M2 12h20"></path>
        </svg>
        <p>暂无磁盘信息</p>
      </div>

      <div v-else class="disk-list">
        <div v-for="disk in diskPartitions" :key="disk.letter" class="disk-card">
          <div class="disk-header">
            <span class="disk-letter">{{ disk.letter }}</span>
            <span class="disk-percent" :class="getProgressClass(getDiskPercent(disk))">{{ getDiskPercent(disk) }}%</span>
          </div>
          <div class="disk-bar">
            <div class="disk-fill" :style="{ width: getDiskPercent(disk) + '%' }" :class="getProgressClass(getDiskPercent(disk))"></div>
          </div>
          <div class="disk-stats">
            <span class="disk-used">已用 {{ formatBytes(disk.totalSize - disk.freeSpace) }}</span>
            <span class="disk-total">共 {{ formatBytes(disk.totalSize) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = '/api'
const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

// 标签页状态
const activeTab = ref('processes')
const loading = ref(false)

// 进程相关
const processes = ref([])
const selectedProcess = ref(null)
const searchText = ref('')

const systemProcesses = [
  'System', 'Registry', 'smss', 'csrss', 'wininit', 'services',
  'lsass', 'svchost', 'fontdrvhost', 'WmiPrvSE', 'dllhost',
  'explorer', 'SearchIndexer', 'dwm', 'taskhostw'
]

const filteredProcesses = computed(() => {
  if (!searchText.value) return processes.value
  const search = searchText.value.toLowerCase()
  return processes.value.filter(p =>
    p.name?.toLowerCase().includes(search) ||
    p.title?.toLowerCase().includes(search)
  )
})

// 系统信息相关
const systemInfo = ref({
  cpuUsage: 0,
  memoryTotal: 0,
  memoryUsed: 0,
  memoryFree: 0,
  memoryUsage: 0,
  diskUsage: 0,
  uptime: '-',
  uptimeDetail: '-',
  platform: '-',
  arch: '-',
  hostname: '-',
  cpuModel: '-',
  cpuCores: 0,
  currentTime: '-'
})

const diskPartitions = ref([])

// 加载进程列表
async function loadProcesses(silent = false) {
  if (!silent) {
    loading.value = true
  }
  const selectedPid = selectedProcess.value?.pid
  try {
    const res = await axios.get(`${API_BASE}/processes/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    processes.value = res.data.processes
    if (selectedPid) {
      const stillExists = res.data.processes.find(p => p.pid === selectedPid)
      if (stillExists) {
        selectedProcess.value = stillExists
      } else {
        selectedProcess.value = null
      }
    }
  } catch (error) {
    console.error('加载进程失败:', error)
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

// 加载系统信息
async function loadSystemInfo() {
  try {
    const res = await axios.get(`${API_BASE}/system/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    systemInfo.value = res.data

    const uptime = res.data.uptimeSeconds || 0
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    systemInfo.value.uptime = `${days}天${hours}小时`
    systemInfo.value.uptimeDetail = `${days}天 ${hours}小时 ${minutes}分钟`
  } catch (error) {
    console.error('加载系统信息失败:', error)
  }
}

// 加载磁盘信息
async function loadDiskInfo() {
  try {
    const res = await axios.get(`${API_BASE}/files/drives`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    diskPartitions.value = res.data.drives
  } catch (error) {
    console.error('加载磁盘信息失败:', error)
  }
}

// 选择进程
function selectProcess(process) {
  selectedProcess.value = selectedProcess.value?.pid === process.pid ? null : process
}

// 结束进程
async function killProcess(process) {
  const { pid, name } = process

  if (!confirm(`确定要结束进程 "${name}" (PID: ${pid}) 吗？`)) {
    return
  }

  try {
    await axios.post(`${API_BASE}/processes/kill`,
      { pid },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    selectedProcess.value = null
    await loadProcesses()
  } catch (error) {
    console.error('结束进程失败:', error)
    alert('结束进程失败: ' + error.message)
  }
}

// 刷新所有数据
function refresh() {
  loadProcesses()
  loadSystemInfo()
  loadDiskInfo()
}

// 工具函数
function isSystemProcess(name) {
  return systemProcesses.some(sp =>
    name?.toLowerCase().includes(sp.toLowerCase())
  )
}

function getCpuClass(cpu) {
  if (!cpu || cpu < 30) return 'low'
  if (cpu < 70) return 'medium'
  return 'high'
}

function getCpuBarClass(cpu) {
  if (!cpu || cpu < 10) return 'low'
  if (cpu < 50) return 'medium'
  return 'high'
}

function getProgressClass(percentage) {
  if (percentage < 50) return 'success'
  if (percentage < 80) return 'warning'
  return 'danger'
}

function getDiskPercent(disk) {
  return Math.round(((disk.totalSize - disk.freeSpace) / disk.totalSize) * 100)
}

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 定时刷新
let refreshTimer = null

onMounted(() => {
  refresh()
  refreshTimer = setInterval(() => {
    loadProcesses(true)
    loadSystemInfo()
    loadDiskInfo()
  }, 3000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.processes-mobile {
  height: 100%;
  background: #0d1117;
  overflow-y: auto;
  padding-bottom: 80px;
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

.refresh-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #21262d;
  border-radius: 8px;
  color: #8b949e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #30363d;
  color: #c9d1d9;
}

.refresh-btn.spinning svg {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
}

/* 系统概览 */
.system-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  background: #0d1117;
}

.stat-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-icon.low {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.stat-icon.medium {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.stat-icon.high {
  background: rgba(248, 81, 73, 0.15);
  color: #f85149;
}

.stat-icon.memory {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.stat-icon.disk {
  background: rgba(188, 140, 255, 0.15);
  color: #bc8cff;
}

.stat-icon.uptime {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #f0f6fc;
  line-height: 1.2;
}

.stat-value.low { color: #3fb950; }
.stat-value.medium { color: #f0883e; }
.stat-value.high { color: #f85149; }
.stat-value.memory { color: #58a6ff; }
.stat-value.disk { color: #bc8cff; }
.stat-value.uptime { color: #8b949e; }

.stat-label {
  font-size: 12px;
  color: #8b949e;
  margin-top: 2px;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  background: #0d1117;
  border-bottom: 1px solid #30363d;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #8b949e;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
  color: #58a6ff;
}

.tab-btn svg {
  width: 16px;
  height: 16px;
}

.tab-badge {
  padding: 2px 6px;
  background: #30363d;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* 标签内容 */
.tab-content {
  padding: 16px;
  background: #0d1117;
  min-height: 400px;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  margin-bottom: 16px;
}

.search-bar svg {
  width: 18px;
  height: 18px;
  color: #6e7681;
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  height: 44px;
  background: transparent;
  border: none;
  color: #c9d1d9;
  font-size: 15px;
  outline: none;
}

.search-bar input::placeholder {
  color: #6e7681;
}

.clear-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #6e7681;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6e7681;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.empty-state svg {
  width: 56px;
  height: 56px;
  opacity: 0.3;
}

/* 进程列表 */
.process-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.process-item {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.process-item:active {
  background: rgba(88, 166, 255, 0.05);
}

.process-item.selected {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
}

.process-item.system {
  opacity: 0.8;
}

.process-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.process-icon {
  width: 40px;
  height: 40px;
  background: #21262d;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.process-icon svg {
  width: 20px;
  height: 20px;
  color: #6e7681;
}

.process-info {
  flex: 1;
  min-width: 0;
}

.process-name {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.process-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.pid {
  font-size: 12px;
  color: #6e7681;
  font-family: 'SF Mono', Monaco, monospace;
}

.status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status.running {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.status.suspended {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.process-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.stat-cpu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cpu-bar {
  width: 60px;
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
}

.cpu-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.cpu-fill.low { background: #238636; }
.cpu-fill.medium { background: #f0883e; }
.cpu-fill.high { background: #f85149; }

.cpu-text {
  font-size: 12px;
  color: #f0f6fc;
  font-weight: 500;
  font-family: 'SF Mono', Monaco, monospace;
  min-width: 45px;
  text-align: right;
}

.stat-mem {
  font-size: 12px;
  color: #8b949e;
  font-family: 'SF Mono', Monaco, monospace;
}

.kill-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(248, 81, 73, 0.15);
  border-radius: 8px;
  color: #f85149;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kill-btn svg {
  width: 18px;
  height: 18px;
}

/* 系统信息卡片 */
.info-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #21262d;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 13px;
  color: #8b949e;
}

.info-item .value {
  font-size: 13px;
  font-weight: 500;
  color: #c9d1d9;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

/* 内存详情 */
.memory-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.memory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-item .label {
  font-size: 13px;
  color: #8b949e;
}

.memory-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
  font-family: 'SF Mono', Monaco, monospace;
}

.memory-item .value.used {
  color: #f0883e;
}

.memory-item .value.free {
  color: #3fb950;
}

.memory-bar {
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
}

.memory-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.memory-fill.success { background: #238636; }
.memory-fill.warning { background: #f0883e; }
.memory-fill.danger { background: #f85149; }

/* 磁盘列表 */
.disk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disk-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
}

.disk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.disk-letter {
  width: 40px;
  height: 40px;
  background: #21262d;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #58a6ff;
  font-size: 14px;
}

.disk-percent {
  font-size: 20px;
  font-weight: 700;
}

.disk-percent.success { color: #3fb950; }
.disk-percent.warning { color: #f0883e; }
.disk-percent.danger { color: #f85149; }

.disk-bar {
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.disk-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.disk-fill.success { background: #238636; }
.disk-fill.warning { background: #f0883e; }
.disk-fill.danger { background: #f85149; }

.disk-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.disk-used {
  color: #8b949e;
}

.disk-total {
  color: #6e7681;
}
</style>
