import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/Components/ui/button";
import { FloatingInput } from "@/Components/ui/floating-input";
import { ChevronLeft, AlertCircle, CheckCircle, Globe, Moon, Sun } from 'lucide-react';
import { validateForgotPasswordForm, submitForgotPasswordRequest } from './ForgotPassword';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import AuthIllustration from '@/Components/ui/AuthIllustration';
import { useDarkMode } from '@/hooks/useDarkMode';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${fontClass} ${
      isDarkMode ? 'bg-slate-950' : 'bg-white'
    }`}>
      {/* Header: Logo & Language Toggle */}
      <header className="flex justify-between items-center px-12 py-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to landing page"
            className="flex h-20 w-20 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <img
              src={isDarkMode ? LogoDark : LogoLight}
              alt="QuizMate AI Logo"
              className="w-full h-full object-contain"
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút đổi chế độ sáng/tối */}
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-yellow-400 hover:bg-slate-800'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Nút đổi ngôn ngữ */}
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Switch language"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto grid md:grid-cols-2 gap-12 items-center px-8 pb-12">
        
        {/* Left Side: Form Container */}
        <div className="max-w-md w-full mx-auto md:mx-0">
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Back to Login Button */}
            <button
              onClick={() => navigate('/login')}
              className={`flex items-center gap-1 text-sm font-medium mb-8 transition-colors ${
                isDarkMode
                  ? 'text-slate-300 hover:text-blue-400'
                  : 'text-[#313131] hover:text-[#0455BF]'
              }`}
            >
              <ChevronLeft className="w-5 h-5" /> {t('backToLogin')}
            </button>

            <div className="mb-10">
              <h1 className={`text-4xl font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-[#313131]'
              }`}>{t('forgotPasswordTitle')}</h1>
              <p className={`leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>
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
