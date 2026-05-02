import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import {
  getQuizFullForAttemptInProgress,
  startQuizAttempt,
  submitAttempt,
  updateQuiz,
} from '@/api/QuizAPI';
import { useQuizAutoSave } from '../Quiz/hooks/useQuizAutoSave';
import QuestionCard from '../Quiz/components/QuestionCard';
import QuizHeader from '../Quiz/components/QuizHeader';
import {
  buildSubmitPayload,
  getAttemptRemainingSeconds,
  getSectionSharedContext,
  hasAnswerValue,
  mapSavedAnswersToState,
  normalizeQuizData,
} from '../Quiz/utils/quizTransform';
import { markQuizAttempted, markQuizCompleted } from '@/utils/quizAttemptTracker';
import { buildQuizResultPath } from '@/lib/routePaths';
import MixedMathText from '@/components/math/MixedMathText';
import { useMockTestSectionFlow } from './hooks/useMockTestSectionFlow';
import MockTestSectionIntro from './components/MockTestSectionIntro';
import MockTestSectionTransition from './components/MockTestSectionTransition';
import MockTestSectionCompletePanel from './components/MockTestSectionCompletePanel';

/**
 * Dedicated MockTest v2 attempt page — section-by-section enforced flow.
 * Mounted at /quizzes/mock-tests/:quizId/exam (route in App.jsx).
 *
 * Differences vs ExamQuizPage (shared Quiz attempt):
 *   - Only ONE section visible at a time (gated by useMockTestSectionFlow phase machine).
 *   - User cannot navigate back to completed sections (one-way progression).
 *   - Submit button hidden until phase=COMPLETE on the LAST section.
 *   - No pagination, no per-question timer, no flag panel — focus on exam realism.
 *   - Same backend APIs (getQuizFullForAttemptInProgress, startQuizAttempt, submitAttempt).
 */
const NS = 'workspace.quiz.mockTestExam';

export default function MockTestExamPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const { t } = useTranslation();

  const shouldAutoStart = location.state?.autoStart === true;
  const returnToQuizPath = location.state?.returnToQuizPath || '/home';

  const [attemptId, setAttemptId] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [answers, setAnswers] = useState({});
  const [attemptTimeoutAt, setAttemptTimeoutAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmStartOpen, setConfirmStartOpen] = useState(() => !shouldAutoStart);

  const submittingRef = useRef(false);
  const examLockNotifiedRef = useRef(false);
  const instantSaveTimerRef = useRef(null);
  const instantSaveInFlightRef = useRef(false);
  const autoStartTriggeredRef = useRef(false);

  const { data: quiz = null, isLoading } = useQuery({
    queryKey: ['mocktest-full', quizId],
    queryFn: async () => {
      const res = await getQuizFullForAttemptInProgress(quizId);
      return normalizeQuizData(res.data);
    },
    enabled: Boolean(quizId),
    retry: (failureCount, error) => Number(error?.statusCode) >= 500 && failureCount < 1,
  });

  const isMockTest = quiz?.quizIntent === 'MOCK_TEST';
  const hasSectionLayout = isMockTest
    && Array.isArray(quiz?.sectionGroups)
    && quiz.sectionGroups.length > 0;

  const { saveManually, syncSnapshot } = useQuizAutoSave(attemptId, answers, {
    interval: 5000,
    enabled: isStarted && !isSubmitted,
  });

  // ---------- handlers ----------

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitted(true);
    setSubmitError('');

    if (!attemptId) {
      setSubmitError(t(`${NS}.submitMissingAttempt`, 'Cannot submit: attempt is missing.'));
      submittingRef.current = false;
      setIsSubmitted(false);
      return false;
    }

    try {
      const submitPayload = buildSubmitPayload(quiz?.questions, answers);
      await submitAttempt(attemptId, submitPayload);
      markQuizCompleted(quizId);
      // Brief delay so backend marks COMPLETED before result page queries it.
      await new Promise((r) => setTimeout(r, 1500));
      navigate(buildQuizResultPath(attemptId), {
        state: {
          quizId,
          attemptMode: 'exam',
          openReviewMode: true,
          returnToQuizPath,
          sourceView: location.state?.sourceView,
          sourceWorkspaceId: location.state?.sourceWorkspaceId,
        },
        replace: true,
      });
      return true;
    } catch (err) {
      console.error('[MockTestExam] submit failed:', err);
      const msg = err?.message || t(`${NS}.submitFailed`, 'Nộp bài thất bại. Vui lòng thử lại.');
      showError(msg);
      setSubmitError(msg);
      submittingRef.current = false;
      setIsSubmitted(false);
      return false;
    }
  }, [
    attemptId,
    answers,
    quiz?.questions,
    quizId,
    returnToQuizPath,
    location.state?.sourceView,
    location.state?.sourceWorkspaceId,
    navigate,
    showError,
    t,
  ]);

  const flow = useMockTestSectionFlow({
    sectionGroups: quiz?.sectionGroups,
    answers,
    hasAnswerValue,
    onFinish: handleSubmit,
  });

  const handleStart = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      let attempt;
      try {
        const res = await startQuizAttempt(quizId, { isPracticeMode: false });
        attempt = res.data;
      } catch (startErr) {
        const message = String(startErr?.message || '').toLowerCase();
        const statusCode = startErr?.data?.statusCode;
        const shouldActivate = message.includes('chưa được kích hoạt') || statusCode === 1083;
        if (!shouldActivate) throw startErr;
        await updateQuiz(Number(quizId), { status: 'ACTIVE' });
        const res = await startQuizAttempt(quizId, { isPracticeMode: false });
        attempt = res.data;
      }
      const hydrated = mapSavedAnswersToState(attempt.savedAnswers);
      setAttemptId(attempt.attemptId);
      setAttemptTimeoutAt(attempt.timeoutAt || null);
      setTimeLeft(getAttemptRemainingSeconds(attempt.timeoutAt, quiz?.totalTime || 0));
      markQuizAttempted(quizId);
      setAnswers(hydrated);
      syncSnapshot(hydrated);
      setIsStarted(true);
      setConfirmStartOpen(false);
    } catch (err) {
      console.error('[MockTestExam] start failed:', err);
      showError(err?.message || t(`${NS}.cannotStart`, 'Không thể bắt đầu mocktest.'));
      if (shouldAutoStart) navigate(returnToQuizPath, { replace: true });
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, quizId, quiz?.totalTime, syncSnapshot, navigate, returnToQuizPath, shouldAutoStart, showError, t]);

  const handleCloseStartDialog = useCallback(() => {
    setConfirmStartOpen(false);
    navigate(returnToQuizPath, { replace: true });
  }, [navigate, returnToQuizPath]);

  const handleHeaderBack = useCallback(async (confirmed) => {
    if (isStarted && !isSubmitted) {
      if (!confirmed) return;
      await handleSubmit();
    } else {
      navigate(returnToQuizPath, { replace: true });
    }
  }, [isStarted, isSubmitted, handleSubmit, navigate, returnToQuizPath]);

  const selectAnswer = useCallback((questionId, answerId, isMultiple) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const updated = isMultiple
        ? (current.includes(answerId) ? current.filter((id) => id !== answerId) : [...current, answerId])
        : [answerId];
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const updateTextAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const updateMatchingAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // ---------- effects ----------

  // Auto-start when shouldAutoStart=true and quiz loaded.
  useEffect(() => {
    if (!shouldAutoStart || !quiz || isStarted || autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    handleStart();
  }, [shouldAutoStart, quiz, isStarted, handleStart]);

  // Debounced save on answer change.
  useEffect(() => {
    if (!isStarted || isSubmitted || !attemptId) return undefined;
    if (instantSaveTimerRef.current) clearTimeout(instantSaveTimerRef.current);
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
  }, [answers, attemptId, isStarted, isSubmitted, saveManually]);

  // Total timer countdown.
  useEffect(() => {
    if (!isStarted || isSubmitted || !attemptTimeoutAt) return undefined;
    const sync = () => {
      const remaining = getAttemptRemainingSeconds(attemptTimeoutAt);
      setTimeLeft((prev) => (prev === remaining ? prev : remaining));
      if (remaining <= 0) void handleSubmit();
    };
    sync();
    const t = setInterval(sync, 1000);
    return () => clearInterval(t);
  }, [attemptTimeoutAt, isStarted, isSubmitted, handleSubmit]);

  // Lock browser back/forward while exam is ongoing.
  useEffect(() => {
    if (!isStarted || isSubmitted) return undefined;
    const onPopState = () => {
      window.setTimeout(() => window.history.forward(), 0);
      if (!examLockNotifiedRef.current) {
        showError(t(`${NS}.navigationLocked`, 'Không thể rời khỏi bài làm khi đang thi. Hãy nộp bài để thoát.'));
        examLockNotifiedRef.current = true;
        setTimeout(() => {
          examLockNotifiedRef.current = false;
        }, 1500);
      }
    };
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isStarted, isSubmitted, showError, t]);

  // ---------- early returns ----------

  if (isLoading || !quiz) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isMockTest || !hasSectionLayout) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">
          {t(`${NS}.notMockTestTitle`, 'Không phải mocktest hợp lệ')}
        </h2>
        <p className="text-gray-600">
          {t(`${NS}.notMockTestMessage`, 'Trang này chỉ hoạt động với MockTest có cấu trúc section.')}
        </p>
        <Button onClick={() => navigate(returnToQuizPath, { replace: true })}>
          {t(`${NS}.goBackButton`, 'Quay lại')}
        </Button>
      </div>
    );
  }

  // ---------- main render ----------

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <QuizHeader
        title={quiz.title}
        timerDisplay={isStarted && !isSubmitted ? <TimerDisplay seconds={timeLeft} /> : null}
        onBack={handleHeaderBack}
        canBack
      />

      {!isStarted && (
        <Dialog open={confirmStartOpen} onOpenChange={(open) => !open && handleCloseStartDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(`${NS}.confirmStartTitle`, 'Bắt đầu mocktest?')}</DialogTitle>
              <DialogDescription>
                {t(`${NS}.confirmStartDescription`, 'Bài thi gồm {{sectionsCount}} phần, {{questionsCount}} câu.', {
                  sectionsCount: flow.totalSections,
                  questionsCount: quiz.questions?.length || 0,
                })}{' '}
                {quiz.totalTime > 0 && (
                  <>
                    {t(`${NS}.confirmStartDuration`, 'Thời gian: {{durationMinutes}} phút.', {
                      durationMinutes: Math.round(quiz.totalTime / 60),
                    })}{' '}
                  </>
                )}
                {t(`${NS}.confirmStartWarning`, 'Khi bắt đầu, các phần sẽ hiển thị tuần tự — bạn không thể quay lại phần đã hoàn thành.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseStartDialog} disabled={isStarting}>
                {t(`${NS}.cancelButton`, 'Hủy')}
              </Button>
              <Button onClick={handleStart} disabled={isStarting}>
                {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t(`${NS}.startButton`, 'Bắt đầu')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isStarted && !isSubmitted && (
        <main className="flex-1">
          {flow.phase === 'INTRO' && (
            <MockTestSectionIntro
              section={flow.currentSection}
              sectionIndex={flow.currentSectionIndex}
              totalSections={flow.totalSections}
              onStart={flow.startCurrentSection}
            />
          )}

          {flow.phase === 'TRANSITION' && (
            <MockTestSectionTransition
              completedSection={flow.currentSection}
              completedAnswered={flow.currentSectionAnsweredCount}
              upcomingSection={flow.leafSections[flow.currentSectionIndex + 1]}
              upcomingIndex={flow.currentSectionIndex + 1}
              totalSections={flow.totalSections}
              onContinue={flow.advanceFromTransition}
            />
          )}

          {(flow.phase === 'IN_PROGRESS' || flow.phase === 'COMPLETE') && flow.currentSection && (
            <SectionQuestionsRenderer
              section={flow.currentSection}
              sectionIndex={flow.currentSectionIndex}
              totalSections={flow.totalSections}
              questions={flow.currentSectionQuestions}
              answers={answers}
              onSelectAnswer={selectAnswer}
              onTextAnswerChange={updateTextAnswer}
              onMatchingAnswerChange={updateMatchingAnswer}
            />
          )}
        </main>
      )}

      {flow.phase === 'COMPLETE' && (
        <MockTestSectionCompletePanel
          isLastSection={flow.isLastSection}
          answeredCount={flow.currentSectionAnsweredCount}
          totalCount={flow.currentSectionTotalQuestions}
          onProceed={flow.proceedToNextSection}
        />
      )}

      {submitError && (
        <div className="bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}
    </div>
  );
}

function SectionQuestionsRenderer({
  section,
  sectionIndex,
  totalSections,
  questions,
  answers,
  onSelectAnswer,
  onTextAnswerChange,
  onMatchingAnswerChange,
}) {
  const { t } = useTranslation();
  const sharedContext = getSectionSharedContext(section);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-800">
        <span className="font-semibold">
          {t(`${NS}.sectionLabelWithName`, 'Phần {{index}} / {{total}}: {{name}}', {
            index: sectionIndex + 1,
            total: totalSections,
            name: section.name || `Section ${sectionIndex + 1}`,
          })}
        </span>
        {section.description && <span className="ml-2 text-blue-700">— {section.description}</span>}
      </div>

      {sharedContext && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            {t(`${NS}.sharedContextLabel`, 'Đoạn văn / Ngữ cảnh')}
          </div>
          <div className="prose prose-sm max-w-none text-gray-800">
            <MixedMathText text={sharedContext} />
          </div>
        </div>
      )}

      {questions.map((q, idx) => {
        const qid = q.id ?? q.questionId;
        return (
          <div key={qid}>
            <QuestionCard
              question={q}
              questionNumber={idx + 1}
              totalQuestions={questions.length}
              showHeaderMeta={false}
              isFlagged={false}
              onToggleFlag={() => {}}
              answerValue={answers[qid]}
              onSelectAnswer={(answerId) => onSelectAnswer(qid, answerId, q.type === 'MULTIPLE_CHOICE')}
              onTextAnswerChange={(value) => onTextAnswerChange(qid, value)}
              onMatchingAnswerChange={(value) => onMatchingAnswerChange(qid, value)}
            />
          </div>
        );
      })}
    </div>
  );
}

function TimerDisplay({ seconds }) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  const danger = safe <= 60;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
        danger ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
      )}
    >
      <Clock className="h-4 w-4" />
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}
