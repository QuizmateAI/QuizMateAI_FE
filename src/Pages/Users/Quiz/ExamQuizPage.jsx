import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, FileQuestion, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import QuestionCard from './components/QuestionCard';
import QuestionNavPanel from './components/QuestionNavPanel';
import ExamPerQuestion from './components/ExamPerQuestion';
import QuizHeader from './components/QuizHeader';
import { useQuizAutoSave } from './hooks/useQuizAutoSave';
import { getQuizFullForAttemptInProgress, startQuizAttempt, submitAttempt, updateQuiz } from '@/api/QuizAPI';
import { buildQuestionSectionPathMap, buildSubmitPayload, collectAllSectionKeys, countSectionQuestions, getAttemptRemainingSeconds, getSectionChildren, getSectionKey, getSectionTitle, hasAnswerValue, mapSavedAnswersToState, normalizeQuizData } from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';
import { markQuizAttempted, markQuizCompleted } from '@/Utils/quizAttemptTracker';
import { buildQuizResultPath } from '@/lib/routePaths';

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
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState([]);
  const [confirmStartOpen, setConfirmStartOpen] = useState(() => !shouldAutoStart);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMockSections, setExpandedMockSections] = useState({});
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
      // Khi đang làm bài: dùng variant attempt-in-progress để BE ẩn đáp án
      // cho MOCK_TEST. Result page vẫn dùng getQuizFullForAttempt thường.
      const res = await getQuizFullForAttemptInProgress(quizId);
      return normalizeQuizData(res.data);
    },
    enabled: Boolean(quizId),
    retry: (failureCount, error) => Number(error?.statusCode) >= 500 && failureCount < 1,
  });
  const isMockTest = quiz?.quizIntent === 'MOCK_TEST';
  const useMockTestSectionLayout = isMockTest
    && quiz?.timerMode === 'TOTAL'
    && Array.isArray(quiz?.sectionGroups)
    && quiz.sectionGroups.length > 0;
  const totalPages = useMockTestSectionLayout
    ? 1
    : Math.max(1, Math.ceil((quiz?.questions?.length || 0) / itemsPerPage));

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

  // Use the path passed in location state. Do NOT fall back to buildWorkspaceQuizPath — that
  // always generates an individual workspace path which breaks group-workspace flows.
  const returnToQuizPath = location.state?.returnToQuizPath || '/home';

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

  const answeredCount = useMemo(
    () => quiz?.questions?.filter((question) => hasAnswerValue(answers[question.id])).length || 0,
    [answers, quiz?.questions],
  );
  const questionNumberById = useMemo(
    () => new Map((quiz?.questions || []).map((question, index) => [question.id, Number(question?.number) || (index + 1)])),
    [quiz?.questions],
  );
  const mockQuestionSectionPathMap = useMemo(
    () => buildQuestionSectionPathMap(quiz?.sectionGroups || []),
    [quiz?.sectionGroups],
  );

  const unansweredQuestionNumbers = useMemo(() => {
    if (!quiz?.questions?.length) return [];
    return quiz.questions.flatMap((question, index) => (
      hasAnswerValue(answers[question.id]) ? [] : [index + 1]
    ));
  }, [answers, quiz?.questions]);

  useEffect(() => {
    if (!useMockTestSectionLayout) {
      setExpandedMockSections({});
      return;
    }

    setExpandedMockSections(
      Object.fromEntries(
        collectAllSectionKeys(quiz?.sectionGroups || []).map((sectionKey) => [sectionKey, true]),
      ),
    );
  }, [quiz?.sectionGroups, useMockTestSectionLayout]);

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

  const toggleQuestionFlag = useCallback((questionId) => {
    setFlaggedQuestionIds((prev) => (
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    ));
  }, []);

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
      let attempt;
      const challengeAttempt = location.state?.challengeAttempt;

      if (challengeAttempt?.attemptId) {
        // Challenge flow: attempt already created by startChallengeAttempt
        attempt = challengeAttempt;
      } else {
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
        attempt = res.data;
      }
      const hydratedAnswers = mapSavedAnswersToState(attempt.savedAnswers);
      const effectiveTimeoutAt = resolveEffectiveTimeoutAt(attempt, quiz);

      setAttemptId(attempt.attemptId);
      setAttemptStartedAt(attempt.startedAt || null);
      setAttemptTimeoutAt(effectiveTimeoutAt);
      setTimeLeft(getAttemptRemainingSeconds(effectiveTimeoutAt, quiz?.totalTime || 0));
      markQuizAttempted(quizId);
      setAnswers(hydratedAnswers);
      setFlaggedQuestionIds([]);
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
        navigate(buildQuizResultPath(attemptId), {
          state: {
            quizId,
            attemptMode: 'exam',
            openReviewMode: true,
            returnToQuizPath,
            sourceView: location.state?.sourceView,
            sourceWorkspaceId: location.state?.sourceWorkspaceId,
            sourcePhaseId: location.state?.sourcePhaseId,
            sourceKnowledgeId: location.state?.sourceKnowledgeId,
            sourceRoadmapId: location.state?.sourceRoadmapId,
            challengeContext: location.state?.challengeContext,
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
  }, [answers, attemptId, navigate, quiz?.questions, quizId, returnToQuizPath, showError, t, isPerQuestionMode, location.state?.sourceKnowledgeId, location.state?.sourcePhaseId, location.state?.sourceRoadmapId, location.state?.sourceView, location.state?.sourceWorkspaceId]);

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

  const scrollQuestionIntoView = useCallback((index) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const openSectionsForQuestionIndex = useCallback((questionIndex) => {
    const question = quiz?.questions?.[questionIndex];
    if (!question) return;

    const sectionKeys = mockQuestionSectionPathMap.get(Number(question.id)) || [];
    if (sectionKeys.length === 0) return;

    setExpandedMockSections((prev) => {
      const nextState = { ...prev };
      let changed = false;

      sectionKeys.forEach((sectionKey) => {
        if (!nextState[sectionKey]) {
          nextState[sectionKey] = true;
          changed = true;
        }
      });

      return changed ? nextState : prev;
    });
  }, [mockQuestionSectionPathMap, quiz?.questions]);

  const jumpToQuestion = useCallback((index) => {
    if (useMockTestSectionLayout) {
      openSectionsForQuestionIndex(index);
      window.setTimeout(() => {
        scrollQuestionIntoView(index);
      }, 20);
      return;
    }

    const targetPage = Math.floor(index / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      window.setTimeout(() => {
        scrollQuestionIntoView(index);
      }, 30);
      return;
    }

    scrollQuestionIntoView(index);
  }, [currentPage, itemsPerPage, openSectionsForQuestionIndex, scrollQuestionIntoView, useMockTestSectionLayout]);

  const paginatedQuestions = useMemo(() => {
    if (!quiz?.questions?.length) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return quiz.questions.slice(startIndex, startIndex + itemsPerPage);
  }, [quiz?.questions, currentPage]);

  const renderedQuestionCards = useMemo(() => (
    paginatedQuestions.map((q, idx) => {
      const globalIdx = (currentPage - 1) * itemsPerPage + idx;
      return (
        <div key={q.id} ref={(el) => { if (el) questionRefs.current[globalIdx] = el; }} className="scroll-mt-24">
          <QuestionCard
            question={q}
            questionNumber={globalIdx + 1}
            totalQuestions={quiz.questions.length}
            showHeaderMeta={false}
            isFlagged={flaggedQuestionIds.includes(q.id)}
            onToggleFlag={() => toggleQuestionFlag(q.id)}
            answerValue={answers[q.id]}
            onSelectAnswer={(answerId) => selectAnswer(q.id, answerId, q.type === 'MULTIPLE_CHOICE')}
            onTextAnswerChange={(value) => updateTextAnswer(q.id, value)}
            onMatchingAnswerChange={(value) => updateMatchingAnswer(q.id, value)}
          />
        </div>
      );
    })
  ), [answers, currentPage, flaggedQuestionIds, itemsPerPage, paginatedQuestions, quiz?.questions.length, selectAnswer, toggleQuestionFlag, updateMatchingAnswer, updateTextAnswer]);

  const renderMockTestQuestionCard = useCallback((question) => {
    const questionNumber = questionNumberById.get(question.id) || Number(question?.number) || 1;
    const questionIndex = questionNumber - 1;

    return (
      <div key={question.id} ref={(element) => { if (element) questionRefs.current[questionIndex] = element; }} className="scroll-mt-24">
        <QuestionCard
          question={question}
          questionNumber={questionNumber}
          totalQuestions={quiz?.questions?.length || 0}
          showHeaderMeta={false}
          isFlagged={flaggedQuestionIds.includes(question.id)}
          onToggleFlag={() => toggleQuestionFlag(question.id)}
          answerValue={answers[question.id]}
          onSelectAnswer={(answerId) => selectAnswer(question.id, answerId, question.type === 'MULTIPLE_CHOICE')}
          onTextAnswerChange={(value) => updateTextAnswer(question.id, value)}
          onMatchingAnswerChange={(value) => updateMatchingAnswer(question.id, value)}
        />
      </div>
    );
  }, [answers, flaggedQuestionIds, questionNumberById, quiz?.questions?.length, selectAnswer, toggleQuestionFlag, updateMatchingAnswer, updateTextAnswer]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleMockSection = useCallback((sectionKey) => {
    setExpandedMockSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

  const renderMockTestSection = (section, sectionIndex, depth = 0, pathLabel = `${sectionIndex + 1}`) => {
    const childSections = getSectionChildren(section);
    const sectionKey = getSectionKey(section, `exam-section-${pathLabel}`);
    const isExpanded = expandedMockSections[sectionKey] ?? true;
    const sectionTitle = getSectionTitle(
      section,
      `${t('workspace.mockTestForms.detail.section', 'Section')} ${pathLabel}`,
    );

    return (
      <section
        key={section.sectionId ?? `mock-section-${pathLabel}`}
        className={cn(
          'space-y-4',
          depth === 0
            ? 'rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-blue-950/20'
            : 'pl-5 border-l-2 border-slate-200 dark:border-slate-700',
        )}
      >
        <button
          type="button"
          onClick={() => toggleMockSection(sectionKey)}
          className="flex w-full flex-wrap items-center gap-3 rounded-2xl text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
        >
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {sectionTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {countSectionQuestions(section)} {t('workspace.mockTestForms.detail.questions', 'questions')}
            </p>
          </div>
        </button>

        {isExpanded && (
          <>
            {Array.isArray(section?.questions) && section.questions.length > 0 && (
              <div className="space-y-4">
                {section.questions.map((question) => renderMockTestQuestionCard(question))}
              </div>
            )}

            {childSections.length > 0 && (
              <div className="space-y-6">
                {childSections.map((childSection, childIndex) => renderMockTestSection(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
              </div>
            )}
          </>
        )}
      </section>
    );
  };

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
                    ? t('workspace.quiz.examModeType1', 'Timed Test')
                    : t('workspace.quiz.examModeType2', 'Sequential Timed Test')}
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
        <div className="mb-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-blue-950/20">
          <div className="relative p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.12),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.10),_transparent_38%)]" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/30 dark:text-blue-300">
                  {quiz.timerMode === 'TOTAL'
                    ? t('workspace.quiz.examModeType1', 'Timed Test')
                    : t('workspace.quiz.examModeType2', 'Sequential Timed Test')}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">{quiz.title}</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t('workspace.quiz.examActions.headerHint', 'Finish each question and use the star to mark anything you want to revisit before submitting.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
                <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {t('workspace.quiz.result.total', 'Total')}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{quiz.questions.length}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm dark:border-emerald-800/70 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                    {t('workspace.quiz.result.answered', 'Answered')}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    {answeredCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm dark:border-amber-800/70 dark:bg-amber-950/20">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
                    {t('workspace.quiz.examActions.markedCount', 'Marked')}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-700 dark:text-amber-200">
                    <Star className="h-5 w-5 fill-current" />
                    {flaggedQuestionIds.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Questions list */}
          <div className="space-y-4">
            {useMockTestSectionLayout
              ? quiz.sectionGroups.map((section, sectionIndex) => renderMockTestSection(section, sectionIndex))
              : renderedQuestionCards}
            {!useMockTestSectionLayout && quiz.questions.length > itemsPerPage && (
              <div className="flex justify-between items-center mt-6 p-4">
                <Button variant="outline" disabled={currentPage === 1} onClick={() => handlePageChange(Math.max(1, currentPage - 1))}>{t('workspace.quiz.pagination.prev', 'Previous page')}</Button>
                <span className="text-sm font-medium text-slate-500">{t('workspace.quiz.pagination.page', 'Page')} {currentPage} / {totalPages}</span>
                <Button variant="outline" disabled={currentPage === totalPages} onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}>{t('workspace.quiz.pagination.next', 'Next page')}</Button>
              </div>
            )}
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            )}
          </div>

          <div>
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
              flaggedQuestionIds={flaggedQuestionIds}
              isSubmitLoading={isSubmitted}
              submitError={submitError}
              sectionGroups={quiz.sectionGroups}
              disablePagination={useMockTestSectionLayout}
              t={t}
            />
          </div>
        </div>
      </div>
      </div>

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
