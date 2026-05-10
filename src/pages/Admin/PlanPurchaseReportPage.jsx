import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { getCreditPurchaseBuyers, getCreditPurchaseSummary, getPlanPurchaseBuyers, getPlanPurchaseSummary } from '@/api/ManagementSystemAPI';
import AdminPagination from '@/pages/Admin/components/AdminPagination';
import DateRangeChips from '@/pages/SuperAdmin/Components/DateRangeChips';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminTabs,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';
import RevenueSparkline from '@/pages/SuperAdmin/Components/RevenueSparkline';

const QUERY_KEY = ['management', 'planPurchases'];

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

function formatCompactVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}tr`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs}`;
}

// Tiền gốc (base) là phí cố định không liên quan AI cost → coi như lời khóa sẵn.
// Pool credit (= revenue − base) là phần user dùng cho AI; biên thật chỉ tính ở đây.
// Bỏ qua field BE estimatedMarginVnd (= revenue − COGS) vì over-state khi gói có base+credit.
function getCreditRevenue(row) {
  const revenue = Number(row?.revenueVnd) || 0;
  const base = Number(row?.baseRevenueVnd) || 0;
  return revenue - base;
}

function getEffectiveMargin(row) {
  return getCreditRevenue(row) - (Number(row?.aiProviderCostVnd) || 0);
}

function ChartCard({ isDarkMode, title, subtitle, summary, children }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
          {subtitle ? (
            <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{subtitle}</p>
          ) : null}
        </div>
        {summary ? (
          <p className={`text-right text-xs tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{summary}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function formatScope(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

function formatPaidAt(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: String(value), time: '' };
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

const USER_AVATAR_PALETTES = [
  'from-ocean-400 to-ocean-700',
  'from-emerald-400 to-teal-600',
  'from-indigo-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
  'from-violet-400 to-fuchsia-600',
];

function getUserAvatar(email, username) {
  const source = String(email || username || '').trim();
  if (!source) return { initials: '?', accent: 'from-slate-400 to-slate-600' };
  const local = (source.split('@')[0] || source).toLowerCase();
  const parts = local.split(/[._\-+]/).filter(Boolean);
  let initials;
  if (parts.length >= 2 && parts[0] && parts[1]) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else {
    initials = local.slice(0, 2).toUpperCase() || '?';
  }
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  const accent = USER_AVATAR_PALETTES[Math.abs(hash) % USER_AVATAR_PALETTES.length];
  return { initials, accent };
}

function getPlanInitials(planCode, fallbackName) {
  const source = String(planCode || fallbackName || '').trim().toUpperCase();
  if (!source) return '—';
  const cleaned = source.replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 2) || source.slice(0, 2);
}

const PLAN_FAMILY_ACCENT = {
  TEAM: 'from-indigo-500 to-blue-700',
  TITANIUM: 'from-slate-700 to-slate-900',
  PRO: 'from-cyan-400 to-sky-600',
  PLUS: 'from-emerald-400 to-teal-600',
  STARTER: 'from-amber-400 to-orange-600',
};

function getPlanFamilyAccent(planCode) {
  const key = String(planCode || '').trim().toUpperCase();
  return PLAN_FAMILY_ACCENT[key] || 'from-ocean-500 to-ocean-700';
}

const SORT_OPTIONS = [
  { value: 'revenue_desc', labelKey: 'planPurchases.sort.revenueDesc', label: 'Doanh thu ↓' },
  { value: 'revenue_asc', labelKey: 'planPurchases.sort.revenueAsc', label: 'Doanh thu ↑' },
  { value: 'purchases_desc', labelKey: 'planPurchases.sort.purchasesDesc', label: 'Lượt mua ↓' },
  { value: 'purchases_asc', labelKey: 'planPurchases.sort.purchasesAsc', label: 'Lượt mua ↑' },
  { value: 'base_desc', labelKey: 'planPurchases.sort.baseDesc', label: 'Tiền gốc ↓' },
  { value: 'base_asc', labelKey: 'planPurchases.sort.baseAsc', label: 'Tiền gốc ↑' },
  { value: 'margin_desc', labelKey: 'planPurchases.sort.marginDesc', label: 'Biên ↓' },
  { value: 'margin_asc', labelKey: 'planPurchases.sort.marginAsc', label: 'Biên ↑' },
];

function comparePlans(a, b, sortKey) {
  const pick = (row) => {
    switch (sortKey) {
      case 'purchases_desc':
      case 'purchases_asc':
        return Number(row?.purchaseCount) || 0;
      case 'base_desc':
      case 'base_asc':
        return Number(row?.baseRevenueVnd) || 0;
      case 'margin_desc':
      case 'margin_asc':
        return getEffectiveMargin(row);
      case 'revenue_asc':
      case 'revenue_desc':
      default:
        return Number(row?.revenueVnd) || 0;
    }
  };
  const dir = sortKey?.endsWith('_asc') ? 1 : -1;
  const av = pick(a);
  const bv = pick(b);
  if (av === bv) return 0;
  return av < bv ? -1 * dir : 1 * dir;
}

const TABLE_PAGE_SIZE = 10;

function toApiIso(dateStr) {
  if (dateStr == null || String(dateStr).trim() === '') return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function PlanPurchaseReportPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [buyerPlanId, setBuyerPlanId] = useState(null);
  const [buyerPlanLabel, setBuyerPlanLabel] = useState('');
  const [buyerPage, setBuyerPage] = useState(0);
  const buyerPageSize = 15;
  // Credit buyer modal state — null = closed; { packageId, label } when open. packageId may be null for CUSTOM.
  const [creditBuyerCtx, setCreditBuyerCtx] = useState(null);
  const [creditBuyerPage, setCreditBuyerPage] = useState(0);
  const creditBuyerPageSize = 15;
  const [showCharts, setShowCharts] = useState(false);
  // 'current' (default) = chỉ version đang bán; 'all' = bao gồm cả historical;
  // chuỗi planCode = chỉ một family. Filter chỉ áp dụng cho biểu đồ, table luôn full.
  const [chartVersionFilter, setChartVersionFilter] = useState('current');
  // Tab: 'plans' (default) = báo cáo gói trả phí | 'credits' = báo cáo mua credit
  const [activeTab, setActiveTab] = useState('plans');
  // Toolbar trong card "Chi tiết theo phiên bản" — filter client-side trên dữ liệu summary đã load
  const [tableSearch, setTableSearch] = useState('');
  const [tableGroupFilter, setTableGroupFilter] = useState('all');
  const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'current' | 'old'
  const [tableSort, setTableSort] = useState('revenue_desc');
  const [tablePage, setTablePage] = useState(0);

  const queryParams = useMemo(() => ({
    from: toApiIso(from),
    to: toApiIso(to),
  }), [from, to]);

  const summaryQuery = useQuery({
    queryKey: [...QUERY_KEY, queryParams],
    queryFn: async () => extractData(await getPlanPurchaseSummary(queryParams)),
  });

  // Credit purchase summary — fetch only when tab "credits" active
  const creditQuery = useQuery({
    queryKey: [...QUERY_KEY, 'credits', queryParams],
    queryFn: async () => extractData(await getCreditPurchaseSummary(queryParams)),
    enabled: activeTab === 'credits',
  });

  const buyersQuery = useQuery({
    queryKey: [...QUERY_KEY, 'buyers', buyerPlanId, buyerPage, queryParams],
    queryFn: async () =>
      extractData(
        await getPlanPurchaseBuyers(buyerPlanId, {
          ...queryParams,
          page: buyerPage,
          size: buyerPageSize,
        }),
      ),
    enabled: buyerPlanId != null,
  });

  // Credit buyers query — chỉ fetch khi modal credit-buyers đang mở
  const creditBuyersQuery = useQuery({
    queryKey: [...QUERY_KEY, 'credit-buyers', creditBuyerCtx?.packageId ?? 'custom', creditBuyerPage, queryParams],
    queryFn: async () =>
      extractData(
        await getCreditPurchaseBuyers({
          packageId: creditBuyerCtx?.packageId ?? null, // null = CUSTOM credit
          from: queryParams.from,
          to: queryParams.to,
          page: creditBuyerPage,
          size: creditBuyerPageSize,
        }),
      ),
    enabled: creditBuyerCtx != null,
  });

  useEffect(() => {
    if (summaryQuery.error) showError(getErrorMessage(t, summaryQuery.error));
  }, [summaryQuery.error, t, showError]);

  useEffect(() => {
    if (buyersQuery.error) showError(getErrorMessage(t, buyersQuery.error));
  }, [buyersQuery.error, t, showError]);

  useEffect(() => {
    if (creditBuyersQuery.error) showError(getErrorMessage(t, creditBuyersQuery.error));
  }, [creditBuyersQuery.error, t, showError]);

  const openCreditBuyers = (row) => {
    const targetType = row?.paymentTargetType === 'WORKSPACE_CREDIT' ? 'Nhóm' : 'Cá nhân';
    const baseLabel = row?.creditPackageId == null ? 'Custom credit' : (row?.packageDisplayName || row?.packageCode);
    setCreditBuyerCtx({
      packageId: row?.creditPackageId ?? null,
      label: `${baseLabel} (${targetType})`,
    });
    setCreditBuyerPage(0);
  };
  const closeCreditBuyers = () => {
    setCreditBuyerCtx(null);
    setCreditBuyerPage(0);
  };

  const plans = useMemo(() => summaryQuery.data?.plans ?? [], [summaryQuery.data?.plans]);
  const loading = summaryQuery.isLoading;
  const fetching = summaryQuery.isFetching;

  // Danh sách các plan_code có nhiều hơn 1 version trong dataset — dùng để build dropdown.
  const planFamilies = useMemo(() => {
    const seen = new Map();
    plans.forEach((row) => {
      const code = row?.planCode;
      if (!code) return;
      if (!seen.has(code)) seen.set(code, 0);
      seen.set(code, seen.get(code) + 1);
    });
    return Array.from(seen.entries())
      .filter(([, count]) => count > 1)
      .map(([code]) => code)
      .sort();
  }, [plans]);

  const chartData = useMemo(() => {
    const filtered = plans.filter((row) => {
      if (chartVersionFilter === 'all') return true;
      if (chartVersionFilter === 'current') return row?.planIsCurrent !== false;
      return row?.planCode === chartVersionFilter;
    });
    return filtered
      .map((row) => {
        const credit = Number(row?.creditRevenueVnd) || 0;
        const base = Number(row?.baseRevenueVnd) || 0;
        const revenue = Number(row?.revenueVnd) || 0;
        const cogs = Number(row?.aiProviderCostVnd) || 0;
        const margin = getEffectiveMargin(row);
        // Tỷ lệ lời chia trên pool credit (không phải tổng doanh thu) vì base là lời cố định.
        const creditDenominator = getCreditRevenue(row);
        const marginPct = creditDenominator > 0 ? (margin / creditDenominator) * 100 : 0;
        const baseName = row?.planCode || row?.planDisplayName || `#${row?.planCatalogId}`;
        // Nếu filter 'current' thì không cần đuôi version (mỗi family chỉ 1 row).
        const showVersionSuffix = chartVersionFilter !== 'current'
          && Number.isFinite(Number(row?.planVersion));
        const name = showVersionSuffix
          ? `${baseName} v${row.planVersion}${row?.planIsCurrent === false ? ' (cũ)' : ''}`
          : baseName;
        return {
          name,
          scope: formatScope(row?.planScope),
          credit,
          base,
          revenue,
          cogs,
          margin,
          marginPct,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [plans, chartVersionFilter]);

  // Tổng hiển thị trong header card chart — phải khớp dữ liệu thực sự đang vẽ,
  // không dùng totals (tổng cả historical) khi filter loại bớt version.
  const chartTotals = useMemo(() => chartData.reduce(
    (acc, row) => ({
      credit: acc.credit + row.credit,
      base: acc.base + row.base,
      revenue: acc.revenue + row.revenue,
      cogs: acc.cogs + row.cogs,
      margin: acc.margin + row.margin,
    }),
    { credit: 0, base: 0, revenue: 0, cogs: 0, margin: 0 },
  ), [chartData]);

  // Danh sách distinct planCode để build dropdown "Nhóm gói" trên toolbar bảng.
  const planGroupOptions = useMemo(() => {
    const set = new Set();
    plans.forEach((row) => {
      const code = row?.planCode;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [plans]);

  // Plans sau khi áp dụng search/group/status — không bao gồm sort & pagination,
  // dùng cho row tổng cộng và đếm tổng.
  const filteredPlans = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return plans.filter((row) => {
      if (tableGroupFilter !== 'all' && row?.planCode !== tableGroupFilter) return false;
      if (tableStatusFilter === 'current' && row?.planIsCurrent === false) return false;
      if (tableStatusFilter === 'old' && row?.planIsCurrent !== false) return false;
      if (!term) return true;
      const haystack = [
        row?.planCode,
        row?.planDisplayName,
        row?.planScope,
        Number.isFinite(Number(row?.planVersion)) ? `v${row.planVersion}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [plans, tableSearch, tableGroupFilter, tableStatusFilter]);

  const sortedPlans = useMemo(() => {
    const next = filteredPlans.slice();
    next.sort((a, b) => comparePlans(a, b, tableSort));
    return next;
  }, [filteredPlans, tableSort]);

  // Reset trang về 0 khi filter/search/sort/dataset thay đổi để tránh page index out of range.
  useEffect(() => {
    setTablePage(0);
  }, [tableSearch, tableGroupFilter, tableStatusFilter, tableSort, plans.length]);

  const totalPlanRows = sortedPlans.length;
  const totalPlanPages = Math.max(1, Math.ceil(totalPlanRows / TABLE_PAGE_SIZE));
  const safePlanPage = Math.min(tablePage, totalPlanPages - 1);
  const pagedPlans = useMemo(
    () => sortedPlans.slice(safePlanPage * TABLE_PAGE_SIZE, safePlanPage * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE),
    [sortedPlans, safePlanPage],
  );

  const filteredTotals = useMemo(
    () => filteredPlans.reduce(
      (acc, row) => ({
        purchaseCount: acc.purchaseCount + (Number(row?.purchaseCount) || 0),
        distinctPayerCount: acc.distinctPayerCount + (Number(row?.distinctPayerCount) || 0),
        baseRevenueVnd: acc.baseRevenueVnd + (Number(row?.baseRevenueVnd) || 0),
        revenueVnd: acc.revenueVnd + (Number(row?.revenueVnd) || 0),
        aiProviderCostVnd: acc.aiProviderCostVnd + (Number(row?.aiProviderCostVnd) || 0),
      }),
      {
        purchaseCount: 0,
        distinctPayerCount: 0,
        baseRevenueVnd: 0,
        revenueVnd: 0,
        aiProviderCostVnd: 0,
      },
    ),
    [filteredPlans],
  );

  // Biên/credit tổng được derive từ filteredTotals (revenue − base − cogs) để khớp với cell formula.
  const filteredTotalsCredit = filteredTotals.revenueVnd - filteredTotals.baseRevenueVnd;
  const filteredTotalsMargin = filteredTotalsCredit - filteredTotals.aiProviderCostVnd;

  const buyersPageData = buyersQuery.data ?? {};
  const buyers = Array.isArray(buyersPageData.content) ? buyersPageData.content : [];

  const openBuyers = (row) => {
    const baseLabel = row?.planDisplayName || row?.planCode || `#${row?.planCatalogId}`;
    const versionSuffix = Number.isFinite(Number(row?.planVersion))
      ? ` (v${row.planVersion}${row?.planIsCurrent === false ? ` · ${t('planPurchases.versionOld', 'cũ')}` : ''})`
      : '';
    setBuyerPlanLabel(`${baseLabel}${versionSuffix}`);
    setBuyerPlanId(row?.planCatalogId ?? null);
    setBuyerPage(0);
  };

  const closeBuyers = () => {
    setBuyerPlanId(null);
    setBuyerPlanLabel('');
    setBuyerPage(0);
  };

  const handleDateRange = ({ from: f, to: tw }) => {
    setFrom(f || '');
    setTo(tw || '');
  };

  return (
    <SuperAdminPage>
      <SuperAdminPageHeader
        eyebrow="Commerce"
        title={t('planPurchases.title', 'Báo cáo gói & biên lợi nhuận')}
        actions={(
          <div className="flex items-center gap-2">
            <RevenueSparkline
              targetTypes={['USER_PLAN', 'WORKSPACE_PLAN']}
              days={30}
              color="#10b981"
              label={t('planPurchases.sparklineLabel', 'Doanh thu gói trả phí · 30 ngày')}
            />
            {chartData.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl gap-2 px-3"
                onClick={() => setShowCharts((v) => !v)}
                aria-expanded={showCharts}
                aria-label={showCharts
                  ? t('planPurchases.hideCharts', 'Ẩn biểu đồ')
                  : t('planPurchases.showCharts', 'Xem biểu đồ thống kê')}
              >
                <BarChart3 className="h-4 w-4" />
                {showCharts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 rounded-2xl"
              onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
              disabled={fetching}
              aria-label={t('common.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      />

      <div
        className={`mb-6 flex flex-wrap items-center gap-2 rounded-2xl border p-4 ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <DateRangeChips value={{ from, to }} onChange={handleDateRange} isDarkMode={isDarkMode} />
      </div>

      {loading ? (
        <ListSpinner />
      ) : (
        <>
          {showCharts ? (
            <div
              className={`mb-3 flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${
                isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('planPurchases.chart.versionFilter', 'Phiên bản hiển thị')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'current', label: t('planPurchases.chart.versionCurrent', 'Đang bán') },
                  { value: 'all', label: t('planPurchases.chart.versionAll', 'Tất cả version') },
                  ...planFamilies.map((code) => ({ value: code, label: code })),
                ].map((opt) => {
                  const active = chartVersionFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setChartVersionFilter(opt.value)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {chartVersionFilter !== 'current' ? (
                <span className={`ml-auto text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t('planPurchases.chart.versionHint', 'Bao gồm cả snapshot cũ — bảng bên dưới luôn đầy đủ.')}
                </span>
              ) : null}
            </div>
          ) : null}

          {chartData.length > 0 && showCharts ? (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <ChartCard
                isDarkMode={isDarkMode}
                title={t('planPurchases.chart.revenueSplit', 'Cơ cấu doanh thu theo gói')}
                subtitle={t('planPurchases.chart.revenueSplitHint', 'Mỗi cột = 1 gói; chia theo phần Credit và phần Gốc.')}
                summary={`${formatVnd(chartTotals.revenue)} (${formatVnd(chartTotals.credit)} credit · ${formatVnd(chartTotals.base)} gốc)`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#e2e8f0'} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactVnd(v)}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                      contentStyle={{
                        background: isDarkMode ? '#0f172a' : '#fff',
                        border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(value, name) => [formatVnd(value), name]}
                      labelStyle={{ color: isDarkMode ? '#e2e8f0' : '#0f172a', fontWeight: 600 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar
                      dataKey="credit"
                      stackId="rev"
                      name={t('planPurchases.chart.creditPart', 'Tiền credit')}
                      fill="#10b981"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="base"
                      stackId="rev"
                      name={t('planPurchases.chart.basePart', 'Tiền gốc')}
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                isDarkMode={isDarkMode}
                title={t('planPurchases.chart.margin', 'Lợi nhuận biên theo gói')}
                subtitle={t('planPurchases.chart.marginHint', 'Credit trừ COGS AI (lời còn lại từ pool credit). Đỏ = âm, xanh = dương.')}
                summary={`${formatVnd(chartTotals.margin)} / ${formatVnd(chartTotals.credit)} credit (${
                  chartTotals.credit > 0 ? ((chartTotals.margin / chartTotals.credit) * 100).toFixed(1) : '0.0'
                }%)`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#e2e8f0'} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactVnd(v)}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                      contentStyle={{
                        background: isDarkMode ? '#0f172a' : '#fff',
                        border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(value, name, props) => {
                        if (name === 'margin') {
                          const pct = props?.payload?.marginPct ?? 0;
                          return [`${formatVnd(value)} (${pct.toFixed(1)}%)`, t('planPurchases.chart.marginLabel', 'Biên')];
                        }
                        return [formatVnd(value), name];
                      }}
                      labelStyle={{ color: isDarkMode ? '#e2e8f0' : '#0f172a', fontWeight: 600 }}
                    />
                    <Bar dataKey="margin" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.margin >= 0 ? '#059669' : '#e11d48'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          ) : null}

          {/* Tabs: Plans (default) | Credits — Q4 báo cáo gói credit */}
          <div className="mb-3">
            <SuperAdminTabs
              tabs={[
                { id: 'plans', label: t('planPurchases.tab.plans', 'Gói trả phí') },
                { id: 'credits', label: t('planPurchases.tab.credits', 'Mua credit') },
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {activeTab === 'credits' ? (
            <div
              className={`overflow-hidden rounded-2xl border ${
                isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              <Table>
                <TableHeader>
                  <TableRow className={isDarkMode ? 'border-slate-800 hover:bg-slate-900' : ''}>
                    <TableHead className="w-[26%]">{t('planPurchases.credit.col.package', 'Gói credit')}</TableHead>
                    <TableHead className="w-[120px]">{t('planPurchases.credit.col.scope', 'Phạm vi')}</TableHead>
                    <TableHead className="text-right">{t('planPurchases.col.purchases', 'Lượt mua')}</TableHead>
                    <TableHead className="text-right">{t('planPurchases.col.payers', 'Người trả')}</TableHead>
                    <TableHead className="text-right">{t('planPurchases.credit.col.creditsDelivered', 'Credit đã giao')}</TableHead>
                    <TableHead className="text-right">{t('planPurchases.col.revenue', 'Doanh thu')}</TableHead>
                    <TableHead className="w-[120px] text-right">{t('planPurchases.col.buyers', 'Chi tiết')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center"><ListSpinner /></TableCell>
                    </TableRow>
                  ) : (creditQuery.data?.packages ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className={`text-center py-10 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('planPurchases.credit.empty', 'Không có giao dịch mua credit trong khoảng đã chọn.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (creditQuery.data?.packages ?? []).map((row, idx) => {
                      const isCustom = row.creditPackageId == null;
                      const totalCreditPerUnit = (Number(row.packageBaseCredit) || 0) + (Number(row.packageBonusCredit) || 0);
                      return (
                        <TableRow key={`${row.creditPackageId ?? 'custom'}-${row.paymentTargetType}-${idx}`} className={isDarkMode ? 'border-slate-800' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {row.packageDisplayName || row.packageCode}
                              </span>
                              {isCustom ? (
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  CUSTOM
                                </span>
                              ) : null}
                            </div>
                            {!isCustom ? (
                              <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                {row.packageCode}
                                {totalCreditPerUnit > 0 ? ` · ${Number(row.packageBaseCredit || 0).toLocaleString('vi-VN')} + ${Number(row.packageBonusCredit || 0).toLocaleString('vi-VN')} bonus = ${totalCreditPerUnit.toLocaleString('vi-VN')} credit/lượt` : ''}
                                {row.packageListedPrice != null ? ` · niêm yết ${formatVnd(row.packageListedPrice)}` : ''}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.paymentTargetType === 'WORKSPACE_CREDIT'
                                ? (isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-100 text-violet-700')
                                : (isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-700')
                            }`}>
                              {row.paymentTargetType === 'WORKSPACE_CREDIT' ? 'Nhóm' : 'Cá nhân'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{Number(row.purchaseCount || 0).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(row.distinctPayerCount || 0).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(row.creditsDelivered || 0).toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatVnd(row.revenueVnd)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => openCreditBuyers(row)}>
                              <Users className="h-3.5 w-3.5" />
                              {t('planPurchases.buyers', 'Người mua')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {creditQuery.data ? (
                <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                  <span>
                    {t('planPurchases.credit.totalRevenue', 'Tổng doanh thu credit')}: <strong className="tabular-nums">{formatVnd(creditQuery.data.totalRevenueVnd)}</strong>
                  </span>
                  <span>
                    {t('planPurchases.credit.totalCredits', 'Tổng credit đã giao')}: <strong className="tabular-nums">{Number(creditQuery.data.totalCreditsDelivered || 0).toLocaleString('vi-VN')}</strong>
                  </span>
                  <span>
                    {t('planPurchases.credit.totalPurchases', 'Tổng lượt mua')}: <strong className="tabular-nums">{Number(creditQuery.data.totalPurchaseCount || 0).toLocaleString('vi-VN')}</strong>
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
          <div
            className={`overflow-hidden rounded-2xl border ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <div className={`flex flex-col gap-1 border-b px-5 py-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {t('planPurchases.versionTable.title', 'Chi tiết theo phiên bản')}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('planPurchases.versionTable.subtitle', 'Mỗi dòng tương ứng một gói × version. Bấm ')}
                <strong className={isDarkMode ? 'text-ocean-300' : 'text-ocean-600'}>
                  {t('planPurchases.buyers', 'Người mua')}
                </strong>
                {t('planPurchases.versionTable.subtitleSuffix', ' để xem danh sách user đã mua.')}
              </p>
            </div>

            <div className={`flex flex-wrap items-center gap-2 px-5 py-3 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50/60'}`}>
              <div className={`flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}>
                <Search className={`h-4 w-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={t('planPurchases.versionTable.searchPlaceholder', 'Tìm theo tên gói, version...')}
                  className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                    isDarkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}>
                <Layers className={`h-4 w-4 ${isDarkMode ? 'text-ocean-300' : 'text-ocean-500'}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('planPurchases.versionTable.groupLabel', 'Nhóm gói')}
                </span>
                <select
                  value={tableGroupFilter}
                  onChange={(e) => setTableGroupFilter(e.target.value)}
                  className={`bg-transparent text-xs font-semibold outline-none ${
                    isDarkMode ? 'text-ocean-200' : 'text-ocean-600'
                  }`}
                >
                  <option value="all">{t('planPurchases.versionTable.allOption', 'Tất cả')}</option>
                  {planGroupOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}>
                <BadgeCheck className={`h-4 w-4 ${isDarkMode ? 'text-ocean-300' : 'text-ocean-500'}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('planPurchases.versionTable.statusLabel', 'Trạng thái')}
                </span>
                <select
                  value={tableStatusFilter}
                  onChange={(e) => setTableStatusFilter(e.target.value)}
                  className={`bg-transparent text-xs font-semibold outline-none ${
                    isDarkMode ? 'text-ocean-200' : 'text-ocean-600'
                  }`}
                >
                  <option value="all">{t('planPurchases.versionTable.allOption', 'Tất cả')}</option>
                  <option value="current">{t('planPurchases.versionTable.statusCurrent', 'Đang bán')}</option>
                  <option value="old">{t('planPurchases.versionTable.statusOld', 'Cũ')}</option>
                </select>
              </div>

              <div className={`ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${
                isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
              }`}>
                <ArrowUpDown className={`h-4 w-4 ${isDarkMode ? 'text-ocean-300' : 'text-ocean-500'}`} />
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('planPurchases.versionTable.sortLabel', 'Sắp xếp')}
                </span>
                <select
                  value={tableSort}
                  onChange={(e) => setTableSort(e.target.value)}
                  className={`bg-transparent text-xs font-semibold outline-none ${
                    isDarkMode ? 'text-ocean-200' : 'text-ocean-600'
                  }`}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey, opt.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={isDarkMode ? 'border-slate-800 hover:bg-slate-900' : ''}>
                  <TableHead className="w-[28%]">{t('planPurchases.col.plan', 'Gói')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.purchases', 'Lượt mua')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.payers', 'Người trả')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.baseRevenue', 'Tiền gốc')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.revenue', 'Doanh thu')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.aiCogs', 'COGS AI')}</TableHead>
                  <TableHead className="text-right">{t('planPurchases.col.margin', 'Biên ước lượng')}</TableHead>
                  <TableHead className="w-[120px] text-right">{t('planPurchases.col.buyers', 'Chi tiết')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className={`text-center py-10 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {plans.length === 0
                        ? t('planPurchases.empty', 'Không có giao dịch gói trong khoảng đã chọn.')
                        : t('planPurchases.versionTable.noMatch', 'Không có gói nào khớp với bộ lọc hiện tại.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedPlans.map((row) => {
                    const margin = getEffectiveMargin(row);
                    const marginNeg = margin < 0;
                    const credit = getCreditRevenue(row);
                    const marginPct = credit > 0 ? (margin / credit) * 100 : null;
                    const isCurrent = row?.planIsCurrent !== false;
                    const initials = getPlanInitials(row?.planCode, row?.planDisplayName);
                    const accent = getPlanFamilyAccent(row?.planCode);
                    return (
                      <TableRow key={row.planCatalogId} className={isDarkMode ? 'border-slate-800' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-[11px] font-extrabold tracking-wide text-white shadow-sm`}
                              aria-hidden
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                  {row.planDisplayName || row.planCode || '—'}
                                </span>
                                {Number.isFinite(Number(row.planVersion)) ? (
                                  <span
                                    title={
                                      isCurrent
                                        ? t('planPurchases.versionCurrentTip', 'Version hiện tại đang bán')
                                        : t('planPurchases.versionHistoricalTip', 'Snapshot cũ (đã bị thay bởi version mới)')
                                    }
                                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide tabular-nums ${
                                      isDarkMode ? 'bg-ocean-500/15 text-ocean-200' : 'bg-ocean-50 text-ocean-700'
                                    }`}
                                  >
                                    v{row.planVersion}
                                  </span>
                                ) : null}
                                {isCurrent ? (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {t('planPurchases.versionTable.statusCurrentBadge', 'đang bán')}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {t('planPurchases.versionOld', 'cũ')}
                                  </span>
                                )}
                              </div>
                              <div className={`mt-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                isDarkMode ? 'text-slate-500' : 'text-slate-500'
                              }`}>
                                {row.planCode ? `${row.planCode} · ` : ''}{formatScope(row.planScope)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{Number(row.purchaseCount || 0).toLocaleString('vi-VN')}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(row.distinctPayerCount || 0).toLocaleString('vi-VN')}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatVnd(row.baseRevenueVnd)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatVnd(row.revenueVnd)}</TableCell>
                        <TableCell className={`text-right tabular-nums ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>{formatVnd(row.aiProviderCostVnd)}</TableCell>
                        <TableCell className="text-right">
                          <div className={`tabular-nums font-semibold ${
                            marginNeg ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {formatVnd(margin)}
                          </div>
                          {marginPct != null ? (
                            <div className={`text-[11px] tabular-nums ${
                              marginNeg
                                ? (isDarkMode ? 'text-rose-400/80' : 'text-rose-500/80')
                                : (isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80')
                            }`}>
                              {marginPct.toFixed(2)}%
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openBuyers(row)}
                            className={`rounded-xl gap-1.5 ${
                              isDarkMode
                                ? 'border-ocean-500/40 bg-ocean-500/10 text-ocean-200 hover:bg-ocean-500/20'
                                : 'border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100'
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {t('planPurchases.buyers', 'Người mua')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {filteredPlans.length > 0 ? (
                  <TableRow className={`${
                    isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                  } font-semibold`}>
                    <TableCell>
                      <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {t('planPurchases.versionTable.totalsLabel', 'Tổng cộng')}
                        {' — '}
                        {filteredPlans.length}
                        {' '}
                        {t('planPurchases.versionTable.versionsUnit', 'phiên bản')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{filteredTotals.purchaseCount.toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right tabular-nums">{filteredTotals.distinctPayerCount.toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(filteredTotals.baseRevenueVnd)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatVnd(filteredTotals.revenueVnd)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>{formatVnd(filteredTotals.aiProviderCostVnd)}</TableCell>
                    <TableCell className="text-right">
                      <div className={`tabular-nums font-bold ${
                        filteredTotalsMargin < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {formatVnd(filteredTotalsMargin)}
                      </div>
                      {filteredTotalsCredit > 0 ? (
                        <div className={`text-[11px] tabular-nums ${
                          filteredTotalsMargin < 0
                            ? (isDarkMode ? 'text-rose-400/80' : 'text-rose-500/80')
                            : (isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80')
                        }`}>
                          {((filteredTotalsMargin / filteredTotalsCredit) * 100).toFixed(2)}%
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            {filteredPlans.length > 0 ? (
              <AdminPagination
                currentPage={safePlanPage}
                totalPages={totalPlanPages}
                totalElements={totalPlanRows}
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={setTablePage}
                isDarkMode={isDarkMode}
                hidePageSize
              />
            ) : null}
          </div>
          )}
        </>
      )}

      <Dialog open={buyerPlanId != null} onOpenChange={(open) => !open && closeBuyers()}>
        <DialogContent className={`max-w-4xl max-h-[88vh] overflow-y-auto ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : ''}`}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #1f77a8 100%)' }}
                aria-hidden
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold leading-tight">
                  <span className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}>
                    {t('planPurchases.buyersTitle', 'Người thanh toán')}
                  </span>
                  <span className={`ml-2 text-sm font-semibold ${isDarkMode ? 'text-ocean-300' : 'text-ocean-600'}`}>
                    {buyerPlanLabel}
                  </span>
                </DialogTitle>
                <DialogDescription className={`mt-1 ${isDarkMode ? 'text-slate-400' : ''}`}>
                  {t('planPurchases.buyersHint', 'Các giao dịch COMPLETED cho plan này trong khoảng lọc.')}
                </DialogDescription>
              </div>
            </div>
            {!buyersQuery.isLoading && buyers.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('planPurchases.buyers.totalRecords', 'Tổng giao dịch')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {Number(buyersPageData.totalElements || buyers.length).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-600'}`}>
                    {t('planPurchases.buyers.activeOnPage', 'Còn hạn (trang này)')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {buyers.filter((b) => b.planIsActive === true).length.toLocaleString('vi-VN')}
                    <span className={`ml-1 text-xs font-medium ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                      / {buyers.length}
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-ocean-500/30 bg-ocean-500/5' : 'border-ocean-200 bg-ocean-50/60'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-ocean-300/80' : 'text-ocean-600'}`}>
                    {t('planPurchases.buyers.pageRevenue', 'Doanh thu trang này')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-ocean-200' : 'text-ocean-700'}`}>
                    {formatVnd(buyers.reduce((s, b) => s + (Number(b.amountVnd) || 0), 0))}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogHeader>
          {buyersQuery.isLoading ? (
            <ListSpinner />
          ) : (
            <>
              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader>
                    <TableRow className={`${isDarkMode ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/40' : 'bg-slate-50/80 hover:bg-slate-50/80'}`}>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead>{t('planPurchases.buyers.email', 'Email')}</TableHead>
                      <TableHead className="text-right">{t('planPurchases.buyers.amount', 'Số tiền')}</TableHead>
                      <TableHead>{t('planPurchases.buyers.status', 'Tình trạng')}</TableHead>
                      <TableHead>{t('planPurchases.buyers.paidAt', 'Thanh toán')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buyers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className={`py-12 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          <div className="flex flex-col items-center gap-2">
                            <Users className={`h-8 w-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                            <span className="text-sm">{t('planPurchases.buyersEmpty', 'Không có bản ghi.')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      buyers.map((b) => {
                        const isActive = b.planIsActive === true;
                        const isExpired = b.planIsActive === false;
                        const versionMismatch = Number.isFinite(Number(b.purchasedPlanVersion))
                          && Number.isFinite(Number(b.currentPlanVersion))
                          && b.purchasedPlanVersion !== b.currentPlanVersion;
                        const expiresAtLabel = b.planExpiresAt
                          ? new Date(b.planExpiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : null;
                        const paidAt = formatPaidAt(b.paidAt || b.recordedAt);
                        const avatar = getUserAvatar(b.payerEmail, b.payerUsername);
                        return (
                          <TableRow key={b.paymentId} className={isDarkMode ? 'border-slate-800' : ''}>
                            <TableCell className={`tabular-nums font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {b.payerUserId}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatar.accent} text-[11px] font-bold text-white shadow-sm`}
                                  aria-hidden
                                >
                                  {avatar.initials}
                                </div>
                                <div className="min-w-0">
                                  <div className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {b.payerEmail || '—'}
                                  </div>
                                  {b.payerUsername ? (
                                    <div className={`truncate text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                      @{b.payerUsername}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`tabular-nums text-sm font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                {formatVnd(b.amountVnd)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isActive ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                      {t('planPurchases.buyers.active', 'Còn hạn')}
                                    </span>
                                  ) : isExpired ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      isDarkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-700'
                                    }`}>
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                      {t('planPurchases.buyers.expired', 'Hết hạn')}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">—</span>
                                  )}
                                  {Number.isFinite(Number(b.purchasedPlanVersion)) ? (
                                    <span
                                      title={versionMismatch
                                        ? t('planPurchases.buyers.versionMismatchTip', 'Đã có version mới hơn — gói cũ vẫn còn hiệu lực')
                                        : t('planPurchases.buyers.versionMatchTip', 'Đang là version hiện tại')}
                                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                        versionMismatch
                                          ? (isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700')
                                          : (isDarkMode ? 'bg-ocean-500/15 text-ocean-200' : 'bg-ocean-50 text-ocean-700')
                                      }`}
                                    >
                                      v{b.purchasedPlanVersion}
                                      {versionMismatch ? ` → v${b.currentPlanVersion}` : ''}
                                    </span>
                                  ) : null}
                                </div>
                                {expiresAtLabel ? (
                                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    {t('planPurchases.buyers.expiresAt', 'Hết hạn')}:{' '}
                                    <span className="tabular-nums font-medium">{expiresAtLabel}</span>
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              {paidAt ? (
                                <div className="flex flex-col leading-tight">
                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {paidAt.date}
                                  </span>
                                  {paidAt.time ? (
                                    <span className={`text-[11px] tabular-nums ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                      {paidAt.time}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <AdminPagination
                currentPage={buyerPage}
                totalPages={Number(buyersPageData.totalPages || 0)}
                totalElements={Number(buyersPageData.totalElements || 0)}
                pageSize={buyerPageSize}
                onPageChange={setBuyerPage}
                isDarkMode={isDarkMode}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit buyers modal — danh sách người mua của 1 credit package (hoặc CUSTOM) */}
      <Dialog open={creditBuyerCtx != null} onOpenChange={(open) => !open && closeCreditBuyers()}>
        <DialogContent className={`max-w-4xl max-h-[88vh] overflow-y-auto ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : ''}`}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)' }}
                aria-hidden
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold leading-tight">
                  <span className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}>
                    {t('planPurchases.creditBuyers.title', 'Người mua credit')}
                  </span>
                  <span className={`ml-2 text-sm font-semibold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                    {creditBuyerCtx?.label || ''}
                  </span>
                </DialogTitle>
                <DialogDescription className={`mt-1 ${isDarkMode ? 'text-slate-400' : ''}`}>
                  {t('planPurchases.creditBuyers.hint', 'Các giao dịch COMPLETED cho gói credit này trong khoảng lọc.')}
                </DialogDescription>
              </div>
            </div>
            {!creditBuyersQuery.isLoading && (creditBuyersQuery.data?.content ?? []).length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('planPurchases.buyers.totalRecords', 'Tổng giao dịch')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {Number(creditBuyersQuery.data?.totalElements || (creditBuyersQuery.data?.content ?? []).length).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-600'}`}>
                    {t('planPurchases.creditBuyers.creditsOnPage', 'Credit (trang này)')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {(creditBuyersQuery.data?.content ?? []).reduce((s, b) => s + (Number(b.creditsReceived) || 0), 0).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${
                  isDarkMode ? 'border-ocean-500/30 bg-ocean-500/5' : 'border-ocean-200 bg-ocean-50/60'
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-ocean-300/80' : 'text-ocean-600'}`}>
                    {t('planPurchases.buyers.pageRevenue', 'Doanh thu trang này')}
                  </div>
                  <div className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? 'text-ocean-200' : 'text-ocean-700'}`}>
                    {formatVnd((creditBuyersQuery.data?.content ?? []).reduce((s, b) => s + (Number(b.amountVnd) || 0), 0))}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogHeader>
          {creditBuyersQuery.isLoading ? (
            <ListSpinner />
          ) : (
            <>
              <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader>
                    <TableRow className={`${isDarkMode ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-950/40' : 'bg-slate-50/80 hover:bg-slate-50/80'}`}>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead>{t('planPurchases.buyers.email', 'Email')}</TableHead>
                      <TableHead className="text-right">{t('planPurchases.buyers.amount', 'Số tiền')}</TableHead>
                      <TableHead className="text-right">{t('planPurchases.creditBuyers.creditsReceived', 'Credit nhận')}</TableHead>
                      <TableHead>{t('planPurchases.creditBuyers.scope', 'Phạm vi')}</TableHead>
                      <TableHead>{t('planPurchases.buyers.paidAt', 'Thanh toán')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(creditBuyersQuery.data?.content ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className={`py-12 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          <div className="flex flex-col items-center gap-2">
                            <Users className={`h-8 w-8 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                            <span className="text-sm">{t('planPurchases.buyersEmpty', 'Không có bản ghi.')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (creditBuyersQuery.data?.content ?? []).map((b) => {
                        const paidAt = formatPaidAt(b.paidAt || b.recordedAt);
                        const avatar = getUserAvatar(b.payerEmail, b.payerUsername);
                        return (
                          <TableRow key={b.paymentId} className={isDarkMode ? 'border-slate-800' : ''}>
                            <TableCell className={`tabular-nums font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {b.payerUserId}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatar.accent} text-[11px] font-bold text-white shadow-sm`}
                                  aria-hidden
                                >
                                  {avatar.initials}
                                </div>
                                <div className="min-w-0">
                                  <div className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {b.payerEmail || '—'}
                                  </div>
                                  {b.payerUsername ? (
                                    <div className={`truncate text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                      @{b.payerUsername}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`tabular-nums text-sm font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                {formatVnd(b.amountVnd)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`tabular-nums text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {Number(b.creditsReceived || 0).toLocaleString('vi-VN')}
                              </span>
                              <span className={`ml-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                credit
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                b.paymentTargetType === 'WORKSPACE_CREDIT'
                                  ? (isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-100 text-violet-700')
                                  : (isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-700')
                              }`}>
                                {b.paymentTargetType === 'WORKSPACE_CREDIT' ? 'Nhóm' : 'Cá nhân'}
                              </span>
                              {b.billedWorkspaceName ? (
                                <div className={`mt-0.5 text-[11px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                  {b.billedWorkspaceName}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {paidAt ? (
                                <div className="flex flex-col leading-tight">
                                  <span className={`text-sm font-semibold tabular-nums ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {paidAt.date}
                                  </span>
                                  {paidAt.time ? (
                                    <span className={`text-[11px] tabular-nums ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                      {paidAt.time}
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <AdminPagination
                currentPage={creditBuyerPage}
                totalPages={Number(creditBuyersQuery.data?.totalPages || 0)}
                totalElements={Number(creditBuyersQuery.data?.totalElements || 0)}
                pageSize={creditBuyerPageSize}
                onPageChange={setCreditBuyerPage}
                isDarkMode={isDarkMode}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}
