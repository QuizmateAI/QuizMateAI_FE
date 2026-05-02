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
let tokenStorage;

beforeEach(async () => {
  vi.resetModules();
  // tokenStorage is in-memory now; resetModules resets its internal _accessToken.
  // We still wipe localStorage in case legacy 'user' / 'jwt_token' keys leak in.
  window.localStorage.clear();

  // Force a fresh import so the axios instance is recreated. Importing api.js
  // also wires configureRefresh on the fresh tokenStorage module.
  const apiModule = await import('@/api/api');
  api = apiModule.default;
  tokenStorage = await import('@/utils/tokenStorage');

  mock = new MockAdapter(api, { onNoMatch: 'throwException' });
});

describe('api interceptor — auth refresh handling', () => {
  it('does not refresh or clear tokens on a plain 403 permission response', async () => {
    tokenStorage.setAccessToken('old');

    mock.onGet('/user/profile').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer old');
      return [403, { message: 'Forbidden' }];
    });

    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });

    expect(tokenStorage.getAccessToken()).toBe('old');
  });

  it('keeps BE business code for explicit FORBIDDEN payloads', async () => {
    tokenStorage.setAccessToken('a');

    mock.onGet('/admin/secret').reply(403, {
      statusCode: 403,
      message: 'Bạn không có quyền',
      data: { code: 'FORBIDDEN' },
    });

    await expect(api.get('/admin/secret')).rejects.toMatchObject({
      statusCode: 403,
      // extractErrorCode reads data?.code ?? data?.data?.code so the nested
      // FORBIDDEN bubbles up as the top-level code on the rejection object.
      code: 'FORBIDDEN',
      data: expect.objectContaining({
        data: expect.objectContaining({ code: 'FORBIDDEN' }),
      }),
    });

    expect(tokenStorage.getAccessToken()).toBe('a');
  });

  it('clears the in-memory access token on 401', async () => {
    tokenStorage.setAccessToken('a');

    mock.onGet('/user/profile').reply(401, {
      statusCode: 401,
      message: 'Unauthorized',
    });

    // jsdom redirect on clearAuthAndRedirect — silenced by jsdom but harmless.
    await expect(api.get('/user/profile')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });

    expect(tokenStorage.getAccessToken()).toBe('');
  });

  it('does not attach Authorization header when no access token is set', async () => {
    // No setAccessToken call — token is empty.

    mock.onGet('/public').reply((config) => {
      expect(config.headers.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });

    await expect(api.get('/public')).resolves.toMatchObject({ ok: true });
  });

  it('maps timeout errors to REQUEST_TIMEOUT', async () => {
    mock.onGet('/slow-endpoint').timeout();

    await expect(api.get('/slow-endpoint')).rejects.toMatchObject({
      statusCode: 408,
      code: 'REQUEST_TIMEOUT',
    });
  });

  // NOTE: the previous TOKEN_EXPIRED → refresh → retry test relied on the
  // refresh token being readable from localStorage. Under cookie-based auth
  // the refresh call uses an httpOnly cookie that JS cannot read, and the
  // refresh request travels through bare axios (not the mocked api instance).
  // Validate that path with an end-to-end smoke test against a running BE
  // rather than from this unit suite.
});
