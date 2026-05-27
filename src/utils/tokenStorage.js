const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const LEGACY_KEYS = ['jwt_token', 'token'];

let _accessToken = '';
let _bootstrapPromise = null;
let _bootstrapped = false;
let _refreshFn = null;
let _refreshPromise = null;

export function configureRefresh(refreshFn) {
  _refreshFn = typeof refreshFn === 'function' ? refreshFn : null;
}

export function getAccessToken() {
  return _accessToken;
}

export function getRefreshToken() {
  return '';
}

export function setTokens({ accessToken } = {}) {
  if (accessToken) {
    _accessToken = accessToken;
  }
}

export function setAccessToken(token) {
  if (token) {
    _accessToken = token;
  }
}

export function clearTokens() {
  _accessToken = '';
  _bootstrapped = true;
  _bootstrapPromise = null;
  // Sweep any pre-migration localStorage entries so an old install doesn't leak
  // tokens after this build deploys.
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      for (const key of LEGACY_KEYS) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore — storage may be disabled */
  }
}

export function hasAccessToken() {
  return Boolean(_accessToken);
}

export function refresh() {
  if (!_refreshFn) {
    return Promise.reject(new Error('REFRESH_NOT_CONFIGURED'));
  }
  if (!_refreshPromise) {
    _refreshPromise = Promise.resolve()
      .then(() => _refreshFn())
      .then((newAccess) => {
        if (newAccess) {
          _accessToken = newAccess;
        }
        return _accessToken;
      })
      .finally(() => {
        _refreshPromise = null;
      });
  }
  return _refreshPromise;
}

export async function bootstrap() {
  if (_bootstrapped) return _accessToken;
  if (_bootstrapPromise) return _bootstrapPromise;
  if (!_refreshFn) {
    _bootstrapped = true;
    return '';
  }

  _bootstrapPromise = (async () => {
    try {
      await refresh();
    } catch {
      // No refresh cookie, expired, or revoked — treat as logged-out.
      _accessToken = '';
    } finally {
      _bootstrapped = true;
      _bootstrapPromise = null;
    }
    return _accessToken;
  })();

  return _bootstrapPromise;
}

export function isBootstrapped() {
  return _bootstrapped;
}

export function __resetForTests() {
  _accessToken = '';
  _bootstrapPromise = null;
  _bootstrapped = false;
  _refreshPromise = null;
}

export const TOKEN_KEYS = Object.freeze({
  ACCESS: ACCESS_TOKEN_KEY,
  REFRESH: REFRESH_TOKEN_KEY,
  LEGACY: LEGACY_KEYS,
});
