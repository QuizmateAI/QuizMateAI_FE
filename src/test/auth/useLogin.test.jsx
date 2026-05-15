import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLogin } from '@/pages/Authentication/Login';
import { login, googleLogin } from '@/api/Authentication';
import { preloadHomePage } from '@/lib/routeLoaders';

vi.mock('@/api/Authentication', () => ({
  login: vi.fn(),
  googleLogin: vi.fn(),
  ROLE_NOT_ALLOWED_CODE: 'ROLE_NOT_ALLOWED',
}));

vi.mock('@/lib/routeLoaders', () => ({
  preloadGroupWorkspacePage: vi.fn(),
  preloadHomePage: vi.fn(),
  preloadWorkspacePage: vi.fn(),
}));

describe('Authentication - useLogin (TC_AUTH_01, TC_AUTH_02)', () => {
  const t = (key) => key;
  let navigate;

  beforeEach(() => {
    navigate = vi.fn();
    vi.clearAllMocks();
  });

  it('TC_AUTH_01: logs in successfully and redirects to /home for USER role', async () => {
    login.mockResolvedValue({
      statusCode: 200,
      data: { role: 'USER' },
    });

    const { result } = renderHook(() => useLogin(navigate, { state: {} }, t));

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: '  valid_user  ' } });
      result.current.handleLoginChange('password')({ target: { value: 'Password123' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(login).toHaveBeenCalledWith(
      { username: 'valid_user', password: 'Password123' },
      { allowedRoles: undefined },
    );
    expect(preloadHomePage).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(result.current.error).toBe('');
  });

  it('TC_AUTH_02: shows error when credentials are invalid', async () => {
    login.mockRejectedValue({ message: 'Tai khoan hoac mat khau khong chinh xac' });

    const { result } = renderHook(() => useLogin(navigate, { state: {} }, t));

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: 'wrong_user' } });
      result.current.handleLoginChange('password')({ target: { value: 'wrong_pass' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Tai khoan hoac mat khau khong chinh xac');
  });

  it('navigates to role-based route for Google login success', async () => {
    googleLogin.mockResolvedValue({
      statusCode: 200,
      data: { role: 'ADMIN' },
    });

    const { result } = renderHook(() => useLogin(navigate, { state: {} }, t));

    await act(async () => {
      await result.current.handleGoogleSubmit({ credential: 'google-token' });
    });

    expect(googleLogin).toHaveBeenCalledWith('google-token', { allowedRoles: undefined });
    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('forwards allowedRoles=[USER] from LoginPage entry into login()', async () => {
    login.mockResolvedValue({ statusCode: 200, data: { role: 'USER' } });

    const { result } = renderHook(() =>
      useLogin(navigate, { state: {} }, t, { allowedRoles: ['USER'] }),
    );

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: 'user1' } });
      result.current.handleLoginChange('password')({ target: { value: 'pw' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(login).toHaveBeenCalledWith(
      { username: 'user1', password: 'pw' },
      { allowedRoles: ['USER'] },
    );
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('shows user-friendly message when login rejects with ROLE_NOT_ALLOWED on user entry', async () => {
    login.mockRejectedValue({
      code: 'ROLE_NOT_ALLOWED',
      role: 'ADMIN',
      message: 'Role is not allowed',
    });

    const { result } = renderHook(() =>
      useLogin(navigate, { state: {} }, t, { allowedRoles: ['USER'] }),
    );

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: 'admin1' } });
      result.current.handleLoginChange('password')({ target: { value: 'pw' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.error).toBe('auth.roleNotAllowedForUserLogin');
  });

  it('shows admin-friendly message when login rejects with ROLE_NOT_ALLOWED on admin entry', async () => {
    googleLogin.mockRejectedValue({
      code: 'ROLE_NOT_ALLOWED',
      role: 'USER',
      message: 'Role is not allowed',
    });

    const { result } = renderHook(() =>
      useLogin(navigate, { state: {} }, t, { allowedRoles: ['ADMIN', 'SUPER_ADMIN'] }),
    );

    await act(async () => {
      await result.current.handleGoogleSubmit({ credential: 'google-token' });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.error).toBe('auth.roleNotAllowedForAdminLogin');
  });
});
