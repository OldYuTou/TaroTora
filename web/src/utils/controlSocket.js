import { io } from 'socket.io-client'
import { normalizeServerUrl } from './serverUrl'

function resolveSocketUrl(serverUrl) {
  return normalizeServerUrl(serverUrl || localStorage.getItem('server_url') || '')
}

function resolveSocketToken(token) {
  return token || localStorage.getItem('auth_token') || ''
}

function isSameSocketServer(socket, serverUrl) {
  const currentUri = socket?.io?.uri || ''
  if (!currentUri) return true
  return currentUri.replace(/\/+$/, '') === serverUrl.replace(/\/+$/, '')
}

export function ensureControlSocket(options = {}) {
  const serverUrl = resolveSocketUrl(options.serverUrl)
  const token = resolveSocketToken(options.token)

  if (!serverUrl || !token) return null

  let socket = window.controlSocket || null

  if (socket && !isSameSocketServer(socket, serverUrl)) {
    socket.disconnect()
    socket = null
    window.controlSocket = null
  }

  if (!socket) {
    socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    })
    window.controlSocket = socket
    return socket
  }

  socket.auth = {
    ...(socket.auth || {}),
    token
  }

  if (socket.disconnected) {
    socket.connect()
  }

  window.controlSocket = socket
  return socket
}
