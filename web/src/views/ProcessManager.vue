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
  <div class="process-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button
          class="tool-btn danger"
          :disabled="!selectedProcess"
          @click="killProcess"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>结束进程</span>
        </button>

        <button class="tool-btn" @click="refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>刷新</span>
        </button>
      </div>

      <div class="toolbar-right">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="searchText"
            type="text"
            placeholder="搜索进程..."
          />
        </div>

        <div class="stats-badge">
          <span class="stats-label">进程数</span>
          <span class="stats-value">{{ filteredProcesses.length }}</span>
        </div>
      </div>
    </div>

    <!-- 进程列表 -->
    <div class="process-list-container">
      <div v-if="loading" class="loading-state">
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
        <p>暂无进程</p>
      </div>

      <table v-else class="process-table">
        <thead>
          <tr>
            <th class="col-select"></th>
            <th class="col-name">名称</th>
            <th class="col-pid">PID</th>
            <th class="col-cpu">CPU</th>
            <th class="col-mem">内存</th>
            <th class="col-status">状态</th>
            <th class="col-title">窗口标题</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(process, index) in filteredProcesses"
            :key="process.pid"
            class="process-row"
            :class="{ 'selected': selectedProcess?.pid === process.pid, 'system': isSystemProcess(process.name) }"
            @click="selectProcess(process)"
          >
            <td class="col-select">
              <div class="radio-indicator" :class="{ 'checked': selectedProcess?.pid === process.pid }"></div>
            </td>
            <td class="col-name">
              <div class="process-info">
                <svg class="process-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                <span class="process-name-text">{{ process.name }}</span>
              </div>
            </td>
            <td class="col-pid">{{ process.pid }}</td>
            <td class="col-cpu">
              <div class="cpu-bar">
                <div class="cpu-fill" :style="{ width: Math.min(process.cpu || 0, 100) + '%' }" :class="getCpuClass(process.cpu)"></div>
                <span class="cpu-text">{{ (process.cpu || 0).toFixed(1) }}%</span>
              </div>
            </td>
            <td class="col-mem">{{ process.memory?.toFixed(1) }} MB</td>
            <td class="col-status">
              <span class="status-badge" :class="process.status === 'Running' ? 'running' : 'suspended'">
                {{ process.status === 'Running' ? '运行中' : '无响应' }}
              </span>
            </td>
            <td class="col-title">{{ process.title || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = '/api'
const token = localStorage.getItem('auth_token') || 'REDACTED_TOKEN'

const processes = ref([])
const loading = ref(false)
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

function selectProcess(process) {
  selectedProcess.value = process
}

async function killProcess() {
  if (!selectedProcess.value) return

  const { pid, name } = selectedProcess.value

  if (!confirm(`确定要结束进程 "${name}" (PID: ${pid}) 吗？`)) {
    return
  }

  try {
    await axios.post(`${API_BASE}/processes/kill`,
      { pid },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    await loadProcesses()
  } catch (error) {
    console.error('结束进程失败:', error)
    alert('结束进程失败: ' + error.message)
  }
}

function refresh() {
  loadProcesses()
}

function isSystemProcess(name) {
  return systemProcesses.some(sp =>
    name?.toLowerCase().includes(sp.toLowerCase())
  )
}

function getCpuClass(cpu) {
  if (!cpu || cpu < 10) return 'low'
  if (cpu < 50) return 'medium'
  return 'high'
}

let refreshTimer = null

onMounted(() => {
  loadProcesses()
  refreshTimer = setInterval(() => loadProcesses(true), 5000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.process-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: #30363d;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.danger {
  background: rgba(248, 81, 73, 0.15);
  border-color: rgba(248, 81, 73, 0.3);
  color: #f85149;
}

.tool-btn.danger:hover:not(:disabled) {
  background: rgba(248, 81, 73, 0.25);
}

.tool-btn svg {
  width: 16px;
  height: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  width: 200px;
}

.search-box svg {
  width: 14px;
  height: 14px;
  color: #8b949e;
}

.search-box input {
  flex: 1;
  height: 32px;
  background: transparent;
  border: none;
  color: #c9d1d9;
  font-size: 13px;
  outline: none;
}

.search-box input::placeholder {
  color: #6e7681;
}

.stats-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #21262d;
  border-radius: 6px;
}

.stats-label {
  font-size: 12px;
  color: #8b949e;
}

.stats-value {
  font-size: 14px;
  font-weight: 600;
  color: #58a6ff;
}

.process-list-container {
  flex: 1;
  overflow: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6e7681;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  opacity: 0.3;
}

.process-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.process-table thead {
  position: sticky;
  top: 0;
  background: #161b22;
  z-index: 10;
}

.process-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  color: #8b949e;
  border-bottom: 1px solid #30363d;
  white-space: nowrap;
}

.process-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #21262d;
  color: #c9d1d9;
}

.process-row {
  cursor: pointer;
  transition: background 0.15s;
}

.process-row:hover {
  background: rgba(88, 166, 255, 0.05);
}

.process-row.selected {
  background: rgba(88, 166, 255, 0.1);
}

.process-row.system .process-name-text {
  color: #8b949e;
}

.col-select {
  width: 40px;
  padding-right: 0 !important;
}

.radio-indicator {
  width: 16px;
  height: 16px;
  border: 2px solid #484f58;
  border-radius: 50%;
  transition: all 0.2s;
}

.radio-indicator.checked {
  border-color: #58a6ff;
  background: #58a6ff;
  box-shadow: inset 0 0 0 3px #0d1117;
}

.col-name {
  width: 100%;
}

.process-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.process-icon {
  width: 18px;
  height: 18px;
  color: #6e7681;
}

.process-name-text {
  color: #f0f6fc;
  font-weight: 500;
}

.col-pid {
  color: #8b949e;
  font-family: 'SF Mono', Monaco, monospace;
}

.cpu-bar {
  position: relative;
  width: 80px;
  height: 20px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
}

.cpu-fill {
  height: 100%;
  transition: width 0.3s;
}

.cpu-fill.low {
  background: #238636;
}

.cpu-fill.medium {
  background: #f0883e;
}

.cpu-fill.high {
  background: #f85149;
}

.cpu-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  color: #f0f6fc;
  font-weight: 500;
}

.col-mem {
  color: #8b949e;
  font-family: 'SF Mono', Monaco, monospace;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.running {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.status-badge.suspended {
  background: rgba(139, 148, 158, 0.15);
  color: #8b949e;
}

.col-title {
  color: #6e7681;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 12px;
  }

  .search-box {
    width: 100%;
    order: 3;
  }

  .process-table {
    font-size: 12px;
  }

  .process-table th,
  .process-table td {
    padding: 8px 12px;
  }

  .col-title,
  .col-mem {
    display: none;
  }

  .cpu-bar {
    width: 60px;
  }
}
</style>
