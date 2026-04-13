import { Capacitor, registerPlugin } from '@capacitor/core'

const TerminalReminderBackground = registerPlugin('TerminalReminderBackground')

function isAndroidNative() {
  return Capacitor.getPlatform?.() === 'android'
}

export async function syncBackgroundReminderService({ serverUrl, token, enabled, appActive }) {
  if (!isAndroidNative()) return null

  try {
    console.info('[ReminderBG] sync', {
      enabled: Boolean(enabled),
      appActive: Boolean(appActive),
      serverUrlPresent: Boolean(serverUrl),
      tokenPresent: Boolean(token)
    })
    return await TerminalReminderBackground.sync({
      serverUrl,
      token,
      enabled: Boolean(enabled),
      appActive: Boolean(appActive)
    })
  } catch (error) {
    console.error('同步后台终端提醒服务失败:', error)
    return null
  }
}

export async function stopBackgroundReminderService(clearConfig = false) {
  if (!isAndroidNative()) return null

  try {
    console.info('[ReminderBG] stop', { clearConfig: Boolean(clearConfig) })
    return await TerminalReminderBackground.stop({ clearConfig: Boolean(clearConfig) })
  } catch (error) {
    console.error('停止后台终端提醒服务失败:', error)
    return null
  }
}

export function supportsBackgroundReminderService() {
  return isAndroidNative()
}
