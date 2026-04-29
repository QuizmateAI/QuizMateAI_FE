import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Download,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminSelectButton,
} from './Components/SuperAdminSurface';
import SuperAdminRecentPayments from './Components/SuperAdminRecentPayments';
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

function formatNumber(value, locale, compact = false) {
  return new Intl.NumberFormat(locale, {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(safeNumber(value));
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isDateWithinWindow(date, start, end) {
  const point = startOfDay(date);
  return point >= start && point <= end;
}

function escapeCsvValue(value) {
  const raw = value == null ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function buildTrailingRevenueSeries(payments, locale, view) {
  const today = startOfDay(new Date());
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });
  const shortDayFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fullDayFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  if (view === 'month') {
    const rangeStart = addMonths(startOfMonth(today), -11);
    const points = [];
    let cursor = new Date(rangeStart);

    while (cursor <= today) {
      const periodStart = new Date(cursor);
      const rawEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const periodEnd = rawEnd > today ? today : rawEnd;

      points.push({
        key: `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`,
        label: monthFormatter.format(periodStart),
        total: payments.reduce((sum, payment) => {
          const rawTime = getPaymentTimestamp(payment);
          if (!rawTime) return sum;

          const paymentDate = new Date(rawTime);
          if (Number.isNaN(paymentDate.getTime())) return sum;

          return isDateWithinWindow(paymentDate, periodStart, periodEnd)
            ? sum + safeNumber(payment?.amount)
            : sum;
        }, 0),
        count: payments.reduce((sum, payment) => {
          const rawTime = getPaymentTimestamp(payment);
          if (!rawTime) return sum;

          const paymentDate = new Date(rawTime);
          if (Number.isNaN(paymentDate.getTime())) return sum;

          return isDateWithinWindow(paymentDate, periodStart, periodEnd) ? sum + 1 : sum;
        }, 0),
        tooltipLabel: `${monthFormatter.format(periodStart)} ${periodStart.getFullYear()}`,
      });

      cursor = addMonths(cursor, 1);
    }

    return {
      label: 'Last 12 months',
      start: rangeStart,
      end: today,
      points,
    };
  }

  if (view === 'week') {
    const rangeStart = addDays(startOfWeek(today), -77);
    const points = [];
    let cursor = new Date(rangeStart);

    while (cursor <= today) {
      const periodStart = new Date(cursor);
      const rawEnd = addDays(periodStart, 6);
      const periodEnd = rawEnd > today ? today : rawEnd;

      points.push({
        key: periodStart.toISOString().slice(0, 10),
        label: shortDayFormatter.format(periodStart),
        total: payments.reduce((sum, payment) => {
          const rawTime = getPaymentTimestamp(payment);
          if (!rawTime) return sum;

          const paymentDate = new Date(rawTime);
          if (Number.isNaN(paymentDate.getTime())) return sum;

          return isDateWithinWindow(paymentDate, periodStart, periodEnd)
            ? sum + safeNumber(payment?.amount)
            : sum;
        }, 0),
        count: payments.reduce((sum, payment) => {
          const rawTime = getPaymentTimestamp(payment);
          if (!rawTime) return sum;

          const paymentDate = new Date(rawTime);
          if (Number.isNaN(paymentDate.getTime())) return sum;

          return isDateWithinWindow(paymentDate, periodStart, periodEnd) ? sum + 1 : sum;
        }, 0),
        tooltipLabel: `${fullDayFormatter.format(periodStart)} - ${fullDayFormatter.format(periodEnd)}`,
      });

      cursor = addDays(cursor, 7);
    }

    return {
      label: 'Last 12 weeks',
      start: rangeStart,
      end: today,
      points,
    };
  }

  const rangeStart = addDays(today, -29);
  const points = [];
  let cursor = new Date(rangeStart);

  while (cursor <= today) {
    const periodStart = new Date(cursor);
    const label = shortDayFormatter.format(periodStart);

    points.push({
      key: periodStart.toISOString().slice(0, 10),
      label,
      total: payments.reduce((sum, payment) => {
        const rawTime = getPaymentTimestamp(payment);
        if (!rawTime) return sum;

        const paymentDate = new Date(rawTime);
        if (Number.isNaN(paymentDate.getTime())) return sum;

        return isDateWithinWindow(paymentDate, periodStart, periodStart)
          ? sum + safeNumber(payment?.amount)
          : sum;
      }, 0),
      count: payments.reduce((sum, payment) => {
        const rawTime = getPaymentTimestamp(payment);
        if (!rawTime) return sum;

        const paymentDate = new Date(rawTime);
        if (Number.isNaN(paymentDate.getTime())) return sum;

        return isDateWithinWindow(paymentDate, periodStart, periodStart) ? sum + 1 : sum;
      }, 0),
      tooltipLabel: label,
    });

    cursor = addDays(cursor, 1);
  }

  return {
    label: 'Last 30 days',
    start: rangeStart,
    end: today,
    points,
  };
}

function SurfaceCard({ title, description, action, className, contentClassName, children }) {
  return (
    <SuperAdminPanel
      title={title}
      description={description}
      action={action}
      className={className}
      contentClassName={contentClassName ?? 'px-6 py-5'}
    >
      {children}
    </SuperAdminPanel>
  );
}

function ChartTabs({ active, onChange, darkMode, t }) {
  const tabs = [
    { id: 'day', label: t('dashboard.chartDay', { defaultValue: 'Day' }) },
    { id: 'week', label: t('dashboard.chartWeek', { defaultValue: 'Week' }) },
    { id: 'month', label: t('dashboard.chartMonth', { defaultValue: 'Month' }) },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-2xl p-1',
        darkMode ? 'bg-slate-900' : 'bg-slate-100',
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-[14px] px-3 py-1.5 text-sm font-semibold transition-colors',
            active === tab.id
              ? darkMode
                ? 'bg-slate-950 text-white shadow-sm'
                : 'bg-white text-slate-900 shadow-sm'
              : darkMode
                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                : 'text-slate-500 hover:bg-white/80 hover:text-slate-900',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function PaymentStatusRow({ label, count, width, colorClass, darkMode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className={cn('h-2.5 w-2.5 rounded-full', colorClass)} />
          <span className={cn('text-sm font-medium', darkMode ? 'text-slate-200' : 'text-slate-700')}>
            {label}
          </span>
        </div>
        <span className={cn('text-sm font-semibold tabular-nums', darkMode ? 'text-white' : 'text-slate-900')}>
          {count}
        </span>
      </div>

      <div className={cn('h-2 overflow-hidden rounded-full', darkMode ? 'bg-slate-800' : 'bg-slate-100')}>
        <div
          className={cn('h-full rounded-full transition-[width]', colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, title, description, onClick, darkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center justify-between rounded-[20px] border px-4 py-4 text-left transition-colors',
        darkMode
          ? 'border-slate-800 bg-slate-950/70 hover:bg-slate-900'
          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/80',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl',
            darkMode ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-600 shadow-sm',
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div>
          <p className={cn('text-sm font-semibold', darkMode ? 'text-white' : 'text-slate-950')}>
            {title}
          </p>
          <p className={cn('mt-1 text-xs', darkMode ? 'text-slate-400' : 'text-slate-500')}>
            {description}
          </p>
        </div>
      </div>

      <ArrowRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5', darkMode ? 'text-slate-500' : 'text-slate-400')} />
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
  const [chartView, setChartView] = useState('day');

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
      setError(t('dashboard.loadError', { defaultValue: 'Unable to load dashboard data.' }));
    }

    setDashboardData(nextData);
    setLoadIssues(nextIssues);
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
  const totalAccounts = safeNumber(systemOverview.totalUsers || systemOverview.userCount);

  const completedPayments = payments.filter((payment) => getPaymentStatus(payment) === 'COMPLETED');
  const pendingPayments = payments.filter((payment) => getPaymentStatus(payment) === 'PENDING');
  const failedPayments = payments.filter((payment) => getPaymentStatus(payment) === 'FAILED');
  const cancelledPayments = payments.filter((payment) => getPaymentStatus(payment) === 'CANCELLED');

  const chartWindow = buildTrailingRevenueSeries(completedPayments, locale, chartView);
  const revenueSeries = chartWindow.points;
  const chartMaxRevenue = Math.max(...revenueSeries.map((point) => point.total), 0);
  const chartWindowRevenue = revenueSeries.reduce((sum, point) => sum + point.total, 0);
  const chartWindowOrders = revenueSeries.reduce((sum, point) => sum + point.count, 0);
  const peakRevenuePoint = revenueSeries.reduce(
    (largest, point) => (point.total > largest.total ? point : largest),
    { key: '', label: '-', total: 0, count: 0, tooltipLabel: '-' },
  );

  const selectedWindowPayments = payments.filter((payment) => {
    const rawTime = getPaymentTimestamp(payment);
    if (!rawTime) return false;

    const paymentDate = new Date(rawTime);
    if (Number.isNaN(paymentDate.getTime())) return false;

    return isDateWithinWindow(paymentDate, chartWindow.start, chartWindow.end);
  });

  const recentTransactions = [...payments]
    .sort(
      (left, right) =>
        new Date(getPaymentTimestamp(right) || 0).getTime() - new Date(getPaymentTimestamp(left) || 0).getTime(),
    )
    .slice(0, 4);

  const statusMeta = {
    COMPLETED: {
      label: t('adminPayments.status.COMPLETED', { defaultValue: 'Completed' }),
      dotClass: 'bg-emerald-500',
      textClass: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
      barClass: 'bg-emerald-500',
      count: selectedWindowPayments.filter((payment) => getPaymentStatus(payment) === 'COMPLETED').length,
    },
    PENDING: {
      label: t('adminPayments.status.PENDING', { defaultValue: 'Pending' }),
      dotClass: 'bg-amber-400',
      textClass: isDarkMode ? 'text-amber-300' : 'text-amber-700',
      barClass: 'bg-amber-400',
      count: selectedWindowPayments.filter((payment) => getPaymentStatus(payment) === 'PENDING').length,
    },
    FAILED: {
      label: t('adminPayments.status.FAILED', { defaultValue: 'Failed' }),
      dotClass: 'bg-rose-500',
      textClass: isDarkMode ? 'text-rose-300' : 'text-rose-700',
      barClass: 'bg-rose-500',
      count: selectedWindowPayments.filter((payment) => getPaymentStatus(payment) === 'FAILED').length,
    },
    CANCELLED: {
      label: t('adminPayments.status.CANCELLED', { defaultValue: 'Cancelled' }),
      dotClass: isDarkMode ? 'bg-slate-500' : 'bg-slate-400',
      textClass: isDarkMode ? 'text-slate-300' : 'text-slate-600',
      barClass: isDarkMode ? 'bg-slate-500' : 'bg-slate-400',
      count: selectedWindowPayments.filter((payment) => getPaymentStatus(payment) === 'CANCELLED').length,
    },
  };

  const paymentStatusRows = Object.entries(statusMeta).map(([key, value]) => ({
    key,
    ...value,
    width: selectedWindowPayments.length > 0 ? Math.round((value.count / selectedWindowPayments.length) * 100) : 0,
  }));

  const quickActions = [
    {
      title: t('dashboard.manageUsers', { defaultValue: 'Manage Users' }),
      description: t('dashboard.manageUsersDesc', {
        count: formatNumber(totalAccounts, locale),
        defaultValue: '{{count}} members on platform',
      }),
      icon: Users,
      onClick: () => navigate('/super-admin/users'),
    },
    {
      title: t('dashboard.rolesAndAccess', { defaultValue: 'Roles & Access' }),
      description: t('dashboard.rolesAndAccessDesc', {
        defaultValue: 'Review RBAC and admin access',
      }),
      icon: ShieldCheck,
      onClick: () => navigate('/super-admin/rbac'),
    },
    {
      title: t('dashboard.aiModelsAction', { defaultValue: 'AI Models' }),
      description: t('dashboard.aiModelsActionDesc', {
        defaultValue: 'Configure provider catalogs and model health',
      }),
      icon: Bot,
      onClick: () => navigate('/super-admin/ai-models'),
    },
  ];

  const handleExport = () => {
    const header = ['Order ID', 'Payment ID', 'User ID', 'Amount VND', 'Status', 'Target Type', 'Method', 'Timestamp'];
    const rows = selectedWindowPayments.map((payment) => ([
      normalizeText(payment?.orderId),
      payment?.paymentId ?? '',
      payment?.userId ?? '',
      safeNumber(payment?.amount),
      getPaymentStatus(payment),
      formatEnumLabel(payment?.paymentTargetType),
      formatEnumLabel(payment?.paymentMethod),
      getPaymentTimestamp(payment),
    ].map(escapeCsvValue).join(',')));

    const csvContent = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateLabel = new Date().toISOString().slice(0, 10);

    link.href = downloadUrl;
    link.setAttribute('download', `super-admin-dashboard-${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  };

  return (
    <SuperAdminPage className={cn(fontClass, 'gap-6 pb-10')}>
      <SuperAdminPageHeader
        title={t('dashboard.overviewTitle', { defaultValue: 'Overview' })}
        description={t('dashboard.description', {
          defaultValue: 'Platform health, usage and revenue at a glance.',
        })}
        actions={(
          <>
            <SuperAdminSelectButton
              label={t('dashboard.range', { defaultValue: 'Range' })}
              value={t(`dashboard.rangeLabel.${chartView}`, { defaultValue: chartWindow.label })}
            />
            <Button
              type="button"
              onClick={handleExport}
              className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
            >
              <Download className="h-4 w-4" />
              {t('common.export', { defaultValue: 'Export' })}
            </Button>
          </>
        )}
      />

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
          {t('dashboard.partialData', { defaultValue: 'Some dashboard sections are showing partial data.' })}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <SurfaceCard
          title={t('dashboard.revenueChartTitle', { defaultValue: 'Revenue' })}
          description={t('dashboard.revenueChartDesc', { defaultValue: 'Completed transactions, VND' })}
          action={<ChartTabs active={chartView} onChange={setChartView} darkMode={isDarkMode} t={t} />}
          contentClassName="px-5 py-5"
        >
          {revenueSeries.some((point) => point.total > 0) ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className={cn('rounded-[22px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/70')}>
                  <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                    {t('dashboard.revenueWindowMetric', { defaultValue: 'Window Revenue' })}
                  </p>
                  <p className={cn('mt-3 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                    {formatCurrency(chartWindowRevenue, locale, true)}
                  </p>
                </div>

                <div className={cn('rounded-[22px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/70')}>
                  <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                    {t('dashboard.ordersLabel', { defaultValue: 'Orders' })}
                  </p>
                  <p className={cn('mt-3 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                    {formatNumber(chartWindowOrders, locale)}
                  </p>
                </div>

                <div className={cn('rounded-[22px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/70')}>
                  <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                    {t('dashboard.peakPeriodLabel', { defaultValue: 'Peak Period' })}
                  </p>
                  <p className={cn('mt-3 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                    {peakRevenuePoint.tooltipLabel}
                  </p>
                  <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                    {formatCurrency(peakRevenuePoint.total, locale, true)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <div className={cn('min-w-[720px] rounded-[26px] border px-4 pb-4 pt-6', isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/55')}>
                  <div className="flex h-[280px] items-end gap-2">
                    {revenueSeries.map((point, index) => {
                      const height = point.total > 0 && chartMaxRevenue > 0
                        ? Math.max(18, Math.round((point.total / chartMaxRevenue) * 210))
                        : 10;
                      const shouldShowLabel = chartView === 'day'
                        ? index === 0 || index === 7 || index === 14 || index === 21 || index === revenueSeries.length - 1
                        : true;

                      return (
                        <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                          <div className="flex h-[236px] w-full items-end">
                            <div
                              className={cn(
                                'w-full rounded-t-[10px] transition-all',
                                isDarkMode ? 'bg-[#63A7FF]' : 'bg-[#4D83D6]',
                              )}
                              style={{ height: `${height}px` }}
                              title={`${point.tooltipLabel}: ${formatCurrency(point.total, locale)} · ${point.count} ${t('dashboard.ordersLabel', { defaultValue: 'orders' })}`}
                            />
                          </div>
                          <span className={cn('text-[10px] font-medium', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
                            {shouldShowLabel ? point.label : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              className={cn(
                'rounded-[24px] border border-dashed px-4 py-14 text-center text-sm',
                isDarkMode ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-500',
              )}
            >
              {t('dashboard.emptyRevenueWindow', { defaultValue: 'No completed payments were found for this range.' })}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title={t('dashboard.paymentStatusTitle', { defaultValue: 'Payment Status' })}
          description={t('dashboard.paymentStatusDesc', { defaultValue: 'Distribution for the selected range' })}
          contentClassName="px-5 py-5"
        >
          <div className="space-y-5">
            {paymentStatusRows.map((item) => (
              <PaymentStatusRow
                key={item.key}
                label={item.label}
                count={formatNumber(item.count, locale)}
                width={item.width}
                colorClass={item.barClass}
                darkMode={isDarkMode}
              />
            ))}
          </div>

          <div className={cn('mt-6 flex items-center justify-between border-t pt-4 text-sm', isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500')}>
            <span>
              {t('dashboard.totalSelectedRange', {
                label: t(`dashboard.rangeLabel.${chartView}`, { defaultValue: chartWindow.label }),
                defaultValue: 'Total · {{label}}',
              })}
            </span>
            <span className={cn('font-semibold tabular-nums', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {formatNumber(selectedWindowPayments.length, locale)}
            </span>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SurfaceCard
          title={t('dashboard.quickActionsTitle', { defaultValue: 'Quick actions' })}
          description={t('dashboard.quickActionsDesc', { defaultValue: 'Fast routes into the main admin workflows.' })}
          contentClassName="px-5 py-5"
        >
          <div className="space-y-3">
            {quickActions.map((action) => (
              <QuickActionButton
                key={action.title}
                icon={action.icon}
                title={action.title}
                description={action.description}
                onClick={action.onClick}
                darkMode={isDarkMode}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t('dashboard.recentPaymentsTitle', { defaultValue: 'Recent payments' })}
          action={(
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/super-admin/payments')}
              className={cn('rounded-2xl px-3', isDarkMode ? 'text-slate-200 hover:bg-slate-900' : 'text-[#0455BF] hover:bg-[#EEF4FF]')}
            >
              {t('common.viewAll', { defaultValue: 'View all' })}
            </Button>
          )}
          contentClassName="px-5 py-4"
        >
          <SuperAdminRecentPayments
            payments={recentTransactions}
            statusMeta={statusMeta}
            locale={locale}
            darkMode={isDarkMode}
            t={t}
          />
        </SurfaceCard>
      </div>
    </SuperAdminPage>
  );
}

export default SuperAdminDashboard;
