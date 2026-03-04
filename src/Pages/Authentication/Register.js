import { useState } from 'react';
import { register, sendOTP, verifyOTP } from '@/api/Authentication';

// Regex theo BE: username phải chứa cả chữ và số, cho phép . _ @ -
const USERNAME_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9._@-]{3,50}$/;
// Regex theo BE: password phải chứa cả chữ và số
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
// Regex email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useRegister = (setView, t) => {
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  // Bước đăng ký: 'form' (nhập thông tin) -> 'otp' (xác thực OTP)
  const [registerStep, setRegisterStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value.trim());
    setError('');
  };

  // Validate toàn bộ form đăng ký theo quy tắc BE
  const validateRegisterForm = () => {
    const errors = {};
    const trimmed = {
      fullname: formData.fullname.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };

    // Fullname không được để trống
    if (!trimmed.fullname) {
      errors.fullname = t('validation.fullnameRequired');
    }

    // Username validation
    if (!trimmed.username) {
      errors.username = t('validation.usernameRequired');
    } else if (trimmed.username.length < 3 || trimmed.username.length > 50) {
      errors.username = t('validation.usernameLength');
    } else if (!USERNAME_REGEX.test(trimmed.username)) {
      errors.username = t('validation.usernameFormat');
    }

    // Email validation
    if (!trimmed.email) {
      errors.email = t('validation.emailRequired');
    } else if (!EMAIL_REGEX.test(trimmed.email)) {
      errors.email = t('validation.emailInvalid');
    }

    // Password validation
    if (!trimmed.password) {
      errors.password = t('validation.passwordRequired');
    } else if (trimmed.password.length < 8) {
      errors.password = t('validation.passwordLength');
    } else if (!PASSWORD_REGEX.test(trimmed.password)) {
      errors.password = t('validation.passwordFormat');
    }

    // Confirm Password validation
    if (!trimmed.confirmPassword) {
      errors.confirmPassword = t('validation.confirmPasswordRequired');
    } else if (trimmed.password !== trimmed.confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch');
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Bước 1: Validate form và gửi OTP đến email
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Trim dữ liệu trước khi validate
    const trimmedData = {
      ...formData,
      fullname: formData.fullname.trim(),
      username: formData.username.trim(),
      email: formData.email.trim()
    };
    setFormData(trimmedData);

    // Validation phía client theo quy tắc BE
    const { isValid, errors } = validateRegisterForm();
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }
    
    if (!trimmedData.agreeToTerms) {
      setError(t('auth.agreeToTermsRequired') || 'Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Gửi OTP đến email để xác thực trước khi đăng ký
      const response = await sendOTP(trimmedData.email);
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.registerOtpSent') || 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra.');
        setRegisterStep('otp');
      }
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  // Bước 2: Xác thực OTP rồi gọi API đăng ký
  const handleVerifyOTPAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      // Xác thực OTP (trim OTP)
      const trimmedOtp = otp.trim();
      const otpResponse = await verifyOTP(formData.email.trim(), trimmedOtp);
      if (otpResponse.statusCode === 200 || otpResponse.statusCode === 0) {
        // OTP hợp lệ -> gọi API đăng ký (trim tất cả dữ liệu)
        const registerResponse = await register({
          fullname: formData.fullname.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });
        
        if (registerResponse.statusCode === 200 || registerResponse.statusCode === 0) {
          setSuccessMessage(t('auth.registerSuccess') || 'Đăng ký thành công! Vui lòng đăng nhập.');
          setTimeout(() => {
            setView('login');
            setSuccessMessage('');
            resetRegisterState();
          }, 2000);
        }
      }
    } catch (err) {
      // Xử lý lỗi validation từ server (statusCode 400)
      if (err.statusCode === 400 && err.data?.data) {
        setFieldErrors(err.data.data);
        setError(err.message || t('auth.validationFailed') || 'Dữ liệu nhập không hợp lệ');
      } else {
        setError(err.message || t('auth.verifyOTPFailed') || 'Xác thực OTP thất bại, mã không đúng hoặc đã hết hạn');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResendOTP = async () => {
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      const response = await sendOTP(formData.email);
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage(t('auth.otpSent') || 'Mã OTP đã được gửi lại đến email của bạn');
      }
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset toàn bộ state đăng ký
  const resetRegisterState = () => {
    setRegisterStep('form');
    setOtp('');
    setFormData({
      fullname: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    });
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
  };

  return {
    formData,
    setFormData,
    registerStep,
    setRegisterStep,
    otp,
    setOtp,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    error,
    setError,
    fieldErrors,
    successMessage,
    setSuccessMessage,
    handleChange,
    handleOtpChange,
    handleRegisterSubmit,
    handleVerifyOTPAndRegister,
    handleResendOTP,
    resetRegisterState
  };
};
