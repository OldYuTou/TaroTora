# Kimi Code IDE 集成详细配置

## Zed 编辑器

### 配置文件位置
- macOS: `~/.config/zed/settings.json`
- Linux: `~/.config/zed/settings.json`

### 最小配置
```json
{
  "agent_servers": {
    "Kimi Code CLI": {
      "type": "custom",
      "command": "kimi",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

### 完整配置示例
```json
{
  "agent_servers": {
    "Kimi Code CLI": {
      "type": "custom",
      "command": "/home/username/.local/bin/kimi",
      "args": ["acp"],
      "env": {
        "KIMI_API_KEY": "sk-kimi-xxx"
      }
    }
  },
  "features": {
    "agent": true
  }
}
```

### 使用
1. 保存配置后重启 Zed
2. 打开 Agent 面板（默认快捷键 `Ctrl+Shift+K`）
3. 选择 "Kimi Code CLI" 创建会话

---

## JetBrains 系列

### 支持 IDE
- IntelliJ IDEA
- PyCharm
- WebStorm
- GoLand
- PhpStorm
- Rider

### 前置条件
1. 安装 JetBrains AI 插件
2. 若无订阅，启用 mock 响应：
   - 连按两次 Shift → 搜索 "注册表"
   - 找到 `llm.enable.mock.response` 并启用

### 配置步骤
1. 打开 AI 聊天面板
2. 点击菜单 → "Configure ACP agents"
3. 添加配置：
```json
{
  "agent_servers": {
    "Kimi Code CLI": {
      "command": "~/.local/bin/kimi",
      "args": ["acp"],
      "env": {}
    }
  }
}
```
4. 在 Agent 选择器中选择 Kimi Code CLI

### 查找 kimi 路径
```bash
which kimi
# 或
whereis kimi
```

---

## VS Code (Kimi Code 官方扩展)

### 安装
1. 打开扩展视图 (`Ctrl+Shift+X`)
2. 搜索 "Kimi Code" 并安装
3. 点击活动栏 Kimi 图标打开面板

### 文件引用
| 语法 | 说明 |
|------|------|
| `@app.ts` | 引用单个文件 |
| `@src/handlers/` | 引用文件夹 |
| `@src/app.ts:10-20` | 引用特定行范围 |
| `Alt+K` | 快速插入当前文件 |

### MCP 服务器配置

操作菜单 → MCP 服务器：

| 服务器 | 功能 | 认证 |
|--------|------|------|
| Playwright | 浏览器自动化 | 无需 |
| Context7 | 实时文档 | 无需 |
| GitHub | API 访问 | OAuth |

支持两种传输类型：
- **stdio**: 本地命令行工具
- **http**: 远程服务（可选 OAuth）

### 设置项

| 设置 | 默认值 | 说明 |
|------|--------|------|
| `kimi.yoloMode` | false | 自动批准所有工具调用 |
| `kimi.autosave` | true | 读写文件前自动保存 |
| `kimi.executablePath` | "" | 自定义 CLI 路径 |
| `kimi.environmentVariables` | {} | 传递给 CLI 的环境变量 |

### 命令面板命令
- "Kimi Code: 在新标签页打开"
- "Kimi Code: 在侧边栏打开"
- "Kimi Code: 新建对话"

---

## 故障排查

### ACP 连接失败
1. 确认 `kimi acp` 可单独运行
2. 检查命令路径是否正确
3. 查看 IDE 的 Agent/AI 面板输出日志

### 认证问题
1. 在终端运行 `kimi /login` 完成授权
2. 检查 `~/.config/kimi/` 下的配置文件
3. 重新创建 API Key（如过期）

### 性能问题
- 减少引用的文件数量
- 使用 `/compact` 压缩上下文
- 关闭不必要的 MCP 服务器
