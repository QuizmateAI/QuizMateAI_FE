import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import QuestionCard from './components/QuestionCard';
import QuestionNavPanel from './components/QuestionNavPanel';
import ExamPerQuestion from './components/ExamPerQuestion';
import QuizHeader from './components/QuizHeader';
import { useQuizAutoSave } from './hooks/useQuizAutoSave';
import { getQuizFullForAttempt, startQuizAttempt, submitAttempt, updateQuiz } from '@/api/QuizAPI';
import { buildSubmitPayload, getAttemptRemainingSeconds, mapSavedAnswersToState, normalizeQuizData } from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';
import { markQuizAttempted, markQuizCompleted } from '@/Utils/quizAttemptTracker';

export default function ExamQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const quizFontStyle = { fontFamily: 'var(--quiz-display-font)' };
  const shouldAutoStart = location.state?.autoStart === true;

  const [attemptId, setAttemptId] = useState(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptTimeoutAt, setAttemptTimeoutAt] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [confirmStartOpen, setConfirmStartOpen] = useState(() => !shouldAutoStart);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const questionRefs = useRef({});
  const submittingRef = useRef(false);
  const examLockNotifiedRef = useRef(false);
  const instantSaveTimerRef = useRef(null);
  const instantSaveInFlightRef = useRef(false);
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
  const totalPages = Math.max(1, Math.ceil((quiz?.questions?.length || 0) / itemsPerPage));

  const resolveEffectiveTimeoutAt = useCallback((attempt, normalizedQuiz) => {
    const timeoutAt = attempt?.timeoutAt || null;
    const startedAt = attempt?.startedAt || null;
    const normalizedTotalSeconds = Number(normalizedQuiz?.totalTime) || 0;

    if (!timeoutAt || normalizedQuiz?.timerMode !== 'TOTAL' || normalizedTotalSeconds <= 0) {
      return timeoutAt;
    }

    const remainingFromApiTimeout = getAttemptRemainingSeconds(timeoutAt, normalizedTotalSeconds);

    // Legacy data may keep timeout much larger than normalized duration (e.g. 900 mins vs 15 mins).
    if (remainingFromApiTimeout <= normalizedTotalSeconds * 3) {
      return timeoutAt;
    }

    if (!startedAt) {
      return timeoutAt;
    }

    const startedAtMs = new Date(startedAt).getTime();
    if (Number.isNaN(startedAtMs)) {
      return timeoutAt;
    }

    const correctedTimeoutAt = new Date(startedAtMs + (normalizedTotalSeconds * 1000)).toISOString();
    return correctedTimeoutAt;
  }, []);

  const returnToQuizPath = location.state?.returnToQuizPath
    || (quiz?.workspaceId ? `/workspace/${quiz.workspaceId}/quiz/${quizId}` : null)
    || '/home';

  const isPerQuestionMode = quiz?.timerMode === 'PER_QUESTION';

  const { saveManually, syncSnapshot } = useQuizAutoSave(attemptId, answers, {
    interval: 5000,
    enabled: isStarted && !isSubmitted && !isPerQuestionMode,
  });

  useEffect(() => {
    if (!quiz || isStarted) return;
    setTimeLeft(quiz.totalTime || 0);
  }, [quiz, isStarted]);

  // TOTAL mode: debounce save on answer change to persist faster without blocking UI.
  useEffect(() => {
    if (!isStarted || isSubmitted || isPerQuestionMode || !attemptId) return;

    if (instantSaveTimerRef.current) {
      clearTimeout(instantSaveTimerRef.current);
    }

    instantSaveTimerRef.current = setTimeout(async () => {
      if (instantSaveInFlightRef.current) return;
      instantSaveInFlightRef.current = true;
      try {
        await saveManually({ silent: true });
      } finally {
        instantSaveInFlightRef.current = false;
      }
    }, 700);

    return () => {
      if (instantSaveTimerRef.current) {
        clearTimeout(instantSaveTimerRef.current);
        instantSaveTimerRef.current = null;
      }
    };
  }, [answers, attemptId, isPerQuestionMode, isStarted, isSubmitted, saveManually]);

  const handleManualSave = useCallback(async () => {
    setSaveStatus('saving');
    setSaveMessage('');
    const result = await saveManually();
    if (result?.ok) {
      setSaveStatus('success');
      setSaveMessage(t('workspace.quiz.examActions.saveSuccess', 'Saved successfully'));
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'success' ? 'idle' : prev));
          setSaveMessage((prev) => (prev === t('workspace.quiz.examActions.saveSuccess', 'Saved successfully') ? '' : prev));
      }, 1500);
      return true;
    }

    setSaveStatus('error');
    setSaveMessage(result?.error?.message || t('workspace.quiz.examActions.saveFailed', 'Save failed. Please try again.'));
    return false;
  }, [saveManually, t]);

  const selectAnswer = useCallback((questionId, answerId, isMultiple) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const updated = isMultiple
        ? (current.includes(answerId) ? current.filter(id => id !== answerId) : [...current, answerId])
        : [answerId];
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const updateTextAnswer = useCallback((questionId, textAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: textAnswer }));
  }, []);

  const updateMatchingAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleStart = useCallback(async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      let res;
      try {
        res = await startQuizAttempt(quizId, { isPracticeMode: false });
      } catch (startErr) {
        const message = String(startErr?.message || '').toLowerCase();
        const notActiveStatus = startErr?.data?.statusCode;
        const shouldActivateAndRetry = message.includes('chưa được kích hoạt') || notActiveStatus === 1083;

        if (!shouldActivateAndRetry) {
          throw startErr;
        }

        await updateQuiz(Number(quizId), { status: 'ACTIVE' });
        res = await startQuizAttempt(quizId, { isPracticeMode: false });
      }

      const attempt = res.data;
      const hydratedAnswers = mapSavedAnswersToState(attempt.savedAnswers);
      const effectiveTimeoutAt = resolveEffectiveTimeoutAt(attempt, quiz);

      setAttemptId(attempt.attemptId);
      setAttemptStartedAt(attempt.startedAt || null);
      setAttemptTimeoutAt(effectiveTimeoutAt);
      setTimeLeft(getAttemptRemainingSeconds(effectiveTimeoutAt, quiz?.totalTime || 0));
      markQuizAttempted(quizId);
      setAnswers(hydratedAnswers);
      syncSnapshot(hydratedAnswers);
      setIsStarted(true);
    } catch (err) {
      console.error('Failed to start attempt:', err);
      showError(err?.message || 'Failed to start exam attempt');
      if (shouldAutoStart) {
        navigate(returnToQuizPath, { replace: true });
      }
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, navigate, quiz, quizId, resolveEffectiveTimeoutAt, returnToQuizPath, shouldAutoStart, showError, syncSnapshot]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitted(true);
    setSubmitError('');

    if (attemptId) {
      try {
        if (isPerQuestionMode) {
          // Per-question flow already persists answers on each next/timeout.
          await submitAttempt(attemptId);
        } else {
          const submitPayload = buildSubmitPayload(quiz?.questions, answers);
          await submitAttempt(attemptId, submitPayload);
        }
        markQuizCompleted(quizId);
        // Add delay to ensure backend finishes processing before navigating
        // Tăng từ 500ms lên 1500ms để backend có đủ thời gian xử lý và đánh dấu attempt thành COMPLETED
        // Điều này tránh lỗi 400 "Lượt làm quiz chưa hoàn thành"
        await new Promise(resolve => setTimeout(resolve, 1500));
        navigate(`/quiz/result/${attemptId}`, {
          state: {
            quizId,
            attemptMode: 'exam',
            returnToQuizPath,
            sourceView: location.state?.sourceView,
            sourceWorkspaceId: location.state?.sourceWorkspaceId,
            sourcePhaseId: location.state?.sourcePhaseId,
          },
          replace: true,
        });
        return true;
      } catch (err) {
        console.error('Failed to submit:', err);
        const submitErrorMessage = err?.message || t('workspace.quiz.examActions.submitFailed', 'Submit failed. Please try again.');
        showError(submitErrorMessage);
        setSubmitError(submitErrorMessage);
        submittingRef.current = false;
        setIsSubmitted(false);
        return false;
      }
    }
    setSubmitError(t('workspace.quiz.examActions.submitMissingAttempt', 'Cannot submit because attempt is missing.'));
    submittingRef.current = false;
    setIsSubmitted(false);
    return false;
  }, [answers, attemptId, navigate, quiz?.questions, quizId, returnToQuizPath, showError, t, isPerQuestionMode]);

  const handleHeaderBack = useCallback(async (confirmed) => {
    if (isStarted && !isSubmitted) {
      if (!confirmed) return;
      await handleSubmit();
    } else {
      navigate(returnToQuizPath, { replace: true });
    }
  }, [isStarted, isSubmitted, handleSubmit, navigate, returnToQuizPath]);

  const handleCloseStartDialog = useCallback(() => {
    setConfirmStartOpen(false);
    navigate(returnToQuizPath, { replace: true });
  }, [navigate, returnToQuizPath]);

  const handleOpenSubmitConfirm = useCallback(() => {
    if (isSubmitted) return;
    setConfirmSubmitOpen(true);
  }, [isSubmitted]);

  const handleConfirmSubmit = useCallback(async () => {
    setConfirmSubmitOpen(false);
    await handleSubmit();
  }, [handleSubmit]);

  // Lock browser back/forward while exam is ongoing.
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const onPopState = () => {
      window.setTimeout(() => {
        window.history.forward();
      }, 0);
      if (!examLockNotifiedRef.current) {
        showError('Đang trong bài thi, không thể quay lại hoặc chuyển trang.');
        examLockNotifiedRef.current = true;
        setTimeout(() => {
          examLockNotifiedRef.current = false;
        }, 1500);
      }
    };

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isStarted, isSubmitted, showError]);

  // Countdown for TOTAL timer mode
  useEffect(() => {
    if (!isStarted || isSubmitted || quiz?.timerMode !== 'TOTAL' || !attemptTimeoutAt) return;

    const syncTimeLeft = () => {
      const remainingSeconds = getAttemptRemainingSeconds(attemptTimeoutAt);
      setTimeLeft(prev => (prev === remainingSeconds ? prev : remainingSeconds));

      if (remainingSeconds <= 0) {
        void handleSubmit();
      }
    };

    syncTimeLeft();
    const timer = setInterval(syncTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [attemptTimeoutAt, isStarted, isSubmitted, quiz?.timerMode, handleSubmit]);

  useEffect(() => {
    if (!isStarted || isSubmitted || quiz?.timerMode !== 'TOTAL' || attemptTimeoutAt) return;
    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setTimeLeft(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearTimeout(fallbackTimer);
  }, [attemptTimeoutAt, timeLeft, isStarted, isSubmitted, quiz?.timerMode, handleSubmit]);

  useEffect(() => {
    if (!shouldAutoStart || loading || !quiz || isStarted || autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    void handleStart();
  }, [handleStart, isStarted, loading, quiz, shouldAutoStart]);

  const jumpToQuestion = useCallback((index) => {
    const targetPage = Math.floor(index / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      setTimeout(() => {
        questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentPage, itemsPerPage]);

  const paginatedQuestions = useMemo(() => {
    if (!quiz?.questions?.length) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return quiz.questions.slice(startIndex, startIndex + itemsPerPage);
  }, [quiz?.questions, currentPage]);

  const renderedQuestionCards = useMemo(() => (
    paginatedQuestions.map((q, idx) => {
      const globalIdx = (currentPage - 1) * itemsPerPage + idx;
      return (
        <div key={q.id} ref={(el) => { if (el) questionRefs.current[globalIdx] = el; }}>
          <QuestionCard
            question={q}
            questionNumber={globalIdx + 1}
            totalQuestions={quiz.questions.length}
            answerValue={answers[q.id]}
            onSelectAnswer={(answerId) => selectAnswer(q.id, answerId, q.type === 'MULTIPLE_CHOICE')}
            onTextAnswerChange={(value) => updateTextAnswer(q.id, value)}
            onMatchingAnswerChange={(value) => updateMatchingAnswer(q.id, value)}
          />
        </div>
      );
    })
  ), [answers, currentPage, itemsPerPage, paginatedQuestions, quiz?.questions.length, selectAnswer, updateMatchingAnswer, updateTextAnswer]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">Quiz not found</h2>
      </div>
    );
  }

  // Show loading state while submitting to prevent white screen (race condition with result page)
  if (isSubmitted) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-col gap-4', fontClass)} style={quizFontStyle}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
          {t('workspace.quiz.examActions.processing', 'Processing your submission...')}
        </p>
      </div>
    );
  }

  /* ── Start screen ── */
  if (!isStarted) {
    const isTimedExam = quiz.timerMode === 'TOTAL';
    const info = quiz.timerMode === 'TOTAL'
      ? `${Math.floor(quiz.totalTime / 60)} minutes • ${quiz.questions.length} questions`
      : `${quiz.questions.length} questions • Per-question timer`;

    if (!confirmStartOpen) {
      return (
        <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center flex-col gap-4', fontClass)} style={quizFontStyle}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
            {t('workspace.quiz.examActions.starting', 'Starting exam...')}
          </p>
        </div>
      );
    }

    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col', fontClass)} style={quizFontStyle}>
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
                <span className="mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {isTimedExam
                    ? t('workspace.quiz.examModeType1', 'Exam giới hạn thời gian tổng')
                    : t('workspace.quiz.examModeType2', 'Exam theo từng câu')}
                </span>
                <span className="mt-3 block text-sm text-slate-500 dark:text-slate-400">
                  {info} • Exam Mode
                </span>
                {quiz.maxAttempt && (
                  <span className="mt-2 block text-xs text-slate-400 dark:text-slate-500">
                    Max attempts: {quiz.maxAttempt}
                  </span>
                )}
                <span className="mt-3 block text-xs text-amber-600 dark:text-amber-400">
                  Starting this exam will create an attempt and may lock future edits/deletion.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleCloseStartDialog}>Back</Button>
              <Button
                disabled={isStarting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleStart}
              >
                {isStarting
                  ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Starting...</span>
                  : 'Start Exam'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── Per-question timer mode ── */
  if (quiz.timerMode === 'PER_QUESTION') {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col', fontClass)} style={quizFontStyle}>
        <QuizHeader
          onBack={handleHeaderBack}
          title={quiz.title}
          showConfirm={isStarted && !isSubmitted}
          confirmTitle={t('workspace.quiz.examActions.confirmSubmitTitle', 'Stop and submit your exam?')}
          confirmDescription={t('workspace.quiz.examActions.confirmSubmitDescription', 'Your current answers will be submitted immediately.')}
        />
        <div className="flex-1 p-4 md:p-8">
          <ExamPerQuestion
          quiz={quiz}
          answers={answers}
          onSelectAnswer={selectAnswer}
          onTextAnswerChange={updateTextAnswer}
          onMatchingAnswerChange={updateMatchingAnswer}
          onSubmit={handleSubmit}
          attemptId={attemptId}
          attemptStartedAt={attemptStartedAt}
          submitError={submitError}
          fontClass={fontClass}
        />
        </div>
      </div>
    );
  }

  /* ── Total time mode – list view ── */
  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col', fontClass)} style={quizFontStyle}>
      <QuizHeader
        onBack={handleHeaderBack}
        title={quiz.title}
        showConfirm={isStarted && !isSubmitted}
        confirmTitle={t('workspace.quiz.examActions.confirmSubmitTitle', 'Stop and submit your exam?')}
        confirmDescription={t('workspace.quiz.examActions.confirmSubmitDescription', 'Your current answers will be submitted immediately.')}
      />
      <div className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{quiz.title}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${quiz.timerMode === 'TOTAL'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}>
            {quiz.timerMode === 'TOTAL'
              ? t('workspace.quiz.examModeType1', 'Exam giới hạn thời gian tổng')
              : t('workspace.quiz.examModeType2', 'Exam theo từng câu')}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Questions list */}
          <div className="space-y-4">
            {renderedQuestionCards}
            {quiz.questions.length > itemsPerPage && (
              <div className="flex justify-between items-center mt-6 p-4">
                <Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(Math.max(1, currentPage - 1))}>{t('workspace.quiz.pagination.prev', 'Previous page')}</Button>
                <span className="text-sm font-medium text-slate-500">{t('workspace.quiz.pagination.page', 'Page')} {currentPage} / {totalPages}</span>
                <Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}>{t('workspace.quiz.pagination.next', 'Next page')}</Button>
              </div>
            )}
            <Button onClick={handleOpenSubmitConfirm} disabled={isSubmitted} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white text-base py-3">
              {isSubmitted
                  ? <span className="inline-flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />{t('workspace.quiz.examActions.submitting', 'Submitting...')}</span>
                  : t('workspace.quiz.examActions.submitButton', 'Submit Exam')}
            </Button>
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            )}
          </div>

          {/* Side nav panel (desktop) */}
          <div className="hidden lg:block">
            <QuestionNavPanel
              questions={quiz.questions}
              answers={answers}
              timeLeft={timeLeft}
              onJumpToQuestion={jumpToQuestion}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onSave={handleManualSave}
              onSubmit={handleSubmit}
              onRequestSubmit={handleOpenSubmitConfirm}
              isSaveLoading={saveStatus === 'saving'}
              saveStatus={saveStatus}
              saveMessage={saveMessage}
              isSubmitLoading={isSubmitted}
              submitError={submitError}
              t={t}
            />
          </div>
        </div>
      </div>
      </div>

      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="sm:max-w-md border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>{t('workspace.quiz.examActions.confirmSubmitTitle', 'Stop and submit your exam?')}</DialogTitle>
            <DialogDescription>
              {t('workspace.quiz.examActions.confirmSubmitDescription', 'Your current answers will be submitted immediately.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>
              {t('workspace.quiz.common.cancel', 'Cancel')}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmSubmit}>
              {t('workspace.quiz.examActions.submitButton', 'Submit Exam')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
