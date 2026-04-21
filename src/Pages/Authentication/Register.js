import { useEffect, useRef, useState } from 'react';
import { checkEmail, checkUsername, register, sendOTP, verifyOTP } from '@/api/Authentication';
import { waitForOtpStatus } from '@/lib/authOtpSocket';
import { markAuthAvailabilityUnavailable, mayBeAuthAvailabilityUnavailable } from '@/lib/authAvailabilityBloom';
import { getEmailViolationKey } from '@/Utils/emailValidation';
import i18n from '@/i18n';

// Regex theo BE: username phải chứa cả chữ và số, cho phép . _ @ -
const USERNAME_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9._@-]{3,50}$/;
// Regex theo BE: password phải chứa cả chữ và số
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
const AVAILABILITY_DEBOUNCE_MS = 250;
const AVAILABILITY_CACHE_TTL_MS = 60 * 1000;

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

function normalizeAvailabilityValue(field, value) {
  const trimmedValue = String(value || '').trim();
  return field === 'email' ? trimmedValue.toLowerCase() : trimmedValue;
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
  const availabilityDebounceRef = useRef({ username: null, email: null });
  const availabilityCacheRef = useRef({
    username: { available: new Map(), unavailable: new Map() },
    email: { available: new Map(), unavailable: new Map() },
  });

  const clearAvailabilityTimer = (field) => {
    if (availabilityDebounceRef.current[field]) {
      clearTimeout(availabilityDebounceRef.current[field]);
      availabilityDebounceRef.current[field] = null;
    }
  };

  useEffect(() => () => {
    Object.values(availabilityDebounceRef.current).forEach((timerId) => {
      if (timerId) {
        clearTimeout(timerId);
      }
    });
  }, []);

  const setAvailabilityFieldState = (field, nextState) => {
    setAvailabilityStatus(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        ...nextState,
      }
    }));
  };

  const getAvailabilityMessages = (field) => ({
    checking: t('auth.checkingAvailability') || 'Checking...',
    available: field === 'username'
      ? (t('auth.usernameAvailable') || 'Username is available')
      : (t('auth.emailAvailable') || 'Email is available'),
    unavailable: field === 'username'
      ? (t('auth.usernameExists') || 'Username is already in use')
      : (t('auth.emailExists') || 'Email is already in use'),
  });

  const readAvailabilityCache = (field, value) => {
    const now = Date.now();
    const cache = availabilityCacheRef.current[field];
    const availableAt = cache.available.get(value);
    const unavailableAt = cache.unavailable.get(value);

    if (typeof availableAt === 'number') {
      if (now - availableAt <= AVAILABILITY_CACHE_TTL_MS) {
        return true;
      }
      cache.available.delete(value);
    }

    if (typeof unavailableAt === 'number') {
      if (now - unavailableAt <= AVAILABILITY_CACHE_TTL_MS) {
        return false;
      }
      cache.unavailable.delete(value);
    }

    return null;
  };

  const writeAvailabilityCache = (field, value, isAvailable) => {
    const cache = availabilityCacheRef.current[field];
    const timestamp = Date.now();

    if (isAvailable) {
      cache.available.set(value, timestamp);
      cache.unavailable.delete(value);
      return;
    }

    cache.unavailable.set(value, timestamp);
    cache.available.delete(value);
    markAuthAvailabilityUnavailable(field, value);
  };

  const applyAvailabilityResult = (field, value, isAvailable) => {
    const messages = getAvailabilityMessages(field);

    setAvailabilityFieldState(field, {
      checking: false,
      available: isAvailable,
      checkedValue: value,
      message: isAvailable ? messages.available : messages.unavailable,
    });

    if (isAvailable) {
      clearFieldError(field);
      return;
    }

    setFieldErrors(prev => ({ ...prev, [field]: messages.unavailable }));
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
    clearAvailabilityTimer(field);

    const requestId = availabilityRequestRef.current[field] + 1;
    availabilityRequestRef.current[field] = requestId;
    const messages = getAvailabilityMessages(field);

    setAvailabilityFieldState(field, {
      checking: true,
      available: null,
      checkedValue: value,
      message: messages.checking,
    });

    try {
      const response = field === 'username'
        ? await checkUsername(value)
        : await checkEmail(value);

      if (availabilityRequestRef.current[field] !== requestId) {
        return null;
      }

      const isAvailable = response?.data === true;
      writeAvailabilityCache(field, value, isAvailable);
      applyAvailabilityResult(field, value, isAvailable);

      return isAvailable;
    } catch (err) {
      if (availabilityRequestRef.current[field] !== requestId) {
        return null;
      }

      if (err?.statusCode === 400) {
        writeAvailabilityCache(field, value, false);
        applyAvailabilityResult(field, value, false);
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

  const scheduleAvailabilityCheck = (field, rawValue, { immediate = false } = {}) => {
    if (registerStep !== 'form') {
      return;
    }

    clearAvailabilityTimer(field);
    availabilityRequestRef.current[field] += 1;

    const normalizedValue = normalizeAvailabilityValue(field, rawValue);

    if (!normalizedValue) {
      setAvailabilityFieldState(field, {
        checking: false,
        available: null,
        checkedValue: '',
        message: '',
      });
      return;
    }

    const formatError = field === 'username'
      ? getUsernameValidationMessage(normalizedValue, t)
      : getEmailValidationMessage(normalizedValue, t);

    if (formatError) {
      setAvailabilityFieldState(field, {
        checking: false,
        available: false,
        checkedValue: normalizedValue,
        message: formatError,
      });
      setFieldErrors(prev => ({ ...prev, [field]: formatError }));
      return;
    }

    clearFieldError(field);

    const cachedAvailability = readAvailabilityCache(field, normalizedValue);
    if (cachedAvailability !== null) {
      applyAvailabilityResult(field, normalizedValue, cachedAvailability);
      return;
    }

    const messages = getAvailabilityMessages(field);
    const delay = immediate
      ? 0
      : mayBeAuthAvailabilityUnavailable(field, normalizedValue)
        ? 0
        : AVAILABILITY_DEBOUNCE_MS;

    setAvailabilityFieldState(field, {
      checking: true,
      available: null,
      checkedValue: normalizedValue,
      message: messages.checking,
    });

    availabilityDebounceRef.current[field] = setTimeout(() => {
      availabilityDebounceRef.current[field] = null;
      void runAvailabilityCheck(field, normalizedValue);
    }, delay);
  };

  const requestOtpWithSocket = async (email, successKey, fallbackSuccessMessage) => {
    const otpStatus = await waitForOtpStatus(email, () => sendOTP(email));

    if (!otpStatus?.success) {
      throw new Error(otpStatus?.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
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
      scheduleAvailabilityCheck(field, nextValue);
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

    const trimmedValue = normalizeAvailabilityValue(field, formData[field]);
    setFormData(prev => ({ ...prev, [field]: trimmedValue }));
    scheduleAvailabilityCheck(field, trimmedValue, { immediate: true });
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
    clearAvailabilityTimer('username');
    clearAvailabilityTimer('email');

    const [usernameAvailable, emailAvailable] = await Promise.all([
      runAvailabilityCheck('username', normalizeAvailabilityValue('username', trimmedData.username)),
      runAvailabilityCheck('email', normalizeAvailabilityValue('email', trimmedData.email)),
    ]);

    const nextErrors = {};

    if (usernameAvailable === false) {
      nextErrors.username = t('auth.usernameExists') || 'Username is already in use';
    }

    if (emailAvailable === false) {
      nextErrors.email = t('auth.emailExists') || 'Email is already in use';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...nextErrors }));
      return false;
    }

    if (usernameAvailable === null || emailAvailable === null) {
      setError(t('auth.checkAvailabilityFailed') || 'Unable to check availability, please try again');
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
      setFieldErrors({ agreeToTerms: t('auth.agreeToTermsRequired') || 'Please agree to the terms of use' });
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
        'An OTP code has been sent to your email. Please check your inbox.'
      );
      setFieldErrors({});
      setRegisterStep('otp');
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
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
      setFieldErrors(prev => ({ ...prev, otp: t('validation.otpRequired') || t('auth.otpRequired') || 'Please enter the OTP code' }));
      return;
    }

    setIsLoading(true);
    
    try {
      // Xác thực OTP (trim OTP)
      const otpResponse = await verifyOTP(formData.email.trim(), trimmedOtp);
      if (otpResponse.statusCode === 200 || otpResponse.statusCode === 0) {
        // OTP hợp lệ -> gọi API đăng ký (trim tất cả dữ liệu)
        let darkModeAtRegister = false;
        try {
          const saved = localStorage.getItem('quizmate_dark_mode');
          darkModeAtRegister = saved ? JSON.parse(saved) === true : false;
        } catch {
          darkModeAtRegister = false;
        }

        const registerResponse = await register({
          fullname: formData.fullname.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          preferredLanguage: i18n?.language || undefined,
          themeMode: darkModeAtRegister ? 'dark' : 'light',
        });
        
        if (registerResponse.statusCode === 200 || registerResponse.statusCode === 0) {
          setSuccessMessage(t('auth.registerSuccess') || 'Registration successful! Please login.');
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
        setError(err.message || t('auth.validationFailed') || 'Input data is invalid');
      } else {
        setError(err.message || t('auth.verifyOTPFailed') || 'OTP verification failed, code is invalid or expired');
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
        'OTP code has been resent to your email'
      );
    } catch (err) {
      setError(err.message || t('auth.sendOTPFailed') || 'Failed to send OTP, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset toàn bộ state đăng ký
  const resetRegisterState = () => {
    clearAvailabilityTimer('username');
    clearAvailabilityTimer('email');
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
