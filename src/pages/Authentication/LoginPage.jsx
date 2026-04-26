import React, { Suspense, lazy, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, Globe, Sun, Moon, Loader2,
  User, Mail, Lock, Eye, EyeOff, Check, ArrowRight,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useLogin } from './Login';
import { useRegister } from './Register';
import { useForgotPassword } from './ForgotPassword';
import AuthGoogleProvider, { isGoogleAuthEnabled } from './AuthGoogleProvider';

const DiagonalHeroPanel = lazy(() => import('./DiagonalHeroPanel'));

// ── Form primitives (login-page only) ─────────────────────────────────────
function QMInput({
  id, type = 'text', icon: IconCmp, label, value, onChange, onBlur,
  error, success, suffix, onSuffixClick, autoComplete, compact = false,
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;

  const wrapperClass = compact
    ? 'h-12 rounded-[16px] px-3'
    : 'h-14 rounded-[18px] px-3.5';

  const inputClass = compact
    ? 'h-full py-0 text-[14px] leading-none'
    : 'h-full py-0 text-[15px] leading-none';

  const labelLeft = compact
    ? (IconCmp ? 40 : 14)
    : (IconCmp ? 44 : 16);

  const labelFontSize = active
    ? (compact ? 10 : 11)
    : (compact ? 14 : 15);

  const iconSizeClass = compact ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  const borderClass = error
    ? 'border-red-500'
    : success
      ? 'border-emerald-500'
      : focused
        ? 'border-[#0455BF] dark:border-blue-400'
        : 'border-blue-300 dark:border-slate-700';

  const labelColor = error
    ? 'text-red-500'
    : active
      ? 'text-[#0455BF] dark:text-blue-400'
      : 'text-slate-400 dark:text-slate-500';

  const iconColor = active
    ? 'text-[#0455BF] dark:text-blue-400'
    : 'text-slate-400 dark:text-slate-500';

  return (
    <div
      className={`relative border-[1.25px] bg-white dark:bg-slate-900 flex items-center transition-all duration-200 ${wrapperClass} ${borderClass}`}
      style={{
        boxShadow: focused
          ? '0 12px 22px -18px rgba(4,85,191,.3)'
          : '0 12px 22px -20px rgba(15,23,42,.12)',
      }}
    >
      {IconCmp && (
        <div className={`mr-2.5 transition-colors ${iconColor}`}>
          <IconCmp className={iconSizeClass} strokeWidth={1.8} />
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        autoComplete={autoComplete}
        className={`qm-auth-input peer flex-1 bg-transparent border-none outline-none font-sans text-slate-800 dark:text-white transition-[padding] duration-150 ${inputClass}`}
      />
      <label
        htmlFor={id}
        className={`absolute pointer-events-none select-none transition-all duration-150 ${labelColor} ${active ? 'bg-white px-1.5 dark:bg-slate-900' : 'bg-transparent px-0'}`}
        style={{
          left: labelLeft,
          top: active ? 0 : '50%',
          transform: 'translateY(-50%)',
          fontSize: labelFontSize,
          fontWeight: active ? 600 : 500,
          letterSpacing: 0,
          textTransform: 'none',
        }}
      >
        {label}
      </label>
      {suffix && (
        <button
          type="button"
          onClick={onSuffixClick}
          className="border-none bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-1.5 flex items-center transition-colors"
          tabIndex={-1}
        >
          {suffix}
        </button>
      )}
      {success && !suffix && (
        <div className="text-emerald-500 flex">
          <Check className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

function QMPasswordInput({ id, label, value, onChange, error, showPassword, onTogglePassword, autoComplete, compact = false }) {
  return (
    <QMInput
      id={id}
      type={showPassword ? 'text' : 'password'}
      icon={Lock}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      autoComplete={autoComplete}
      compact={compact}
      suffix={showPassword
        ? <EyeOff className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} strokeWidth={1.8} />
        : <Eye className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} strokeWidth={1.8} />}
      onSuffixClick={onTogglePassword}
    />
  );
}

function RegisterOtpInputs({ value, onChange, hasError = false }) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || '');

  const focusInput = (index) => {
    const target = inputRefs.current[index];
    if (target) {
      target.focus();
      target.select?.();
    }
  };

  const updateDigits = (nextDigits) => {
    onChange(nextDigits.join(''));
  };

  const setDigit = (index, nextValue) => {
    const sanitized = String(nextValue || '').replace(/\D/g, '');

    if (!sanitized) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      updateDigits(nextDigits);
      return;
    }

    if (sanitized.length > 1) {
      const nextDigits = [...digits];
      sanitized.slice(0, 6).split('').forEach((digit, digitIndex) => {
        if (index + digitIndex < 6) {
          nextDigits[index + digitIndex] = digit;
        }
      });
      updateDigits(nextDigits);
      focusInput(Math.min(index + sanitized.length, 5));
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = sanitized;
    updateDigits(nextDigits);

    if (index < 5) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedValue) return;

    const nextDigits = Array.from({ length: 6 }, (_, index) => pastedValue[index] || '');
    updateDigits(nextDigits);
    focusInput(Math.min(pastedValue.length - 1, 5));
  };

  return (
    <div className="flex justify-center gap-2.5 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { inputRefs.current[index] = node; }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={`h-12 w-12 rounded-xl border text-center text-xl font-black text-slate-900 outline-none transition-all sm:h-14 sm:w-14 ${
            hasError
              ? 'border-red-300 bg-red-50 focus:border-red-500'
              : digit
                ? 'border-[#0455BF] bg-blue-50/80 focus:border-[#0455BF]'
                : 'border-blue-100 bg-white focus:border-[#0455BF]'
          }`}
        />
      ))}
    </div>
  );
}

function RegisterOtpVerificationCard({ t, registerHook, onBackToRegisterForm }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[430px] flex-col items-center py-4 sm:py-8">
      <div className="absolute -left-8 top-6 h-36 w-36 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -right-6 bottom-0 h-40 w-40 rounded-full bg-rose-200/35 blur-3xl" />
      <div className="absolute inset-x-8 top-10 h-40 rounded-full bg-blue-200/35 blur-3xl" />

      <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_24px_60px_-20px_rgba(4,85,191,.28)] ring-8 ring-blue-100/60">
        <Mail className="h-9 w-9 text-[#0455BF]" strokeWidth={2.1} />
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF8682] text-[10px] font-black text-white">
          1
        </div>
      </div>

      <div className="relative w-full rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_28px_70px_-28px_rgba(4,85,191,.35)] sm:px-8">
        <h2 className="text-[28px] font-black tracking-tight text-slate-900">
          {t('auth.checkYourEmailTitle', 'Kiểm tra email của bạn')}
        </h2>
        <p className="mx-auto mt-2 max-w-[260px] text-[13px] leading-5 text-slate-500">
          {t('auth.checkYourEmailSubtitle', 'Chúng tôi đã gửi mã xác thực 6 chữ số đến')}
        </p>
        <p className="mt-1 text-sm font-bold text-[#0455BF]">
          {registerHook.formData.email}
        </p>

        {registerHook.error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {registerHook.error}
          </div>
        )}

        {registerHook.successMessage && !registerHook.error && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
            {registerHook.successMessage}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={registerHook.handleVerifyOTPAndRegister}>
          <RegisterOtpInputs
            value={registerHook.otp}
            onChange={(nextOtp) => registerHook.handleOtpChange({ target: { value: nextOtp } })}
            hasError={Boolean(registerHook.fieldErrors?.otp)}
          />

          {registerHook.fieldErrors?.otp && (
            <p className="text-left text-xs text-red-500">{registerHook.fieldErrors.otp}</p>
          )}

          <PrimaryButton type="submit" loading={registerHook.isLoading}>
            {t('auth.verifyEmailButton', 'Xác thực')} <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </form>

        <p className="mt-5 text-[13px] text-slate-500">
          {t('auth.didNotReceiveEmail', 'Không nhận được email?')}{' '}
          <button
            type="button"
            onClick={registerHook.handleResendOTP}
            disabled={registerHook.isLoading}
            className="font-bold text-[#FF8682] transition-opacity hover:underline disabled:opacity-50"
          >
            {t('auth.resendOTP', 'Gửi lại')}
          </button>
        </p>
      </div>

      <p className="relative mt-5 text-center text-[13px] text-slate-500">
        {t('auth.wrongEmailPrompt', 'Sai email?')}{' '}
        <button
          type="button"
          onClick={onBackToRegisterForm}
          className="font-bold text-[#FF8682] hover:underline"
        >
          {t('auth.backToRegisterForm', 'Quay lại đăng ký')}
        </button>
      </p>
    </div>
  );
}

function ForgotPasswordOtpVerificationCard({ t, forgotPasswordHook, onBackToEmailStep }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[430px] flex-col items-center py-4 sm:py-8">
      <div className="absolute -left-8 top-6 h-36 w-36 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -right-6 bottom-0 h-40 w-40 rounded-full bg-rose-200/35 blur-3xl" />
      <div className="absolute inset-x-8 top-10 h-40 rounded-full bg-blue-200/35 blur-3xl" />

      <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_24px_60px_-20px_rgba(4,85,191,.28)] ring-8 ring-blue-100/60">
        <Mail className="h-9 w-9 text-[#0455BF]" strokeWidth={2.1} />
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF8682] text-[10px] font-black text-white">
          1
        </div>
      </div>

      <div className="relative w-full rounded-[28px] bg-white px-6 py-7 text-center shadow-[0_28px_70px_-28px_rgba(4,85,191,.35)] sm:px-8">
        <h2 className="text-[28px] font-black tracking-tight text-slate-900">
          {t('auth.checkYourEmailTitle', 'Kiểm tra email của bạn')}
        </h2>
        <p className="mx-auto mt-2 max-w-[260px] text-[13px] leading-5 text-slate-500">
          {t('auth.checkYourEmailSubtitle', 'Chúng tôi đã gửi mã xác thực 6 chữ số đến')}
        </p>
        <p className="mt-1 text-sm font-bold text-[#0455BF]">
          {forgotPasswordHook.forgotPasswordData.email}
        </p>

        {forgotPasswordHook.error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {forgotPasswordHook.error}
          </div>
        )}

        {forgotPasswordHook.successMessage && !forgotPasswordHook.error && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
            {forgotPasswordHook.successMessage}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={forgotPasswordHook.handleVerifyOTP}>
          <RegisterOtpInputs
            value={forgotPasswordHook.forgotPasswordData.otp}
            onChange={(nextOtp) => forgotPasswordHook.handleForgotPasswordChange('otp')({ target: { value: nextOtp } })}
            hasError={Boolean(forgotPasswordHook.fieldErrors?.otp)}
          />

          {forgotPasswordHook.fieldErrors?.otp && (
            <p className="text-left text-xs text-red-500">{forgotPasswordHook.fieldErrors.otp}</p>
          )}

          <PrimaryButton type="submit" loading={forgotPasswordHook.isLoading}>
            {t('auth.verifyOTP', 'Xác thực OTP')} <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </form>

        <p className="mt-5 text-[13px] text-slate-500">
          {t('auth.didNotReceiveEmail', 'Không nhận được email?')}{' '}
          <button
            type="button"
            onClick={forgotPasswordHook.handleResendOTP}
            disabled={forgotPasswordHook.isLoading}
            className="font-bold text-[#FF8682] transition-opacity hover:underline disabled:opacity-50"
          >
            {t('auth.resendOTP', 'Gửi lại')}
          </button>
        </p>
      </div>

      <p className="relative mt-5 text-center text-[13px] text-slate-500">
        {t('auth.wrongEmailPrompt', 'Sai email?')}{' '}
        <button
          type="button"
          onClick={onBackToEmailStep}
          className="font-bold text-[#FF8682] hover:underline"
        >
          {t('auth.backToEmailStep', 'Quay lại nhập email')}
        </button>
      </p>
    </div>
  );
}

function StrengthMeter({ value, t }) {
  if (!value) return null;
  let s = 0;
  if (value.length >= 6) s++;
  if (value.length >= 10) s++;
  if (/[A-Z]/.test(value)) s++;
  if (/[0-9]/.test(value)) s++;
  if (/[^A-Za-z0-9]/.test(value)) s++;
  const score = Math.min(s, 4);
  const labels = ['', t('passwordStrength.weak', 'Yếu'), t('passwordStrength.medium', 'Trung bình'), t('passwordStrength.good', 'Khá'), t('passwordStrength.strong', 'Mạnh')];
  const colors = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  const textColors = ['text-slate-400', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-emerald-500'];
  return (
    <div className="mt-1.5 px-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-[3px] rounded-full transition-colors ${i < score ? colors[score] : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <div className={`text-[11px] font-semibold mt-1 ${textColors[score]}`}>{labels[score]}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick, type = 'button', disabled, loading }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[15px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.985]"
      style={{ boxShadow: '0 6px 20px -6px rgba(4,85,191,.55)' }}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
const LoginPageContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const currentLang = i18n.resolvedLanguage || i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const [view, setView] = useState(location.state?.view || 'login');

  const loginHook = useLogin(navigate, location, t);
  const registerHook = useRegister(setView, t);
  const forgotPasswordHook = useForgotPassword(setView, t);

  const handleNavigateBack = () => {
    if (location?.state?.fromLogout) {
      navigate('/', { replace: true });
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <div className={`min-h-screen flex bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-300 ${fontClass}`}>
      {/* ── LEFT: Form column ───────────────────────────────────────────── */}
      <div className="w-full md:w-[52%] flex flex-col relative z-10 px-6 sm:px-10 lg:px-14 pt-8 pb-6">
        <div className="mb-4 flex justify-end gap-2 sm:mb-6">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? t('loginPage.switchToLightModeAria', 'Switch to light mode') : t('loginPage.switchToDarkModeAria', 'Switch to dark mode')}
            title={isDarkMode ? t('loginPage.switchToLightModeTitle', 'Switch to Light Mode') : t('loginPage.switchToDarkModeTitle', 'Switch to Dark Mode')}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-yellow-400 hover:bg-slate-800'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t('loginPage.switchLanguageAria', 'Switch language')}
            className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Globe className="h-4 w-4" />
            <span>{currentLang === 'vi' ? t('loginPage.langShortVi', 'VI') : t('loginPage.langShortEn', 'EN')}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-[420px] mx-auto">

            {/* ─── VIEW: LOGIN ─── */}
            {view === 'login' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <button
                  type="button"
                  onClick={handleNavigateBack}
                  className="mb-5 flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 transition-colors hover:text-[#0455BF] dark:hover:text-blue-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('loginPage.backToPrevious', 'Quay lại')}
                </button>
                <div className="text-[12px] text-[#0455BF] dark:text-blue-400 font-bold uppercase tracking-[0.15em] mb-2">
                  {t('loginPage.welcomeBack', 'Chào mừng trở lại')}
                </div>
                <h1 className="text-[40px] font-black text-slate-900 dark:text-white leading-[1.02] tracking-tight mb-6">
                  {t('auth.login')}
                  <span className="block text-[#0455BF] dark:text-blue-400">{t('loginPage.continueLearning', 'để tiếp tục học')}</span>
                </h1>

                <form className="space-y-3.5" onSubmit={loginHook.handleLoginSubmit}>
                  {loginHook.error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                      {loginHook.error}
                    </div>
                  )}

                  <div>
                    <QMInput
                      id="username"
                      icon={User}
                      label={t('auth.username', 'Username')}
                      value={loginHook.loginData.username}
                      onChange={loginHook.handleLoginChange('username')}
                      error={loginHook.fieldErrors?.username}
                      success={loginHook.loginData.username.length > 2 && !loginHook.fieldErrors?.username}
                      autoComplete="username"
                    />
                    {loginHook.fieldErrors?.username && (
                      <p className="text-red-500 text-xs mt-1.5 ml-1">{loginHook.fieldErrors.username}</p>
                    )}
                  </div>

                  <div>
                    <QMPasswordInput
                      id="password"
                      label={t('auth.password')}
                      value={loginHook.loginData.password}
                      onChange={loginHook.handleLoginChange('password')}
                      showPassword={loginHook.showPassword}
                      onTogglePassword={() => loginHook.setShowPassword(!loginHook.showPassword)}
                      error={loginHook.fieldErrors?.password}
                      autoComplete="current-password"
                    />
                    {loginHook.fieldErrors?.password && (
                      <p className="text-red-500 text-xs mt-1.5 ml-1">{loginHook.fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" className="border-gray-300 dark:border-slate-600 data-[state=checked]:bg-[#0455BF] dark:data-[state=checked]:bg-blue-600" />
                      <label htmlFor="remember" className="text-sm font-medium text-[#313131] dark:text-slate-300 cursor-pointer">
                        {t('auth.rememberMe')}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setView('forgot-password')}
                      className="text-sm font-semibold text-[#FF8682] hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>

                  <PrimaryButton type="submit" loading={loginHook.isLoading}>
                    {t('auth.loginButton')} <ArrowRight className="w-4 h-4" />
                  </PrimaryButton>

                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-gray-200 dark:border-slate-800" />
                    <span className="flex-shrink mx-3 text-gray-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                      {t('auth.orLoginWith')}
                    </span>
                    <div className="flex-grow border-t border-gray-200 dark:border-slate-800" />
                  </div>

                  <p className="text-center text-sm text-[#313131] dark:text-slate-300 font-medium">
                    {t('auth.noAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => { setView('register'); loginHook.setError(''); }}
                      className="text-[#FF8682] font-bold hover:underline"
                    >
                      {t('auth.signUp')}
                    </button>
                  </p>

                  {isGoogleAuthEnabled() ? (
                    <div className="flex justify-center w-full">
                      <GoogleLogin
                        onSuccess={loginHook.handleGoogleSubmit}
                        onError={() => loginHook.setError(t('auth.loginGoogleFailed', 'Google login failed. Please try again.'))}
                        useOneTap
                        theme="outline"
                        shape="pill"
                        width="384"
                        text="signin_with"
                        locale={currentLang}
                      />
                    </div>
                  ) : null}
                </form>
              </div>
            )}

            {/* ─── VIEW: FORGOT PASSWORD ─── */}
            {view === 'forgot-password' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                {forgotPasswordHook.forgotPasswordStep !== 'otp' && (
                  <button
                    onClick={() => {
                      setView('login');
                      forgotPasswordHook.resetState();
                    }}
                    className="flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 mb-6 hover:text-black dark:hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
                  </button>
                )}

                {forgotPasswordHook.forgotPasswordStep !== 'otp' && (
                  <>
                    <h1 className="text-[34px] font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-3">
                      {t('auth.forgotPasswordTitle')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mb-6">
                      {forgotPasswordHook.forgotPasswordStep === 'email' && t('auth.forgotPasswordSubtitle', "Don't worry, happens to all of us. Enter your email below to recover your password")}
                      {forgotPasswordHook.forgotPasswordStep === 'newPassword' && t('auth.newPasswordSubtitle', 'Enter your new password')}
                    </p>
                  </>
                )}

                {forgotPasswordHook.error && forgotPasswordHook.forgotPasswordStep !== 'otp' && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {forgotPasswordHook.error}
                  </div>
                )}

                {forgotPasswordHook.successMessage && forgotPasswordHook.forgotPasswordStep !== 'otp' && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
                    {forgotPasswordHook.successMessage}
                  </div>
                )}

                {forgotPasswordHook.forgotPasswordStep === 'email' && (
                  <form className="space-y-4" onSubmit={forgotPasswordHook.handleSendOTP}>
                    <div>
                      <QMInput
                        id="forgot-email"
                        type="email"
                        icon={Mail}
                        label={t('auth.email')}
                        value={forgotPasswordHook.forgotPasswordData.email}
                        onChange={forgotPasswordHook.handleForgotPasswordChange('email')}
                        onBlur={forgotPasswordHook.handleForgotPasswordEmailBlur}
                        error={forgotPasswordHook.fieldErrors?.email}
                        autoComplete="email"
                      />
                      {forgotPasswordHook.fieldErrors?.email && (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{forgotPasswordHook.fieldErrors.email}</p>
                      )}
                    </div>

                    <PrimaryButton type="submit" loading={forgotPasswordHook.isLoading}>
                      {t('auth.sendOTP', 'Send OTP')} <ArrowRight className="w-4 h-4" />
                    </PrimaryButton>
                  </form>
                )}

                {forgotPasswordHook.forgotPasswordStep === 'otp' && (
                  <ForgotPasswordOtpVerificationCard
                    t={t}
                    forgotPasswordHook={forgotPasswordHook}
                    onBackToEmailStep={() => {
                      forgotPasswordHook.setForgotPasswordStep('email');
                      forgotPasswordHook.setError('');
                      forgotPasswordHook.setSuccessMessage('');
                    }}
                  />
                )}

                {forgotPasswordHook.forgotPasswordStep === 'newPassword' && (
                  <form className="space-y-4" onSubmit={forgotPasswordHook.handleResetPassword}>
                    <div>
                      <QMPasswordInput
                        id="new-password"
                        label={t('auth.newPassword', 'New Password')}
                        value={forgotPasswordHook.forgotPasswordData.newPassword}
                        onChange={forgotPasswordHook.handleForgotPasswordChange('newPassword')}
                        showPassword={forgotPasswordHook.showPassword}
                        onTogglePassword={() => forgotPasswordHook.setShowPassword(!forgotPasswordHook.showPassword)}
                        error={forgotPasswordHook.fieldErrors?.newPassword}
                        autoComplete="new-password"
                      />
                      <StrengthMeter value={forgotPasswordHook.forgotPasswordData.newPassword} t={t} />
                      {forgotPasswordHook.fieldErrors?.newPassword && (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{forgotPasswordHook.fieldErrors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <QMPasswordInput
                        id="confirm-new-password"
                        label={t('auth.confirmNewPassword', 'Confirm New Password')}
                        value={forgotPasswordHook.forgotPasswordData.confirmNewPassword}
                        onChange={forgotPasswordHook.handleForgotPasswordChange('confirmNewPassword')}
                        showPassword={forgotPasswordHook.showConfirmPassword}
                        onTogglePassword={() => forgotPasswordHook.setShowConfirmPassword(!forgotPasswordHook.showConfirmPassword)}
                        error={forgotPasswordHook.fieldErrors?.confirmNewPassword}
                        autoComplete="new-password"
                      />
                      {forgotPasswordHook.fieldErrors?.confirmNewPassword && (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{forgotPasswordHook.fieldErrors.confirmNewPassword}</p>
                      )}
                    </div>

                    <PrimaryButton type="submit" loading={forgotPasswordHook.isLoading}>
                      {t('auth.resetPassword', 'Reset Password')}
                    </PrimaryButton>
                  </form>
                )}

                <div className="flex justify-center items-center gap-2 mt-6">
                  <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'email' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`} />
                  <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'otp' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`} />
                  <div className={`w-3 h-3 rounded-full transition-colors ${forgotPasswordHook.forgotPasswordStep === 'newPassword' ? 'bg-[#0455BF] dark:bg-blue-500' : 'bg-gray-300 dark:bg-slate-700'}`} />
                </div>
              </div>
            )}

            {/* ─── VIEW: REGISTER ─── */}
            {view === 'register' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                {registerHook.registerStep === 'form' && (
                  <>
                    <button
                      onClick={() => {
                        setView('login');
                        registerHook.resetRegisterState();
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-[#313131] dark:text-slate-300 mb-5 hover:text-[#0455BF] dark:hover:text-blue-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> {t('auth.backToLogin')}
                    </button>

                    <h1 className="text-[34px] font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-3">
                      {t('auth.signUpTitle')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
                      {t('auth.signUpSubtitle')}
                    </p>
                  </>
                )}

                {registerHook.registerStep === 'form' && registerHook.error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {registerHook.error}
                  </div>
                )}

                {registerHook.registerStep === 'form' && registerHook.successMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
                    {registerHook.successMessage}
                  </div>
                )}

                {registerHook.registerStep === 'form' && (
                  <form className="space-y-3" onSubmit={registerHook.handleRegisterSubmit}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <QMInput
                          id="fullname"
                          icon={User}
                          label={t('auth.fullname', 'Full Name')}
                          value={registerHook.formData.fullname}
                          onChange={registerHook.handleChange('fullname')}
                          error={registerHook.fieldErrors?.fullname}
                          autoComplete="name"
                          compact
                        />
                        {registerHook.fieldErrors?.fullname && (
                          <p className="text-red-500 text-xs mt-1.5 ml-1">{registerHook.fieldErrors.fullname}</p>
                        )}
                      </div>

                      <div>
                        <QMInput
                          id="register-username"
                          icon={User}
                          label={t('auth.username', 'Username')}
                          value={registerHook.formData.username}
                          onChange={registerHook.handleChange('username')}
                          onBlur={registerHook.handleAvailabilityBlur('username')}
                          error={registerHook.fieldErrors?.username}
                          success={registerHook.availabilityStatus?.username?.available === true}
                          autoComplete="username"
                          compact
                        />
                        {registerHook.fieldErrors?.username ? (
                          <p className="text-red-500 text-xs mt-1.5 ml-1">{registerHook.fieldErrors.username}</p>
                        ) : registerHook.availabilityStatus?.username?.message ? (
                          <p className={`text-xs mt-1.5 ml-1 ${
                            registerHook.availabilityStatus.username.available === true
                              ? 'text-green-600 dark:text-green-400'
                              : registerHook.availabilityStatus.username.available === false
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-gray-500 dark:text-slate-400'
                          }`}>
                            {registerHook.availabilityStatus.username.message}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <QMInput
                        id="register-email"
                        type="email"
                        icon={Mail}
                        label={t('auth.email')}
                        value={registerHook.formData.email}
                        onChange={registerHook.handleChange('email')}
                        onBlur={registerHook.handleAvailabilityBlur('email')}
                        error={registerHook.fieldErrors?.email}
                        success={registerHook.availabilityStatus?.email?.available === true}
                        autoComplete="email"
                        compact
                      />
                      {registerHook.fieldErrors?.email ? (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{registerHook.fieldErrors.email}</p>
                      ) : registerHook.availabilityStatus?.email?.message ? (
                        <p className={`text-xs mt-1.5 ml-1 ${
                          registerHook.availabilityStatus.email.available === true
                            ? 'text-green-600 dark:text-green-400'
                            : registerHook.availabilityStatus.email.available === false
                              ? 'text-red-500 dark:text-red-400'
                              : 'text-gray-500 dark:text-slate-400'
                        }`}>
                          {registerHook.availabilityStatus.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <QMPasswordInput
                        id="register-password"
                        label={t('auth.password')}
                        value={registerHook.formData.password}
                        onChange={registerHook.handleChange('password')}
                        showPassword={registerHook.showPassword}
                        onTogglePassword={() => registerHook.setShowPassword(!registerHook.showPassword)}
                        error={registerHook.fieldErrors?.password}
                        autoComplete="new-password"
                        compact
                      />
                      <StrengthMeter value={registerHook.formData.password} t={t} />
                      {registerHook.fieldErrors?.password && (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{registerHook.fieldErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <QMPasswordInput
                        id="confirmPassword"
                        label={t('auth.confirmPassword')}
                        value={registerHook.formData.confirmPassword}
                        onChange={registerHook.handleChange('confirmPassword')}
                        showPassword={registerHook.showConfirmPassword}
                        onTogglePassword={() => registerHook.setShowConfirmPassword(!registerHook.showConfirmPassword)}
                        error={registerHook.fieldErrors?.confirmPassword}
                        autoComplete="new-password"
                        compact
                      />
                      {registerHook.fieldErrors?.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1.5 ml-1">{registerHook.fieldErrors.confirmPassword}</p>
                      )}
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreeToTerms"
                        checked={registerHook.formData.agreeToTerms}
                        onCheckedChange={(checked) => registerHook.setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                        required
                        className="border-gray-300 dark:border-slate-600 data-[state=checked]:bg-[#0455BF] dark:data-[state=checked]:bg-blue-600 mt-0.5"
                      />
                      <label htmlFor="agreeToTerms" className="text-sm text-[#313131] dark:text-slate-300 cursor-pointer leading-relaxed">
                        {t('auth.agreeToTerms')} <span className="text-[#FF8682]">{t('auth.terms')}</span> {t('auth.and')} <span className="text-[#FF8682]">{t('auth.privacyPolicies')}</span>
                      </label>
                    </div>
                    {registerHook.fieldErrors?.agreeToTerms && (
                      <p className="text-red-500 text-xs -mt-2 ml-1">{registerHook.fieldErrors.agreeToTerms}</p>
                    )}

                    <PrimaryButton
                      type="submit"
                      loading={registerHook.isLoading}
                      disabled={registerHook.availabilityStatus?.username?.checking || registerHook.availabilityStatus?.email?.checking}
                    >
                      {t('auth.createAccount')} <ArrowRight className="w-4 h-4" />
                    </PrimaryButton>

                    <p className="text-center text-sm text-[#313131] dark:text-slate-300 font-medium">
                      {t('auth.alreadyHaveAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setView('login');
                          registerHook.resetRegisterState();
                        }}
                        className="text-[#FF8682] font-bold hover:underline cursor-pointer"
                      >
                        {t('auth.login')}
                      </button>
                    </p>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-gray-200 dark:border-slate-800" />
                      <span className="flex-shrink mx-3 text-gray-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                        {t('auth.orRegisterWith')}
                      </span>
                      <div className="flex-grow border-t border-gray-200 dark:border-slate-800" />
                    </div>

                    {isGoogleAuthEnabled() ? (
                      <div className="flex justify-center w-full">
                        <GoogleLogin
                          onSuccess={loginHook.handleGoogleSubmit}
                          onError={() => loginHook.setError(t('auth.loginGoogleFailed', 'Google login failed. Please try again.'))}
                          useOneTap
                          theme="outline"
                          shape="pill"
                          width="384"
                          text="signin_with"
                          locale={currentLang}
                        />
                      </div>
                    ) : null}
                  </form>
                )}

                {registerHook.registerStep === 'otp' && (
                  <RegisterOtpVerificationCard
                    t={t}
                    registerHook={registerHook}
                    onBackToRegisterForm={() => {
                      registerHook.setRegisterStep('form');
                      registerHook.setOtp('');
                      registerHook.setError('');
                      registerHook.setSuccessMessage('');
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Diagonal hero panel ─────────────────────────────────── */}
      <Suspense fallback={null}>
        <DiagonalHeroPanel t={t} />
      </Suspense>
    </div>
  );
};

const LoginPage = () => (
  <AuthGoogleProvider>
    <LoginPageContent />
  </AuthGoogleProvider>
);

export default LoginPage;
