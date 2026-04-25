import { useState } from 'react';
import i18n from '@/i18n';
import { checkEmail, sendOTP, verifyOTP, resetPassword } from '@/api/Authentication';
import { waitForOtpStatus } from '@/lib/authOtpSocket';
import { getEmailViolationKey, isEmailValid } from '@/Utils/emailValidation';

// Xác thực định dạng email
export const validateEmail = (email) => {
  return isEmailValid(email);
};

export const useForgotPassword = (setView, t) => {
  const [forgotPasswordStep, setForgotPasswordStep] = useState('email'); // 'email' | 'otp' | 'newPassword'
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const requestOtpWithSocket = async (email, successKey, fallbackSuccessMessage) => {
    const otpStatus = await waitForOtpStatus(email, () => sendOTP(email));

    if (!otpStatus?.success) {
      throw new Error(otpStatus?.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
    }

    setSuccessMessage(t(successKey) || fallbackSuccessMessage);
  };

  const isEmailRegistered = async (email) => {
    try {
      const response = await checkEmail(email);

      if (response?.data === false) {
        return true;
      }

      return response?.data !== true;
    } catch (err) {
      if (err?.statusCode === 400) {
        return true;
      }

      throw err;
    }
  };

  const handleForgotPasswordChange = (field) => (e) => {
    setForgotPasswordData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleForgotPasswordEmailBlur = () => {
    if (forgotPasswordStep !== 'email') {
      return;
    }

    const trimmedEmail = forgotPasswordData.email.trim();
    setForgotPasswordData(prev => ({ ...prev, email: trimmedEmail }));

    if (!trimmedEmail) {
      return;
    }

    const validation = validateForgotPasswordForm(trimmedEmail, t);
    if (!validation.isValid) {
      setFieldErrors(prev => ({ ...prev, ...validation.errors }));
      return;
    }

    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    // Trim email trước khi gửi
    const trimmedEmail = forgotPasswordData.email.trim();
    setForgotPasswordData(prev => ({ ...prev, email: trimmedEmail }));

    const validation = validateForgotPasswordForm(trimmedEmail, t);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const emailExists = await isEmailRegistered(trimmedEmail);
      if (!emailExists) {
        setFieldErrors({ email: t('auth.accountNotFound') || 'Account does not exist' });
        return;
      }

      await requestOtpWithSocket(trimmedEmail, 'auth.otpSent', 'OTP code has been sent to your email');
      setForgotPasswordStep('otp');
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    // Trim OTP trước khi gửi
    const trimmedOtp = forgotPasswordData.otp.trim();
    setForgotPasswordData(prev => ({ ...prev, otp: trimmedOtp }));

    if (!trimmedOtp) {
      setFieldErrors({ otp: t('validation.otpRequired') || t('auth.otpRequired') || 'Please enter the OTP code' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await verifyOTP(forgotPasswordData.email.trim(), trimmedOtp);
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.otpVerified') || 'OTP verified successfully');
        setForgotPasswordStep('newPassword');
      }
    } catch (err) {
      setError(err.message || t('auth.verifyOTPFailed') || 'OTP verification failed, code is invalid or expired');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccessMessage('');
    setFieldErrors({});
    setIsLoading(true);

    try {
      await requestOtpWithSocket(
        forgotPasswordData.email.trim(),
        'auth.otpSent',
        'OTP code has been resent to your email'
      );
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    const trimmedNewPassword = forgotPasswordData.newPassword;
    const trimmedConfirmNewPassword = forgotPasswordData.confirmNewPassword;
    
    if (trimmedNewPassword !== trimmedConfirmNewPassword) {
      setFieldErrors({ confirmNewPassword: t('auth.passwordMismatch') || 'Password confirmation does not match' });
      return;
    }
    
    // Validate mật khẩu mới theo quy tắc BE
    if (trimmedNewPassword.length < 8) {
      setFieldErrors({ newPassword: t('validation.passwordLength') || 'Password must be more than 8 characters' });
      return;
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(trimmedNewPassword)) {
      setFieldErrors({ newPassword: t('validation.passwordFormat') || 'Password must contain both letters and numbers' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await resetPassword(
        forgotPasswordData.email.trim(),
        trimmedNewPassword
      );
      
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.resetPasswordSuccess') || 'Password reset successful, please login');
        setTimeout(() => {
          setView('login');
          setForgotPasswordStep('email');
          setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmNewPassword: '' });
          setSuccessMessage('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || t('auth.resetPasswordFailed') || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setForgotPasswordStep('email');
    setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmNewPassword: '' });
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
  }

  return {
    forgotPasswordStep,
    setForgotPasswordStep,
    forgotPasswordData,
    setForgotPasswordData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    error,
    fieldErrors,
    setError,
    successMessage,
    setSuccessMessage,
    handleForgotPasswordChange,
    handleForgotPasswordEmailBlur,
    handleSendOTP,
    handleVerifyOTP,
    handleResendOTP,
    handleResetPassword,
    resetState
  };
};

// Kiểm tra email rỗng
export const isEmailEmpty = (email) => {
  return !email || email.trim() === '';
};

// Xác thực email với nhiều quy tắc
export const validateForgotPasswordForm = (email, t) => {
  const errors = {};

  const emailViolationKey = getEmailViolationKey(email);
  if (emailViolationKey) {
    const fallbackMessages = {
      emailRequired: 'Email is required',
      emailLength: 'Email must not exceed 100 characters',
      emailNoSpaces: 'Email must not contain whitespace',
      emailAtSymbol: 'Email must contain exactly one @ symbol',
      emailLocalPartLength: 'The part before @ must not exceed 64 characters',
      emailConsecutiveDots: 'Email must not contain consecutive dots',
      emailDotPosition: 'Email must not start or end with a dot',
      emailDomainFormat: 'Email domain format is invalid',
      emailInvalid: 'Please enter a valid email (e.g. user@domain.com)',
    };
    errors.email = t?.(`validation.${emailViolationKey}`) || fallbackMessages[emailViolationKey] || fallbackMessages.emailInvalid;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Gửi yêu cầu đặt lại mật khẩu (giả lập API)
export const submitForgotPasswordRequest = async (email) => {
  try {
    // Gọi API đặt lại mật khẩu
    // const response = await api.post('/auth/forgot-password', { email });
    // return response.data;
    
    // Giả lập phản hồi từ server
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: i18n.t('auth.otpSent')
        });
      }, 1000);
    });
  } catch (error) {
    throw {
      success: false,
      message: error.response?.data?.message || i18n.t('error.unknown')
    };
  }
};
