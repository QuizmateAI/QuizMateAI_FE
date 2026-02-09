import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; 
import { FloatingInput, FloatingPasswordInput } from "@/components/ui/floating-input";
import { ChevronLeft, Globe } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";
import LogoLight from "@/assets/LightMode_Logo.png";


const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t, i18n } = useTranslation();
  
  // Lấy ngôn ngữ hiện tại và tính toán font class
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  // Hàm chuyển đổi ngôn ngữ
  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };
  
  // Login form state
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  
  // Register form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    // Xử lý logic đăng ký ở đây
    console.log('Registration data:', formData);
  };
  
  // State để chuyển đổi giữa 'login', 'register' và 'forgot-password'
  const [view, setView] = useState('login'); 

  return (
    <div className={`min-h-screen bg-white flex flex-col overflow-hidden ${fontClass}`}>
      {/* Header: Logo & Language Toggle */}
      <header className="flex justify-between items-center px-12">
        <div className="flex items-center gap-2">
          {/* Logo - Import từ assets */}
          <div className="w-[150px] h-[120px] flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <img src={LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        {/* Nút đổi ngôn ngữ */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
        >
          <Globe className="w-4 h-4" />
          <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto grid md:grid-cols-2 gap-8 items-center px-4 pb-2">
        
        {/* Left Side: Form Container */}
        <div className="max-w-md w-full mx-auto md:mx-0">
          
          {/* --- VIEW: LOGIN --- */}
          {view === 'login' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              {/* Nút quay về trang chủ */}
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-6 hover:text-[#0455BF] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToHome')}
              </button>

              <div className="mb-5">
                <h1 className="text-4xl font-semibold text-[#313131] mb-4">{t('auth.login')}</h1>
                <p className="text-gray-500">{t('auth.loginSubtitle')}</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Email Input - Floating Label */}
                <FloatingInput
                  id="email"
                  type="email"
                  label={t('auth.email')}
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                />

                {/* Password Input - Floating Label */}
                <FloatingPasswordInput
                  id="password"
                  label={t('auth.password')}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label htmlFor="remember" className="text-sm font-medium text-[#313131] cursor-pointer">
                      {t('auth.rememberMe')}
                    </label>
                  </div>
                  {/* Chuyển sang View Quên mật khẩu */}
                  <a 
                    href="/forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('forgot-password');
                    }}
                    className="text-sm font-medium text-[#FF8682] hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </a>
                </div>

                <Button className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all">
                  {t('auth.loginButton')}
                </Button>

                <p className="text-center text-sm text-[#313131] font-medium">
                  {t('auth.noAccount')} <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); }} className="text-[#FF8682] hover:underline">{t('auth.signUp')}</a>
                </p>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('auth.orLoginWith')}</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid gap-4">
                  <Button 
                    variant="outline" 
                    className="h-14 border-[#515DEF]"
                    onClick={() => navigate('/home')}
                  >
                    <FcGoogle className="w-6 h-6" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* --- VIEW: FORGOT PASSWORD --- */}
          {view === 'forgot-password' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-8 hover:text-black"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
              </button>

              <div className="mb-10">
                <h1 className="text-4xl font-semibold text-[#313131] mb-4">{t('auth.forgotPasswordTitle')}</h1>
                <p className="text-gray-500 leading-relaxed">
                  {t('auth.forgotPasswordSubtitle')}
                </p>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <FloatingInput
                  id="forgot-email"
                  type="email"
                  label={t('auth.email')}
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                />

                <Button className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all">
                  {t('auth.submit')}
                </Button>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('auth.orLoginWith')}</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid gap-4">
                  <Button variant="outline" className="h-14 border-[#515DEF]">
                    <FcGoogle className="w-6 h-6" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* --- VIEW: REGISTER --- */}
          {view === 'register' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              {/* Nút quay về Login */}
              <button 
                onClick={() => setView('login')}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] mb-6 hover:text-[#0455BF] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
              </button>

              <div className="mb-8">
                <h1 className="text-4xl font-semibold text-[#313131] mb-4">{t('auth.signUpTitle')}</h1>
                <p className="text-gray-500">{t('auth.signUpSubtitle')}</p>
              </div>

              <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <FloatingInput
                    id="firstName"
                    type="text"
                    label={t('auth.firstName')}
                    value={formData.firstName}
                    onChange={handleChange('firstName')}
                  />
                  <FloatingInput
                    id="lastName"
                    type="text"
                    label={t('auth.lastName')}
                    value={formData.lastName}
                    onChange={handleChange('lastName')}
                  />
                </div>

                {/* Email */}
                <FloatingInput
                  id="register-email"
                  type="email"
                  label={t('auth.email')}
                  value={formData.email}
                  onChange={handleChange('email')}
                />

                {/* Password */}
                <FloatingPasswordInput
                  id="register-password"
                  label={t('auth.password')}
                  value={formData.password}
                  onChange={handleChange('password')}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                {/* Confirm Password */}
                <FloatingPasswordInput
                  id="confirmPassword"
                  label={t('auth.confirmPassword')}
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="agreeToTerms" 
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                    required
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-[#313131] cursor-pointer leading-relaxed">
                    {t('auth.agreeToTerms')} <a href="#" className="text-[#FF8682] hover:underline">{t('auth.terms')}</a> {t('auth.and')} <a href="#" className="text-[#FF8682] hover:underline">{t('auth.privacyPolicies')}</a>
                  </label>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit"
                  className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] text-white text-base font-semibold transition-all"
                >
                  {t('auth.createAccount')}
                </Button>

                {/* Login Link */}
                <p className="text-center text-sm text-[#313131] font-medium">
                  {t('auth.alreadyHaveAccount')} {' '}
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('login');
                    }}
                    className="text-[#FF8682] hover:underline cursor-pointer"
                  >
                    {t('auth.login')}
                  </a>
                </p>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-sm">{t('auth.orRegisterWith')}</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid gap-4">
                  <Button variant="outline" className="h-14 border-[#515DEF] hover:bg-gray-50">
                    <FcGoogle className="w-6 h-6" />
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[750px] h-[600px] bg-gray-100 rounded-[30px] overflow-hidden shadow-xl flex items-center justify-center transition-all duration-500">
             <img 
               src="/path-to-your-phone-hand-image.png" 
               alt="Login illustration" 
               className="w-full h-full object-cover"
             />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl -z-0"></div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
