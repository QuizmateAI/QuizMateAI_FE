import { useState } from 'react';
import { register, checkUsername } from '@/api/Authentication';

export const useRegister = (setView, t) => {
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch') || 'Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (!formData.agreeToTerms) {
      setError(t('auth.agreeToTermsRequired') || 'Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Gọi API đăng ký
      const response = await register({
        fullname: formData.fullname,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      if (response.statusCode === 200 || response.statusCode === 0) {
        setSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập.');
        setTimeout(() => {
          setView('login');
          setSuccessMessage('');
          // Reset form or handle cleanup if needed
        }, 2000);
      }
    } catch (err) {
      // Xử lý lỗi validation từ server (statusCode 400)
      if (err.statusCode === 400 && err.data?.data) {
        setFieldErrors(err.data.data);
        setError(err.message || t('auth.validationFailed') || 'Dữ liệu nhập không hợp lệ');
      } else {
        setError(err.message || t('auth.registerFailed') || 'Đăng ký thất bại, vui lòng thử lại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    setFormData,
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
    handleRegisterSubmit
  };
};
