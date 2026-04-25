import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Layers3,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import PlanFormWizardStepContent from './PlanFormWizardStepContent';
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
  editLocked = false,
  editLockedReason = '',
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
  const isDefaultPlanLevel = resolvedPlanLevel === (PLAN_LEVEL_OPTIONS[0] ?? '0');
  const hasGroupInheritance = isWorkspace && !isDefaultPlanLevel && Boolean(highestActiveUserPlanEntitlement);

  useEffect(() => {
    if (editingPlan) return;
    if (formData.planLevel === resolvedPlanLevel) return;
    setFormData((prev) => ({ ...prev, planLevel: resolvedPlanLevel }));
  }, [editingPlan, formData.planLevel, resolvedPlanLevel, setFormData]);

  useEffect(() => {
    if (!isDefaultPlanLevel) return;

    setEntitlement((prev) => {
      if (String(prev.planIncludedCredits ?? '') === '0') return prev;
      return { ...prev, planIncludedCredits: 0 };
    });

    setFormData((prev) => {
      if (String(prev.price ?? '') === '0') return prev;
      return { ...prev, price: '0' };
    });
  }, [isDefaultPlanLevel, setEntitlement, setFormData]);

  const includedCredits = Number(entitlement.planIncludedCredits) || 0;
  const minPrice = includedCredits * creditUnitPrice;
  const currentPrice = Number(formData.price) || 0;
  const effectivePrice = Math.max(currentPrice, minPrice);
  const hasCustomPrice = currentPrice > minPrice;
  const willAutoRaisePrice = currentPrice > 0 && currentPrice < minPrice;

  useEffect(() => {
    if (!hasGroupInheritance || editingPlan) return;
    setEntitlement((prev) => {
      const next = { ...prev };
      const src = highestActiveUserPlanEntitlement;
      let changed = false;
      Object.keys(entitlementToggles).forEach((key) => {
        if (src[key] === true && next[key] !== true) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [hasGroupInheritance, editingPlan, highestActiveUserPlanEntitlement, entitlementToggles, setEntitlement]);

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

    if (!isDefaultPlanLevel) {
      const planIncludedCredits = Number(entitlement.planIncludedCredits);
      if (!Number.isFinite(planIncludedCredits) || planIncludedCredits <= 0) {
        return t(
          'subscription.wizard.validation.planIncludedCreditsRequired',
          'Included credits is required and must be greater than 0.'
        );
      }
    }

    return null;
  };

  const getValidationError = ({ forSubmit = false } = {}) => {
    if (editLocked) {
      return editLockedReason || t(
        'subscription.planEditLocked',
        'Goi level 1/2 da co nguoi mua hoac dang mua nen khong the cap nhat.'
      );
    }
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
    if (editLocked) {
      onValidationError(
        editLockedReason || t(
          'subscription.planEditLocked',
          'Goi level 1/2 da co nguoi mua hoac dang mua nen khong the cap nhat.'
        )
      );
      return;
    }
    if (!isLastStep) {
      handleNext();
      return;
    }
    submitWizard();
  };

  const renderCurrentStep = () => (
    <PlanFormWizardStepContent
      activeStepId={activeStep.id}
      AI_MODEL_GROUP_OPTIONS={AI_MODEL_GROUP_OPTIONS}
      PLAN_LEVEL_OPTIONS={PLAN_LEVEL_OPTIONS}
      assignedModels={assignedModels}
      assignedOverrideCount={assignedOverrideCount}
      availableAiModels={availableAiModels}
      aiModelAssignments={aiModelAssignments}
      currentPrice={currentPrice}
      effectivePrice={effectivePrice}
      enabledFeatures={enabledFeatures}
      entitlement={entitlement}
      entitlementToggles={entitlementToggles}
      editingPlan={editingPlan}
      formData={formData}
      getModelById={getModelById}
      getScopeLabel={getScopeLabel}
      formatCurrency={formatCurrency}
      handleIncludedCreditsChange={handleIncludedCreditsChange}
      handlePriceChange={handlePriceChange}
      hasCustomPrice={hasCustomPrice}
      hasGroupInheritance={hasGroupInheritance}
      highestActiveUserPlanEntitlement={highestActiveUserPlanEntitlement}
      includedCredits={includedCredits}
      inputCls={inputCls}
      isDarkMode={isDarkMode}
      isDefaultPlanLevel={isDefaultPlanLevel}
      isWorkspace={isWorkspace}
      locale={locale}
      minPrice={minPrice}
      mutedCls={mutedCls}
      requireIndividualPlanLimits={requireIndividualPlanLimits}
      resolvedPlanLevel={resolvedPlanLevel}
      sectionCls={sectionCls}
      selectCls={selectCls}
      selectStyle={selectStyle}
      setAiModelAssignments={setAiModelAssignments}
      setEntitlement={setEntitlement}
      setFormData={setFormData}
      showPlanLevel={showPlanLevel}
      t={t}
      textareaCls={textareaCls}
      willAutoRaisePrice={willAutoRaisePrice}
    />
  );

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

          {editLocked ? (
            <div
              className={cn(
                'mt-4 rounded-2xl border px-4 py-3 text-sm',
                isDarkMode ? 'border-rose-400/25 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700'
              )}
            >
              {editLockedReason || t(
                'subscription.planEditLocked',
                'Goi level 1/2 da co nguoi mua hoac dang mua nen khong the cap nhat.'
              )}
            </div>
          ) : null}

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
                  disabled={isSubmitting || editLocked}
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
