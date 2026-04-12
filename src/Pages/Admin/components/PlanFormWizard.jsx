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
} from '@/lib/aiModelCatalog';

const WIZARD_STEPS = [
  {
    id: 'basic',
    titleKey: 'subscription.wizard.steps.basic.title',
    descriptionKey: 'subscription.wizard.steps.basic.catalogDescription',
    descriptionFallback: 'Name the plan and choose its scope. Price is inferred from included credits.',
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

const PLAN_LEVEL_OPTIONS = ['0', '1', '2'];

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
  availableAiModels,
  creditUnitPrice = 200,
  highestActiveUserPlanEntitlement,
  onSubmit,
  onValidationError,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const isWorkspace = formData.planScope === 'WORKSPACE';
  const showPlanLevel = true;
  const requireIndividualPlanLimits = formData.planScope !== 'WORKSPACE';
  const steps = useMemo(
    () => WIZARD_STEPS.map((step) => ({
      ...step,
      title: t(step.titleKey, step.titleFallback),
      description: t(step.descriptionKey, step.descriptionFallback),
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

  const assignedOverrideCount = useMemo(
    () => Object.values(functionAssignmentMap).filter(Boolean).length,
    [functionAssignmentMap]
  );

  const resolvedPlanLevel = PLAN_LEVEL_OPTIONS.includes(String(formData.planLevel ?? ''))
    ? String(formData.planLevel ?? '')
    : (PLAN_LEVEL_OPTIONS[0] ?? '');

  useEffect(() => {
    if (editingPlan) return;
    if (formData.planLevel === resolvedPlanLevel) return;
    setFormData((prev) => ({ ...prev, planLevel: resolvedPlanLevel }));
  }, [editingPlan, formData.planLevel, resolvedPlanLevel, setFormData]);

  const includedCredits = Number(entitlement.planIncludedCredits) || 0;
  const minPrice = includedCredits * creditUnitPrice;
  const currentPrice = Number(formData.price) || 0;
  const effectivePrice = Math.max(currentPrice, minPrice);
  const hasCustomPrice = currentPrice > minPrice;
  const willAutoRaisePrice = currentPrice > 0 && currentPrice < minPrice;

  useEffect(() => {
    if (!isWorkspace || editingPlan || !highestActiveUserPlanEntitlement) return;
    setEntitlement((prev) => {
      const next = { ...prev };
      const src = highestActiveUserPlanEntitlement;
      Object.keys(entitlementToggles).forEach((key) => {
        if (src[key] === true) next[key] = true;
      });
      return next;
    });
  }, [isWorkspace, editingPlan, highestActiveUserPlanEntitlement, entitlementToggles, setEntitlement]);

  const handleDialogOpenChange = (nextOpen) => {
    if (isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const handleIncludedCreditsChange = (event) => {
    const nextCreditsValue = event.target.value;
    setEntitlement((prev) => ({ ...prev, planIncludedCredits: nextCreditsValue }));

    if (nextCreditsValue === '') {
      setFormData((prev) => ({ ...prev, price: '' }));
      return;
    }

    const parsedCredits = Number(nextCreditsValue);
    if (!Number.isFinite(parsedCredits)) return;

    const inferredPrice = Math.max(0, Math.floor(parsedCredits * creditUnitPrice));
    setFormData((prev) => ({ ...prev, price: String(inferredPrice) }));
  };

  const handlePriceChange = (event) => {
    const nextPriceValue = event.target.value;
    setFormData((prev) => ({ ...prev, price: nextPriceValue }));

    if (nextPriceValue === '') {
      setEntitlement((prev) => ({ ...prev, planIncludedCredits: '' }));
      return;
    }

    const parsedPrice = Number(nextPriceValue);
    if (!Number.isFinite(parsedPrice) || creditUnitPrice <= 0) return;

    const inferredCredits = Math.max(0, Math.floor(parsedPrice / creditUnitPrice));
    setEntitlement((prev) => ({ ...prev, planIncludedCredits: String(inferredCredits) }));
  };

  const getIndividualPlanLimitError = () => {
    if (!requireIndividualPlanLimits) return null;

    const maxIndividualWorkspace = Number(entitlement.maxIndividualWorkspace);
    if (!Number.isFinite(maxIndividualWorkspace) || maxIndividualWorkspace <= 0) {
      return t(
        'subscription.wizard.validation.maxIndividualWorkspaceRequired',
        'Max individual workspace is required and must be greater than 0.'
      );
    }

    const maxMaterialInWorkspace = Number(entitlement.maxMaterialInWorkspace);
    if (!Number.isFinite(maxMaterialInWorkspace) || maxMaterialInWorkspace <= 0) {
      return t(
        'subscription.wizard.validation.maxMaterialInWorkspaceRequired',
        'Max material / workspace is required and must be greater than 0.'
      );
    }

    const planIncludedCredits = Number(entitlement.planIncludedCredits);
    if (!Number.isFinite(planIncludedCredits) || planIncludedCredits <= 0) {
      return t(
        'subscription.wizard.validation.planIncludedCreditsRequired',
        'Included credits is required and must be greater than 0.'
      );
    }

    return null;
  };

  const getValidationError = ({ forSubmit = false } = {}) => {
    if ((currentStep === 0 || forSubmit) && !formData.code?.trim()) return t('subscription.validation.codeRequired', 'Please enter a plan code.');
    if ((currentStep === 0 || forSubmit) && !formData.displayName?.trim()) return t('subscription.validation.displayNameRequired', 'Please enter a plan name.');
    if (currentStep === 1 || forSubmit) {
      const leveledPlanFieldError = getIndividualPlanLimitError();
      if (leveledPlanFieldError) return leveledPlanFieldError;
    }
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

  const submitWizard = () => {
    const validationError = getValidationError({ forSubmit: true });
    if (validationError) {
      onValidationError(validationError);
      return;
    }
    onSubmit();
  };

  const handleInternalSubmit = (event) => {
    event?.preventDefault?.();
    if (!isLastStep) {
      handleNext();
      return;
    }
    submitWizard();
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
                  planLevel: PLAN_LEVEL_OPTIONS.includes(String(prev.planLevel ?? ''))
                    ? String(prev.planLevel ?? '')
                    : (PLAN_LEVEL_OPTIONS[0] ?? ''),
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
              <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>Level</Label>
              <select
                disabled={Boolean(editingPlan)}
                value={resolvedPlanLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, planLevel: event.target.value }))}
                className={selectCls}
                style={selectStyle}
              >
                {PLAN_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {!editingPlan ? (
                <p className={cn('mt-2 text-xs leading-5', mutedCls)}>
                  {t('subscription.wizard.fields.levelHint', 'A level can contain multiple plans, so choose the level that best fits this plan.'
                  )}
                </p>
              ) : null}
            </div>
          ) : null}
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

        <div className={cn('mt-6 grid gap-4', isWorkspace ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
          {(!isWorkspace
            ? [
              {
                key: 'maxIndividualWorkspace',
                label: `${t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace')} *`,
                hint: t('subscription.wizard.entitlement.maxIndividualWorkspaceHint', 'Maximum number of individual workspaces allowed by this plan.'),
              },
              {
                key: 'maxMaterialInWorkspace',
                label: `${t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')} *`,
                hint: t('subscription.wizard.entitlement.maxMaterialInWorkspaceHint', 'Material limit inside each workspace.'),
              },
              {
                key: 'planIncludedCredits',
                label: `${t('subscription.detail.planIncludedCredits', 'Included credits')} *`,
                hint: t('subscription.wizard.entitlement.planIncludedCreditsHint', 'Credits preloaded in the plan.'),
              },
            ]
            : []
          ).map((field) => (
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
                min="1"
                required={requireIndividualPlanLimits}
                value={entitlement[field.key] ?? ''}
                onChange={field.key === 'planIncludedCredits'
                  ? handleIncludedCreditsChange
                  : (event) => setEntitlement((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className={cn(inputCls, 'h-10')}
              />
              <p className={cn('mt-2 text-xs leading-5', mutedCls)}>{field.hint}</p>
            </div>
          ))}
        </div>

        <div
          className={cn(
            'mt-4 rounded-[24px] border p-4',
            isDarkMode ? 'border-white/10 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
          )}
        >
          <Label className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {t('subscription.table.price', 'Price')} *
          </Label>
          <Input
            type="number"
            min="0"
            required={requireIndividualPlanLimits}
            value={formData.price}
            onChange={handlePriceChange}
            placeholder={String(minPrice)}
            className={cn(inputCls, 'h-10')}
          />

          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className={mutedCls}>{t('subscription.wizard.entitlement.inferredFloor', 'Credit-based floor')}</span>
              <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {formatCurrency(minPrice, t, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={mutedCls}>{t('subscription.detail.planIncludedCredits', 'Included credits')}</span>
              <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {includedCredits.toLocaleString(locale)}
              </span>
            </div>
            {hasCustomPrice ? (
              <div className="flex items-center justify-between gap-3">
                <span className={mutedCls}>{t('subscription.wizard.entitlement.currentStoredPrice', 'Current selling price')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {formatCurrency(currentPrice, t, locale)}
                </span>
              </div>
            ) : null}
          </div>

          <p className={cn('mt-3 text-xs leading-5', mutedCls)}>
            {t(
              'subscription.wizard.entitlement.priceDerivedHint',
              'Edit included credits to infer the floor price, or edit price to infer how many credits the plan includes. The saved price can never be lower than the credit-based floor.'
            )}
          </p>
          {willAutoRaisePrice ? (
            <p className={cn('mt-2 text-xs font-semibold', 'text-amber-500')}>
              {t(
                'subscription.wizard.entitlement.priceAutoRaiseHint',
                'The current saved price is below the new floor and will be raised automatically when you save.'
              )}
            </p>
          ) : null}
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

        {isWorkspace && highestActiveUserPlanEntitlement ? (
          <div
            className={cn(
              'mt-4 rounded-[22px] border px-4 py-3 text-sm',
              isDarkMode ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            )}
          >
            Gói group tự động kế thừa toàn bộ quyền lợi từ gói cá nhân cao nhất đang active. Các feature kế thừa không thể tắt.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(entitlementToggles).map(([key, meta]) => {
            const checked = Boolean(entitlement[key]);
            const Icon = meta.icon;
            const inheritedFromUser = isWorkspace && highestActiveUserPlanEntitlement && highestActiveUserPlanEntitlement[key] === true;

            return (
              <label
                key={key}
                className={cn(
                  'flex items-center gap-3 rounded-[22px] border px-4 py-3 transition-all',
                  inheritedFromUser ? 'cursor-not-allowed' : 'cursor-pointer',
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
                  disabled={inheritedFromUser}
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
                    {checked ? 'Đang mở cho plan này.' : 'Đang tắt.'}
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
                <span className={mutedCls}>{t('subscription.table.price', 'Price')}</span>
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{formatCurrency(effectivePrice, t, locale)}</span>
              </div>
              {showPlanLevel ? (
                <div className="flex items-center justify-between gap-3">
                  <span className={mutedCls}>Level</span>
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
                <span className={mutedCls}>Workspace cá nhân</span>
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
                <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{assignedOverrideCount}</span>
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
                    { label: t('subscription.table.price', 'Price'), value: formatCurrency(effectivePrice, t, locale), icon: Coins },
                    { label: 'Scope', value: getScopeLabel(formData.planScope, t), icon: formData.planScope === 'WORKSPACE' ? Users : User },
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
                  type="button"
                  onClick={isLastStep ? submitWizard : handleNext}
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
