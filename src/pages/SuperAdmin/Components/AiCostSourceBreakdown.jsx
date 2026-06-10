import { cn } from '@/lib/utils';
import {
  canonicalPlanNameToken,
  inferGroupPlanTokenFromDisplayName,
} from '@/pages/Users/Group/utils/groupPlanLabel';

const KNOWN_GROUP_PLAN_TOKENS = new Set(['TEAM', 'GROUP_BASE', 'GROUP', 'GROUP_WORKSPACE']);

function toMetricNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFreePlanRow(row = {}) {
  const planText = [
    row?.planCode,
    row?.planName,
    row?.planDisplayName,
    row?.planLevel,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toUpperCase();

  return /\bFREE\b|MIEN PHI|MIỄN PHÍ/.test(planText);
}

function hasWorkspaceCharge(row = {}) {
  const workspaceId = row?.chargedWorkspaceId ?? row?.workspaceId ?? row?.groupWorkspaceId;
  return workspaceId != null && String(workspaceId).trim() !== '';
}

function isWorkspaceChargeScope(row = {}) {
  return String(row?.chargeScope || '').toUpperCase() === 'WORKSPACE';
}

function isUserChargeScope(row = {}) {
  return String(row?.chargeScope || '').toUpperCase() === 'USER';
}

function isGroupPlanScope(row = {}) {
  const scope = String(row?.planScope || '').toUpperCase();
  return scope === 'WORKSPACE' || scope === 'GROUP' || scope === 'GROUP_WORKSPACE';
}

function isUserPlanScope(row = {}) {
  const scope = String(row?.planScope || '').toUpperCase();
  return scope === 'USER' || scope === 'INDIVIDUAL';
}

function isKnownGroupPlanByCatalog(row = {}) {
  if (isUserPlanScope(row)) return false;

  const tokens = [
    canonicalPlanNameToken(row?.planCode),
    canonicalPlanNameToken(row?.planDisplayName),
    inferGroupPlanTokenFromDisplayName(row?.planDisplayName),
  ].filter(Boolean);

  return tokens.some((token) => KNOWN_GROUP_PLAN_TOKENS.has(token));
}

export function resolveAiCostAudience(row = {}) {
  if (isFreePlanRow(row)) return 'freeUser';

  const hasPlan = Boolean(row?.planCatalogId || row?.planDisplayName || row?.planCode);
  if (!hasPlan) return 'freeUser';

  if (hasWorkspaceCharge(row) || isWorkspaceChargeScope(row)) return 'groupPlan';
  if (isUserChargeScope(row)) return 'userPlan';
  if (isGroupPlanScope(row)) return 'groupPlan';
  if (isKnownGroupPlanByCatalog(row)) return 'groupPlan';

  return 'userPlan';
}

export const resolveAiCostSource = resolveAiCostAudience;

export function getAiCostSourceMetrics(summary = {}) {
  const totalProviderCostVnd = toMetricNumber(summary?.totalProviderCostVnd);
  const totalChargedVnd = toMetricNumber(summary?.totalChargedVnd);
  const totalProfitVnd = toMetricNumber(summary?.totalProfitVnd);
  const freeUserProviderCostVnd = toMetricNumber(summary?.freeUserProviderCostVnd);
  const userPlanProviderCostVnd = toMetricNumber(summary?.userPlanProviderCostVnd);
  const groupPlanProviderCostVnd = toMetricNumber(summary?.groupPlanProviderCostVnd);
  const freeUserChargedVnd = toMetricNumber(summary?.freeUserChargedVnd);
  const userPlanChargedVnd = toMetricNumber(summary?.userPlanChargedVnd);
  const groupPlanChargedVnd = toMetricNumber(summary?.groupPlanChargedVnd);
  const userPlanProfitVnd = toMetricNumber(summary?.userPlanProfitVnd);
  const groupPlanProfitVnd = toMetricNumber(summary?.groupPlanProfitVnd);
  const freeUserProfitVnd = toMetricNumber(summary?.freeUserProfitVnd);

  const hasProfitSegments = summary?.userPlanProfitVnd != null
    || summary?.groupPlanProfitVnd != null
    || summary?.freeUserProfitVnd != null;
  const freeUserProfitImpactVnd = hasProfitSegments
    ? freeUserProfitVnd
    : -freeUserProviderCostVnd;
  const userPlanMarginVnd = hasProfitSegments
    ? userPlanProfitVnd
    : userPlanChargedVnd - userPlanProviderCostVnd;
  const groupPlanMarginVnd = hasProfitSegments
    ? groupPlanProfitVnd
    : groupPlanChargedVnd - groupPlanProviderCostVnd;
  const profitSegmentTotalVnd = userPlanMarginVnd + groupPlanMarginVnd + freeUserProfitImpactVnd;
  const costSegmentTotalVnd = freeUserProviderCostVnd + userPlanProviderCostVnd + groupPlanProviderCostVnd;

  return {
    totalProviderCostVnd,
    totalChargedVnd,
    totalProfitVnd,
    freeUserProviderCostVnd,
    userPlanProviderCostVnd,
    groupPlanProviderCostVnd,
    freeUserChargedVnd,
    userPlanChargedVnd,
    groupPlanChargedVnd,
    freeUserProfitImpactVnd,
    userPlanMarginVnd,
    groupPlanMarginVnd,
    profitSegmentTotalVnd,
    costSegmentTotalVnd,
  };
}

const AUDIENCE_META = {
  freeUser: {
    labelKey: 'aiCosts.audience.freeUser',
    labelFallback: 'User free',
    hintKey: 'aiCosts.audience.freeUserHint',
    hintFallback: 'Khong co goi tra phi',
    dotClass: 'bg-rose-500',
    lightClass: 'border-rose-200 bg-rose-50 text-rose-800',
    darkClass: 'border-rose-700/70 bg-rose-950/40 text-rose-200',
  },
  userPlan: {
    labelKey: 'aiCosts.audience.userPlan',
    labelFallback: 'Goi ca nhan',
    hintKey: 'aiCosts.audience.userPlanHint',
    hintFallback: 'Goi ca nhan (USER)',
    dotClass: 'bg-sky-500',
    lightClass: 'border-sky-200 bg-sky-50 text-sky-800',
    darkClass: 'border-sky-700/70 bg-sky-950/40 text-sky-200',
  },
  groupPlan: {
    labelKey: 'aiCosts.audience.groupPlan',
    labelFallback: 'Goi nhom',
    hintKey: 'aiCosts.audience.groupPlanHint',
    hintFallback: 'Goi nhom WORKSPACE',
    dotClass: 'bg-violet-500',
    lightClass: 'border-violet-200 bg-violet-50 text-violet-800',
    darkClass: 'border-violet-700/70 bg-violet-950/40 text-violet-200',
  },
};

export function AiCostSourceBadge({ source, isDarkMode = false, t }) {
  const meta = AUDIENCE_META[source] || AUDIENCE_META.freeUser;

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        isDarkMode ? meta.darkClass : meta.lightClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
      {t(meta.labelKey, meta.labelFallback)}
    </span>
  );
}

function AudienceMetric({ audience, value, percent, formatVnd, isDarkMode, t }) {
  const meta = AUDIENCE_META[audience];

  return (
    <div className={cn(
      'rounded-2xl border p-4',
      isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn('flex items-center gap-2 text-xs font-bold', isDarkMode ? 'text-slate-100' : 'text-slate-900')}>
            <span className={cn('h-2 w-2 rounded-full', meta.dotClass)} />
            {t(meta.labelKey, meta.labelFallback)}
          </div>
          <p className={cn('mt-1 text-[11px]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t(meta.hintKey, meta.hintFallback)}
          </p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums', isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-500')}>
          {percent}
        </span>
      </div>
      <p className={cn('mt-4 text-lg font-black tabular-nums', isDarkMode ? 'text-white' : 'text-slate-900')}>
        {formatVnd(value)}
      </p>
    </div>
  );
}

export default function AiCostSourceBreakdown({
  summary,
  headlineProviderCostVnd,
  formatVnd,
  isDarkMode = false,
  t,
}) {
  const metrics = getAiCostSourceMetrics(summary);
  const segmentTotal = metrics.costSegmentTotalVnd;
  const headlineTotal = headlineProviderCostVnd != null
    ? toMetricNumber(headlineProviderCostVnd)
    : segmentTotal;
  const total = headlineTotal > 0 ? headlineTotal : segmentTotal;
  const percent = (value) => `${total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'}%`;
  const audiences = [
    { audience: 'freeUser', value: metrics.freeUserProviderCostVnd },
    { audience: 'userPlan', value: metrics.userPlanProviderCostVnd },
    { audience: 'groupPlan', value: metrics.groupPlanProviderCostVnd },
  ];

  return (
    <div className={cn(
      'rounded-2xl border p-5',
      isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm',
    )}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={cn('text-xs font-semibold uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-400')}>
            {t('aiCosts.sourceBreakdown.eyebrow', 'Nguon phat sinh AI cost')}
          </p>
          <h3 className={cn('mt-1 text-base font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
            {t('aiCosts.sourceBreakdown.title', 'Tach theo loai nguoi dung')}
          </h3>
          <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('aiCosts.sourceBreakdown.subtitle', 'Free, user co goi ca nhan va goi nhom.')}
          </p>
        </div>
        <div className={cn('rounded-xl px-3 py-2 text-right text-xs', isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-600')}>
          <p className="font-semibold">{t('aiCosts.sourceBreakdown.totalCost', 'Tong AI cost')}</p>
          <p className="mt-0.5 font-black tabular-nums">{formatVnd(total)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {audiences.map((item) => (
          <AudienceMetric
            key={item.audience}
            audience={item.audience}
            value={item.value}
            percent={percent(item.value)}
            formatVnd={formatVnd}
            isDarkMode={isDarkMode}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
