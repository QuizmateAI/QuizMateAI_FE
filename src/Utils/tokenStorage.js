const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const LEGACY_KEYS = ['jwt_token', 'token']

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function getAccessToken() {
  const storage = safeStorage()
  if (!storage) return ''
  const primary = storage.getItem(ACCESS_TOKEN_KEY)
  if (primary) return primary
  for (const key of LEGACY_KEYS) {
    const legacy = storage.getItem(key)
    if (legacy) return legacy
  }
  return ''
}

export function getRefreshToken() {
  const storage = safeStorage()
  return storage ? storage.getItem(REFRESH_TOKEN_KEY) || '' : ''
}

export function setTokens({ accessToken, refreshToken } = {}) {
  const storage = safeStorage()
  if (!storage) return
  if (accessToken) storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function setAccessToken(token) {
  const storage = safeStorage()
  if (!storage || !token) return
  storage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearTokens() {
  const storage = safeStorage()
  if (!storage) return
  storage.removeItem(ACCESS_TOKEN_KEY)
  storage.removeItem(REFRESH_TOKEN_KEY)
  for (const key of LEGACY_KEYS) storage.removeItem(key)
}

export function hasAccessToken() {
  return Boolean(getAccessToken())
}

export const TOKEN_KEYS = Object.freeze({
  ACCESS: ACCESS_TOKEN_KEY,
  REFRESH: REFRESH_TOKEN_KEY,
  LEGACY: LEGACY_KEYS,
})
