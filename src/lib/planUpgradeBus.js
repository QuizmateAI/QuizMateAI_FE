/**
 * Typed event bus for plan-upgrade prompts.
 *
 * Replaces the old `window.dispatchEvent(new CustomEvent('planUpgradeRequired'))`
 * pattern. Kept tiny and focused so consumers don't have to learn a new API:
 *
 *   const off = subscribePlanUpgrade(({ message, code }) => { ... });
 *   off();
 *
 *   emitPlanUpgrade({ message: 'Đã hết quota', code: 1066 });
 *
 * The window event is also re-dispatched for backward-compat with any legacy
 * listener that may still be registered while the migration completes.
 */

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
