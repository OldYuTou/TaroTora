const PUBLIC_SERVER_URL = 'https://REDACTED_DOMAIN'

export function isNativeApp() {
  const capacitor = window.Capacitor
  return Boolean(
    capacitor?.isNativePlatform?.() ||
    capacitor?.getPlatform?.() === 'android' ||
    capacitor?.getPlatform?.() === 'ios'
  )
}

function isLocalHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === ''
}

function shouldUsePublicServerUrl(url) {
  if (!isNativeApp()) return false

  try {
    const parsed = new URL(url)
    if (isLocalHost(parsed.hostname)) return true
    return parsed.hostname === 'REDACTED_DOMAIN' && parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function getDefaultServerUrl() {
  if (isNativeApp()) return PUBLIC_SERVER_URL

  const host = window.location.hostname
  if ((window.location.protocol === 'http:' || window.location.protocol === 'https:') && !isLocalHost(host)) {
    return window.location.origin
  }

  return ''
}

export function normalizeServerUrl(server) {
  const trimmed = (server || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${window.location.protocol === 'https:' ? 'https' : 'http'}://${trimmed}`

  if (shouldUsePublicServerUrl(withProtocol)) {
    return PUBLIC_SERVER_URL
  }

  if (window.location.protocol === 'https:' && withProtocol.startsWith('http://')) {
    return getDefaultServerUrl()
  }

  return withProtocol
}
