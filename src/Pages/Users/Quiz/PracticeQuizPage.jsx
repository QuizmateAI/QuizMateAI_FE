import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import QuestionCard from './components/QuestionCard';
import QuizHeader from './components/QuizHeader';
import { getQuizFullForAttempt, startQuizAttempt, submitAttempt, submitPracticeQuestion, updateQuiz } from '@/api/QuizAPI';
import {
  buildSingleQuestionPayload,
  getCorrectMatchingPairs,
  getCorrectTextAnswers,
  getFirstIncompleteQuestionIndex,
  hasAnswerValue,
  mapSavedAnswersToState,
  normalizeMatchingPairs,
  normalizeQuizData,
} from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';
import { markQuizAttempted, markQuizCompleted } from '@/Utils/quizAttemptTracker';
import {
  buildQuizResultPath,
  buildWorkspaceQuizPath,
} from '@/lib/routePaths';

function normalizeTextValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function extractAnswerValue(source) {
  const matchingPairs = normalizeMatchingPairs(source?.matchingPairs);
  const selectedAnswerIds = Array.isArray(source?.selectedAnswerIds)
    ? source.selectedAnswerIds.filter((answerId) => answerId != null)
    : [];
  const textAnswer = typeof source?.textAnswer === 'string'
    ? source.textAnswer
    : '';

  if (matchingPairs.length > 0) {
    return { matchingPairs };
  }

  if (selectedAnswerIds.length > 0) {
    return selectedAnswerIds;
  }

  if (textAnswer.trim()) {
    return textAnswer;
  }

  return undefined;
}

function extractNestedResult(rawResult) {
  if (!rawResult || typeof rawResult !== 'object') {
    return null;
  }

  if (rawResult.result && typeof rawResult.result === 'object') {
    return rawResult.result;
  }

  if (rawResult.questionResult && typeof rawResult.questionResult === 'object') {
    return rawResult.questionResult;
  }

  if (rawResult.submissionResult && typeof rawResult.submissionResult === 'object') {
    return rawResult.submissionResult;
  }

  return rawResult;
}

function extractCorrectAnswerIds(question, rawResult) {
  const result = extractNestedResult(rawResult);

  if (Array.isArray(result?.correctAnswerIds) && result.correctAnswerIds.length > 0) {
    return result.correctAnswerIds.filter((answerId) => answerId != null);
  }

  if (Array.isArray(result?.correctAnswers) && result.correctAnswers.length > 0) {
    return result.correctAnswers
      .map((answer) => {
        if (typeof answer === 'number') return answer;
        return answer?.id ?? answer?.answerId ?? null;
      })
      .filter((answerId) => answerId != null);
  }

  return (question?.answers || [])
    .filter((answer) => answer?.isCorrect)
    .map((answer) => answer.id);
}

function extractCorrectTextAnswers(question, rawResult) {
  const result = extractNestedResult(rawResult);

  if (Array.isArray(result?.correctTextAnswers) && result.correctTextAnswers.length > 0) {
    return result.correctTextAnswers.filter(Boolean);
  }

  if (typeof result?.correctAnswer === 'string' && result.correctAnswer.trim()) {
    return [result.correctAnswer.trim()];
  }

  if (Array.isArray(result?.correctAnswers) && result.correctAnswers.length > 0) {
    const normalizedAnswers = result.correctAnswers
      .map((answer) => {
        if (typeof answer === 'string') return answer.trim();
        return typeof answer?.content === 'string' ? answer.content.trim() : '';
      })
      .filter(Boolean);

    if (normalizedAnswers.length > 0) {
      return normalizedAnswers;
    }
  }

  return getCorrectTextAnswers(question);
}

function extractCorrectMatchingPairs(question, rawResult) {
  const result = extractNestedResult(rawResult);

  if (Array.isArray(result?.correctMatchingPairs) && result.correctMatchingPairs.length > 0) {
    return normalizeMatchingPairs(result.correctMatchingPairs);
  }

  return getCorrectMatchingPairs(question);
}

function evaluateSubmittedQuestion(question, answerValue, rawResult) {
  const result = extractNestedResult(rawResult);
  const gradingStatus = String(result?.gradingStatus || '').toUpperCase();
  const isTextQuestion = question?.type === 'SHORT_ANSWER' || question?.type === 'FILL_IN_BLANK';
  const isMatchingQuestion = question?.type === 'MATCHING';
  const correctAnswerIds = extractCorrectAnswerIds(question, result);
  const correctTextAnswers = extractCorrectTextAnswers(question, result);
  const correctMatchingPairs = extractCorrectMatchingPairs(question, result);

  let isCorrect = null;
  if (typeof result?.isCorrect === 'boolean') {
    isCorrect = result.isCorrect;
  } else if (typeof result?.correct === 'boolean') {
    isCorrect = result.correct;
  } else if (gradingStatus !== 'PENDING') {
    if (isMatchingQuestion) {
      const submittedMatchingPairs = normalizeMatchingPairs(answerValue?.matchingPairs);
      const correctPairMap = new Map(correctMatchingPairs.map((pair) => [pair.leftKey, pair.rightKey]));
      isCorrect = submittedMatchingPairs.length === correctMatchingPairs.length
        && submittedMatchingPairs.length > 0
        && submittedMatchingPairs.every((pair) => correctPairMap.get(pair.leftKey) === pair.rightKey);
    } else if (isTextQuestion) {
      const normalizedTextAnswer = normalizeTextValue(answerValue);
      isCorrect = correctTextAnswers
        .map(normalizeTextValue)
        .some((correctAnswer) => correctAnswer && correctAnswer === normalizedTextAnswer);
    } else {
      const selectedAnswerIds = Array.isArray(answerValue) ? answerValue : [];
      isCorrect = correctAnswerIds.length === selectedAnswerIds.length
        && correctAnswerIds.every((answerId) => selectedAnswerIds.includes(answerId));
    }
  }

  return {
    revealed: true,
    locked: true,
    isCorrect,
    gradingStatus,
    correctAnswerIds,
    correctTextAnswers,
    correctMatchingPairs,
    explanation: result?.explanation || question?.explanation || '',
  };
}

function buildSubmittedQuestionMap(questions = [], savedAnswers = []) {
  const questionMap = new Map((questions || []).map((question) => [Number(question?.id), question]));

  return (savedAnswers || []).reduce((result, savedAnswer) => {
    const questionId = Number(savedAnswer?.questionId);
    const question = questionMap.get(questionId);
    const answerValue = extractAnswerValue(savedAnswer);

    if (!question || !hasAnswerValue(answerValue)) {
      return result;
    }

    result[questionId] = evaluateSubmittedQuestion(question, answerValue, savedAnswer);
    return result;
  }, {});
}

function PracticeSidebar({
  questions,
  currentIndex,
  results,
  onJumpToQuestion,
  t,
}) {
  const firstIncompleteIndex = questions.findIndex((question) => !results[question.id]);
  const highestAccessibleIndex = firstIncompleteIndex === -1 ? Math.max(questions.length - 1, 0) : firstIncompleteIndex;

  return (
    <div className="flex max-h-[calc(100vh-8.5rem)] min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-none">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('workspace.quiz.practiceActions.questionListTitle', 'Danh sách câu hỏi')}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {questions.map((question, index) => {
            const result = results[question.id];
            const isCurrent = index === currentIndex;
            const isDisabled = !result && index > highestAccessibleIndex;

            let Icon = Circle;
            let iconClassName = 'text-slate-300 dark:text-slate-600';
            let buttonClassName = 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/70';

            if (result?.gradingStatus === 'PENDING') {
              Icon = Loader2;
              iconClassName = 'text-amber-500 animate-spin';
              buttonClassName = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300';
            } else if (result?.isCorrect === true) {
              Icon = CheckCircle2;
              iconClassName = 'text-emerald-500';
              buttonClassName = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300';
            } else if (result?.isCorrect === false) {
              Icon = XCircle;
              iconClassName = 'text-rose-500';
              buttonClassName = 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300';
            } else if (result) {
              Icon = CheckCircle2;
              iconClassName = 'text-sky-500';
              buttonClassName = 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300';
            }

            if (isCurrent) {
              buttonClassName = 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/20 dark:text-emerald-300';
            }

            if (isDisabled) {
              buttonClassName = 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500';
              iconClassName = 'text-slate-300 dark:text-slate-600';
            }

            return (
              <button
                key={question.id}
                type="button"
                disabled={isDisabled}
                onClick={() => onJumpToQuestion(index)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all',
                  buttonClassName,
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {t('workspace.quiz.practiceActions.questionLabel', 'Câu hỏi')} {index + 1}
                    </p>
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs opacity-70">{question.content}</p>
                  </div>
                </div>
                <Icon className={cn('h-4 w-4 shrink-0', iconClassName)} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PracticeQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const quizFontStyle = { fontFamily: 'var(--quiz-display-font)' };
  const shouldAutoStart = location.state?.autoStart === true;

  const [attemptId, setAttemptId] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [answers, setAnswers] = useState({});
  const [questionResults, setQuestionResults] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionError, setActionError] = useState('');
  const [confirmStartOpen, setConfirmStartOpen] = useState(() => !shouldAutoStart);
  const autoStartTriggeredRef = useRef(false);

  const {
    data: quiz = null,
    isLoading: loading,
  } = useQuery({
    queryKey: ['quiz-full', quizId],
    queryFn: async () => {
      const res = await getQuizFullForAttempt(quizId);
      return normalizeQuizData(res.data);
    },
    enabled: Boolean(quizId),
    retry: (failureCount, error) => Number(error?.statusCode) >= 500 && failureCount < 1,
  });

  const returnToQuizPath = location.state?.returnToQuizPath
    || (quiz?.workspaceId ? buildWorkspaceQuizPath(quiz.workspaceId, quizId) : null)
    || '/home';

  const questions = quiz?.questions || [];
  const total = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const currentAnswerValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentQuestionResult = currentQuestion ? questionResults[currentQuestion.id] : null;
  const answeredCount = useMemo(() => Object.keys(questionResults).length, [questionResults]);
  const progressPercent = total > 0 ? Math.min((answeredCount / total) * 100, 100) : 0;
  const isCurrentQuestionSubmitted = Boolean(currentQuestionResult);
  const canCheckAnswer = Boolean(currentQuestion)
    && !isCurrentQuestionSubmitted
    && hasAnswerValue(currentAnswerValue)
    && !isCheckingAnswer;
  const canMoveNext = isCurrentQuestionSubmitted && currentIndex < total - 1;
  const canFinish = isCurrentQuestionSubmitted && currentIndex === total - 1 && total > 0;

  const handleHeaderBack = useCallback((confirmed) => {
    if (isStarted && !confirmed) return;
    navigate(returnToQuizPath, { replace: true });
  }, [isStarted, navigate, returnToQuizPath]);

  const handleCloseStartDialog = useCallback(() => {
    setConfirmStartOpen(false);
    navigate(returnToQuizPath, { replace: true });
  }, [navigate, returnToQuizPath]);

  const selectAnswer = useCallback((questionId, answerId, isMultiple) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const updated = isMultiple
        ? (current.includes(answerId) ? current.filter((id) => id !== answerId) : [...current, answerId])
        : [answerId];

      return { ...prev, [questionId]: updated };
    });
  }, []);

  const updateTextAnswer = useCallback((questionId, textAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: textAnswer }));
  }, []);

  const updateMatchingAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        matchingPairs: normalizeMatchingPairs(value?.matchingPairs),
      },
    }));
  }, []);

  const handleStart = useCallback(async () => {
    if (isStarting) return;

    setIsStarting(true);
    setActionError('');
    try {
      let res;
      try {
        res = await startQuizAttempt(quizId, { isPracticeMode: true });
      } catch (startErr) {
        const message = String(startErr?.message || '').toLowerCase();
        const notActiveStatus = startErr?.data?.statusCode;
        const shouldActivateAndRetry = message.includes('chưa được kích hoạt') || notActiveStatus === 1083;

        if (!shouldActivateAndRetry) {
          throw startErr;
        }

        await updateQuiz(Number(quizId), { status: 'ACTIVE' });
        res = await startQuizAttempt(quizId, { isPracticeMode: true });
      }

      const attempt = res.data;
      const hydratedAnswers = mapSavedAnswersToState(attempt.savedAnswers);
      const hydratedQuestionResults = buildSubmittedQuestionMap(questions, attempt.savedAnswers);
      const nextIndex = getFirstIncompleteQuestionIndex(questions, attempt.savedAnswers);

      setAttemptId(attempt.attemptId);
      setAnswers(hydratedAnswers);
      setQuestionResults(hydratedQuestionResults);
      setCurrentIndex(nextIndex);
      markQuizAttempted(quizId);
      setIsStarted(true);
    } catch (err) {
      console.error('Failed to start attempt:', err);
      const message = err?.message || t('workspace.quiz.practiceActions.startFailed', 'Không thể bắt đầu chế độ luyện tập. Vui lòng thử lại.');
      setActionError(message);
      showError(message);

      if (shouldAutoStart) {
        navigate(returnToQuizPath, { replace: true });
      }
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, navigate, questions, quizId, returnToQuizPath, shouldAutoStart, showError, t]);

  const handleCheckAnswer = useCallback(async () => {
    if (!attemptId || !currentQuestion || !canCheckAnswer) return;

    setIsCheckingAnswer(true);
    setActionError('');

    try {
      const payload = buildSingleQuestionPayload(currentQuestion, currentAnswerValue);
      if (!payload) {
        throw new Error(t('workspace.quiz.practiceActions.invalidAnswer', 'Câu trả lời hiện tại không hợp lệ.'));
      }

      const res = await submitPracticeQuestion(attemptId, payload);
      const reviewState = evaluateSubmittedQuestion(currentQuestion, currentAnswerValue, res?.data);

      setQuestionResults((prev) => ({
        ...prev,
        [currentQuestion.id]: reviewState,
      }));
    } catch (err) {
      console.error('Failed to submit practice question:', err);
      const message = err?.message || t('workspace.quiz.practiceActions.checkFailed', 'Kiểm tra câu trả lời thất bại. Vui lòng thử lại.');
      setActionError(message);
      showError(message);
    } finally {
      setIsCheckingAnswer(false);
    }
  }, [attemptId, canCheckAnswer, currentAnswerValue, currentQuestion, showError, t]);

  const handleNext = useCallback(() => {
    setActionError('');
    setCurrentIndex((prev) => Math.min(prev + 1, total - 1));
  }, [total]);

  const handleBack = useCallback(() => {
    setActionError('');
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleJumpToQuestion = useCallback((index) => {
    setActionError('');
    setCurrentIndex(index);
  }, []);

  const handleFinish = useCallback(async () => {
    if (!attemptId || isFinishing) return;

    setIsFinishing(true);
    setActionError('');
    try {
      await submitAttempt(attemptId);
      markQuizCompleted(quizId);
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate(buildQuizResultPath(attemptId), {
        state: {
          quizId,
          attemptMode: 'practice',
          openReviewMode: true,
          returnToQuizPath,
          sourceView: location.state?.sourceView,
          sourceWorkspaceId: location.state?.sourceWorkspaceId,
          sourcePhaseId: location.state?.sourcePhaseId,
          sourceKnowledgeId: location.state?.sourceKnowledgeId,
          sourceRoadmapId: location.state?.sourceRoadmapId,
        },
        replace: true,
      });
    } catch (err) {
      console.error('Failed to finish practice attempt:', err);
      const message = err?.message || t('workspace.quiz.practiceActions.finishFailed', 'Không thể hoàn thành bài luyện tập. Vui lòng thử lại.');
      setActionError(message);
      showError(message);
      setIsFinishing(false);
    }
  }, [attemptId, isFinishing, location.state?.sourceKnowledgeId, location.state?.sourcePhaseId, location.state?.sourceRoadmapId, location.state?.sourceView, location.state?.sourceWorkspaceId, navigate, quizId, returnToQuizPath, showError, t]);

  useEffect(() => {
    if (!shouldAutoStart || loading || !quiz || isStarted || autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    void handleStart();
  }, [handleStart, isStarted, loading, quiz, shouldAutoStart]);

  if (loading) {
    return (
      <div className={cn('flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900', fontClass)} style={quizFontStyle}>
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={cn('flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900', fontClass)} style={quizFontStyle}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">{t('workspace.quiz.result.notFound', 'Không tìm thấy quiz')}</h2>
      </div>
    );
  }

  if (isFinishing) {
    return (
      <div className={cn('flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900', fontClass)} style={quizFontStyle}>
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {t('workspace.quiz.practiceActions.finishing', 'Đang hoàn thành bài luyện tập...')}
        </p>
      </div>
    );
  }

  if (!isStarted) {
    if (!confirmStartOpen) {
      return (
        <div className={cn('flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900', fontClass)} style={quizFontStyle}>
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('workspace.quiz.practiceActions.starting', 'Đang mở phòng luyện tập...')}
          </p>
        </div>
      );
    }

    return (
      <div className={cn('flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900', fontClass)} style={quizFontStyle}>
        <QuizHeader onBack={handleHeaderBack} title={quiz.title} showConfirm={false} />
        <div className="flex-1 bg-slate-50/60 dark:bg-slate-900/60" />

        <Dialog open={confirmStartOpen}>
          <DialogContent
            hideClose
            className="sm:max-w-md border-slate-200 dark:border-slate-700"
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">{quiz.title}</DialogTitle>
              <DialogDescription>
                <span className="mt-3 block text-sm text-slate-500 dark:text-slate-400">
                  {total} {t('workspace.quiz.questions', 'questions')} • {t('workspace.quiz.practice', 'Practice mode')}
                </span>
                <span className="mt-3 block text-xs text-slate-500 dark:text-slate-400">
                  {t('workspace.quiz.practiceActions.resumeHint', 'Nếu bạn đã làm dở, hệ thống sẽ mở lại đúng câu đang tiếp tục.')}
                </span>
              </DialogDescription>
            </DialogHeader>
            {actionError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                {actionError}
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleCloseStartDialog}>
                {t('workspace.quiz.header.cancel', 'Hủy')}
              </Button>
              <Button
                disabled={isStarting}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleStart}
              >
                {isStarting
                  ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('workspace.quiz.practiceActions.starting', 'Đang mở phòng luyện tập...')}</span>
                  : t('workspace.quiz.practiceActions.startButton', 'Bắt đầu luyện tập')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-[#f6f8fb] dark:bg-slate-900', fontClass)} style={quizFontStyle}>
      <QuizHeader
        onBack={handleHeaderBack}
        title={quiz.title}
        showConfirm={isStarted}
        confirmTitle={t('workspace.quiz.practiceActions.confirmExitTitle', 'Thoát thực hành?')}
        confirmDescription={t('workspace.quiz.practiceActions.confirmExitDescription', 'Câu bạn chưa kiểm tra có thể bị mất.')}
      />

      <div className="mx-auto max-w-[1380px] px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-none">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                {t('workspace.quiz.practice', 'Practice mode')}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50 md:text-3xl">{quiz.title}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t('workspace.quiz.practiceActions.headerHint', 'Chọn đáp án, bấm kiểm tra để xem đúng sai và lời giải, rồi chuyển sang câu tiếp theo.')}
              </p>
            </div>

            <div className="flex min-w-[200px] items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900/80">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {t('workspace.quiz.practiceActions.currentQuestionLabel', 'Câu hiện tại')}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                  {currentIndex + 1}/{total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {t('workspace.quiz.practiceActions.answeredLabel', 'Đã kiểm tra')}
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.12fr)_340px]">
          <div className="min-w-0 xl:min-h-[calc(100vh-13rem)]">
            {currentQuestion ? (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={total}
                answerValue={currentAnswerValue}
                onSelectAnswer={(answerId) => selectAnswer(currentQuestion.id, answerId, currentQuestion.type === 'MULTIPLE_CHOICE')}
                onTextAnswerChange={(value) => updateTextAnswer(currentQuestion.id, value)}
                onMatchingAnswerChange={(value) => updateMatchingAnswer(currentQuestion.id, value)}
                reviewState={currentQuestionResult}
                disabled={isCheckingAnswer}
              />
            ) : null}

            {actionError && (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                {actionError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-800/80">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentIndex === 0 || isCheckingAnswer}
                className="min-w-[140px] rounded-2xl border-slate-300 px-5 py-6 text-base dark:border-slate-600"
              >
                {t('workspace.quiz.practiceActions.previousButton', 'Câu trước')}
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!isCurrentQuestionSubmitted ? (
                  <Button
                    onClick={handleCheckAnswer}
                    disabled={!canCheckAnswer}
                    className="min-w-[180px] rounded-2xl bg-emerald-600 px-6 py-6 text-base font-semibold text-white hover:bg-emerald-700"
                  >
                    {isCheckingAnswer
                      ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('workspace.quiz.practiceActions.checkingButton', 'Đang kiểm tra...')}</span>
                      : t('workspace.quiz.practiceActions.checkButton', 'Kiểm tra')}
                  </Button>
                ) : null}

                {canMoveNext ? (
                  <Button
                    onClick={handleNext}
                    className="min-w-[180px] rounded-2xl bg-slate-900 px-6 py-6 text-base font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {t('workspace.quiz.practiceActions.nextButton', 'Câu tiếp theo')}
                  </Button>
                ) : null}

                {canFinish ? (
                  <Button
                    onClick={handleFinish}
                    className="min-w-[180px] rounded-2xl bg-sky-600 px-6 py-6 text-base font-semibold text-white hover:bg-sky-700"
                  >
                    {t('workspace.quiz.practiceActions.finishButton', 'Hoàn thành luyện tập')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <PracticeSidebar
              questions={questions}
              currentIndex={currentIndex}
              results={questionResults}
              onJumpToQuestion={handleJumpToQuestion}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
