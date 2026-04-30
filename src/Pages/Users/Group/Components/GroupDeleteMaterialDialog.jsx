import React from 'react';
import { AlertTriangle, FileText, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function getMaterialTitle(material, t) {
  return material?.title || material?.name || t('groupDocumentsTab.confirmDeleteFallbackTitle', 'this material');
}

export default function GroupDeleteMaterialDialog({
  open = false,
  material = null,
  deleting = false,
  isDarkMode = false,
  onOpenChange,
  onConfirm,
  t,
}) {
  const materialTitle = getMaterialTitle(material, t);

  const handleOpenChange = (nextOpen) => {
    if (deleting && !nextOpen) return;
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideClose={deleting}
        className={cn(
          'max-w-md overflow-hidden rounded-2xl border p-0 shadow-2xl',
          isDarkMode ? 'border-white/10 bg-slate-950 text-slate-50' : 'border-slate-200 bg-white text-slate-950',
        )}
      >
        <DialogHeader className="gap-0 p-5 pb-0 text-left">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                isDarkMode ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-700',
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className={cn('text-lg font-bold leading-6', isDarkMode ? 'text-white' : 'text-slate-950')}>
                {t('groupDocumentsTab.deleteDialogTitle', 'Delete this document?')}
              </DialogTitle>
              <DialogDescription className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                {t('groupDocumentsTab.deleteDialogDescription', 'This removes the document from the group workspace. Existing member files are not changed.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4">
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border px-3 py-3',
              isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50',
            )}
          >
            <FileText className={cn('mt-0.5 h-4 w-4 shrink-0', isDarkMode ? 'text-slate-300' : 'text-slate-500')} />
            <p className={cn('min-w-0 break-all text-sm font-semibold leading-5', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {materialTitle}
            </p>
          </div>
          <p className={cn('mt-3 text-xs leading-5', isDarkMode ? 'text-amber-100/85' : 'text-amber-700')}>
            {t('groupDocumentsTab.deleteDialogWarning', 'Quizzes or flashcards that depend on this document may need to be refreshed after deletion.')}
          </p>
        </div>

        <DialogFooter className={cn('gap-2 border-t p-4 sm:space-x-0', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => handleOpenChange(false)}
            className={cn(
              'rounded-full',
              isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50',
            )}
          >
            {t('groupDocumentsTab.deleteDialogCancel', 'Keep document')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
            className="rounded-full"
          >
            <Trash2 className={cn('h-4 w-4', deleting ? 'animate-pulse' : '')} />
            {deleting
              ? t('groupDocumentsTab.deleteDialogDeleting', 'Deleting...')
              : t('groupDocumentsTab.deleteDialogConfirm', 'Delete document')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
