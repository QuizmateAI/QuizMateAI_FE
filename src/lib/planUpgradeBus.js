const LEGACY_EVENT_NAME = 'planUpgradeRequired';

const listeners = new Set();

export function subscribePlanUpgrade(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPlanUpgrade(detail = {}) {
  const payload = {
    message: detail.message ?? null,
    code: detail.code ?? null,
    ...detail,
  };

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      /* ignore listener errors so one bad consumer can't break the others */
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(LEGACY_EVENT_NAME, { detail: payload }));
    } catch {
      /* ignore — older browsers / SSR paths */
    }
  }
}

export const PLAN_UPGRADE_LEGACY_EVENT = LEGACY_EVENT_NAME;
