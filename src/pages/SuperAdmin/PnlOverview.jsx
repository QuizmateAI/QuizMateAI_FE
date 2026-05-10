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
  Cpu,
  ServerCog,
  TrendingDown,
  TrendingUp,
  Wallet,
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
import DateRangeChips from './Components/DateRangeChips';

/**
 * P&L Tổng hợp — net profit view combining:
 *   Lời ròng = Doanh thu (sub + credit + slot)
 *            − Chi phí AI có thu phí (USER_PAID + PLAN_BASED, từ Chi phí AI)
 *            − Chi phí AI hệ thống (SYSTEM, từ Nhật ký AI)
 *
 * Note: AiCost.totalProviderCostVnd covers USER_PAID + PLAN_BASED matched requests;
 * AiAudit.systemCostVnd covers SYSTEM only — không overlap khi cộng lại.
 * AiAudit.planCostVnd dùng để hiển thị breakdown PLAN_BASED riêng (không cộng vào tổng).
 */

const COLOR_REVENUE = '#10b981';
const COLOR_COST_USER_PAID = '#3b82f6';
const COLOR_COST_PLAN = '#8b5cf6';
const COLOR_COST_SYSTEM = '#f59e0b';
const COLOR_NET_POS = '#10b981';
const COLOR_NET_NEG = '#ef4444';

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
  if (!a && !b) return t('pnl.range.allTime', 'Tất cả thời gian');
  if (a && b) return `${a} → ${b}`;
  if (a) return `${a} → ${t('pnl.range.now', 'hiện tại')}`;
  return `… → ${b}`;
}

function KpiCard({ icon: Icon, label, value, hint, color, isDarkMode, accent }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p
            className={`mt-1.5 text-xl font-black tabular-nums tracking-tight ${
              accent || (isDarkMode ? 'text-white' : 'text-slate-900')
            }`}
          >
            {value}
          </p>
          {hint ? (
            <p className={`mt-1 text-[11px] leading-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {hint}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xl p-2" style={{ background: `${color}20`, color }}>
          <Icon className="h-4 w-4" />
        </div>
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

function PnlOverview() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [bucket, setBucket] = useState('DAY');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

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

  // Revenue side
  const revenueTotals = tsQuery.data?.totals ?? null;
  const revenuePoints = tsQuery.data?.points ?? [];
  const revenueTotal = num(revenueTotals?.totalVnd);

  // AI cost side
  // AiCost: USER_PAID + PLAN_BASED matched providerCost
  // AiAudit: planCost = PLAN_BASED, systemCost = SYSTEM (USER_PAID excluded)
  const aiCostUserPlan = num(costQuery.data?.totalProviderCostVnd);
  const aiCostSystem = num(auditQuery.data?.systemCostVnd);
  const aiCostPlan = num(auditQuery.data?.planCostVnd);
  // USER_PAID estimate: subtract PLAN_BASED audit cost from AiCost matched cost (clamped ≥ 0).
  // Có thể lệch vài đồng do chỉ tính matched audit, nhưng đủ tốt cho breakdown UI.
  const aiCostUserPaidEstimate = Math.max(0, aiCostUserPlan - aiCostPlan);

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
      { name: t('pnl.rev.subscription', 'Gói trả phí'), value: subscription, color: '#10b981' },
      { name: t('pnl.rev.credit', 'Mua credit'), value: credit, color: '#f59e0b' },
      { name: t('pnl.rev.slot', 'Slot nhóm'), value: slot, color: '#8b5cf6' },
    ];
  }, [revenueTotals, t]);

  // AI cost breakdown
  const costBreakdown = useMemo(() => ([
    { name: t('pnl.cost.userPaid', 'USER_PAID (user trả từng lần)'), value: aiCostUserPaidEstimate, color: COLOR_COST_USER_PAID },
    { name: t('pnl.cost.plan', 'PLAN_BASED (gói thuê bao)'), value: aiCostPlan, color: COLOR_COST_PLAN },
    { name: t('pnl.cost.system', 'SYSTEM (hệ thống chịu)'), value: aiCostSystem, color: COLOR_COST_SYSTEM },
  ]), [aiCostUserPaidEstimate, aiCostPlan, aiCostSystem, t]);

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
            {t('pnl.hero.label', 'Lời ròng (sau chi phí AI)')}
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
              <span className="font-normal opacity-70">· {t('pnl.hero.margin', 'biên lợi nhuận')}</span>
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('pnl.hero.formula', 'Doanh thu')} {formatCompactVnd(revenueTotal)} −{' '}
              {t('pnl.hero.aiCost', 'Chi phí AI tổng')} {formatCompactVnd(aiCostTotal)}
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
            {netPositive ? t('pnl.hero.profit', 'Có lời') : t('pnl.hero.loss', 'Đang lỗ')}
          </div>
          {aiCostRatio !== null ? (
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('pnl.hero.aiCostRatio', 'Chi phí AI')} {formatPct(aiCostRatio)} {t('pnl.hero.ofRevenue', 'doanh thu')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <SuperAdminPage className={cn(fontClass, 'gap-5 pb-10')}>
      <SuperAdminPageHeader
        eyebrow={t('sidebarSections.revenueReports', 'Báo cáo doanh thu')}
        title={t('pnl.title', 'P&L Tổng hợp')}
        description={t(
          'pnl.description',
          'Doanh thu thực thu trừ toàn bộ chi phí AI (gồm cả phần hệ thống chịu từ Nhật ký AI).',
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
              { id: 'DAY', label: t('pnl.bucketDay', 'Ngày') },
              { id: 'WEEK', label: t('pnl.bucketWeek', 'Tuần') },
              { id: 'MONTH', label: t('pnl.bucketMonth', 'Tháng') },
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
            title={t('pnl.range.tooltip', 'Mọi con số dưới đây tính trên đúng khoảng này. Đổi range hoặc preset để đối chiếu với trang Chi phí AI / Nhật ký AI (mặc định all-time).')}
          >
            <span className={`uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('pnl.range.label', 'Khoảng tính')}
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Wallet}
              label={t('pnl.kpi.revenue', 'Doanh thu')}
              value={formatVnd(revenueTotal)}
              hint={t('pnl.kpi.revenueHint', 'Sub + Credit + Slot')}
              color={COLOR_REVENUE}
              isDarkMode={isDarkMode}
            />
            <KpiCard
              icon={Cpu}
              label={t('pnl.kpi.aiCharged', 'Chi phí AI có thu phí')}
              value={formatVnd(aiCostUserPlan)}
              hint={t('pnl.kpi.aiChargedHint', 'USER_PAID + PLAN_BASED (matched)')}
              color={COLOR_COST_PLAN}
              isDarkMode={isDarkMode}
            />
            <KpiCard
              icon={ServerCog}
              label={t('pnl.kpi.aiSystem', 'Chi phí AI hệ thống')}
              value={formatVnd(aiCostSystem)}
              hint={t('pnl.kpi.aiSystemHint', 'Phần hệ thống tự chịu (RAG, OCR, moderation…)')}
              color={COLOR_COST_SYSTEM}
              isDarkMode={isDarkMode}
            />
            <KpiCard
              icon={netPositive ? ArrowUpRight : ArrowDownRight}
              label={t('pnl.kpi.net', 'Lời ròng')}
              value={formatVnd(netVnd)}
              hint={t('pnl.kpi.netHint', 'Doanh thu − tổng chi phí AI')}
              color={netPositive ? COLOR_NET_POS : COLOR_NET_NEG}
              isDarkMode={isDarkMode}
              accent={netPositive
                ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600')
                : (isDarkMode ? 'text-rose-300' : 'text-rose-600')}
            />
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {t('pnl.chart.revenueTs', 'Doanh thu theo thời gian')}
                </h3>
                <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {t(
                    'pnl.chart.revenueTsHint',
                    'Chi phí AI tổng được biểu thị bằng đường ngang để bạn so sánh doanh thu mỗi kỳ với chi phí AI cộng dồn.',
                  )}
                </p>
              </div>
              <p className={`text-right text-xs tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatVnd(revenueTotal)}
              </p>
            </div>
            {revenueChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {t('pnl.chart.empty', 'Không có dữ liệu cho khoảng này.')}
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
                    formatter={(value) => [formatVnd(value), t('pnl.chart.revenue', 'Doanh thu')]}
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
              title={t('pnl.pie.revenue', 'Cơ cấu doanh thu')}
              subtitle={t('pnl.pie.revenueHint', 'Theo nguồn thanh toán.')}
              summary={formatVnd(revenueTotal)}
              data={revBreakdown}
              isDarkMode={isDarkMode}
              emptyText={t('pnl.chart.empty', 'Không có dữ liệu cho khoảng này.')}
            />
            <PieCard
              title={t('pnl.pie.cost', 'Cơ cấu chi phí AI')}
              subtitle={t('pnl.pie.costHint', 'USER_PAID = ước lượng (charged − planCost).')}
              summary={formatVnd(aiCostTotal)}
              data={costBreakdown}
              isDarkMode={isDarkMode}
              emptyText={t('pnl.chart.empty', 'Không có dữ liệu cho khoảng này.')}
            />
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {t('pnl.formula.title', 'Cách tính lời ròng')}
            </h3>
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t(
                'pnl.formula.hint',
                'Cộng/trừ trên cùng một khoảng thời gian. Phần PLAN_BASED đã được tách khỏi USER_PAID để tránh đếm trùng.',
              )}
            </p>
            <div className="mt-3 space-y-1 font-mono text-[12px] leading-6">
              <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                <span style={{ color: COLOR_REVENUE }}>+ {formatVnd(revenueTotal)}</span>{' '}
                <span className="text-slate-500">— {t('pnl.formula.revenue', 'Doanh thu (Sub + Credit + Slot)')}</span>
              </div>
              <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                <span style={{ color: COLOR_COST_USER_PAID }}>− {formatVnd(aiCostUserPaidEstimate)}</span>{' '}
                <span className="text-slate-500">— {t('pnl.formula.userPaid', 'USER_PAID (ước lượng)')}</span>
              </div>
              <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                <span style={{ color: COLOR_COST_PLAN }}>− {formatVnd(aiCostPlan)}</span>{' '}
                <span className="text-slate-500">— {t('pnl.formula.plan', 'PLAN_BASED (gói thuê bao)')}</span>
              </div>
              <div className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                <span style={{ color: COLOR_COST_SYSTEM }}>− {formatVnd(aiCostSystem)}</span>{' '}
                <span className="text-slate-500">— {t('pnl.formula.system', 'SYSTEM (hệ thống chịu)')}</span>
              </div>
              <div className={`mt-2 border-t pt-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <span
                  className={`font-bold ${
                    netPositive
                      ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600')
                      : (isDarkMode ? 'text-rose-300' : 'text-rose-600')
                  }`}
                >
                  = {formatVnd(netVnd)}
                </span>{' '}
                <span className="text-slate-500">
                  — {netPositive ? t('pnl.formula.netPositive', 'Lời ròng') : t('pnl.formula.netNegative', 'Lỗ ròng')}
                </span>
              </div>
            </div>
          </div>

          {(tsQuery.error || costQuery.error || auditQuery.error) ? (
            <div
              className={`rounded-2xl border p-3 text-xs ${
                isDarkMode ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              {t('pnl.partialError', 'Một phần dữ liệu lỗi tải, các con số có thể chưa đầy đủ.')}
            </div>
          ) : null}
        </>
      )}
    </SuperAdminPage>
  );
}

export default PnlOverview;
