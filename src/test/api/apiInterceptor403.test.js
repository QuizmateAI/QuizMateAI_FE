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

beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  // Force a fresh import so the axios instance is recreated
  const apiModule = await import('@/api/api');
  api = apiModule.default;
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

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });

    expect(window.localStorage.getItem('accessToken')).toBe('old');
    expect(window.localStorage.getItem('refreshToken')).toBe('r1');
  });

  it('surfaces 403 (without redirect) for permission-denied responses', async () => {
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

    await expect(api.get('/admin/secret')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Real permission denial',
    });

    expect(window.localStorage.getItem('accessToken')).toBe('a');
    expect(window.localStorage.getItem('refreshToken')).toBe('r1');
  });

  it('still rejects 403 when no refresh token is present', async () => {
    window.localStorage.setItem('accessToken', 'a');

    mock.onGet('/user/profile').reply(403, { message: 'Forbidden' });

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(window.localStorage.getItem('accessToken')).toBe('a');
  });

  it('keeps BE business code for explicit FORBIDDEN payloads', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/admin/secret').reply(403, {
      statusCode: 403,
      message: 'Bạn không có quyền',
      data: { code: 'FORBIDDEN' },
    });

    await expect(api.get('/admin/secret')).rejects.toMatchObject({
      statusCode: 403,
      code: undefined,
      data: expect.objectContaining({
        data: expect.objectContaining({ code: 'FORBIDDEN' }),
      }),
    });

    expect(window.localStorage.getItem('accessToken')).toBe('a');
  });

  it('clears tokens on 401 and returns normalized error', async () => {
    window.localStorage.setItem('accessToken', 'a');
    window.localStorage.setItem('refreshToken', 'r1');

    mock.onGet('/user/profile').reply(401, {
      statusCode: 401,
      message: 'Unauthorized',
    });

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });

    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
  });

  it('maps timeout errors to REQUEST_TIMEOUT', async () => {
    mock.onGet('/slow-endpoint').timeout();

    await expect(api.get('/slow-endpoint')).rejects.toMatchObject({
      statusCode: 408,
      code: 'REQUEST_TIMEOUT',
    });
  });
});
