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

## 2026-04-11 APK WebSocket 连接失败

### 现象

- 公网地址 `https://REDACTED_DOMAIN/#/login` 已经可以访问。
- 浏览器公网 WebSocket 连接验证通过。
- 手机上通过 APK 登录时仍提示 `WebSocket 连接失败`。

### 根因

1. 手机安装的是旧 APK。
   - 旧包 `TaroTora-debug-v10.apk` 的实际版本是 `versionCode=5 / versionName=1.3.8`。
   - 旧包内置前端资源为 `assets/public/assets/index-623d124a.js`，没有包含后续的 HTTPS 地址修复和 Socket.IO 握手认证修复。

2. APK 运行环境和浏览器公网页面不同。
   - 浏览器打开公网地址时，`window.location.origin` 是 `https://REDACTED_DOMAIN`。
   - Capacitor APK 内部页面 origin 可能是本机 WebView 地址，例如 `http://localhost`。
   - 如果 APK 本地缓存过 `localhost` 或 HTTP 地址，登录和 Socket 初始化会继续使用旧地址，导致手机端 WebSocket 连接失败。

3. Socket.IO 认证曾经只依赖后续 `auth` 事件。
   - 服务端握手阶段已经检查 token。
   - 前端未统一在 Socket.IO 初始化时传递 `auth: { token }`，会导致连接在握手阶段被拒绝。

4. 服务端从项目根目录启动时曾经读错 `.env`。
   - 未显式加载 `server/.env` 时会回退到默认 token。
   - 这会造成 HTTP 接口和 Socket token 判断不一致。

5. APK 签名类型必须匹配。
   - 手机上当前安装的是 debug 签名包，证书指纹为 `REDACTED_DEBUG_FINGERPRINT`。
   - 正式包证书指纹为 `REDACTED_RELEASE_FINGERPRINT`。
   - 因此不能用正式包直接覆盖 debug 包，否则会签名不一致；本次手机安装使用 `TaroTora-debug-v11.apk` 覆盖。

### 修复内容

- 服务端入口显式加载 `server/.env`。
- 前端 Socket.IO 初始化统一传递 `auth: { token }`。
- 登录页在 HTTPS 公网页面检测到 HTTP 缓存地址时自动切换到当前 HTTPS origin。
- 新增 `web/src/utils/serverUrl.js`，在 APK 原生环境下将 `localhost` 或 `http://REDACTED_DOMAIN` 自动纠正为 `https://REDACTED_DOMAIN`。
- 将 Web 端版本提升到 `1.3.9`，Android `versionCode` 提升到 `11`。
- 重新执行 `npm run build`、`npm run cap:sync`，并重建 debug/release APK。
- 正式签名包同步到 `TaroTora.apk`、`TaroTora-release-v1.3.9.apk` 和 `server/apk/TaroTora.apk`。
- debug 覆盖安装包同步到 `TaroTora-debug-v11.apk` 和 `TaroTora-debug.apk`。
- 同步最新前端构建到 `server/public`，公网首页加载 `index-9dd3cfb0.js`。

### 验证

- `npm run build` 通过。
- `npm run cap:sync` 通过。
- `.\gradlew.bat assembleDebug` 通过。
- `.\gradlew.bat assembleRelease` 通过。
- `aapt dump badging` 确认新 APK 为 `versionCode=11 / versionName=1.3.9`。
- `jar tf` 确认新 APK 内置 `assets/public/assets/index-9dd3cfb0.js`。
- `apksigner verify` 确认正式包签名通过，并与旧正式包证书一致。
- `https://REDACTED_DOMAIN/` 确认加载新资源 `index-9dd3cfb0.js`。
- `https://REDACTED_DOMAIN/api/app/version` 返回 `version=1.3.9 / versionCode=11`。
- Node Socket.IO 客户端验证公网 WebSocket：`SOCKET_OK transport=websocket`。
- ADB 安装到手机：`adb install -r .\TaroTora-debug-v11.apk` 返回 `Success`。
- 手机端 `dumpsys package` 确认已安装 `versionCode=11 / versionName=1.3.9`。
- 手机端应用已启动，`pidof com.tarotora.remotecontrol` 返回运行中进程，最近 `logcat` 未发现 `FATAL EXCEPTION`。

### 后续注意

- 如果手机上安装的是 debug 包，继续用 debug 签名包覆盖安装；如果要切到正式包，需要先卸载旧 debug 包或使用同一签名链。
- 每次改动前端后，都需要重新执行 `npm run build` 和 `npm run cap:sync`，再重建 APK；只更新 `server/public` 不会改变已安装 APK 内置资源。
- `web/android` 是生成目录且被 `.gitignore` 忽略，`cap sync` 可能重写 Cordova 子项目构建文件；本机如遇 Gradle 下载失败，需要重新确认镜像仓库和本机 Build Tools 配置。
