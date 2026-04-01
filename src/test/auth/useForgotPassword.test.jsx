import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForgotPassword, validateForgotPasswordForm } from '@/Pages/Authentication/ForgotPassword';
import { checkEmail, sendOTP, verifyOTP, resetPassword } from '@/api/Authentication';
import { waitForOtpStatus } from '@/lib/authOtpSocket';

vi.mock('@/api/Authentication', () => ({
  checkEmail: vi.fn(),
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('@/lib/authOtpSocket', () => ({
  waitForOtpStatus: vi.fn(),
}));

describe('Authentication - useForgotPassword (TC_AUTH_05)', () => {
  const t = (key) => key;
  let setView;

  beforeEach(() => {
    setView = vi.fn();
    vi.clearAllMocks();
  });

  it('TC_AUTH_05: sends reset OTP request successfully', async () => {
    checkEmail.mockResolvedValue({ data: false });
    sendOTP.mockResolvedValue({ statusCode: 202 });
    waitForOtpStatus.mockImplementation(async (_email, sendOtpRequest) => {
      await sendOtpRequest();
      return { success: true, message: 'OTP da duoc gui thanh cong' };
    });

    const { result } = renderHook(() => useForgotPassword(setView, t));

    act(() => {
      result.current.handleForgotPasswordChange('email')({ target: { value: '  user@example.com  ' } });
    });

    await act(async () => {
      await result.current.handleSendOTP({ preventDefault: vi.fn() });
    });

    expect(checkEmail).toHaveBeenCalledWith('user@example.com');
    expect(sendOTP).toHaveBeenCalledWith('user@example.com');
    expect(waitForOtpStatus).toHaveBeenCalledWith('user@example.com', expect.any(Function));
    expect(result.current.forgotPasswordStep).toBe('otp');
    expect(result.current.successMessage).toBe('auth.otpSent');
  });

  it('shows account-not-found feedback when checkEmail reports the email is not registered', async () => {
    checkEmail.mockResolvedValue({ data: true });

    const { result } = renderHook(() => useForgotPassword(setView, t));

    act(() => {
      result.current.handleForgotPasswordChange('email')({ target: { value: 'missing@example.com' } });
    });

    await act(async () => {
      await result.current.handleSendOTP({ preventDefault: vi.fn() });
    });

    expect(checkEmail).toHaveBeenCalledWith('missing@example.com');
    expect(waitForOtpStatus).not.toHaveBeenCalled();
    expect(sendOTP).not.toHaveBeenCalled();
    expect(result.current.forgotPasswordStep).toBe('email');
    expect(result.current.fieldErrors).toEqual({
      email: 'auth.accountNotFound',
    });
  });

  it('validates forgot password email field', () => {
    expect(validateForgotPasswordForm('')).toEqual({
      isValid: false,
      errors: { email: 'Email là bắt buộc' },
    });

    expect(validateForgotPasswordForm('not-an-email')).toEqual({
      isValid: false,
      errors: { email: 'Email phải chứa đúng một ký tự @' },
    });

    expect(validateForgotPasswordForm('user..name@example.com')).toEqual({
      isValid: false,
      errors: { email: 'Email không được chứa hai dấu chấm liên tiếp' },
    });

    expect(validateForgotPasswordForm('user@-example.com')).toEqual({
      isValid: false,
      errors: { email: 'Tên miền email không hợp lệ' },
    });

    expect(validateForgotPasswordForm('user @example.com')).toEqual({
      isValid: false,
      errors: { email: 'Email không được chứa khoảng trắng' },
    });

    expect(validateForgotPasswordForm('valid@example.com').isValid).toBe(true);
  });

  it('has mocked API dependencies for OTP verification and password reset flows', () => {
    expect(typeof verifyOTP).toBe('function');
    expect(typeof resetPassword).toBe('function');
  });
});
