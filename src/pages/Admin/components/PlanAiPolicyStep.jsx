import { AlertTriangle, CheckCircle2, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAiActionLabel,
  getAiModelGroupLabel,
} from '@/lib/aiModelCatalog';

function formatPolicyCost(policy, t) {
  if (!policy) return t('subscription.wizard.policy.noPolicy', 'No policy configured');
  const base = Number(policy.baseCreditCost ?? 0);
  const unit = Number(policy.unitCreditCost ?? 0);
  const size = Number(policy.unitSize ?? 0);
  if (unit > 0 && size > 0) return `${base} + ${unit}/${size} QMC`;
  return `${base} QMC`;
}

function PlanAiPolicyStep({
  aiActionPolicies = [],
  aiCoverage,
  isDarkMode,
  mutedCls,
  sectionCls,
  t,
}) {
  const policyByAction = new Map(
    aiActionPolicies.map((policy) => [policy.actionKey, policy])
  );
  const rows = aiCoverage?.rows ?? [];
  const missing = aiCoverage?.missing ?? [];

  return (
    <div className="space-y-6">
      <section className={sectionCls}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('subscription.wizard.policy.title', 'Cost and policy')}
            </h3>
            <p className={cn('mt-1 text-sm leading-6', mutedCls)}>
              {t(
                'subscription.wizard.policy.description',
                'Review AI action policy, model coverage, and missing configuration before publishing a paid plan.'
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className={cn('rounded-2xl border p-4', isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.policy.coverage', 'AI coverage')}
            </p>
            <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {aiCoverage?.covered ?? 0}/{aiCoverage?.total ?? 0}
            </p>
          </div>
          <div className={cn('rounded-2xl border p-4', isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.policy.missing', 'Missing models')}
            </p>
            <p className={cn('mt-2 text-2xl font-semibold', missing.length > 0 ? 'text-rose-500' : isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>
              {missing.length}
            </p>
          </div>
          <div className={cn('rounded-2xl border p-4', isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50')}>
            <p className={cn('text-xs font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.policy.activePolicies', 'Active policies')}
            </p>
            <p className={cn('mt-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {aiActionPolicies.filter((policy) => policy.isActive !== false).length}
            </p>
          </div>
        </div>

        {missing.length > 0 ? (
          <div className={cn('mt-5 rounded-2xl border px-4 py-3 text-sm', isDarkMode ? 'border-rose-400/25 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800')}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t(
                  'subscription.wizard.policy.missingHint',
                  'Paid plans cannot be published or activated until every enabled Core and Advanced AI action has an ACTIVE compatible model.'
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className={cn('mt-5 rounded-2xl border px-4 py-3 text-sm', isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('subscription.wizard.policy.coveredHint', 'All enabled AI actions have a compatible active model.')}</p>
            </div>
          </div>
        )}

        <div className={cn('mt-6 overflow-hidden rounded-2xl border', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
          <div className={cn('grid grid-cols-[minmax(220px,1fr)_160px_150px_130px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em]', isDarkMode ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-50 text-slate-500')}>
            <span>{t('subscription.wizard.policy.action', 'Action')}</span>
            <span>{t('subscription.wizard.policy.group', 'Group')}</span>
            <span>{t('subscription.wizard.policy.cost', 'Cost')}</span>
            <span>{t('subscription.wizard.policy.status', 'Status')}</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.map((row) => {
              const policy = policyByAction.get(row.actionKey);
              return (
                <div key={row.actionKey} className={cn('grid grid-cols-[minmax(220px,1fr)_160px_150px_130px] gap-3 px-4 py-3 text-sm', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>
                  <span className="font-semibold">{getAiActionLabel(row.actionKey, t)}</span>
                  <span>{getAiModelGroupLabel(row.modelGroup, t)}</span>
                  <span>{formatPolicyCost(policy, t)}</span>
                  <span className={row.covered ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
                    {row.covered ? t('subscription.wizard.policy.ready', 'Ready') : t('subscription.wizard.policy.missing', 'Missing')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default PlanAiPolicyStep;
