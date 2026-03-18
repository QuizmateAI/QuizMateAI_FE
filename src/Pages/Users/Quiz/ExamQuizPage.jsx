import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import QuestionCard from './components/QuestionCard';
import QuestionNavPanel from './components/QuestionNavPanel';
import ExamPerQuestion from './components/ExamPerQuestion';
import { useQuizAutoSave } from './hooks/useQuizAutoSave';
import { getQuizFull, startQuizAttempt, submitAttempt, updateQuiz } from '@/api/QuizAPI';
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

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptTimeoutAt, setAttemptTimeoutAt] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const questionRefs = useRef({});
  const submittingRef = useRef(false);
  const examLockNotifiedRef = useRef(false);

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

  const { saveManually, syncSnapshot } = useQuizAutoSave(attemptId, answers, {
    interval: 5000,
    enabled: isStarted && !isSubmitted,
  });

  // Fetch full quiz data
  useEffect(() => {
    (async () => {
      try {
        const res = await getQuizFull(quizId);
        const normalized = normalizeQuizData(res.data);
        setQuiz(normalized);
        setTimeLeft(normalized?.totalTime || 0);
      } catch (err) {
        console.error('Failed to load quiz:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

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

  const handleStart = useCallback(async () => {
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
    }
  }, [quiz, quizId, resolveEffectiveTimeoutAt, showError, syncSnapshot]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitted(true);
    await saveManually();
    if (attemptId) {
      try {
        if (quiz?.timerMode === 'PER_QUESTION') {
          // Per-question flow already persists answers on each next/timeout.
          await submitAttempt(attemptId);
        } else {
          const submitPayload = buildSubmitPayload(quiz?.questions, answers);
          await submitAttempt(attemptId, submitPayload);
        }
        markQuizCompleted(quizId);
        navigate(`/quiz/result/${attemptId}`, { state: { quizId, returnToQuizPath }, replace: true });
        return true;
      } catch (err) {
        console.error('Failed to submit:', err);
        showError(err?.message || 'Nộp bài thất bại, vui lòng thử lại.');
        submittingRef.current = false;
        setIsSubmitted(false);
        return false;
      }
    }
    submittingRef.current = false;
    setIsSubmitted(false);
    return false;
  }, [answers, attemptId, navigate, quiz?.questions, quizId, returnToQuizPath, saveManually, showError]);

  // Lock browser back/forward while exam is ongoing.
  useEffect(() => {
    if (!isStarted || isSubmitted) return;

    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
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

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isStarted, isSubmitted, showError]);

  // Countdown for TOTAL timer mode
  useEffect(() => {
    if (!isStarted || isSubmitted || quiz?.timerMode !== 'TOTAL') return;
    if (!attemptTimeoutAt) {
      if (timeLeft <= 0) {
        handleSubmit();
        return;
      }

      const fallbackTimer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(fallbackTimer);
    }

    const syncTimeLeft = () => {
      const remainingSeconds = getAttemptRemainingSeconds(attemptTimeoutAt);
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        handleSubmit();
      }
    };

    syncTimeLeft();
    const timer = setInterval(syncTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [attemptTimeoutAt, timeLeft, isStarted, isSubmitted, quiz?.timerMode, handleSubmit]);

  const jumpToQuestion = useCallback((index) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">Quiz not found</h2>
      </div>
    );
  }

  /* ── Start screen ── */
  if (!isStarted) {
    const isTimedExam = quiz.timerMode === 'TOTAL';
    const info = quiz.timerMode === 'TOTAL'
      ? `${Math.floor(quiz.totalTime / 60)} minutes • ${quiz.questions.length} questions`
      : `${quiz.questions.length} questions • Per-question timer`;
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4', fontClass)}>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg shadow-slate-900/10 dark:shadow-blue-900/50 max-w-md w-full border border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{quiz.title}</h1>
          <div className="mb-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${isTimedExam
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
              {isTimedExam
                ? t('workspace.quiz.examModeType1', 'Exam giới hạn thời gian tổng')
                : t('workspace.quiz.examModeType2', 'Exam theo từng câu')}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{info} • Exam Mode</p>
          {quiz.maxAttempt && <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Max attempts: {quiz.maxAttempt}</p>}
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
            Starting this exam will create an attempt and may lock future edits/deletion.
          </p>
          <Button onClick={() => setConfirmStartOpen(true)} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white">
            Start Exam
          </Button>
        </div>

        <Dialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Exam?</DialogTitle>
              <DialogDescription>
                A new attempt will be created as soon as you continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmStartOpen(false)}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  setConfirmStartOpen(false);
                  await handleStart();
                }}
              >
                Continue
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
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8', fontClass)}>
        <ExamPerQuestion
          quiz={quiz}
          answers={answers}
          onSelectAnswer={selectAnswer}
          onTextAnswerChange={updateTextAnswer}
          onSubmit={handleSubmit}
          attemptId={attemptId}
          attemptStartedAt={attemptStartedAt}
          fontClass={fontClass}
        />
      </div>
    );
  }

  /* ── Total time mode – list view ── */
  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8', fontClass)}>
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
            {quiz.questions.map((q, idx) => (
              <div key={q.id} ref={el => { if (el) questionRefs.current[idx] = el; }}>
                <QuestionCard
                  question={q}
                  questionNumber={idx + 1}
                  totalQuestions={quiz.questions.length}
                  answerValue={answers[q.id]}
                  onSelectAnswer={(answerId) => selectAnswer(q.id, answerId, q.type === 'MULTIPLE_CHOICE')}
                  onTextAnswerChange={(value) => updateTextAnswer(q.id, value)}
                />
              </div>
            ))}
            <Button onClick={handleSubmit} disabled={isSubmitted} className="w-full min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white text-base py-3">
              {isSubmitted ? <Loader2 className="w-5 h-5 animate-spin" /> : '📤 Submit Exam'}
            </Button>
          </div>

          {/* Side nav panel (desktop) */}
          <div className="hidden lg:block">
            <QuestionNavPanel
              questions={quiz.questions}
              answers={answers}
              timeLeft={timeLeft}
              onJumpToQuestion={jumpToQuestion}
              onSave={saveManually}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
