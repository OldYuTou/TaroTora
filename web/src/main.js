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
