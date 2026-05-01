import { Check, User, Users, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

export default function PlanDetailDialog({
  open,
  onOpenChange,
  plan,
  isDarkMode,
  t,
  locale,
  formatCurrency,
  getScopeLabel,
  isActive,
  entitlementToggles,
  aiModelGroupOptions,
  getAssignedModelForPlan,
}) {
  const dk = isDarkMode;
  const sectionCls = `rounded-xl border p-4 ${dk ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/90 border-slate-200'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className={`max-w-4xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden ${dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'}`}>
        {plan && (
          <>
            <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    plan.planScope === 'WORKSPACE'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                  } shadow-lg`}>
                    {plan.planScope === 'WORKSPACE' ? <Users className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>{plan.displayName}</h3>
                    <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('subscription.detail.planType', {
                        scope: getScopeLabel(plan.planScope, t),
                        defaultValue: '{{scope}} plan',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isActive(plan.status)
                    ? dk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    : dk ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isActive(plan.status) ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                  {plan.status}
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('subscription.table.price'), value: formatCurrency(plan.price, t, locale), color: dk ? 'text-emerald-400' : 'text-emerald-600' },
                  { label: t('subscription.table.scope', 'Scope'), value: getScopeLabel(plan.planScope, t), color: dk ? 'text-blue-400' : 'text-blue-600' },
                  { label: t('subscription.table.level', 'Level'), value: plan.planLevel ?? '-', color: dk ? 'text-amber-400' : 'text-amber-600' },
                ].map((item) => (
                  <div key={item.label} className={`p-3.5 rounded-xl text-center ${dk ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-100'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                    <p className={`font-bold mt-1 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {plan.entitlement && (
                <div className={sectionCls}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {t('subscription.detail.entitlement', 'Entitlement')}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                    <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                      <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace')}
                      </span>
                      <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{plan.entitlement.maxIndividualWorkspace ?? '—'}</span>
                    </div>
                    <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                      <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')}
                      </span>
                      <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{plan.entitlement.maxMaterialInWorkspace ?? '—'}</span>
                    </div>
                    <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                      <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('subscription.detail.planIncludedCredits', 'Included credits')}
                      </span>
                      <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{plan.entitlement.planIncludedCredits ?? 0}</span>
                    </div>
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>
                    {t('subscription.detail.features', 'Features')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(entitlementToggles).map(([key, meta]) => {
                      const enabled = plan.entitlement[key];
                      const Icon = meta.icon;
                      return (
                        <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                          enabled
                            ? dk ? 'bg-white/[0.04]' : 'bg-emerald-50/80'
                            : dk ? 'opacity-40' : 'opacity-40'
                        }`}>
                          {enabled ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                          <Icon className={`w-4 h-4 flex-shrink-0 ${enabled ? 'text-blue-400' : dk ? 'text-slate-600' : 'text-slate-300'}`} />
                          <span className={`text-sm font-medium ${
                            enabled ? dk ? 'text-white' : 'text-slate-700' : dk ? 'text-slate-600 line-through' : 'text-slate-400 line-through'
                          }`}>{t(meta.labelKey, meta.defaultLabel)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={sectionCls}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>
                  {t('subscription.aiModels.title')}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {aiModelGroupOptions.map((group) => {
                    const assignedModel = getAssignedModelForPlan(plan, group.value);
                    return (
                      <div
                        key={group.value}
                        className={`rounded-xl border px-4 py-3 ${dk ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-white'}`}
                      >
                        <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>
                          {t(group.labelKey)}
                        </p>
                        {assignedModel ? (
                          <>
                            <p className={`mt-2 text-sm font-medium ${dk ? 'text-slate-200' : 'text-slate-700'}`}>
                              {assignedModel.displayName || assignedModel.modelCode || `#${assignedModel.aiModelId}`}
                            </p>
                            <p className={`mt-1 text-xs ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                              {assignedModel.provider || '-'} / {assignedModel.modelCode || `#${assignedModel.aiModelId}`}
                            </p>
                          </>
                        ) : (
                          <p className={`mt-2 text-sm italic ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t('subscription.aiModels.noAssignment')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
