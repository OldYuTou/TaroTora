# 2026-04-11 APK WebSocket 连接失败复盘

## 现象

- 公网地址 `https://REDACTED_DOMAIN/#/login` 已经可以访问。
- 浏览器公网 WebSocket 连接验证通过。
- 手机上通过 APK 登录时仍提示 `WebSocket 连接失败`。

## 根因

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

## 修复内容

- 服务端入口显式加载 `server/.env`。
- 前端 Socket.IO 初始化统一传递 `auth: { token }`。
- 登录页在 HTTPS 公网页面检测到 HTTP 缓存地址时自动切换到当前 HTTPS origin。
- 新增 `web/src/utils/serverUrl.js`，在 APK 原生环境下将 `localhost` 或 `http://REDACTED_DOMAIN` 自动纠正为 `https://REDACTED_DOMAIN`。
- 将 Web 端版本提升到 `1.3.9`，Android `versionCode` 提升到 `11`。
- 重新执行 `npm run build`、`npm run cap:sync`，并重建 debug/release APK。
- 正式签名包同步到 `TaroTora.apk`、`TaroTora-release-v1.3.9.apk` 和 `server/apk/TaroTora.apk`。
- debug 覆盖安装包同步到 `TaroTora-debug-v11.apk` 和 `TaroTora-debug.apk`。
- 同步最新前端构建到 `server/public`，公网首页加载 `index-9dd3cfb0.js`。

## 验证

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

## 后续注意

- 如果手机上安装的是 debug 包，继续用 debug 签名包覆盖安装；如果要切到正式包，需要先卸载旧 debug 包或使用同一签名链。
- 每次改动前端后，都需要重新执行 `npm run build` 和 `npm run cap:sync`，再重建 APK；只更新 `server/public` 不会改变已安装 APK 内置资源。
- `web/android` 是生成目录且被 `.gitignore` 忽略，`cap sync` 可能重写 Cordova 子项目构建文件；本机如遇 Gradle 下载失败，需要重新确认镜像仓库和本机 Build Tools 配置。
