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
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="tool-btn" @click="goBack" :disabled="!currentPath">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button class="tool-btn" @click="refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
        <div class="breadcrumb">
          <span v-if="showDrivesView || !currentPath" class="breadcrumb-item">此电脑</span>
          <template v-else>
            <span
              v-for="(item, index) in pathParts"
              :key="index"
              class="breadcrumb-item"
              :class="{ 'clickable': index < pathParts.length - 1 }"
              @click="index < pathParts.length - 1 && navigateTo(index)"
            >
              {{ item }}
            </span>
          </template>
        </div>
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
            placeholder="搜索文件..."
            @keyup.enter="searchFiles"
          />
        </div>
        <button class="tool-btn primary" @click="showUploadDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>上传</span>
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-else-if="filteredFileList.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>暂无文件</p>
      </div>

      <table v-else class="file-table">
        <thead>
          <tr>
            <th class="col-name">名称</th>
            <th class="col-date">修改日期</th>
            <th class="col-type">类型</th>
            <th class="col-size">大小</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredFileList"
            :key="item.path"
            @dblclick="handleRowDblClick(item)"
            @contextmenu.prevent="handleRowContextMenu($event, item)"
            class="file-row"
          >
            <td class="col-name">
              <div class="file-info">
                <div class="file-icon" :class="item.type">
                  <svg v-if="item.type === 'directory'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <span class="file-name">{{ item.name }}</span>
              </div>
            </td>
            <td class="col-date">{{ formatDate(item.modified) }}</td>
            <td class="col-type">{{ item.type === 'directory' ? '文件夹' : '文件' }}</td>
            <td class="col-size">{{ item.type === 'directory' ? '-' : formatSize(item.size) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 右键菜单 -->
    <div
      v-show="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
    >
      <div class="menu-item" @click="handleMenuSelect('open')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>打开</span>
      </div>
      <div class="menu-item" @click="handleMenuSelect('download')" v-if="selectedFile?.type === 'file'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>下载</span>
      </div>
      <div class="menu-item" @click="handleMenuSelect('rename')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>重命名</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="handleMenuSelect('delete')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>删除</span>
      </div>
    </div>

    <!-- 上传对话框 -->
    <div v-if="uploadDialogVisible" class="modal-overlay" @click="uploadDialogVisible = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>上传文件</h3>
          <button class="close-btn" @click="uploadDialogVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="upload-area" @drop.prevent="handleDrop" @dragover.prevent>
            <input
              type="file"
              multiple
              ref="fileInput"
              @change="handleFileSelect"
              style="display: none"
            />
            <div class="upload-placeholder" @click="$refs.fileInput.click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p>拖拽文件到此处</p>
              <p class="hint">或点击选择文件</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="renameDialogVisible" class="modal-overlay" @click="renameDialogVisible = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>重命名</h3>
          <button class="close-btn" @click="renameDialogVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <input
            v-model="newName"
            type="text"
            class="form-input"
            placeholder="新名称"
            @keyup.enter="confirmRename"
          />
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="renameDialogVisible = false">取消</button>
          <button class="btn-primary" @click="confirmRename">确定</button>
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

const fileList = ref([])
const currentPath = ref('')
const loading = ref(false)
const searchText = ref('')
const isSearching = ref(false)
const showDrivesView = ref(false)
const drives = ref([])

const filteredFileList = computed(() => {
  const list = showDrivesView.value ? drives.value : fileList.value
  if (!searchText.value || isSearching.value) return list
  const search = searchText.value.toLowerCase()
  return list.filter(item => item.name.toLowerCase().includes(search))
})

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedFile = ref(null)

const uploadDialogVisible = ref(false)
const renameDialogVisible = ref(false)
const newName = ref('')

const pathParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('\\').filter(Boolean)
})

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

async function loadFiles(path = '') {
  loading.value = true
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

function navigateTo(index) {
  const parts = pathParts.value.slice(0, index + 1)
  const path = parts.join('\\') + '\\'
  loadFiles(path)
}

function handleRowDblClick(row) {
  if (row.type === 'directory') {
    loadFiles(row.path)
  }
}

function handleRowContextMenu(event, row) {
  selectedFile.value = row
  contextMenuVisible.value = true
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
}

async function handleMenuSelect(action) {
  contextMenuVisible.value = false

  switch (action) {
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

function downloadFile(path) {
  const link = document.createElement('a')
  link.href = `${API_BASE}/files/download?path=${encodeURIComponent(path)}`
  link.setAttribute('download', '')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

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

function goBack() {
  if (!currentPath.value || currentPath.value === '' || /^[A-Z]:\\?$/i.test(currentPath.value)) {
    loadDrives()
    return
  }
  const parent = currentPath.value.substring(0, currentPath.value.lastIndexOf('\\'))
  loadFiles(parent || '')
}

function refresh() {
  loadFiles(currentPath.value)
}

function showUploadDialog() {
  uploadDialogVisible.value = true
}

function handleDrop(e) {
  const files = e.dataTransfer.files
  uploadFiles(files)
}

function handleFileSelect(e) {
  const files = e.target.files
  uploadFiles(files)
}

async function uploadFiles(files) {
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', currentPath.value)

    try {
      await axios.post(`${API_BASE}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    } catch (error) {
      console.error('上传失败:', error)
    }
  }
  uploadDialogVisible.value = false
  refresh()
}

function searchFiles() {
  if (searchText.value) {
    console.log('搜索:', searchText.value)
  }
}

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
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

/* 工具栏 */
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
  flex: 1;
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
  border-color: #8b949e;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn svg {
  width: 16px;
  height: 16px;
}

.tool-btn.primary {
  background: #238636;
  border-color: #238636;
  color: #fff;
}

.tool-btn.primary:hover {
  background: #2ea043;
  border-color: #2ea043;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  color: #8b949e;
}

.breadcrumb-item {
  padding: 4px 8px;
  border-radius: 4px;
}

.breadcrumb-item.clickable {
  cursor: pointer;
  color: #58a6ff;
}

.breadcrumb-item.clickable:hover {
  background: rgba(88, 166, 255, 0.1);
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

/* 文件列表 */
.file-list-container {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.file-table thead {
  position: sticky;
  top: 0;
  background: #161b22;
  z-index: 10;
}

.file-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 500;
  color: #8b949e;
  border-bottom: 1px solid #30363d;
  white-space: nowrap;
}

.file-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #21262d;
  color: #c9d1d9;
}

.file-row {
  cursor: pointer;
  transition: background 0.15s;
}

.file-row:hover {
  background: rgba(88, 166, 255, 0.05);
}

.col-name {
  width: 100%;
}

.col-date, .col-type, .col-size {
  white-space: nowrap;
  color: #8b949e;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #8b949e;
}

.file-icon.directory {
  color: #58a6ff;
}

.file-icon svg {
  width: 100%;
  height: 100%;
}

.file-name {
  color: #f0f6fc;
}

/* 加载和空状态 */
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

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 160px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #c9d1d9;
  transition: all 0.15s;
}

.menu-item:hover {
  background: rgba(88, 166, 255, 0.1);
}

.menu-item.danger {
  color: #f85149;
}

.menu-item.danger:hover {
  background: rgba(248, 81, 73, 0.1);
}

.menu-item svg {
  width: 16px;
  height: 16px;
}

.menu-divider {
  height: 1px;
  background: #30363d;
  margin: 6px 0;
}

/* 弹窗 */
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
  max-width: 400px;
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

.close-btn:hover {
  background: #21262d;
  color: #c9d1d9;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #30363d;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #238636;
  color: #fff;
}

.btn-primary:hover {
  background: #2ea043;
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
}

.btn-secondary:hover {
  background: #30363d;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #f0f6fc;
  font-size: 14px;
  outline: none;
}

.form-input:focus {
  border-color: #58a6ff;
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
}

/* 上传区域 */
.upload-area {
  border: 2px dashed #30363d;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.05);
}

.upload-placeholder svg {
  width: 48px;
  height: 48px;
  color: #6e7681;
  margin-bottom: 16px;
}

.upload-placeholder p {
  color: #c9d1d9;
  font-size: 14px;
  margin: 0;
}

.upload-placeholder .hint {
  color: #6e7681;
  font-size: 12px;
  margin-top: 4px;
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

  .file-table {
    font-size: 12px;
  }

  .file-table th,
  .file-table td {
    padding: 8px 12px;
  }

  .col-date,
  .col-type {
    display: none;
  }
}
</style>
