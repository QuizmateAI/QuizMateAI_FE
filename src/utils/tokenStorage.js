/**
 * Auth token storage.
 *
 * Access token: kept in-memory only. Lost on tab close / hard refresh — recovered
 *   via {@link bootstrap} on app start (calls /auth/refresh, which uses the httpOnly
 *   refresh cookie sent by the BE).
 * Refresh token: lives in an httpOnly cookie set by the BE; JavaScript cannot read or
 *   write it. {@link getRefreshToken} therefore returns an empty string and is kept
 *   only so existing call sites compile while we migrate them.
 *
 * Why: putting tokens in localStorage made any XSS into a token theft. In-memory +
 *   httpOnly cookie removes that vector. Cost: a brief refresh round-trip on app load
 *   to recover the access token; if the cookie is missing/expired, the user lands
 *   unauthenticated and we send them to /login.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const LEGACY_KEYS = ['jwt_token', 'token'];

let _accessToken = '';
let _bootstrapPromise = null;
let _bootstrapped = false;
let _refreshFn = null;

/**
 * Inject the function that performs the cookie-based refresh call. Done from api.js
 * so this module stays free of axios imports (avoids a circular dep).
 */
export function configureRefresh(refreshFn) {
  _refreshFn = typeof refreshFn === 'function' ? refreshFn : null;
}

export function getAccessToken() {
  return _accessToken;
}

/**
 * Always returns ''. Kept so legacy callers compile during migration. The real
 * refresh token lives in an httpOnly cookie that JavaScript cannot read.
 */
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

/**
 * Called once at app start. Tries to recover the access token via the refresh cookie.
 * Resolves whether or not auth succeeded — callers branch on hasAccessToken() after.
 *
 * Idempotent: subsequent calls return the same in-flight promise.
 */
export async function bootstrap() {
  if (_bootstrapped) return _accessToken;
  if (_bootstrapPromise) return _bootstrapPromise;
  if (!_refreshFn) {
    _bootstrapped = true;
    return '';
  }

  _bootstrapPromise = (async () => {
    try {
      const newAccess = await _refreshFn();
      if (newAccess) {
        _accessToken = newAccess;
      }
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

/** Test-only reset. Do not call from production code. */
export function __resetForTests() {
  _accessToken = '';
  _bootstrapPromise = null;
  _bootstrapped = false;
}

export const TOKEN_KEYS = Object.freeze({
  ACCESS: ACCESS_TOKEN_KEY,
  REFRESH: REFRESH_TOKEN_KEY,
  LEGACY: LEGACY_KEYS,
});
