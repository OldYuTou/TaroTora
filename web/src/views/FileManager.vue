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
  <div class="file-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button @click="goBack">
        <el-icon><ArrowUp /></el-icon> 上级目录
      </el-button>
      
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item v-if="showDrivesView || !currentPath">此电脑</el-breadcrumb-item>
        <el-breadcrumb-item v-for="(item, index) in pathParts" :key="index" v-else>
          {{ item }}
        </el-breadcrumb-item>
      </el-breadcrumb>
      
      <div class="toolbar-right">
        <el-input
          v-model="searchText"
          placeholder="搜索文件..."
          style="width: 200px"
          clearable
          @keyup.enter="searchFiles"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-button type="primary" @click="showUploadDialog">
          <el-icon><Upload /></el-icon> 上传
        </el-button>
        <el-button @click="refresh">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <el-table
      :data="filteredFileList"
      style="width: 100%"
      @row-dblclick="handleRowDblClick"
      @row-contextmenu="handleRowContextMenu"
      v-loading="loading"
    >
      <el-table-column label="名称" min-width="300">
        <template #default="{ row }">
          <div class="file-name">
            <el-icon :size="20" class="file-icon">
              <component :is="row.type === 'directory' ? 'Folder' : 'Document'" />
            </el-icon>
            <span>{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="修改日期" width="180">
        <template #default="{ row }">
          {{ formatDate(row.modified) }}
        </template>
      </el-table-column>
      
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          {{ row.type === 'directory' ? '文件夹' : '文件' }}
        </template>
      </el-table-column>
      
      <el-table-column label="大小" width="120">
        <template #default="{ row }">
          {{ row.type === 'directory' ? '-' : formatSize(row.size) }}
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 右键菜单 -->
    <div
      v-show="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
    >
      <el-menu @select="handleMenuSelect">
        <el-menu-item index="open">
          <el-icon><FolderOpened /></el-icon> 打开
        </el-menu-item>
        <el-menu-item index="download" v-if="selectedFile?.type === 'file'">
          <el-icon><Download /></el-icon> 下载
        </el-menu-item>
        <el-menu-item index="rename">
          <el-icon><Edit /></el-icon> 重命名
        </el-menu-item>
        <el-menu-item index="delete" class="danger">
          <el-icon><Delete /></el-icon> 删除
        </el-menu-item>
      </el-menu>
    </div>
    
    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传文件" width="400px">
      <el-upload
        drag
        :action="uploadUrl"
        :headers="uploadHeaders"
        :data="{ path: currentPath }"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        multiple
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
      </el-upload>
    </el-dialog>
    
    <!-- 重命名对话框 -->
    <el-dialog v-model="renameDialogVisible" title="重命名" width="400px">
      <el-input v-model="newName" placeholder="新名称" />
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'

const API_BASE = '/api'
const token = localStorage.getItem('auth_token') || 'your-secret-token'

const fileList = ref([])
const currentPath = ref('')
const loading = ref(false)
const searchText = ref('')
const isSearching = ref(false)
const showDrivesView = ref(false)
const drives = ref([])

// 过滤后的文件列表
const filteredFileList = computed(() => {
  const list = showDrivesView.value ? drives.value : fileList.value
  if (!searchText.value || isSearching.value) return list
  const search = searchText.value.toLowerCase()
  return list.filter(item =>
    item.name.toLowerCase().includes(search)
  )
})

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedFile = ref(null)

// 对话框
const uploadDialogVisible = ref(false)
const renameDialogVisible = ref(false)
const newName = ref('')

// 计算属性：路径面包屑
const pathParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('\\').filter(Boolean)
})

// 上传配置
const uploadUrl = computed(() => `${API_BASE}/files/upload?path=${encodeURIComponent(currentPath.value)}`)
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${token}`
}))

// 加载盘符列表
async function loadDrives() {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/files/drives`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    drives.value = res.data.drives.map(drive => ({
      name: drive.letter,
      path: drive.letter + '\\',
      type: 'directory',
      size: 0,
      modified: new Date(),
      isHidden: false
    }))
    showDrivesView.value = true
    currentPath.value = ''
  } catch (error) {
    console.error('加载盘符失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载文件列表
async function loadFiles(path = '') {
  loading.value = true
  // 先清空旧数据，避免显示闪动
  fileList.value = []
  try {
    showDrivesView.value = false
    const res = await axios.get(`${API_BASE}/files/list`, {
      params: { path },
      headers: { Authorization: `Bearer ${token}` }
    })
    fileList.value = res.data.items
    currentPath.value = res.data.path
  } catch (error) {
    console.error('加载文件失败:', error)
  } finally {
    loading.value = false
  }
}

// 双击打开文件夹
function handleRowDblClick(row) {
  if (row.type === 'directory') {
    loadFiles(row.path)
  }
}

// 右键菜单
function handleRowContextMenu(row, column, event) {
  event.preventDefault()
  selectedFile.value = row
  contextMenuVisible.value = true
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
}

// 菜单选择
async function handleMenuSelect(index) {
  contextMenuVisible.value = false
  
  switch (index) {
    case 'open':
      if (selectedFile.value?.type === 'directory') {
        loadFiles(selectedFile.value.path)
      }
      break
    case 'download':
      downloadFile(selectedFile.value.path)
      break
    case 'rename':
      newName.value = selectedFile.value.name
      renameDialogVisible.value = true
      break
    case 'delete':
      await deleteFile(selectedFile.value.path)
      break
  }
}

// 下载文件
function downloadFile(path) {
  const link = document.createElement('a')
  link.href = `${API_BASE}/files/download?path=${encodeURIComponent(path)}`
  link.setAttribute('download', '')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 删除文件
async function deleteFile(path) {
  try {
    await axios.delete(`${API_BASE}/files/delete`, {
      data: { path },
      headers: { Authorization: `Bearer ${token}` }
    })
    await loadFiles(currentPath.value)
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 确认重命名
async function confirmRename() {
  try {
    await axios.post(`${API_BASE}/files/rename`, {
      oldPath: selectedFile.value.path,
      newName: newName.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    renameDialogVisible.value = false
    await loadFiles(currentPath.value)
  } catch (error) {
    console.error('重命名失败:', error)
  }
}

// 其他方法
function goBack() {
  // 如果当前在盘符根目录（如 C:\），返回到盘符选择页面
  if (!currentPath.value || currentPath.value === '' ||
      /^[A-Z]:\\?$/i.test(currentPath.value)) {
    loadDrives()
    return
  }
  // 否则加载父目录
  const parent = currentPath.value.substring(0, currentPath.value.lastIndexOf('\\'))
  loadFiles(parent || '')
}

function refresh() {
  loadFiles(currentPath.value)
}

function showUploadDialog() {
  uploadDialogVisible.value = true
}

function handleUploadSuccess() {
  uploadDialogVisible.value = false
  refresh()
}

function handleUploadError(err) {
  console.error('上传失败:', err)
}

// 搜索文件
function searchFiles() {
  // 本地搜索已在 computed 中实现
  // 这里可以添加服务端搜索逻辑
  if (searchText.value) {
    console.log('搜索:', searchText.value)
  }
}

// 工具函数
function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 点击其他地方关闭右键菜单
function handleClickOutside() {
  contextMenuVisible.value = false
}

onMounted(() => {
  loadDrives()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.file-manager {
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

.breadcrumb {
  flex: 1;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  color: #409EFF;
}

.context-menu {
  position: fixed;
  z-index: 2000;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.context-menu .el-menu {
  border: none;
}

.context-menu .danger {
  color: #f56c6c;
}

:deep(.el-table) {
  flex: 1;
  background: #fff;
  border-radius: 4px;
}
</style>
