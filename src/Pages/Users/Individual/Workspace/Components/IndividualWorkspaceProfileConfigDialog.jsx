import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, FilePenLine, Loader2, Rocket, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import WorkspaceProfileStepOne from './WorkspaceProfileWizard/WorkspaceProfileStepOne';
import WorkspaceProfileStepTwo from './WorkspaceProfileWizard/WorkspaceProfileStepTwo';
import WorkspaceProfileStepThree from './WorkspaceProfileWizard/WorkspaceProfileStepThree';
import { useWorkspaceProfileWizard } from './WorkspaceProfileWizard/useWorkspaceProfileWizard';

function QuizmateStepOneIcon({ className, ...props }) {
  const iconId = React.useId();
  const glowGradientId = `${iconId}-glow`;
  const badgeGradientId = `${iconId}-badge`;
  const shineGradientId = `${iconId}-shine`;
  const shadowId = `${iconId}-shadow`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <radialGradient id={glowGradientId} cx="0" cy="0" r="1" gradientTransform="translate(18 14) rotate(50) scale(30)">
          <stop offset="0" stopColor="#c9f1ff" />
          <stop offset="0.42" stopColor="#77d6ff" />
          <stop offset="1" stopColor="#0f7bff" />
        </radialGradient>
        <linearGradient id={badgeGradientId} x1="13" x2="35" y1="10" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4cd6ff" />
          <stop offset="0.52" stopColor="#239fff" />
          <stop offset="1" stopColor="#1f5cff" />
        </linearGradient>
        <radialGradient id={shineGradientId} cx="0" cy="0" r="1" gradientTransform="translate(17 14) rotate(35) scale(13 9)">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id={shadowId} x="4" y="4" width="40" height="40" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0f7bff" floodOpacity="0.24" />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <circle cx="24" cy="24" r="21" fill="#d9f2ff" />
        <circle cx="24" cy="24" r="18.6" fill={`url(#${glowGradientId})`} />
        <circle cx="24" cy="24" r="17" fill={`url(#${badgeGradientId})`} />
        <circle cx="24" cy="24" r="17" fill={`url(#${shineGradientId})`} />
        <ellipse cx="16.8" cy="14.1" rx="5.3" ry="3.6" fill="#ffffff" fillOpacity="0.22" transform="rotate(-20 16.8 14.1)" />

        <path
          fill="#ffffff"
          d="M24.4 13.4c1.63 6.32 3.7 8.4 10.02 10.02-6.32 1.63-8.4 3.7-10.02 10.02-1.63-6.32-3.7-8.4-10.02-10.02 6.32-1.63 8.4-3.7 10.02-10.02Z"
        />
        <path
          fill="#ffffff"
          d="M15.2 15.4c.48 1.9 1.1 2.52 3 3-.48.48-2.52 1.1-3 3-.48-1.9-1.1-2.52-3-3 1.9-.48 2.52-1.1 3-3Z"
        />
        <path
          fill="#ffffff"
          d="M33.6 28.7c.4 1.55.92 2.07 2.46 2.46-1.54.4-2.06.92-2.46 2.46-.39-1.54-.91-2.06-2.46-2.46 1.55-.39 2.07-.91 2.46-2.46Z"
        />
      </g>
    </svg>
  );
}

const STEP_META_MAP = {
  1: {
    icon: QuizmateStepOneIcon,
    usesStandaloneBadge: true,
    gradient: 'from-sky-500 to-blue-600',
    lightInactive: 'border-sky-100 bg-sky-50/90 text-sky-500 hover:border-sky-200 hover:bg-sky-100/80',
    darkInactive: 'border-sky-400/20 bg-sky-500/10 text-sky-200 hover:border-sky-300/35 hover:bg-sky-500/15',
    lightComplete: 'border-sky-200 bg-sky-100 text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.16)]',
    darkComplete: 'border-sky-300/25 bg-sky-500/20 text-sky-100 shadow-[0_10px_24px_rgba(14,165,233,0.18)]',
    lightLabel: 'text-sky-600',
    darkLabel: 'text-sky-200',
    halo: 'bg-sky-400/25',
    badge: 'bg-sky-500 text-white',
  },
  2: {
    icon: FilePenLine,
    gradient: 'from-orange-500 to-amber-500',
    lightInactive: 'border-orange-100 bg-orange-50/90 text-orange-500 hover:border-orange-200 hover:bg-orange-100/80',
    darkInactive: 'border-orange-400/20 bg-orange-500/10 text-orange-200 hover:border-orange-300/35 hover:bg-orange-500/15',
    lightComplete: 'border-orange-200 bg-orange-100 text-orange-700 shadow-[0_10px_24px_rgba(249,115,22,0.16)]',
    darkComplete: 'border-orange-300/25 bg-orange-500/20 text-orange-100 shadow-[0_10px_24px_rgba(249,115,22,0.18)]',
    lightLabel: 'text-orange-600',
    darkLabel: 'text-orange-200',
    halo: 'bg-orange-400/25',
    badge: 'bg-orange-500 text-white',
  },
  3: {
    icon: Rocket,
    gradient: 'from-emerald-500 to-green-600',
    lightInactive: 'border-emerald-100 bg-emerald-50/90 text-emerald-500 hover:border-emerald-200 hover:bg-emerald-100/80',
    darkInactive: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/35 hover:bg-emerald-500/15',
    lightComplete: 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-[0_10px_24px_rgba(34,197,94,0.16)]',
    darkComplete: 'border-emerald-300/25 bg-emerald-500/20 text-emerald-100 shadow-[0_10px_24px_rgba(34,197,94,0.18)]',
    lightLabel: 'text-emerald-600',
    darkLabel: 'text-emerald-200',
    halo: 'bg-emerald-400/25',
    badge: 'bg-emerald-500 text-white',
  },
};

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function createStepCopy(t) {
  return {
    1: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.1.title', 'Step 1'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.1.description',
        'Choose the workspace intent and let AI assess the knowledge area.'
      ),
    },
    2: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.2.title', 'Step 2'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.2.description',
        'Add your current level, goals, and mock-test details if needed.'
      ),
    },
    3: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.3.title', 'Step 3'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.3.description',
        'Finish the roadmap setup and confirm the learning pace.'
      ),
    },
  };
}

function createActionCopy(t) {
  return {
    generatingTemplate: translateOrFallback(
      t,
      'workspace.profileConfig.actions.generatingTemplate',
      'Generating template...'
    ),
    overallReviewLoading: translateOrFallback(
      t,
      'workspace.profileConfig.stepTwo.overallReviewLoadingTitle',
      'Quizmate AI dang danh gia tong quan'
    ),
    confirm: translateOrFallback(t, 'confirm', 'Confirm'),
  };
}

function IndividualWorkspaceProfileConfigDialog({
  open,
  onOpenChange,
  onSave,
  onConfirm,
  isDarkMode,
  initialData,
  workspaceId,
  isReadOnly = false,
  forceStartAtStepOne = false,
  mockTestGenerationState = 'idle',
  mockTestGenerationMessage = '',
  mockTestGenerationProgress = 0,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const wizard = useWorkspaceProfileWizard({
    open,
    initialData,
    onSave,
    storageKey: workspaceId ? `workspace-profile-wizard-${workspaceId}` : undefined,
    forceStartAtStepOne,
    mockTestGenerationState,
    mockTestGenerationMessage,
    mockTestGenerationProgress,
    t,
    isReadOnly,
  });
  const stepCopy = createStepCopy(t);
  const actionCopy = createActionCopy(t);
  const stepIds = Array.from({ length: wizard.totalSteps }, (_, index) => index + 1);

  const shellClass = isDarkMode ? 'border-slate-800 bg-[#020817] text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const showMockTestProgress = wizard.values.workspacePurpose === 'MOCK_TEST' && mockTestGenerationState !== 'idle' && mockTestGenerationMessage;
  const progressValue = Math.max(0, Math.min(100, Number(mockTestGenerationProgress) || 0));
  const isAwaitingBackendConfirmation = mockTestGenerationState === 'pending' && progressValue >= 92;
  const progressLabel = isAwaitingBackendConfirmation
    ? translateOrFallback(t, 'workspace.profileConfig.messages.mockTemplateAwaitingBackendShort', 'Confirming')
    : `${progressValue}%`;
  const progressToneClass = mockTestGenerationState === 'ready'
    ? isDarkMode
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : mockTestGenerationState === 'error'
      ? isDarkMode
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
        : 'border-rose-200 bg-rose-50 text-rose-800'
      : isDarkMode
        ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
        : 'border-cyan-200 bg-cyan-50 text-cyan-800';
  const isNavigationBusy = wizard.submitting || wizard.isMockTestGenerationPending;
  const isPrimaryActionBusy = isNavigationBusy || wizard.isWaitingForOverallReview;
  const progressFraction = stepIds.length > 1 ? (wizard.step - 1) / (stepIds.length - 1) : 0;
  const stepTransitionClass = 'animate-in fade-in-50 slide-in-from-bottom-3 zoom-in-95 duration-500';

  function renderStep() {
    if (wizard.step === 1) {
      return (
        <WorkspaceProfileStepOne
          t={t}
          isDarkMode={isDarkMode}
          values={wizard.values}
          errors={wizard.errors}
          analysisStatus={wizard.analysisStatus}
          domainOptions={wizard.domainOptions}
          needsKnowledgeDescription={wizard.needsKnowledgeDescription}
          knowledgeAnalysis={wizard.knowledgeAnalysis}
          disabled={isReadOnly}
          onPurposeChange={wizard.setPurpose}
          onFieldChange={wizard.updateField}
          onDomainSelect={wizard.selectInferredDomain}
          onRetryAnalysis={wizard.retryKnowledgeAnalysis}
        />
      );
    }

    if (wizard.step === 2) {
      return (
        <WorkspaceProfileStepTwo
          t={t}
          isDarkMode={isDarkMode}
          values={wizard.values}
          errors={wizard.errors}
          templateStatus={wizard.templateStatus}
          templatePreview={wizard.templatePreview}
          fieldSuggestions={wizard.fieldSuggestions}
          fieldSuggestionStatus={wizard.fieldSuggestionStatus}
          examTemplateSuggestions={wizard.examTemplateSuggestions}
          examTemplateSuggestionStatus={wizard.examTemplateSuggestionStatus}
          consistencyResult={wizard.consistencyResult}
          consistencyStatus={wizard.consistencyStatus}
          disabled={isReadOnly}
          onFieldChange={wizard.updateField}
          onGenerateTemplate={wizard.generateTemplatePreviewAsync}
          onApplySuggestion={wizard.applySuggestion}
          mockTestGenerationMessage={mockTestGenerationMessage}
          mockTestGenerationState={mockTestGenerationState}
          progressValue={progressValue}
        />
      );
    }

    return (
      <WorkspaceProfileStepThree
        t={t}
        isDarkMode={isDarkMode}
        values={wizard.values}
        errors={wizard.errors}
        selectedExam={wizard.selectedExam}
        disabled={isReadOnly}
        onFieldChange={wizard.updateField}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          'grid h-[88vh] w-[min(1240px,calc(100vw-16px))] max-w-none grid-rows-[auto,1fr,auto] gap-0 overflow-hidden rounded-[32px] border p-0 shadow-2xl',
          shellClass,
          fontClass
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-16',
            isDarkMode
              ? 'bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(251,146,60,0.08),rgba(74,222,128,0.12),rgba(167,139,250,0.10))]'
              : 'bg-[linear-gradient(90deg,rgba(14,165,233,0.10),rgba(249,115,22,0.08),rgba(34,197,94,0.10),rgba(139,92,246,0.10))]'
          )}
        />

        <DialogHeader className="relative border-b border-inherit px-4 pb-3 pt-3 text-left sm:px-5 sm:pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={cn(
                  'mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.04em]',
                  isDarkMode ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                )}
              >
                {t('workspace.profileConfig.badge')}
              </div>
              <DialogTitle className="max-w-4xl text-[clamp(1.6rem,1.9vw,2rem)] font-bold leading-[1.08] tracking-tight">
                {t('workspace.profileConfig.title')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isReadOnly ? t('workspace.profileConfig.readOnlyDesc') : t('workspace.profileConfig.editDesc')}
              </DialogDescription>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className={cn(
                  'hidden rounded-full border px-3 py-1 text-[11px] font-semibold md:inline-flex',
                  isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-600'
                )}
              >
                {t('workspace.profileConfig.footerHint', {
                  current: wizard.step,
                  total: wizard.totalSteps,
                })}
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-2xl border transition-all',
                  isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
                aria-label={t('workspace.profileConfig.actions.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <div className="relative flex w-full max-w-[920px] flex-col items-center px-4 sm:px-10">
              <div className="relative flex w-full items-center justify-between py-2">
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-[6%] top-1/2 h-[3px] -translate-y-1/2 rounded-full',
                    isDarkMode ? 'bg-slate-800/70' : 'bg-slate-200'
                  )}
                />
                <div
                  className={cn(
                    'pointer-events-none absolute left-[6%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#f97316_52%,#22c55e_100%)] shadow-[0_0_18px_rgba(14,165,233,0.25)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  )}
                  style={{ width: `${progressFraction * 88}%` }}
                />
                <div
                  className="pointer-events-none absolute left-[6%] top-1/2 h-[8px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.18)_0%,rgba(249,115,22,0.18)_52%,rgba(34,197,94,0.18)_100%)] blur-md transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progressFraction * 88}%` }}
                />

                {stepIds.map((item) => {
                  const meta = STEP_META_MAP[item];
                  const StepIcon = meta.icon;
                  const active = wizard.step === item;
                  const complete = wizard.maxUnlockedStep > item && !active;
                  const usesStandaloneBadge = meta.usesStandaloneBadge === true;
                  const canReview = wizard.canNavigateToStep(item);
                  const circleClass = complete
                    ? isDarkMode
                      ? meta.darkComplete
                      : meta.lightComplete
                    : active
                      ? cn(
                        'border-transparent bg-gradient-to-br text-white scale-[1.08] shadow-[0_16px_38px_rgba(15,23,42,0.12)]',
                        meta.gradient
                      )
                      : isDarkMode
                        ? meta.darkInactive
                        : meta.lightInactive;
                  const labelToneClass = active || complete
                    ? isDarkMode
                      ? meta.darkLabel
                      : meta.lightLabel
                    : mutedClass;

                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!canReview}
                      onClick={() => wizard.goToStep(item)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 bg-transparent transition-all duration-500',
                        canReview ? 'cursor-pointer focus-visible:outline-none' : 'cursor-default'
                      )}
                    >
                      <div className="relative">
                        {active ? (
                          <span
                            className={cn(
                              'absolute inset-[-7px] rounded-full animate-pulse',
                              meta.halo
                            )}
                          />
                        ) : null}
                        {usesStandaloneBadge ? (
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                            <StepIcon
                              className={cn(
                                'h-11 w-11 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                                active ? 'scale-[1.08]' : complete ? 'scale-[1.03]' : 'opacity-95'
                              )}
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                              circleClass
                            )}
                          >
                            <StepIcon className={cn('h-4.5 w-4.5 transition-transform duration-500', active ? 'scale-110' : '')} />
                          </div>
                        )}
                        {complete ? (
                          <span
                            className={cn(
                              'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] shadow-sm',
                              isDarkMode ? 'border-[#020817]' : 'border-white',
                              meta.badge
                            )}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          'max-w-[120px] whitespace-nowrap text-center text-xs font-semibold leading-4 transition-colors duration-300',
                          labelToneClass
                        )}
                      >
                        {stepCopy[item].title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogHeader>

        {showMockTestProgress ? (
          <div
            className={cn(
              'border-b px-5 py-3 sm:px-7',
              isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/80'
            )}
          >
            <div className={cn('rounded-[22px] border px-4 py-3', progressToneClass)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1 text-sm font-medium leading-6">{mockTestGenerationMessage}</div>
                <div className="shrink-0 text-xs font-semibold">{progressLabel}</div>
              </div>
              <div className={cn('mt-3 h-2 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-900/70' : 'bg-white/80')}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    mockTestGenerationState === 'ready'
                      ? 'bg-emerald-500'
                      : isAwaitingBackendConfirmation
                        ? 'bg-[linear-gradient(90deg,#22d3ee,#38bdf8,#22d3ee)] bg-[length:200%_100%] animate-pulse'
                        : mockTestGenerationState === 'error'
                          ? 'bg-rose-500'
                          : 'bg-cyan-500'
                  )}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <div key={wizard.step} className={stepTransitionClass}>
            {renderStep()}
          </div>
        </div>

        <div
          className={cn(
            'sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 backdrop-blur sm:px-7',
            isDarkMode ? 'border-slate-800 bg-[#020817]/90' : 'border-slate-200 bg-white/90'
          )}
        >
          <div className="space-y-1">
            <div className={cn('text-xs leading-5', mutedClass)}>
              {t('workspace.profileConfig.footerHint', {
                current: wizard.step,
                total: wizard.totalSteps,
              })}
            </div>
            {wizard.saveError ? <p className="text-xs font-medium text-red-400">{wizard.saveError}</p> : null}
            {!wizard.saveError && wizard.statusNotice ? (
              <p
                className={cn(
                  'text-xs font-medium',
                  wizard.statusTone === 'success'
                    ? 'text-emerald-400'
                    : wizard.statusTone === 'info'
                      ? 'text-cyan-400'
                      : wizard.statusTone === 'error'
                        ? 'text-red-400'
                        : mutedClass
                )}
              >
                {wizard.statusNotice}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {wizard.step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isNavigationBusy}
                onClick={wizard.previousStep}
                className={cn(
                  'rounded-full px-5',
                  isDarkMode ? 'text-slate-200 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('workspace.profileConfig.actions.previous')}
              </Button>
            ) : null}

            {!isReadOnly && wizard.step < wizard.totalSteps ? (
              <Button
                type="button"
                disabled={isPrimaryActionBusy}
                onClick={wizard.nextStep}
                className="rounded-full bg-cyan-600 px-6 text-white transition-all hover:bg-cyan-700"
              >
                {isPrimaryActionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.isMockTestGenerationPending
                  ? actionCopy.generatingTemplate
                  : wizard.isWaitingForOverallReview
                    ? actionCopy.overallReviewLoading
                  : wizard.submitting
                    ? t('workspace.profileConfig.actions.saving')
                    : t('workspace.profileConfig.actions.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}

            {!isReadOnly && wizard.step === wizard.totalSteps ? (
              <Button
                type="button"
                disabled={isPrimaryActionBusy}
                onClick={async () => {
                  const result = await wizard.handleSubmit();
                  if (result?.ok && result?.shouldConfirm !== false) {
                    await onConfirm?.();
                  }
                }}
                className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              >
                {isPrimaryActionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.isMockTestGenerationPending
                  ? actionCopy.generatingTemplate
                  : wizard.isWaitingForOverallReview
                    ? actionCopy.overallReviewLoading
                  : wizard.submitting
                    ? t('workspace.profileConfig.actions.saving')
                    : actionCopy.confirm}
              </Button>
            ) : null}

            {isReadOnly ? (
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full bg-cyan-600 px-6 text-white hover:bg-cyan-700"
              >
                {t('workspace.profileConfig.actions.close')}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default IndividualWorkspaceProfileConfigDialog;
