import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Coins, DatabaseZap, MoreVertical, ReceiptText, RefreshCw, Search, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/Components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import AdminPagination from '@/Pages/Admin/components/AdminPagination';
import { getAiCostRequests, getAiCostSummary, getAllPlans, getUsdVndExchangeRate } from '@/api/ManagementSystemAPI';
import {
  AI_ACTION_OPTIONS,
  AI_COST_STATUS_OPTIONS,
  AI_MODEL_GROUP_OPTIONS,
  getAiActionLabel,
  getAiModelGroupLabel,
} from '@/lib/aiModelCatalog';

const PROVIDER_OPTIONS = ['', 'OPENAI', 'GEMINI'];

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${Number(value).toLocaleString('vi-VN')} VND`;
}

function formatUsd(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}`;
}

function formatDecimal(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatExchangeRate(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

/**
 * BE trả LocalDateTime dạng "yyyy-MM-ddTHH:mm:ss" (không offset) = giờ wall-clock Việt Nam.
 * `new Date(iso)` không có offset bị hiểu theo múi máy → parse thêm +07:00 khi thiếu zone.
 */
function parseApiDateTime(value) {
  if (value === null || value === undefined || value === '') return new Date(NaN);
  if (typeof value === 'number') return new Date(value);
  const s = String(value).trim();
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)
    && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
  ) {
    return new Date(`${s}+07:00`);
  }
  return new Date(s);
}

/** Hiển thị theo giờ Việt Nam (ICT). */
function formatDateTime(value, locale = 'vi-VN') {
  if (!value) return '-';
  const parsed = parseApiDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getEquivalentTokensFromAmount(amountVnd, effectiveTokenPriceVnd) {
  const amount = toFiniteNumber(amountVnd);
  const tokenPrice = toFiniteNumber(effectiveTokenPriceVnd);
  if (amount === null || tokenPrice === null || tokenPrice <= 0) return null;
  return amount / tokenPrice;
}

function getChargedTokenEquivalent(row) {
  return toFiniteNumber(row?.tokenBudgetEquivalent)
    ?? getEquivalentTokensFromAmount(row?.chargedVnd, row?.effectiveTokenPriceVnd);
}

function getProfitTokenEquivalent(row) {
  return toFiniteNumber(row?.tokenMarginEquivalent)
    ?? getEquivalentTokensFromAmount(row?.profitVnd, row?.effectiveTokenPriceVnd);
}

function getActualTokenEquivalent(row) {
  const chargedTokens = getChargedTokenEquivalent(row);
  const profitTokens = getProfitTokenEquivalent(row);

  if (chargedTokens !== null && profitTokens !== null) {
    return Math.max(chargedTokens - profitTokens, 0);
  }

  return getEquivalentTokensFromAmount(row?.providerCostVnd, row?.effectiveTokenPriceVnd);
}

function formatEquivalentToken(value, locale = 'vi-VN') {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return '-';
  const hasFraction = Math.abs(parsed % 1) > 0.000001;
  return parsed.toLocaleString(locale, {
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

function getStatusBadgeClass(status, isDarkMode) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SUCCESS') {
    return isDarkMode
      ? 'border-emerald-600 bg-emerald-950/70 text-emerald-200'
      : 'border-emerald-300 bg-emerald-100 text-emerald-900';
  }
  if (normalized === 'UNMATCHED') {
    return isDarkMode
      ? 'border-amber-600 bg-amber-950/50 text-amber-200'
      : 'border-amber-300 bg-amber-100 text-amber-900';
  }
  if (normalized === 'ERROR' || normalized === 'FAILED') {
    return isDarkMode
      ? 'border-red-600 bg-red-950/55 text-red-200'
      : 'border-red-300 bg-red-100 text-red-900';
  }
  return isDarkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-slate-100 text-slate-800';
}

function getOutputTokens(row) {
  return Number(row?.completionTokens || 0) + Number(row?.thoughtTokens || 0);
}

function getTokenTone(kind, isDarkMode) {
  if (kind === 'input') {
    return isDarkMode
      ? {
        box: 'border-slate-600 bg-slate-900/60',
        label: 'text-slate-200',
        value: 'text-white',
      }
      : {
        box: 'border-slate-300 bg-white',
        label: 'text-slate-700',
        value: 'text-slate-900',
      };
  }

  if (kind === 'output') {
    return isDarkMode
      ? {
        box: 'border-slate-600 bg-slate-900/60',
        label: 'text-slate-200',
        value: 'text-white',
      }
      : {
        box: 'border-slate-300 bg-white',
        label: 'text-slate-700',
        value: 'text-slate-900',
      };
  }

  return isDarkMode
    ? {
      box: 'border-slate-600 bg-slate-900/60',
      label: 'text-slate-200',
      value: 'text-white',
    }
    : {
      box: 'border-slate-300 bg-white',
      label: 'text-slate-700',
      value: 'text-slate-900',
    };
}

function TokenBreakdownCell({ row, isDarkMode, t }) {
  const outputTokens = getOutputTokens(row);
  const inputTone = getTokenTone('input', isDarkMode);
  const outputTone = getTokenTone('output', isDarkMode);
  const totalTone = getTokenTone('total', isDarkMode);
  const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.18em]';

  return (
    <div className="mx-auto min-w-[240px]">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border px-3 py-3 text-center ${inputTone.box}`}>
          <p className={`${labelCls} ${inputTone.label}`}>
            {t('aiCosts.tokens.input', { defaultValue: 'Input' })}
          </p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${inputTone.value}`}>
            {formatInteger(row?.promptTokens)}
          </p>
        </div>
        <div className={`rounded-2xl border px-3 py-3 text-center ${outputTone.box}`}>
          <p className={`${labelCls} ${outputTone.label}`}>
            {t('aiCosts.tokens.output', { defaultValue: 'Output' })}
          </p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${outputTone.value}`}>
            {formatInteger(outputTokens)}
          </p>
        </div>
      </div>
      <div className={`mt-2 rounded-2xl border px-3 py-3 text-center ${totalTone.box}`}>
        <p className={`${labelCls} ${totalTone.label}`}>
          {t('aiCosts.tokens.total', { defaultValue: 'Total' })}
        </p>
        <p className={`mt-1 text-lg font-bold tabular-nums tracking-tight ${totalTone.value}`}>
          {formatInteger(row?.totalTokens)}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone, isDarkMode, subtext }) {
  return (
    <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</p>
          {subtext ? <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{subtext}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AiCostManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const navigate = useNavigate();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const numberLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0, page: 0, size: 20 });
  const [loading, setLoading] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false);
  const [filters, setFilters] = useState({
    taskId: '',
    actorUserId: '',
    planCatalogId: '',
    provider: '',
    modelGroup: '',
    actionKey: '',
    status: '',
    from: '',
    to: '',
  });

  const resetFilters = {
    taskId: '',
    actorUserId: '',
    planCatalogId: '',
    provider: '',
    modelGroup: '',
    actionKey: '',
    status: '',
    from: '',
    to: '',
  };

  const fetchPlans = async () => {
    try {
      const response = await getAllPlans();
      const data = extractData(response);
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      setPlans([]);
      showError(getErrorMessage(t, error));
    }
  };

  const fetchExchangeRate = async ({ silent = false } = {}) => {
    if (!silent) setExchangeRateLoading(true);
    try {
      const response = await getUsdVndExchangeRate();
      setExchangeRate(extractData(response));
    } catch (error) {
      setExchangeRate(null);
      if (!silent) showError(getErrorMessage(t, error));
    } finally {
      if (!silent) setExchangeRateLoading(false);
    }
  };

  const buildQuery = (activeFilters = filters) => ({
    taskId: activeFilters.taskId || undefined,
    actorUserId: activeFilters.actorUserId || undefined,
    planCatalogId: activeFilters.planCatalogId || undefined,
    provider: activeFilters.provider || undefined,
    modelGroup: activeFilters.modelGroup || undefined,
    actionKey: activeFilters.actionKey || undefined,
    status: activeFilters.status || undefined,
    from: activeFilters.from ? new Date(activeFilters.from).toISOString() : undefined,
    to: activeFilters.to ? new Date(activeFilters.to).toISOString() : undefined,
  });

  const fetchCostData = async (nextPage = page, nextPageSize = pageSize, activeFilters = filters) => {
    setLoading(true);
    try {
      const query = buildQuery(activeFilters);
      const [summaryResponse, requestResponse] = await Promise.all([
        getAiCostSummary(query),
        getAiCostRequests({ ...query, page: nextPage, size: nextPageSize }),
      ]);
      setSummary(extractData(summaryResponse));
      const requestPage = extractData(requestResponse) || {};
      setRequests(Array.isArray(requestPage.content) ? requestPage.content : []);
      setPageInfo({
        totalPages: Number(requestPage.totalPages || 0),
        totalElements: Number(requestPage.totalElements || 0),
        page: Number(requestPage.page || nextPage),
        size: Number(requestPage.size || nextPageSize),
      });
    } catch (error) {
      setSummary(null);
      setRequests([]);
      setPageInfo({ totalPages: 0, totalElements: 0, page: 0, size: nextPageSize });
      showError(getErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchExchangeRate({ silent: true });
  }, []);

  useEffect(() => {
    fetchCostData(page, pageSize, filters);
  }, [page, pageSize]);

  const applyFilters = () => {
    setPage(0);
    fetchCostData(0, pageSize, filters);
  };

  const detailActualTokenEquivalent = detailRow ? getActualTokenEquivalent(detailRow) : null;
  const isDetailProfitPositive = Number(detailRow?.profitVnd || 0) >= 0;
  const tableStroke = isDarkMode ? 'border-slate-700' : 'border-slate-300';

  return (
    <div className={`space-y-6 p-6 ${fontClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200 bg-white'}`}>
            <ReceiptText className={`h-6 w-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} />
          </div>
          <div>
            <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('aiCosts.title')}</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiCosts.subtitle')}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => { fetchCostData(page, pageSize, filters); fetchExchangeRate(); }}
          disabled={loading || exchangeRateLoading}
          className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
          aria-label={t('aiCosts.refresh')}
          title={t('aiCosts.refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('aiCosts.metrics.requests')} value={formatInteger(summary?.requestCount)} icon={DatabaseZap} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" isDarkMode={isDarkMode} subtext={`${formatInteger(summary?.matchedRequestCount)} ${t('aiCosts.metrics.matched')}`} />
        <MetricCard label={t('aiCosts.metrics.revenue')} value={formatVnd(summary?.totalChargedVnd)} icon={Wallet} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" isDarkMode={isDarkMode} subtext={`${formatInteger(summary?.totalChargedCredit)} ${t('aiCosts.metrics.credits')}`} />
        <MetricCard label={t('aiCosts.metrics.providerCost')} value={formatVnd(summary?.totalProviderCostVnd)} icon={Coins} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" isDarkMode={isDarkMode} subtext={`${formatInteger(summary?.totalTokens)} ${t('aiCosts.metrics.tokens')}`} />
        <MetricCard label={t('aiCosts.metrics.profit')} value={formatVnd(summary?.totalProfitVnd)} icon={ArrowUpRight} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" isDarkMode={isDarkMode} subtext={`${formatInteger(summary?.unmatchedRequestCount)} ${t('aiCosts.metrics.unmatched')}`} />
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiCosts.exchangeRate.title')}</p>
          <p className={`mt-1 text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatExchangeRate(exchangeRate?.rate)}</p>
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {(exchangeRate?.source || t('aiCosts.exchangeRate.unknown'))}
            {exchangeRate?.fetchedAt ? ` • ${formatDateTime(exchangeRate.fetchedAt, i18n.language === 'vi' ? 'vi-VN' : 'en-US')}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fetchExchangeRate()}
          disabled={exchangeRateLoading}
          className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
          aria-label={t('aiCosts.exchangeRate.refresh')}
          title={t('aiCosts.exchangeRate.refresh')}
        >
          <RefreshCw className={`h-4 w-4 ${exchangeRateLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="grid gap-3 lg:grid-cols-4">
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.taskId')}</Label>
            <Input value={filters.taskId} onChange={(event) => setFilters((prev) => ({ ...prev, taskId: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`} placeholder="task-..." />
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.actorUserId')}</Label>
            <Input value={filters.actorUserId} onChange={(event) => setFilters((prev) => ({ ...prev, actorUserId: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`} placeholder="123" />
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.plan')}</Label>
            <select value={filters.planCatalogId} onChange={(event) => setFilters((prev) => ({ ...prev, planCatalogId: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiCosts.filters.allPlans')}</option>
              {plans.map((plan) => <option key={plan.planCatalogId} value={plan.planCatalogId}>{plan.displayName}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.provider')}</Label>
            <select value={filters.provider} onChange={(event) => setFilters((prev) => ({ ...prev, provider: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiCosts.filters.allProviders')}</option>
              {PROVIDER_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.group')}</Label>
            <select value={filters.modelGroup} onChange={(event) => setFilters((prev) => ({ ...prev, modelGroup: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiCosts.filters.allGroups')}</option>
              {AI_MODEL_GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.action')}</Label>
            <select value={filters.actionKey} onChange={(event) => setFilters((prev) => ({ ...prev, actionKey: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiCosts.filters.allActions')}</option>
              {AI_ACTION_OPTIONS.map((option) => <option key={option} value={option}>{getAiActionLabel(option, t)}</option>)}
            </select>
          </div>
          <div>
            <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.status')}</Label>
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className={`mt-1.5 h-10 w-full rounded-lg border px-3 text-sm ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
              <option value="">{t('aiCosts.filters.allStatuses')}</option>
              {AI_COST_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{t(`aiCosts.status.${option}`)}</option>)}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.from')}</Label>
              <Input type="datetime-local" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`} />
            </div>
            <div>
              <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{t('aiCosts.filters.to')}</Label>
              <Input type="datetime-local" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : ''}`} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setFilters(resetFilters);
            setPage(0);
            fetchCostData(0, pageSize, resetFilters);
          }}>{t('aiCosts.clear')}</Button>
          <Button onClick={applyFilters}>
            <Search className="mr-2 h-4 w-4" />
            {t('aiCosts.apply')}
          </Button>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border-2 ${isDarkMode ? 'border-slate-700 bg-slate-900 shadow-lg shadow-slate-950/20' : 'border-slate-300 bg-white shadow-sm'}`}>
        <Table className="min-w-[1600px]">
          <TableHeader>
            <TableRow className={`border-b-2 ${tableStroke} ${isDarkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
              <TableHead className={`w-[220px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.request')}</TableHead>
              <TableHead className={`w-[170px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.plan', { defaultValue: 'Gói' })}</TableHead>
              <TableHead className={`w-[190px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.model', { defaultValue: 'Model' })}</TableHead>
              <TableHead className={`w-[250px] border-r text-center font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.tokens')}</TableHead>
              <TableHead className={`w-[190px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.charged')}</TableHead>
              <TableHead className={`w-[190px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.actual', { defaultValue: 'Chi phí thực tế' })}</TableHead>
              <TableHead className={`w-[190px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.profit', { defaultValue: 'Lợi nhuận' })}</TableHead>
              <TableHead className={`w-[120px] border-r font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} ${tableStroke}`}>{t('aiCosts.table.status')}</TableHead>
              <TableHead className={`w-[72px] text-right font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('aiCosts.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="py-12 text-center"><ListSpinner variant="table" /></TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={9} className={`py-16 text-center text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('aiCosts.empty')}</TableCell></TableRow>
            ) : (
              requests.map((row) => {
                const actualTokenEquivalent = getActualTokenEquivalent(row);
                const isProfitPositive = Number(row.profitVnd || 0) >= 0;

                return (
                  <TableRow key={row.aiUsageId} className={`border-b ${tableStroke} ${isDarkMode ? 'bg-slate-900 hover:bg-slate-800/40' : 'bg-white hover:bg-slate-50/80'}`}>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{getAiActionLabel(row.actionKey, t)}</p>
                      <p className={`mt-1 font-mono text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{row.taskId || '-'}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{formatDateTime(row.createdAt, i18n.language === 'vi' ? 'vi-VN' : 'en-US')}</p>
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{row.planDisplayName || '-'}</p>
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{row.provider || '-'}</p>
                      <p className={`mt-1 font-mono text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{row.modelCode || '-'}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{getAiModelGroupLabel(row.modelGroup, t)}</p>
                    </TableCell>
                    <TableCell className={`py-4 text-center align-middle border-r ${tableStroke}`}>
                      <TokenBreakdownCell row={row} isDarkMode={isDarkMode} t={t} />
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatVnd(row.chargedVnd)}
                      </p>
                      <p className={`mt-1 text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {formatInteger(row.chargedCredit)} {t('aiCosts.units.credit')}
                      </p>
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {formatEquivalentToken(actualTokenEquivalent, numberLocale)} {t('aiCosts.units.tokenEquivalent', { defaultValue: 'token' })}
                      </p>
                      <p className={`mt-1 text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{formatVnd(row.providerCostVnd)}</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{formatUsd(row.providerCostUsd)}</p>
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <p
                        className={`text-sm font-semibold ${
                          isProfitPositive
                            ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700')
                            : (isDarkMode ? 'text-rose-400' : 'text-rose-700')
                        }`}
                      >
                        {formatVnd(row.profitVnd)}
                      </p>
                      <p
                        className={`mt-1 text-xs font-medium ${
                          isProfitPositive
                            ? (isDarkMode ? 'text-emerald-500/95' : 'text-emerald-800')
                            : (isDarkMode ? 'text-rose-400/95' : 'text-rose-800')
                        }`}
                      >
                        {isProfitPositive
                          ? t('aiCosts.table.profitGainHint', { defaultValue: 'QuizMate đang có lãi' })
                          : t('aiCosts.table.profitLossHint', { defaultValue: 'QuizMate đang bị lỗ' })}
                      </p>
                    </TableCell>
                    <TableCell className={`py-4 align-middle border-r ${tableStroke}`}>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(row.requestStatus, isDarkMode)}`}>{t(`aiCosts.status.${row.requestStatus}`, row.requestStatus)}</span>
                    </TableCell>
                    <TableCell className="py-4 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={isDarkMode ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className={`w-40 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : ''}`}
                        >
                          <DropdownMenuItem onSelect={() => setDetailRow(row)} className="cursor-pointer">
                            {t('aiCosts.actions.details')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className={isDarkMode ? 'bg-slate-700' : ''} />
                          <DropdownMenuItem
                            onSelect={() => navigate(`/super-admin/ai-audit?taskId=${encodeURIComponent(row.taskId || '')}`)}
                            disabled={!row.taskId}
                            className="cursor-pointer"
                          >
                            {t('aiCosts.actions.audit')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="px-2 pb-2">
          <AdminPagination currentPage={pageInfo.page} totalPages={pageInfo.totalPages} totalElements={pageInfo.totalElements} pageSize={pageInfo.size} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} isDarkMode={isDarkMode} />
        </div>
      </div>

      <Dialog open={Boolean(detailRow)} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className={`max-w-4xl ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle>{t('aiCosts.detail.title')}</DialogTitle>
            <DialogDescription>{detailRow?.taskId || '-'}</DialogDescription>
          </DialogHeader>
          {detailRow ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiCosts.detail.ledger')}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>{t('aiCosts.detail.action')}: <span className="font-semibold">{getAiActionLabel(detailRow.actionKey, t)}</span></p>
                  <p>{t('aiCosts.detail.plan')}: <span className="font-semibold">{detailRow.planDisplayName || '-'}</span></p>
                  <p>{t('aiCosts.detail.model')}: <span className="font-semibold">{detailRow.provider || '-'} / {detailRow.modelCode || '-'}</span></p>
                  <p>{t('aiCosts.detail.group')}: <span className="font-semibold">{getAiModelGroupLabel(detailRow.modelGroup, t)}</span></p>
                  <p>{t('aiCosts.detail.inputUnitUsd', 'Don gia input')}: <span className="font-semibold">{formatUsd(detailRow.inputPriceUsdPer1M)}</span> / {formatVnd(detailRow.inputPriceVndPer1M)}</p>
                  <p>{t('aiCosts.detail.outputUnitUsd', 'Don gia output')}: <span className="font-semibold">{formatUsd(detailRow.outputPriceUsdPer1M)}</span> / {formatVnd(detailRow.outputPriceVndPer1M)}</p>
                  <p>{t('aiCosts.detail.exchangeRate', 'Ty gia ap dung')}: <span className="font-semibold">{formatExchangeRate(detailRow.usdToVndRate)}</span>{detailRow.exchangeRateSource ? ` • ${detailRow.exchangeRateSource}` : ''}</p>
                  <p>{t('aiCosts.detail.exchangeRateAt', 'Thoi diem lay ty gia')}: <span className="font-semibold">{formatDateTime(detailRow.exchangeRateFetchedAt, i18n.language === 'vi' ? 'vi-VN' : 'en-US')}</span></p>
                  <p>{t('aiCosts.detail.status')}: <span className="font-semibold">{t(`aiCosts.status.${detailRow.requestStatus}`, detailRow.requestStatus)}</span></p>
                  <p>{t('aiCosts.detail.createdAt')}: <span className="font-semibold">{formatDateTime(detailRow.createdAt, i18n.language === 'vi' ? 'vi-VN' : 'en-US')}</span></p>
                </div>
              </div>
              <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiCosts.detail.formula')}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>{t('aiCosts.formula.chargedCredit', 'Charged credits')}: <span className="font-semibold">{formatInteger(detailRow.chargedCredit)} {t('aiCosts.units.credit')}</span></p>
                  <p>{t('aiCosts.formula.chargedVnd')}: <span className="font-semibold">{formatVnd(detailRow.chargedVnd)}</span></p>
                  <p>{t('aiCosts.formula.actualCostTokens', 'Actual-cost tokens')}: <span className="font-semibold">{formatEquivalentToken(detailActualTokenEquivalent, numberLocale)} {t('aiCosts.units.tokenEquivalent', { defaultValue: 'token' })}</span></p>
                  <p>{t('aiCosts.formula.providerCost')}: <span className="font-semibold">{formatVnd(detailRow.providerCostVnd)}</span></p>
                  <p>{t('aiCosts.formula.providerCostUsd', 'Provider cost (USD)')}: <span className="font-semibold">{formatUsd(detailRow.providerCostUsd)}</span></p>
                  <p>{t('aiCosts.formula.profit')}: <span className={`font-semibold ${isDetailProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`}>{formatVnd(detailRow.profitVnd)}</span></p>
                  <p>{t('aiCosts.formula.tokenPrice')}: <span className="font-semibold">{formatDecimal(detailRow.effectiveTokenPriceVnd)}</span></p>
                </div>
              </div>
              <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiCosts.detail.tokens')}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>{t('aiCosts.formula.prompt')}: <span className="font-semibold">{formatInteger(detailRow.promptTokens)}</span></p>
                  <p>{t('aiCosts.formula.thought')}: <span className="font-semibold">{formatInteger(detailRow.thoughtTokens)}</span></p>
                  <p>{t('aiCosts.formula.completion')}: <span className="font-semibold">{formatInteger(detailRow.completionTokens)}</span></p>
                  <p>{t('aiCosts.formula.total')}: <span className="font-semibold">{formatInteger(detailRow.totalTokens)}</span></p>
                  <p>{t('aiCosts.detail.inputCostUsd', 'Input cost')}: <span className="font-semibold">{formatUsd(detailRow.inputCostUsd)}</span> / {formatVnd(detailRow.inputCostVnd)}</p>
                  <p>{t('aiCosts.detail.outputCostUsd', 'Output cost')}: <span className="font-semibold">{formatUsd(detailRow.outputCostUsd)}</span> / {formatVnd(detailRow.outputCostVnd)}</p>
                </div>
              </div>
              <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`text-sm font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('aiCosts.detail.explain')}</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <p>{t('aiCosts.detail.explainCharged', {
                    credit: formatInteger(detailRow.chargedCredit),
                    vnd: formatVnd(detailRow.chargedVnd),
                  })}</p>
                  <p>{t('aiCosts.detail.explainProvider', {
                    prompt: formatInteger(detailRow.promptTokens),
                    output: formatInteger((detailRow.completionTokens || 0) + (detailRow.thoughtTokens || 0)),
                    actualTokens: formatEquivalentToken(detailActualTokenEquivalent, numberLocale),
                    cost: formatVnd(detailRow.providerCostVnd),
                  })}</p>
                  <p>{t('aiCosts.detail.explainMargin', {
                    profitVnd: formatVnd(detailRow.profitVnd),
                  })}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AiCostManagement;
