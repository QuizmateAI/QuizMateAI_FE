import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Check, ChevronLeft, ChevronRight, Flag, Loader2, Target, X } from 'lucide-react';
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

const STEP_IDS = [1, 2, 3];
const STEP_ICON_MAP = {
  1: Brain,
  2: Target,
  3: Flag,
};

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function createStepCopy(t, language) {
  const isEnglish = language === 'en';

  return {
    1: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.1.title', isEnglish ? 'Step 1' : 'Bước 1'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.1.description',
        isEnglish ? 'Choose the workspace intent and let AI assess the knowledge area.' : 'Chọn mục đích sử dụng workspace và để AI đánh giá kiến thức.'
      ),
    },
    2: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.2.title', isEnglish ? 'Step 2' : 'Bước 2'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.2.description',
        isEnglish ? 'Add your current level, goals, and mock-test details if needed.' : 'Bổ sung trình độ hiện tại, mục tiêu và thông tin mock test nếu cần.'
      ),
    },
    3: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.3.title', isEnglish ? 'Step 3' : 'Bước 3'),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.3.description',
        isEnglish ? 'Finish the roadmap setup and confirm the learning pace.' : 'Hoàn tất cấu hình roadmap và chốt nhịp học cho workspace.'
      ),
    },
  };
}

function createActionCopy(t, language) {
  const isEnglish = language === 'en';

  return {
    generatingTemplate: translateOrFallback(
      t,
      'workspace.profileConfig.actions.generatingTemplate',
      isEnglish ? 'Generating template...' : 'Template đang được tạo...'
    ),
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
  const stepCopy = createStepCopy(t, i18n.language);
  const actionCopy = createActionCopy(t, i18n.language);

  const shellClass = isDarkMode ? 'border-slate-800 bg-[#020817] text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const showMockTestProgress = wizard.values.workspacePurpose === 'MOCK_TEST' && mockTestGenerationState !== 'idle' && mockTestGenerationMessage;
  const progressValue = Math.max(0, Math.min(100, Number(mockTestGenerationProgress) || 0));
  const isAwaitingBackendConfirmation = mockTestGenerationState === 'pending' && progressValue >= 92;
  const progressLabel = isAwaitingBackendConfirmation
    ? translateOrFallback(t, 'workspace.profileConfig.messages.mockTemplateAwaitingBackendShort', i18n.language === 'en' ? 'Confirming' : 'Đang xác nhận')
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
  const isPrimaryActionBusy = wizard.submitting || wizard.isMockTestGenerationPending;
  const progressFraction = STEP_IDS.length > 1 ? (wizard.step - 1) / (STEP_IDS.length - 1) : 0;

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
            <div className="relative flex w-full items-center justify-between">
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-[6%] top-1/2 h-[2px] -translate-y-1/2 rounded-full',
                  isDarkMode ? 'bg-slate-800/70' : 'bg-slate-200'
                )}
              />
              <div
                className={cn(
                  'pointer-events-none absolute left-[6%] top-1/2 h-[2px] -translate-y-1/2 rounded-full transition-all duration-500 ease-out',
                  isDarkMode ? 'bg-cyan-400' : 'bg-cyan-500'
                )}
                style={{ width: `${progressFraction * 88}%` }}
              />
              {STEP_IDS.map((item) => {
              const active = wizard.step === item;
                const complete = wizard.maxUnlockedStep > item && !active;
                const canReview = wizard.canNavigateToStep(item);
                const StepIcon = STEP_ICON_MAP[item];

                return (
                  <button
                    key={item}
                    type="button"
                    disabled={!canReview}
                    onClick={() => wizard.goToStep(item)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 bg-transparent transition-all',
                      canReview
                        ? 'cursor-pointer focus-visible:outline-none'
                        : 'cursor-default'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
                        complete
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30'
                          : active
                            ? isDarkMode
                              ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30 scale-105'
                              : 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-300/50 scale-105'
                            : isDarkMode
                              ? 'border-2 border-slate-600 bg-[#020617] text-slate-400'
                              : 'border-2 border-slate-300 bg-white text-slate-400'
                      )}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    </div>
                    <span
                      className={cn(
                        'max-w-[120px] whitespace-nowrap text-center text-xs font-medium leading-4',
                        complete
                          ? isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                          : active
                            ? isDarkMode ? 'font-semibold text-white' : 'font-semibold text-slate-900'
                            : mutedClass
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

        <div className="overflow-y-auto px-5 py-5 sm:px-7">{renderStep()}</div>

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
            <Button
              type="button"
              variant="ghost"
              disabled={isPrimaryActionBusy}
              onClick={() => {
                if (wizard.step === 1) {
                  onOpenChange(false);
                  return;
                }

                wizard.previousStep();
              }}
              className={cn(
                'rounded-full px-5',
                isDarkMode ? 'text-slate-200 hover:bg-slate-900 hover:text-white' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              {wizard.step === 1 ? t('workspace.profileConfig.actions.cancel') : t('workspace.profileConfig.actions.previous')}
            </Button>

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
                  : wizard.submitting
                    ? t('workspace.profileConfig.actions.saving')
                    : t('workspace.profileConfig.actions.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}

            {!isReadOnly && wizard.step === wizard.totalSteps ? (
              <Button
                type="button"
                disabled={wizard.submitting}
                onClick={async () => {
                  const result = await wizard.handleSubmit();
                  if (result?.ok) {
                    await onConfirm?.();
                  }
                }}
                className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              >
                {wizard.submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Xác nhận
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
