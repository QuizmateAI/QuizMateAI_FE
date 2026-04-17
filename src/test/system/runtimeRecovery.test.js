import { describe, expect, it, vi } from 'vitest';
import {
  RUNTIME_RECOVERY_TTL_MS,
  isRecoverableRuntimeError,
  readRuntimeRecoveryAttempt,
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

  it('reloads only once within the recovery ttl for the same url', () => {
    const storage = createMemoryStorage();
    const reload = vi.fn();

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        storage,
        reload,
        reloadDelayMs: 0,
        currentUrl: '/home',
        now: 1_000,
      }),
    ).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(readRuntimeRecoveryAttempt(storage)).toEqual({ url: '/home', ts: 1_000 });

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        storage,
        reload,
        reloadDelayMs: 0,
        currentUrl: '/home',
        now: 1_000 + RUNTIME_RECOVERY_TTL_MS - 1,
      }),
    ).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);

    expect(
      tryScheduleRuntimeRecovery(new Error('ChunkLoadError: Loading chunk 42 failed.'), {
        storage,
        reload,
        reloadDelayMs: 0,
        currentUrl: '/home',
        now: 1_000 + RUNTIME_RECOVERY_TTL_MS + 1,
      }),
    ).toBe(true);

    expect(reload).toHaveBeenCalledTimes(2);
  });
});
