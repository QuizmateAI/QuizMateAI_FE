import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, Check, ChevronLeft, ChevronRight, FilePenLine, Loader2, Rocket, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import IndividualWorkspaceProfileConfirmView from './IndividualWorkspaceProfileConfirmView';
import WorkspaceProfileStepOne from './WorkspaceProfileWizard/WorkspaceProfileStepOne';
import WorkspaceProfileStepTwo from './WorkspaceProfileWizard/WorkspaceProfileStepTwo';
import WorkspaceProfileStepThree from './WorkspaceProfileWizard/WorkspaceProfileStepThree';
import {
  getBeginnerScopeLabel,
  isAbsoluteBeginnerLevel,
} from './WorkspaceProfileWizard/profileWizardBeginnerUtils';
import { useWorkspaceProfileWizard } from './WorkspaceProfileWizard/useWorkspaceProfileWizard';

function QuizmateStepOneIcon({ className, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-sky-200 bg-[radial-gradient(circle_at_30%_30%,#f0f9ff_0%,#dbeafe_48%,#bfdbfe_100%)] text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.18)]',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <BookMarked className="h-[52%] w-[52%]" />
    </span>
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

function translateOrFallback(t, key, fallback, options) {
  const translated = t(key, options);
  return translated === key ? fallback : translated;
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function createConfirmationSummary(t, values, options = {}) {
  const emptyValueLabel = t(
    'individualWorkspaceProfileConfigDialog.emptyValue',
    'Not set yet'
  );
  const shouldShowRoadmapConfig = options?.canCreateRoadmap !== false
    && (values.workspacePurpose === 'STUDY_NEW' || values.enableRoadmap);
  const beginnerScope = getBeginnerScopeLabel(
    values,
    t('individualWorkspaceProfileConfigDialog.beginnerFallbackScope', 'this topic')
  );
  const isBeginnerProfile = isAbsoluteBeginnerLevel(values.currentLevel);
  const purposeTitle = values.workspacePurpose
    ? translateOrFallback(
      t,
      `workspace.profileConfig.purpose.${values.workspacePurpose}.title`,
      normalizeDisplayValue(values.workspacePurpose)
    )
    : emptyValueLabel;
  const strongAreasValue = normalizeDisplayValue(values.strongAreas)
    || (isBeginnerProfile
      ? t(
        'individualWorkspaceProfileConfigDialog.beginnerStrongSuggestion',
        'Still at the very beginning so clear strengths have not been identified yet.',
        { scope: beginnerScope }
      )
      : emptyValueLabel);
  const weakAreasValue = normalizeDisplayValue(values.weakAreas)
    || (isBeginnerProfile
      ? t(
        'individualWorkspaceProfileConfigDialog.beginnerWeakSuggestion',
        'Still at the very beginning so clear weaknesses have not been identified yet.',
        { scope: beginnerScope }
      )
      : emptyValueLabel);
  const roadmapItems = shouldShowRoadmapConfig
    ? [
      {
        id: 'knowledgeLoad',
        label: translateOrFallback(t, 'workspace.profileConfig.fields.knowledgeLoad', 'Knowledge amount'),
        value: values.knowledgeLoad
          ? translateOrFallback(
            t,
            `workspace.profileConfig.knowledgeLoad.${values.knowledgeLoad}.title`,
            normalizeDisplayValue(values.knowledgeLoad)
          )
          : emptyValueLabel,
      },
      {
        id: 'adaptationMode',
        label: t('individualWorkspaceProfileConfigDialog.fields.adaptationMode', 'Roadmap type'),
        value: values.adaptationMode
          ? translateOrFallback(
            t,
            `workspace.profileConfig.adaptationMode.${values.adaptationMode}.title`,
            normalizeDisplayValue(values.adaptationMode)
          )
          : emptyValueLabel,
      },
      {
        id: 'roadmapSpeedMode',
        label: t('individualWorkspaceProfileConfigDialog.fields.roadmapSpeedMode', 'Roadmap pace'),
        value: values.roadmapSpeedMode
          ? translateOrFallback(
            t,
            `workspace.profileConfig.roadmapSpeedMode.${values.roadmapSpeedMode}.title`,
            normalizeDisplayValue(values.roadmapSpeedMode)
          )
          : emptyValueLabel,
      },
      {
        id: 'estimatedTotalDays',
        label: t('individualWorkspaceProfileConfigDialog.fields.estimatedTotalDays', 'Estimated number of days'),
        value: Number(values.estimatedTotalDays) > 0
          ? t(
            'individualWorkspaceProfileConfigDialog.values.estimatedTotalDays',
            '{{value}} days',
            { value: values.estimatedTotalDays }
          )
          : emptyValueLabel,
      },
      {
        id: 'recommendedMinutesPerDay',
        label: t(
          'individualWorkspaceProfileConfigDialog.fields.recommendedMinutesPerDay',
          'Minutes of study per day'
        ),
        value: Number(values.recommendedMinutesPerDay) > 0
          ? t(
            'individualWorkspaceProfileConfigDialog.values.recommendedMinutesPerDay',
            '{{value}} minutes/day',
            { value: values.recommendedMinutesPerDay }
          )
          : emptyValueLabel,
      },
    ]
    : [
      {
        id: 'roadmapDisabled',
        value: t(
          'individualWorkspaceProfileConfigDialog.roadmapDisabled',
          'Roadmap is not enabled for this profile.'
        ),
      },
    ];

  return {
    summaryLabel: t(
      'individualWorkspaceProfileConfigDialog.summaryLabel',
      'Profile to be applied'
    ),
    sections: [
      {
        id: 'purpose',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.purpose',
          'Usage purpose'
        ),
        items: [{ id: 'purposeValue', value: purposeTitle }],
      },
      {
        id: 'knowledgeDomain',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.knowledgeDomain',
          'Knowledge - domain'
        ),
        items: [
          {
            id: 'knowledgeInput',
            label: t('individualWorkspaceProfileConfigDialog.fields.knowledgeInput', 'Knowledge you want to learn'),
            value: normalizeDisplayValue(values.knowledgeInput) || emptyValueLabel,
          },
        ],
      },
      {
        id: 'currentLevel',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.currentLevel',
          'Current level'
        ),
        items: [
          {
            id: 'currentLevelValue',
            value: normalizeDisplayValue(values.currentLevel) || emptyValueLabel,
          },
        ],
      },
      {
        id: 'learningGoal',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.learningGoal',
          'Goal'
        ),
        items: [
          {
            id: 'learningGoalValue',
            value: normalizeDisplayValue(values.learningGoal) || emptyValueLabel,
          },
        ],
      },
      {
        id: 'strengthWeakness',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.strengthWeakness',
          'Strengths and weaknesses'
        ),
        spanClass: 'md:col-span-2',
        items: [
          {
            id: 'strongAreas',
            label: t('individualWorkspaceProfileConfigDialog.fields.strongAreas', 'Strengths'),
            value: strongAreasValue,
          },
          {
            id: 'weakAreas',
            label: t('individualWorkspaceProfileConfigDialog.fields.weakAreas', 'Weaknesses'),
            value: weakAreasValue,
          },
        ],
      },
      {
        id: 'roadmapConfig',
        title: t(
          'individualWorkspaceProfileConfigDialog.sections.roadmapConfig',
          'Roadmap settings'
        ),
        spanClass: 'md:col-span-2',
        itemsGridClass: shouldShowRoadmapConfig ? 'grid gap-3 md:grid-cols-2' : 'space-y-3',
        items: roadmapItems,
      },
    ],
  };
}

function createStepCopy(t) {
  return {
    1: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.1.title', 'Step 1'),
      stepperLabel: translateOrFallback(
        t,
        'workspace.profileConfig.steps.1.stepperLabel',
        'Knowledge focus'
      ),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.1.description',
        'Choose how you want to learn and let AI identify the right knowledge area.'
      ),
    },
    2: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.2.title', 'Step 2'),
      stepperLabel: translateOrFallback(
        t,
        'workspace.profileConfig.steps.2.stepperLabel',
        'Current profile'
      ),
      description: translateOrFallback(
        t,
        'workspace.profileConfig.steps.2.description',
        'Add your current level, goals, and focus areas to shape the next steps.'
      ),
    },
    3: {
      title: translateOrFallback(t, 'workspace.profileConfig.steps.3.title', 'Step 3'),
      stepperLabel: translateOrFallback(
        t,
        'workspace.profileConfig.steps.3.stepperLabel',
        'Roadmap setup'
      ),
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
    loadingProfile: translateOrFallback(
      t,
      'workspace.profileConfig.actions.loadingProfile',
      'Đang tải hồ sơ workspace...'
    ),
    overallReviewLoading: translateOrFallback(
      t,
      'workspace.profileConfig.stepTwo.overallReviewLoadingTitle',
      'Quizmate AI is performing an overall review'
    ),
    confirm: t('individualWorkspaceProfileConfigDialog.actions.confirm', 'Confirm'),
    cancel: translateOrFallback(t, 'workspace.profileConfig.actions.cancel', 'Cancel'),
    confirmProfileUse: translateOrFallback(
      t,
      'workspace.profileConfig.actions.confirmProfileUse',
      'Use this profile'
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
  canCreateRoadmap = true,
  isReadOnly = false,
  forceStartAtStepOne = false,
  onSuggestRoadmapConfig,
  initialProfileLoading = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const wizard = useWorkspaceProfileWizard({
    open,
    initialData,
    onSave,
    storageKey: workspaceId ? `workspace-profile-wizard-${workspaceId}` : undefined,
    canCreateRoadmap,
    forceStartAtStepOne,
    t,
    isReadOnly,
  });
  const stepCopy = createStepCopy(t);
  const actionCopy = createActionCopy(t);
  const stepIds = Array.from({ length: wizard.totalSteps }, (_, index) => index + 1);
  const isInitialProfileLoading = Boolean(initialProfileLoading);

  const shellClass = isDarkMode ? 'border-slate-800 bg-[#020817] text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const isNavigationBusy = wizard.submitting;
  const isPrimaryActionBusy = isInitialProfileLoading || isNavigationBusy || wizard.isWaitingForOverallReview;
  const progressFraction = stepIds.length > 1 ? (wizard.step - 1) / (stepIds.length - 1) : 0;
  const stepTransitionClass = 'animate-in fade-in-50 slide-in-from-bottom-3 zoom-in-95 duration-500';
  const [isProfileConfirmView, setIsProfileConfirmView] = React.useState(false);
  const [isApplyingConfirmedProfile, setIsApplyingConfirmedProfile] = React.useState(false);
  const [confirmProfileError, setConfirmProfileError] = React.useState('');
  const confirmationTitle = t(
    'individualWorkspaceProfileConfigDialog.confirmProfile.title',
    'Confirm using this profile'
  );
  const confirmationDescription = t(
    'individualWorkspaceProfileConfigDialog.confirmProfile.description',
    'Are you sure you want to use this profile? Once confirmed, the system will save the current configuration for this learning workspace.'
  );
  const confirmationSummary = React.useMemo(
    () => createConfirmationSummary(t, wizard.values, { canCreateRoadmap }),
    [t, wizard.values, canCreateRoadmap]
  );
  const progressLabel = isInitialProfileLoading
    ? actionCopy.loadingProfile
    : t('workspace.profileConfig.footerHint', {
      current: wizard.step,
      total: wizard.totalSteps,
    });

  React.useEffect(() => {
    if (!open) {
      setIsProfileConfirmView(false);
      setIsApplyingConfirmedProfile(false);
      setConfirmProfileError('');
    }
  }, [open]);

  function handleCloseProfileConfirm() {
    if (isApplyingConfirmedProfile) {
      return;
    }
    setIsProfileConfirmView(false);
    setConfirmProfileError('');
  }

  async function handleConfirmedProfileUse() {
    if (isApplyingConfirmedProfile) {
      return;
    }

    setConfirmProfileError('');

    try {
      const result = await wizard.handleSubmit();
      if (result?.ok && result?.shouldConfirm !== false) {
        setIsApplyingConfirmedProfile(true);

        try {
          await onConfirm?.({
            workspaceNameSuggestion: wizard.workspaceNameSuggestion || null,
          });
          onOpenChange(false);
        } catch (error) {
          setConfirmProfileError(
            error?.message
              || t(
                'workspace.profileConfig.messages.confirmError',
                'Không thể xác nhận hồ sơ này. Vui lòng thử lại.'
              )
          );
        } finally {
          setIsApplyingConfirmedProfile(false);
        }
        return;
      }

      if (!result?.ok || result?.shouldConfirm === false) {
        handleCloseProfileConfirm();
      }
    } catch (error) {
      setConfirmProfileError(
        error?.message
          || t(
            'workspace.profileConfig.messages.confirmError',
            'Không thể xác nhận hồ sơ này. Vui lòng thử lại.'
          )
      );
    }
  }

  function renderStep() {
    if (isInitialProfileLoading) {
      return (
        <div className="flex min-h-[320px] items-center justify-center">
          <div
            role="status"
            className={cn(
              'flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border px-6 py-8 text-center',
              isDarkMode ? 'border-slate-800 bg-slate-950/50 text-slate-200' : 'border-slate-200 bg-white/80 text-slate-700'
            )}
          >
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">{actionCopy.loadingProfile}</p>
              <p className={cn('text-xs leading-5', mutedClass)}>
                {translateOrFallback(
                  t,
                  'workspace.profileConfig.actions.loadingProfileDescription',
                  'QuizMate AI đang đồng bộ bước đã lưu trước khi tiếp tục.'
                )}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (wizard.step === 1) {
      return (
        <WorkspaceProfileStepOne
          t={t}
          isDarkMode={isDarkMode}
          values={wizard.values}
          errors={wizard.errors}
          analysisStatus={wizard.analysisStatus}
          knowledgeOptions={wizard.knowledgeOptions}
          domainOptions={wizard.domainOptions}
          needsKnowledgeDescription={wizard.needsKnowledgeDescription}
          knowledgeAnalysis={wizard.knowledgeAnalysis}
          disabled={isReadOnly}
          canCreateRoadmap={canCreateRoadmap}
          onPurposeChange={wizard.setPurpose}
          onFieldChange={wizard.updateField}
          onKnowledgeSelect={wizard.selectKnowledgeOption}
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
          consistencyResult={wizard.consistencyResult}
          consistencyStatus={wizard.consistencyStatus}
          disabled={isReadOnly}
          onFieldChange={wizard.updateField}
          onGenerateTemplate={wizard.generateTemplatePreviewAsync}
          onApplySuggestion={wizard.applySuggestion}
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
        canCreateRoadmap={canCreateRoadmap}
        onFieldChange={wizard.updateField}
        onSuggestRoadmapConfig={onSuggestRoadmapConfig}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isApplyingConfirmedProfile) {
          return;
        }
        if (!nextOpen) {
          setIsProfileConfirmView(false);
          setIsApplyingConfirmedProfile(false);
          setConfirmProfileError('');
        }
        onOpenChange(nextOpen);
      }}
    >
      {!isProfileConfirmView ? (
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
                {progressLabel}
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
              {isInitialProfileLoading ? (
                <div className="flex w-full items-center justify-center py-4">
                  <div className={cn('flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold', isDarkMode ? 'border-slate-800 bg-slate-950/70 text-slate-200' : 'border-slate-200 bg-white text-slate-700')}>
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    {actionCopy.loadingProfile}
                  </div>
                </div>
              ) : (
              <div className="relative flex w-full items-center justify-between py-2">
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-[6%] top-1/2 h-[3px] -translate-y-1/2 rounded-full',
                    isDarkMode ? 'bg-slate-800/70' : 'bg-slate-200'
                  )}
                />
                <div
                  className={cn(
                    'pointer-events-none absolute left-[6%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#f97316_52%,#22c55e_100%)] shadow-[0_0_18px_rgba(14,165,233,0.25)] transition-all duration-700'
                  )}
                  style={{
                    width: `${progressFraction * 88}%`,
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
                <div
                  className="pointer-events-none absolute left-[6%] top-1/2 h-[8px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.18)_0%,rgba(249,115,22,0.18)_52%,rgba(34,197,94,0.18)_100%)] blur-md transition-all duration-700"
                  style={{
                    width: `${progressFraction * 88}%`,
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
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
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                            <StepIcon
                              className={cn(
                                'h-10 w-10 shrink-0 transition-all duration-500',
                                active ? 'scale-[1.08]' : complete ? 'scale-[1.03]' : 'opacity-95'
                              )}
                              style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all duration-500',
                              circleClass
                            )}
                            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
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
                          'max-w-[180px] text-center text-[11px] font-medium leading-4 transition-colors duration-300 sm:text-xs',
                          labelToneClass
                        )}
                      >
                        <span className="sr-only">{stepCopy[item].title}</span>
                        {stepCopy[item].stepperLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        </DialogHeader>

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
              {progressLabel}
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
            {!isInitialProfileLoading && wizard.step > 1 ? (
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

            {!isInitialProfileLoading && !isReadOnly && wizard.step < wizard.totalSteps ? (
              <Button
                type="button"
                disabled={isPrimaryActionBusy}
                onClick={wizard.nextStep}
                className="rounded-full bg-cyan-600 px-6 text-white transition-all hover:bg-cyan-700"
              >
                {isPrimaryActionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.isWaitingForOverallReview
                  ? actionCopy.overallReviewLoading
                  : wizard.submitting
                    ? t('workspace.profileConfig.actions.saving')
                    : t('workspace.profileConfig.actions.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}

            {!isInitialProfileLoading && !isReadOnly && wizard.step === wizard.totalSteps ? (
              <Button
                type="button"
                disabled={isPrimaryActionBusy}
                onClick={() => {
                  if (!wizard.showValidationErrors(wizard.step)) {
                    return;
                  }
                  setConfirmProfileError('');
                  setIsProfileConfirmView(true);
                }}
                className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              >
                {isPrimaryActionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.isWaitingForOverallReview
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
      ) : (
        <IndividualWorkspaceProfileConfirmView
          actionCopy={actionCopy}
          confirmDisabled={wizard.submitting || wizard.isWaitingForOverallReview || isApplyingConfirmedProfile}
          confirmProfileError={confirmProfileError}
          confirmationDescription={confirmationDescription}
          confirmationSummary={confirmationSummary}
          confirmationTitle={confirmationTitle}
          fontClass={fontClass}
          isApplyingConfirmedProfile={isApplyingConfirmedProfile}
          isDarkMode={isDarkMode}
          isSubmitting={wizard.submitting}
          onClose={handleCloseProfileConfirm}
          onConfirm={handleConfirmedProfileUse}
          shellClass={shellClass}
          stepLabel={translateOrFallback(
            t,
            'workspace.profileConfig.footerHint',
            `Step ${wizard.totalSteps} / ${wizard.totalSteps}`,
            {
              current: wizard.totalSteps,
              total: wizard.totalSteps,
            }
          )}
          t={t}
        />
      )}
    </Dialog>
  );
}

export default IndividualWorkspaceProfileConfigDialog;
