import { useState } from 'react';
import { login, googleLogin } from '@/api/Authentication';
import { useGoogleLogin } from '@react-oauth/google';

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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await login(loginData);
      if (response.statusCode === 200 || response.statusCode === 0) {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed') || 'Đăng nhập thất bại, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError('');
      try {
        /* 
         Lưu ý: Bạn cần API backend hỗ trợ đăng nhập Google bằng access token 
         hoặc sử dụng googleLogin(tokenResponse.access_token) nếu API đã sẵn sàng
        */
        // console.log(tokenResponse);
        // const response = await googleLogin(tokenResponse.access_token);
        // if (response.statusCode === 200) navigate('/home');
        
        // Tạm thời hiển thị thông báo chưa tích hợp
        console.log("Google Token:", tokenResponse);
        setError("Google Login integrated but backend verification pending.");
        
      } catch (err) {
        setError(t('auth.loginGoogleFailed') || 'Đăng nhập Google thất bại');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError(t('auth.loginGoogleFailed') || 'Đăng nhập Google thất bại');
    }
  });

  const handleGoogleSubmit = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      console.log("ID Token sẵn sàng gửi về BE:", credentialResponse);
      const response = await googleLogin(credentialResponse);
      if (response.statusCode === 200 || response.statusCode === 0) {
         navigate('/home');
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
    handleGoogleLogin,
    handleGoogleSubmit
  };
};
