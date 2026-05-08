import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  Banknote,
  Coins,
  CreditCard,
  Crown,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ListSpinner from '@/components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { getPlanPurchaseSummary, getRevenueTimeseries } from '@/api/ManagementSystemAPI';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminTabs,
} from './Components/SuperAdminSurface';
import DateRangeChips from './Components/DateRangeChips';

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
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') : '—';
}

function buildIso(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function GrowthBadge({ value, isDarkMode, label }) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  const positive = n >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        positive
          ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
          : (isDarkMode ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-100 text-rose-700')
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPct(n)}
      {label ? <span className="font-normal opacity-70">· {label}</span> : null}
    </span>
  );
}

function SourceCard({ icon: Icon, label, total, points, color, isDarkMode, growthPct }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className={`mt-1.5 text-xl font-black tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {formatVnd(total)}
          </p>
          <div className="mt-1">
            <GrowthBadge value={growthPct} isDarkMode={isDarkMode} />
          </div>
        </div>
        <div className="shrink-0 rounded-xl p-2" style={{ background: `${color}20`, color }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 h-12">
        {points && points.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-dash-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: isDarkMode ? '#0f172a' : '#fff',
                  border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                  borderRadius: 8,
                  fontSize: 11,
                  padding: '4px 8px',
                }}
                formatter={(v) => [formatVnd(v), label]}
                labelStyle={{ display: 'none' }}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#grad-dash-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={`flex h-full items-center justify-center text-[10px] ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Chưa đủ data
          </div>
        )}
      </div>
    </div>
  );
}

const TARGET_KEYS = {
  USER_PLAN: 'userPlanVnd',
  WORKSPACE_PLAN: 'workspacePlanVnd',
  USER_CREDIT: 'userCreditVnd',
  WORKSPACE_CREDIT: 'workspaceCreditVnd',
  WORKSPACE_SLOT: 'workspaceSlotVnd',
};

// Meta cho stacked area chart trong section "Phân tích chi tiết". Mỗi target type 1 màu + label.
const TARGET_TYPE_META = {
  USER_PLAN: { color: '#0ea5e9', dataKey: 'userPlanVnd', labelKey: 'revenue.legend.userPlan', label: 'Gói cá nhân' },
  WORKSPACE_PLAN: { color: '#8b5cf6', dataKey: 'workspacePlanVnd', labelKey: 'revenue.legend.workspacePlan', label: 'Gói nhóm' },
  USER_CREDIT: { color: '#10b981', dataKey: 'userCreditVnd', labelKey: 'revenue.legend.userCredit', label: 'Credit cá nhân' },
  WORKSPACE_CREDIT: { color: '#14b8a6', dataKey: 'workspaceCreditVnd', labelKey: 'revenue.legend.workspaceCredit', label: 'Credit nhóm' },
  WORKSPACE_SLOT: { color: '#f59e0b', dataKey: 'workspaceSlotVnd', labelKey: 'revenue.legend.workspaceSlot', label: 'Slot nhóm' },
};

const DETAIL_TABS = [
  { id: 'overview', labelKey: 'revenue.tab.overview', label: 'Tổng quan', types: ['USER_PLAN', 'WORKSPACE_PLAN', 'USER_CREDIT', 'WORKSPACE_CREDIT', 'WORKSPACE_SLOT'] },
  { id: 'subscription', labelKey: 'revenue.tab.subscription', label: 'Subscription', types: ['USER_PLAN', 'WORKSPACE_PLAN'] },
  { id: 'credit', labelKey: 'revenue.tab.credit', label: 'Credit', types: ['USER_CREDIT', 'WORKSPACE_CREDIT'] },
  { id: 'slots', labelKey: 'revenue.tab.slots', label: 'Slot nhóm', types: ['WORKSPACE_SLOT'] },
];

function toApiIso(dateStr) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function pickPointsForTypes(points, types) {
  if (!Array.isArray(points)) return [];
  return points.map((p) => {
    const filtered = { bucket: p.bucket, transactionCount: p.transactionCount };
    let subtotal = 0;
    types.forEach((type) => {
      const meta = TARGET_TYPE_META[type];
      const v = Number(p[meta.dataKey]) || 0;
      filtered[meta.dataKey] = v;
      subtotal += v;
    });
    filtered.totalVnd = subtotal;
    return filtered;
  });
}

function ChartCard({ title, subtitle, summary, children, isDarkMode }) {
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

function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Bucket: DAY (default) / WEEK / MONTH — quyết định grouping của time-series
  const [bucket, setBucket] = useState('DAY');
  // Date range — default rỗng = 30 ngày gần nhất qua buildIso fallback. User có thể override
  // qua DateRangeChips để chọn khoảng tùy ý.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // Active tab cho section "Phân tích chi tiết" (overview / subscription / credit / slots).
  const [activeTab, setActiveTab] = useState('overview');

  const tsParams = useMemo(() => {
    const fromIso = toApiIso(from) ?? buildIso(30);
    const toIso = toApiIso(to) ?? new Date().toISOString();
    return { from: fromIso, to: toIso, bucket };
  }, [from, to, bucket]);

  const planParams = useMemo(() => {
    const fromIso = toApiIso(from) ?? buildIso(30);
    const toIso = toApiIso(to) ?? new Date().toISOString();
    return { from: fromIso, to: toIso };
  }, [from, to]);

  const tsQuery = useQuery({
    queryKey: ['superAdmin', 'dashboard', 'ts', tsParams],
    queryFn: async () => extractData(await getRevenueTimeseries(tsParams)),
    staleTime: 30_000,
  });

  const planQuery = useQuery({
    queryKey: ['superAdmin', 'dashboard', 'plans', planParams],
    queryFn: async () => extractData(await getPlanPurchaseSummary(planParams)),
    staleTime: 30_000,
  });

  const data = tsQuery.data;
  const planSummary = planQuery.data;

  const points = useMemo(() => data?.points ?? [], [data?.points]);
  const totals = data?.totals ?? null;
  const growthPct = data?.growthPct ?? null;

  const sourceData = useMemo(() => {
    const buildSeries = (key) => points.map((p) => ({ bucket: p.bucket, value: Number(p[key]) || 0 }));
    return {
      subscription: {
        total: (Number(totals?.userPlanVnd) || 0) + (Number(totals?.workspacePlanVnd) || 0),
        points: points.map((p) => ({
          bucket: p.bucket,
          value: (Number(p.userPlanVnd) || 0) + (Number(p.workspacePlanVnd) || 0),
        })),
      },
      credit: {
        total: (Number(totals?.userCreditVnd) || 0) + (Number(totals?.workspaceCreditVnd) || 0),
        points: points.map((p) => ({
          bucket: p.bucket,
          value: (Number(p.userCreditVnd) || 0) + (Number(p.workspaceCreditVnd) || 0),
        })),
      },
      slot: {
        total: Number(totals?.workspaceSlotVnd) || 0,
        points: buildSeries(TARGET_KEYS.WORKSPACE_SLOT),
      },
    };
  }, [points, totals]);

  // Active tab data cho phân tích chi tiết
  const activeTabConfig = DETAIL_TABS.find((tab) => tab.id === activeTab) || DETAIL_TABS[0];
  const detailFilteredPoints = useMemo(
    () => pickPointsForTypes(points, activeTabConfig.types),
    [points, activeTabConfig.types],
  );
  const detailTabTotal = useMemo(() => {
    if (!totals) return 0;
    return activeTabConfig.types.reduce((acc, type) => {
      const meta = TARGET_TYPE_META[type];
      return acc + (Number(totals[meta.dataKey]) || 0);
    }, 0);
  }, [totals, activeTabConfig.types]);

  const topBuckets = useMemo(
    () => [...detailFilteredPoints]
      .filter((p) => Number(p.totalVnd) > 0)
      .sort((a, b) => Number(b.totalVnd) - Number(a.totalVnd))
      .slice(0, 6),
    [detailFilteredPoints],
  );

  const weekdayData = useMemo(() => {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    detailFilteredPoints.forEach((p) => {
      const date = new Date(p.bucket);
      if (Number.isNaN(date.getTime())) return;
      const dow = date.getDay();
      const idx = (dow + 6) % 7;
      totals[idx] += Number(p.totalVnd) || 0;
    });
    return labels.map((label, i) => ({ label, totalVnd: totals[i] }));
  }, [detailFilteredPoints]);

  const weekdayHasData = useMemo(
    () => weekdayData.some((d) => d.totalVnd > 0),
    [weekdayData],
  );

  const breakdownData = useMemo(
    () => activeTabConfig.types
      .map((type) => {
        const meta = TARGET_TYPE_META[type];
        return {
          type,
          name: t(meta.labelKey, meta.label),
          value: Number(totals?.[meta.dataKey]) || 0,
          color: meta.color,
        };
      })
      .filter((item) => item.value > 0),
    [activeTabConfig.types, totals, t],
  );

  // Top 3 plans theo doanh thu
  const topPlans = useMemo(() => {
    const list = planSummary?.plans ?? [];
    return [...list]
      .filter((row) => Number(row.revenueVnd) > 0)
      .sort((a, b) => Number(b.revenueVnd) - Number(a.revenueVnd))
      .slice(0, 3);
  }, [planSummary]);

  return (
    <SuperAdminPage className={cn(fontClass, 'gap-5 pb-10')}>
      <SuperAdminPageHeader
        title={t('dashboard.overviewTitle', { defaultValue: 'Overview' })}
        description={t('dashboard.description', {
          defaultValue: 'Platform health, usage and revenue at a glance.',
        })}
        actions={(
          <div
            className={`inline-flex items-center gap-1 rounded-2xl border p-1 ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
            role="tablist"
            aria-label="Chart bucket"
          >
            {[
              { id: 'DAY', label: t('dashboard.chartDay', 'Theo ngày') },
              { id: 'WEEK', label: t('dashboard.chartWeek', 'Theo tuần') },
              { id: 'MONTH', label: t('dashboard.chartMonth', 'Theo tháng') },
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

      {/* Date range filter — áp dụng cho mọi chart trên page (replaces page-level chip
          từ trang Doanh thu & Tăng trưởng cũ đã được merge vào đây) */}
      <SuperAdminPanel contentClassName="px-4 py-3">
        <DateRangeChips
          value={{ from, to }}
          onChange={({ from: f, to: tw }) => { setFrom(f || ''); setTo(tw || ''); }}
          isDarkMode={isDarkMode}
        />
      </SuperAdminPanel>

      {tsQuery.isLoading ? (
        <ListSpinner />
      ) : (
        <>
          {/* Hero KPI: Tổng doanh thu + growth */}
          <div
            className={`rounded-3xl border p-6 ${
              isDarkMode ? 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950' : 'border-slate-200 bg-gradient-to-br from-white to-slate-50'
            }`}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t('dashboard.b.hero.label', 'Tổng doanh thu · 30 ngày gần nhất')}
                </p>
                <p className={`mt-2 text-4xl font-black tracking-[-0.03em] ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                  {formatVnd(totals?.totalVnd)}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <GrowthBadge value={growthPct} isDarkMode={isDarkMode} label={t('revenue.kpi.vsPrev', 'so với khoảng trước')} />
                  <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatInt(totals?.transactionCount)} {t('revenue.kpi.txCount', 'giao dịch')}
                  </span>
                </div>
              </div>
              {/* CTA "Vào trang Doanh thu & Tăng trưởng" đã bỏ vì page đó đã merge vào dashboard này. */}
            </div>
          </div>

          {/* Sources: Subscription / Credit / Slot — mỗi card có sparkline */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SourceCard
              icon={CreditCard}
              label={t('revenue.kpi.subscription', 'Gói trả phí (Subscription)')}
              total={sourceData.subscription.total}
              points={sourceData.subscription.points}
              color="#10b981"
              isDarkMode={isDarkMode}
            />
            <SourceCard
              icon={Coins}
              label={t('revenue.kpi.credit', 'Mua thêm Credit')}
              total={sourceData.credit.total}
              points={sourceData.credit.points}
              color="#f59e0b"
              isDarkMode={isDarkMode}
            />
            <SourceCard
              icon={Banknote}
              label={t('revenue.kpi.slot', 'Slot nhóm')}
              total={sourceData.slot.total}
              points={sourceData.slot.points}
              color="#8b5cf6"
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Phân tích chi tiết — merged từ trang Doanh thu & Tăng trưởng cũ.
              Tabs: Tổng quan / Subscription / Credit / Slot. Mỗi tab show stacked area + line tổng. */}
          <div className="space-y-3">
            <SuperAdminTabs
              tabs={DETAIL_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey, tab.label) }))}
              active={activeTab}
              onChange={setActiveTab}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ChartCard
                isDarkMode={isDarkMode}
                title={t('dashboard.detail.stacked', 'Cơ cấu doanh thu theo loại')}
                subtitle={t('dashboard.detail.stackedHint', 'Tỉ trọng từng loại payment trên tổng doanh thu.')}
                summary={formatVnd(detailTabTotal)}
              >
                {breakdownData.length === 0 || detailTabTotal <= 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">{t('revenue.chartEmpty', 'Không có dữ liệu cho khoảng này.')}</p>
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
                          `${formatVnd(value)} (${detailTabTotal > 0 ? ((value / detailTabTotal) * 100).toFixed(1) : 0}%)`,
                          name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Pie
                        data={breakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={0}
                        outerRadius={92}
                        paddingAngle={1}
                        stroke={isDarkMode ? '#0f172a' : '#fff'}
                        strokeWidth={2}
                        label={({ percent }) => (percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : '')}
                        labelLine={false}
                      >
                        {breakdownData.map((item) => (
                          <Cell key={item.type} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard
                isDarkMode={isDarkMode}
                title={t('dashboard.detail.topBuckets', 'Top bucket có doanh thu cao nhất')}
                subtitle={t('dashboard.detail.topBucketsHint', 'Xếp hạng các kỳ có doanh thu lớn nhất.')}
                summary={`${topBuckets.length} ${t('dashboard.detail.bucketsCount', 'bucket')}`}
              >
                {topBuckets.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">{t('revenue.chartEmpty', 'Không có dữ liệu cho khoảng này.')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topBuckets}
                      layout="vertical"
                      margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#e2e8f0'} horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="bucket"
                        tick={{ fontSize: 11, fill: isDarkMode ? '#cbd5e1' : '#475569' }}
                        axisLine={false}
                        tickLine={false}
                        width={88}
                      />
                      <Tooltip
                        contentStyle={{ background: isDarkMode ? '#0f172a' : '#fff', border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12 }}
                        cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                        formatter={(value) => [formatVnd(value), t('revenue.legend.total', 'Tổng')]}
                      />
                      <Bar
                        dataKey="totalVnd"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        label={{
                          position: 'right',
                          formatter: (v) => formatCompactVnd(v),
                          fill: isDarkMode ? '#94a3b8' : '#64748b',
                          fontSize: 10,
                        }}
                      >
                        {topBuckets.map((_, idx) => (
                          <Cell key={`top-bucket-${idx}`} fill={idx === 0 ? '#0455BF' : idx <= 2 ? '#3b82f6' : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard
                isDarkMode={isDarkMode}
                title={t('dashboard.detail.weekday', 'Doanh thu theo ngày trong tuần')}
                subtitle={t('dashboard.detail.weekdayHint', 'Tổng doanh thu cộng dồn theo thứ.')}
                summary={formatVnd(weekdayData.reduce((acc, d) => acc + d.totalVnd, 0))}
              >
                {!weekdayHasData ? (
                  <p className="py-12 text-center text-sm text-slate-500">{t('revenue.chartEmpty', 'Không có dữ liệu cho khoảng này.')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={weekdayData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1f2937' : '#e2e8f0'} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: isDarkMode ? '#cbd5e1' : '#475569' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => formatCompactVnd(v)}
                        tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{ background: isDarkMode ? '#0f172a' : '#fff', border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12 }}
                        cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                        formatter={(value) => [formatVnd(value), t('revenue.legend.total', 'Tổng')]}
                      />
                      <Bar dataKey="totalVnd" radius={[6, 6, 0, 0]} barSize={28}>
                        {weekdayData.map((d, idx) => {
                          const isWeekend = idx >= 5;
                          return (
                            <Cell key={`weekday-${idx}`} fill={isWeekend ? '#8b5cf6' : '#0ea5e9'} />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

            </div>
          </div>

          {/* Top plans */}
          <SuperAdminPanel
            title={(
              <span className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                {t('dashboard.b.topPlans.title', 'Top gói có doanh thu cao nhất')}
              </span>
            )}
            description={t('dashboard.b.topPlans.desc', '30 ngày gần nhất · click để xem người mua')}
            contentClassName="px-0 py-0"
          >
              {planQuery.isLoading ? (
                <div className="px-6 py-8"><ListSpinner /></div>
              ) : topPlans.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500">
                  {t('dashboard.b.topPlans.empty', 'Chưa có gói nào bán được trong 30 ngày.')}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topPlans.map((row, idx) => {
                    const totalRev = Number(planSummary?.totalRevenueVnd) || 1;
                    const pct = (Number(row.revenueVnd) / totalRev) * 100;
                    const isCurrent = row.planIsCurrent !== false;
                    return (
                      <button
                        key={row.planCatalogId}
                        type="button"
                        onClick={() => navigate('/super-admin/plan-purchases')}
                        className={`flex w-full items-center gap-4 px-6 py-3 text-left transition-colors ${
                          isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                          idx === 0
                            ? (isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700')
                            : idx === 1
                              ? (isDarkMode ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-700')
                              : (isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700')
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {row.planDisplayName || row.planCode}
                            </span>
                            {Number.isFinite(Number(row.planVersion)) ? (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isCurrent
                                  ? (isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-100 text-indigo-700')
                                  : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')
                              }`}>
                                v{row.planVersion}{isCurrent ? '' : ' · cũ'}
                              </span>
                            ) : null}
                            <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              · {row.planScope}
                            </span>
                          </div>
                          <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {formatCompactVnd(row.revenueVnd)}
                          </p>
                          <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {row.purchaseCount} lượt · {pct.toFixed(1)}%
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SuperAdminPanel>
        </>
      )}
    </SuperAdminPage>
  );
}

export default SuperAdminDashboard;
