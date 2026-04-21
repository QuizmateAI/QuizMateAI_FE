import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

export default function PaymentSidebar({
  plan,
  creditPackage,
  selectedMethod = null,
  onPay,
  isPaying = false,
  paymentError = '',
  needGroupSelect = false,
}) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const isCreditPayment = Boolean(creditPackage);
  const item = creditPackage ?? plan;
  const isForever = Number(plan?.durationInDay) >= 999999;
  const durationDays = Number(plan?.durationInDay ?? 0);
  const baseCredit = Number(creditPackage?.baseCredit ?? 0);
  const bonusCredit = Number(creditPackage?.bonusCredit ?? 0);
  const totalCredits = baseCredit + bonusCredit;

  const formattedPrice = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(item?.price ?? 0),
    [item?.price]
  );

  const primaryLabel = isCreditPayment
    ? `${formatNumber(totalCredits, locale)} ${t('wallet.creditsUnit')}`
    : plan?.planName || '—';

  const secondaryValue = isCreditPayment
    ? `+${formatNumber(bonusCredit, locale)} ${t('wallet.creditsUnit')}`
    : isForever
      ? t('plan.durationForeverShort')
      : durationDays > 0
        ? `${formatNumber(durationDays, locale)} ${t('payment.days')}`
        : '—';

  return (
    <div className={`relative overflow-hidden rounded-[30px] border transition-colors ${
      isDarkMode
        ? 'border-slate-700/70 bg-slate-900/95 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.9)]'
        : 'border-slate-200/80 bg-white shadow-[0_28px_80px_-46px_rgba(37,99,235,0.22)]'
    }`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 ${
          isDarkMode
            ? 'bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-400/10'
            : 'bg-gradient-to-r from-sky-100 via-indigo-100/80 to-emerald-100'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-10 top-16 h-28 w-28 rounded-full blur-3xl ${
          isDarkMode ? 'bg-sky-400/10' : 'bg-sky-300/30'
        }`}
      />

      <div className="relative p-7 sm:p-8">
        <h2 className={`text-[1.9rem] font-extrabold leading-none tracking-[-0.03em] ${
          isDarkMode
            ? 'bg-gradient-to-r from-white via-sky-200 to-emerald-200 bg-clip-text text-transparent'
            : 'bg-gradient-to-r from-slate-900 via-sky-700 to-indigo-700 bg-clip-text text-transparent'
        }`}>
          {t('payment.orderSummary')}
        </h2>
        <div className={`mt-4 h-1.5 w-24 rounded-full ${
          isDarkMode
            ? 'bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-300'
            : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500'
        }`} />

        <div className={`mt-8 space-y-5 border-b border-dashed pb-7 ${
          isDarkMode ? 'border-slate-700/80' : 'border-slate-200'
        }`}>
          <div className={`flex items-start justify-between gap-4 rounded-[22px] px-4 py-4 ${
            isDarkMode ? 'bg-slate-800/55' : 'bg-slate-50/90'
          }`}>
            <span className={`text-[1.05rem] ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {primaryLabel}
            </span>
            <span className={`text-[1.15rem] font-bold tabular-nums ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {formattedPrice}₫
            </span>
          </div>
          <div className={`flex items-start justify-between gap-4 rounded-[22px] px-4 py-4 ${
            isCreditPayment
              ? isDarkMode
                ? 'bg-emerald-500/10'
                : 'bg-emerald-50'
              : isDarkMode
                ? 'bg-slate-800/55'
                : 'bg-slate-50/90'
          }`}>
            <span className={`text-[1.05rem] ${
              isCreditPayment
                ? isDarkMode
                  ? 'text-emerald-300'
                  : 'text-emerald-700'
                : isDarkMode
                  ? 'text-slate-300'
                  : 'text-slate-600'
            }`}>
              {isCreditPayment ? t('wallet.bonus') : t('payment.duration')}
            </span>
            <span className={`text-[1.05rem] font-bold ${
              isCreditPayment
                ? isDarkMode
                  ? 'text-emerald-200'
                  : 'text-emerald-800'
                : isDarkMode
                  ? 'text-slate-100'
                  : 'text-slate-900'
            }`}>
              {secondaryValue}
            </span>
          </div>
        </div>

        <div className="mb-9 flex items-end justify-between gap-4 py-7">
          <span className={`text-[1.05rem] font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {t('payment.total')}
          </span>
          <span className={`text-[2.35rem] font-black leading-none tracking-[-0.04em] ${
            isDarkMode
              ? 'bg-gradient-to-r from-white via-sky-200 to-emerald-200 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-slate-900 via-sky-700 to-indigo-700 bg-clip-text text-transparent'
          }`}>
            {formattedPrice}₫
          </span>
        </div>

        <button
          type="button"
          disabled={needGroupSelect || !selectedMethod || isPaying}
          onClick={onPay}
          className={`w-full rounded-[22px] py-4 text-lg font-bold transition-all ${
            needGroupSelect || !selectedMethod || isPaying
              ? isDarkMode
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
              : isDarkMode
                ? 'cursor-pointer bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-300 text-slate-950 hover:from-sky-300 hover:to-emerald-200'
                : 'cursor-pointer bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white shadow-[0_22px_40px_-28px_rgba(37,99,235,0.55)] hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700'
          }`}
        >
          {isPaying ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('payment.processing')}
            </span>
          ) : (
            t('payment.payNow')
          )}
        </button>

        {paymentError && (
          <p className={`mt-3 text-center text-xs ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
            {paymentError}
          </p>
        )}

        {needGroupSelect && (
          <div className={`mt-4 flex items-center gap-3 rounded-[24px] border px-4 py-4 ${
            isDarkMode
              ? 'border-amber-500/30 bg-amber-950/30 text-amber-200'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{t('payment.selectGroupFirst')}</p>
          </div>
        )}

        <div className={`mt-8 flex items-center justify-center gap-2 text-sm ${
          isDarkMode ? 'text-sky-200/80' : 'text-sky-700/70'
        }`}>
          <ShieldCheck className="h-4 w-4" />
          {t('payment.secureNote')}
        </div>
      </div>
    </div>
  );
}
