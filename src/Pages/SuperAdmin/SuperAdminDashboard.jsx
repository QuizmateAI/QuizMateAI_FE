import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  RefreshCw,
  Wallet,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  getAdminPayments,
  getAllCreditPackages,
  getAllPlans,
  getSystemOverviewStats,
} from '@/api/ManagementSystemAPI';

function unwrapPayload(response) {
  return response?.data ?? response ?? null;
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  if (value == null) return '';
  const trimmed = String(value).trim();
  const lowered = trimmed.toLowerCase();
  if (!trimmed || lowered === 'null' || lowered === 'undefined') return '';
  return trimmed;
}

function formatEnumLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';
  return normalized.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function getPaymentStatus(payment) {
  return String(payment?.paymentStatus || payment?.status || '').toUpperCase();
}

function getPaymentTimestamp(payment) {
  return normalizeText(payment?.paidAt || payment?.createdAt || payment?.updatedAt || payment?.expiresAt);
}

function formatDateTime(value, locale) {
  const normalized = normalizeText(value);
  if (!normalized) return '-';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(value, locale, compact = false) {
  const amount = safeNumber(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

function buildRevenueSeries(payments, locale, days = 7) {
  const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  const totalsByDay = new Map();
  const countsByDay = new Map();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(start);
    day.setDate(start.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    totalsByDay.set(key, 0);
    countsByDay.set(key, 0);
  }

  payments.forEach((payment) => {
    const rawTime = getPaymentTimestamp(payment);
    if (!rawTime) return;
    const date = new Date(rawTime);
    if (Number.isNaN(date.getTime())) return;
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    if (!totalsByDay.has(key)) return;
    totalsByDay.set(key, safeNumber(totalsByDay.get(key)) + safeNumber(payment?.amount));
    countsByDay.set(key, safeNumber(countsByDay.get(key)) + 1);
  });

  return Array.from(totalsByDay.entries()).map(([key, total]) => {
    const date = new Date(key);
    return {
      key,
      label: formatter.format(date),
      total: safeNumber(total),
      count: safeNumber(countsByDay.get(key)),
    };
  });
}

function SurfaceCard({ title, description, action, className, darkMode = false, children }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.16)]',
        darkMode ? 'border-slate-800 bg-slate-950/85 shadow-[0_30px_80px_-48px_rgba(2,6,23,0.72)]' : 'border-slate-200/80 bg-white',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-slate-950')}>{title}</h2>
          {description ? (
            <p className={cn('mt-1.5 text-sm leading-6', darkMode ? 'text-slate-400' : 'text-slate-600')}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, helper, icon: Icon, accentClass, darkMode = false }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.16)]',
        darkMode ? 'border-slate-800 bg-slate-950/85' : 'border-slate-200/80 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-sm font-medium', darkMode ? 'text-slate-400' : 'text-slate-600')}>{label}</p>
          <p className={cn('mt-3 text-3xl font-semibold tracking-tight', darkMode ? 'text-white' : 'text-slate-950')}>
            {value}
          </p>
          {helper ? <p className={cn('mt-2 text-xs', darkMode ? 'text-slate-500' : 'text-slate-500')}>{helper}</p> : null}
        </div>
        <div className={cn('rounded-2xl p-3', accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, value, icon: Icon, accentClass, onClick, darkMode = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5',
        darkMode
          ? 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900'
          : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('rounded-2xl p-3', accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight
          className={cn(
            'h-4 w-4 transition-colors',
            darkMode ? 'text-slate-500 group-hover:text-slate-200' : 'text-slate-400 group-hover:text-slate-700',
          )}
        />
      </div>
      <p className={cn('mt-4 text-sm font-semibold', darkMode ? 'text-white' : 'text-slate-950')}>{title}</p>
      <p className={cn('mt-1 line-clamp-2 text-xs leading-5', darkMode ? 'text-slate-400' : 'text-slate-600')}>
        {description}
      </p>
      <div
        className={cn(
          'mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium',
          darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700',
        )}
      >
        {value}
      </div>
    </button>
  );
}

function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  const [dashboardData, setDashboardData] = useState({
    systemOverview: null,
    plans: [],
    creditPackages: [],
    payments: [],
    paymentTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadIssues, setLoadIssues] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError('');

    const [overviewResult, plansResult, creditPackagesResult, paymentsResult] = await Promise.allSettled([
      getSystemOverviewStats(),
      getAllPlans(),
      getAllCreditPackages(),
      getAdminPayments({ page: 0, size: 150 }),
    ]);

    const nextData = {
      systemOverview: null,
      plans: [],
      creditPackages: [],
      payments: [],
      paymentTotal: 0,
    };
    const nextIssues = [];

    if (overviewResult.status === 'fulfilled') {
      nextData.systemOverview = unwrapPayload(overviewResult.value) || {};
    } else {
      nextIssues.push('system-overview');
    }

    if (plansResult.status === 'fulfilled') {
      nextData.plans = Array.isArray(unwrapPayload(plansResult.value)) ? unwrapPayload(plansResult.value) : [];
    } else {
      nextIssues.push('plans');
    }

    if (creditPackagesResult.status === 'fulfilled') {
      nextData.creditPackages = Array.isArray(unwrapPayload(creditPackagesResult.value)) ? unwrapPayload(creditPackagesResult.value) : [];
    } else {
      nextIssues.push('credit-packages');
    }

    if (paymentsResult.status === 'fulfilled') {
      const payload = unwrapPayload(paymentsResult.value) || {};
      nextData.payments = Array.isArray(payload.content) ? payload.content : [];
      nextData.paymentTotal = safeNumber(payload.totalElements || nextData.payments.length);
    } else {
      nextIssues.push('payments');
    }

    if (!nextData.systemOverview && nextIssues.length === 4) {
      setError(t('dashboard.loadError'));
    }

    setDashboardData(nextData);
    setLoadIssues(nextIssues);
    setLastRefreshedAt(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchDashboard();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const systemOverview = dashboardData.systemOverview || {};
  const payments = dashboardData.payments;
  const totalPayments = safeNumber(dashboardData.paymentTotal || payments.length);
  const totalPlans = safeNumber(systemOverview.totalPlans || dashboardData.plans.length);
  const totalCreditPackages = safeNumber(systemOverview.totalCreditPackages || dashboardData.creditPackages.length);
  const totalAccounts = safeNumber(systemOverview.totalUsers);

  const completedPayments = payments.filter((payment) => getPaymentStatus(payment) === 'COMPLETED');
  const pendingPayments = payments.filter((payment) => getPaymentStatus(payment) === 'PENDING');
  const failedPayments = payments.filter((payment) => getPaymentStatus(payment) === 'FAILED');
  const cancelledPayments = payments.filter((payment) => getPaymentStatus(payment) === 'CANCELLED');
  const failedOrCancelledPayments = [...failedPayments, ...cancelledPayments];

  const completedRevenue = completedPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const failedRevenue = failedOrCancelledPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const averageOrderValue = completedPayments.length > 0 ? completedRevenue / completedPayments.length : 0;
  const paymentSuccessRate = totalPayments > 0 ? Math.round((completedPayments.length / totalPayments) * 100) : 0;
  const revenuePerAccount = totalAccounts > 0 ? completedRevenue / totalAccounts : 0;

  const revenueSeries = buildRevenueSeries(completedPayments, locale, 7);
  const maxRevenuePoint = revenueSeries.reduce(
    (largest, point) => (point.total > largest.total ? point : largest),
    { key: '', label: '-', total: 0, count: 0 },
  );
  const maxRevenueValue = Math.max(...revenueSeries.map((point) => point.total), 0);
  const recentCompletedRevenue = revenueSeries.reduce((sum, point) => sum + point.total, 0);

  const latestTransaction =
    [...payments].sort(
      (left, right) =>
        new Date(getPaymentTimestamp(right) || 0).getTime() - new Date(getPaymentTimestamp(left) || 0).getTime(),
    )[0] || null;
  const recentTransactions = [...payments]
    .sort(
      (left, right) =>
        new Date(getPaymentTimestamp(right) || 0).getTime() - new Date(getPaymentTimestamp(left) || 0).getTime(),
    )
    .slice(0, 6);

  const methodMix = Object.entries(
    payments.reduce((acc, payment) => {
      const key = normalizeText(payment?.paymentMethod).toUpperCase() || 'UNKNOWN';
      const current = acc[key] || { count: 0, amount: 0 };
      acc[key] = {
        count: current.count + 1,
        amount: current.amount + safeNumber(payment?.amount),
      };
      return acc;
    }, {}),
  )
    .map(([key, value]) => ({
      key,
      label: formatEnumLabel(key),
      count: safeNumber(value?.count),
      amount: safeNumber(value?.amount),
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  const targetMix = Object.entries(
    payments.reduce((acc, payment) => {
      const key = String(payment?.paymentTargetType || 'UNKNOWN').toUpperCase();
      const current = acc[key] || { count: 0, amount: 0 };
      acc[key] = {
        count: current.count + 1,
        amount: current.amount + safeNumber(payment?.amount),
      };
      return acc;
    }, {}),
  )
    .map(([key, value]) => ({
      key,
      label: t(`adminPayments.targetTypes.${key}`, { defaultValue: formatEnumLabel(key) }),
      count: safeNumber(value?.count),
      amount: safeNumber(value?.amount),
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  const statusCards = [
    {
      key: 'COMPLETED',
      label: t('adminPayments.status.COMPLETED'),
      count: completedPayments.length,
      amount: completedRevenue,
      accentClass: isDarkMode
        ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
    },
    {
      key: 'PENDING',
      label: t('adminPayments.status.PENDING'),
      count: pendingPayments.length,
      amount: pendingRevenue,
      accentClass: isDarkMode
        ? 'border-amber-500/30 bg-amber-500/12 text-amber-200'
        : 'border-amber-200 bg-amber-50 text-amber-700',
      icon: Clock3,
    },
    {
      key: 'FAILED',
      label: t('adminPayments.status.FAILED'),
      count: failedPayments.length,
      amount: failedPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0),
      accentClass: isDarkMode
        ? 'border-rose-500/30 bg-rose-500/12 text-rose-200'
        : 'border-rose-200 bg-rose-50 text-rose-700',
      icon: XCircle,
    },
    {
      key: 'CANCELLED',
      label: t('adminPayments.status.CANCELLED'),
      count: cancelledPayments.length,
      amount: cancelledPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0),
      accentClass: isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700',
      icon: XCircle,
    },
  ];

  const summaryCards = [
    {
      label: t('dashboard.recognizedRevenue'),
      value: isLoading ? '...' : formatCurrency(completedRevenue, locale),
      helper: t('dashboard.transactionsCount', { count: completedPayments.length.toLocaleString(locale) }),
      icon: Wallet,
      accentClass: isDarkMode ? 'bg-emerald-500/14 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: t('dashboard.pendingRevenue'),
      value: isLoading ? '...' : formatCurrency(pendingRevenue, locale),
      helper: t('dashboard.transactionsCount', { count: pendingPayments.length.toLocaleString(locale) }),
      icon: Clock3,
      accentClass: isDarkMode ? 'bg-amber-500/14 text-amber-300' : 'bg-amber-50 text-amber-700',
    },
    {
      label: t('dashboard.averageOrderValue'),
      value: isLoading ? '...' : formatCurrency(averageOrderValue, locale),
      helper: t('dashboard.successRateValue', { value: paymentSuccessRate }),
      icon: CreditCard,
      accentClass: isDarkMode ? 'bg-sky-500/14 text-sky-300' : 'bg-sky-50 text-sky-700',
    },
    {
      label: t('dashboard.failedRevenue'),
      value: isLoading ? '...' : formatCurrency(failedRevenue, locale),
      helper: t('dashboard.transactionsCount', { count: failedOrCancelledPayments.length.toLocaleString(locale) }),
      icon: XCircle,
      accentClass: isDarkMode ? 'bg-rose-500/14 text-rose-300' : 'bg-rose-50 text-rose-700',
    },
  ];

  const financeActionItems = [
    {
      title: t('sidebar.payments'),
      description: t('dashboard.actionDescriptions.payments'),
      value: totalPayments.toLocaleString(locale),
      icon: WalletCards,
      accentClass: isDarkMode ? 'bg-emerald-500/14 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
      path: '/super-admin/payments',
    },
    {
      title: t('sidebar.subscriptions'),
      description: t('dashboard.actionDescriptions.plans'),
      value: totalPlans.toLocaleString(locale),
      icon: Package,
      accentClass: isDarkMode ? 'bg-sky-500/14 text-sky-300' : 'bg-sky-50 text-sky-700',
      path: '/super-admin/plan',
    },
    {
      title: t('sidebar.creditPackages'),
      description: t('dashboard.actionDescriptions.creditPackages'),
      value: totalCreditPackages.toLocaleString(locale),
      icon: Wallet,
      accentClass: isDarkMode ? 'bg-amber-500/14 text-amber-300' : 'bg-amber-50 text-amber-700',
      path: '/super-admin/credit',
    },
  ];

  return (
    <div className={`space-y-6 p-6 ${fontClass}`}>
      <section
        className={cn(
          'relative overflow-hidden rounded-[32px] border p-6 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.22)]',
          isDarkMode
            ? 'border-slate-800 bg-slate-950'
            : 'border-slate-200/80 bg-[linear-gradient(135deg,#f2faf5_0%,#ffffff_46%,#fff8ef_100%)]',
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_26%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.18),transparent_24%)]',
          )}
        />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-emerald-200 bg-white/85 text-emerald-700',
              )}
            >
              {t('dashboard.financeBoard')}
            </Badge>
            <h1 className={cn('mt-4 text-3xl font-black tracking-tight md:text-4xl', isDarkMode ? 'text-white' : 'text-slate-950')}>
              {t('dashboard.revenueCommandDeck')}
            </h1>
            <p className={cn('mt-3 max-w-2xl text-sm leading-6 md:text-base', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
              {t('dashboard.revenueCommandDeckDesc')}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white/90 text-slate-700',
                )}
              >
                {t('dashboard.totalPayments')}: {isLoading ? '...' : totalPayments.toLocaleString(locale)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white/90 text-slate-700',
                )}
              >
                {t('dashboard.totalPlans')}: {isLoading ? '...' : totalPlans.toLocaleString(locale)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white/90 text-slate-700',
                )}
              >
                {t('dashboard.totalCreditPackages')}: {isLoading ? '...' : totalCreditPackages.toLocaleString(locale)}
              </Badge>
            </div>
          </div>

          <div
            className={cn(
              'rounded-[28px] border p-5',
              isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-emerald-100 bg-white/88',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t('dashboard.recognizedRevenue')}
                </p>
                <p className={cn('mt-3 text-3xl font-semibold tracking-tight', isDarkMode ? 'text-white' : 'text-slate-950')}>
                  {isLoading ? '...' : formatCurrency(completedRevenue, locale)}
                </p>
              </div>
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-emerald-500/14 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-xs uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                  {t('dashboard.pendingRevenue')}
                </p>
                <p className={cn('mt-2 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                  {isLoading ? '...' : formatCurrency(pendingRevenue, locale)}
                </p>
              </div>
              <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-xs uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                  {t('dashboard.latestPayment')}
                </p>
                <p className={cn('mt-2 text-sm font-semibold leading-6', isDarkMode ? 'text-white' : 'text-slate-950')}>
                  {isLoading ? '...' : formatDateTime(getPaymentTimestamp(latestTransaction), locale)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  isDarkMode ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}
              >
                {t('dashboard.successRateValue', { value: paymentSuccessRate })}
              </Badge>
              <div className="flex items-center gap-2">
                {lastRefreshedAt ? (
                  <span className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                    {t('dashboard.lastSync')}: {formatDateTime(lastRefreshedAt, locale)}
                  </span>
                ) : null}
                <Button
                  variant="outline"
                  onClick={fetchDashboard}
                  disabled={isLoading}
                  className={cn(
                    'rounded-2xl px-4',
                    isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', isLoading ? 'animate-spin' : '')} />
                  {t('common.refresh')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {loadIssues.length > 0 && !error ? (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            isDarkMode ? 'border-amber-900/60 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700',
          )}
        >
          {t('dashboard.partialData')}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            icon={card.icon}
            accentClass={card.accentClass}
            darkMode={isDarkMode}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <div className="space-y-6">
          <SurfaceCard title={t('dashboard.revenueWindow')} description={t('dashboard.revenueWindowDesc')} darkMode={isDarkMode}>
            {revenueSeries.some((point) => point.total > 0) ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{t('dashboard.revenueLast7Days')}</p>
                    <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                      {formatCurrency(recentCompletedRevenue, locale)}
                    </p>
                  </div>
                  <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{t('dashboard.peakDay')}</p>
                    <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                      {maxRevenuePoint.label}
                    </p>
                    <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                      {formatCurrency(maxRevenuePoint.total, locale)}
                    </p>
                  </div>
                  <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{t('dashboard.revenuePerUser')}</p>
                    <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                      {formatCurrency(revenuePerAccount, locale)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-7 gap-3">
                  {revenueSeries.map((point) => {
                    const height = point.total > 0 && maxRevenueValue > 0 ? Math.max(24, Math.round((point.total / maxRevenueValue) * 176)) : 12;
                    return (
                      <div key={point.key} className="flex min-w-0 flex-col items-center gap-3">
                        <div
                          className={cn(
                            'flex h-48 w-full items-end rounded-[22px] border p-3',
                            isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80',
                          )}
                        >
                          <div
                            className={cn(
                              'w-full rounded-[16px] bg-gradient-to-b',
                              isDarkMode ? 'from-emerald-400 via-emerald-500 to-emerald-700' : 'from-emerald-200 via-emerald-400 to-emerald-600',
                            )}
                            style={{ height: `${height}px` }}
                          />
                        </div>
                        <div className="text-center">
                          <p className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>{point.label}</p>
                          <p className={cn('mt-1 text-[11px]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {formatCurrency(point.total, locale, true)}
                          </p>
                          <p className={cn('text-[11px]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {point.count.toLocaleString(locale)} {t('dashboard.orders')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div
                className={cn(
                  'rounded-[22px] border border-dashed px-4 py-12 text-center text-sm',
                  isDarkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
                )}
              >
                {t('dashboard.emptyRevenueWindow')}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard
            title={t('dashboard.recentTransactions')}
            description={t('dashboard.recentTransactionsDesc')}
            action={
              <Button
                variant="outline"
                onClick={() => navigate('/super-admin/payments')}
                className={cn(
                  'rounded-2xl px-4',
                  isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {t('sidebar.payments')}
              </Button>
            }
            darkMode={isDarkMode}
          >
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((payment) => {
                  const status = getPaymentStatus(payment);
                  const statusMeta = statusCards.find((item) => item.key === status);
                  return (
                    <div
                      key={payment?.paymentId ?? payment?.orderId}
                      className={cn(
                        'rounded-[20px] border p-4',
                        isDarkMode ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80',
                      )}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                            {normalizeText(payment?.orderId) || `#${payment?.paymentId ?? '-'}`}
                          </p>
                          <div className={cn('mt-1 flex flex-wrap gap-2 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                            <span>{t(`adminPayments.targetTypes.${payment?.paymentTargetType}`, { defaultValue: formatEnumLabel(payment?.paymentTargetType) })}</span>
                            <span>{formatEnumLabel(payment?.paymentMethod) || '-'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                            {formatCurrency(payment?.amount, locale)}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', statusMeta?.accentClass)}
                          >
                            {statusMeta?.label || formatEnumLabel(status)}
                          </Badge>
                          <span className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {formatDateTime(getPaymentTimestamp(payment), locale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={cn(
                  'rounded-[22px] border border-dashed px-4 py-12 text-center text-sm',
                  isDarkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
                )}
              >
                {t('dashboard.noPayments')}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard title={t('dashboard.paymentHealth')} description={t('dashboard.paymentHealthDesc')} darkMode={isDarkMode}>
            <div className="space-y-3">
              {statusCards.map((item) => {
                const Icon = item.icon;
                const width = totalPayments > 0 ? Math.max(8, Math.round((item.count / totalPayments) * 100)) : 0;
                return (
                  <div key={item.key} className={cn('rounded-[20px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('rounded-2xl border px-2.5 py-2', item.accentClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>{item.label}</p>
                          <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {item.count.toLocaleString(locale)} {t('dashboard.orders')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                          {formatCurrency(item.amount, locale, true)}
                        </p>
                      </div>
                    </div>
                    <div className={cn('mt-3 h-2 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-800' : 'bg-slate-200')}>
                      <div className={cn('h-full rounded-full', item.key === 'COMPLETED' ? 'bg-emerald-500' : item.key === 'PENDING' ? 'bg-amber-400' : item.key === 'FAILED' ? 'bg-rose-500' : 'bg-slate-400')} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard title={t('dashboard.methodMix')} description={t('dashboard.methodMixDesc')} darkMode={isDarkMode}>
            {methodMix.length > 0 ? (
              <div className="space-y-3">
                {methodMix.map((item) => {
                  const width = totalPayments > 0 ? Math.max(8, Math.round((item.count / totalPayments) * 100)) : 0;
                  return (
                    <div key={item.key} className={cn('rounded-[20px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>{item.label}</p>
                          <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {item.count.toLocaleString(locale)} {t('dashboard.transactions')}
                          </p>
                        </div>
                        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                          {formatCurrency(item.amount, locale, true)}
                        </p>
                      </div>
                      <div className={cn('mt-3 h-2 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-800' : 'bg-slate-200')}>
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={cn(
                  'rounded-[22px] border border-dashed px-4 py-10 text-center text-sm',
                  isDarkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
                )}
              >
                {t('dashboard.noPayments')}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard title={t('dashboard.monetizationSurface')} description={t('dashboard.monetizationSurfaceDesc')} darkMode={isDarkMode}>
            <div className="grid gap-3">
              {[
                { label: t('dashboard.totalPlans'), value: totalPlans.toLocaleString(locale) },
                { label: t('dashboard.totalCreditPackages'), value: totalCreditPackages.toLocaleString(locale) },
                { label: t('dashboard.totalPayments'), value: totalPayments.toLocaleString(locale) },
                { label: t('dashboard.totalUsers'), value: totalAccounts.toLocaleString(locale) },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                  <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{item.label}</p>
                  <p className={cn('mt-2 text-xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                    {isLoading ? '...' : item.value}
                  </p>
                </div>
              ))}

              <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{t('dashboard.targetMix')}</p>
                {targetMix.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {targetMix.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                            {item.label}
                          </p>
                          <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                            {item.count.toLocaleString(locale)} {t('dashboard.transactions')}
                          </p>
                        </div>
                        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                          {formatCurrency(item.amount, locale, true)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={cn('mt-3 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{t('dashboard.noPayments')}</p>
                )}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard title={t('dashboard.financeActions')} description={t('dashboard.financeActionsDesc')} darkMode={isDarkMode}>
            <div className="grid gap-3">
              {financeActionItems.map((item) => (
                <ActionCard
                  key={item.path}
                  title={item.title}
                  description={item.description}
                  value={isLoading ? '...' : item.value}
                  icon={item.icon}
                  accentClass={item.accentClass}
                  onClick={() => navigate(item.path)}
                  darkMode={isDarkMode}
                />
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
