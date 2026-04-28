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

describe('api interceptor — auth refresh handling', () => {
  it('does not refresh or clear tokens on a plain 403 permission response', async () => {
    window.localStorage.setItem('accessToken', 'old');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/user/profile').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer old');
      return [403, { message: 'Forbidden' }];
    });

    const axios = (await import('axios')).default;
    const refreshSpy = vi.spyOn(axios, 'post');

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('accessToken')).toBe('old');
    expect(window.localStorage.getItem('refreshToken')).toBe('r1');

    refreshSpy.mockRestore();
  });

  it('refreshes on 403 only when BE explicitly returned TOKEN_EXPIRED', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    let callCount = 0;
    mock.onGet('/admin/secret').reply((config) => {
      callCount += 1;
      if (callCount === 1) {
        expect(config.headers.Authorization).toBe('Bearer a');
        return [
          403,
          {
            statusCode: 401,
            message: 'Phiên hết hạn',
            data: { code: 'TOKEN_EXPIRED' },
          },
        ];
      }
      expect(config.headers.Authorization).toBe('Bearer new');
      return [403, { statusCode: 1048, message: 'Real permission denial' }];
    });

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

    expect(callCount).toBe(2);
    expect(window.localStorage.getItem('accessToken')).toBe('new');
    refreshSpy.mockRestore();
  });

  it('omits Authorization when a request opts out of auth headers', async () => {
    window.localStorage.setItem('accessToken', 'stale-token');

    mock.onGet('/group/invitation/preview?token=invite').reply((config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return [200, { statusCode: 200, data: { workspaceId: 77 } }];
    });

    const result = await api.get('/group/invitation/preview?token=invite', {
      skipAuthHeader: true,
      skipAuthRedirect: true,
    });

    expect(result).toEqual({ statusCode: 200, data: { workspaceId: 77 } });
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
