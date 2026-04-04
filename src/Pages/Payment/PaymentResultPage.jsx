import { useSearchParams } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ArrowLeft, Home, ReceiptText, Settings, Globe, Moon, Sun, CreditCard } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { createPlanSummaryFromPurchase, useCurrentSubscription } from '@/hooks/useCurrentSubscription';
import {
  clearPendingPlanPurchase,
  getRecentPlanPurchase,
  getPendingPlanPurchase,
  markPendingPlanPurchaseSucceeded,
} from '@/Utils/planPurchaseState';
import { setCachedSubscription } from '@/Utils/userCache';

export default function PaymentResultPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigateWithLoading();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  const status = searchParams.get('status');
  const resultCode = searchParams.get('resultCode') || '';
  const isSuccess = status === 'success' || resultCode === '0' || resultCode === '00';
  const { summary: currentPlanSummary } = useCurrentSubscription({ enabled: isSuccess });

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
    return date.toLocaleString(currentLang === 'vi' ? 'vi-VN' : 'en-US');
  }, [details.responseTime, currentLang]);

  const infoRows = useMemo(() => [
    { label: t('paymentResult.orderId'), value: details.orderId },
    { label: t('paymentResult.transId'), value: details.transId },
    { label: t('paymentResult.amount'), value: `${formattedAmount}₫` },
    { label: t('paymentResult.orderInfo'), value: details.orderInfo },
    { label: t('paymentResult.payType'), value: details.payType === 'qr' ? 'QR Code' : details.payType },
    { label: t('paymentResult.time'), value: formattedTime },
  ], [t, details, formattedAmount, formattedTime]);
  const fallbackPlanSummary = useMemo(() => {
    if (!isSuccess) return null;
    const purchase = getPendingPlanPurchase() ?? getRecentPlanPurchase();
    return createPlanSummaryFromPurchase(purchase);
  }, [isSuccess]);
  const activePlanSummary = fallbackPlanSummary ?? currentPlanSummary;
  const formattedPlanEndDate = useMemo(() => {
    if (!activePlanSummary?.endDate) return '';

    try {
      return new Intl.DateTimeFormat(currentLang === 'vi' ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(activePlanSummary.endDate));
    } catch {
      return activePlanSummary.endDate;
    }
  }, [activePlanSummary?.endDate, currentLang]);
  const planTypeLabel = activePlanSummary?.planType === 'GROUP'
    ? t('plan.types.group')
    : t('plan.types.individual');

  useEffect(() => {
    if (!isSuccess) {
      clearPendingPlanPurchase();
      return;
    }

    const successfulPurchase = markPendingPlanPurchaseSucceeded();
    if (!successfulPurchase) return;

    setCachedSubscription(null);
  }, [isSuccess]);

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50'
        : 'bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 text-slate-900'
    }`}>
      {/* Header - giống HomePage */}
      <header className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 sm:px-20 h-14 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
      }`}>
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Go to home"
          className="flex w-[130px] items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" width={130} height={40} />
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan')}
            className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{t('common.plan')}</span>
          </Button>
          <div ref={settingsRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
              aria-expanded={isSettingsOpen}
              aria-haspopup="menu"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{t('common.settings')}</span>
            </Button>
            {isSettingsOpen ? (
              <div role="menu" className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
              }`}>
                <button type="button" onClick={toggleLanguage} className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'}`}>
                  <span className={`flex items-center gap-2 ${fontClass}`}><Globe className="w-4 h-4" />{t('common.language')}</span>
                  <span className={`text-xs font-semibold ${fontClass}`}>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
                </button>
                <button type="button" onClick={toggleDarkMode} className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'}`}>
                  <span className={`flex items-center gap-2 ${fontClass}`}>{isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}{t('common.theme')}</span>
                  <span className={`text-xs font-semibold ${fontClass}`}>{isDarkMode ? t('common.dark') : t('common.light')}</span>
                </button>
              </div>
            ) : null}
          </div>
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </header>

      {/* Main content - centered card */}
      <div className="flex items-center justify-center min-h-screen pt-14 p-4 sm:p-6">
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
            {/* <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {details.message || (isSuccess ? t('paymentResult.successDesc') : t('paymentResult.failDesc'))}
            </p> */}
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

          {isSuccess && activePlanSummary ? (
            <div className={`rounded-2xl p-4 mb-6 ring-1 ring-inset ${
              isDarkMode ? 'bg-blue-500/10 ring-blue-400/20' : 'bg-blue-50 ring-blue-200'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      isDarkMode ? 'text-blue-200/80' : 'text-blue-700'
                    }`}>
                      {t('paymentResult.currentPlan', { defaultValue: 'Gói hiện tại' })}
                    </p>
                  </div>
                  <p className={`mt-2 text-lg font-bold truncate ${
                    isDarkMode ? 'text-slate-50' : 'text-slate-900'
                  }`}>
                    {activePlanSummary.planName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-blue-200 bg-white text-slate-700'}
                    >
                      {planTypeLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={isDarkMode ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}
                    >
                      {t('profile.subscription.activeStatus')}
                    </Badge>
                  </div>
                  <p className={`mt-3 text-sm ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {formattedPlanEndDate
                      ? t('paymentResult.planExpiresAt', {
                        date: formattedPlanEndDate,
                        defaultValue: `Hiệu lực đến ${formattedPlanEndDate}`,
                      })
                      : t('paymentResult.planReadyHint', {
                        defaultValue: 'Gói đã sẵn sàng để bạn tiếp tục học tập.',
                      })}
                  </p>
                </div>
                <CreditCard className={`w-5 h-5 flex-shrink-0 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-600'
                }`} />
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/plan')}
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
    </div>
  );
}
