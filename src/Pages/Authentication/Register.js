import { useRef, useState } from 'react';
import { checkEmail, checkUsername, register, sendOTP, verifyOTP } from '@/api/Authentication';
import { waitForOtpStatus } from '@/lib/authOtpSocket';
import { getEmailViolationKey } from '@/Utils/emailValidation';

// Regex theo BE: username phải chứa cả chữ và số, cho phép . _ @ -
const USERNAME_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9._@-]{3,50}$/;
// Regex theo BE: password phải chứa cả chữ và số
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
function getUsernameValidationMessage(username, t) {
  if (!username) {
    return t('validation.usernameRequired');
  }
  if (username.length < 3 || username.length > 50) {
    return t('validation.usernameLength');
  }
  if (!USERNAME_REGEX.test(username)) {
    return t('validation.usernameFormat');
  }

  return '';
}

function getEmailValidationMessage(email, t) {
  const violationKey = getEmailViolationKey(email);
  if (violationKey) {
    return t(`validation.${violationKey}`);
  }
  return '';
}

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
  const [availabilityStatus, setAvailabilityStatus] = useState({
    username: { checking: false, available: null, message: '', checkedValue: '' },
    email: { checking: false, available: null, message: '', checkedValue: '' }
  });
  const availabilityRequestRef = useRef({ username: 0, email: 0 });

  const setAvailabilityFieldState = (field, nextState) => {
    setAvailabilityStatus(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...nextState,
      }
    }));
  };

  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      if (!prev[field]) {
        return prev;
      }

      return { ...prev, [field]: undefined };
    });
  };

  const runAvailabilityCheck = async (field, value) => {
    const requestId = availabilityRequestRef.current[field] + 1;
    availabilityRequestRef.current[field] = requestId;

    setAvailabilityFieldState(field, {
      checking: true,
      available: null,
      checkedValue: value,
      message: t('auth.checkingAvailability') || 'Đang kiểm tra...',
    });

    try {
      const response = field === 'username'
        ? await checkUsername(value)
        : await checkEmail(value);

      if (availabilityRequestRef.current[field] !== requestId) {
        return null;
      }

      const isAvailable = response?.data === true;
      const successMessageByField = field === 'username'
        ? (t('auth.usernameAvailable') || 'Username khả dụng')
        : (t('auth.emailAvailable') || 'Email khả dụng');
      const errorMessageByField = field === 'username'
        ? (t('auth.usernameExists') || 'Username đã được sử dụng')
        : (t('auth.emailExists') || 'Email đã được sử dụng');

      setAvailabilityFieldState(field, {
        checking: false,
        available: isAvailable,
        checkedValue: value,
        message: isAvailable ? successMessageByField : errorMessageByField,
      });

      if (isAvailable) {
        clearFieldError(field);
      } else {
        setFieldErrors(prev => ({ ...prev, [field]: errorMessageByField }));
      }

      return isAvailable;
    } catch (err) {
      if (availabilityRequestRef.current[field] !== requestId) {
        return null;
      }

      const errorMessageByField = field === 'username'
        ? (t('auth.usernameExists') || 'Username đã được sử dụng')
        : (t('auth.emailExists') || 'Email đã được sử dụng');

      if (err?.statusCode === 400) {
        setAvailabilityFieldState(field, {
          checking: false,
          available: false,
          checkedValue: value,
          message: errorMessageByField,
        });
        setFieldErrors(prev => ({ ...prev, [field]: errorMessageByField }));
        return false;
      }

      setAvailabilityFieldState(field, {
        checking: false,
        available: null,
        checkedValue: value,
        message: '',
      });

      return null;
    }
  };

  const requestOtpWithSocket = async (email, successKey, fallbackSuccessMessage) => {
    const otpStatus = await waitForOtpStatus(email, () => sendOTP(email));

    if (!otpStatus?.success) {
      throw new Error(otpStatus?.message || t('auth.sendOTPFailed') || 'Gửi OTP thất bại, vui lòng thử lại');
    }

    setSuccessMessage(t(successKey) || fallbackSuccessMessage);
  };

  const handleChange = (field) => (e) => {
    const nextValue = e.target.value;

    setFormData(prev => ({
      ...prev,
      [field]: nextValue
    }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }

    if (field === 'username' || field === 'email') {
      setAvailabilityFieldState(field, {
        checking: false,
        available: null,
        checkedValue: '',
        message: '',
      });
    }
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value.trim());
    setError('');
    if (fieldErrors.otp) {
      setFieldErrors(prev => ({ ...prev, otp: undefined }));
    }
  };

  const handleAvailabilityBlur = (field) => async () => {
    if (registerStep !== 'form') {
      return;
    }

    const trimmedValue = formData[field]?.trim() || '';
    setFormData(prev => ({ ...prev, [field]: trimmedValue }));

    if (!trimmedValue) {
      setAvailabilityFieldState(field, {
        checking: false,
        available: null,
        message: '',
      });
      return;
    }

    const formatError = field === 'username'
      ? getUsernameValidationMessage(trimmedValue, t)
      : getEmailValidationMessage(trimmedValue, t);

    if (formatError) {
      setAvailabilityFieldState(field, {
        checking: false,
        available: false,
        checkedValue: trimmedValue,
        message: formatError,
      });
      return;
    }

    if (
      availabilityStatus[field]?.checkedValue === trimmedValue
      && availabilityStatus[field]?.available !== null
      && !availabilityStatus[field]?.checking
    ) {
      return;
    }

    await runAvailabilityCheck(field, trimmedValue);
  };

  // Validate toàn bộ form đăng ký theo quy tắc BE
  const validateRegisterForm = (data) => {
    const errors = {};
    const trimmed = {
      fullname: data.fullname.trim(),
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword
    };

    // Fullname không được để trống
    if (!trimmed.fullname) {
      errors.fullname = t('validation.fullnameRequired');
    }

    // Username validation
    const usernameError = getUsernameValidationMessage(trimmed.username, t);
    if (usernameError) {
      errors.username = usernameError;
    }

    // Email validation
    const emailError = getEmailValidationMessage(trimmed.email, t);
    if (emailError) {
      errors.email = emailError;
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

  const validateAvailabilityBeforeSubmit = async (trimmedData) => {
    const usernameFromCache =
      availabilityStatus.username.checkedValue === trimmedData.username
        ? availabilityStatus.username.available
        : null;
    const emailFromCache =
      availabilityStatus.email.checkedValue === trimmedData.email
        ? availabilityStatus.email.available
        : null;

    const [usernameAvailable, emailAvailable] = await Promise.all([
      usernameFromCache !== null ? Promise.resolve(usernameFromCache) : runAvailabilityCheck('username', trimmedData.username),
      emailFromCache !== null ? Promise.resolve(emailFromCache) : runAvailabilityCheck('email', trimmedData.email),
    ]);

    const nextErrors = {};

    if (usernameAvailable === false) {
      nextErrors.username = t('auth.usernameExists') || 'Username đã được sử dụng';
    }

    if (emailAvailable === false) {
      nextErrors.email = t('auth.emailExists') || 'Email đã được sử dụng';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...nextErrors }));
      return false;
    }

    if (usernameAvailable === null || emailAvailable === null) {
      setError(t('auth.checkAvailabilityFailed') || 'Không thể kiểm tra tính khả dụng, vui lòng thử lại');
      return false;
    }

    return true;
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
    const { isValid, errors } = validateRegisterForm(trimmedData);
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }
    
    if (!trimmedData.agreeToTerms) {
      setFieldErrors({ agreeToTerms: t('auth.agreeToTermsRequired') || 'Vui lòng đồng ý với điều khoản sử dụng' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const isAvailabilityValid = await validateAvailabilityBeforeSubmit(trimmedData);
      if (!isAvailabilityValid) {
        return;
      }

      await requestOtpWithSocket(
        trimmedData.email,
        'auth.registerOtpSent',
        'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra.'
      );
      setFieldErrors({});
      setRegisterStep('otp');
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

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setFieldErrors(prev => ({ ...prev, otp: t('validation.otpRequired') || t('auth.otpRequired') || 'Vui lòng nhập mã OTP' }));
      return;
    }

    setIsLoading(true);
    
    try {
      // Xác thực OTP (trim OTP)
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
      await requestOtpWithSocket(
        formData.email.trim(),
        'auth.otpSent',
        'Mã OTP đã được gửi lại đến email của bạn'
      );
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
    setAvailabilityStatus({
      username: { checking: false, available: null, message: '', checkedValue: '' },
      email: { checking: false, available: null, message: '', checkedValue: '' }
    });
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
    availabilityStatus,
    successMessage,
    setSuccessMessage,
    handleChange,
    handleAvailabilityBlur,
    handleOtpChange,
    handleRegisterSubmit,
    handleVerifyOTPAndRegister,
    handleResendOTP,
    resetRegisterState
  };
};
