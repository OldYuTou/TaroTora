<template>
  <div class="files-mobile">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>{{ currentPath ? getFolderName(currentPath) : '文件管理' }}</span>
      </div>
      <div class="header-actions">
        <button v-if="selectedFiles.length > 0" class="action-btn danger" @click="deleteSelected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>{{ selectedFiles.length }}</span>
        </button>
        <button class="action-btn" @click="goBack" :disabled="!currentPath && !showDrivesView">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- 路径导航 -->
    <div class="breadcrumb-bar" v-if="currentPath">
      <div class="breadcrumb-scroll">
        <span class="breadcrumb-item" @click="navigateToRoot">此电脑</span>
        <span v-for="(part, index) in pathParts" :key="index" class="breadcrumb-item" @click="navigateTo(index)">
          {{ part }}
        </span>
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
        <p>{{ searchText ? '未找到匹配的文件' : '暂无文件' }}</p>
      </div>

      <div v-else class="file-list">
        <div
          v-for="item in filteredFileList"
          :key="item.path"
          class="file-item"
          :class="{
            'selected': isSelected(item),
            'directory': item.type === 'directory'
          }"
          @click="handleClick(item, $event)"
          @touchstart="handleTouchStart(item, $event)"
          @touchend="handleTouchEnd"
          @touchmove="handleTouchMove"
        >
          <div v-if="!showDrivesView" class="file-checkbox" :class="{ 'checked': isSelected(item) }" @click.stop="toggleSelect(item)">
            <svg v-if="isSelected(item)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <div class="file-icon" :class="[item.type, getFileIcon(item.name)]">
            <svg v-if="item.type === 'directory'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <svg v-else-if="isImage(item.name)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <svg v-else-if="isCode(item.name)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>

          <div class="file-info">
            <div class="file-name">{{ item.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ item.type === 'directory' ? '-' : formatSize(item.size) }}</span>
              <span class="file-date">{{ formatDate(item.modified) }}</span>
            </div>
          </div>

          <div class="file-arrow" v-if="item.type === 'directory'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 文本编辑器弹窗 -->
    <div v-if="editorVisible" class="editor-overlay" @click.self="closeEditor">
      <div class="editor-container">
        <div class="editor-header">
          <div class="editor-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>{{ editingFile?.name }}</span>
          </div>
          <div class="editor-actions">
            <button class="editor-btn" @click="saveFile" :disabled="saving">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>{{ saving ? '保存中...' : '保存' }}</span>
            </button>
            <button class="editor-btn close" @click="closeEditor">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="editor-body">
          <div class="code-editor">
            <div class="line-numbers" ref="lineNumbers">
              <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
            </div>
            <div class="code-wrapper">
              <pre class="code-highlight"><code
                ref="codeBlock"
                :class="['language-' + getLanguageClass()]"
                v-html="highlightedCode"
              ></code></pre>
              <textarea
                v-model="fileContent"
                class="code-input"
                spellcheck="false"
                @keydown.tab.prevent="insertTab"
                @scroll="syncScroll"
                @input="updateHighlight"
                ref="codeTextarea"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="bottom-toolbar">
      <button v-if="!showDrivesView" class="tool-btn" @click="showUploadDialog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>上传</span>
      </button>
      <button v-if="!showDrivesView" class="tool-btn" @click="createNewFolder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <line x1="12" y1="11" x2="12" y2="17"></line>
          <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
        <span>新建</span>
      </button>
      <button class="tool-btn" @click="refresh">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>刷新</span>
      </button>
    </div>

    <!-- 上传对话框 -->
    <div v-if="uploadDialogVisible" class="modal-overlay" @click.self="uploadDialogVisible = false">
      <div class="modal-content">
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
          <div class="upload-area" @click="$refs.fileInput.click()">
            <input
              type="file"
              multiple
              ref="fileInput"
              @change="handleFileSelect"
              style="display: none"
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>点击选择文件</p>
            <span class="hint">或将文件拖放到此处</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{
        left: contextMenu.x + 'px',
        top: contextMenu.y + 'px'
      }"
      @click.stop
    >
      <div class="context-menu-item" @click="handleMenuAction('copy')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>复制</span>
        <kbd>Ctrl+C</kbd>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('cut')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="6" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
          <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
          <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
        </svg>
        <span>剪切</span>
        <kbd>Ctrl+X</kbd>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('paste')" :class="{ 'disabled': !clipboard.value?.length }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <span>粘贴</span>
        <kbd>Ctrl+V</kbd>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('copyPath')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <span>复制文件路径</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('compress')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
        </svg>
        <span>压缩到...</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('extract')" v-if="isZipFile(contextMenu.targetFile?.name)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span>解压到当前文件夹</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('rename')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>重命名</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('download')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>下载</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('share')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        <span>分享</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('openEditor')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>在文本编辑器中打开</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('openTerminal')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        <span>在此处打开终端</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('properties')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>属性</span>
      </div>
    </div>

    <!-- 属性对话框 -->
    <div v-if="propertiesVisible" class="modal-overlay" @click.self="closeProperties">
      <div class="modal-content properties-modal">
        <div class="modal-header">
          <h3>属性</h3>
          <button class="close-btn" @click="closeProperties">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body properties-body" v-if="propertiesFile">
          <div class="property-row">
            <span class="property-label">名称</span>
            <span class="property-value">{{ propertiesFile.name }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">类型</span>
            <span class="property-value">{{ propertiesFile.type === 'directory' ? '文件夹' : getFileType(propertiesFile.name) }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">位置</span>
            <span class="property-value path">{{ getParentPath(propertiesFile.path) }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">大小</span>
            <span class="property-value">{{ propertiesFile.type === 'directory' ? calculateFolderSize(propertiesFile) : formatSize(propertiesFile.size) }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">修改时间</span>
            <span class="property-value">{{ formatFullDate(propertiesFile.modified) }}</span>
          </div>
          <div class="property-row" v-if="propertiesFile.created">
            <span class="property-label">创建时间</span>
            <span class="property-value">{{ formatFullDate(propertiesFile.created) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 更多选项菜单 -->
    <div v-if="moreMenuVisible" class="modal-overlay" @click.self="closeMoreMenu">
      <div class="modal-content">
        <div class="modal-header">
          <h3>更多选项</h3>
          <button class="close-btn" @click="closeMoreMenu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body more-options-body">
          <div class="more-option-item" @click="handleMoreAction('rename')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>重命名</span>
          </div>
          <div class="more-option-item" @click="handleMoreAction('delete')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>删除</span>
          </div>
          <div class="more-option-item" @click="handleMoreAction('download')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>下载</span>
          </div>
          <div class="more-option-item" @click="handleMoreAction('share')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>分享</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分享对话框 -->
    <div v-if="shareDialogVisible" class="modal-overlay" @click.self="cancelShare">
      <div class="modal-content share-modal">
        <div class="modal-header">
          <h3>分享文件</h3>
          <button class="close-btn" @click="cancelShare">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body share-body">
          <div class="share-file-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>{{ downloadingFile?.name }}</span>
          </div>
          <div class="share-status">{{ shareStatus }}</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: shareProgress + '%' }"></div>
          </div>
          <div class="share-actions">
            <button v-if="shareProgress === 0" class="share-btn primary" @click="confirmShare">
              确认下载并分享
            </button>
            <button class="share-btn secondary" @click="cancelShare">
              {{ shareProgress > 0 && shareProgress < 100 ? '取消' : '关闭' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <div v-if="renameVisible" class="modal-overlay" @click.self="renameVisible = false">
      <div class="modal-content rename-modal">
        <div class="modal-header">
          <h3>重命名</h3>
          <button class="close-btn" @click="renameVisible = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body rename-body">
          <div class="rename-file-info">
            <svg v-if="renameFile?.type === 'directory'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>{{ renameFile?.name }}</span>
          </div>
          <div class="rename-input-wrapper">
            <label>新名称</label>
            <input
              v-model="newFileName"
              type="text"
              class="rename-input"
              placeholder="请输入新名称"
              @keyup.enter="confirmRename"
              ref="renameInput"
            />
          </div>
          <div class="rename-actions">
            <button class="rename-btn secondary" @click="renameVisible = false">取消</button>
            <button class="rename-btn primary" @click="confirmRename" :disabled="!newFileName || newFileName === renameFile?.name">确认</button>
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

// 文件列表
const fileList = ref([])
const currentPath = ref('')
const loading = ref(false)
const searchText = ref('')
const showDrivesView = ref(false)
const drives = ref([])

// 多选功能
const selectedFiles = ref([])
let lastClickTime = 0
let lastClickedItem = null

// 编辑器
const editorVisible = ref(false)
const editingFile = ref(null)
const fileContent = ref('')
const saving = ref(false)
const lineNumbers = ref(null)
const codeBlock = ref(null)
const codeTextarea = ref(null)

// 计算行数
const lineCount = computed(() => {
  return fileContent.value.split('\n').length
})

// 获取文件语言类别
function getLanguageClass() {
  if (!editingFile.value) return 'text'
  const name = editingFile.value.name.toLowerCase()
  const ext = name.split('.').pop()

  const langMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'vue': 'html',
    'html': 'html',
    'css': 'css',
    'scss': 'css',
    'less': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'bash',
    'bash': 'bash',
    'ps1': 'powershell',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sql': 'sql',
    'xml': 'xml',
    'txt': 'text'
  }

  return langMap[ext] || 'text'
}

// 高亮代码
const highlightedCode = computed(() => {
  if (!fileContent.value) return ''
  const lang = getLanguageClass()
  if (lang === 'text' || typeof Prism === 'undefined') {
    return escapeHtml(fileContent.value)
  }
  try {
    return Prism.highlight(fileContent.value, Prism.languages[lang] || Prism.languages.plain, lang)
  } catch (e) {
    return escapeHtml(fileContent.value)
  }
})

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 同步滚动
function syncScroll() {
  if (lineNumbers.value && codeTextarea.value) {
    lineNumbers.value.scrollTop = codeTextarea.value.scrollTop
  }
  // 同步高亮代码层滚动
  if (codeBlock.value && codeTextarea.value) {
    const highlightPre = codeBlock.value.parentElement
    if (highlightPre) {
      highlightPre.scrollTop = codeTextarea.value.scrollTop
      highlightPre.scrollLeft = codeTextarea.value.scrollLeft
    }
  }
}

// 更新高亮
function updateHighlight() {
  // 高亮会自动通过 computed 更新
  syncScroll()
}

// 上传
const uploadDialogVisible = ref(false)

// 右键菜单
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetFile: null
})

// 剪贴板
const clipboard = ref([])
const clipboardAction = ref('') // 'copy' or 'cut'

// 属性对话框
const propertiesVisible = ref(false)
const propertiesFile = ref(null)
// 重命名对话框
const renameVisible = ref(false)
const renameFile = ref(null)
const newFileName = ref('')

// 更多选项菜单
const moreMenuVisible = ref(false)

const filteredFileList = computed(() => {
  const list = showDrivesView.value ? drives.value : fileList.value
  if (!searchText.value) return list
  return list.filter(item => item.name.toLowerCase().includes(searchText.value.toLowerCase()))
})

const pathParts = computed(() => {
  if (!currentPath.value) return []
  return currentPath.value.split('\\').filter(Boolean)
})

// 加载磁盘列表
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
      modified: new Date()
    }))
    showDrivesView.value = true
    currentPath.value = ''
    selectedFiles.value = []
  } catch (error) {
    console.error('加载磁盘失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载文件列表
async function loadFiles(path = '') {
  loading.value = true
  selectedFiles.value = []
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

// 获取文件夹名称
function getFolderName(path) {
  if (!path) return '文件管理'
  const parts = path.split('\\').filter(Boolean)
  return parts[parts.length - 1] || '文件管理'
}

// 导航到根目录
function navigateToRoot() {
  loadDrives()
}

// 导航到指定层级
function navigateTo(index) {
  const parts = pathParts.value.slice(0, index + 1)
  const path = parts.join('\\') + '\\'
  loadFiles(path)
}

// 返回上级
function goBack() {
  if (showDrivesView.value || !currentPath.value) {
    return
  }
  if (/^[A-Z]:\\?$/i.test(currentPath.value)) {
    loadDrives()
    return
  }
  const parent = currentPath.value.substring(0, currentPath.value.lastIndexOf('\\'))
  loadFiles(parent || '')
}

// 刷新
function refresh() {
  if (showDrivesView.value) {
    loadDrives()
  } else {
    loadFiles(currentPath.value)
  }
}

// 判断是否选中
function isSelected(item) {
  return selectedFiles.value.some(f => f.path === item.path)
}

// 切换选中状态
function toggleSelect(item) {
  const index = selectedFiles.value.findIndex(f => f.path === item.path)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(item)
  }
}

// 单击处理 - 直接打开
function handleClick(item, event) {
  // 点击文件项直接打开
  handleOpen(item)
}

// 打开文件或文件夹
async function handleOpen(item) {
  if (item.type === 'directory') {
    loadFiles(item.path)
  } else if (isEditable(item.name)) {
    await openEditor(item)
  } else {
    downloadFile(item.path)
  }
}

// 双击打开
// 触摸处理（移动端）
let touchTimer = null
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let longPressTriggered = false

function handleTouchStart(item, event) {
  // 盘符页面禁止右键菜单
  if (showDrivesView.value) {
    return
  }

  const touch = event.touches[0]
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchStartTime = Date.now()
  longPressTriggered = false

  touchTimer = setTimeout(() => {
    longPressTriggered = true
    // 长按显示右键菜单
    showContextMenu(item, touch.clientX, touch.clientY)
    touchTimer = null
    // 震动反馈
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }, 600)
}

function handleTouchEnd(event) {
  if (touchTimer) {
    clearTimeout(touchTimer)
    touchTimer = null
  }
}

function handleTouchMove(event) {
  if (touchTimer) {
    const touch = event.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartX)
    const deltaY = Math.abs(touch.clientY - touchStartY)
    // 如果移动超过10px，取消长按
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(touchTimer)
      touchTimer = null
    }
  }
}

// 显示右键菜单
function showContextMenu(item, x, y) {
  const menuWidth = 200
  const padding = 8

  // 计算实际菜单高度 - 根据实际菜单项数量估算
  // 复制、剪切、粘贴(3) + 分隔线 + 复制路径、压缩(2) + 分隔线 + 重命名、下载、分享(3) + 分隔线 + 编辑器、终端(2) + 分隔线 + 属性(1)
  // 每项约44px，分隔线约13px，padding约12px
  const menuHeight = 480  // 进一步增加估算高度确保完全显示

  let menuX = x
  let menuY = y

  // 检测右边界
  if (menuX + menuWidth > window.innerWidth - padding) {
    menuX = window.innerWidth - menuWidth - padding
  }

  // 检测下边界 - 如果超出屏幕底部，向上移动足够距离
  if (menuY + menuHeight > window.innerHeight - padding) {
    // 直接将菜单底部对齐到屏幕底部减去边距
    menuY = window.innerHeight - menuHeight - padding
    // 确保不会移出屏幕顶部（最小显示顶部几个选项）
    menuY = Math.max(padding, menuY)
  }

  // 确保不超出左边界和上边界
  menuX = Math.max(padding, menuX)
  menuY = Math.max(padding, menuY)

  contextMenu.value = {
    visible: true,
    x: menuX,
    y: menuY,
    targetFile: item
  }
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.visible = false
}

// 处理菜单操作
async function handleMenuAction(action) {
  const file = contextMenu.value.targetFile
  if (!file) return

  hideContextMenu()

  switch (action) {
    case 'copy':
      clipboard.value = [file]
      clipboardAction.value = 'copy'
      break
    case 'cut':
      clipboard.value = [file]
      clipboardAction.value = 'cut'
      break
    case 'paste':
      await pasteFiles()
      break
    case 'copyPath':
      await copyFilePath(file)
      break
    case 'compress':
      await compressFile(file)
      break
    case 'extract':
      await extractFile(file)
      break
    case 'properties':
      showProperties(file)
      break
    case 'rename':
      await handleRename(file)
      break
    case 'download':
      downloadFile(file.path)
      break
    case 'share':
      await shareFile(file)
      break
    case 'openEditor':
      await openEditor(file)
      break
    case 'openTerminal':
      // 在此处打开终端 - 存储路径并跳转到控制页面
      const terminalPath = file.type === 'directory' ? file.path : getParentPath(file.path)
      const terminalName = file.name + ' 终端'
      localStorage.setItem('pending_terminal_cwd', terminalPath)
      localStorage.setItem('pending_terminal_name', terminalName)
      window.location.hash = '#/control-mobile'
      showToast('正在打开终端...')
      break
  }
}

// 重命名文件
async function handleRename(file) {
  renameFile.value = file
  newFileName.value = file.name
  renameVisible.value = true
}

async function confirmRename() {
  if (!newFileName.value || newFileName.value === renameFile.value.name) {
    renameVisible.value = false
    return
  }
  try {
    await axios.post(`${API_BASE}/files/rename`, {
      path: renameFile.value.path,
      newName: newFileName.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    renameVisible.value = false
    refresh()
    showToast("重命名成功")
  } catch (error) {
    console.error("重命名失败:", error)
    showToast("重命名失败: " + error.message)
  }
}

// 复制文件路径
async function copyFilePath(file) {
  try {
    await navigator.clipboard.writeText(file.path)
    showToast('文件路径已复制')
  } catch (err) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = file.path
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    showToast('文件路径已复制')
  }
}

// 粘贴文件
async function pasteFiles() {
  if (clipboard.value.length === 0) return

  const targetPath = currentPath.value
  if (!targetPath) {
    showToast('请先进入一个文件夹')
    return
  }

  for (const file of clipboard.value) {
    try {
      if (clipboardAction.value === 'copy') {
        await axios.post(`${API_BASE}/files/copy`, {
          source: file.path,
          destination: `${targetPath}\\${file.name}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else if (clipboardAction.value === 'cut') {
        await axios.post(`${API_BASE}/files/move`, {
          source: file.path,
          destination: `${targetPath}\\${file.name}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (error) {
      console.error('粘贴失败:', error)
      showToast('粘贴失败: ' + error.message)
    }
  }

  if (clipboardAction.value === 'cut') {
    clipboard.value = []
  }

  refresh()
  showToast('操作完成')
}

// 压缩文件
async function compressFile(file) {
  const zipName = file.type === 'directory' ? `${file.name}.zip` : `${file.name.split('.')[0]}.zip`
  try {
    showToast('正在压缩...')
    await axios.post(`${API_BASE}/files/compress`, {
      source: file.path,
      destination: `${currentPath.value}\\${zipName}`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    refresh()
    showToast('压缩完成')
  } catch (error) {
    console.error('压缩失败:', error)
    showToast('压缩失败: ' + error.message)
  }
}

// 检查是否是zip文件
function isZipFile(name) {
  return name && name.toLowerCase().endsWith('.zip')
}

// 解压文件
async function extractFile(file) {
  try {
    showToast('正在解压...')
    const extractPath = file.path.substring(0, file.path.length - 4) // 移除.zip
    await axios.post(`${API_BASE}/files/extract`, {
      source: file.path,
      destination: extractPath
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    refresh()
    showToast('解压完成')
  } catch (error) {
    console.error('解压失败:', error)
    showToast('解压失败: ' + error.message)
  }
}

// 显示属性
function showProperties(file) {
  propertiesFile.value = file
  propertiesVisible.value = true
}

// 关闭属性
function closeProperties() {
  propertiesVisible.value = false
  propertiesFile.value = null
}

// 获取文件类型
function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase()
  const types = {
    'jpg': 'JPEG 图片',
    'jpeg': 'JPEG 图片',
    'png': 'PNG 图片',
    'gif': 'GIF 图片',
    'bmp': 'BMP 图片',
    'webp': 'WebP 图片',
    'svg': 'SVG 图片',
    'txt': '文本文档',
    'md': 'Markdown 文档',
    'pdf': 'PDF 文档',
    'doc': 'Word 文档',
    'docx': 'Word 文档',
    'xls': 'Excel 工作表',
    'xlsx': 'Excel 工作表',
    'ppt': 'PowerPoint 演示文稿',
    'pptx': 'PowerPoint 演示文稿',
    'zip': '压缩文件',
    'rar': '压缩文件',
    '7z': '压缩文件',
    'js': 'JavaScript 文件',
    'ts': 'TypeScript 文件',
    'vue': 'Vue 文件',
    'html': 'HTML 文件',
    'css': 'CSS 文件',
    'json': 'JSON 文件',
    'xml': 'XML 文件',
    'py': 'Python 文件',
    'java': 'Java 文件',
    'cpp': 'C++ 文件',
    'c': 'C 文件',
    'exe': '应用程序',
    'mp3': '音频文件',
    'mp4': '视频文件',
    'avi': '视频文件',
    'mkv': '视频文件'
  }
  return types[ext] || `${ext.toUpperCase()} 文件`
}

// 获取父路径
function getParentPath(path) {
  if (!path) return ''
  const lastSlash = path.lastIndexOf('\\')
  if (lastSlash === -1) return path
  return path.substring(0, lastSlash) || '\\'
}

// 计算文件夹大小
function calculateFolderSize(folder) {
  return '计算中...'
}

// 格式化完整日期
function formatFullDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 显示更多选项菜单
function showMoreMenu() {
  moreMenuVisible.value = true
}

// 关闭更多选项菜单
function closeMoreMenu() {
  moreMenuVisible.value = false
}

// 处理更多选项操作
async function handleMoreAction(action) {
  const file = contextMenu.value.targetFile
  if (!file) return

  closeMoreMenu()

  switch (action) {
    case 'rename':
      await handleRename(file)
      break
    case 'delete':
      selectedFiles.value = [file]
      await deleteSelected()
      break
    case 'download':
      downloadFile(file.path)
      break
    case 'share':
      await shareFile(file)
      break
  }
}

// 分享文件
// 分享相关
const shareDialogVisible = ref(false)
const shareProgress = ref(0)
const shareStatus = ref('')
const downloadingFile = ref(null)
let abortController = null

async function shareFile(file) {
  // 显示确认对话框
  downloadingFile.value = file
  shareDialogVisible.value = true
  shareProgress.value = 0
  shareStatus.value = '准备下载...'
}

async function confirmShare() {
  const file = downloadingFile.value
  if (!file) return

  shareStatus.value = '正在下载...'
  shareProgress.value = 0

  try {
    // 创建 AbortController 用于取消下载
    abortController = new AbortController()

    // 使用 fetch 下载文件并跟踪进度
    const response = await fetch(`${API_BASE}/files/download?path=${encodeURIComponent(file.path)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 获取文件总大小
    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0

    // 读取响应流以跟踪进度
    const reader = response.body.getReader()
    const chunks = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      chunks.push(value)
      received += value.length

      if (total) {
        const percent = Math.round((received * 100) / total)
        shareProgress.value = percent
        shareStatus.value = `正在下载... ${percent}%`
      }
    }

    shareStatus.value = '下载完成，准备分享...'
    shareProgress.value = 100

    // 合并 chunks 创建 Blob
    const blob = new Blob(chunks)
    const fileType = response.headers.get('content-type') || 'application/octet-stream'
    const fileObj = new File([blob], file.name, { type: fileType })

    // 下载完成，准备分享
    shareStatus.value = '下载完成！'
    shareProgress.value = 100

    // 读取 blob 为 base64，然后通过原生插件分享
    try {
      shareStatus.value = '准备唤起分享...'

      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1]

        // 检查是否在 Capacitor 环境中
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
          try {
            await window.Capacitor.Plugins.Share.shareFile({
              base64Data: base64Data,
              filename: file.name,
              mimeType: fileType
            })
            showToast('分享成功')
            shareDialogVisible.value = false
          } catch (e) {
            console.error('原生分享失败:', e)
            // 降级到下载
            downloadAndSave(blob, file.name)
          }
        } else {
          // 降级到普通下载
          downloadAndSave(blob, file.name)
        }
      }

      reader.readAsDataURL(blob)
    } catch (e) {
      console.error('分享失败:', e)
      downloadAndSave(blob, file.name)
    }

    function downloadAndSave(blob, filename) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('文件已下载')
      shareDialogVisible.value = false
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      shareStatus.value = '下载已取消'
      showToast('下载已取消')
    } else {
      console.error('分享失败:', err)
      shareStatus.value = '下载失败: ' + err.message
      showToast('分享失败: ' + err.message)
    }
  } finally {
    abortController = null
  }
}

function cancelShare() {
  if (abortController) {
    abortController.abort()
  }
  shareDialogVisible.value = false
  downloadingFile.value = null
  shareProgress.value = 0
}

// Toast 提示
function showToast(message) {
  const toast = document.createElement('div')
  toast.className = 'file-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.classList.add('show')
  }, 10)
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 2000)
}

// 打开编辑器
async function openEditor(file) {
  try {
    const res = await axios.get(`${API_BASE}/files/download?path=${encodeURIComponent(file.path)}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text'
    })
    editingFile.value = file
    fileContent.value = res.data
    editorVisible.value = true
  } catch (error) {
    console.error('打开文件失败:', error)
    alert('无法打开此文件')
  }
}

// 关闭编辑器
function closeEditor() {
  editorVisible.value = false
  editingFile.value = null
  fileContent.value = ''
}

// 保存文件
async function saveFile() {
  if (!editingFile.value) return

  saving.value = true
  try {
    const blob = new Blob([fileContent.value], { type: 'text/plain' })
    const formData = new FormData()
    formData.append('file', blob, editingFile.value.name)
    formData.append('path', currentPath.value)

    await axios.post(`${API_BASE}/files/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('保存成功！')
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 插入 Tab
function insertTab(event) {
  const start = event.target.selectionStart
  const end = event.target.selectionEnd
  fileContent.value = fileContent.value.substring(0, start) + '  ' + fileContent.value.substring(end)
  event.target.selectionStart = event.target.selectionEnd = start + 2
}

// 删除选中的文件
async function deleteSelected() {
  if (selectedFiles.value.length === 0) return

  const names = selectedFiles.value.map(f => f.name).join(', ')
  if (!confirm(`确定要删除以下 ${selectedFiles.value.length} 个项目吗？\n${names.substring(0, 100)}${names.length > 100 ? '...' : ''}`)) {
    return
  }

  for (const file of selectedFiles.value) {
    try {
      await axios.delete(`${API_BASE}/files/delete`, {
        data: { path: file.path },
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  selectedFiles.value = []
  refresh()
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

// 文件类型判断
function isImage(name) {
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(name)
}

function isCode(name) {
  return /\.(js|ts|vue|jsx|tsx|html|css|scss|less|json|xml|yaml|yml|py|java|c|cpp|h|hpp|cs|go|rs|php|rb|sh|bat|ps1|md|txt|log|ini|conf|env|sql)$/i.test(name)
}

function isEditable(name) {
  return isCode(name) || /\.(txt|log|ini|conf|env|csv|md)$/i.test(name)
}

function getFileIcon(name) {
  if (isImage(name)) return 'image'
  if (isCode(name)) return 'code'
  return 'file'
}

// 上传相关
function showUploadDialog() {
  uploadDialogVisible.value = true
}

async function handleFileSelect(e) {
  const files = e.target.files
  if (!files.length) return

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

// 新建文件夹
async function createNewFolder() {
  const name = prompt('请输入文件夹名称:')
  if (!name) return

  try {
    await axios.post(`${API_BASE}/files/mkdir`, {
      path: currentPath.value ? `${currentPath.value}\\${name}` : `${name}\\`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    refresh()
  } catch (error) {
    console.error('创建文件夹失败:', error)
    alert('创建失败: ' + error.message)
  }
}

// 格式化
function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 24 * 60 * 60 * 1000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

onMounted(() => {
  loadDrives()

  // 点击其他地方关闭右键菜单
  document.addEventListener('click', hideContextMenu)
  document.addEventListener('scroll', hideContextMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  document.removeEventListener('scroll', hideContextMenu, true)
})
</script>

<style scoped>
.files-mobile {
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

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.danger {
  background: rgba(248, 81, 73, 0.15);
  border-color: rgba(248, 81, 73, 0.3);
  color: #f85149;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* 路径导航 */
.breadcrumb-bar {
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  overflow-x: auto;
}

.breadcrumb-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.breadcrumb-item {
  font-size: 13px;
  color: #8b949e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.breadcrumb-item:hover {
  background: rgba(88, 166, 255, 0.1);
  color: #58a6ff;
}

.breadcrumb-item:not(:last-child)::after {
  content: '>';
  margin-left: 8px;
  color: #6e7681;
}

/* 文件列表 */
.file-list-container {
  flex: 1;
  overflow-y: auto;
  background: #0d1117;
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
  width: 40px;
  height: 40px;
  border: 3px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 56px;
  height: 56px;
  opacity: 0.3;
}

.file-list {
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.file-item:active {
  background: rgba(88, 166, 255, 0.05);
}

.file-item.selected {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.1);
}

.file-checkbox {
  width: 22px;
  height: 22px;
  border: 2px solid #30363d;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.file-checkbox.checked {
  background: #58a6ff;
  border-color: #58a6ff;
}

.file-checkbox svg {
  width: 14px;
  height: 14px;
  color: #fff;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #21262d;
  color: #8b949e;
}

.file-icon.directory {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
}

.file-icon.image {
  background: rgba(35, 134, 54, 0.15);
  color: #3fb950;
}

.file-icon.code {
  background: rgba(240, 136, 62, 0.15);
  color: #f0883e;
}

.file-icon svg {
  width: 20px;
  height: 20px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #f0f6fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6e7681;
}

.file-arrow {
  color: #6e7681;
}

.file-arrow svg {
  width: 20px;
  height: 20px;
}

/* 编辑器 */
.editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0d1117;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #f0f6fc;
}

.editor-title svg {
  width: 20px;
  height: 20px;
  color: #58a6ff;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #238636;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.editor-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.editor-btn.close {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 8px;
}

.editor-btn svg {
  width: 16px;
  height: 16px;
}

.editor-body {
  flex: 1;
  overflow: hidden;
  background: #0d1117;
}

.code-editor {
  display: flex;
  height: 100%;
  overflow: hidden;
  font-family: 'Consolas', 'Monaco', 'SF Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.line-numbers {
  width: 50px;
  padding: 16px 8px;
  background: #161b22;
  border-right: 1px solid #30363d;
  overflow: hidden;
  text-align: right;
  user-select: none;
}

.line-number {
  color: #6e7681;
  font-size: 13px;
  line-height: 1.6;
}

.code-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.code-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 16px;
  background: #0d1117;
  color: #c9d1d9;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  white-space: pre;
  word-wrap: normal;
  pointer-events: none;
}

.code-highlight code {
  font-family: inherit;
  background: transparent !important;
}

.code-input {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  color: transparent;
  caret-color: #c9d1d9;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  tab-size: 2;
  white-space: pre;
  word-wrap: normal;
  overflow: auto;
}

/* Prism.js 代码高亮样式覆盖 */
.code-highlight .token.comment,
.code-highlight .token.prolog,
.code-highlight .token.doctype,
.code-highlight .token.cdata {
  color: #8b949e;
}

.code-highlight .token.punctuation {
  color: #c9d1d9;
}

.code-highlight .token.property,
.code-highlight .token.tag,
.code-highlight .token.boolean,
.code-highlight .token.number,
.code-highlight .token.constant,
.code-highlight .token.symbol {
  color: #79c0ff;
}

.code-highlight .token.selector,
.code-highlight .token.attr-name,
.code-highlight .token.string,
.code-highlight .token.char,
.code-highlight .token.builtin {
  color: #a5d6ff;
}

.code-highlight .token.operator,
.code-highlight .token.entity,
.code-highlight .token.url,
.code-highlight .language-css .token.string,
.code-highlight .style .token.string {
  color: #d2a8ff;
}

.code-highlight .token.atrule,
.code-highlight .token.attr-value,
.code-highlight .token.keyword {
  color: #ff7b72;
}

.code-highlight .token.function,
.code-highlight .token.class-name {
  color: #d2a8ff;
}

.code-highlight .token.regex,
.code-highlight .token.important,
.code-highlight .token.variable {
  color: #ffa657;
}

/* 底部工具栏 */
.bottom-toolbar {
  position: fixed;
  bottom: 56px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 8px;
  background: #161b22;
  border-top: 1px solid #30363d;
  z-index: 100;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 24px;
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn svg {
  width: 22px;
  height: 22px;
}

.tool-btn:active {
  color: #58a6ff;
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

.modal-body {
  padding: 20px;
}

.upload-area {
  border: 2px dashed #30363d;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area svg {
  width: 48px;
  height: 48px;
  color: #6e7681;
  margin-bottom: 12px;
}

.upload-area p {
  color: #c9d1d9;
  font-size: 14px;
  margin: 0 0 4px;
}

.upload-area .hint {
  color: #6e7681;
  font-size: 12px;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 6px;
  min-width: 200px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  animation: menuFadeIn 0.15s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  color: #c9d1d9;
  font-size: 13px;
}

.context-menu-item:hover {
  background: rgba(88, 166, 255, 0.1);
  color: #f0f6fc;
}

.context-menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.context-menu-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.context-menu-item span {
  flex: 1;
}

.context-menu-item kbd {
  font-size: 11px;
  color: #6e7681;
  background: #0d1117;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #30363d;
}

.context-menu-divider {
  height: 1px;
  background: #30363d;
  margin: 6px 0;
}

.context-menu-item.more-options {
  color: #8b949e;
}

.context-menu-item.more-options:hover {
  color: #58a6ff;
}

/* 属性对话框 */
.properties-modal {
  max-width: 400px;
}

.properties-body {
  padding: 16px 20px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #21262d;
}

.property-row:last-child {
  border-bottom: none;
}

.property-label {
  color: #8b949e;
  font-size: 13px;
}

.property-value {
  color: #c9d1d9;
  font-size: 13px;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}

.property-value.path {
  font-family: 'Consolas', monospace;
  font-size: 12px;
}

/* 更多选项 */
.more-options-body {
  padding: 8px;
}

.more-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  color: #c9d1d9;
  font-size: 14px;
}

.more-option-item:hover {
  background: rgba(88, 166, 255, 0.1);
  color: #f0f6fc;
}

.more-option-item svg {
  width: 20px;
  height: 20px;
  color: #58a6ff;
}

/* Toast 提示 */
.file-toast {
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

.file-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* 分享对话框样式 */
.share-modal {
  max-width: 340px;
}

.share-body {
  padding: 24px;
}

.share-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  margin-bottom: 20px;
}

.share-file-info svg {
  width: 32px;
  height: 32px;
  color: #58a6ff;
  flex-shrink: 0;
}

.share-file-info span {
  font-size: 14px;
  color: #c9d1d9;
  word-break: break-all;
}

.share-status {
  text-align: center;
  font-size: 14px;
  color: #8b949e;
  margin-bottom: 16px;
}

.progress-bar {
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 24px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #238636, #3fb950);
  border-radius: 3px;
  transition: width 0.2s ease;
}

.share-actions {
  display: flex;
  gap: 12px;
}

.share-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.share-btn.primary {
  background: #238636;
  color: #fff;
}

.share-btn.primary:hover {
  background: #2ea043;
}

.share-btn.secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
}

.share-btn.secondary:hover {
  background: #30363d;
}

/* 遮罩层点击关闭 */
.modal-overlay {
  cursor: default;
}

.modal-overlay > * {
  cursor: default;
}

/* 重命名对话框样式 */
.rename-modal {
  max-width: 360px;
  width: 90%;
}

.rename-body {
  padding: 24px;
}

.rename-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  margin-bottom: 20px;
}

.rename-file-info svg {
  width: 28px;
  height: 28px;
  color: #58a6ff;
  flex-shrink: 0;
}

.rename-file-info span {
  font-size: 14px;
  color: #c9d1d9;
  word-break: break-all;
}

.rename-input-wrapper {
  margin-bottom: 24px;
}

.rename-input-wrapper label {
  display: block;
  font-size: 13px;
  color: #8b949e;
  margin-bottom: 8px;
  font-weight: 500;
}

.rename-input {
  width: 100%;
  padding: 12px 16px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 14px;
  transition: all 0.2s;
}

.rename-input:focus {
  outline: none;
  border-color: #58a6ff;
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15);
}

.rename-input::placeholder {
  color: #6e7681;
}

.rename-actions {
  display: flex;
  gap: 12px;
}

.rename-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.rename-btn.primary {
  background: #238636;
  color: #fff;
}

.rename-btn.primary:hover:not(:disabled) {
  background: #2ea043;
}

.rename-btn.primary:disabled {
  background: #21262d;
  color: #6e7681;
  cursor: not-allowed;
}

.rename-btn.secondary {
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
}

.rename-btn.secondary:hover {
  background: #30363d;
}
</style>
