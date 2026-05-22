import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Save, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function MockTestExitConfirmDialog({
  open,
  onCancel,
  onDiscard,
  onSaveAndExit,
  canSaveTemplate = false,
  message,
}) {
  const { t } = useTranslation();
  const showSaveAction = canSaveTemplate && Boolean(onSaveAndExit);

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onCancel?.(); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {t('mockTestForms.exitConfirm.title', 'Thoát khỏi form tạo mocktest?')}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-slate-500">
                {message || t(
                  'mockTestForms.exitConfirm.description',
                  'Template AI vừa gợi ý có thể bị mất nếu bạn thoát mà chưa lưu. Bạn có thể lưu template này vào kho riêng để dùng lại sau hoặc thoát không lưu.',
                )}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-5">
          {showSaveAction && (
            <Button
              type="button"
              onClick={() => onSaveAndExit?.()}
              className="h-10 w-full bg-orange-500 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {t('mockTestForms.exitConfirm.saveAndExit', 'Lưu template và thoát')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel?.()}
            className="h-10 w-full"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('mockTestForms.exitConfirm.keepEditing', 'Tiếp tục chỉnh sửa')}
          </Button>
          <button
            type="button"
            onClick={() => onDiscard?.()}
            className="mt-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium text-rose-600 transition-colors hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('mockTestForms.exitConfirm.discard', 'Thoát không lưu')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
