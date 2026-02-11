import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; 
import { FloatingInput, FloatingPasswordInput } from "@/components/ui/floating-input";
import { ChevronLeft, Globe, Sun, Moon, Loader2 } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";
import { GoogleLogin } from '@react-oauth/google';
import LogoLight from "@/assets/LightMode_Logo.png";
import LogoDark from "@/assets/DarkMode_Logo.png";
import { DarkModeProvider, useDarkMode } from '@/hooks/useDarkMode';
import { useLogin } from './Login';
import { useRegister } from './Register';
import { useForgotPassword } from './ForgotPassword';


const LoginPageContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Lấy ngôn ngữ hiện tại và tính toán font class
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  // Hàm chuyển đổi ngôn ngữ
  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };
    
  // State để chuyển đổi giữa 'login', 'register' và 'forgot-password'
  const [view, setView] = useState(location.state?.view || 'login'); 

  // Init Hooks
  const loginHook = useLogin(navigate, t);
  const registerHook = useRegister(setView, t);
  const forgotPasswordHook = useForgotPassword(setView, t);

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-950 flex flex-col overflow-hidden transition-colors duration-300 ${fontClass}`}>
      {/* Header: Logo & Language Toggle */}
      <header className="flex justify-between items-center px-12 pt-4">
        <div className="flex items-center gap-2">
          {/* Logo - Import từ assets */}
          <div className="w-[150px] h-[120px] flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Nút chuyển đổi Dark Mode */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg border transition-all duration-300 ${
              isDarkMode 
                ? 'border-slate-700 hover:bg-slate-800 text-yellow-400' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Nút đổi ngôn ngữ */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-600 dark:text-slate-400"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
        </div>
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
                className="flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 mb-6 hover:text-[#0455BF] dark:hover:text-blue-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToHome')}
              </button>

              <div className="mb-5">
                <h1 className="text-4xl font-semibold text-[#313131] dark:text-white mb-4">{t('auth.login')}</h1>
                <p className="text-gray-500 dark:text-slate-400">{t('auth.loginSubtitle')}</p>
              </div>

              <form className="space-y-4" onSubmit={loginHook.handleLoginSubmit}>
                {/* Error Message */}
                {loginHook.error && view === 'login' && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {loginHook.error}
                  </div>
                )}
                
                {/* Username Input - API yêu cầu username */}
                <FloatingInput
                  id="username"
                  type="text"
                  label={t('auth.username') || 'Username'}
                  value={loginHook.loginData.username}
                  onChange={loginHook.handleLoginChange('username')}
                />

                {/* Password Input - Floating Label */}
                <FloatingPasswordInput
                  id="password"
                  label={t('auth.password')}
                  value={loginHook.loginData.password}
                  onChange={loginHook.handleLoginChange('password')}
                  showPassword={loginHook.showPassword}
                  onTogglePassword={() => loginHook.setShowPassword(!loginHook.showPassword)}
                />

                <div className="flex items-center justify-between">
                  {/* ...existing code... */}
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="border-gray-300 dark:border-slate-600 data-[state=checked]:bg-[#0455BF] dark:data-[state=checked]:bg-blue-600" />
                    <label htmlFor="remember" className="text-sm font-medium text-[#313131] dark:text-slate-300 cursor-pointer">
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

                <Button 
                  type="submit"
                  disabled={loginHook.isLoading}
                  className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-base font-semibold transition-all shadow-lg dark:shadow-blue-900/30 disabled:opacity-50"
                >
                  {loginHook.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.loginButton')}
                </Button>

                <p className="text-center text-sm text-[#313131] dark:text-slate-300 font-medium">
                  {t('auth.noAccount')} <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); loginHook.setError(''); }} className="text-[#FF8682] hover:underline">{t('auth.signUp')}</a>
                </p>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-gray-400 dark:text-slate-500 text-sm">{t('auth.orLoginWith')}</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                </div>

                <div className="flex justify-center w-full mt-2">
                  <GoogleLogin
                    onSuccess={credentialResponse => {
                      loginHook.handleGoogleSubmit(credentialResponse.credential);
                    }}
                    onError={() => {
                      loginHook.setError(t('auth.loginGoogleFailed'));
                    }}
                    theme={isDarkMode ? "filled_black" : "outline"}
                    shape="pill"
                    size="large"
                    width="384px"
                  />
                </div>
              </form>
            </div>
          )}

          {/* --- VIEW: FORGOT PASSWORD --- */}
          {view === 'forgot-password' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <button 
                onClick={() => { 
                  setView('login'); 
                  forgotPasswordHook.resetState();
                }}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 mb-8 hover:text-black dark:hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
              </button>

              <div className="mb-8">
                <h1 className="text-4xl font-semibold text-[#313131] dark:text-white mb-4">{t('auth.forgotPasswordTitle')}</h1>
                <p className="text-gray-500 dark:text-slate-400 leading-relaxed">
                  {forgotPasswordHook.forgotPasswordStep === 'email' && (t('auth.forgotPasswordSubtitle') || 'Nhập email để nhận mã OTP')}
                  {forgotPasswordHook.forgotPasswordStep === 'otp' && (t('auth.enterOTPSubtitle') || 'Nhập mã OTP đã được gửi đến email của bạn')}
                  {forgotPasswordHook.forgotPasswordStep === 'newPassword' && (t('auth.newPasswordSubtitle') || 'Nhập mật khẩu mới')}
                </p>
              </div>

              {/* Error Message */}
              {forgotPasswordHook.error && view === 'forgot-password' && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {forgotPasswordHook.error}
                </div>
              )}
              
              {/* Success Message */}
              {forgotPasswordHook.successMessage && view === 'forgot-password' && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
                  {forgotPasswordHook.successMessage}
                </div>
              )}

              {/* Step 1: Enter Email */}
              {forgotPasswordHook.forgotPasswordStep === 'email' && (
                <form className="space-y-6" onSubmit={forgotPasswordHook.handleSendOTP}>
                  <FloatingInput
                    id="forgot-email"
                    type="email"
                    label={t('auth.email')}
                    value={forgotPasswordHook.forgotPasswordData.email}
                    onChange={forgotPasswordHook.handleForgotPasswordChange('email')}
                  />

                  <Button 
                    type="submit"
                    disabled={forgotPasswordHook.isLoading}
                    className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-base font-semibold transition-all shadow-lg dark:shadow-blue-900/30 disabled:opacity-50"
                  >
                    {forgotPasswordHook.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (t('auth.sendOTP') || 'Gửi mã OTP')}
                  </Button>
                </form>
              )}

              {/* Step 2: Enter OTP */}
              {forgotPasswordHook.forgotPasswordStep === 'otp' && (
                <form className="space-y-6" onSubmit={forgotPasswordHook.handleVerifyOTP}>
                  <FloatingInput
                    id="otp-code"
                    type="text"
                    label={t('auth.otpCode') || 'Mã OTP'}
                    value={forgotPasswordHook.forgotPasswordData.otp}
                    onChange={forgotPasswordHook.handleForgotPasswordChange('otp')}
                  />

                  <Button 
                    type="submit"
                    disabled={forgotPasswordHook.isLoading}
                    className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-base font-semibold transition-all shadow-lg dark:shadow-blue-900/30 disabled:opacity-50"
                  >
                    {forgotPasswordHook.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (t('auth.verifyOTP') || 'Xác thực OTP')}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { forgotPasswordHook.setForgotPasswordStep('email'); forgotPasswordHook.setError(''); forgotPasswordHook.setSuccessMessage(''); }}
                    className="w-full text-center text-sm text-gray-500 dark:text-slate-400 hover:text-[#0455BF] dark:hover:text-blue-400 transition-colors"
                  >
                    {t('auth.resendOTP') || 'Gửi lại mã OTP'}
                  </button>
                </form>
              )}

              {/* Step 3: Enter New Password */}
              {forgotPasswordHook.forgotPasswordStep === 'newPassword' && (
                <form className="space-y-6" onSubmit={forgotPasswordHook.handleResetPassword}>
                  <FloatingPasswordInput
                    id="new-password"
                    label={t('auth.newPassword') || 'Mật khẩu mới'}
                    value={forgotPasswordHook.forgotPasswordData.newPassword}
                    onChange={forgotPasswordHook.handleForgotPasswordChange('newPassword')}
                    showPassword={forgotPasswordHook.showPassword}
                    onTogglePassword={() => forgotPasswordHook.setShowPassword(!forgotPasswordHook.showPassword)}
                  />

                  <FloatingPasswordInput
                    id="confirm-new-password"
                    label={t('auth.confirmNewPassword') || 'Xác nhận mật khẩu mới'}
                    value={forgotPasswordHook.forgotPasswordData.confirmNewPassword}
                    onChange={forgotPasswordHook.handleForgotPasswordChange('confirmNewPassword')}
                    showPassword={forgotPasswordHook.showConfirmPassword}
                    onTogglePassword={() => forgotPasswordHook.setShowConfirmPassword(!forgotPasswordHook.showConfirmPassword)}
                  />

                  <Button 
                    type="submit"
                    disabled={forgotPasswordHook.isLoading}
                    className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-base font-semibold transition-all shadow-lg dark:shadow-blue-900/30 disabled:opacity-50"
                  >
                    {forgotPasswordHook.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (t('auth.resetPassword') || 'Đặt lại mật khẩu')}
                  </Button>
                </form>
              )}

              {/* Progress Indicator */}
              <div className="flex justify-center items-center gap-2 mt-8">
                <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'email' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}></div>
                <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'otp' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}></div>
                <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'newPassword' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`}></div>
              </div>
            </div>
          )}

          {/* --- VIEW: REGISTER --- */}
          {view === 'register' && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              {/* Nút quay về Login */}
              <button 
                onClick={() => { setView('login'); registerHook.setError(''); registerHook.setSuccessMessage(''); }}
                className="flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 mb-6 hover:text-[#0455BF] dark:hover:text-blue-400 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
              </button>

              <div className="mb-6">
                <h1 className="text-4xl font-semibold text-[#313131] dark:text-white mb-4">{t('auth.signUpTitle')}</h1>
                <p className="text-gray-500 dark:text-slate-400">{t('auth.signUpSubtitle')}</p>
              </div>

              <form className="space-y-4" onSubmit={registerHook.handleRegisterSubmit}>
                {/* Error Message */}
                {registerHook.error && view === 'register' && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {registerHook.error}
                  </div>
                )}
                
                {/* Success Message */}
                {registerHook.successMessage && view === 'register' && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
                    {registerHook.successMessage}
                  </div>
                )}

                {/* Fullname */}
                <div>
                  <FloatingInput
                    id="fullname"
                    type="text"
                    label={t('auth.fullname') || 'Họ và tên'}
                    value={registerHook.formData.fullname}
                    onChange={registerHook.handleChange('fullname')}
                  />
                  {registerHook.fieldErrors?.fullname && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{registerHook.fieldErrors.fullname}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <FloatingInput
                    id="register-username"
                    type="text"
                    label={t('auth.username') || 'Username'}
                    value={registerHook.formData.username}
                    onChange={registerHook.handleChange('username')}
                  />
                  {registerHook.fieldErrors?.username && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{registerHook.fieldErrors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <FloatingInput
                    id="register-email"
                    type="email"
                    label={t('auth.email')}
                    value={registerHook.formData.email}
                    onChange={registerHook.handleChange('email')}
                  />
                  {registerHook.fieldErrors?.email && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{registerHook.fieldErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <FloatingPasswordInput
                    id="register-password"
                    label={t('auth.password')}
                    value={registerHook.formData.password}
                    onChange={registerHook.handleChange('password')}
                    showPassword={registerHook.showPassword}
                    onTogglePassword={() => registerHook.setShowPassword(!registerHook.showPassword)}
                  />
                  {registerHook.fieldErrors?.password && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{registerHook.fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <FloatingPasswordInput
                    id="confirmPassword"
                    label={t('auth.confirmPassword')}
                    value={registerHook.formData.confirmPassword}
                    onChange={registerHook.handleChange('confirmPassword')}
                    showPassword={registerHook.showConfirmPassword}
                    onTogglePassword={() => registerHook.setShowConfirmPassword(!registerHook.showConfirmPassword)}
                  />
                  {registerHook.fieldErrors?.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{registerHook.fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="agreeToTerms" 
                    checked={registerHook.formData.agreeToTerms}
                    onCheckedChange={(checked) => registerHook.setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                    required
                    className="border-gray-300 dark:border-slate-600 data-[state=checked]:bg-[#0455BF] dark:data-[state=checked]:bg-blue-600"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-[#313131] dark:text-slate-300 cursor-pointer leading-relaxed">
                    {t('auth.agreeToTerms')} <a href="#" className="text-[#FF8682] hover:underline">{t('auth.terms')}</a> {t('auth.and')} <a href="#" className="text-[#FF8682] hover:underline">{t('auth.privacyPolicies')}</a>
                  </label>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit"
                  disabled={registerHook.isLoading}
                  className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-base font-semibold transition-all shadow-lg dark:shadow-blue-900/30 disabled:opacity-50"
                >
                  {registerHook.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.createAccount')}
                </Button>

                {/* Login Link */}
                <p className="text-center text-sm text-[#313131] dark:text-slate-300 font-medium">
                  {t('auth.alreadyHaveAccount')} {' '}
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('login');
                      registerHook.setError('');
                    }}
                    className="text-[#FF8682] hover:underline cursor-pointer"
                  >
                    {t('auth.login')}
                  </a>
                </p>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-gray-400 dark:text-slate-500 text-sm">{t('auth.orRegisterWith')}</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                </div>

                {/* Social Login Buttons */}
                <div className="flex justify-center w-full mt-2">
                  <GoogleLogin
                    onSuccess={credentialResponse => {
                      loginHook.handleGoogleSubmit(credentialResponse.credential);
                    }}
                    onError={() => {
                      loginHook.setError(t('auth.loginGoogleFailed'));
                    }}
                    theme={isDarkMode ? "filled_black" : "outline"}
                    shape="pill"
                    size="large"
                    width="384px"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Decorative Image */}
        <div className="hidden md:flex justify-end relative">
          <div className="relative z-10 w-[750px] h-[600px] bg-gray-100 dark:bg-slate-900 rounded-[30px] overflow-hidden shadow-xl dark:shadow-blue-900/50 flex items-center justify-center transition-all duration-500 border dark:border-slate-800">
             <img 
               src="/path-to-your-phone-hand-image.png" 
               alt="Login illustration" 
               className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
             />
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 dark:bg-blue-900/30 rounded-full blur-3xl -z-0"></div>
        </div>
      </main>
    </div>
  );
};

const LoginPage = () => {    
    return (
            <DarkModeProvider>
                <LoginPageContent />
            </DarkModeProvider>
    )
}

export default LoginPage;
