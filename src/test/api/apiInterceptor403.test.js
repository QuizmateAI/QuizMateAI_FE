import { beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

// Stubs for cross-cutting modules so api.js boots cleanly under test
vi.mock('@/utils/userCache', () => ({
  clearUserCache: vi.fn(),
}));
vi.mock('@/utils/planPurchaseState', () => ({
  clearPlanPurchaseState: vi.fn(),
}));
vi.mock('@/i18n', () => ({
  default: { t: (_key, fallback) => fallback || _key },
}));

let api;
let mock;
let baseURL;

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  // Force a fresh import so the axios instance is recreated
  const apiModule = await import('@/api/api');
  api = apiModule.default;
  baseURL = apiModule.baseURL;
  mock = new MockAdapter(api, { onNoMatch: 'throwException' });
});

describe('api interceptor — 403 expired-token handling', () => {
  it('refreshes token on 403 then retries the original request successfully', async () => {
    window.localStorage.setItem('accessToken', 'old');
    window.localStorage.setItem('refreshToken', 'r1');

    let callCount = 0;
    mock.onGet('/user/profile').reply((config) => {
      callCount += 1;
      if (callCount === 1) {
        // First call uses old token → BE returns 403 (Spring quirk for expired JWT)
        expect(config.headers.Authorization).toBe('Bearer old');
        return [403, { message: 'Forbidden' }];
      }
      // Retry uses new token → succeeds
      expect(config.headers.Authorization).toBe('Bearer new-access');
      return [200, { statusCode: 200, data: { name: 'tester' } }];
    });

    // Refresh endpoint succeeds; api.js posts via raw axios using full baseURL
    const axios = (await import('axios')).default;
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          statusCode: 200,
          data: { accessToken: 'new-access', refreshToken: 'r2' },
        },
      });

    const result = await api.get('/user/profile');

    expect(result).toEqual({ statusCode: 200, data: { name: 'tester' } });
    expect(callCount).toBe(2);
    expect(window.localStorage.getItem('accessToken')).toBe('new-access');
    expect(window.localStorage.getItem('refreshToken')).toBe('r2');
    expect(refreshSpy).toHaveBeenCalledTimes(1);

    refreshSpy.mockRestore();
  });

  it('surfaces 403 (without redirect) when retry after refresh still returns 403', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/admin/secret').reply(403, { message: 'Real permission denial' });

    const axios = (await import('axios')).default;
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValueOnce({
        data: {
          statusCode: 200,
          data: { accessToken: 'new', refreshToken: 'r2' },
        },
      });

    await expect(api.get('/admin/secret')).rejects.toMatchObject({
      statusCode: 403,
    });

    // Token was rotated (refresh did succeed) but user remains logged in
    expect(window.localStorage.getItem('accessToken')).toBe('new');
    refreshSpy.mockRestore();
  });

  it('does not attempt refresh on 403 when no refresh token is present', async () => {
    window.localStorage.setItem('accessToken', 'a');

    mock.onGet('/user/profile').reply(403, { message: 'Forbidden' });

    const axios = (await import('axios')).default;
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(refreshSpy).not.toHaveBeenCalled();
    refreshSpy.mockRestore();
  });

  it('does NOT refresh on 403 when BE explicitly returned code=FORBIDDEN', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/admin/secret').reply(403, {
      statusCode: 403,
      message: 'Bạn không có quyền',
      data: { code: 'FORBIDDEN' },
    });

    const axios = (await import('axios')).default;
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(api.get('/admin/secret')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });

    expect(refreshSpy).not.toHaveBeenCalled();
    // Tokens preserved — user stays logged in
    expect(window.localStorage.getItem('accessToken')).toBe('a');

    refreshSpy.mockRestore();
  });

  it('refreshes on 401 when BE explicitly returned code=TOKEN_EXPIRED', async () => {
    window.localStorage.setItem('accessToken', 'expired');
    window.localStorage.setItem('refreshToken', 'r1');

    let callCount = 0;
    mock.onGet('/user/profile').reply((config) => {
      callCount += 1;
      if (callCount === 1) {
        expect(config.headers.Authorization).toBe('Bearer expired');
        return [
          401,
          {
            statusCode: 401,
            message: 'Phiên hết hạn',
            data: { code: 'TOKEN_EXPIRED' },
          },
        ];
      }
      expect(config.headers.Authorization).toBe('Bearer fresh');
      return [200, { statusCode: 200, data: { name: 'ok' } }];
    });

    const axios = (await import('axios')).default;
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        statusCode: 200,
        data: { accessToken: 'fresh', refreshToken: 'r2' },
      },
    });

    const result = await api.get('/user/profile');

    expect(result).toEqual({ statusCode: 200, data: { name: 'ok' } });
    expect(callCount).toBe(2);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('accessToken')).toBe('fresh');

    refreshSpy.mockRestore();
  });

  it('still redirects on 401 when refresh fails (existing behavior preserved)', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/user/profile').reply(401, { message: 'Unauthorized' });

    const axios = (await import('axios')).default;
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockRejectedValueOnce({ response: { status: 401, data: { message: 'invalid refresh' } } });

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 401,
    });

    // Tokens cleared on 401-refresh-fail
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();

    refreshSpy.mockRestore();
  });
});
