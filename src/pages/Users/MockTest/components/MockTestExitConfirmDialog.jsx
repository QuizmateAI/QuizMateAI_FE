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

/**
 * Confirm dialog hien thi khi user thoat khoi form Tao Mocktest ma chua submit.
 *
 * Layout (3 buttons): destructive "Exit without saving" tach ben trai;
 * "Keep editing" (cancel) + "Save & exit" (primary) gom ben phai.
 * Mobile: stacked, primary tren cung -> keep editing -> discard cuoi.
 *
 * Props:
 *   open: bool
 *   onCancel: () => void  — keep editing
 *   onDiscard: () => void — discard draft and exit
 *   onSaveAndExit: () => void — save current AI template to user's library then exit (optional)
 *   canSaveTemplate: bool — true when there is a usable structure to save
 *   message: optional string override
 */
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            {t('mockTestForms.exitConfirm.title', 'Thoát khỏi form tạo mocktest?')}
          </DialogTitle>
          <DialogDescription className="pl-10 text-sm leading-relaxed text-slate-600">
            {message || t(
              'mockTestForms.exitConfirm.description',
              'Template AI vừa gợi ý có thể bị mất nếu bạn thoát mà chưa lưu. Bạn có thể lưu template này vào kho riêng để dùng lại sau hoặc thoát không lưu.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onDiscard?.()}
            className="order-3 h-10 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 sm:order-1"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t('mockTestForms.exitConfirm.discard', 'Thoát không lưu')}
          </Button>

          <div className="flex flex-col gap-2 sm:order-2 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onCancel?.()}
              className="h-10"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('mockTestForms.exitConfirm.keepEditing', 'Tiếp tục chỉnh sửa')}
            </Button>
            {showSaveAction && (
              <Button
                type="button"
                onClick={() => onSaveAndExit?.()}
                className="h-10 bg-orange-500 text-white shadow-sm hover:bg-orange-600"
              >
                <Save className="mr-1.5 h-4 w-4" />
                {t('mockTestForms.exitConfirm.saveAndExit', 'Lưu template và thoát')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
