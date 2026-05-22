import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { getRevenueTimeseries } from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';

const TARGET_TYPE_KEYS = {
  USER_PLAN: 'userPlanVnd',
  WORKSPACE_PLAN: 'workspacePlanVnd',
  USER_CREDIT: 'userCreditVnd',
  WORKSPACE_CREDIT: 'workspaceCreditVnd',
  WORKSPACE_SLOT: 'workspaceSlotVnd',
};

function extractData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function formatVnd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

function formatPct(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function buildIso(daysAgo) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export default function RevenueSparkline({
  targetTypes = ['USER_PLAN', 'WORKSPACE_PLAN', 'USER_CREDIT', 'WORKSPACE_CREDIT', 'WORKSPACE_SLOT'],
  days = 30,
  color = '#0455BF',
  height = 64,
  width = 220,
  label,
  className = '',
}) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const params = useMemo(() => ({
    from: buildIso(days),
    to: new Date().toISOString(),
    bucket: 'DAY',
  }), [days]);

  const queryKey = useMemo(
    () => ['revenueSparkline', { ...params, targets: targetTypes.slice().sort().join(',') }],
    [params, targetTypes],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => extractData(await getRevenueTimeseries(params)),
    staleTime: 60_000,
  });

  const chartData = useMemo(() => {
    const points = data?.points ?? [];
    return points.map((p) => {
      const sum = targetTypes.reduce((acc, type) => {
        const key = TARGET_TYPE_KEYS[type];
        return acc + (Number(p[key]) || 0);
      }, 0);
      return { bucket: p.bucket, value: sum };
    });
  }, [data, targetTypes]);

  const total = useMemo(
    () => chartData.reduce((acc, p) => acc + p.value, 0),
    [chartData],
  );

  const growthPct = useMemo(() => {
    if (chartData.length < 2) return null;
    const half = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, half).reduce((acc, p) => acc + p.value, 0);
    const secondHalf = chartData.slice(half).reduce((acc, p) => acc + p.value, 0);
    if (firstHalf <= 0) return secondHalf > 0 ? null : 0;
    return ((secondHalf - firstHalf) / firstHalf) * 100;
  }, [chartData]);

  const positive = growthPct === null ? null : growthPct >= 0;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 ${className}`} style={{ minWidth: width }}>
        <div className={`h-${Math.round(height / 4)} w-full animate-pulse rounded-md ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col items-end">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label || t('revenue.sparkline.label', '30 ngày gần nhất')}
        </p>
        <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatVnd(total)}</p>
        {positive !== null ? (
          <span
            className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${
              positive
                ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-700')
                : (isDarkMode ? 'text-rose-300' : 'text-rose-700')
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPct(growthPct)}
            <span className="ml-1 text-slate-400">{t('revenue.sparkline.halfvsHalf', '½ sau vs ½ trước')}</span>
          </span>
        ) : null}
      </div>
      <div style={{ width, height }}>
        {chartData.length === 0 ? (
          <div className={`flex h-full w-full items-center justify-center rounded-md text-[10px] ${isDarkMode ? 'bg-slate-800/50 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
            {t('revenue.sparkline.empty', 'Chưa đủ data')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.45} />
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
                formatter={(v) => [formatVnd(v), t('revenue.legend.total', 'Tổng')]}
                labelStyle={{ display: 'none' }}
                cursor={{ stroke: isDarkMode ? '#475569' : '#94a3b8', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#spark-${color.replace('#', '')})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
