import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
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

const NOTE_MAX = 500;

function JoinRequestDecisionDialog({
  open,
  onOpenChange,
  // 'approve' | 'reject'
  decision,
  request = null,
  isDarkMode = false,
  onConfirm,
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isReject = decision === 'reject';

  useEffect(() => {
    if (!open) return;
    setNote('');
    setSubmitting(false);
    setSubmitError('');
  }, [open]);

  const trimmedNote = note.trim();
  const noteError = useMemo(() => {
    if (trimmedNote.length > NOTE_MAX) {
      return t('groupJoinRequest.decision.errors.noteTooLong', { max: NOTE_MAX });
    }
    return '';
  }, [t, trimmedNote]);

  const canSubmit = !noteError && !submitting;

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm?.({ decisionNote: trimmedNote || undefined });
      onOpenChange?.(false);
    } catch (err) {
      setSubmitError(getErrorMessage(t, err) || t('groupJoinRequest.decision.errors.submit'));
    } finally {
      setSubmitting(false);
    }
  };

  const titleKey = isReject
    ? 'groupJoinRequest.decision.rejectTitle'
    : 'groupJoinRequest.decision.approveTitle';
  const descriptionKey = isReject
    ? 'groupJoinRequest.decision.rejectDescription'
    : 'groupJoinRequest.decision.approveDescription';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange?.(next); }}>
      <DialogContent className={cn(
        'sm:max-w-[480px]',
        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900',
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReject
              ? <X className="h-5 w-5 text-red-500" />
              : <Check className="h-5 w-5 text-emerald-500" />}
            {t(titleKey)}
          </DialogTitle>
          <DialogDescription className={cn(isDarkMode ? 'text-slate-400' : 'text-gray-500')}>
            {t(descriptionKey, { name: request?.requesterName || '' })}
          </DialogDescription>
        </DialogHeader>

        {request?.message ? (
          <div className={cn(
            'rounded-md border px-3 py-2 text-sm whitespace-pre-wrap',
            isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-700',
          )}>
            <p className={cn('mb-1 text-xs font-medium uppercase tracking-wide', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
              {t('groupJoinRequest.decision.requesterMessage')}
            </p>
            {request.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="join-request-note"
              className={cn('text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-800')}
            >
              {t('groupJoinRequest.decision.noteLabel')}
              <span className={cn('ml-1 text-xs font-normal', isDarkMode ? 'text-slate-500' : 'text-gray-500')}>
                {t('groupJoinRequest.decision.noteOptional')}
              </span>
            </label>
            <textarea
              id="join-request-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX + 50}
              placeholder={isReject
                ? t('groupJoinRequest.decision.noteRejectPlaceholder')
                : t('groupJoinRequest.decision.noteApprovePlaceholder')}
              rows={3}
              disabled={submitting}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[80px]',
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
                noteError ? 'border-red-500 focus-visible:ring-red-500' : '',
              )}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={cn(noteError ? 'text-red-500' : 'text-transparent')}>
                {noteError || '.'}
              </span>
              <span className={cn(isDarkMode ? 'text-slate-500' : 'text-gray-400')}>
                {trimmedNote.length}/{NOTE_MAX}
              </span>
            </div>
          </div>

          {submitError ? (
            <p className="text-sm text-red-500" role="alert">{submitError}</p>
          ) : null}

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
            <Button
              type="submit"
              disabled={!canSubmit}
              variant={isReject ? 'destructive' : 'default'}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isReject
                ? t('groupJoinRequest.decision.rejectButton')
                : t('groupJoinRequest.decision.approveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default JoinRequestDecisionDialog;
