import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

const TOP_COLOR = '#f59e0b';
const REST_COLOR_LIGHT = '#94a3b8';
const REST_COLOR_DARK = '#475569';

const RANK_COLORS = [
  '#f59e0b', // 01 — amber
  '#fb7185', // 02 — rose
  '#facc15', // 03 — yellow
  '#10b981', // 04 — emerald
  '#0ea5e9', // 05 — sky
];

function getRankColor(rank, isDarkMode) {
  if (rank < RANK_COLORS.length) return RANK_COLORS[rank];
  return isDarkMode ? REST_COLOR_DARK : REST_COLOR_LIGHT;
}

function getDayCountLabel(from, to) {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return diff;
}

function TopFeaturesByCostCard({
  topFeatures = [],
  isDarkMode = false,
  title,
  subtitle,
  emptyText,
  scopeRange = null,
  defaultScopeLabel,
  legendTopLabel,
  legendOtherLabel,
  legendUnitLabel,
  totalLabel,
  rankColumnLabel = '#',
  featureColumnLabel,
  costColumnLabel,
  shareColumnLabel,
  formatVnd,
  formatInteger,
  getFeatureLabel,
  requestSuffixLabel,
  className = '',
}) {
  const data = topFeatures.map((feature, idx) => ({
    ...feature,
    rank: idx,
    label: getFeatureLabel(feature.featureKey),
  }));
  const total = data.reduce((sum, feature) => sum + Number(feature.providerCostVnd || 0), 0);
  const dayCount = scopeRange ? getDayCountLabel(scopeRange.from, scopeRange.to) : null;
  const scopeChips = [
    dayCount ? `${dayCount} ${defaultScopeLabel.day}` : defaultScopeLabel.all,
    `${data.length} ${defaultScopeLabel.feature}`,
  ];

  const headerStroke = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const cardSurface = isDarkMode
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white shadow-sm';
  const restColor = isDarkMode ? REST_COLOR_DARK : REST_COLOR_LIGHT;

  return (
    <div className={`rounded-2xl border ${cardSurface} ${className}`}>
      <div className={`flex flex-wrap items-start justify-between gap-3 border-b p-5 ${headerStroke}`}>
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {title}
          </h3>
          {subtitle ? (
            <p className={`mt-0.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {scopeChips.map((chip, idx) => (
            <span
              key={`scope-${idx}`}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col justify-center gap-4">
            <div className="relative mx-auto h-[460px] w-full max-w-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <RechartsTooltip
                    contentStyle={{
                      background: isDarkMode ? '#0f172a' : '#fff',
                      border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(value, _name, item) => [
                      `${formatVnd(value)} · ${formatInteger(item?.payload?.requestCount)} ${requestSuffixLabel}`,
                      item?.payload?.label,
                    ]}
                  />
                  <Pie
                    data={data}
                    dataKey="providerCostVnd"
                    nameKey="label"
                    innerRadius={130}
                    outerRadius={215}
                    paddingAngle={1.5}
                    stroke={isDarkMode ? '#0f172a' : '#fff'}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {data.map((entry, idx) => (
                      <Cell key={`tf-pie-${entry.featureKey}`} fill={getRankColor(idx, isDarkMode)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {totalLabel}
                </span>
                <span className={`mt-1 text-lg font-bold tabular-nums ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                  {formatVnd(total)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: TOP_COLOR }} />
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{legendTopLabel}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: restColor }} />
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{legendOtherLabel}</span>
                </span>
              </div>
              <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>{legendUnitLabel}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div
              className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto_5.5rem] items-center gap-3 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <span>{rankColumnLabel}</span>
              <span>{featureColumnLabel}</span>
              <span className="text-right">{costColumnLabel}</span>
              <span className="text-right">{shareColumnLabel}</span>
            </div>
            <ul className="flex flex-1 flex-col justify-between gap-1.5">
              {data.map((feature, idx) => {
                const share = total > 0 ? (Number(feature.providerCostVnd || 0) / total) * 100 : 0;
                const isTop3 = idx <= 2;
                const dotColor = getRankColor(idx, isDarkMode);
                return (
                  <li
                    key={feature.featureKey}
                    className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto_5.5rem] items-center gap-3 rounded-xl px-3 py-3 text-xs transition-colors ${
                      isTop3
                        ? isDarkMode
                          ? 'bg-amber-950/30'
                          : 'bg-amber-50/70'
                        : ''
                    }`}
                  >
                    <span
                      className={`tabular-nums font-semibold ${
                        isTop3
                          ? isDarkMode
                            ? 'text-amber-300'
                            : 'text-amber-700'
                          : isDarkMode
                          ? 'text-slate-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: dotColor }}
                      />
                      <span
                        className={`truncate font-medium ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-800'
                        }`}
                        title={feature.label}
                      >
                        {feature.label}
                      </span>
                    </span>
                    <span
                      className={`text-right tabular-nums font-semibold ${
                        isDarkMode ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      {formatVnd(feature.providerCostVnd)}
                    </span>
                    <span className="flex items-center justify-end gap-1.5">
                      <span
                        className={`relative h-1.5 w-8 overflow-hidden rounded-full ${
                          isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${Math.min(100, share)}%`, background: dotColor }}
                        />
                      </span>
                      <span
                        className={`tabular-nums ${
                          isTop3
                            ? isDarkMode
                              ? 'text-amber-300'
                              : 'text-amber-600'
                            : isDarkMode
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {share.toFixed(1)}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div
              className={`mt-3 flex items-center justify-between border-t px-3 pt-3 text-xs ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {totalLabel}
              </span>
              <span
                className={`text-base font-bold tabular-nums ${
                  isDarkMode ? 'text-amber-300' : 'text-amber-600'
                }`}
              >
                {formatVnd(total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopFeaturesByCostCard;
