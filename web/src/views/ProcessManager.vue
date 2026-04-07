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
      <el-button type="danger" :disabled="!selectedProcess" @click="killProcess">
        <el-icon><CircleClose /></el-icon> 结束进程
      </el-button>
      
      <el-button @click="refresh">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
      
      <el-input
        v-model="searchText"
        placeholder="搜索进程..."
        style="width: 200px"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      
      <div class="stats">
        进程数: <el-tag>{{ filteredProcesses.length }}</el-tag>
      </div>
    </div>
    
    <!-- 进程列表 -->
    <el-table
      :data="filteredProcesses"
      style="width: 100%"
      highlight-current-row
      @current-change="handleSelect"
      v-loading="loading"
    >
      <el-table-column type="index" width="50" />
      
      <el-table-column label="名称" min-width="200" sortable prop="name">
        <template #default="{ row }">
          <div class="process-name">
            <el-icon><SetUp /></el-icon>
            <span :class="{ 'system-process': isSystemProcess(row.name) }">
              {{ row.name }}
            </span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="PID" width="100" sortable prop="pid" />
      
      <el-table-column label="CPU" width="100" sortable prop="cpu">
        <template #default="{ row }">
          <el-progress
            :percentage="Math.min(row.cpu || 0, 100)"
            :status="getCpuStatus(row.cpu)"
            :stroke-width="8"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="内存" width="120" sortable prop="memory">
        <template #default="{ row }">
          {{ row.memory?.toFixed(1) }} MB
        </template>
      </el-table-column>
      
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'Running' ? 'success' : 'danger'" size="small">
            {{ row.status === 'Running' ? '运行中' : '无响应' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="窗口标题" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.title || '-' }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = '/api'
const token = localStorage.getItem('auth_token') || 'your-secret-token'

const processes = ref([])
const loading = ref(false)
const selectedProcess = ref(null)
const searchText = ref('')

// 系统进程列表
const systemProcesses = [
  'System', 'Registry', 'smss', 'csrss', 'wininit', 'services',
  'lsass', 'svchost', 'fontdrvhost', 'WmiPrvSE', 'dllhost',
  'explorer', 'SearchIndexer', 'dwm', 'taskhostw'
]

// 过滤后的进程列表
const filteredProcesses = computed(() => {
  if (!searchText.value) return processes.value
  const search = searchText.value.toLowerCase()
  return processes.value.filter(p => 
    p.name?.toLowerCase().includes(search) ||
    p.title?.toLowerCase().includes(search)
  )
})

// 加载进程列表
async function loadProcesses(silent = false) {
  if (!silent) {
    loading.value = true
  }
  // 保存当前选中的进程 PID
  const selectedPid = selectedProcess.value?.pid
  try {
    const res = await axios.get(`${API_BASE}/processes/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    processes.value = res.data.processes
    // 刷新后恢复选中状态
    if (selectedPid) {
      const stillExists = res.data.processes.find(p => p.pid === selectedPid)
      if (stillExists) {
        selectedProcess.value = stillExists
      } else {
        // 进程已结束，清空选中
        selectedProcess.value = null
      }
    }
  } catch (error) {
    console.error('加载进程失败:', error)
    if (!silent) {
      ElMessage.error('加载进程列表失败')
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

// 选择进程
function handleSelect(row) {
  selectedProcess.value = row
}

// 结束进程
async function killProcess() {
  if (!selectedProcess.value) return
  
  const { pid, name } = selectedProcess.value
  
  try {
    await ElMessageBox.confirm(
      `确定要结束进程 "${name}" (PID: ${pid}) 吗？`,
      '确认结束进程',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await axios.post(`${API_BASE}/processes/kill`, 
      { pid },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    ElMessage.success('进程已结束')
    await loadProcesses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('结束进程失败:', error)
      ElMessage.error('结束进程失败: ' + error.message)
    }
  }
}

// 刷新
function refresh() {
  loadProcesses()
}

// 工具函数
function isSystemProcess(name) {
  return systemProcesses.some(sp => 
    name?.toLowerCase().includes(sp.toLowerCase())
  )
}

function getCpuStatus(cpu) {
  if (!cpu || cpu < 10) return 'success'
  if (cpu < 50) return ''
  return 'exception'
}

// 自动刷新
let refreshTimer = null

onMounted(() => {
  loadProcesses()
  // 每 5 秒自动刷新（静默模式，不显示 loading）
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
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #fff;
  border-radius: 4px;
}

.stats {
  margin-left: auto;
}

.process-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-process {
  color: #909399;
}

:deep(.el-table) {
  flex: 1;
  background: #fff;
  border-radius: 4px;
}
</style>
