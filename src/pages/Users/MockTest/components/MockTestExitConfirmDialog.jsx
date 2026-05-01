import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Confirm dialog hien thi khi user thoat khoi form Tao Mocktest ma chua submit.
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
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onCancel?.(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('mockTestForms.exitConfirm.title', 'Thoát khỏi form tạo mocktest?')}
          </DialogTitle>
          <DialogDescription>
            {message || t(
              'mockTestForms.exitConfirm.description',
              'Template AI vừa gợi ý có thể bị mất nếu bạn thoát mà chưa lưu. Bạn có thể lưu template này vào kho riêng để dùng lại sau hoặc thoát không lưu.',
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel?.()}
          >
            {t('mockTestForms.exitConfirm.keepEditing', 'Tiếp tục chỉnh sửa')}
          </Button>
          {canSaveTemplate && onSaveAndExit && (
            <Button
              type="button"
              onClick={() => onSaveAndExit?.()}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {t('mockTestForms.exitConfirm.saveAndExit', 'Lưu template và thoát')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDiscard?.()}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            {t('mockTestForms.exitConfirm.discard', 'Thoát không lưu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
