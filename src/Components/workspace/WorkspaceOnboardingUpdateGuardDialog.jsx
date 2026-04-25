import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import i18n from '@/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

function WorkspaceOnboardingUpdateGuardDialogContent({
  onOpenChange,
  isDarkMode,
  currentLang,
  materialCount,
  hasLearningData,
  onDeleteAndContinue,
  deleting,
}) {
  const [step, setStep] = useState('materials');
  const t = useMemo(
    () => i18n.getFixedT(currentLang === 'en' ? 'en' : 'vi'),
    [currentLang],
  );

  const copy = useMemo(() => ({
    stepOneTitle: t('workspaceOnboardingUpdateGuard.stepOneTitle', {
      defaultValue: 'Cannot update onboarding - workspace has documents',
    }),
    stepOneDescription: t('workspaceOnboardingUpdateGuard.stepOneDescription', {
      defaultValue: 'This workspace currently has {{count}} uploaded materials, so the onboarding setup cannot be updated yet. To continue, remove those materials from the workspace first.',
      count: materialCount,
    }),
    stepOneHint: t('workspaceOnboardingUpdateGuard.stepOneHint', {
      defaultValue: 'To update onboarding, click "Delete documents" below. The onboarding form will reopen automatically once all materials have been removed.',
    }),
    stepOneNextRisk: t('workspaceOnboardingUpdateGuard.stepOneNextRisk', {
      defaultValue: 'This workspace also has quiz or roadmap data that is still in progress. If you delete the materials, that current workspace data will also be removed.',
    }),
    stepOneNextSafe: t('workspaceOnboardingUpdateGuard.stepOneNextSafe', {
      defaultValue: 'After the materials are deleted, the onboarding form will reopen automatically so you can update it right away.',
    }),
    stepTwoTitle: t('workspaceOnboardingUpdateGuard.stepTwoTitle', {
      defaultValue: 'All current workspace data will be permanently deleted',
    }),
    stepTwoDescription: t('workspaceOnboardingUpdateGuard.stepTwoDescription', {
      defaultValue: 'If you continue, all current data in this workspace will be deleted. Are you sure you want to proceed?',
    }),
    stepTwoHint: t('workspaceOnboardingUpdateGuard.stepTwoHint', {
      defaultValue: 'This action cannot be undone. All quizzes, roadmaps, and documents in this workspace will be removed before the onboarding form opens again.',
    }),
    stepTwoRisk: t('workspaceOnboardingUpdateGuard.stepTwoRisk', {
      defaultValue: 'This includes all current quiz progress, roadmap content, and uploaded materials in the workspace.',
    }),
    cancel: t('workspaceOnboardingUpdateGuard.cancel', {
      defaultValue: 'Cancel',
    }),
    back: t('workspaceOnboardingUpdateGuard.back', {
      defaultValue: 'Back',
    }),
    deleteMaterials: t('workspaceOnboardingUpdateGuard.deleteMaterials', {
      defaultValue: 'Delete documents',
    }),
    confirmDelete: t('workspaceOnboardingUpdateGuard.confirmDelete', {
      defaultValue: 'Confirm delete',
    }),
  }), [materialCount, t]);

  const handlePrimaryAction = async () => {
    if (deleting) return;

    if (step === 'materials' && hasLearningData) {
      setStep('data-loss');
      return;
    }

    await onDeleteAndContinue?.();
  };

  const showRiskStep = step === 'data-loss';

  return (
    <DialogContent
      className={cn(
        'sm:max-w-[560px]',
        isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'
      )}
    >
      <DialogHeader>
        <div
          className={cn(
            'mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl',
            showRiskStep
              ? (isDarkMode ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-600')
              : (isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-600')
          )}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <DialogTitle>{showRiskStep ? copy.stepTwoTitle : copy.stepOneTitle}</DialogTitle>
        <DialogDescription className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
          {showRiskStep ? copy.stepTwoDescription : copy.stepOneDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 text-sm leading-6">
        <div
          className={cn(
            'rounded-2xl border px-4 py-3',
            isDarkMode ? 'border-slate-800 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'
          )}
        >
          {showRiskStep ? copy.stepTwoHint : copy.stepOneHint}
        </div>

        <div
          className={cn(
            'rounded-2xl border px-4 py-3',
            showRiskStep
              ? (isDarkMode ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700')
              : (isDarkMode ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700')
          )}
        >
          {showRiskStep ? copy.stepTwoRisk : (hasLearningData ? copy.stepOneNextRisk : copy.stepOneNextSafe)}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-end">
        {showRiskStep ? (
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => setStep('materials')}
          >
            {copy.back}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={() => onOpenChange?.(false)}
        >
          {copy.cancel}
        </Button>
        <Button
          type="button"
          disabled={deleting}
          onClick={handlePrimaryAction}
          className={cn(
            'text-white',
            showRiskStep ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'
          )}
        >
          {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {showRiskStep ? copy.confirmDelete : copy.deleteMaterials}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function WorkspaceOnboardingUpdateGuardDialog({
  open,
  onOpenChange,
  isDarkMode,
  currentLang = 'vi',
  materialCount = 0,
  hasLearningData = false,
  onDeleteAndContinue,
  deleting = false,
}) {
  return (
    <Dialog open={open} onOpenChange={deleting ? undefined : onOpenChange}>
      {open ? (
        <WorkspaceOnboardingUpdateGuardDialogContent
          onOpenChange={onOpenChange}
          isDarkMode={isDarkMode}
          currentLang={currentLang}
          materialCount={materialCount}
          hasLearningData={hasLearningData}
          onDeleteAndContinue={onDeleteAndContinue}
          deleting={deleting}
        />
      ) : null}
    </Dialog>
  );
}

export default WorkspaceOnboardingUpdateGuardDialog;
