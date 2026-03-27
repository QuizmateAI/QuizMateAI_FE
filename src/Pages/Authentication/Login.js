import { useState } from 'react';
import { login, googleLogin } from '@/api/Authentication';

export const useLogin = (navigate, location, t) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleLoginChange = (field) => (e) => {
    setLoginData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Trim tất cả dữ liệu trước khi submit
  const trimLoginData = () => ({
    username: loginData.username.trim(),
    password: loginData.password
  });

  const resolveReturnPath = () => {
    const from = location?.state?.from;
    if (!from) return null;

    if (typeof from === 'string') {
      return from;
    }

    if (from.pathname) {
      return `${from.pathname}${from.search || ''}${from.hash || ''}`;
    }

    return null;
  };

  // Hàm điều hướng theo role
  const navigateByRole = (role) => {
    if (role === 'SUPER_ADMIN') return navigate('/super-admin');
    if (role === 'ADMIN') return navigate('/admin');
    const returnPath = resolveReturnPath();
    if (returnPath) {
      return navigate(returnPath, { replace: true });
    }
    return navigate('/home');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    // Trim dữ liệu trước khi gửi
    const trimmed = trimLoginData();
    setLoginData(trimmed);

    const nextFieldErrors = {};
    if (!trimmed.username) {
      nextFieldErrors.username = t('validation.usernameRequired');
    }
    if (!trimmed.password) {
      nextFieldErrors.password = t('validation.passwordRequired');
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await login(trimmed);
      console.log("BE Login Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed') || 'Đăng nhập thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      console.log("Google Credential Response:", credentialResponse);
      // credentialResponse.credential CHÍNH LÀ idToken (JWT) mong muốn
      const response = await googleLogin(credentialResponse.credential);
      console.log("BE Google Submit Response:", response);
      if (response.statusCode === 200 || response.statusCode === 0) {
         navigateByRole(response.data.role);
      }
    } catch (err) {
      setError(t('auth.loginGoogleFailed') || 'Đăng nhập Google thất bại');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginData,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    fieldErrors,
    setError,
    handleLoginChange,
    handleLoginSubmit,
    handleGoogleSubmit
  };
};
