import { AlertTriangle, Bot, CheckCircle2, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AI_MODEL_GROUP_OPTIONS,
  filterAiModelsForFeature,
  getAiActionLabel,
  getAiModelGroupLabel,
} from '@/lib/aiModelCatalog';

function PlanAiModelAssignmentsStep({
  aiCoverage,
  aiModelAssignments,
  availableAiModels,
  isDarkMode,
  mutedCls,
  sectionCls,
  selectCls,
  selectStyle,
  setAiModelAssignments,
  setFunctionAssignmentMap,
  t,
}) {
  const rows = aiCoverage?.rows ?? [];
  const groupedRows = AI_MODEL_GROUP_OPTIONS.map((group) => ({
    group,
    rows: rows.filter((row) => row.modelGroup === group.value),
  })).filter((item) => item.rows.length > 0);

  const handleActionAssignment = (actionKey, aiModelId) => {
    setFunctionAssignmentMap((prev) => ({ ...prev, [actionKey]: aiModelId }));
  };

  const handleBulkApply = (modelGroup) => {
    const selectedModelId = aiModelAssignments[modelGroup] ?? '';
    if (!selectedModelId) return;
    setFunctionAssignmentMap((prev) => {
      const next = { ...prev };
      rows
        .filter((row) => row.modelGroup === modelGroup)
        .forEach((row) => {
          next[row.actionKey] = selectedModelId;
        });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <section className={sectionCls}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('subscription.wizard.models.title', 'AI models by action')}
            </h3>
            <p className={cn('mt-1 text-sm leading-6', mutedCls)}>
              {t(
                'subscription.wizard.models.description',
                'Assign a compatible model to each enabled AI action. Group defaults can be bulk-applied, but action assignments are the primary plan payload.'
              )}
            </p>
          </div>
        </div>

        <div className={cn('mt-5 rounded-2xl border px-4 py-3 text-sm', isDarkMode ? 'border-blue-400/20 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-800')}>
          {t(
            'subscription.wizard.models.inactiveHint',
            'Models outside the ACTIVE state still appear for historical review, but cannot be newly selected.'
          )}
        </div>

        <div className="mt-6 space-y-5">
          {groupedRows.map(({ group, rows: groupRows }) => {
            const groupModels = availableAiModels.filter((model) => model.modelGroup === group.value);
            const selectedGroupModelId = aiModelAssignments[group.value] ?? '';
            const assignedCount = groupRows.filter((row) => row.covered).length;

            return (
              <div key={group.value} className={cn('rounded-2xl border', isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-white')}>
                <div className={cn('flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', group.softTone)}>
                      <Layers3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {getAiModelGroupLabel(group.value, t)}
                      </p>
                      <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                        {assignedCount}/{groupRows.length} {t('subscription.wizard.models.actionsCovered', 'actions covered')}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,280px)_auto]">
                    <select
                      value={selectedGroupModelId}
                      onChange={(event) => setAiModelAssignments((prev) => ({ ...prev, [group.value]: event.target.value }))}
                      className={selectCls}
                      style={selectStyle}
                    >
                      <option value="">{t('subscription.aiModels.noAssignment')}</option>
                      {groupModels.map((model) => (
                        <option
                          key={model.aiModelId}
                          value={model.aiModelId}
                          disabled={model.status !== 'ACTIVE' && String(model.aiModelId) !== String(selectedGroupModelId)}
                        >
                          {model.displayName} ({model.provider} / {model.modelCode}){model.status !== 'ACTIVE' ? ` - ${model.status}` : ''}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selectedGroupModelId}
                      onClick={() => handleBulkApply(group.value)}
                      className={cn('mt-1.5 h-11 rounded-full cursor-pointer', isDarkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : '')}
                    >
                      {t('subscription.wizard.models.bulkApply', 'Apply to actions')}
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {groupRows.map((row) => {
                    const actionModels = filterAiModelsForFeature(row, availableAiModels);
                    const selectedActionModelId = row.source === 'ACTION' ? row.selectedModelId : '';
                    return (
                      <div key={row.actionKey} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,360px)_120px] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                              {getAiActionLabel(row.actionKey, t)}
                            </p>
                            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', row.category === 'CORE'
                              ? isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                              : isDarkMode ? 'bg-violet-500/10 text-violet-200' : 'bg-violet-50 text-violet-700')}
                            >
                              {row.category}
                            </span>
                          </div>
                          <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                            {row.entitlementKey
                              ? t('subscription.wizard.models.entitlementKey', {
                                key: row.entitlementKey,
                                defaultValue: 'Entitlement: {{key}}',
                              })
                              : t('subscription.wizard.models.coreAlwaysOn', 'Core action, always enabled.')}
                          </p>
                        </div>

                        <select
                          value={selectedActionModelId}
                          onChange={(event) => handleActionAssignment(row.actionKey, event.target.value)}
                          className={selectCls}
                          style={selectStyle}
                        >
                          <option value="">{t('subscription.wizard.models.useGroupDefault', 'Use group default')}</option>
                          {actionModels.map((model) => (
                            <option
                              key={model.aiModelId}
                              value={model.aiModelId}
                              disabled={model.status !== 'ACTIVE' && String(model.aiModelId) !== String(selectedActionModelId)}
                            >
                              {model.displayName} ({model.provider} / {model.modelCode}){model.status !== 'ACTIVE' ? ` - ${model.status}` : ''}
                            </option>
                          ))}
                        </select>

                        <div className="flex justify-start lg:justify-end">
                          {row.covered ? (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {row.source === 'ACTION' ? 'Action' : 'Group'}
                            </span>
                          ) : (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-rose-500/10 text-rose-200' : 'bg-rose-50 text-rose-700')}>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {t('subscription.wizard.models.missing', 'Missing')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default PlanAiModelAssignmentsStep;
