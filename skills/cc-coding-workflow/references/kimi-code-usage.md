# Kimi Code 使用参考

## 快速命令

### Spawn Kimi Code 子代理

```javascript
// 基础用法
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: "实现用户登录功能，包括表单验证和JWT token生成",
  cwd: "/root/project/myapp",
  mode: "session",
  thread: true
})
```

### 带完整上下文的复杂任务

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: `
【任务】重构用户管理模块
【项目】/root/project/myapp
【背景】当前使用回调函数，需要改为 async/await
【具体需求】
1. 重构 src/models/user.js
2. 更新 src/services/userService.js 中的所有调用
3. 确保所有测试通过
4. 保持 API 兼容性

【技术栈】
- Node.js 18
- Express 4.x
- Mongoose 7.x
- Jest 测试框架

【验收标准】
- [ ] npm test 全部通过
- [ ] 代码通过 ESLint 检查
- [ ] 无功能回归
  `,
  cwd: "/root/project/myapp",
  mode: "session",
  thread: true
})
```

## 子代理管理

### 查看活跃会话

```javascript
sessions_list()
// 或
subagents({ action: "list" })
```

### 查看子代理历史

```javascript
sessions_history({
  sessionKey: "agent-session-key",
  limit: 50
})
```

### 向子代理发送消息

```javascript
sessions_send({
  sessionKey: "agent-session-key",
  message: "请修复测试中的错误"
})
```

### 终止子代理

```javascript
subagents({
  action: "kill",
  target: "agent-session-key"
})
```

## 任务类型示例

### 1. 新功能开发

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: `
实现一个 Todo List API，包含：
- POST /todos 创建任务
- GET /todos 获取列表（支持分页）
- PUT /todos/:id 更新任务
- DELETE /todos/:id 删除任务
- PATCH /todos/:id/complete 标记完成

使用 Express + MongoDB，包含输入验证和错误处理。
`,
  cwd: "/root/project/todo-api",
  mode: "session",
  thread: true
})
```

### 2. Bug 修复

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: `
【Bug】用户登录时偶尔返回 500 错误
【错误日志】TypeError: Cannot read property 'password' of undefined
【复现步骤】
1. 使用不存在的邮箱登录
2. 后端抛出异常

【期望行为】返回 401 和友好的错误消息
【项目路径】/root/project/myapp
【相关文件】src/controllers/auth.js, src/services/authService.js
`,
  cwd: "/root/project/myapp",
  mode: "session",
  thread: true
})
```

### 3. 代码重构

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: `
重构 utils/helpers.js：
- 将 5 个工具函数拆分到单独文件
- 统一使用 ES Module 语法
- 添加 JSDoc 注释
- 保持现有 API 不变（向后兼容）

项目路径：/root/project/myapp
`,
  cwd: "/root/project/myapp",
  mode: "session",
  thread: true
})
```

### 4. 项目初始化

```javascript
sessions_spawn({
  runtime: "acp",
  agentId: "kimi-code",
  task: `
初始化一个新的 React + TypeScript 项目：
- 使用 Vite 构建工具
- 配置 ESLint + Prettier
- 安装 React Router 和 Tailwind CSS
- 创建基础目录结构
- 添加示例页面组件

输出路径：/root/projects/my-new-app
`,
  cwd: "/root/projects",
  mode: "session",
  thread: true
})
```

## 评估决策参考

### 必须自己写的场景

| 场景 | 原因 |
|------|------|
| 修改配置文件 | 快速、安全、上下文明确 |
| 单文件脚本 < 50 行 | spawn 开销不值得 |
| 查看/解释代码 | 我需要理解后向用户解释 |
| 简单的格式调整 | 太简单，不值得 spawn |
| 用户要求"快速看一下" | 响应速度优先 |

### 必须 spawn 的场景

| 场景 | 原因 |
|------|------|
| 涉及 3+ 个文件的修改 | 需要保持一致性 |
| 需要运行测试 | 验证修改正确性 |
| 陌生代码库 | 需要时间探索理解 |
| 复杂业务逻辑 | 需要仔细设计和实现 |
| 需要生成大量代码 | 效率考虑 |

### 边界情况（根据上下文决定）

| 场景 | 倾向 | 判断依据 |
|------|------|----------|
| 2 个文件的小改动 | 自己写 | 如果改动简单 |
| 2 个文件的重构 | spawn | 涉及接口变更 |
| 熟悉的项目 | 自己写 | 即使文件多，如果模式熟悉 |
| 陌生的项目 | spawn | 即使改动小，需要理解上下文 |

## 最佳实践

### 1. 任务描述要具体

❌ 差的描述：
```
帮我修一下登录功能
```

✅ 好的描述：
```
【Bug】登录接口返回 500
【错误】TypeError: Cannot read property 'password' of undefined
【文件】src/controllers/auth.js:45
【期望】返回 401 和友好错误消息
```

### 2. 提供足够的上下文

- 项目技术栈和版本
- 相关文件位置
- 现有代码风格
- 特殊约束（兼容性、性能等）

### 3. 验收标准要明确

```
【验收标准】
- [ ] 功能 A 可用
- [ ] 测试 B 通过
- [ ] 符合代码规范 C
```

### 4. 保持监控但不 micromanage

- 让子代理自主工作
- 只在关键节点介入
- 出现问题及时纠正方向

### 5. 结果 review

- 检查关键改动
- 验证验收标准
- 向用户清晰汇报
