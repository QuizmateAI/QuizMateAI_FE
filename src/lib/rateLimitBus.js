/**
 * Typed event bus cho HTTP 429 (rate-limit) — mirror pattern của planUpgradeBus.
 *
 * Axios response interceptor emit sau khi BE trả 429; bất kỳ React component
 * nào cần phản ứng (vd hiển thị toast) gọi `subscribeRateLimit(listener)` rồi
 * gọi hàm unsub trả về để cleanup.
 *
 *   const off = subscribeRateLimit(({ url, message }) => { ... });
 *   off();
 *
 *   emitRateLimit({ url: '/auth/send-otp', message: 'Too Many Requests' });
 */

const listeners = new Set();

export function subscribeRateLimit(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitRateLimit(detail = {}) {
  const payload = {
    url: detail.url ?? null,
    message: detail.message ?? null,
    ...detail,
  };

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      /* ignore listener errors so one bad consumer can't break the others */
    }
  }
}
