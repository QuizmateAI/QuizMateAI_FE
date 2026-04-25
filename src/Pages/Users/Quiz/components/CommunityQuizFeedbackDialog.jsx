import React from 'react';
import { Loader2, MessageSquareText, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { submitCommunityQuizReview } from '@/api/QuizAPI';
import { useToast } from '@/context/ToastContext';

function StarButton({ value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-full p-2 transition-transform hover:scale-105 ${active ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
    >
      <Star className={`h-7 w-7 ${active ? 'fill-current' : ''}`} />
    </button>
  );
}

export default function CommunityQuizFeedbackDialog({
  open,
  onOpenChange,
  sourceQuizId,
  clonedQuizId,
  initialRating = null,
  initialComment = '',
  onSubmitted,
  isDarkMode = false,
  title = null,
  description = null,
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [rating, setRating] = React.useState(initialRating);
  const [comment, setComment] = React.useState(initialComment || '');
  const [submitting, setSubmitting] = React.useState(false);
  const resolvedTitle = title || t('workspace.quiz.communityFeedback.title');
  const resolvedDescription = description || t('workspace.quiz.communityFeedback.description');

  React.useEffect(() => {
    if (!open) return;
    setRating(initialRating ?? null);
    setComment(initialComment || '');
  }, [initialComment, initialRating, open]);

  const handleSubmit = React.useCallback(async () => {
    const normalizedSourceQuizId = Number(sourceQuizId);
    const normalizedClonedQuizId = Number(clonedQuizId);
    if (!Number.isInteger(normalizedSourceQuizId) || normalizedSourceQuizId <= 0) return;
    if (!Number.isInteger(normalizedClonedQuizId) || normalizedClonedQuizId <= 0) return;
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      showError(t('workspace.quiz.communityFeedback.ratingRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await submitCommunityQuizReview(normalizedSourceQuizId, {
        clonedQuizId: normalizedClonedQuizId,
        rating: Number(rating),
        comment: comment.trim() || null,
      });
      showSuccess(t('workspace.quiz.communityFeedback.success'));
      onOpenChange?.(false);
      if (typeof onSubmitted === 'function') {
        await onSubmitted({
          rating: Number(rating),
          comment: comment.trim() || '',
        });
      }
    } catch (error) {
      showError(error?.message || t('workspace.quiz.communityFeedback.error'));
    } finally {
      setSubmitting(false);
    }
  }, [clonedQuizId, comment, onOpenChange, onSubmitted, rating, showError, showSuccess, sourceQuizId, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-lg ${
        isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-100' : ''
      }`}>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
            {resolvedDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
              Bạn thấy quiz này thế nào?
            </p>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }, (_, index) => (
                <StarButton
                  key={index + 1}
                  value={index + 1}
                  active={Number(rating) >= index + 1}
                  onClick={setRating}
                />
              ))}
            </div>
          </div>

          <div>
            <p className={`flex items-center gap-2 text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
              <MessageSquareText className="h-4 w-4" />
              <span>Nhận xét thêm</span>
            </p>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              placeholder={t('workspace.quiz.communityFeedback.commentPlaceholder')}
              className={`mt-3 w-full rounded-3xl border px-4 py-3 text-sm outline-none transition-colors ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{t('workspace.quiz.communityFeedback.submit')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
