import { useSearchParams } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  Globe,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';
import UserProfilePopover from '@/components/features/users/UserProfilePopover';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { createPlanSummaryFromPurchase, useCurrentSubscription } from '@/hooks/useCurrentSubscription';
import { getPaymentByOrderId, getPurchaseableCreditPackages } from '@/api/ManagementSystemAPI';
import {
  clearPendingPlanPurchase,
  getPendingPlanPurchase,
  getRecentPlanPurchase,
  markPendingPlanPurchaseSucceeded,
} from '@/utils/planPurchaseState';
import { setCachedSubscription } from '@/utils/userCache';
import {
  buildFeedbacksPath,
  buildGroupWorkspacePath,
  buildPaymentCreditsPath,
  buildPaymentsPath,
  buildPlansPath,
  buildWalletsPath,
  withQueryParams,
} from '@/lib/routePaths';
import { FailureScreen, ProcessingScreen, SuccessScreen } from './components/PaymentResultStates';
import { downloadPaymentInvoice } from './utils/paymentInvoice';

const PAYMENT_POLL_DELAY_MS = 1500;
const PAYMENT_POLL_MAX_ATTEMPTS = 6;
const PAYMENT_LOOKUP_RETRY_ATTEMPTS = 2;

function normalizeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPaymentDateTime(value, lang) {
  if (!value) return '';

  const rawTime = String(value);
  const date = /^\d+$/.test(rawTime) ? new Date(Number(rawTime)) : new Date(rawTime);
  if (Number.isNaN(date.getTime())) return rawTime;
  return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
}

function formatPaymentMethod(value) {
  const rawMethod = String(value || '').trim();
  if (!rawMethod) return '';

  const normalizedMethod = rawMethod.toUpperCase();
  if (rawMethod.toLowerCase() === 'qr') return 'VNPay QR';
  if (normalizedMethod === 'VNPAY') return 'VNPay';
  if (normalizedMethod === 'MOMO') return 'MoMo';
  if (normalizedMethod === 'STRIPE') return 'Stripe';
  return rawMethod;
}

function buildInvoiceNumber(paymentId, orderId) {
  if (paymentId != null && paymentId !== '') {
    return `QM-${String(paymentId).padStart(6, '0')}`;
  }

  const suffix = String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return suffix ? `QM-${suffix}` : '';
}

export default function PaymentResultPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigateWithLoading();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentLookupOrderId, setPaymentLookupOrderId] = useState('');
  const [isResolvingPayment, setIsResolvingPayment] = useState(false);
  const [resolvedCreditPackage, setResolvedCreditPackage] = useState(null);
  const settingsRef = useRef(null);
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const plansPath = buildPlansPath();

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

  const pendingPurchase = useMemo(
    () => getPendingPlanPurchase() ?? getRecentPlanPurchase(),
    [],
  );
  const pendingPurchaseType = String(pendingPurchase?.purchaseType || 'PLAN').toUpperCase();
  const isCreditPurchase = pendingPurchaseType === 'CREDIT';

  useEffect(() => {
    if (!isCreditPurchase || !pendingPurchase?.creditPackageId) {
      return undefined;
    }

    let cancelled = false;

    getPurchaseableCreditPackages()
      .then((response) => {
        if (cancelled) return;
        const packages = response?.data ?? response ?? [];
        const matchedPackage = Array.isArray(packages)
          ? packages.find((item) => String(item.creditPackageId) === String(pendingPurchase.creditPackageId))
          : null;
        setResolvedCreditPackage(matchedPackage || null);
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedCreditPackage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCreditPurchase, pendingPurchase?.creditPackageId]);

  const urlStatus = searchParams.get('status') || '';
  const urlResultCode = searchParams.get('resultCode') || '';
  const urlIndicatesSuccess = urlStatus === 'success' || urlResultCode === '0' || urlResultCode === '00';
  const effectiveOrderId = searchParams.get('orderId') || pendingPurchase?.orderId || '';
  const hasLookupForCurrentOrder = paymentLookupOrderId === effectiveOrderId;
  const activePaymentRecord = hasLookupForCurrentOrder ? paymentRecord : null;
  const isActivePaymentResolving = hasLookupForCurrentOrder && isResolvingPayment;

  useEffect(() => {
    if (!effectiveOrderId) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let pollAttempts = 0;
    let retryAttempts = 0;

    const scheduleNextPoll = () => {
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        void resolvePayment();
      }, PAYMENT_POLL_DELAY_MS);
    };

    const resolvePayment = async () => {
      if (cancelled) return;

      setPaymentLookupOrderId(effectiveOrderId);
      setIsResolvingPayment(true);

      try {
        const response = await getPaymentByOrderId(effectiveOrderId);
        if (cancelled) return;

        const nextRecord = response?.data ?? response ?? null;
        setPaymentRecord(nextRecord);

        const nextStatus = String(nextRecord?.paymentStatus || '').toUpperCase();
        if (nextStatus === 'PENDING' && pollAttempts < PAYMENT_POLL_MAX_ATTEMPTS) {
          pollAttempts += 1;
          scheduleNextPoll();
          return;
        }
      } catch {
        if (cancelled) return;

        if (retryAttempts < PAYMENT_LOOKUP_RETRY_ATTEMPTS) {
          retryAttempts += 1;
          scheduleNextPoll();
          return;
        }
      }

      if (!cancelled) {
        setIsResolvingPayment(false);
      }
    };

    void resolvePayment();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [effectiveOrderId]);

  const backendPaymentStatus = String(activePaymentRecord?.paymentStatus || '').toUpperCase();
  const resultVariant = useMemo(() => {
    if (backendPaymentStatus === 'COMPLETED') return 'success';
    if (backendPaymentStatus === 'FAILED' || backendPaymentStatus === 'CANCELLED') return 'failed';
    if (effectiveOrderId) {
      if (!hasLookupForCurrentOrder || isActivePaymentResolving || backendPaymentStatus === 'PENDING') {
        return 'processing';
      }
      return 'failed';
    }
    if (urlIndicatesSuccess) return 'success';
    return 'failed';
  }, [backendPaymentStatus, effectiveOrderId, hasLookupForCurrentOrder, isActivePaymentResolving, urlIndicatesSuccess]);

  const isSuccess = resultVariant === 'success';
  const isProcessing = resultVariant === 'processing';
  const shouldLoadCurrentSubscription = isSuccess && !isCreditPurchase && String(pendingPurchase?.planType || '').toUpperCase() !== 'GROUP';
  const { summary: currentPlanSummary } = useCurrentSubscription({ enabled: shouldLoadCurrentSubscription });

  const details = useMemo(() => {
    const queryAmount = normalizeAmount(searchParams.get('amount'));
    const recordAmount = normalizeAmount(activePaymentRecord?.amount);
    const gatewayAmount = normalizeAmount(activePaymentRecord?.gatewayAmount);

    return {
      orderId: searchParams.get('orderId') || activePaymentRecord?.orderId || effectiveOrderId || '',
      amount: recordAmount || gatewayAmount || queryAmount,
      orderInfo: searchParams.get('orderInfo') || '',
      transId: activePaymentRecord?.gatewayTransactionId || searchParams.get('transId') || searchParams.get('session_id') || '',
      message: searchParams.get('message') || '',
      payType: searchParams.get('payType') || '',
      responseTime: activePaymentRecord?.paidAt || activePaymentRecord?.gatewayVerifiedAt || searchParams.get('responseTime') || '',
      orderTime: activePaymentRecord?.createdAt || '',
      gatewayCurrency: activePaymentRecord?.gatewayCurrency || '',
    };
  }, [
    activePaymentRecord?.amount,
    activePaymentRecord?.createdAt,
    activePaymentRecord?.gatewayAmount,
    activePaymentRecord?.gatewayCurrency,
    activePaymentRecord?.gatewayTransactionId,
    activePaymentRecord?.gatewayVerifiedAt,
    activePaymentRecord?.orderId,
    activePaymentRecord?.paidAt,
    effectiveOrderId,
    searchParams,
  ]);

  const formattedAmount = useMemo(
    () => new Intl.NumberFormat('vi-VN').format(details.amount),
    [details.amount],
  );

  const formattedTime = useMemo(
    () => formatPaymentDateTime(details.responseTime, currentLang),
    [details.responseTime, currentLang],
  );
  const formattedOrderTime = useMemo(
    () => formatPaymentDateTime(details.orderTime, currentLang),
    [details.orderTime, currentLang],
  );

  const fallbackPlanSummary = useMemo(() => {
    if (!isSuccess || isCreditPurchase) return null;
    return createPlanSummaryFromPurchase(pendingPurchase);
  }, [isCreditPurchase, isSuccess, pendingPurchase]);

  const activePlanSummary = isCreditPurchase ? null : fallbackPlanSummary ?? currentPlanSummary;
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

  /** Do not show gateway `message` on success (often duplicate / unaccented). */
  const backendRejectedSuccessUrl = Boolean(effectiveOrderId && urlIndicatesSuccess && resultVariant === 'failed');
  const resultDescription = isSuccess
    ? ''
    : backendRejectedSuccessUrl
      ? t('paymentResult.backendRejected')
      : details.message || (
        isProcessing
          ? t('payment.processing')
          : t('paymentResult.failDesc')
      );

  const creditPackageLabel = useMemo(() => {
    const storedName = String(pendingPurchase?.planName || '').trim();
    if (storedName) return storedName;

    const packageName = String(resolvedCreditPackage?.displayName || '').trim();
    if (packageName) return packageName;

    const totalCredits = Number(resolvedCreditPackage?.baseCredit || 0) + Number(resolvedCreditPackage?.bonusCredit || 0);
    if (totalCredits > 0) {
      const formattedCredits = new Intl.NumberFormat(currentLang === 'vi' ? 'vi-VN' : 'en-US').format(totalCredits);
      return `${formattedCredits} ${t('wallet.creditsUnit', { defaultValue: currentLang === 'vi' ? 'credit' : 'credits' })}`;
    }

    return t('paymentResult.creditPurchaseLabel');
  }, [
    currentLang,
    pendingPurchase?.planName,
    resolvedCreditPackage?.baseCredit,
    resolvedCreditPackage?.bonusCredit,
    resolvedCreditPackage?.displayName,
    t,
  ]);

  const purchaseLabel = isCreditPurchase
    ? creditPackageLabel
    : activePlanSummary?.planName || pendingPurchase?.planName || t('paymentResult.planPurchaseLabel');

  const isGroupPlanPurchase =
    isSuccess
    && !isCreditPurchase
    && String(pendingPurchase?.planType || '').toUpperCase() === 'GROUP'
    && Boolean(pendingPurchase?.workspaceId);
  const isGroupCreditPurchase =
    isSuccess
    && isCreditPurchase
    && String(pendingPurchase?.planType || '').toUpperCase() === 'GROUP'
    && Boolean(pendingPurchase?.workspaceId);

  const resultLang = currentLang === 'en' ? 'en' : 'vi';
  const paymentMethodLabel = useMemo(() => {
    const rawMethod = activePaymentRecord?.paymentMethod
      || activePaymentRecord?.gateway
      || activePaymentRecord?.paymentGateway
      || searchParams.get('method')
      || details.payType
      || '';
    const normalizedMethod = formatPaymentMethod(rawMethod);
    if (normalizedMethod) return normalizedMethod;
    if (searchParams.get('session_id')) return 'Stripe';
    return 'VNPay';
  }, [
    activePaymentRecord?.gateway,
    activePaymentRecord?.paymentGateway,
    activePaymentRecord?.paymentMethod,
    details.payType,
    searchParams,
  ]);

  const resultTransaction = useMemo(() => ({
    orderId: details.orderId,
    orderTime: formattedOrderTime,
    transactionId: details.transId,
    amountLabel: `${formattedAmount}₫`,
    method: paymentMethodLabel,
    planId: pendingPurchase?.planId || '',
    planName: purchaseLabel,
    purchaseType: pendingPurchaseType,
    paymentTargetType: activePaymentRecord?.paymentTargetType || '',
    customer: activePaymentRecord?.chargedUserName || activePaymentRecord?.payerUserName || '',
    invoiceNumber: buildInvoiceNumber(activePaymentRecord?.paymentId, details.orderId),
    issuedAt: formattedTime,
    time: formattedTime,
    statusLabel: backendPaymentStatus === 'FAILED'
      ? t('paymentResult.failTitle')
      : undefined,
  }), [
    activePaymentRecord?.chargedUserName,
    activePaymentRecord?.payerUserName,
    activePaymentRecord?.paymentId,
    activePaymentRecord?.paymentTargetType,
    backendPaymentStatus,
    details.orderId,
    details.transId,
    formattedAmount,
    formattedOrderTime,
    formattedTime,
    paymentMethodLabel,
    pendingPurchase?.planId,
    pendingPurchaseType,
    purchaseLabel,
    t,
  ]);

  const purchaseSelectionPath = isCreditPurchase ? buildWalletsPath() : buildPlansPath();
  const retryPaymentPath = useMemo(() => {
    const workspaceId = pendingPurchase?.workspaceId || '';

    if (isCreditPurchase) {
      return withQueryParams(buildPaymentCreditsPath(), {
        creditPackageId: pendingPurchase?.creditPackageId,
        workspaceId,
      });
    }

    if (pendingPurchase?.planId) {
      return withQueryParams(buildPaymentsPath(), {
        planId: pendingPurchase.planId,
        workspaceId,
      });
    }

    return buildPlansPath();
  }, [
    isCreditPurchase,
    pendingPurchase?.creditPackageId,
    pendingPurchase?.planId,
    pendingPurchase?.workspaceId,
  ]);

  const handleResultAction = (action) => {
    if (action === 'downloadInvoice') {
      downloadPaymentInvoice({
        lang: resultLang,
        planName: purchaseLabel,
        transaction: resultTransaction,
      });
      return;
    }

    if (action === 'viewReceipt') {
      document.getElementById('payment-receipt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (action === 'startLearning') {
      if (isGroupPlanPurchase || isGroupCreditPurchase) {
        navigate(buildGroupWorkspacePath(pendingPurchase.workspaceId));
        return;
      }

      if (isCreditPurchase) {
        navigate(buildWalletsPath());
        return;
      }

      navigate('/home');
      return;
    }

    if (action === 'retry') {
      navigate(retryPaymentPath);
      return;
    }

    if (action === 'support') {
      navigate(buildFeedbacksPath());
      return;
    }

    navigate(purchaseSelectionPath);
  };

  useEffect(() => {
    if (resultVariant === 'success') {
      const successfulPurchase = markPendingPlanPurchaseSucceeded();
      if (successfulPurchase) {
        setCachedSubscription(null);
      }
      return;
    }

    if (backendPaymentStatus === 'FAILED' || backendPaymentStatus === 'CANCELLED') {
      clearPendingPlanPurchase();
    }
  }, [backendPaymentStatus, resultVariant]);

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50'
        : 'bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 text-slate-900'
    }`}>
      <header className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 sm:px-20 h-14 transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
      }`}>
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label={t('common.goHome')}
          className="flex w-[130px] items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <img src={isDarkMode ? LogoDark : LogoLight} alt={t('common.brandLogoAlt', { brandName: 'QuizMate AI' })} className="w-full h-full object-contain" width={130} height={40} />
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(plansPath)}
            className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-sm hidden max-w-[180px] truncate sm:inline">
              {activePlanSummary?.planName || t('common.plan')}
            </span>
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

      <main className="pt-14">
        {isProcessing ? (
          <ProcessingScreen
            lang={resultLang}
            planId={pendingPurchase?.planId || 'pro'}
            transaction={resultTransaction}
            isDarkMode={isDarkMode}
            onAction={handleResultAction}
          />
        ) : isSuccess ? (
          <SuccessScreen
            lang={resultLang}
            planId={pendingPurchase?.planId || 'pro'}
            transaction={resultTransaction}
            validUntil={formattedPlanEndDate}
            isDarkMode={isDarkMode}
            onAction={handleResultAction}
          />
        ) : (
          <FailureScreen
            lang={resultLang}
            transaction={resultTransaction}
            message={resultDescription}
            isDarkMode={isDarkMode}
            onAction={handleResultAction}
          />
        )}
      </main>
    </div>
  );
}
