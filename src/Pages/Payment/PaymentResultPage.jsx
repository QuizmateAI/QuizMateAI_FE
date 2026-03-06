import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { CheckCircle2, XCircle, ArrowLeft, Home, ReceiptText } from 'lucide-react';
import DarkLogo from '@/assets/DarkMode_Logo.webp';
import LightLogo from '@/assets/LightMode_Logo.webp';

export default function PaymentResultPage() {
  const { isDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const resultCode = Number(searchParams.get('resultCode'));
  const isSuccess = resultCode === 0;

  const details = useMemo(() => ({
    orderId: searchParams.get('orderId') || '',
    amount: Number(searchParams.get('amount') || 0),
    orderInfo: searchParams.get('orderInfo') || '',
    transId: searchParams.get('transId') || '',
    message: searchParams.get('message') || '',
    payType: searchParams.get('payType') || '',
    responseTime: searchParams.get('responseTime') || '',
  }), [searchParams]);

  const formattedAmount = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(details.amount),
    [details.amount]
  );

  const formattedTime = useMemo(() => {
    if (!details.responseTime) return '';
    const date = new Date(Number(details.responseTime));
    return date.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US');
  }, [details.responseTime, i18n.language]);

  const infoRows = useMemo(() => [
    { label: t('paymentResult.orderId'), value: details.orderId },
    { label: t('paymentResult.transId'), value: details.transId },
    { label: t('paymentResult.amount'), value: `${formattedAmount}₫` },
    { label: t('paymentResult.orderInfo'), value: details.orderInfo },
    { label: t('paymentResult.payType'), value: details.payType === 'qr' ? 'QR Code' : details.payType },
    { label: t('paymentResult.time'), value: formattedTime },
  ], [t, details, formattedAmount, formattedTime]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 ${fontClass} transition-colors ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50'
        : 'bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 text-slate-900'
    }`}>
      <div className={`w-full max-w-lg rounded-3xl overflow-hidden transition-colors ${
        isDarkMode
          ? 'bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl shadow-blue-900/20'
          : 'bg-white ring-1 ring-slate-200 shadow-2xl shadow-slate-300/40'
      }`}>
        {/* Status accent bar */}
        <div className={`h-1.5 ${isSuccess
          ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
          : 'bg-gradient-to-r from-red-400 to-rose-500'
        }`} />

        <div className="p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src={isDarkMode ? DarkLogo : LightLogo}
              alt="QuizMateAI"
              className="h-10 w-auto"
            />
          </div>

          {/* Status icon + message */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
              isSuccess
                ? isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-50'
                : isDarkMode ? 'bg-red-500/15' : 'bg-red-50'
            }`}>
              {isSuccess
                ? <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                : <XCircle className="w-10 h-10 text-red-500" />
              }
            </div>
            <h1 className={`text-2xl font-bold tracking-tight mb-1 ${
              isDarkMode ? 'text-slate-50' : 'text-slate-900'
            }`}>
              {isSuccess ? t('paymentResult.successTitle') : t('paymentResult.failTitle')}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {details.message || (isSuccess ? t('paymentResult.successDesc') : t('paymentResult.failDesc'))}
            </p>
          </div>

          {/* Transaction details */}
          <div className={`rounded-2xl p-4 mb-6 ${
            isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50 ring-1 ring-slate-100'
          }`}>
            <div className={`flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <ReceiptText className="w-3.5 h-3.5" />
              {t('paymentResult.details')}
            </div>
            <dl className="space-y-3">
              {infoRows.map(({ label, value }) => (
                value && (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <dt className={`shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {label}
                    </dt>
                    <dd className={`text-right font-medium break-all ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {value}
                    </dd>
                  </div>
                )
              ))}
            </dl>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile', { state: { tab: 'subscription' } })}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('paymentResult.backToPlans')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer shadow-lg shadow-blue-500/25"
            >
              <Home className="w-4 h-4" />
              {t('paymentResult.goHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
