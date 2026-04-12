import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import FeedbackQuestionFields from '@/Components/feedback/FeedbackQuestionFields';
import {
  dismissFeedbackRequest,
  resolveFeedbackForm,
  submitDirectFeedback,
  submitFeedbackRequest,
} from '@/api/FeedbackAPI';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import {
  buildFeedbackSubmissionPayload,
  getFeedbackTargetLabel,
  isFeedbackAnswerFilled,
} from '@/lib/feedback';

function FeedbackSubmitDialog({
  open,
  onOpenChange,
  request = null,
  targetType = null,
  targetId = null,
  title = '',
  description = '',
  isDarkMode = false,
  onSubmitted,
  onDismissed,
  allowDismiss = false,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const currentLang = i18n.language || 'vi';
  const isEnglish = currentLang.startsWith('en');
  const [resolvedForm, setResolvedForm] = useState(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState({});
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [inlineError, setInlineError] = useState('');

  const activeForm = request?.form ?? resolvedForm;
  const questions = activeForm?.questions ?? [];
  const isRequestMode = Boolean(request?.requestId);

  useEffect(() => {
    if (!open) {
      setInlineError('');
      return;
    }

    if (request?.form) {
      setResolvedForm(request.form);
      return;
    }

    if (!targetType) {
      return;
    }

    let cancelled = false;

    const fetchForm = async () => {
      setLoadingForm(true);
      setInlineError('');
      try {
        const response = await resolveFeedbackForm(targetType, targetId);
        if (cancelled) return;
        setResolvedForm(response?.data ?? response);
      } catch (error) {
        if (cancelled) return;
        setInlineError(getErrorMessage(t, error));
      } finally {
        if (!cancelled) {
          setLoadingForm(false);
        }
      }
    };

    fetchForm();
    return () => {
      cancelled = true;
    };
  }, [open, request, targetId, targetType, t]);

  useEffect(() => {
    setAnswersByQuestionId((currentAnswers) => {
      if (!open || !questions.length) {
        return Object.keys(currentAnswers).length > 0 ? {} : currentAnswers;
      }

      const nextAnswers = {};
      questions.forEach((question) => {
        if (currentAnswers[question.questionId] !== undefined) {
          nextAnswers[question.questionId] = currentAnswers[question.questionId];
        }
      });

      const currentKeys = Object.keys(currentAnswers);
      const nextKeys = Object.keys(nextAnswers);
      if (currentKeys.length !== nextKeys.length) {
        return nextAnswers;
      }

      for (const key of nextKeys) {
        if (currentAnswers[key] !== nextAnswers[key]) {
          return nextAnswers;
        }
      }

      return currentAnswers;
    });
  }, [open, questions]);

  const missingRequiredQuestions = useMemo(
    () => questions.filter((question) => question.required && !isFeedbackAnswerFilled(question, answersByQuestionId[question.questionId])),
    [answersByQuestionId, questions],
  );

  const handleAnswerChange = (questionId, nextValue) => {
    setAnswersByQuestionId((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: nextValue,
    }));
    setInlineError('');
  };

  const handleSubmit = async () => {
    if (!activeForm) {
      return;
    }

    if (missingRequiredQuestions.length > 0) {
      setInlineError(t('feedbackDialog.errors.requiredQuestions', 'Please answer all required questions.'));
      return;
    }

    const submission = buildFeedbackSubmissionPayload(questions, answersByQuestionId);
    setSubmitting(true);
    setInlineError('');

    try {
      const response = isRequestMode
        ? await submitFeedbackRequest(request.requestId, submission)
        : await submitDirectFeedback({
            targetType,
            targetId,
            submission,
          });

      showSuccess(isEnglish ? 'Feedback submitted successfully.' : 'Đã gửi phản hồi thành công.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feedbackUpdated'));
      }
      onOpenChange?.(false);
      onSubmitted?.(response?.data ?? response);
    } catch (error) {
      const message = getErrorMessage(t, error);
      setInlineError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!isRequestMode || !request?.requestId) {
      onOpenChange?.(false);
      return;
    }

    setDismissing(true);
    setInlineError('');

    try {
      await dismissFeedbackRequest(request.requestId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feedbackUpdated'));
      }
      onOpenChange?.(false);
      onDismissed?.(request.requestId);
    } catch (error) {
      const message = getErrorMessage(t, error);
      setInlineError(message);
      showError(message);
    } finally {
      setDismissing(false);
    }
  };

  const resolvedTargetLabel = getFeedbackTargetLabel(targetType ?? request?.targetType, currentLang);
  const dialogTitle = title || activeForm?.title || (isEnglish ? `Feedback for ${resolvedTargetLabel}` : `Phản hồi cho ${resolvedTargetLabel}`);
  const dialogDescription = description || activeForm?.description || (isEnglish
    ? 'Share a short review so the system can improve.'
    : 'Chia sẻ một vài nhận xét để hệ thống cải thiện tốt hơn.');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isDarkMode ? 'max-w-3xl border-slate-800 bg-slate-900 text-white' : 'max-w-3xl'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-blue-500" />
            <span>{dialogTitle}</span>
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          {loadingForm ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : null}

          {!loadingForm && activeForm ? (
            <FeedbackQuestionFields
              questions={questions}
              answersByQuestionId={answersByQuestionId}
              onAnswerChange={handleAnswerChange}
              isDarkMode={isDarkMode}
              disabled={submitting}
            />
          ) : null}

          {!loadingForm && !activeForm && !inlineError ? (
            <div className={isDarkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-500'}>
              {isEnglish ? 'Form is not available.' : 'Form hiện không khả dụng.'}
            </div>
          ) : null}
        </div>

        {inlineError ? (
          <div className={isDarkMode ? 'rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300' : 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'}>
            {inlineError}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {allowDismiss && isRequestMode ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              disabled={submitting || dismissing}
              className={isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
            >
              {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {dismissing
                ? (isEnglish ? 'Skipping...' : 'Đang bỏ qua...')
                : (isEnglish ? 'Skip' : 'Bỏ qua')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting || dismissing}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              {isEnglish ? 'Cancel' : 'Hủy'}
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={submitting || dismissing || loadingForm || !activeForm}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting
              ? (isEnglish ? 'Submitting...' : 'Đang gửi...')
              : (isEnglish ? 'Submit feedback' : 'Gửi phản hồi')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackSubmitDialog;
