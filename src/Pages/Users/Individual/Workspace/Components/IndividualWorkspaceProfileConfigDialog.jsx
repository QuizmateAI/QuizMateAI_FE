import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
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
const STEP_THEMES = {
  1: {
    lightCard: 'border-sky-200 bg-sky-50/90',
    lightActiveCard: 'border-sky-300 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100',
    darkCard: 'border-sky-400/20 bg-sky-500/10',
    darkActiveCard: 'border-sky-300/40 bg-gradient-to-br from-cyan-500/18 via-sky-500/16 to-blue-500/18',
    lightBadge: 'bg-sky-100 text-sky-700',
    lightActiveBadge: 'bg-sky-600 text-white',
    darkBadge: 'bg-sky-500/15 text-sky-200',
    darkActiveBadge: 'bg-sky-300 text-slate-950',
    lightDescription: 'text-sky-900/75',
    darkDescription: 'text-sky-100/75',
  },
  2: {
    lightCard: 'border-orange-200 bg-orange-50/90',
    lightActiveCard: 'border-orange-300 bg-gradient-to-br from-amber-50 via-orange-50 to-orange-100',
    darkCard: 'border-orange-400/20 bg-orange-500/10',
    darkActiveCard: 'border-orange-300/40 bg-gradient-to-br from-amber-500/18 via-orange-500/16 to-amber-600/18',
    lightBadge: 'bg-orange-100 text-orange-700',
    lightActiveBadge: 'bg-orange-500 text-white',
    darkBadge: 'bg-orange-500/15 text-orange-200',
    darkActiveBadge: 'bg-orange-300 text-slate-950',
    lightDescription: 'text-orange-900/75',
    darkDescription: 'text-orange-100/75',
  },
  3: {
    lightCard: 'border-emerald-200 bg-emerald-50/90',
    lightActiveCard: 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100',
    darkCard: 'border-emerald-400/20 bg-emerald-500/10',
    darkActiveCard: 'border-emerald-300/40 bg-gradient-to-br from-emerald-500/18 via-green-500/16 to-lime-500/18',
    lightBadge: 'bg-emerald-100 text-emerald-700',
    lightActiveBadge: 'bg-emerald-600 text-white',
    darkBadge: 'bg-emerald-500/15 text-emerald-200',
    darkActiveBadge: 'bg-emerald-300 text-slate-950',
    lightDescription: 'text-emerald-900/75',
    darkDescription: 'text-emerald-100/75',
  },
};

function IndividualWorkspaceProfileConfigDialog({
  open,
  onOpenChange,
  onSave,
  isDarkMode,
  initialData,
  isReadOnly = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const wizard = useWorkspaceProfileWizard({ open, initialData, onSave, t, isReadOnly });

  const shellClass = isDarkMode ? 'border-slate-800 bg-[#020817] text-white' : 'border-slate-200 bg-[#f8fbff] text-slate-900';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

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
          disabled={isReadOnly}
          onPurposeChange={wizard.setPurpose}
          onFieldChange={wizard.updateField}
          onDomainSelect={wizard.selectInferredDomain}
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
          selectedExam={wizard.selectedExam}
          examSearch={wizard.examSearch}
          templateStatus={wizard.templateStatus}
          templatePreview={wizard.templatePreview}
          disabled={isReadOnly}
          onFieldChange={wizard.updateField}
          onMockExamModeChange={wizard.setMockExamMode}
          onExamSearchChange={wizard.setExamSearch}
          onPublicExamSelect={wizard.selectPublicExam}
          onGenerateTemplate={wizard.generateTemplatePreviewAsync}
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
              ? 'bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(251,146,60,0.08),rgba(74,222,128,0.12))]'
              : 'bg-[linear-gradient(90deg,rgba(14,165,233,0.10),rgba(249,115,22,0.08),rgba(34,197,94,0.10))]'
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
                  total: 3,
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

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {STEP_IDS.map((item) => {
              const active = wizard.step === item;
              const complete = wizard.isStepComplete(item) && wizard.step > item;
              const theme = STEP_THEMES[item];

              return (
                <div
                  key={item}
                  className={cn(
                    'rounded-[18px] border px-3 py-2.5 transition-all',
                    active || complete
                      ? isDarkMode
                        ? theme.darkActiveCard
                        : theme.lightActiveCard
                      : isDarkMode
                        ? theme.darkCard
                        : theme.lightCard
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                        active || complete
                          ? isDarkMode
                            ? theme.darkActiveBadge
                            : theme.lightActiveBadge
                          : isDarkMode
                            ? theme.darkBadge
                            : theme.lightBadge
                      )}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : item}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5">{t(`workspace.profileConfig.steps.${item}.title`)}</p>
                      <p
                        className={cn(
                          'mt-0.5 line-clamp-2 text-[12px] leading-4',
                          isDarkMode ? theme.darkDescription : theme.lightDescription
                        )}
                      >
                        {t(`workspace.profileConfig.steps.${item}.description`)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogHeader>

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
                total: 3,
              })}
            </div>
            {wizard.saveError ? <p className="text-xs font-medium text-red-400">{wizard.saveError}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={wizard.submitting}
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

            {!isReadOnly && wizard.step < 3 ? (
              <Button
                type="button"
                disabled={wizard.submitting}
                onClick={wizard.nextStep}
                className="rounded-full bg-cyan-600 px-6 text-white hover:bg-cyan-700"
              >
                {wizard.submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.submitting ? t('workspace.profileConfig.actions.saving') : t('workspace.profileConfig.actions.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}

            {!isReadOnly && wizard.step === 3 ? (
              <Button
                type="button"
                disabled={wizard.submitting}
                onClick={wizard.handleSubmit}
                className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              >
                {wizard.submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {wizard.submitting ? t('workspace.profileConfig.actions.saving') : t('workspace.profileConfig.actions.finish')}
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
