import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const STORAGE_KEY = 'terminal_reminder_session_state'
const CHANNEL_ID = 'terminal-reminders'

let notificationReady = false

function readReminderState() {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.sessionStorage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeReminderState(state) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 忽略 sessionStorage 不可用
  }
}

function normalizeEntry(entry = {}) {
  return {
    enabled: false,
    hasUserMessage: false,
    name: '',
    cwd: '',
    ...entry
  }
}

export function getTerminalReminderState(terminalId) {
  if (!terminalId) return normalizeEntry()
  const state = readReminderState()
  return normalizeEntry(state[terminalId])
}

export function updateTerminalReminderState(terminalId, patch = {}) {
  if (!terminalId) return normalizeEntry()

  const state = readReminderState()
  const next = normalizeEntry({
    ...state[terminalId],
    ...patch
  })
  state[terminalId] = next
  writeReminderState(state)
  return next
}

export function removeTerminalReminderState(terminalId) {
  if (!terminalId) return

  const state = readReminderState()
  delete state[terminalId]
  writeReminderState(state)
}

export async function ensureTerminalReminderPermission() {
  if (Capacitor.getPlatform?.() === 'web') {
    if (!('Notification' in window)) return true
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    return (await Notification.requestPermission()) === 'granted'
  }

  if (!notificationReady) {
    await LocalNotifications.createChannel?.({
      id: CHANNEL_ID,
      name: '终端提醒',
      description: '终端输出停止后的消息提醒',
      importance: 4,
      visibility: 1
    })
    notificationReady = true
  }

  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true

  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted'
}

export async function notifyTerminalReminder({ title, body }) {
  const allowed = await ensureTerminalReminderPermission()
  if (!allowed) return false

  if (Capacitor.getPlatform?.() === 'web') {
    if ('Notification' in window) {
      new Notification(title, { body })
    }
    return true
  }

  await LocalNotifications.schedule({
    notifications: [{
      id: Date.now() % 2147483647,
      title,
      body,
      channelId: CHANNEL_ID,
      schedule: { at: new Date(Date.now() + 100) }
    }]
  })

  return true
}
