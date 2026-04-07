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
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #409eff">
              <el-icon><Cpu /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ systemInfo.cpuUsage }}%</div>
              <div class="stat-label">CPU 使用率</div>
            </div>
            <el-progress
              :percentage="systemInfo.cpuUsage"
              :status="getStatus(systemInfo.cpuUsage)"
              :stroke-width="6"
            />
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #67c23a">
              <el-icon><Histogram /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatBytes(systemInfo.memoryUsed) }}</div>
              <div class="stat-label">内存使用</div>
            </div>
            <el-progress
              :percentage="systemInfo.memoryUsage"
              :status="getStatus(systemInfo.memoryUsage)"
              :stroke-width="6"
            />
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #e6a23c">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ systemInfo.diskUsage }}%</div>
              <div class="stat-label">磁盘使用率</div>
            </div>
            <el-progress
              :percentage="systemInfo.diskUsage"
              :status="getStatus(systemInfo.diskUsage)"
              :stroke-width="6"
            />
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-icon" style="background: #f56c6c">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ systemInfo.uptime }}</div>
              <div class="stat-label">运行时间</div>
            </div>
            <div class="uptime-detail">{{ systemInfo.uptimeDetail }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 详细信息 -->
    <el-row :gutter="20" class="detail-section">
      <!-- 内存详情 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span><el-icon><Histogram /></el-icon> 内存详情</span>
            </div>
          </template>
          
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
          
          <div ref="memoryChart" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <!-- 磁盘详情 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span><el-icon><Coin /></el-icon> 磁盘分区</span>
            </div>
          </template>
          
          <el-table :data="diskPartitions" style="width: 100%">
            <el-table-column label="盘符" width="80">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.letter }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="总空间">
              <template #default="{ row }">
                {{ formatBytes(row.totalSize) }}
              </template>
            </el-table-column>
            
            <el-table-column label="已用">
              <template #default="{ row }">
                {{ formatBytes(row.totalSize - row.freeSpace) }}
              </template>
            </el-table-column>
            
            <el-table-column label="可用">
              <template #default="{ row }">
                {{ formatBytes(row.freeSpace) }}
              </template>
            </el-table-column>
            
            <el-table-column label="使用率" width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.round(((row.totalSize - row.freeSpace) / row.totalSize) * 100)"
                  :status="getStatus(Math.round(((row.totalSize - row.freeSpace) / row.totalSize) * 100))"
                  :stroke-width="8"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 系统信息 -->
    <el-card class="system-info-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><InfoFilled /></el-icon> 系统信息</span>
          <el-button :icon="Refresh" circle size="small" @click="refresh" />
        </div>
      </template>
      
      <el-descriptions :column="3" border>
        <el-descriptions-item label="操作系统">
          {{ systemInfo.platform }} {{ systemInfo.arch }}
        </el-descriptions-item>
        
        <el-descriptions-item label="主机名">
          {{ systemInfo.hostname }}
        </el-descriptions-item>
        
        <el-descriptions-item label="Node 版本">
          {{ systemInfo.nodeVersion }}</el-descriptions-item>
        
        <el-descriptions-item label="CPU 型号">
          {{ systemInfo.cpuModel }}
        </el-descriptions-item>
        
        <el-descriptions-item label="CPU 核心数">
          {{ systemInfo.cpuCores }}
        </el-descriptions-item>
        
        <el-descriptions-item label="当前时间">
          {{ systemInfo.currentTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { Cpu, Histogram, Coin, Timer, InfoFilled, Refresh } from '@element-plus/icons-vue'

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
    
    // 格式化运行时间
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

function getStatus(percentage) {
  if (percentage < 50) return 'success'
  if (percentage < 80) return ''
  return 'exception'
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
  // 每 3 秒刷新一次
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
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  margin-bottom: 12px;
}

.stat-info {
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.uptime-detail {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.detail-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-stats {
  margin-bottom: 20px;
}

.memory-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
  
  &:last-child {
    border-bottom: none;
  }
}

.memory-item .label {
  color: #606266;
}

.memory-item .value {
  font-weight: bold;
  color: #303133;
  
  &.used {
    color: #e6a23c;
  }
  
  &.free {
    color: #67c23a;
  }
}

.chart-container {
  height: 200px;
}

.system-info-card {
  :deep(.el-descriptions__label) {
    width: 120px;
  }
}
</style>
