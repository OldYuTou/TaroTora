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
  <div class="system-monitor">
    <!-- 概览卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon blue">
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
            <div class="stat-value">{{ systemInfo.cpuUsage }}%</div>
            <div class="stat-label">CPU 使用率</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: systemInfo.cpuUsage + '%' }" :class="getProgressClass(systemInfo.cpuUsage)"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18"></path>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatBytes(systemInfo.memoryUsed) }}</div>
            <div class="stat-label">内存使用</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: systemInfo.memoryUsage + '%' }" :class="getProgressClass(systemInfo.memoryUsage)"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2v20M2 12h20"></path>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemInfo.diskUsage }}%</div>
            <div class="stat-label">磁盘使用率</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: systemInfo.diskUsage + '%' }" :class="getProgressClass(systemInfo.diskUsage)"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ systemInfo.uptime }}</div>
            <div class="stat-label">运行时间</div>
          </div>
        </div>
        <div class="uptime-detail">{{ systemInfo.uptimeDetail }}</div>
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="detail-grid">
      <!-- 内存详情 -->
      <div class="detail-card">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"></path>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
          </svg>
          <span>内存详情</span>
        </div>
        <div class="card-body">
          <div class="memory-stats">
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
        </div>
      </div>

      <!-- 磁盘详情 -->
      <div class="detail-card">
        <div class="card-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2v20M2 12h20"></path>
          </svg>
          <span>磁盘分区</span>
        </div>
        <div class="card-body">
          <div v-if="diskPartitions.length === 0" class="empty-state">
            暂无磁盘信息
          </div>
          <div v-else class="disk-list">
            <div v-for="disk in diskPartitions" :key="disk.letter" class="disk-item">
              <div class="disk-info">
                <span class="disk-letter">{{ disk.letter }}</span>
                <div class="disk-bar">
                  <div class="disk-fill" :style="{ width: getDiskPercent(disk) + '%' }" :class="getProgressClass(getDiskPercent(disk))"></div>
                </div>
              </div>
              <div class="disk-stats">
                <span class="disk-used">{{ formatBytes(disk.totalSize - disk.freeSpace) }} / {{ formatBytes(disk.totalSize) }}</span>
                <span class="disk-percent">{{ getDiskPercent(disk) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="system-info-card">
      <div class="card-header">
        <div class="header-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>系统信息</span>
        </div>
        <button class="refresh-btn" @click="refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">操作系统</span>
            <span class="info-value">{{ systemInfo.platform }} {{ systemInfo.arch }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">主机名</span>
            <span class="info-value">{{ systemInfo.hostname }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Node 版本</span>
            <span class="info-value">{{ systemInfo.nodeVersion }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">CPU 型号</span>
            <span class="info-value">{{ systemInfo.cpuModel }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">CPU 核心数</span>
            <span class="info-value">{{ systemInfo.cpuCores }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">当前时间</span>
            <span class="info-value">{{ systemInfo.currentTime }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = '/api'
const token = localStorage.getItem('auth_token')

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
  nodeVersion: '-',
  cpuModel: '-',
  cpuCores: 0,
  currentTime: '-'
})

const diskPartitions = ref([])
let refreshTimer = null

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

function refresh() {
  loadSystemInfo()
  loadDiskInfo()
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

onMounted(() => {
  refresh()
  refreshTimer = setInterval(refresh, 3000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.system-monitor {
  padding: 20px;
  background: #0d1117;
  min-height: 100%;
}

/* 概览卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.blue {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.stat-icon.green {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.stat-icon.orange {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.stat-icon.purple {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #f0f6fc;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #8b949e;
  margin-top: 4px;
}

.progress-bar {
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s, background 0.3s;
}

.progress-fill.success {
  background: #238636;
}

.progress-fill.warning {
  background: #f0883e;
}

.progress-fill.danger {
  background: #f85149;
}

.uptime-detail {
  font-size: 12px;
  color: #6e7681;
  margin-top: 8px;
}

/* 详细信息 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.detail-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: #21262d;
  border-bottom: 1px solid #30363d;
  font-size: 14px;
  font-weight: 600;
  color: #f0f6fc;
}

.card-header svg {
  width: 18px;
  height: 18px;
  color: #58a6ff;
}

.card-body {
  padding: 20px;
}

.memory-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #21262d;
}

.memory-item:last-child {
  border-bottom: none;
}

.memory-item .label {
  color: #8b949e;
  font-size: 13px;
}

.memory-item .value {
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

/* 磁盘列表 */
.empty-state {
  text-align: center;
  color: #6e7681;
  padding: 40px;
}

.disk-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.disk-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.disk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.disk-letter {
  width: 40px;
  height: 40px;
  background: #21262d;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #58a6ff;
  font-size: 14px;
  flex-shrink: 0;
}

.disk-bar {
  flex: 1;
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
}

.disk-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.disk-stats {
  display: flex;
  justify-content: space-between;
  padding-left: 52px;
}

.disk-used {
  font-size: 12px;
  color: #8b949e;
}

.disk-percent {
  font-size: 12px;
  font-weight: 600;
  color: #f0f6fc;
}

/* 系统信息 */
.system-info-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  overflow: hidden;
}

.system-info-card .card-header {
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #30363d;
  border-radius: 6px;
  color: #8b949e;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #484f58;
  color: #c9d1d9;
}

.refresh-btn svg {
  width: 16px;
  height: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid #21262d;
}

.info-label {
  font-size: 12px;
  color: #8b949e;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #f0f6fc;
  word-break: break-all;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .system-monitor {
    padding: 12px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    font-size: 24px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
