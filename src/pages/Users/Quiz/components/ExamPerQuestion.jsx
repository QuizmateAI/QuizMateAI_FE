import { useReducer, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock3, FileQuestion, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QuestionCard from './QuestionCard';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload, hasAnswerValue } from '../utils/quizTransform';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function makeReducer(questions) {
  return (state, action) => {
    switch (action.type) {
      case 'RESET':
        return {
          currentIndex: action.payload.currentIndex,
          timeLeft: action.payload.timeLeft,
        };
      case 'NEXT': {
        const next = state.currentIndex + 1;
        return { currentIndex: next, timeLeft: questions[next]?.timeLimit || 0 };
      }
      case 'TICK':
        return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };
      default:
        return state;
    }
  };
}

function resolvePerQuestionProgress(questions, attemptStartedAt, answers) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { currentIndex: 0, timeLeft: 0, isFinished: true };
  }

  const firstUnansweredIndex = questions.findIndex((q) => !hasAnswerValue(answers?.[q?.id]));
  const fallbackIndex = firstUnansweredIndex === -1 ? questions.length : firstUnansweredIndex;

  if (!attemptStartedAt) {
    if (fallbackIndex >= questions.length) {
      return { currentIndex: questions.length - 1, timeLeft: 0, isFinished: true };
    }
    return {
      currentIndex: fallbackIndex,
      timeLeft: Math.max(0, Number(questions[fallbackIndex]?.timeLimit) || 0),
      isFinished: false,
    };
  }

  const startedAtMs = new Date(attemptStartedAt).getTime();
  if (Number.isNaN(startedAtMs)) {
    if (fallbackIndex >= questions.length) {
      return { currentIndex: questions.length - 1, timeLeft: 0, isFinished: true };
    }
    return {
      currentIndex: fallbackIndex,
      timeLeft: Math.max(0, Number(questions[fallbackIndex]?.timeLimit) || 0),
      isFinished: false,
    };
  }

  let elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) elapsedSeconds = 0;

  let timelineIndex = 0;
  let timelineTimeLeft = Math.max(0, Number(questions[0]?.timeLimit) || 0);
  let cursor = elapsedSeconds;

  for (let i = 0; i < questions.length; i += 1) {
    const questionDuration = Math.max(0, Number(questions[i]?.timeLimit) || 0);

    if (cursor >= questionDuration) {
      cursor -= questionDuration;
      continue;
    }

    timelineIndex = i;
    timelineTimeLeft = Math.max(0, questionDuration - cursor);
    break;
  }

  const totalDuration = questions.reduce((sum, q) => sum + Math.max(0, Number(q?.timeLimit) || 0), 0);
  const isTimelineFinished = elapsedSeconds >= totalDuration;
  const isAnsweredFinished = fallbackIndex >= questions.length;

  if (isTimelineFinished || isAnsweredFinished) {
    return { currentIndex: questions.length - 1, timeLeft: 0, isFinished: true };
  }

  const resolvedIndex = Math.max(timelineIndex, fallbackIndex);
  const resolvedTimeLeft = resolvedIndex === timelineIndex
    ? timelineTimeLeft
    : Math.max(0, Number(questions[resolvedIndex]?.timeLimit) || 0);

  return {
    currentIndex: resolvedIndex,
    timeLeft: resolvedTimeLeft,
    isFinished: false,
  };
}

export default function ExamPerQuestion({
  quiz,
  answers,
  onSelectAnswer,
  onTextAnswerChange,
  onMatchingAnswerChange,
  onSubmit,
  attemptId,
  attemptStartedAt,
  submitError,
  fontClass,
}) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(
    makeReducer(quiz.questions),
    { currentIndex: 0, timeLeft: quiz.questions[0]?.timeLimit || 0 },
  );
  const [isFinished, setIsFinished] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextError, setNextError] = useState('');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  // Track which question index has already been handled on timeout
  const handledTimeUpForIndexRef = useRef(-1);
  const submittingRef = useRef(false);
  const initializedAttemptRef = useRef(null);

  const { currentIndex, timeLeft } = state;
  const currentQuestion = quiz.questions[currentIndex];
  const total = quiz.questions.length;
  const unansweredQuestionNumbers = useMemo(
    () => quiz.questions.flatMap((question, index) => (hasAnswerValue(answers?.[question?.id]) ? [] : [index + 1])),
    [answers, quiz.questions],
  );
  const resolveTemplatedText = useCallback((key, fallback, replacements = {}) => {
    const template = t(key);
    const base = template === key ? fallback : template;
    return Object.entries(replacements).reduce(
      (message, [name, value]) => message.replaceAll(`{{${name}}}`, String(value)),
      String(base),
    );
  }, [t]);
  const submitConfirmState = useMemo(() => {
    const unansweredCount = unansweredQuestionNumbers.length;
    const previewNumbers = unansweredQuestionNumbers.slice(0, 8);

    return {
      unansweredCount,
      previewNumbers,
      hasMore: unansweredCount > previewNumbers.length,
      title: unansweredCount > 0
        ? resolveTemplatedText(
          'workspace.quiz.examActions.confirmSubmitIncompleteTitle',
          unansweredCount === 1
            ? 'You still have 1 unanswered question'
            : `You still have ${unansweredCount} unanswered questions`,
          { count: unansweredCount },
        )
        : t('workspace.quiz.examActions.confirmSubmitCompletedTitle', 'Ready to submit your exam?'),
      description: unansweredCount > 0
        ? resolveTemplatedText(
          'workspace.quiz.examActions.confirmSubmitIncompleteDescription',
          'These questions will be submitted as unanswered. Do you still want to continue?',
          { count: unansweredCount },
        )
        : t('workspace.quiz.examActions.confirmSubmitCompletedDescription', 'You have completed all questions. Once submitted, you will not be able to edit your answers.'),
    };
  }, [resolveTemplatedText, t, unansweredQuestionNumbers]);

  useEffect(() => {
    if (!attemptId || initializedAttemptRef.current === attemptId) {
      return;
    }

    const progress = resolvePerQuestionProgress(quiz.questions, attemptStartedAt, answers);

    dispatch({
      type: 'RESET',
      payload: {
        currentIndex: progress.currentIndex,
        timeLeft: progress.timeLeft,
      },
    });

    if (progress.isFinished && !submittingRef.current) {
      (async () => {
        submittingRef.current = true;
        setIsFinished(true);
        const submitOk = await onSubmit?.();
        if (!submitOk) {
          submittingRef.current = false;
          setIsFinished(false);
        }
      })();
    }

    initializedAttemptRef.current = attemptId;
  }, [attemptId, attemptStartedAt, answers, onSubmit, quiz.questions]);

  // Save a specific question answer to API.
  // If retryInBackground=true, this method retries once to reduce transient failures.
  const saveQuestionAnswer = useCallback(async (qId, selected, { retryInBackground = false } = {}) => {
    if (!attemptId || !qId) return { ok: true, skipped: true };
    if (!hasAnswerValue(selected)) return { ok: true, skipped: true };
    const payload = buildSavePayload({ [qId]: selected });
    if (payload.length === 0) return { ok: true, skipped: true };

    const runSave = async (remainingRetry) => {
      try {
        await saveAttemptAnswers(attemptId, payload);
        return { ok: true, skipped: false };
      } catch (err) {
        if (remainingRetry > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return runSave(remainingRetry - 1);
        }
        console.error('[PerQuestion] Save failed:', err);
        return { ok: false, error: err };
      }
    };

    try {
      return await runSave(retryInBackground ? 1 : 0);
    } catch (err) {
      console.error('[PerQuestion] Save failed:', err);
      return { ok: false, error: err };
    }
  }, [attemptId]);

  // Countdown — dispatch TICK every second
  useEffect(() => {
    if (timeLeft <= 0 || isFinished) return;
    const timer = setTimeout(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isFinished]);

  // Auto-advance when time expires (fire once per question via index tracking)
  useEffect(() => {
    if (timeLeft > 0 || isFinished || !currentQuestion?.timeLimit) return;
    if (handledTimeUpForIndexRef.current === currentIndex) return;
    handledTimeUpForIndexRef.current = currentIndex;

    const timeout = setTimeout(async () => {
      const qId = currentQuestion?.id;
      const selected = qId ? answers[qId] : undefined;

      if (currentIndex >= total - 1) {
        const saveResult = await saveQuestionAnswer(qId, selected);
        if (saveResult && !saveResult.ok) {
          setNextError(saveResult?.error?.message || t('workspace.quiz.examActions.saveAnswerFailed', 'Failed to save answer. Please try again.'));
          return;
        }
        if (!submittingRef.current) {
          submittingRef.current = true;
          setIsFinished(true);
          const submitOk = await onSubmit?.();
          if (!submitOk) {
            submittingRef.current = false;
            setIsFinished(false);
          }
        }
      } else {
        // Move immediately, then save in background to avoid blocking next question UX.
        dispatch({ type: 'NEXT' });
        void saveQuestionAnswer(qId, selected, { retryInBackground: true }).then((saveResult) => {
          if (saveResult && !saveResult.ok) {
            setNextError(saveResult?.error?.message || t('workspace.quiz.examActions.saveAnswerFailed', 'Failed to save answer. Please try again.'));
          }
        });
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [timeLeft, isFinished, currentIndex, total, onSubmit, currentQuestion?.id, currentQuestion?.timeLimit, answers, saveQuestionAnswer, t]);

  const handleNext = useCallback(async () => {
    setNextLoading(true);
    setNextError('');

    const qId = currentQuestion?.id;
    const selected = qId ? answers[qId] : undefined;

    if (currentIndex >= total - 1) {
      setConfirmSubmitOpen(true);
      setNextLoading(false);
      return;
    }

    // Move immediately, save in background.
    dispatch({ type: 'NEXT' });
    setNextLoading(false);
    void saveQuestionAnswer(qId, selected, { retryInBackground: true }).then((saveResult) => {
      if (saveResult && !saveResult.ok) {
        setNextError(saveResult?.error?.message || t('workspace.quiz.examActions.saveAnswerFailed', 'Failed to save answer. Please try again.'));
      }
    });
  }, [currentIndex, total, onSubmit, currentQuestion?.id, answers, saveQuestionAnswer, t]);

  const handleConfirmSubmit = useCallback(async () => {
    if (nextLoading) return;

    setNextLoading(true);
    setNextError('');

    const qId = currentQuestion?.id;
    const selected = qId ? answers[qId] : undefined;
    const saveResult = await saveQuestionAnswer(qId, selected);

    if (saveResult && !saveResult.ok) {
      setNextError(saveResult?.error?.message || t('workspace.quiz.examActions.saveAnswerFailed', 'Failed to save answer. Please try again.'));
      setNextLoading(false);
      return;
    }

    if (!submittingRef.current) {
      submittingRef.current = true;
      setIsFinished(true);
      const submitOk = await onSubmit?.();
      if (!submitOk) {
        submittingRef.current = false;
        setIsFinished(false);
        setNextLoading(false);
        return;
      }
    }

    setConfirmSubmitOpen(false);
    setNextLoading(false);
  }, [answers, currentQuestion?.id, nextLoading, onSubmit, saveQuestionAnswer, t]);

  if (isFinished) {
    return (
      <div className={cn('max-w-2xl mx-auto', fontClass)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-700 dark:text-slate-200 font-medium">Dang nop bai...</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Vui long doi trong giay lat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-2xl mx-auto', fontClass)}>
      {/* Timer */}
      <div className="flex flex-col items-center mb-6">
        <div className="inline-flex flex-col items-center rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-md shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-blue-900/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock3 className="h-7 w-7" />
          </div>
          <div className={cn(
            'text-2xl font-bold font-mono mt-3',
            timeLeft <= 10 ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-800 dark:text-slate-100',
          )}>
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{currentIndex + 1} / {total}</p>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={total}
        showHeaderMeta={false}
        answerValue={answers[currentQuestion.id]}
        onSelectAnswer={(answerId) => onSelectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
        onTextAnswerChange={(value) => onTextAnswerChange?.(currentQuestion.id, value)}
        onMatchingAnswerChange={(value) => onMatchingAnswerChange?.(currentQuestion.id, value)}
        disabled={timeLeft <= 0}
      />

      <div className="flex justify-end mt-4">
        <Button onClick={handleNext} disabled={timeLeft <= 0 || nextLoading} className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white">
          {nextLoading
            ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('workspace.quiz.examActions.processingAction', 'Processing...')}</span>
            : (currentIndex >= total - 1
              ? t('workspace.quiz.examActions.submitButton', 'Submit Exam')
              : t('workspace.quiz.examActions.nextQuestion', 'Next Question'))}
        </Button>
      </div>
      {(nextError || submitError) && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-right">{nextError || submitError}</p>
      )}

      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="sm:max-w-md border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>{submitConfirmState.title}</DialogTitle>
            <DialogDescription>
              {submitConfirmState.description}
            </DialogDescription>
          </DialogHeader>
          {submitConfirmState.unansweredCount > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/20 dark:text-amber-200">
              <p className="flex items-center gap-2 font-semibold">
                <FileQuestion className="h-4 w-4" />
                {t('workspace.quiz.examActions.unansweredListLabel', 'Unanswered questions')}
              </p>
              <p className="mt-2 leading-6">
                {submitConfirmState.previewNumbers.join(', ')}
                {submitConfirmState.hasMore
                  ? ` ${t('workspace.quiz.examActions.unansweredListMore', 'and more...')}`
                  : ''}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/20 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {t('workspace.quiz.examActions.allQuestionsCompleted', 'All questions are completed.')}
              </div>
            </div>
          )}
          {(nextError || submitError) && (
            <p className="text-sm text-red-600 dark:text-red-400">{nextError || submitError}</p>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)} disabled={nextLoading}>
              {t('workspace.quiz.common.cancel', 'Cancel')}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmSubmit} disabled={nextLoading}>
              {nextLoading
                ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('workspace.quiz.examActions.processingAction', 'Processing...')}</span>
                : t('workspace.quiz.examActions.submitButton', 'Submit Exam')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
