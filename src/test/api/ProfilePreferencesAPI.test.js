import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserCache } from '@/utils/userCache';
import {
  getStoredToken,
  updateUserPreferredLanguage,
  updateUserThemeMode,
} from '@/api/ProfilePreferencesAPI';
import { __resetForTests, setAccessToken } from '@/utils/tokenStorage';

// PR7: ProfilePreferencesAPI moved from raw fetch to the shared axios `api` instance so the
// request interceptor handles auth, refresh-on-401, retry, rate-limit eventing, etc. uniformly
// with the rest of the FE. These tests mock the axios `put` method directly rather than fetch.

vi.mock('@/utils/userCache', () => ({
  clearUserCache: vi.fn(),
}));

const apiPutMock = vi.fn();
vi.mock('@/api/api', () => ({
  __esModule: true,
  default: {
    put: (...args) => apiPutMock(...args),
  },
}));

describe('ProfilePreferencesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetForTests();
    apiPutMock.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the stored auth token from the in-memory token store', () => {
    expect(getStoredToken()).toBe('');

    setAccessToken('access-token');

    expect(getStoredToken()).toBe('access-token');
  });

  it('persists normalized theme mode through the shared axios instance', async () => {
    setAccessToken('access-token');

    await expect(updateUserThemeMode(' Dark ')).resolves.toBe('dark');

    // No manual headers / no fetch / no AbortController: the shared instance covers all of that.
    expect(apiPutMock).toHaveBeenCalledWith('/user/profile', { themeMode: 'dark' });
    expect(clearUserCache).toHaveBeenCalledTimes(1);
  });

  it('persists normalized preferred language through the shared axios instance', async () => {
    setAccessToken('access-token');

    await expect(updateUserPreferredLanguage(' EN ')).resolves.toBe('en');

    expect(apiPutMock).toHaveBeenCalledWith('/user/profile', { preferredLanguage: 'en' });
    expect(clearUserCache).toHaveBeenCalledTimes(1);
  });

  it('returns null instead of throwing when preference sync fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setAccessToken('access-token');
    // Shared interceptor surfaces errors as a normalized envelope ({code, message, …}); the
    // exact shape is irrelevant here — the contract is "thrown / rejected value of any kind".
    apiPutMock.mockRejectedValueOnce(new Error('boom'));

    await expect(updateUserPreferredLanguage('EN')).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith(
      '[ProfileAPI] Failed to persist preferred language:',
      expect.anything(),
    );
    expect(clearUserCache).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
