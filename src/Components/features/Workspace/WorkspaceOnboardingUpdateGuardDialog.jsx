import React, { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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

  const copy = useMemo(() => {
    if (currentLang === 'en') {
      return {
        stepOneTitle: 'Cannot update onboarding — workspace has documents',
        stepOneDescription: `You currently have ${materialCount} document${materialCount === 1 ? '' : 's'} in this workspace, so onboarding cannot be updated. To proceed, you must remove the documents from the workspace first.`,
        stepOneHint: 'To update onboarding, click "Delete documents" below. The onboarding form will reopen automatically once all documents have been removed.',
        stepOneNextRisk: 'Note: this workspace also has quiz or roadmap data that has not been completed. If you delete the documents, all current workspace data will also be lost.',
        stepOneNextSafe: 'After deleting the documents, the onboarding form will reopen automatically so you can update it right away.',
        stepTwoTitle: 'All current workspace data will be permanently deleted',
        stepTwoDescription: 'If you delete, you will lose all current data in this workspace. Are you sure you want to continue?',
        stepTwoHint: 'This action cannot be undone. All quizzes, roadmaps, and documents in this workspace will be permanently removed before the onboarding form reopens.',
        cancel: 'Cancel',
        back: 'Back',
        deleteMaterials: 'Delete documents',
        confirmDelete: 'Confirm delete',
      };
    }

    return {
      stepOneTitle: 'Không thể cập nhật onboarding — workspace đang có tài liệu',
      stepOneDescription: `Hiện bạn đã có ${materialCount} tài liệu nên không thể cập nhật. Nếu muốn, bạn phải xóa tài liệu khỏi workspace trước.`,
      stepOneHint: 'Để cập nhật onboarding, nhấn "Xóa tài liệu" bên dưới. Form onboarding sẽ tự mở lại sau khi toàn bộ tài liệu được xóa.',
      stepOneNextRisk: 'Lưu ý: workspace này cũng đang có dữ liệu quiz hoặc roadmap chưa hoàn tất. Nếu xóa tài liệu, toàn bộ dữ liệu hiện tại trong workspace cũng sẽ bị mất.',
      stepOneNextSafe: 'Sau khi xóa tài liệu, form onboarding sẽ tự mở lại để bạn cập nhật ngay.',
      stepTwoTitle: 'Toàn bộ dữ liệu hiện tại trong workspace sẽ bị xóa vĩnh viễn',
      stepTwoDescription: 'Nếu xóa, bạn sẽ mất toàn bộ dữ liệu hiện tại trong workspace. Bạn có chắc chắn muốn tiếp tục?',
      stepTwoHint: 'Hành động này không thể hoàn tác. Toàn bộ quiz, roadmap và tài liệu trong workspace sẽ bị xóa vĩnh viễn trước khi form onboarding mở lại.',
      cancel: 'Hủy',
      back: 'Quay lại',
      deleteMaterials: 'Xóa tài liệu',
      confirmDelete: 'Xác nhận xóa',
    };
  }, [currentLang, materialCount]);

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
          {showRiskStep ? copy.stepTwoHint : (hasLearningData ? copy.stepOneNextRisk : copy.stepOneNextSafe)}
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
