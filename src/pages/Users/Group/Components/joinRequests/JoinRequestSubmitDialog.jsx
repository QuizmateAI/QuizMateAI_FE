import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/getErrorMessage';
import ToastError from '@/components/system/ToastError';

const MESSAGE_MAX = 500;

function JoinRequestSubmitDialog({
  open,
  onOpenChange,
  groupName = '',
  isDarkMode = false,
  onSubmit,
}) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMessage('');
    setSubmitting(false);
    setSubmitError('');
  }, [open]);

  const trimmedMessage = message.trim();

  const messageError = useMemo(() => {
    if (trimmedMessage.length > MESSAGE_MAX) {
      return t('groupJoinRequest.submit.errors.messageTooLong', { max: MESSAGE_MAX });
    }
    return '';
  }, [t, trimmedMessage]);

  const canSubmit = !messageError && !submitting;

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit?.({ message: trimmedMessage });
      onOpenChange?.(false);
    } catch (err) {
      setSubmitError(getErrorMessage(t, err) || t('groupJoinRequest.submit.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange?.(next); }}>
      <DialogContent className={cn(
        'sm:max-w-[480px]',
        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900',
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className={cn('h-5 w-5', isDarkMode ? 'text-blue-300' : 'text-blue-600')} />
            {t('groupJoinRequest.submit.title')}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            {groupName
              ? t('groupJoinRequest.submit.descriptionWithName', { name: groupName })
              : t('groupJoinRequest.submit.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="join-request-message"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupJoinRequest.submit.messageLabel')}
              <span className={cn('ml-1 text-xs font-normal', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                {t('groupJoinRequest.submit.messageOptional')}
              </span>
            </label>
            <textarea
              id="join-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX + 50}
              placeholder={t('groupJoinRequest.submit.messagePlaceholder')}
              rows={4}
              disabled={submitting}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[100px]',
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
                messageError ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
            />
            <div className="flex items-center justify-between text-xs">
              <ToastError message={messageError} />
              <span className="text-transparent">.</span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedMessage.length}/{MESSAGE_MAX}
              </span>
            </div>
          </div>

          <ToastError message={submitError} />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
              className={cn(isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : '')}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('groupJoinRequest.submit.submitButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default JoinRequestSubmitDialog;
