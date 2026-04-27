import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUserCache } from '@/utils/userCache';
import {
  getStoredToken,
  updateUserPreferredLanguage,
  updateUserThemeMode,
} from '@/api/ProfilePreferencesAPI';

vi.mock('@/utils/userCache', () => ({
  clearUserCache: vi.fn(),
}));

describe('ProfilePreferencesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the stored auth token with jwt_token fallback', () => {
    localStorage.setItem('jwt_token', 'legacy-token');

    expect(getStoredToken()).toBe('legacy-token');

    localStorage.setItem('accessToken', 'access-token');

    expect(getStoredToken()).toBe('access-token');
  });

  it('does not call the API when no auth token exists', async () => {
    await expect(updateUserThemeMode('dark')).resolves.toBeNull();

    expect(fetch).not.toHaveBeenCalled();
    expect(clearUserCache).not.toHaveBeenCalled();
  });

  it('persists normalized theme mode with the auth header', async () => {
    localStorage.setItem('accessToken', 'access-token');

    await expect(updateUserThemeMode(' Dark ')).resolves.toBe('dark');

    expect(fetch).toHaveBeenCalledWith(
      '/api/user/profile',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ themeMode: 'dark' }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(clearUserCache).toHaveBeenCalledTimes(1);
  });

  it('returns null instead of throwing when preference sync fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('accessToken', 'access-token');
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(updateUserPreferredLanguage('EN')).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith(
      '[ProfileAPI] Failed to persist preferred language:',
      expect.any(Error),
    );
    expect(clearUserCache).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
