# TaroTora Claude 工作指南

## 工作约束

### 基本规则

- 所有回复、报告、提交信息和新增说明都使用简体中文。
- 修改代码前先确认当前工作区状态：`git status --short`。
- 不要回退用户或其他工具产生的改动；遇到无关脏文件时保持原样。
- 不要盲目等待。启动服务、构建、测试、安装 APK 等耗时操作都必须设置超时，并根据日志判断成功或失败。
- 操作失败后先分析日志，再做有针对性的修改；不要在没有改动的情况下反复重试。

### Git 规范

- 本项目必须进行版本管理。
- GitHub 上的提交先在本地用 Git 完成，通常流程是 `git add .`、`git commit -m "中文提交信息"`、`git status -sb`。
- 只有用户明确要求同步远端时才执行 `git push`；不要擅自推送到 GitHub。
- 每完成一段代码修改、功能更新或 Bug 修复后，执行：
  ```bash
  git add .
  ```
- 一轮任务完成前，根据改动程度提交一次 commit。
- commit 信息必须使用中文，并概括本轮改动，例如：
  ```bash
  git commit -m "修复 APK 公网地址缓存问题"
  ```
- 提交前建议执行：
  ```bash
  git status --short
  git diff --check
  ```
- 提交后确认工作区干净：
  ```bash
  git status --short
  git log -1 --oneline
  ```

### history.json 规范

- 每次完成任务后，都要更新项目根目录的 `history.json`。
- 新增记录建议包含：
  - `date`：日期，例如 `2026-04-11`
  - `summary`：一句话总结
  - `changes`：本次变更点
  - `verification`：实际执行过的验证命令或验证结果
- 更新后必须检查 JSON 是否可解析：
  ```bash
  node -e "JSON.parse(require('fs').readFileSync('history.json','utf8')); console.log('JSON_OK')"
  ```

### 问题复盘文档规范

- `CLAUDE.md` 只保留长期有效的工作约束、项目惯例和复盘索引，不直接堆放完整事故复盘。
- 完整问题复盘放到 `docs/postmortems/`，文件名格式建议为 `YYYY-MM-DD-问题关键词.md`。
- 每篇复盘建议包含：现象、根因、修复内容、验证结果、后续注意。
- 新增或迁移复盘文档后，同步更新 `history.json`。
- 本次 APK WebSocket 问题复盘见 `docs/postmortems/2026-04-11-apk-websocket.md`。
- 移动端终端输入后视图消失问题复盘见 `docs/postmortems/2026-04-12-mobile-terminal-keyboard.md`。

### 测试与交付规范

- 交付前必须做与改动相关的验证，不能只写“已修改”。
- Web 前端改动至少执行：
  ```bash
  cd web
  npm run build
  ```
- APK 内置前端资源改动必须执行：
  ```bash
  cd web
  npm run build
  npm run cap:sync
  cd android
  .\gradlew.bat assembleDebug
  .\gradlew.bat assembleRelease
  ```
- 修改服务端 JavaScript 后至少执行相关语法检查或启动验证。
- 涉及公网 WebSocket 时，应验证公网握手，不要只验证本地地址。

### APK 与签名注意事项

- `web/android` 是生成目录，可能被 `.gitignore` 忽略；`cap sync` 会重写其中部分文件。
- 每次前端改动后，如果需要更新 APK，必须重新 `npm run cap:sync` 并重建 APK。
- 只同步 `server/public` 不会更新已经安装在手机里的 APK 内置资源。
- 手机上安装 debug 包时，必须用 debug 签名包覆盖；正式包和 debug 包签名不同，不能直接互相覆盖。
- 当前已知证书指纹：
  - debug 包：`REDACTED_DEBUG_FINGERPRINT`
  - 正式包：`REDACTED_RELEASE_FINGERPRINT`
- 安装到手机前建议先确认签名和当前安装版本：
  ```bash
  adb devices -l
  adb shell dumpsys package com.tarotora.remotecontrol
  adb shell pm path com.tarotora.remotecontrol
  ```
- 覆盖安装 debug 包示例：
  ```bash
  adb install -r .\TaroTora-debug-v11.apk
  ```

### 服务端与公网注意事项

- 服务端入口必须读取 `server/.env`，不要让服务从仓库根目录启动时回退到默认 token。
- Socket.IO 客户端初始化必须传递：
  ```js
  auth: { token }
  ```
- HTTPS 公网页面不能继续使用缓存的 HTTP 服务器地址。
- APK 原生环境中，如果缓存了 `localhost` 或 `http://REDACTED_DOMAIN`，需要纠正到：
  ```text
  https://REDACTED_DOMAIN
  ```
