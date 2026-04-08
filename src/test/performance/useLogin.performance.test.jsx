import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogin } from '@/Pages/Authentication/Login';
import { login } from '@/api/Authentication';
import { preloadGroupWorkspacePage, preloadHomePage, preloadWorkspacePage } from '@/lib/routeLoaders';

vi.mock('@/api/Authentication', () => ({
  login: vi.fn(),
  googleLogin: vi.fn(),
}));

vi.mock('@/lib/routeLoaders', () => ({
  preloadGroupWorkspacePage: vi.fn(),
  preloadHomePage: vi.fn(),
  preloadWorkspacePage: vi.fn(),
}));

describe('useLogin performance helpers', () => {
  const t = (key) => key;
  let navigate;

  beforeEach(() => {
    navigate = vi.fn();
    vi.clearAllMocks();
  });

  it('preloads home before navigating USER login to /home', async () => {
    login.mockResolvedValue({
      statusCode: 200,
      data: { role: 'USER' },
    });

    const { result } = renderHook(() => useLogin(navigate, { state: {} }, t));

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: 'user_1' } });
      result.current.handleLoginChange('password')({ target: { value: 'Password123' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(preloadHomePage).toHaveBeenCalledTimes(1);
    expect(preloadWorkspacePage).not.toHaveBeenCalled();
    expect(preloadGroupWorkspacePage).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('preloads the destination workspace route when login resumes a deep link', async () => {
    login.mockResolvedValue({
      statusCode: 200,
      data: { role: 'USER' },
    });

    const location = {
      state: {
        from: {
          pathname: '/workspaces/42',
          search: '?view=quiz',
          hash: '',
        },
      },
    };

    const { result } = renderHook(() => useLogin(navigate, location, t));

    act(() => {
      result.current.handleLoginChange('username')({ target: { value: 'user_1' } });
      result.current.handleLoginChange('password')({ target: { value: 'Password123' } });
    });

    await act(async () => {
      await result.current.handleLoginSubmit({ preventDefault: vi.fn() });
    });

    expect(preloadWorkspacePage).toHaveBeenCalledTimes(1);
    expect(preloadHomePage).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/workspaces/42?view=quiz', { replace: true });
  });
});
