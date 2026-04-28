import React, { useRef } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

function OtpInputs({ value, onChange, hasError = false }) {
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

function PrimaryButton({ children, type = 'button', disabled, loading }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="w-full h-12 bg-[#0455BF] hover:bg-[#03449a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-[16px] transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_10px_24px_-12px_rgba(4,85,191,.55)] hover:-translate-y-0.5 disabled:transform-none"
    >
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : children}
    </button>
  );
}

export function RegisterOtpVerificationCard({ t, registerHook, onBackToRegisterForm }) {
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
          <OtpInputs
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

export function ForgotPasswordOtpVerificationCard({ t, forgotPasswordHook, onBackToEmailStep }) {
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
          <OtpInputs
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
