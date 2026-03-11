import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLogin } from '@/Pages/Authentication/Login';
import { login, googleLogin } from '@/api/Authentication';

vi.mock('@/api/Authentication', () => ({
  login: vi.fn(),
  googleLogin: vi.fn(),
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

    const { result } = renderHook(() => useLogin(navigate, t));

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: '  valid_user  ' } });
      result.current.handleLoginChange('password')({ target: { value: 'Password123' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(login).toHaveBeenCalledWith({
      username: 'valid_user',
      password: 'Password123',
    });
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(result.current.error).toBe('');
  });

  it('TC_AUTH_02: shows error when credentials are invalid', async () => {
    login.mockRejectedValue({ message: 'Tai khoan hoac mat khau khong chinh xac' });

    const { result } = renderHook(() => useLogin(navigate, t));

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

    const { result } = renderHook(() => useLogin(navigate, t));

    await act(async () => {
      await result.current.handleGoogleSubmit({ credential: 'google-token' });
    });

    expect(googleLogin).toHaveBeenCalledWith('google-token');
    expect(navigate).toHaveBeenCalledWith('/admin');
  });
});
