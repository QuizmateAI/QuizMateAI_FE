import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ShieldCheck, AlertTriangle, Loader2, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreditIconImage from '@/components/ui/CreditIconImage';

const PAYMENT_METHOD_LABELS = {
  momo: 'MoMo',
  vnpay: 'VNPay',
  stripe: 'Stripe',
};

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
  extraSlotCount = 0,
  slotUnitPrice = 0,
}) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const isCreditPayment = Boolean(creditPackage);
  const item = creditPackage ?? plan;
  const isForever = Number(plan?.durationInDay) >= 999999;
  const durationDays = Number(plan?.durationInDay ?? 0);
  const baseCredit = Number(creditPackage?.baseCredit ?? 0);
  const bonusCredit = Number(creditPackage?.bonusCredit ?? 0);
  const totalCredits = baseCredit + bonusCredit;

  const normalizedExtraSlots = Number(extraSlotCount) > 0 ? Number(extraSlotCount) : 0;
  const slotSubtotal = normalizedExtraSlots * Number(slotUnitPrice || 0);
  const basePrice = Number(item?.price ?? 0);
  const grandTotal = basePrice + slotSubtotal;

  const formattedBasePrice = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(basePrice),
    [basePrice]
  );
  const formattedSlotSubtotal = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(slotSubtotal),
    [slotSubtotal]
  );
  const formattedGrandTotal = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(grandTotal),
    [grandTotal]
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

  const methodLabel = PAYMENT_METHOD_LABELS[selectedMethod] || selectedMethod || '—';
  const orderTypeLabel = isCreditPayment
    ? t('payment.orderConfirm.creditType')
    : t('payment.orderConfirm.planType');

  const confirmPayment = async () => {
    const paid = await onPay?.();
    if (paid === false) {
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
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
        <h2 className={`text-[1.9rem] font-extrabold leading-none ${
          isDarkMode ? 'text-slate-50' : 'text-slate-950'
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
              {formattedBasePrice}₫
            </span>
          </div>

          {normalizedExtraSlots > 0 && (
            <div className={`flex items-start justify-between gap-4 rounded-[22px] px-4 py-4 ${
              isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
            }`}>
              <span className={`text-[1.05rem] ${isDarkMode ? 'text-indigo-200' : 'text-indigo-800'}`}>
                {t('payment.extraSlotLine', '{{count}} slot bổ sung', { count: normalizedExtraSlots })}
              </span>
              <span className={`text-[1.05rem] font-bold tabular-nums ${isDarkMode ? 'text-indigo-100' : 'text-indigo-900'}`}>
                {formattedSlotSubtotal}₫
              </span>
            </div>
          )}
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
          <span className={`text-[2.35rem] font-black leading-none ${
            isDarkMode ? 'text-slate-50' : 'text-slate-950'
          }`}>
            {formattedGrandTotal}₫
          </span>
        </div>

        <button
          type="button"
          disabled={needGroupSelect || !selectedMethod || isPaying}
          onClick={() => setIsConfirmOpen(true)}
          className={`w-full rounded-[22px] py-4 text-lg font-bold transition-all ${
            needGroupSelect || !selectedMethod || isPaying
              ? isDarkMode
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
              : isDarkMode
                ? 'cursor-pointer bg-sky-300 text-slate-950 hover:bg-sky-200'
                : 'cursor-pointer bg-blue-600 text-white shadow-[0_22px_40px_-28px_rgba(37,99,235,0.55)] hover:bg-blue-700'
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
    <Dialog
      open={isConfirmOpen}
      onOpenChange={(open) => {
        if (!isPaying) setIsConfirmOpen(open);
      }}
    >
      <DialogContent
        hideClose={isPaying}
        className={`${isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-50' : 'border-slate-200 bg-white text-slate-950'} max-w-[430px] overflow-hidden rounded-[28px] p-0 shadow-2xl`}
      >
        <DialogHeader className={`border-b px-6 py-5 text-left ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <DialogTitle className="text-xl font-black">
            {t('payment.orderConfirm.title')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {t('payment.orderConfirm.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6">
          <div className={`rounded-2xl border p-4 ${
            isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
          }`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className={`text-xs font-black uppercase tracking-[0.18em] ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                {t('payment.orderConfirm.orderLabel')}
              </p>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                isDarkMode ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-50 text-blue-700'
              }`}>
                {orderTypeLabel}
              </span>
            </div>

            <div className={`mb-4 flex items-center gap-3 rounded-xl border px-3 py-3 ${
              isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-blue-100 bg-blue-50/80'
            }`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDarkMode ? 'bg-slate-800 text-blue-200' : 'bg-white text-blue-700'
              }`}>
                {isCreditPayment ? (
                  <CreditIconImage
                    alt={t('common.creditIconAlt', { brandName: 'QuizMate AI' })}
                    className="h-8 w-8 rounded-xl"
                  />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {primaryLabel}
                </p>
                <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {secondaryValue}
                </p>
              </div>
              <p className={`text-sm font-bold tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {formattedBasePrice}₫
              </p>
            </div>

            <dl className={`flex flex-col gap-3 border-b pb-4 text-sm ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              {normalizedExtraSlots > 0 ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    {t('payment.extraSlotLine', '{{count}} slot bổ sung', { count: normalizedExtraSlots })}
                  </dt>
                  <dd className="font-semibold tabular-nums">{formattedSlotSubtotal}₫</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                  {t('payment.orderConfirm.method')}
                </dt>
                <dd className="font-semibold">{methodLabel}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-end justify-between gap-4">
              <span className="text-sm font-bold">{t('payment.orderConfirm.grandTotal')}</span>
              <span className="text-2xl font-black tabular-nums">{formattedGrandTotal}₫</span>
            </div>
          </div>

          <button
            type="button"
            onClick={confirmPayment}
            disabled={isPaying}
            className={`mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold transition-colors ${
              isPaying
                ? isDarkMode
                  ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
                : isDarkMode
                  ? 'cursor-pointer bg-sky-300 text-slate-950 hover:bg-sky-200'
                  : 'cursor-pointer bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'
            }`}
          >
            {isPaying ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('payment.processing')}
              </span>
            ) : (
              t('payment.orderConfirm.continue')
            )}
          </button>

          <div className={`mt-5 flex items-center justify-center gap-2 text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <ShieldCheck className="h-4 w-4" />
            {t('payment.secureNote')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
