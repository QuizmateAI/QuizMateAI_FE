import { describe, expect, it, vi } from 'vitest';
import {
  RUNTIME_RECOVERY_CACHE_BUST_PARAM,
  RUNTIME_RECOVERY_MAX_ATTEMPTS,
  RUNTIME_RECOVERY_TTL_MS,
  isRecoverableRuntimeError,
  readRuntimeRecoveryAttempt,
  stripCacheBustParamFromUrl,
  tryScheduleRuntimeRecovery,
} from '@/lib/runtimeRecovery';

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

describe('runtimeRecovery', () => {
  it('treats dynamic import failures as recoverable runtime errors', () => {
    expect(
      isRecoverableRuntimeError(new Error('Failed to fetch dynamically imported module')),
    ).toBe(true);
  });

  it('treats hashed asset load failures as recoverable runtime errors', () => {
    expect(
      isRecoverableRuntimeError({
        target: {
          tagName: 'SCRIPT',
          src: 'https://quizmateai.io.vn/assets/HomePage-abcd1234.js',
        },
      }),
    ).toBe(true);
  });

  it('does not classify unrelated runtime errors as recoverable chunk failures', () => {
    expect(isRecoverableRuntimeError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('escalates from soft reload to hard reload, then stops within the recovery ttl', () => {
    const storage = createMemoryStorage();
    const softReload = vi.fn();
    const hardReload = vi.fn();
    const baseOpts = {
      storage,
      softReload,
      hardReload,
      reloadDelayMs: 0,
      currentUrl: '/home',
    };

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        ...baseOpts,
        now: 1_000,
      }),
    ).toBe(true);
    expect(softReload).toHaveBeenCalledTimes(1);
    expect(hardReload).not.toHaveBeenCalled();
    expect(readRuntimeRecoveryAttempt(storage)).toEqual({
      url: '/home',
      ts: 1_000,
      count: 1,
    });

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        ...baseOpts,
        now: 1_000 + RUNTIME_RECOVERY_TTL_MS - 1,
      }),
    ).toBe(true);
    expect(softReload).toHaveBeenCalledTimes(1);
    expect(hardReload).toHaveBeenCalledTimes(1);
    expect(readRuntimeRecoveryAttempt(storage)).toEqual({
      url: '/home',
      ts: 1_000 + RUNTIME_RECOVERY_TTL_MS - 1,
      count: 2,
    });

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        ...baseOpts,
        now: 1_000 + RUNTIME_RECOVERY_TTL_MS - 1,
      }),
    ).toBe(false);
    expect(softReload).toHaveBeenCalledTimes(1);
    expect(hardReload).toHaveBeenCalledTimes(1);

    const lastStoredTs = 1_000 + RUNTIME_RECOVERY_TTL_MS - 1;
    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        ...baseOpts,
        now: lastStoredTs + RUNTIME_RECOVERY_TTL_MS + 1,
      }),
    ).toBe(true);
    expect(softReload).toHaveBeenCalledTimes(2);
    expect(hardReload).toHaveBeenCalledTimes(1);
    expect(readRuntimeRecoveryAttempt(storage)).toMatchObject({
      url: '/home',
      count: 1,
    });
  });

  it('exposes a max-attempts constant matching the staged reload budget', () => {
    expect(RUNTIME_RECOVERY_MAX_ATTEMPTS).toBe(2);
  });

  it('treats legacy stored attempts without a count as a single prior attempt', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'quizmate.runtimeRecovery',
      JSON.stringify({ url: '/home', ts: 5_000 }),
    );

    const softReload = vi.fn();
    const hardReload = vi.fn();

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        storage,
        softReload,
        hardReload,
        reloadDelayMs: 0,
        currentUrl: '/home',
        now: 5_000 + 1_000,
      }),
    ).toBe(true);
    expect(softReload).not.toHaveBeenCalled();
    expect(hardReload).toHaveBeenCalledTimes(1);
  });

  it('strips the cache-bust query parameter from the current URL', () => {
    const originalLocation = window.location;
    const originalHistory = window.history;
    const replaceState = vi.fn();

    Object.defineProperty(window, 'location', {
      value: {
        href: `https://quizmateai.io.vn/home?tab=workspace&${RUNTIME_RECOVERY_CACHE_BUST_PARAM}=12345`,
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'history', {
      value: { state: { foo: 'bar' }, replaceState },
      writable: true,
      configurable: true,
    });

    try {
      stripCacheBustParamFromUrl();

      expect(replaceState).toHaveBeenCalledTimes(1);
      const [state, , url] = replaceState.mock.calls[0];
      expect(state).toEqual({ foo: 'bar' });
      expect(url).toBe('/home?tab=workspace');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'history', {
        value: originalHistory,
        writable: true,
        configurable: true,
      });
    }
  });

  it('leaves the URL untouched when no cache-bust parameter is present', () => {
    const originalLocation = window.location;
    const originalHistory = window.history;
    const replaceState = vi.fn();

    Object.defineProperty(window, 'location', {
      value: { href: 'https://quizmateai.io.vn/home?tab=workspace' },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'history', {
      value: { state: null, replaceState },
      writable: true,
      configurable: true,
    });

    try {
      stripCacheBustParamFromUrl();
      expect(replaceState).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'history', {
        value: originalHistory,
        writable: true,
        configurable: true,
      });
    }
  });
});
