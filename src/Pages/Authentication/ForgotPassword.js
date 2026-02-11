import { useState } from 'react';
import { sendOTP, verifyOTP, resetPassword } from '@/api/Authentication';

// Xác thực định dạng email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
  const [successMessage, setSuccessMessage] = useState('');

  const handleForgotPasswordChange = (field) => (e) => {
    setForgotPasswordData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await sendOTP(forgotPasswordData.email);
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.otpSent') || 'Mã OTP đã được gửi đến email của bạn');
        setForgotPasswordStep('otp');
      }
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await verifyOTP(forgotPasswordData.email, forgotPasswordData.otp);
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
    
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmNewPassword) {
      setError(t('auth.passwordMismatch') || 'Mật khẩu xác nhận không khớp');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await resetPassword({
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword,
        confirmNewPassword: forgotPasswordData.confirmNewPassword
      });
      
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
    setError,
    successMessage,
    setSuccessMessage,
    handleForgotPasswordChange,
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
export const validateForgotPasswordForm = (email) => {
  const errors = {};

  // Kiểm tra email rỗng
  if (isEmailEmpty(email)) {
    errors.email = 'Email là bắt buộc';
  } else if (!validateEmail(email)) {
    // Kiểm tra định dạng email
    errors.email = 'Vui lòng nhập email hợp lệ (ví dụ: user@domain.com)';
  } else if (email.length > 100) {
    // Kiểm tra độ dài email
    errors.email = 'Email không được vượt quá 100 ký tự';
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
