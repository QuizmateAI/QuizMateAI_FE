import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, ChevronDown, ChevronUp, RefreshCw, Users } from 'lucide-react';
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
import { getPlanPurchaseBuyers, getPlanPurchaseSummary } from '@/api/ManagementSystemAPI';
import AdminPagination from '@/pages/Admin/components/AdminPagination';
import DateRangeChips from '@/pages/SuperAdmin/Components/DateRangeChips';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from '@/pages/SuperAdmin/Components/SuperAdminSurface';

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

function KpiTile({ isDarkMode, label, value, hint, accent = 'slate' }) {
  const accentColor = {
    emerald: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
    amber: isDarkMode ? 'text-amber-300' : 'text-amber-700',
    rose: isDarkMode ? 'text-rose-300' : 'text-rose-700',
    slate: isDarkMode ? 'text-white' : 'text-slate-900',
  }[accent] || (isDarkMode ? 'text-white' : 'text-slate-900');
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${accentColor}`}>{value}</p>
      {hint ? (
        <p className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{hint}</p>
      ) : null}
    </div>
  );
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
  const [showCharts, setShowCharts] = useState(false);

  const queryParams = useMemo(() => ({
    from: toApiIso(from),
    to: toApiIso(to),
  }), [from, to]);

  const summaryQuery = useQuery({
    queryKey: [...QUERY_KEY, queryParams],
    queryFn: async () => extractData(await getPlanPurchaseSummary(queryParams)),
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

  useEffect(() => {
    if (summaryQuery.error) showError(getErrorMessage(t, summaryQuery.error));
  }, [summaryQuery.error, t, showError]);

  useEffect(() => {
    if (buyersQuery.error) showError(getErrorMessage(t, buyersQuery.error));
  }, [buyersQuery.error, t, showError]);

  const plans = summaryQuery.data?.plans ?? [];
  const loading = summaryQuery.isLoading;
  const fetching = summaryQuery.isFetching;

  const chartData = useMemo(() => {
    return plans
      .map((row) => {
        const credit = Number(row?.creditRevenueVnd) || 0;
        const base = Number(row?.baseRevenueVnd) || 0;
        const revenue = Number(row?.revenueVnd) || 0;
        const cogs = Number(row?.aiProviderCostVnd) || 0;
        const margin = Number(row?.estimatedMarginVnd) || 0;
        const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
        return {
          name: row?.planCode || row?.planDisplayName || `#${row?.planCatalogId}`,
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
  }, [plans]);

  const totals = useMemo(() => {
    // Prefer server-computed totals (source of truth). Fallback to client reduce when
    // BE chua deploy hoac field con thieu — tranh hien NaN/undefined trong KPI.
    const summary = summaryQuery.data ?? {};
    const fromServer = summary.totalRevenueVnd != null
      || summary.totalBaseRevenueVnd != null
      || summary.totalCreditRevenueVnd != null;
    if (fromServer) {
      return {
        credit: Number(summary.totalCreditRevenueVnd) || 0,
        base: Number(summary.totalBaseRevenueVnd) || 0,
        revenue: Number(summary.totalRevenueVnd) || 0,
        cogs: Number(summary.totalAiProviderCostVnd) || 0,
        margin: Number(summary.totalEstimatedMarginVnd) || 0,
      };
    }
    return chartData.reduce(
      (acc, row) => ({
        credit: acc.credit + row.credit,
        base: acc.base + row.base,
        revenue: acc.revenue + row.revenue,
        cogs: acc.cogs + row.cogs,
        margin: acc.margin + row.margin,
      }),
      { credit: 0, base: 0, revenue: 0, cogs: 0, margin: 0 },
    );
  }, [chartData, summaryQuery.data]);

  const buyersPageData = buyersQuery.data ?? {};
  const buyers = Array.isArray(buyersPageData.content) ? buyersPageData.content : [];

  const openBuyers = (row) => {
    setBuyerPlanLabel(row?.planDisplayName || row?.planCode || `#${row?.planCatalogId}`);
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
        description={t(
          'planPurchases.subtitle',
          'Doanh thu là tổng tiền thanh toán gói (COMPLETED). Giá catalog = phần credit + giá gốc; COGS AI và biên vẫn theo snapshot plan trong cùng khoảng thời gian.',
        )}
        actions={(
          <div className="flex items-center gap-2">
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
          {chartData.length > 0 ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile
                isDarkMode={isDarkMode}
                label={t('planPurchases.kpi.baseRevenue', 'Tổng tiền gốc thu được')}
                value={formatVnd(totals.base)}
                hint={t('planPurchases.kpi.baseRevenueHint', 'Phần phí nền tảng (không quy đổi credit)')}
                accent="amber"
              />
              <KpiTile
                isDarkMode={isDarkMode}
                label={t('planPurchases.kpi.revenue', 'Tổng doanh thu gói')}
                value={formatVnd(totals.revenue)}
                hint={t('planPurchases.kpi.revenueHint', 'Tiền credit + tiền gốc')}
                accent="slate"
              />
              <KpiTile
                isDarkMode={isDarkMode}
                label={t('planPurchases.kpi.cogs', 'Tổng COGS AI')}
                value={formatVnd(totals.cogs)}
                hint={t('planPurchases.kpi.cogsHint', 'Chi phí AI ước tính khớp snapshot plan')}
                accent="rose"
              />
              <KpiTile
                isDarkMode={isDarkMode}
                label={t('planPurchases.kpi.margin', 'Biên ước lượng')}
                value={formatVnd(totals.margin)}
                hint={`${totals.revenue > 0 ? ((totals.margin / totals.revenue) * 100).toFixed(1) : '0.0'}% trên doanh thu`}
                accent={totals.margin >= 0 ? 'emerald' : 'rose'}
              />
            </div>
          ) : null}

          {chartData.length > 0 && showCharts ? (
            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <ChartCard
                isDarkMode={isDarkMode}
                title={t('planPurchases.chart.revenueSplit', 'Cơ cấu doanh thu theo gói')}
                subtitle={t('planPurchases.chart.revenueSplitHint', 'Mỗi cột = 1 gói; chia theo phần Credit và phần Gốc.')}
                summary={`${formatVnd(totals.revenue)} (${formatVnd(totals.credit)} credit · ${formatVnd(totals.base)} gốc)`}
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
                subtitle={t('planPurchases.chart.marginHint', 'Doanh thu trừ COGS AI. Đỏ = âm, xanh = dương.')}
                summary={`${formatVnd(totals.margin)} / ${formatVnd(totals.revenue)} (${
                  totals.revenue > 0 ? ((totals.margin / totals.revenue) * 100).toFixed(1) : '0.0'
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

          <div
            className={`overflow-hidden rounded-2xl border ${
              isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
          >
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
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className={`text-center py-10 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t('planPurchases.empty', 'Không có giao dịch gói trong khoảng đã chọn.')}
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((row) => {
                  const margin = Number(row?.estimatedMarginVnd);
                  const marginNeg = Number.isFinite(margin) && margin < 0;
                  return (
                    <TableRow key={row.planCatalogId} className={isDarkMode ? 'border-slate-800' : ''}>
                      <TableCell>
                        <div className="font-semibold">{row.planDisplayName || row.planCode || '—'}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          {row.planCode ? `${row.planCode} · ` : ''}
                          {formatScope(row.planScope)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{Number(row.purchaseCount || 0).toLocaleString('vi-VN')}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(row.distinctPayerCount || 0).toLocaleString('vi-VN')}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(row.baseRevenueVnd)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatVnd(row.revenueVnd)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(row.aiProviderCostVnd)}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          marginNeg ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {formatVnd(row.estimatedMarginVnd)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => openBuyers(row)}>
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
        </div>
        </>
      )}

      <Dialog open={buyerPlanId != null} onOpenChange={(open) => !open && closeBuyers()}>
        <DialogContent className={`max-w-3xl max-h-[85vh] overflow-y-auto ${isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle>{t('planPurchases.buyersTitle', 'Người thanh toán')}: {buyerPlanLabel}</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
              {t('planPurchases.buyersHint', 'Các giao dịch COMPLETED cho plan này trong khoảng lọc.')}
            </DialogDescription>
          </DialogHeader>
          {buyersQuery.isLoading ? (
            <ListSpinner />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t('planPurchases.buyers.email', 'Email')}</TableHead>
                    <TableHead>{t('planPurchases.buyers.amount', 'Số tiền')}</TableHead>
                    <TableHead>{t('planPurchases.buyers.type', 'Loại')}</TableHead>
                    <TableHead>{t('planPurchases.buyers.paidAt', 'Thanh toán')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        {t('planPurchases.buyersEmpty', 'Không có bản ghi.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    buyers.map((b) => (
                      <TableRow key={b.paymentId}>
                        <TableCell className="tabular-nums">{b.payerUserId}</TableCell>
                        <TableCell>
                          <div className="font-medium">{b.payerEmail || '—'}</div>
                          <div className="text-xs text-slate-500">{b.payerUsername}</div>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatVnd(b.amountVnd)}</TableCell>
                        <TableCell>{b.paymentTargetType || '—'}</TableCell>
                        <TableCell className="text-sm">{b.paidAt || b.recordedAt || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
    </SuperAdminPage>
  );
}
