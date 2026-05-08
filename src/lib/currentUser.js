/**
 * Single source of truth for the lightweight user snapshot kept on the client.
 *
 * Why this module exists:
 *   The user identity blob ({ userID, username, role, email, authProvider })
 *   used to be read directly via localStorage.getItem('user') in 8+ places.
 *   Each call site re-implemented JSON.parse/try-catch and could not react to
 *   changes within the same tab. This helper centralizes read/write, exposes
 *   a subscription model, and keeps backward-compat with the existing
 *   localStorage key so progressive migration is safe.
 *
 * Notes:
 *   - This is NOT the canonical profile (server-authoritative). Use
 *     UserProfileContext + Authentication API for the full profile. This blob
 *     is the minimal identity needed for FE-side role gates and offline UX.
 *   - Role checks based on this blob remain UX-only (workspace AGENTS.md).
 */

const STORAGE_KEY = 'user';
const subscribers = new Set();

// Snapshot cache: getSnapshot() must return a referentially stable value while
// the underlying source hasn't changed (required by useSyncExternalStore).
// We memoize on the raw localStorage string and only re-parse when it differs.
let cachedRaw;
let cachedSnapshot = null;
let cacheInitialized = false;

function safeParse(raw) {
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function readRawFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const raw = readRawFromStorage();
  if (cacheInitialized && raw === cachedRaw) {
    return cachedSnapshot;
  }
  cachedRaw = raw;
  cachedSnapshot = safeParse(raw);
  cacheInitialized = true;
  return cachedSnapshot;
}

function invalidateCache() {
  cacheInitialized = false;
}

export function setCurrentUser(user) {
  if (typeof window !== 'undefined') {
    try {
      if (user) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage disabled or full — ignore so caller can keep going */
    }
  }
  invalidateCache();
  notify();
}

export function clearCurrentUser() {
  setCurrentUser(null);
}

export function subscribeCurrentUser(listener) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function notify() {
  for (const listener of subscribers) {
    try {
      listener();
    } catch {
      /* ignore subscriber errors so one bad listener doesn't break the rest */
    }
  }
}

if (typeof window !== 'undefined') {
  // Cross-tab updates: storage events fire only in OTHER tabs/windows.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      invalidateCache();
      notify();
    }
  });

  // Same-tab login/logout dispatches 'auth:changed' from Authentication.js.
  // Notify subscribers so subscribed hooks re-render even if the consumer
  // didn't go through setCurrentUser() directly (e.g. legacy code paths).
  window.addEventListener('auth:changed', () => {
    invalidateCache();
    notify();
  });
}

export const CURRENT_USER_STORAGE_KEY = STORAGE_KEY;
