import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import { clearPlanPurchaseState } from '@/utils/planPurchaseState';
import { setCachedSubscription } from '@/utils/userCache';
import {
  googleLogin,
  login,
  register,
  resetPassword,
  sendOTP,
  verifyOTP,
  ROLE_NOT_ALLOWED_CODE,
} from '@/api/Authentication';
import { setTokens } from '@/utils/tokenStorage';
import { setCurrentUser } from '@/lib/currentUser';

vi.mock('@/utils/tokenStorage', async () => {
  const actual = await vi.importActual('@/utils/tokenStorage');
  return {
    ...actual,
    setTokens: vi.fn(),
  };
});

vi.mock('@/lib/currentUser', async () => {
  const actual = await vi.importActual('@/lib/currentUser');
  return {
    ...actual,
    setCurrentUser: vi.fn(),
  };
});

vi.mock('@/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/utils/userCache', () => ({
  clearUserCache: vi.fn(),
  setCachedProfile: vi.fn(),
  setCachedSubscription: vi.fn(),
}));

vi.mock('@/utils/planPurchaseState', () => ({
  clearPlanPurchaseState: vi.fn(),
}));

vi.mock('@/utils/userProfile', () => ({
  normalizeUserProfile: vi.fn((profile) => profile),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    clear: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  },
}));

const AUTH_REQUEST_TIMEOUT_MS = 30000;

const successfulLoginResponse = {
  statusCode: 200,
  data: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    userID: 7,
    username: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    email: 'super-admin@quizmate.ai',
    authProvider: 'LOCAL',
  },
};

describe('Authentication API request timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('uses the extended timeout for username/password login', async () => {
    api.post.mockResolvedValue(successfulLoginResponse);

    await login({ username: 'SUPER_ADMIN', password: 'Password123' });

    expect(api.post).toHaveBeenCalledWith(
      '/auth/login',
      { username: 'SUPER_ADMIN', password: 'Password123' },
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );
  });

  it('clears stale plan state when login response has no active subscription', async () => {
    api.post.mockResolvedValue(successfulLoginResponse);

    await login({ username: 'new-user', password: 'Password123' });

    expect(clearPlanPurchaseState).toHaveBeenCalledTimes(1);
    expect(setCachedSubscription).toHaveBeenCalledWith(null);
  });

  it('uses the extended timeout for Google login', async () => {
    api.post.mockResolvedValue(successfulLoginResponse);

    await googleLogin('google-id-token');

    expect(api.post).toHaveBeenCalledWith(
      '/auth/google-login',
      { idToken: 'google-id-token' },
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );
  });

  it('uses the extended timeout for register and password recovery mutations', async () => {
    api.post
      .mockResolvedValueOnce({ statusCode: 200, data: { ok: true } })
      .mockResolvedValueOnce({ statusCode: 200, data: { ok: true } })
      .mockResolvedValueOnce({ statusCode: 200, data: true })
      .mockResolvedValueOnce({ statusCode: 200, data: { ok: true } });

    await register({
      fullname: 'Super Admin',
      username: 'SUPER_ADMIN',
      password: 'Password123',
      confirmPassword: 'Password123',
      email: 'super-admin@quizmate.ai',
    });
    await sendOTP('super-admin@quizmate.ai');
    await verifyOTP('super-admin@quizmate.ai', '123456');
    await resetPassword('super-admin@quizmate.ai', '123456', 'NewPassword123');

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/auth/register',
      expect.objectContaining({
        username: 'SUPER_ADMIN',
      }),
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/auth/send-otp',
      { email: 'super-admin@quizmate.ai' },
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    expect(api.post).toHaveBeenNthCalledWith(
      3,
      '/auth/verify-otp',
      { email: 'super-admin@quizmate.ai', otp: '123456' },
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    expect(api.post).toHaveBeenNthCalledWith(
      4,
      '/auth/reset-password',
      { email: 'super-admin@quizmate.ai', otp: '123456', newPassword: 'NewPassword123' },
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );
  });
});

describe('Authentication role gate (login / googleLogin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('rejects login with ROLE_NOT_ALLOWED when BE role is not in allowedRoles and does not persist tokens', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/auth/login') {
        return Promise.resolve(successfulLoginResponse); // role = SUPER_ADMIN
      }
      if (url === '/auth/logout') {
        return Promise.resolve({ statusCode: 200, message: 'OK', data: null });
      }
      return Promise.resolve({ statusCode: 200, data: null });
    });

    await expect(
      login({ username: 'SUPER_ADMIN', password: 'Password123' }, { allowedRoles: ['USER'] }),
    ).rejects.toMatchObject({ code: ROLE_NOT_ALLOWED_CODE, role: 'SUPER_ADMIN' });

    expect(setTokens).not.toHaveBeenCalled();
    expect(setCurrentUser).not.toHaveBeenCalled();
    // BE logout MUST be called with the freshly received access token so the
    // refresh cookie that BE has already set gets revoked server-side.
    expect(api.post).toHaveBeenCalledWith(
      '/auth/logout',
      null,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('rejects googleLogin with ROLE_NOT_ALLOWED when role is not allowed', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/auth/google-login') {
        return Promise.resolve(successfulLoginResponse);
      }
      if (url === '/auth/logout') {
        return Promise.resolve({ statusCode: 200, data: null });
      }
      return Promise.resolve({ statusCode: 200, data: null });
    });

    await expect(
      googleLogin('google-id-token', { allowedRoles: ['USER'] }),
    ).rejects.toMatchObject({ code: ROLE_NOT_ALLOWED_CODE, role: 'SUPER_ADMIN' });

    expect(setTokens).not.toHaveBeenCalled();
    expect(setCurrentUser).not.toHaveBeenCalled();
  });

  it('persists tokens when role is in allowedRoles', async () => {
    api.post.mockResolvedValue(successfulLoginResponse); // role = SUPER_ADMIN

    await login(
      { username: 'SUPER_ADMIN', password: 'Password123' },
      { allowedRoles: ['ADMIN', 'SUPER_ADMIN'] },
    );

    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'access-token' });
    expect(setCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'SUPER_ADMIN', userID: 7 }),
    );
  });

  it('persists tokens when allowedRoles is omitted (backward compat)', async () => {
    api.post.mockResolvedValue(successfulLoginResponse);

    await login({ username: 'any', password: 'pw' });

    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(setCurrentUser).toHaveBeenCalledTimes(1);
  });
});
