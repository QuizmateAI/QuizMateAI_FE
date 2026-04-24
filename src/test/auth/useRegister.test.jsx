import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRegister } from '@/Pages/Authentication/Register';
import { checkEmail, checkUsername, sendOTP, verifyOTP, register } from '@/api/Authentication';
import { waitForOtpStatus } from '@/lib/authOtpSocket';
import { resetAuthAvailabilityBloom } from '@/lib/authAvailabilityBloom';

vi.mock('@/api/Authentication', () => ({
  checkEmail: vi.fn(),
  checkUsername: vi.fn(),
  sendOTP: vi.fn(),
  verifyOTP: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/lib/authOtpSocket', () => ({
  waitForOtpStatus: vi.fn(),
}));

describe('Authentication - useRegister (TC_AUTH_03, TC_AUTH_04)', () => {
  const t = (key) => key;
  let setView;

  const fillValidForm = (result) => {
    act(() => {
      result.current.handleChange('fullname')({ target: { value: 'Nguyen Van A' } });
      result.current.handleChange('username')({ target: { value: 'user123' } });
      result.current.handleChange('email')({ target: { value: 'user@example.com' } });
      result.current.handleChange('password')({ target: { value: 'Password123' } });
      result.current.handleChange('confirmPassword')({ target: { value: 'Password123' } });
      result.current.setFormData((prev) => ({ ...prev, agreeToTerms: true }));
    });
  };

  beforeEach(() => {
    setView = vi.fn();
    vi.clearAllMocks();
    resetAuthAvailabilityBloom();
    checkUsername.mockResolvedValue({ statusCode: 200, data: true });
    checkEmail.mockResolvedValue({ statusCode: 200, data: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC_AUTH_04: blocks submit and returns field errors for invalid registration form', async () => {
    const { result } = renderHook(() => useRegister(setView, t));

    act(() => {
      result.current.handleChange('fullname')({ target: { value: '' } });
      result.current.handleChange('username')({ target: { value: 'ab' } });
      result.current.handleChange('email')({ target: { value: 'bad-email' } });
      result.current.handleChange('password')({ target: { value: '123' } });
      result.current.handleChange('confirmPassword')({ target: { value: '1234' } });
    });

    await act(async () => {
      await result.current.handleRegisterSubmit({ preventDefault: vi.fn() });
    });

    expect(sendOTP).not.toHaveBeenCalled();
    expect(checkUsername).not.toHaveBeenCalled();
    expect(checkEmail).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.fullname).toBe('validation.fullnameRequired');
    expect(result.current.fieldErrors.username).toBe('validation.usernameLength');
    expect(result.current.fieldErrors.email).toBe('validation.emailAtSymbol');
    expect(result.current.fieldErrors.password).toBe('validation.passwordLength');
    expect(result.current.fieldErrors.confirmPassword).toBe('validation.passwordMismatch');
  });

  it('TC_AUTH_03: sends OTP and moves to OTP step for valid registration form', async () => {
    sendOTP.mockResolvedValue({ statusCode: 202 });
    waitForOtpStatus.mockImplementation(async (_email, sendOtpRequest) => {
      await sendOtpRequest();
      return { success: true, message: 'OTP đã được gửi thành công' };
    });

    const { result } = renderHook(() => useRegister(setView, t));
    fillValidForm(result);

    await act(async () => {
      await result.current.handleRegisterSubmit({ preventDefault: vi.fn() });
    });

    expect(sendOTP).toHaveBeenCalledWith('user@example.com');
    expect(waitForOtpStatus).toHaveBeenCalledWith('user@example.com', expect.any(Function));
    expect(checkUsername).toHaveBeenCalledWith('user123');
    expect(checkEmail).toHaveBeenCalledWith('user@example.com');
    expect(result.current.registerStep).toBe('otp');
    expect(result.current.successMessage).toBe('auth.registerOtpSent');
  });

  it('runs availability check while typing username with debounce', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRegister(setView, t));

    act(() => {
      result.current.handleChange('username')({ target: { value: 'user123' } });
    });

    expect(checkUsername).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(260);
      await Promise.resolve();
    });

    expect(checkUsername).toHaveBeenCalledWith('user123');
  });

  it('reuses cached unavailable username instantly for repeated input in the same session', async () => {
    vi.useFakeTimers();
    checkUsername.mockResolvedValue({ statusCode: 200, data: false });

    const { result } = renderHook(() => useRegister(setView, t));

    act(() => {
      result.current.handleChange('username')({ target: { value: 'taken123' } });
    });

    await act(async () => {
      vi.advanceTimersByTime(260);
      await Promise.resolve();
    });

    expect(checkUsername).toHaveBeenCalledTimes(1);
    expect(result.current.fieldErrors.username).toBe('auth.usernameExists');

    act(() => {
      result.current.handleChange('username')({ target: { value: 'other123' } });
      result.current.handleChange('username')({ target: { value: 'taken123' } });
    });

    expect(result.current.availabilityStatus.username.available).toBe(false);
    expect(result.current.availabilityStatus.username.message).toBe('auth.usernameExists');
    expect(checkUsername).toHaveBeenCalledTimes(1);
  });

  it('blocks OTP sending when username or email already exists', async () => {
    checkUsername.mockResolvedValue({ statusCode: 200, data: false });
    checkEmail.mockResolvedValue({ statusCode: 200, data: false });

    const { result } = renderHook(() => useRegister(setView, t));
    fillValidForm(result);

    await act(async () => {
      await result.current.handleRegisterSubmit({ preventDefault: vi.fn() });
    });

    expect(sendOTP).not.toHaveBeenCalled();
    expect(result.current.fieldErrors.username).toBe('auth.usernameExists');
    expect(result.current.fieldErrors.email).toBe('auth.emailExists');
    expect(result.current.registerStep).toBe('form');
  });

  it('completes OTP verification and registration then returns to login', async () => {
    vi.useFakeTimers();
    verifyOTP.mockResolvedValue({ statusCode: 200 });
    register.mockResolvedValue({ statusCode: 200 });

    const { result } = renderHook(() => useRegister(setView, t));
    fillValidForm(result);

    act(() => {
      result.current.setRegisterStep('otp');
      result.current.setOtp('123456');
    });

    await act(async () => {
      await result.current.handleVerifyOTPAndRegister({ preventDefault: vi.fn() });
    });

    expect(verifyOTP).toHaveBeenCalledWith('user@example.com', '123456');
    expect(register).toHaveBeenCalledWith(expect.objectContaining({
      fullname: 'Nguyen Van A',
      username: 'user123',
      email: 'user@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    }));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(setView).toHaveBeenCalledWith('login');
  });
});
