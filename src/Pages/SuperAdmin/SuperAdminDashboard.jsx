import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Wallet,
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

function getIsoWeekNumber(date) {
  const target = startOfDay(date);
  target.setDate(target.getDate() + 4 - (target.getDay() || 7));
  const yearStart = new Date(target.getFullYear(), 0, 1);
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function formatWeekInputValue(date) {
  const week = String(getIsoWeekNumber(date)).padStart(2, '0');
  return `${date.getFullYear()}-W${week}`;
}

function parseWeekInputValue(value) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(value || ''));
  if (!match) return startOfWeek(new Date());
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(year, 0, 4);
  const firstWeekStart = startOfWeek(januaryFourth);
  return addDays(firstWeekStart, (week - 1) * 7);
}

function formatMonthInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthInputValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!match) return startOfMonth(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function buildAvailableYearOptions(payments) {
  const currentYear = new Date().getFullYear();
  const minYearFromData = payments.reduce((minYear, payment) => {
    const rawTime = getPaymentTimestamp(payment);
    if (!rawTime) return minYear;
    const date = new Date(rawTime);
    if (Number.isNaN(date.getTime())) return minYear;
    return Math.min(minYear, date.getFullYear());
  }, currentYear);

  const options = [];
  for (let year = currentYear; year >= minYearFromData; year -= 1) {
    options.push({ value: String(year), label: String(year) });
  }
  return options;
}

function buildAvailableWeekOptions(year, locale) {
  const numericYear = Number(year);
  const today = startOfDay(new Date());
  const yearStart = new Date(numericYear, 0, 1);
  const yearEnd = new Date(numericYear, 11, 31);
  const maxDate = numericYear === today.getFullYear() ? today : yearEnd;
  const options = [];

  let cursor = startOfWeek(yearStart);

  while (cursor <= maxDate) {
    const actualStart = new Date(cursor);
    const actualEnd = addDays(actualStart, 6);
    const start = actualStart < yearStart ? yearStart : actualStart;
    const end = actualEnd > maxDate ? maxDate : actualEnd;

    if (start <= end) {
      options.push({
        value: formatWeekInputValue(actualStart),
        label: `${formatRangeLabel(start, end, locale)}`,
        start,
        end,
      });
    }

    cursor = addDays(cursor, 7);
  }

  return options.reverse();
}

function buildAvailableMonthOptions(year, locale) {
  const numericYear = Number(year);
  const today = new Date();
  const maxMonth = numericYear === today.getFullYear() ? today.getMonth() : 11;
  const options = [];

  for (let monthIndex = 0; monthIndex <= maxMonth; monthIndex += 1) {
    const start = new Date(numericYear, monthIndex, 1);
    const rawEnd = new Date(numericYear, monthIndex + 1, 0);
    const end = numericYear === today.getFullYear() && monthIndex === today.getMonth()
      ? startOfDay(today)
      : rawEnd;

    options.push({
      value: formatMonthInputValue(start),
      label: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(start),
      start,
      end,
    });
  }

  return options.reverse();
}

function formatRangeLabel(start, end, locale) {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(start)
    + ` - `
    + new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(end);
}

function buildRevenueSeries(payments, locale, rangeStart, rangeEnd, aggregation = 'day') {
  const periods = [];
  const end = startOfDay(rangeEnd);

  if (aggregation === 'month') {
    let cursor = startOfMonth(rangeStart);
    while (cursor <= end) {
      const periodStart = new Date(cursor);
      const rawEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const periodEnd = rawEnd > end ? end : rawEnd;
      periods.push({
        key: formatMonthInputValue(periodStart),
        start: periodStart,
        end: periodEnd,
        label: new Intl.DateTimeFormat(locale, { month: '2-digit' }).format(periodStart),
      });
      cursor = addMonths(cursor, 1);
    }
  } else {
    const formatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
    let cursor = startOfDay(rangeStart);

    while (cursor <= end) {
      periods.push({
        key: cursor.toISOString().slice(0, 10),
        start: new Date(cursor),
        end: new Date(cursor),
        label: formatter.format(cursor),
      });
      cursor = addDays(cursor, 1);
    }
  }

  return periods.map((period) => {
    const total = payments.reduce((sum, payment) => {
      const rawTime = getPaymentTimestamp(payment);
      if (!rawTime) return sum;
      const date = new Date(rawTime);
      if (Number.isNaN(date.getTime())) return sum;
      const paymentDay = startOfDay(date);
      return paymentDay >= period.start && paymentDay <= period.end
        ? sum + safeNumber(payment?.amount)
        : sum;
    }, 0);

    const count = payments.reduce((sum, payment) => {
      const rawTime = getPaymentTimestamp(payment);
      if (!rawTime) return sum;
      const date = new Date(rawTime);
      if (Number.isNaN(date.getTime())) return sum;
      const paymentDay = startOfDay(date);
      return paymentDay >= period.start && paymentDay <= period.end ? sum + 1 : sum;
    }, 0);

    return {
      key: period.key,
      label: period.label,
      total,
      count,
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
  const [revenueView, setRevenueView] = useState('year');
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [selectedWeek, setSelectedWeek] = useState(() => formatWeekInputValue(startOfWeek(new Date())));
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonthInputValue(startOfMonth(new Date())));

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
  const availableYearOptions = buildAvailableYearOptions(completedPayments);
  const effectiveSelectedYear = availableYearOptions.some((option) => option.value === selectedYear)
    ? selectedYear
    : (availableYearOptions[0]?.value ?? String(new Date().getFullYear()));
  const availableWeekOptions = buildAvailableWeekOptions(effectiveSelectedYear, locale);
  const availableMonthOptions = buildAvailableMonthOptions(effectiveSelectedYear, locale);
  const effectiveSelectedWeek = availableWeekOptions.some((option) => option.value === selectedWeek)
    ? selectedWeek
    : (availableWeekOptions[0]?.value ?? formatWeekInputValue(startOfWeek(new Date())));
  const effectiveSelectedMonth = availableMonthOptions.some((option) => option.value === selectedMonth)
    ? selectedMonth
    : (availableMonthOptions[0]?.value ?? formatMonthInputValue(startOfMonth(new Date())));
  const pendingPayments = payments.filter((payment) => getPaymentStatus(payment) === 'PENDING');
  const failedPayments = payments.filter((payment) => getPaymentStatus(payment) === 'FAILED');
  const cancelledPayments = payments.filter((payment) => getPaymentStatus(payment) === 'CANCELLED');
  const failedOrCancelledPayments = [...failedPayments, ...cancelledPayments];

  const completedRevenue = completedPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const pendingRevenue = pendingPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const failedRevenue = failedOrCancelledPayments.reduce((sum, payment) => sum + safeNumber(payment?.amount), 0);
  const averageOrderValue = completedPayments.length > 0 ? completedRevenue / completedPayments.length : 0;
  const paymentSuccessRate = totalPayments > 0 ? Math.round((completedPayments.length / totalPayments) * 100) : 0;
  const selectedWeekOption = availableWeekOptions.find((option) => option.value === effectiveSelectedWeek) ?? availableWeekOptions[0];
  const selectedMonthOption = availableMonthOptions.find((option) => option.value === effectiveSelectedMonth) ?? availableMonthOptions[0];
  const selectedYearStart = new Date(Number(effectiveSelectedYear), 0, 1);
  const selectedYearEnd = Number(effectiveSelectedYear) === new Date().getFullYear()
    ? startOfDay(new Date())
    : new Date(Number(effectiveSelectedYear), 11, 31);
  const activeRange = revenueView === 'month'
    ? selectedMonthOption
    : revenueView === 'week'
      ? selectedWeekOption
      : {
          value: effectiveSelectedYear,
          label: effectiveSelectedYear,
          start: selectedYearStart,
          end: selectedYearEnd,
        };
  const revenueSeries = buildRevenueSeries(
    completedPayments,
    locale,
    activeRange.start,
    activeRange.end,
    revenueView === 'year' ? 'month' : 'day',
  );
  const maxRevenuePoint = revenueSeries.reduce(
    (largest, point) => (point.total > largest.total ? point : largest),
    { key: '', label: '-', total: 0, count: 0 },
  );
  const maxRevenueValue = Math.max(...revenueSeries.map((point) => point.total), 0);
  const recentCompletedRevenue = revenueSeries.reduce((sum, point) => sum + point.total, 0);
  const revenueViewOptions = [
    { key: 'year', label: t('dashboard.viewByYear') },
    { key: 'week', label: t('dashboard.viewByWeek') },
    { key: 'month', label: t('dashboard.viewByMonth') },
  ];
  const revenueWindowTitle = revenueView === 'year'
    ? t('dashboard.revenueWindowYearTitle')
    : revenueView === 'month'
    ? t('dashboard.revenueWindowMonthTitle')
    : revenueView === 'week'
      ? t('dashboard.revenueWindowWeekTitle')
      : t('dashboard.revenueWindow');
  const revenueWindowDescription = revenueView === 'year'
    ? t('dashboard.revenueWindowYearDesc')
    : revenueView === 'month'
    ? t('dashboard.revenueWindowMonthDesc')
    : revenueView === 'week'
      ? t('dashboard.revenueWindowWeekDesc')
      : t('dashboard.revenueWindowDesc');
  const revenueWindowLabel = revenueView === 'year'
    ? t('dashboard.revenueSelectedYear')
    : revenueView === 'month'
    ? t('dashboard.revenueSelectedMonth')
    : revenueView === 'week'
      ? t('dashboard.revenueSelectedWeek')
      : t('dashboard.revenueSelectedRange');
  const peakPeriodLabel = revenueView === 'year'
    ? t('dashboard.peakMonth')
    : revenueView === 'month'
      ? t('dashboard.peakDay')
      : t('dashboard.peakDay');
  const revenuePerAccount = totalAccounts > 0 ? recentCompletedRevenue / totalAccounts : 0;

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

  return (
    <div className={`space-y-6 p-6 ${fontClass}`}>
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
          <SurfaceCard title={revenueWindowTitle} description={revenueWindowDescription} darkMode={isDarkMode}>
            <div className="mb-4 flex flex-wrap gap-2">
              {revenueViewOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRevenueView(option.key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer',
                    revenueView === option.key
                      ? isDarkMode
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-950 text-white'
                      : isDarkMode
                        ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className={cn('mb-1 block text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                {t('dashboard.selectYear')}
              </label>
              <select
                value={effectiveSelectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm outline-none transition-colors',
                  isDarkMode
                    ? 'border-slate-700 bg-slate-900 text-slate-100'
                    : 'border-slate-300 bg-white text-slate-900',
                )}
              >
                {availableYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {revenueView === 'week' ? (
              <div className="mb-4">
                <label className={cn('mb-1 block text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                  {t('dashboard.selectWeek')}
                </label>
                <select
                  value={effectiveSelectedWeek}
                  onChange={(event) => setSelectedWeek(event.target.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm outline-none transition-colors',
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-100'
                      : 'border-slate-300 bg-white text-slate-900',
                  )}
                >
                  {availableWeekOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {revenueView === 'month' ? (
              <div className="mb-4">
                <label className={cn('mb-1 block text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                  {t('dashboard.selectMonth')}
                </label>
                <select
                  value={effectiveSelectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm outline-none transition-colors',
                    isDarkMode
                      ? 'border-slate-700 bg-slate-900 text-slate-100'
                      : 'border-slate-300 bg-white text-slate-900',
                  )}
                >
                  {availableMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {revenueSeries.some((point) => point.total > 0) ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{revenueWindowLabel}</p>
                    <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-950')}>
                      {formatCurrency(recentCompletedRevenue, locale)}
                    </p>
                  </div>
                  <div className={cn('rounded-[20px] border px-4 py-4', isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{peakPeriodLabel}</p>
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

                <div className="mt-6 overflow-x-auto">
                  <div
                    className="grid gap-3 min-w-max"
                    style={{
                      gridTemplateColumns: `repeat(${revenueSeries.length}, minmax(${revenueView === 'year' ? 88 : 56}px, 1fr))`,
                    }}
                  >
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

        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
