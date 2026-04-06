import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/Components/ui/button";
import { FloatingInput } from "@/Components/ui/floating-input";
import { ChevronLeft, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { validateForgotPasswordForm, submitForgotPasswordRequest } from './ForgotPassword';
import LogoLight from "@/assets/LightMode_Logo.webp";
import AuthIllustration from '@/Components/ui/AuthIllustration';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  
  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Xác thực dữ liệu
    const validation = validateForgotPasswordForm(email);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API gửi yêu cầu đặt lại mật khẩu
      const response = await submitForgotPasswordRequest(email);
      setSuccessMessage(response.message);
      setEmail('');
      setErrors({});
      
      // Chuyển hướng sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa thông báo lỗi khi người dùng sửa email
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors({});
    }
  };

  return (
    <div className={`min-h-screen bg-white flex flex-col ${fontClass}`}>
      {/* Header: Logo & Language Toggle */}
      <header className="flex justify-between items-center px-12 py-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to landing page"
            className="flex h-20 w-20 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <img src={LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </button>
        </div>
        
        {/* Nút đổi ngôn ngữ */}
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label="Switch language"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto grid md:grid-cols-2 gap-12 items-center px-8 pb-12">
        
        {/* Left Side: Form Container */}
        <div className="max-w-md w-full mx-auto md:mx-0">
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Back to Login Button */}
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-8 hover:text-[#0455BF] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> {t('backToLogin')}
            </button>

            <div className="mb-10">
              <h1 className="text-4xl font-semibold text-[#313131] mb-4">{t('forgotPasswordTitle')}</h1>
              <p className="text-gray-500 leading-relaxed">
                {t('forgotPasswordSubtitle')}
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Success Message */}
              {successMessage && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Email Input - Floating Label */}
              <div>
                <FloatingInput
                  id="email"
                  type="email"
                  label={t('email')}
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                  error={errors.email}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-600">{errors.email}</p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('processing') : t('submit')}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-200" />
                <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('orLoginWith')}</span>
                <div className="flex-grow border-t border-gray-200" />
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  {/* Google icon */}
                  <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </Button>
                <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                  {/* Apple icon */}
                  <svg className="w-6 h-6 text-[#313131]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[550px] h-[750px] bg-gray-100 rounded-[30px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500">
            <AuthIllustration alt="" imgClassName="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0" />
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
