import { useState } from 'react';
import { login, googleLogin } from '@/api/Authentication';

export const useLogin = (navigate, t) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginChange = (field) => (e) => {
    setLoginData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  // Trim tất cả dữ liệu trước khi submit
  const trimLoginData = () => ({
    username: loginData.username.trim(),
    password: loginData.password
  });

  // Hàm điều hướng theo role
  const navigateByRole = (role) => {
    if (role === 'SUPER_ADMIN') return navigate('/super-admin');
    if (role === 'ADMIN') return navigate('/admin');
    return navigate('/home');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Trim dữ liệu trước khi gửi
    const trimmed = trimLoginData();
    setLoginData(trimmed);
    
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
    setError,
    handleLoginChange,
    handleLoginSubmit,
    handleGoogleSubmit
  };
};
