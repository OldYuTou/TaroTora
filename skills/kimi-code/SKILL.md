---
name: "kimi-code"
description: "Kimi Code CLI 使用指南。涵盖安装配置、交互模式、会话管理、IDE 集成（Zed/JetBrains/VS Code）、第三方 Agent 集成（Claude Code/Roo Code）以及常见编程任务。当用户需要使用 Kimi Code CLI 进行编程、配置环境、集成 IDE 或解决使用问题时触发。"
---

# Kimi Code CLI 使用指南

Kimi Code CLI 是运行在终端中的 AI Agent，帮助完成软件开发任务和终端操作。

## 快速开始

### 安装

```bash
# Linux / macOS
curl -LsSf https://code.kimi.com/install.sh | bash

# 或已有 uv 时
uv tool install --python 3.13 kimi-cli
```

### 首次配置

```bash
cd 你的项目目录
kimi
/login          # 选择 Kimi Code 平台，浏览器 OAuth 授权
/init           # 生成 AGENTS.md（可选）
```

### 升级与卸载

```bash
uv tool upgrade kimi-cli --no-cache    # 升级
uv tool uninstall kimi-cli             # 卸载
```

## 三种使用方式

| 方式 | 命令 | 场景 |
|------|------|------|
| **交互式 CLI** | `kimi` | 终端对话，自然语言描述任务 |
| **浏览器界面** | `kimi web` | 图形界面，会话管理、代码高亮 |
| **Agent 集成** | `kimi acp` | 通过 ACP 协议集成到 IDE |

## 交互模式

按 `Ctrl+X` 切换模式：

| 模式 | 说明 |
|------|------|
| **Agent 模式** | 默认，输入发送给 AI 处理 |
| **Shell 模式** | 直接执行 Shell 命令（`cd`、`export` 等环境变更不影响后续命令） |

其他快捷键：
- `Ctrl-J` / `Alt-Enter`：多行输入插入换行
- `/model`：切换模型和 Thinking 模式
- `--thinking`：启动时启用深度思考

## 常见使用案例

### 实现新功能
```
给用户列表页面添加分页功能，每页显示 20 条记录
```

### 修复 bug
```
用户登录后跳转到首页时偶尔会显示未登录状态，帮我排查
```
或贴错误日志：
```
运行 npm test 出现这个错误：
TypeError: Cannot read property 'map' of undefined
帮我修复
```

### 理解项目
```
解释一下 src/core/scheduler.py 这个文件的作用
```

### 自动化任务
```
把 src 目录下所有 .js 文件的 var 声明改成 const 或 let
给所有没有 docstring 的公开函数添加文档注释
```

## IDE 集成

### Zed

`~/.config/zed/settings.json`：
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

### JetBrains (IntelliJ/PyCharm/WebStorm)

AI 聊天面板 → Configure ACP agents：
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

提示：无 JetBrains AI 订阅可启用注册表 `llm.enable.mock.response`

### VS Code (Kimi Code 扩展)

- 文件引用：`@文件名` 或 `@app.ts:10-20`
- 快捷键：`Ctrl+Shift+K` 聚焦输入框，`Alt+K` 插入当前文件
- MCP 服务器：Playwright、Context7、GitHub

## 第三方 Agent 集成

### Claude Code

```bash
export ENABLE_TOOL_SEARCH=false
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
export ANTHROPIC_API_KEY=sk-kimi-xxxxxxxx  # 从控制台获取

claude
```

确认：`/status` 查看模型状态

### Roo Code (VS Code)

1. Providers 选择 `OpenAI Compatible`
2. 配置：
   - Entrypoint: `https://api.kimi.com/coding/v1`
   - API Key: 从 Kimi Code 控制台获取
   - Model: `kimi-for-coding`
   - Use legacy OpenAI API format: ✅
   - Enable streaming: ✅
   - Max Output Tokens: 32768
   - Context Window Size: 262144

## 会话管理

- 自动保存对话历史，随时续接
- 恢复会话时自动还原：YOLO 模式状态、动态子 Agent、额外目录
- `/compact`：压缩过长上下文

## 会员权益

- 每 5 小时 100-500 次请求（视套餐而定）
- 最高 100 Tokens/s 输出速度
- 最高并发 30
- 仅限个人开发，企业需用 Moonshot 开放平台

## 参考资源

- 安装问题：检查 uv 和 Python 3.12-3.14（推荐 3.13）
- macOS 首次启动慢：系统设置 → 隐私与安全性 → 开发者工具 → 添加终端
- 详细配置：见 [references/ide-integration.md](references/ide-integration.md)
