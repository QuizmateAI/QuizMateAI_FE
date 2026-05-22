const DEVICE_ID_KEY = 'qm_device_id';

function generateUuid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const rand = () => Math.random().toString(16).slice(2, 10);
  return `${rand()}${rand()}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand()}${rand().slice(0, 4)}`;
}

let _cachedId = null;

export function getDeviceId() {
  if (_cachedId) return _cachedId;
  if (typeof window === 'undefined' || !window.localStorage) {
    // Non-browser env: tạo ephemeral ID, không persist.
    _cachedId = generateUuid();
    return _cachedId;
  }
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateUuid();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    _cachedId = id;
    return id;
  } catch {
    // localStorage có thể bị disabled (private mode, quota). Rơi về ephemeral.
    _cachedId = generateUuid();
    return _cachedId;
  }
}

export function __resetDeviceIdForTests() {
  _cachedId = null;
}

export const DEVICE_ID_STORAGE_KEY = DEVICE_ID_KEY;
