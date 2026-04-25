import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import { clearPlanPurchaseState } from '@/Utils/planPurchaseState';
import { setCachedSubscription } from '@/Utils/userCache';
import {
  googleLogin,
  login,
  register,
  resetPassword,
  sendOTP,
  verifyOTP,
} from '@/api/Authentication';

vi.mock('@/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/Utils/userCache', () => ({
  clearUserCache: vi.fn(),
  setCachedProfile: vi.fn(),
  setCachedSubscription: vi.fn(),
}));

vi.mock('@/Utils/planPurchaseState', () => ({
  clearPlanPurchaseState: vi.fn(),
}));

vi.mock('@/Utils/userProfile', () => ({
  normalizeUserProfile: vi.fn((profile) => profile),
}));

vi.mock('@/queryClient', () => ({
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
    await resetPassword('super-admin@quizmate.ai', 'NewPassword123');

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
      '/auth/send-otp?email=super-admin%40quizmate.ai',
      undefined,
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    expect(api.post).toHaveBeenNthCalledWith(
      3,
      '/auth/verify-otp?email=super-admin%40quizmate.ai&otp=123456',
      undefined,
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );

    expect(api.post).toHaveBeenNthCalledWith(
      4,
      '/auth/reset-password?email=super-admin%40quizmate.ai&newPassword=NewPassword123',
      undefined,
      expect.objectContaining({
        timeout: AUTH_REQUEST_TIMEOUT_MS,
      }),
    );
  });
});
