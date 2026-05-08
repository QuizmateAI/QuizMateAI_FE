import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_USER_STORAGE_KEY,
  clearCurrentUser,
  getCurrentUser,
  setCurrentUser,
  subscribeCurrentUser,
} from '@/lib/currentUser';

describe('currentUser store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Force a re-read so the snapshot cache picks up the cleared storage.
    getCurrentUser();
  });

  it('returns null when no user is stored', () => {
    expect(getCurrentUser()).toBeNull();
  });

  it('round-trips a user object', () => {
    setCurrentUser({ userID: 1, role: 'USER' });
    expect(getCurrentUser()).toEqual({ userID: 1, role: 'USER' });
  });

  it('caches the snapshot reference until storage changes', () => {
    setCurrentUser({ userID: 1, role: 'USER' });
    const first = getCurrentUser();
    const second = getCurrentUser();
    expect(first).toBe(second);

    setCurrentUser({ userID: 2, role: 'ADMIN' });
    const third = getCurrentUser();
    expect(third).not.toBe(first);
    expect(third).toEqual({ userID: 2, role: 'ADMIN' });
  });

  it('invalidates the cache when storage is mutated externally', () => {
    setCurrentUser({ userID: 1, role: 'USER' });
    getCurrentUser();

    window.localStorage.setItem(
      CURRENT_USER_STORAGE_KEY,
      JSON.stringify({ userID: 9, role: 'ADMIN' }),
    );
    // Cache compares against the raw localStorage string and re-parses
    // when it differs, so consumers see the new payload immediately.
    expect(getCurrentUser()).toEqual({ userID: 9, role: 'ADMIN' });
  });

  it('clearCurrentUser removes the entry and notifies subscribers', () => {
    setCurrentUser({ userID: 1, role: 'USER' });
    const listener = vi.fn();
    const unsubscribe = subscribeCurrentUser(listener);

    clearCurrentUser();
    expect(getCurrentUser()).toBeNull();
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('returns null when localStorage holds malformed JSON', () => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, '{not-json');
    expect(getCurrentUser()).toBeNull();
  });
});
