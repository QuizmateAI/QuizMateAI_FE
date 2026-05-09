/**
 * Stable per-browser-instance ID dùng cho header X-Device-Id.
 *
 * BE dùng giá trị này làm device fingerprint cho feature "device-aware logout"
 * (khi login lại trên cùng device, chỉ revoke session cũ trên đúng device đó).
 * Trước đây fingerprint = SHA256(User-Agent) — mọi tab cùng browser có cùng hash
 * nên login ở tab này revoke nhầm token tab khác. UUID lưu localStorage phân biệt
 * được instance.
 *
 * Khi user clear localStorage: nhận device ID mới ⇒ session cũ không bị coi là
 * "same device" ⇒ token cũ sống tới hết hạn tự nhiên (≤7 ngày). Trade-off chấp nhận.
 */
const DEVICE_ID_KEY = 'qm_device_id';

function generateUuid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback cho môi trường thiếu crypto.randomUUID (rất hiếm trên browser hiện đại,
  // nhưng giữ để code chạy được trong test runner / SSR).
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

/** Test-only reset. */
export function __resetDeviceIdForTests() {
  _cachedId = null;
}

export const DEVICE_ID_STORAGE_KEY = DEVICE_ID_KEY;
