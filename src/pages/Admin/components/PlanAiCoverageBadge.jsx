import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildAiModelAssignmentMap,
  buildFunctionAssignmentMap,
  getPlanAiCoverage,
} from '@/lib/aiModelCatalog';

function PlanAiCoverageBadge({ plan, availableAiModels, isDarkMode, t }) {
  const coverage = getPlanAiCoverage({
    entitlement: plan?.entitlement ?? {},
    availableAiModels,
    functionAssignmentMap: buildFunctionAssignmentMap(plan?.aiFunctionAssignments ?? []),
    aiModelAssignments: buildAiModelAssignmentMap(plan?.aiModelAssignments ?? []),
  });
  const isPaid = Number(plan?.planLevel ?? 0) > 0 && Number(plan?.price ?? 0) > 0;
  const hasLegacyOverride = Array.isArray(plan?.aiModelOverrides) && plan.aiModelOverrides.length > 0;
  const Icon = coverage.isComplete ? CheckCircle2 : isPaid ? ShieldAlert : AlertTriangle;
  const tone = coverage.isComplete
    ? isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
    : isPaid
      ? isDarkMode ? 'bg-rose-500/10 text-rose-200' : 'bg-rose-50 text-rose-700'
      : isDarkMode ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-700';

  return (
    <div className="flex flex-col items-start gap-1">
      <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold', tone)}>
        <Icon className="h-3.5 w-3.5" />
        {coverage.covered}/{coverage.total}
      </span>
      {hasLegacyOverride ? (
        <span className={cn('text-[11px]', isDarkMode ? 'text-amber-300' : 'text-amber-600')}>
          {t('subscription.wizard.policy.legacyOverride', 'Legacy override')}
        </span>
      ) : null}
    </div>
  );
}

export default PlanAiCoverageBadge;
