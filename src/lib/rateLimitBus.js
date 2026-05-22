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
