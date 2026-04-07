/**
 * TaroTora - Remote Control System
 * Copyright (C) 2026 OldYuTou
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import Login from './views/Login.vue'
import FileManager from './views/FileManager.vue'
import ProcessManager from './views/ProcessManager.vue'
import Terminal from './views/Terminal.vue'
import SystemMonitor from './views/SystemMonitor.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/', redirect: '/login' },
  { path: '/files', component: FileManager },
  { path: '/processes', component: ProcessManager },
  { path: '/terminal', component: Terminal },
  { path: '/monitor', component: SystemMonitor }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(router)
app.use(ElementPlus)
app.mount('#app')
