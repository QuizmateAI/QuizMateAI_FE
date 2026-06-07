import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/getErrorMessage';
import ToastError from '@/components/system/ToastError';

// Khớp BE validation: title 2–280, content 2–10000. Để Save bị disabled tới khi
// hai field hợp lệ, tránh round-trip để nhận error VN.
const TITLE_MIN = 2;
const TITLE_MAX = 280;
const CONTENT_MIN = 2;
const CONTENT_MAX = 10000;

function AnnouncementFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialValue = null,
  isDarkMode = false,
  onSubmit,
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isEditing = mode === 'edit';

  // Reset state mỗi lần mở (hoặc đổi mode/initial) — tránh leak draft cũ giữa
  // các lần mở dialog liên tiếp.
  useEffect(() => {
    if (!open) return;
    setTitle(String(initialValue?.title || ''));
    setContent(String(initialValue?.content || ''));
    setPinned(Boolean(initialValue?.pinned));
    setSubmitting(false);
    setSubmitError('');
  }, [open, initialValue]);

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  const titleError = useMemo(() => {
    if (!trimmedTitle) return t('groupWorkspace.announcements.form.errors.titleRequired');
    if (trimmedTitle.length < TITLE_MIN) return t('groupWorkspace.announcements.form.errors.titleTooShort', { min: TITLE_MIN });
    if (trimmedTitle.length > TITLE_MAX) return t('groupWorkspace.announcements.form.errors.titleTooLong', { max: TITLE_MAX });
    return '';
  }, [t, trimmedTitle]);

  const contentError = useMemo(() => {
    if (!trimmedContent) return t('groupWorkspace.announcements.form.errors.contentRequired');
    if (trimmedContent.length < CONTENT_MIN) return t('groupWorkspace.announcements.form.errors.contentTooShort', { min: CONTENT_MIN });
    if (trimmedContent.length > CONTENT_MAX) return t('groupWorkspace.announcements.form.errors.contentTooLong', { max: CONTENT_MAX });
    return '';
  }, [t, trimmedContent]);

  const canSubmit = !titleError && !contentError && !submitting;

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit?.({ title: trimmedTitle, content: trimmedContent, pinned });
      onOpenChange?.(false);
    } catch (err) {
      setSubmitError(getErrorMessage(t, err) || t('groupWorkspace.announcements.form.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange?.(next); }}>
      <DialogContent
        className={cn(
          'sm:max-w-[560px]',
          isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900',
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('groupWorkspace.announcements.form.editTitle')
              : t('groupWorkspace.announcements.form.createTitle')}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            {t('groupWorkspace.announcements.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="announcement-title"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupWorkspace.announcements.form.titleLabel')}
              <span className="text-red-500">{' *'}</span>
            </label>
            <Input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX + 10}
              placeholder={t('groupWorkspace.announcements.form.titlePlaceholder')}
              className={cn(
                isDarkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : '',
                titleError && trimmedTitle ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
              autoFocus
              disabled={submitting}
            />
            <div className="flex items-center justify-between text-xs">
              <ToastError message={titleError} enabled={Boolean(titleError && trimmedTitle)} />
              <span className="text-transparent">.</span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedTitle.length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="announcement-content"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupWorkspace.announcements.form.contentLabel')}
              <span className="text-red-500">{' *'}</span>
            </label>
            <textarea
              id="announcement-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={CONTENT_MAX + 50}
              placeholder={t('groupWorkspace.announcements.form.contentPlaceholder')}
              rows={8}
              disabled={submitting}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[160px]',
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
                contentError && trimmedContent ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
            />
            <div className="flex items-center justify-between text-xs">
              <ToastError message={contentError} enabled={Boolean(contentError && trimmedContent)} />
              <span className="text-transparent">.</span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedContent.length}/{CONTENT_MAX}
              </span>
            </div>
          </div>

          <label
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer select-none',
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50',
            )}
          >
            <Checkbox
              checked={pinned}
              onCheckedChange={(value) => setPinned(value === true)}
              disabled={submitting}
            />
            <span className={cn('text-sm', isDarkMode ? 'text-slate-200' : 'text-gray-800')}>
              {t('groupWorkspace.announcements.form.pinnedLabel')}
            </span>
            <span className={cn('ml-auto text-xs', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
              {t('groupWorkspace.announcements.form.pinnedHint')}
            </span>
          </label>

          <ToastError message={submitError} />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
              className={cn(isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : '')}
            >
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing
                ? t('groupWorkspace.announcements.form.saveButton')
                : t('groupWorkspace.announcements.form.publishButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AnnouncementFormDialog;
