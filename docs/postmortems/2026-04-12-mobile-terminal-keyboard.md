# 2026-04-12 移动端终端输入后视图消失复盘

## 现象

- 手机端 APK 的控制页终端可以双击唤起软键盘。
- 软键盘刚唤起时还能看到终端内容。
- 输入任意字符后，终端内容和终端样式像是直接消失，屏幕内看不到光标和文字。
- 修复前用户判断可能是光标或终端内容被滚到屏幕外。

## 根因

1. 新增的隐藏输入框放在屏幕外。
   - `web/src/views/ControlMobile.vue` 里用于唤起软键盘的 `<textarea class="mobile-input">` 使用了 `position: absolute` 和 `bottom: -1000px`。
   - Android WebView 在输入框获得焦点和首次输入时，会尝试把真实输入控件滚动到可视区域。
   - 因为输入框实际位于屏幕外，WebView 的自动滚动会把页面或终端区域一起带偏，表现为终端内容从可视区消失。

2. 输入后没有及时刷新 xterm 视图。
   - 软键盘弹出会改变 `visualViewport` 高度。
   - xterm 的 canvas/viewport 在移动端 WebView 中对键盘尺寸变化不总是稳定重绘。
   - 输入发送后如果只依赖服务端回显触发渲染，可能出现可视区与实际终端缓冲区状态不同步。

3. 相关兼容层还有两个顺手修复点。
   - 旧版终端页曾在浏览器端读取 `process.platform`，WebView 环境下这个对象不稳定，改为使用 `navigator.platform` 判断客户端平台。
   - 服务端旧版终端历史缓存裁剪时，`totalSize` 没有在循环中递减，超过上限后可能一次性清空缓存，已改为每移除一段就同步扣减大小。

## 修复内容

- 将 `ControlMobile.vue` 的隐藏输入框改为视口内 1px 固定定位：
  - `position: fixed`
  - `bottom: 0`
  - `left: 0`
  - `width: 1px`
  - `height: 1px`
  - `opacity: 0.01`
- 保留输入框不可见和不可触摸，但不再把它放到屏幕外，避免 Android WebView 自动滚动页面。
- 新增 `refreshTerminalViewport()`，在以下时机刷新或重新 fit 当前 xterm：
  - 唤起键盘后
  - 输入文本后
  - 中文组合输入结束后
  - 输入模式下收到终端输出后
  - `window.visualViewport` 尺寸变化后
  - 普通窗口 resize 后
- 同步版本到 `1.4.1 / versionCode=1987654`，重建 debug/release APK 并更新 `server/public` 和 `server/apk/TaroTora.apk`。

## 验证

- `npm run build` 通过。
- `npm run cap:sync` 通过。
- `.\gradlew.bat assembleDebug` 通过。
- `.\gradlew.bat assembleRelease` 通过。
- `aapt dump badging .\TaroTora.apk` 确认 `versionCode=1987654 / versionName=1.4.1`。
- `jar tf .\TaroTora.apk` 确认 APK 内置 `assets/public/assets/index-d518c979.js` 和 `index-c8e4bedc.css`。
- `apksigner verify --verbose --print-certs .\TaroTora.apk` 确认正式包 v1/v2/v3 签名通过。
- `https://REDACTED_DOMAIN/api/app/version` 返回 `version=1.4.1 / versionCode=1987654`。
- `https://REDACTED_DOMAIN/` 确认加载 `index-d518c979.js` 和 `index-c8e4bedc.css`。
- 用户手机端复测确认：修复正常。

## 后续注意

- 移动端 WebView 里用于唤起键盘的隐藏输入框不要放到屏幕外，也不要使用负 z-index。
- 隐藏输入框应保持在视口内极小尺寸，使用透明度隐藏，并通过 `focus({ preventScroll: true })` 聚焦。
- 软键盘弹出、收起时要考虑 `visualViewport` 尺寸变化，并主动刷新 xterm。
- 改完 APK 内置前端资源后，必须重新执行 `npm run cap:sync` 并重建 APK；只同步 `server/public` 不会更新已安装 APK。
