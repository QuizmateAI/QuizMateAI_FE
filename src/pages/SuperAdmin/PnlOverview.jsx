import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  getAiAuditSummary,
  getAiCostSummary,
  getRevenueTimeseries,
} from '@/api/ManagementSystemAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
} from './Components/SuperAdminSurface';
import DateRangeChips, { formatDateTimeLocal } from './Components/DateRangeChips';

const COLOR_REVENUE = '#10b981';
const COLOR_COST_USER_PAID = '#3b82f6';
const COLOR_COST_PLAN = '#8b5cf6';
const COLOR_COST_SYSTEM = '#f59e0b';
const COLOR_COST_FREE = '#fb7185';

function extractData(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

function formatVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

function formatCompactVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0 ₫';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ ₫`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} tr ₫`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k ₫`;
  return `${sign}${abs} ₫`;
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function toApiIso(dateStr) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatVnDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildRangeLabel(fromStr, toStr, t) {
  const a = formatVnDate(fromStr);
  const b = formatVnDate(toStr);
  if (!a && !b) return t('pnl.range.allTime', 'All time');
  if (a && b) return `${a} → ${b}`;
  if (a) return `${a} → ${t('pnl.range.now', 'present')}`;
  return `… → ${b}`;
}

function FlowMetricCard({ label, hint, value, dotColor, valueClass, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 flex flex-col justify-between h-[100px] transition-transform hover:scale-[1.02]',
        isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50',
      )}
    >
      <div>
        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
          {label}
        </div>
        {hint ? (
          <div className={cn('text-[10px] mt-0.5', isDarkMode ? 'text-slate-600' : 'text-slate-400')}>
            {hint}
          </div>
        ) : null}
      </div>
      <div className={cn('text-base font-black tabular-nums', valueClass)}>
        {formatVnd(value)}
      </div>
    </div>
  );
}

function FlowColumnTotal({ label, value, valueClass, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed p-4 flex items-center justify-between',
        isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100/60',
      )}
    >
      <div className="text-xs font-bold text-slate-500 uppercase">{label}</div>
      <div className={cn('text-lg font-black tabular-nums', valueClass)}>
        {formatVnd(value)}
      </div>
    </div>
  );
}

function PieCard({ title, subtitle, summary, data, isDarkMode, emptyText }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {title}
          </h3>
          {subtitle ? (
            <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {summary ? (
          <p className={`text-right text-xs tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {summary}
          </p>
        ) : null}
      </div>
      {total <= 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Tooltip
              contentStyle={{
                background: isDarkMode ? '#0f172a' : '#fff',
                border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                `${formatVnd(value)} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={48}
              outerRadius={92}
              paddingAngle={1}
              stroke={isDarkMode ? '#0f172a' : '#fff'}
              strokeWidth={2}
              label={({ percent }) => (percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : '')}
              labelLine={false}
            >
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function CashFlowMap({ revenueTotals, aiCostUserPaid, aiCostPlan, aiCostSystem, aiCostFreeUser, isDarkMode, t }) {
  const baseRevenue = num(revenueTotals?.baseRevenueVnd);
  const creditFund = num(revenueTotals?.creditFundRevenueVnd);
  const slotRev = num(revenueTotals?.workspaceSlotVnd);
  const baseFromPlan = Math.max(0, baseRevenue - slotRev);
  const revenueTotal = baseRevenue + creditFund;
  const userUsageTotal = aiCostFreeUser + aiCostUserPaid;
  const systemAiTotal = aiCostSystem + aiCostPlan;

  return (
    <div
      className={cn(
        'rounded-3xl border p-6 shadow-sm transition-all duration-300',
        isDarkMode
          ? 'border-slate-800 bg-slate-900/60 backdrop-blur-xl'
          : 'border-slate-200 bg-white/80 backdrop-blur-xl',
      )}
    >
      <div className="mb-6">
        <h3 className={cn('text-base font-bold tracking-tight', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
          {t('pnl.flow.title', 'Cash Flow Map & Profit Model')}
        </h3>
        <p className={cn('text-xs mt-0.5', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
          {t('pnl.flow.subtitle', 'Visual breakdown of plan profit and system net profit.')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Column 1: Revenue */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('pnl.flow.revenueInflows', 'Revenue inflows')}
          </div>

          <FlowMetricCard
            label={t('pnl.flow.creditPool', 'Quỹ Credit (gói + lẻ)')}
            hint={t('pnl.flow.creditPoolHint', 'Phần credit trong gói + nạp lẻ')}
            value={creditFund}
            dotColor="bg-amber-500"
            valueClass={isDarkMode ? 'text-amber-400' : 'text-amber-600'}
            isDarkMode={isDarkMode}
          />
          <FlowMetricCard
            label={t('pnl.flow.baseFromPlan', 'Tiền gốc (gói)')}
            hint={t('pnl.flow.baseFromPlanHint', 'Phần nền tảng đã khóa trong gói')}
            value={baseFromPlan}
            dotColor="bg-emerald-500"
            valueClass={isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}
            isDarkMode={isDarkMode}
          />
          <FlowMetricCard
            label={t('pnl.flow.slotRevenue', 'Group slots')}
            value={slotRev}
            dotColor="bg-purple-500"
            valueClass={isDarkMode ? 'text-purple-400' : 'text-purple-600'}
            isDarkMode={isDarkMode}
          />
          <FlowColumnTotal
            label={t('pnl.kpi.revenue', 'Total revenue')}
            value={revenueTotal}
            valueClass={isDarkMode ? 'text-white' : 'text-slate-900'}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Column 2: User-initiated AI usage */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('pnl.flow.userUsageOutflows', 'Phí AI do user sử dụng')}
          </div>

          <FlowMetricCard
            label={t('pnl.flow.freeUserAiCost', 'User free (không gói)')}
            hint={t('pnl.flow.freeUserAiCostHint', 'Hệ thống trả · FREE_USER')}
            value={aiCostFreeUser}
            dotColor="bg-rose-400"
            valueClass={isDarkMode ? 'text-rose-300' : 'text-rose-600'}
            isDarkMode={isDarkMode}
          />
          <FlowMetricCard
            label={t('pnl.flow.planUserAiCost', 'User trừ credit (USER_PAID)')}
            hint={t('pnl.flow.planUserAiCostHint', 'Có gói · mỗi lần dùng trừ credit')}
            value={aiCostUserPaid}
            dotColor="bg-blue-500"
            valueClass={isDarkMode ? 'text-blue-300' : 'text-blue-600'}
            isDarkMode={isDarkMode}
          />
          <div className="hidden md:block h-[100px]" />
          <FlowColumnTotal
            label={t('pnl.flow.userUsageTotal', 'Tổng phí user sử dụng')}
            value={userUsageTotal}
            valueClass={isDarkMode ? 'text-blue-300' : 'text-blue-600'}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Column 3: System-borne AI */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {t('pnl.flow.systemAiOutflows', 'Phí AI hệ thống trả')}
          </div>

          <FlowMetricCard
            label={t('pnl.flow.systemAiCost', 'AI System (SYSTEM)')}
            hint={t('pnl.flow.systemAiCostHint', 'RAG, OCR, moderation · hệ thống trả')}
            value={aiCostSystem}
            dotColor="bg-orange-400"
            valueClass={isDarkMode ? 'text-orange-300' : 'text-orange-600'}
            isDarkMode={isDarkMode}
          />
          <FlowMetricCard
            label={t('pnl.flow.planAiCost', 'Gói bao trọn (PLAN_BASED)')}
            hint={t('pnl.flow.planAiCostHint', 'Có gói · không trừ credit · hệ thống trả')}
            value={aiCostPlan}
            dotColor="bg-purple-500"
            valueClass={isDarkMode ? 'text-purple-300' : 'text-purple-600'}
            isDarkMode={isDarkMode}
          />
          <div className="hidden md:block h-[100px]" />
          <FlowColumnTotal
            label={t('pnl.flow.systemAiTotal', 'Tổng phí hệ thống trả')}
            value={systemAiTotal}
            valueClass={isDarkMode ? 'text-orange-300' : 'text-orange-600'}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  );
}

function PnlOverview() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [bucket, setBucket] = useState('DAY');
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return formatDateTimeLocal(start);
  });
  const [to, setTo] = useState(() => {
    const now = new Date();
    return formatDateTimeLocal(now);
  });

  // Empty from/to → undefined → BE coi như all-time, đồng nhất default với
  // trang Chi phí AI và Nhật ký AI (cùng dataset → 4 trang đối chiếu trực tiếp).
  const params = useMemo(() => ({
    from: toApiIso(from),
    to: toApiIso(to),
  }), [from, to]);

  const tsQuery = useQuery({
    queryKey: ['superAdmin', 'pnl', 'revenueTs', { ...params, bucket }],
    queryFn: async () => extractData(await getRevenueTimeseries({ ...params, bucket })),
    staleTime: 30_000,
  });

  const costQuery = useQuery({
    queryKey: ['superAdmin', 'pnl', 'aiCost', params],
    queryFn: async () => extractData(await getAiCostSummary(params)),
    staleTime: 30_000,
  });

  const auditQuery = useQuery({
    queryKey: ['superAdmin', 'pnl', 'aiAudit', params],
    queryFn: async () => extractData(await getAiAuditSummary(params)),
    staleTime: 30_000,
  });

  const isLoading = tsQuery.isLoading || costQuery.isLoading || auditQuery.isLoading;

  // Revenue side — dùng cùng tổng base+credit với bản đồ dòng tiền (khớp snapshot payment).
  const revenueTotals = tsQuery.data?.totals ?? null;
  const revenuePoints = tsQuery.data?.points ?? [];
  const revenueSplitTotal = num(revenueTotals?.baseRevenueVnd) + num(revenueTotals?.creditFundRevenueVnd);
  const revenueTotal = revenueSplitTotal > 0 ? revenueSplitTotal : num(revenueTotals?.totalVnd);

  // AI cost side — tách CHÍNH XÁC từ cost summary (cùng đường usage-log với tổng dùng cho net):
  //   totalProviderCostVnd = USER_PAID + PLAN_BASED + FREE_USER. SYSTEM lấy từ audit.
  const aiCostUserPlan = num(costQuery.data?.totalProviderCostVnd);    // USER_PAID + PLAN_BASED + FREE_USER
  const aiCostUserPaid = num(costQuery.data?.userPaidProviderCostVnd); // USER_PAID (chính xác, BE tách)
  const aiCostPlan = num(costQuery.data?.planBasedProviderCostVnd);    // PLAN_BASED (chính xác, BE tách)
  const aiCostSystem = num(auditQuery.data?.systemCostVnd);            // SYSTEM (audit)
  const aiCostFreeUser = num(costQuery.data?.freeUserProviderCostVnd); // FREE_USER (user không gói → hệ thống chịu)

  const aiCostTotal = aiCostUserPlan + aiCostSystem;
  const netVnd = revenueTotal - aiCostTotal;
  const netPositive = netVnd >= 0;
  const netMarginRatio = revenueTotal > 0 ? netVnd / revenueTotal : null;
  const aiCostRatio = revenueTotal > 0 ? aiCostTotal / revenueTotal : null;

  // Revenue breakdown (sub vs credit vs slot)
  const revBreakdown = useMemo(() => {
    if (!revenueTotals) return [];
    const subscription = num(revenueTotals.userPlanVnd) + num(revenueTotals.workspacePlanVnd);
    const credit = num(revenueTotals.userCreditVnd) + num(revenueTotals.workspaceCreditVnd);
    const slot = num(revenueTotals.workspaceSlotVnd);
    return [
      { name: t('pnl.rev.subscription', 'Paid plans'), value: subscription, color: '#10b981' },
      { name: t('pnl.rev.credit', 'Credit purchases'), value: credit, color: '#f59e0b' },
      { name: t('pnl.rev.slot', 'Group slots'), value: slot, color: '#8b5cf6' },
    ];
  }, [revenueTotals, t]);

  // AI cost breakdown
  const costBreakdown = useMemo(() => ([
    { name: t('pnl.cost.userPaid', 'User-paid AI'), value: aiCostUserPaid, color: COLOR_COST_USER_PAID },
    { name: t('pnl.cost.plan', 'Plan-included AI'), value: aiCostPlan, color: COLOR_COST_PLAN },
    { name: t('pnl.cost.system', 'System-covered AI'), value: aiCostSystem, color: COLOR_COST_SYSTEM },
    { name: t('pnl.cost.freeUser', 'Free-user AI'), value: aiCostFreeUser, color: COLOR_COST_FREE },
  ]), [aiCostUserPaid, aiCostPlan, aiCostSystem, aiCostFreeUser, t]);

  const revenueChartData = useMemo(
    () => revenuePoints.map((p) => ({ bucket: p.bucket, totalVnd: num(p.totalVnd) })),
    [revenuePoints],
  );

  const Hero = (
    <div
      className={`rounded-3xl border p-6 ${
        isDarkMode
          ? 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950'
          : 'border-slate-200 bg-gradient-to-br from-white to-slate-50'
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t('pnl.hero.label', 'Net profit after AI costs')}
          </p>
          <p
            className={`mt-2 text-4xl font-black tracking-[-0.03em] ${
              netPositive
                ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600')
                : (isDarkMode ? 'text-rose-300' : 'text-rose-600')
            }`}
          >
            {formatVnd(netVnd)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                netPositive
                  ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                  : (isDarkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-700')
              }`}
            >
              {netPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {netMarginRatio !== null ? formatPct(netMarginRatio) : '—'}
              <span className="font-normal opacity-70">· {t('pnl.hero.margin', 'margin')}</span>
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('pnl.hero.formula', 'Revenue')} {formatCompactVnd(revenueTotal)} −{' '}
              {t('pnl.hero.aiCost', 'Total AI cost')} {formatCompactVnd(aiCostTotal)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-semibold ${
              netPositive
                ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                : (isDarkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700')
            }`}
          >
            {netPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {netPositive ? t('pnl.hero.profit', 'Profitable') : t('pnl.hero.loss', 'Losing')}
          </div>
          {aiCostRatio !== null ? (
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('pnl.hero.aiCostRatio', 'AI cost ratio')} {formatPct(aiCostRatio)} {t('pnl.hero.ofRevenue', 'of revenue')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <SuperAdminPage className={cn(fontClass, 'gap-5 pb-10')}>
      <SuperAdminPageHeader
        eyebrow={t('sidebarSections.revenueReports', 'Revenue reports')}
        title={t('pnl.title', 'P&L overview')}
        description={t(
          'pnl.description',
          'Compare revenue, AI cost, and net profit for the selected reporting range.',
        )}
        actions={(
          <div
            className={`inline-flex items-center gap-1 rounded-2xl border p-1 ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
            role="tablist"
            aria-label="Bucket"
          >
            {[
              { id: 'DAY', label: t('pnl.bucketDay', 'Day') },
              { id: 'WEEK', label: t('pnl.bucketWeek', 'Week') },
              { id: 'MONTH', label: t('pnl.bucketMonth', 'Month') },
            ].map((opt) => {
              const active = bucket === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBucket(opt.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#0455BF] text-white'
                      : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      />

      <SuperAdminPanel contentClassName="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateRangeChips
            value={{ from, to }}
            onChange={({ from: f, to: tw }) => { setFrom(f || ''); setTo(tw || ''); }}
            isDarkMode={isDarkMode}
          />
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              isDarkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            title={t('pnl.range.tooltip', 'All numbers below are calculated within this range.')}
          >
            <span className={`uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('pnl.range.label', 'Reporting range')}
            </span>
            <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
              {buildRangeLabel(from, to, t)}
            </span>
          </div>
        </div>
      </SuperAdminPanel>

      {isLoading ? (
        <ListSpinner />
      ) : (
        <>
          {Hero}

          <CashFlowMap
            revenueTotals={revenueTotals}
            aiCostUserPaid={aiCostUserPaid}
            aiCostPlan={aiCostPlan}
            aiCostSystem={aiCostSystem}
            aiCostFreeUser={aiCostFreeUser}
            isDarkMode={isDarkMode}
            t={t}
          />

          <div
            className={`rounded-2xl border p-4 ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {t('pnl.chart.revenueTs', 'Revenue over time')}
                </h3>
                <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t(
                    'pnl.chart.revenueTsHint',
                    'Revenue over time within the selected range.',
                  )}
                </p>
              </div>
              <p className={`text-right text-xs tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatVnd(revenueTotal)}
              </p>
            </div>
            {revenueChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {t('pnl.chart.empty', 'No data for this range.')}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="pnl-rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_REVENUE} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={COLOR_REVENUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#e2e8f0'} vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: isDarkMode ? '#cbd5e1' : '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactVnd(v)}
                    tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: isDarkMode ? '#0f172a' : '#fff',
                      border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value) => [formatVnd(value), t('pnl.chart.revenue', 'Revenue')]}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalVnd"
                    stroke={COLOR_REVENUE}
                    strokeWidth={2}
                    fill="url(#pnl-rev-grad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PieCard
              title={t('pnl.pie.revenue', 'Revenue mix')}
              subtitle={t('pnl.pie.revenueHint', 'By payment channel.')}
              summary={formatVnd(revenueTotal)}
              data={revBreakdown}
              isDarkMode={isDarkMode}
              emptyText={t('pnl.chart.empty', 'No data for this range.')}
            />
            <PieCard
              title={t('pnl.pie.cost', 'AI cost mix')}
              subtitle={t('pnl.pie.costHint', 'Tách USER_PAID / PLAN_BASED / SYSTEM — số chính xác.')}
              summary={formatVnd(aiCostTotal)}
              data={costBreakdown}
              isDarkMode={isDarkMode}
              emptyText={t('pnl.chart.empty', 'No data for this range.')}
            />
          </div>

          {(tsQuery.error || costQuery.error || auditQuery.error) ? (
            <div
              className={`rounded-2xl border p-3 text-xs ${
                isDarkMode ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {t('pnl.partialError', 'Some data failed to load, so the numbers may be incomplete.')}
            </div>
          ) : null}
        </>
      )}
    </SuperAdminPage>
  );
}

export default PnlOverview;
