import { describe, expect, it, vi } from 'vitest';
import {
  PLAN_UPGRADE_LEGACY_EVENT,
  emitPlanUpgrade,
  subscribePlanUpgrade,
} from '@/lib/planUpgradeBus';

describe('planUpgradeBus', () => {
  it('delivers events to active subscribers', () => {
    const listener = vi.fn();
    const off = subscribePlanUpgrade(listener);

    emitPlanUpgrade({ message: 'Quota exhausted', code: 1066 });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quota exhausted', code: 1066 }),
    );

    off();
    emitPlanUpgrade({ message: 'After unsubscribe', code: 1056 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('isolates failures so one bad listener does not break the rest', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const offBad = subscribePlanUpgrade(bad);
    const offGood = subscribePlanUpgrade(good);

    expect(() => emitPlanUpgrade({ message: 'test' })).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);

    offBad();
    offGood();
  });

  it('still re-dispatches the legacy window event for backward-compat', () => {
    const legacyListener = vi.fn();
    window.addEventListener(PLAN_UPGRADE_LEGACY_EVENT, legacyListener);

    emitPlanUpgrade({ message: 'legacy bridge', code: 1066 });

    expect(legacyListener).toHaveBeenCalledTimes(1);
    const event = legacyListener.mock.calls[0][0];
    expect(event.detail).toMatchObject({ message: 'legacy bridge', code: 1066 });

    window.removeEventListener(PLAN_UPGRADE_LEGACY_EVENT, legacyListener);
  });
});
