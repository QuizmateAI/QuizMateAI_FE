import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Coins,
  Layers3,
  Lock,
  ShieldCheck,
  Sparkles,
  Wand2,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  AI_MODEL_GROUP_OPTIONS,
  filterAiModelsForAction,
  getAiActionAllowedProviders,
  getAiActionLabel,
  groupAiActionsByModelGroup,
} from '@/lib/aiModelCatalog';

const WIZARD_STEPS = [
  {
    id: 'basic',
    titleKey: 'subscription.wizard.steps.basic.title',
    descriptionKey: 'subscription.wizard.steps.basic.description',
    icon: Layers3,
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'entitlement',
    titleKey: 'subscription.wizard.steps.entitlement.title',
    descriptionKey: 'subscription.wizard.steps.entitlement.description',
    icon: ShieldCheck,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'models',
    titleKey: 'subscription.wizard.steps.models.title',
    descriptionKey: 'subscription.wizard.steps.models.description',
    icon: Bot,
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    id: 'review',
    titleKey: 'subscription.wizard.steps.review.title',
    descriptionKey: 'subscription.wizard.steps.review.description',
    icon: Sparkles,
    accent: 'from-amber-400 to-orange-500',
  },
];

const USER_PLAN_LEVEL_OPTIONS = ['0', '1', '2'];

const DARK_SELECT_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
};

function formatCurrency(value, t, locale) {
  const amount = Number(value) || 0;
  if (amount === 0) return t('subscription.free');
  return `${amount.toLocaleString(locale)} VND`;
}

function getScopeLabel(scope, t) {
  return scope === 'WORKSPACE'
    ? t('subscription.scope.workspace', 'Group workspace')
    : t('subscription.scope.user', 'User');
}

function getModelById(models, modelId) {
  if (!modelId) return null;
  return models.find((model) => String(model.aiModelId) === String(modelId)) ?? null;
}

function PlanFormWizard({
  open,
  onOpenChange,
  isDarkMode,
  t,
  locale,
  editingPlan,
  isSubmitting,
  formData,
  setFormData,
  entitlement,
  setEntitlement,
  entitlementToggles,
  aiModelAssignments,
  setAiModelAssignments,
  functionAssignmentMap,
  setFunctionAssignmentMap,
  availableAiModels,
  onSubmit,
  onValidationError,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const showPlanLevel = formData.planScope !== 'WORKSPACE';
  const steps = useMemo(
    () => WIZARD_STEPS.map((step) => ({
      ...step,
      title: t(step.titleKey),
      description: t(step.descriptionKey),
    })),
    [t]
  );

  const activeStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const inputCls = cn(
    'mt-1.5 h-11 rounded-2xl transition-colors duration-200',
    isDarkMode
      ? 'bg-slate-950/70 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
  );

  const textareaCls = cn(
    'mt-1.5 min-h-[120px] w-full rounded-[24px] border px-4 py-3 text-sm outline-none transition-colors duration-200 resize-none',
    isDarkMode
      ? 'border-white/10 bg-slate-950/70 text-white placeholder:text-white/30 focus:border-blue-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
  );

  const selectCls = cn(
    'mt-1.5 h-11 w-full rounded-2xl border px-3 text-sm transition-colors duration-200 cursor-pointer pr-9 appearance-none bg-no-repeat bg-[length:1.25rem] bg-[right_0.75rem_center]',
    isDarkMode
      ? 'bg-slate-950/70 border-white/10 text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
  );

  const sectionCls = cn(
    'rounded-[28px] border p-5 sm:p-6',
    isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
  );

  const mutedCls = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const borderCls = isDarkMode ? 'border-white/[0.08]' : 'border-slate-200';
  const selectStyle = isDarkMode ? DARK_SELECT_STYLE : undefined;

  const enabledFeatures = useMemo(
    () => Object.entries(entitlementToggles).filter(([key]) => Boolean(entitlement[key])),
    [entitlement, entitlementToggles]
  );

  const assignedModels = useMemo(
    () => AI_MODEL_GROUP_OPTIONS.map((group) => ({
      group,
      assignedModelId: aiModelAssignments[group.value] ?? '',
      model: getModelById(availableAiModels, aiModelAssignments[group.value]),
    })),
    [aiModelAssignments, availableAiModels]
  );

  const assignedOverrides = useMemo(
    () => Object.entries(functionAssignmentMap)
      .filter(([, modelId]) => Boolean(modelId))
      .map(([actionKey, modelId]) => ({
        actionKey,
        label: getAiActionLabel(actionKey, t),
        model: getModelById(availableAiModels, modelId),
      })),
    [availableAiModels, functionAssignmentMap, t]
  );

  const resolvedPlanLevel = showPlanLevel
    ? (USER_PLAN_LEVEL_OPTIONS.includes(String(formData.planLevel ?? ''))
      ? String(formData.planLevel ?? '')
      : (USER_PLAN_LEVEL_OPTIONS[0] ?? ''))
    : '';

  useEffect(() => {
    if (!showPlanLevel || editingPlan) return;
    if (formData.planLevel === resolvedPlanLevel) return;
    setFormData((prev) => ({ ...prev, planLevel: resolvedPlanLevel }));
  }, [showPlanLevel, editingPlan, formData.planLevel, resolvedPlanLevel, setFormData]);

  const checklist = [
    {
      label: t('subscription.wizard.checklist.code', 'Plan code'),
      done: Boolean(formData.code?.trim()),
      value: formData.code?.trim() || t('subscription.wizard.empty', 'Not entered'),
    },
    {
      label: t('subscription.wizard.checklist.displayName', 'Display name'),
      done: Boolean(formData.displayName?.trim()),
      value: formData.displayName?.trim() || t('subscription.wizard.empty', 'Not entered'),
    },
    {
      label: t('subscription.wizard.checklist.enabledFeatures', 'Enabled features'),
      done: enabledFeatures.length > 0,
      value: t('subscription.wizard.checklist.enabledFeaturesValue', {
        count: enabledFeatures.length,
        defaultValue: '{{count}} features',
      }),
    },
    {
      label: t('subscription.wizard.checklist.assignedModels', 'Assigned AI models'),
      done: assignedModels.some((item) => item.assignedModelId),
      value: t('subscription.wizard.checklist.assignedModelsValue', {
        assigned: assignedModels.filter((item) => item.assignedModelId).length,
        total: assignedModels.length,
        defaultValue: '{{assigned}}/{{total}} groups',
      }),
    },
  ];

  const handleDialogOpenChange = (nextOpen) => {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const getValidationError = () => {
    if (currentStep !== 0) return null;
    if (!formData.code?.trim()) return t('subscription.validation.codeRequired', 'Please enter a plan code.');
    if (!formData.displayName?.trim()) return t('subscription.validation.displayNameRequired', 'Please enter a plan name.');
    return null;
  };

  const handleNext = () => {
    const validationError = getValidationError();
    if (validationError) {
      onValidationError(validationError);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleInternalSubmit = (event) => {
    if (!isLastStep) {
      event.preventDefault();
      handleNext();
      return;
    }
    onSubmit(event);
  };

  const renderStepHeader = (Icon, title, description, accentClass) => (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
          accentClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className={cn('text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{title}</h3>
        <p className={cn('mt-1 text-sm leading-6', mutedCls)}>{description}</p>
      </div>
    </div>
  );

  const renderBasicStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Layers3,
          t('subscription.wizard.basic.title', 'Set up the plan'),
          t('subscription.wizard.basic.description', 'Start by defining the plan identity and scope.'),
          'from-cyan-500 to-blue-600'
        )}

        {editingPlan ? (
          <div
            className={cn(
              'mt-5 rounded-[22px] border px-4 py-3 text-sm',
              isDarkMode ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800'
            )}
          >
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t(
                  'subscription.wizard.basic.editingLocked',
                  'Code and scope stay locked while editing to avoid drifting from the active catalog.'
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            {
              value: 'USER',
              title: t('subscription.scope.userPlan', 'User plan'),
              description: t('subscription.scope.userPlanDescription', 'For individual accounts, onboarding, and solo learning flows.'),
              icon: User,
            },
            {
              value: 'WORKSPACE',
              title: t('subscription.scope.workspacePlan', 'Group workspace plan'),
              description: t('subscription.scope.workspacePlanDescription', 'For team workspaces, collaboration, and shared resources.'),
              icon: Users,
            },
          ].map((scopeOption) => {
            const Icon = scopeOption.icon;
            const active = formData.planScope === scopeOption.value;
            return (
              <button
                key={scopeOption.value}
                type="button"
                disabled={Boolean(editingPlan)}
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  planScope: scopeOption.value,
                  planLevel: scopeOption.value === 'WORKSPACE'
                    ? ''
                    : (USER_PLAN_LEVEL_OPTIONS.includes(String(prev.planLevel ?? ''))
                      ? String(prev.planLevel ?? '')
                      : (USER_PLAN_LEVEL_OPTIONS[0] ?? '')),
                }))}
                className={cn(
                  'rounded-[24px] border p-4 text-left transition-all',
                  Boolean(editingPlan) && 'cursor-not-allowed opacity-70',
                  active
                    ? isDarkMode
                      ? 'border-transparent bg-gradient-to-br from-cyan-500/80 to-blue-600 text-white shadow-lg shadow-cyan-950/25'
                      : 'border-transparent bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200/80'
                    : isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30 hover:bg-white/[0.06]'
                      : 'border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/70'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl',
                        active
                          ? 'bg-white/15 text-white'
                          : isDarkMode
                            ? 'bg-slate-900/70 text-cyan-300'
                            : 'bg-white text-cyan-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{scopeOption.title}</p>
                      <p className={cn('mt-1 text-xs leading-5', active ? 'text-white/85' : mutedCls)}>
                        {scopeOption.description}
                      </p>
                    </div>
                  </div>
                  {active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ChevronRight className={cn('h-4 w-4 shrink-0', mutedCls)} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('subscription.wizard.fields.code', 'Plan code')} *
            </Label>
            <Input
              required
              disabled={Boolean(editingPlan)}
              value={formData.code}
              onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="BASIC, PRO, TEAM..."
              className={inputCls}
            />
          </div>
          <div>
            <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('subscription.wizard.fields.displayName', 'Display name')} *
            </Label>
            <Input
              required
              value={formData.displayName}
              onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
              placeholder={t('subscription.wizard.fields.displayNamePlaceholder', 'Example: Individual Pro, Team Growth...')}
              className={inputCls}
            />
          </div>
          {showPlanLevel ? (
            <div>
              <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                {t('subscription.table.level', 'Level')}
              </Label>
              <select
                disabled={Boolean(editingPlan)}
                value={resolvedPlanLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, planLevel: event.target.value }))}
                className={selectCls}
                style={selectStyle}
              >
                {USER_PLAN_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {!editingPlan ? (
                <p className={cn('mt-2 text-xs leading-5', mutedCls)}>
                  {t(
                    'subscription.wizard.fields.levelHint',
                    'A level can contain multiple plans, so choose the level that best fits this plan.'
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
          <div>
            <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {t('subscription.wizard.fields.price', 'Price (VND)')}
            </Label>
            <Input
              type="number"
              min="0"
              value={formData.price}
              onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="0"
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {t('subscription.wizard.fields.description', 'Description')}
          </Label>
          <textarea
            value={formData.description}
            onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t(
              'subscription.wizard.fields.descriptionPlaceholder',
              'Briefly describe who this plan is for and its main value.'
            )}
            className={textareaCls}
          />
        </div>
      </section>
    </div>
  );

  const renderEntitlementStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          ShieldCheck,
          t('subscription.wizard.entitlement.title', 'Entitlements and limits'),
          t(
            'subscription.wizard.entitlement.description',
            'Keep this part compact: quantities first, then the capability toggles.'
          ),
          'from-emerald-500 to-teal-600'
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              key: 'maxIndividualWorkspace',
              label: t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace'),
              hint: t('subscription.wizard.entitlement.maxIndividualWorkspaceHint', 'Maximum number of individual workspaces allowed by this plan.'),
            },
            {
              key: 'maxMaterialInWorkspace',
              label: t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace'),
              hint: t('subscription.wizard.entitlement.maxMaterialInWorkspaceHint', 'Material limit inside each workspace.'),
            },
            {
              key: 'planIncludedCredits',
              label: t('subscription.detail.planIncludedCredits', 'Included credits'),
              hint: t('subscription.wizard.entitlement.planIncludedCreditsHint', 'Credits preloaded in the plan.'),
            },
          ].map((field) => (
            <div
              key={field.key}
              className={cn(
                'rounded-[24px] border p-4',
                isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
              )}
            >
              <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>{field.label}</Label>
              <Input
                type="number"
                min="0"
                value={entitlement[field.key] ?? ''}
                onChange={(event) => setEntitlement((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className={cn(inputCls, 'h-10')}
              />
              <p className={cn('mt-2 text-xs leading-5', mutedCls)}>{field.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('subscription.wizard.entitlement.featureToggle', 'Feature toggle')}
            </p>
            <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
              {enabledFeatures.length > 0
                ? t('subscription.wizard.entitlement.enabledCount', {
                  count: enabledFeatures.length,
                  defaultValue: '{{count}} features enabled.',
                })
                : t('subscription.wizard.entitlement.noneEnabled', 'No capabilities enabled for this plan yet.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextEntitlement = { ...entitlement };
                Object.keys(entitlementToggles).forEach((key) => {
                  nextEntitlement[key] = true;
                });
                setEntitlement(nextEntitlement);
              }}
              className={cn(
                'rounded-full cursor-pointer',
                isDarkMode ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              )}
            >
              {t('subscription.wizard.entitlement.enableAll', 'Enable all')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextEntitlement = { ...entitlement };
                Object.keys(entitlementToggles).forEach((key) => {
                  nextEntitlement[key] = false;
                });
                setEntitlement(nextEntitlement);
              }}
              className={cn(
                'rounded-full cursor-pointer',
                isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/[0.05]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {t('subscription.wizard.entitlement.disableAll', 'Disable all')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(entitlementToggles).map(([key, meta]) => {
            const checked = Boolean(entitlement[key]);
            const Icon = meta.icon;

            return (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 rounded-[22px] border px-4 py-3 transition-all cursor-pointer',
                  checked
                    ? isDarkMode
                      ? 'border-blue-400/20 bg-blue-500/10 shadow-[0_18px_40px_-28px_rgba(59,130,246,0.7)]'
                      : 'border-blue-200 bg-blue-50/80 shadow-[0_18px_40px_-30px_rgba(59,130,246,0.25)]'
                    : isDarkMode
                      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                )}
              >
                <Switch
                  checked={checked}
                  onCheckedChange={(value) => setEntitlement((prev) => ({ ...prev, [key]: value }))}
                />
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    checked
                      ? isDarkMode
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-blue-100 text-blue-600'
                      : isDarkMode
                        ? 'bg-slate-900/70 text-slate-500'
                        : 'bg-white text-slate-400'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', checked ? (isDarkMode ? 'text-white' : 'text-slate-900') : mutedCls)}>
                    {t(meta.labelKey, meta.defaultLabel)}
                  </p>
                  <p className={cn('mt-1 text-xs', checked ? (isDarkMode ? 'text-blue-100/80' : 'text-blue-700/80') : mutedCls)}>
                    {checked
                      ? t('subscription.wizard.entitlement.enabledState', 'Enabled for this plan.')
                      : t('subscription.wizard.entitlement.disabledState', 'Disabled.')}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderModelsStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Bot,
          t('subscription.wizard.models.title', 'Default models by capability'),
          t(
            'subscription.wizard.models.description',
            'Each capability group should have a default model to reduce manual tuning at the end.'
          ),
          'from-violet-500 to-fuchsia-600'
        )}

        <div
          className={cn(
            'mt-5 rounded-[22px] border px-4 py-3 text-sm',
            isDarkMode ? 'border-violet-400/20 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-800'
          )}
        >
          {t(
            'subscription.wizard.models.inactiveHint',
            'Models outside the ACTIVE state still appear for historical review, but cannot be newly selected.'
          )}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {AI_MODEL_GROUP_OPTIONS.map((group) => {
            const groupModels = availableAiModels.filter((model) => model.modelGroup === group.value);
            const selectedModelId = aiModelAssignments[group.value] ?? '';
            const selectedModel = getModelById(availableAiModels, selectedModelId);

            return (
              <div
                key={group.value}
                className={cn(
                  'rounded-[24px] border p-4',
                  isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t(group.labelKey)}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                      {t('subscription.aiModels.groupHint')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700'
                    )}
                  >
                    {t('subscription.wizard.models.groupCount', {
                      count: groupModels.length,
                      defaultValue: '{{count}} model',
                    })}
                  </span>
                </div>

                <select
                  value={selectedModelId}
                  onChange={(event) => setAiModelAssignments((prev) => ({ ...prev, [group.value]: event.target.value }))}
                  className={selectCls}
                  style={selectStyle}
                >
                  <option value="">{t('subscription.aiModels.noAssignment')}</option>
                  {groupModels.map((model) => (
                    <option
                      key={model.aiModelId}
                      value={model.aiModelId}
                      disabled={model.status !== 'ACTIVE' && String(model.aiModelId) !== String(selectedModelId)}
                    >
                      {model.displayName} ({model.provider} / {model.modelCode}){model.status !== 'ACTIVE' ? ` • ${model.status}` : ''}
                    </option>
                  ))}
                </select>

                {selectedModel ? (
                  <div
                    className={cn(
                      'mt-3 rounded-[20px] border px-4 py-3 text-sm',
                      isDarkMode ? 'border-violet-400/15 bg-violet-500/10 text-violet-100' : 'border-violet-200 bg-violet-50 text-violet-900'
                    )}
                  >
                    <p className="font-semibold">{selectedModel.displayName}</p>
                    <p className="mt-1 text-xs">
                      {selectedModel.provider} / {selectedModel.modelCode}
                    </p>
                  </div>
                ) : (
                  <p className={cn('mt-3 text-xs leading-5', mutedCls)}>
                    {t(
                      'subscription.wizard.models.noAssignmentHint',
                      'No dedicated model assigned. The system will use the matching default resolution instead.'
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <section className={sectionCls}>
        {renderStepHeader(
          Sparkles,
          t('subscription.wizard.review.title', 'Review before saving'),
          t(
            'subscription.wizard.review.description',
            'Final step to fine-tune action-level overrides when this plan needs distinct AI behavior.'
          ),
          'from-amber-400 to-orange-500'
        )}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.planInfo', 'Plan information')}
            </p>
            <h4 className={cn('mt-3 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {formData.displayName?.trim() || t('subscription.wizard.untitled', 'Untitled plan')}
            </h4>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.fields.code', 'Plan code')}</span>
                <span className={cn('font-mono', isDarkMode ? 'text-white' : 'text-slate-900')}>{formData.code || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.table.scope', 'Scope')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{getScopeLabel(formData.planScope, t)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.table.price')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatCurrency(formData.price, t, locale)}</span>
              </div>
              {showPlanLevel ? (
                <div className="flex items-center justify-between gap-3">
                  <span className={mutedCls}>{t('subscription.table.level', 'Level')}</span>
                  <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formData.planLevel || '—'}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.entitlementSnapshot', 'Entitlement snapshot')}
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.maxIndividualWorkspace ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.maxMaterialInWorkspace ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.detail.planIncludedCredits', 'Included credits')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{entitlement.planIncludedCredits ?? 0}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {enabledFeatures.length > 0 ? (
                enabledFeatures.slice(0, 6).map(([, meta]) => (
                  <span
                    key={meta.labelKey}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
                    )}
                  >
                    {t(meta.labelKey, meta.defaultLabel)}
                  </span>
                ))
              ) : (
                <span className={cn('text-xs', mutedCls)}>{t('subscription.wizard.review.noFeatures', 'No features enabled yet.')}</span>
              )}
            </div>
          </div>

          <div
            className={cn(
              'rounded-[24px] border p-4 xl:col-span-1',
              isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
            )}
          >
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
              {t('subscription.wizard.review.aiSnapshot', 'AI snapshot')}
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.review.modelGroupsAssigned', 'Groups with assigned models')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {assignedModels.filter((item) => item.assignedModelId).length}/{assignedModels.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.review.overrideActions', 'Override actions')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{assignedOverrides.length}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {assignedModels.filter((item) => item.model).slice(0, 4).map((item) => (
                  <span
                    key={item.group.value}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'bg-violet-500/10 text-violet-200' : 'bg-violet-50 text-violet-700'
                    )}
                  >
                    {t(item.group.labelKey)}
                  </span>
                ))}
                {assignedModels.every((item) => !item.model) ? <span className={cn('text-xs', mutedCls)}>{t('subscription.wizard.models.noAssignmentHint', 'No dedicated model assigned. The system will use the matching default resolution instead.')}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <details
        className={sectionCls}
        open={assignedOverrides.length > 0}
      >
        <summary className={cn('flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
          <span className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {t('subscription.wizard.review.aiOverrides', 'AI function overrides')}
          </span>
          <span className={cn('text-xs font-medium', mutedCls)}>
            {t('subscription.wizard.review.aiOverridesHint', 'Leave empty to use the default capability model.')}
          </span>
        </summary>

        <div className="mt-5 grid gap-4">
          {groupAiActionsByModelGroup().map((group) => (
            <div
              key={group.value}
              className={cn(
                'rounded-[24px] border p-4',
                isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
              )}
            >
              <div className="mb-4">
                <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {t(group.labelKey)}
                </p>
                <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                  {t(
                    'subscription.wizard.review.aiOverridesGroupHint',
                    'Only override when this plan truly needs behavior different from the group default model.'
                  )}
                </p>
              </div>

              <div className="grid gap-3">
                {group.actions.map((actionKey) => {
                  const actionModels = filterAiModelsForAction(actionKey, availableAiModels);
                  const allowedProviders = getAiActionAllowedProviders(actionKey);
                  const selectedModelId = functionAssignmentMap[actionKey] ?? '';
                  const isProviderRestricted = allowedProviders.length === 1;

                  return (
                    <div
                      key={actionKey}
                      className={cn(
                        'grid gap-3 rounded-[20px] border p-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]',
                        isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
                      )}
                    >
                      <div>
                        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {getAiActionLabel(actionKey, t)}
                        </p>
                        <p className={cn('mt-1 text-xs leading-5', mutedCls)}>
                          {isProviderRestricted
                            ? t('subscription.wizard.review.providerAvailable', {
                              provider: allowedProviders[0],
                              defaultValue: 'Available provider: {{provider}}.',
                            })
                            : t('subscription.wizard.review.useDefaultHint', {
                              group: t(group.labelKey),
                              defaultValue: 'Leave empty to use the default for {{group}}.',
                            })}
                        </p>
                      </div>

                      <select
                        value={selectedModelId}
                        onChange={(event) => setFunctionAssignmentMap((prev) => ({ ...prev, [actionKey]: event.target.value }))}
                        className={selectCls}
                        style={selectStyle}
                      >
                        <option value="">
                          {isProviderRestricted
                            ? t('subscription.wizard.review.useCompatibleDefault', 'Use the compatible default model')
                            : t('subscription.wizard.review.useGroupDefault', 'Use the group default model')}
                        </option>
                        {actionModels.map((model) => (
                          <option
                            key={`${actionKey}-${model.aiModelId}`}
                            value={model.aiModelId}
                            disabled={model.status !== 'ACTIVE' && String(model.aiModelId) !== String(selectedModelId)}
                          >
                            {model.displayName} ({model.provider} / {model.modelCode}){model.status !== 'ACTIVE' ? ` • ${model.status}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );

  const renderCurrentStep = () => {
    switch (activeStep.id) {
      case 'basic':
        return renderBasicStep();
      case 'entitlement':
        return renderEntitlementStep();
      case 'models':
        return renderModelsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'max-w-6xl max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden',
          isDarkMode ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'
        )}
        onPointerDownOutside={(event) => isSubmitting && event.preventDefault()}
        onInteractOutside={(event) => isSubmitting && event.preventDefault()}
      >
        <div className={cn('flex-shrink-0 border-b px-6 py-4', borderCls)}>
          <DialogHeader className="space-y-1 p-0">
            <DialogTitle className={cn('text-xl font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {editingPlan ? t('subscription.editPlan') : t('subscription.addPlan')}
            </DialogTitle>
            <DialogDescription className={cn('text-sm', mutedCls)}>
              {editingPlan
                ? t(
                  'subscription.wizard.dialogEditDescription',
                  'Edit the plan step by step so you do not need to scroll through the full configuration in one screen.'
                )
                : t(
                  'subscription.wizard.dialogCreateDescription',
                  'Create a new plan through a step-by-step flow that is easier to review before saving.'
                )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                  isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                )}
              >
                {t('subscription.wizard.stepCounter', {
                  current: currentStep + 1,
                  total: steps.length,
                  defaultValue: 'Step {{current}}/{{total}}',
                })}
              </span>
              <span className={cn('text-sm font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {activeStep.title}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isActive = index === currentStep;
                const isClickable = index <= currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => isClickable && setCurrentStep(index)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-all',
                      !isClickable && 'cursor-not-allowed opacity-60',
                      isActive
                        ? isDarkMode
                          ? 'border-blue-400/30 bg-blue-500/10'
                          : 'border-blue-200 bg-blue-50'
                        : isCompleted
                          ? isDarkMode
                            ? 'border-emerald-400/20 bg-emerald-500/10'
                            : 'border-emerald-200 bg-emerald-50'
                          : isDarkMode
                            ? 'border-white/10 bg-transparent'
                            : 'border-slate-200 bg-white'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                        isActive
                          ? 'bg-gradient-to-br text-white ' + step.accent
                          : isCompleted
                            ? isDarkMode
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-emerald-100 text-emerald-700'
                            : isDarkMode
                              ? 'bg-slate-900/70 text-slate-400'
                              : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={cn('text-xs font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleInternalSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 overflow-y-auto px-6 py-5">
              {renderCurrentStep()}
            </div>

            <aside className={cn('border-l px-5 py-5 min-h-0 overflow-y-auto', borderCls)}>
              <div
                className={cn(
                  'rounded-[28px] border p-5',
                  isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/80'
                )}
              >
                <div className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]', isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700')}>
                  {activeStep.title}
                </div>
                <h4 className={cn('mt-4 text-lg font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {formData.displayName?.trim() || t('subscription.wizard.untitled', 'Untitled plan')}
                </h4>
                <p className={cn('mt-2 text-sm leading-6', mutedCls)}>
                  {activeStep.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    { label: t('subscription.table.price'), value: formatCurrency(formData.price, t, locale), icon: Coins },
                    { label: t('subscription.table.scope', 'Scope'), value: getScopeLabel(formData.planScope, t), icon: formData.planScope === 'WORKSPACE' ? Users : User },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={cn(
                          'rounded-[22px] border px-4 py-3',
                          isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-white'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-2xl',
                              isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>{item.label}</p>
                            <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className={cn(
                  'mt-4 rounded-[28px] border p-5',
                  isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/80'
                )}
              >
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedCls)}>
                  {t('subscription.wizard.checklist.title', 'Quick checklist')}
                </p>
                <div className="mt-4 space-y-3">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                          item.done
                            ? isDarkMode
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-700'
                            : isDarkMode
                              ? 'bg-slate-900/70 text-slate-500'
                              : 'bg-slate-100 text-slate-400'
                        )}
                      >
                        {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>{item.label}</p>
                        <p className={cn('mt-1 text-xs leading-5', mutedCls)}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    'mt-5 rounded-[22px] border px-4 py-3 text-sm',
                    isDarkMode ? 'border-blue-400/20 bg-blue-500/10 text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-800'
                  )}
                >
                  {isLastStep
                    ? t(
                      'subscription.wizard.finalHint',
                      'You are on the final step. Save now or jump back to any previous step to adjust.'
                    )
                    : t(
                      'subscription.wizard.nextHint',
                      'Use the "Next" button to move through each step and keep the dialog compact.'
                    )}
                </div>
              </div>
            </aside>
          </div>

          <div className={cn('flex-shrink-0 border-t px-6 py-4', borderCls)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {t('subscription.wizard.stepTitle', {
                    current: currentStep + 1,
                    total: steps.length,
                    title: activeStep.title,
                    defaultValue: 'Step {{current}}/{{total}}: {{title}}',
                  })}
                </p>
                <p className={cn('mt-1 text-xs', mutedCls)}>{activeStep.description}</p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className={cn('rounded-full cursor-pointer', isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : '')}
                >
                  {t('auth.cancel')}
                </Button>

                {currentStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className={cn('rounded-full cursor-pointer', isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : '')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('common.back', 'Back')}
                  </Button>
                ) : null}

                <Button
                  type={isLastStep ? 'submit' : 'button'}
                  onClick={isLastStep ? undefined : handleNext}
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
                >
                  {isLastStep ? (
                    <>
                      {isSubmitting ? t('subscription.submitting') : editingPlan ? t('subscription.save') : t('subscription.create')}
                    </>
                  ) : (
                    <>
                      {t('common.next', 'Next')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PlanFormWizard;
