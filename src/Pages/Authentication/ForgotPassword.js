import { useState } from 'react';
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
      throw new Error(otpStatus?.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
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
        setFieldErrors({ email: t('auth.accountNotFound') || 'Tài khoản không tồn tại' });
        return;
      }

      await requestOtpWithSocket(trimmedEmail, 'auth.otpSent', 'Mã OTP đã được gửi đến email của bạn');
      setForgotPasswordStep('otp');
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
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
      setFieldErrors({ otp: t('validation.otpRequired') || t('auth.otpRequired') || 'Vui lòng nhập mã OTP' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await verifyOTP(forgotPasswordData.email.trim(), trimmedOtp);
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.otpVerified') || 'Xác thực OTP thành công');
        setForgotPasswordStep('newPassword');
      }
    } catch (err) {
      setError(err.message || t('auth.verifyOTPFailed') || 'Xác thực OTP thất bại, mã không đúng hoặc đã hết hạn');
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
      setFieldErrors({ confirmNewPassword: t('auth.passwordMismatch') || 'Mật khẩu xác nhận không khớp' });
      return;
    }
    
    // Validate mật khẩu mới theo quy tắc BE
    if (trimmedNewPassword.length < 8) {
      setFieldErrors({ newPassword: t('validation.passwordLength') || 'Mật khẩu phải nhiều hơn 8 ký tự' });
      return;
    }
    
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(trimmedNewPassword)) {
      setFieldErrors({ newPassword: t('validation.passwordFormat') || 'Mật khẩu phải chứa cả chữ và số' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await resetPassword(
        forgotPasswordData.email.trim(),
        trimmedNewPassword
      );
      
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.resetPasswordSuccess') || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
        setTimeout(() => {
          setView('login');
          setForgotPasswordStep('email');
          setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmNewPassword: '' });
          setSuccessMessage('');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || t('auth.resetPasswordFailed') || 'Đặt lại mật khẩu thất bại');
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
      emailRequired: 'Email là bắt buộc',
      emailLength: 'Email không được vượt quá 100 ký tự',
      emailNoSpaces: 'Email không được chứa khoảng trắng',
      emailAtSymbol: 'Email phải chứa đúng một ký tự @',
      emailLocalPartLength: 'Phần trước @ không được vượt quá 64 ký tự',
      emailConsecutiveDots: 'Email không được chứa hai dấu chấm liên tiếp',
      emailDotPosition: 'Email không được bắt đầu hoặc kết thúc bằng dấu chấm',
      emailDomainFormat: 'Tên miền email không hợp lệ',
      emailInvalid: 'Vui lòng nhập email hợp lệ (ví dụ: user@domain.com)',
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
          message: 'Email xác nhận được gửi. Vui lòng kiểm tra hộp thư của bạn.'
        });
      }, 1000);
    });
  } catch (error) {
    throw {
      success: false,
      message: error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.'
    };
  }
};
