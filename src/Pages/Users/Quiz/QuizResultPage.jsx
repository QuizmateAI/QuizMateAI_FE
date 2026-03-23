import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Eye, Trophy, XCircle, CheckCircle2, BarChart3, Clock3, Sparkles, RefreshCw, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import QuestionCard from './components/QuestionCard';
import QuizHeader from './components/QuizHeader';
import { getAttemptResult, getQuizFull, getAttemptAssessment, generateQuizFromWorkspaceAssessment } from '@/api/QuizAPI';
import { generateRoadmapPhaseContent } from '@/api/AIAPI';
import { normalizeQuizData } from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';

const PRE_LEARNING_PHASE_CONTENT_TRIGGER_KEY = 'prelearning_phasecontent_triggered_attempts';

function markPhaseContentGenerating(workspaceId, phaseId) {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedPhaseId = Number(phaseId);
  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) return;
  if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
  if (typeof window === 'undefined') return;

  const storageKey = `workspace_${normalizedWorkspaceId}_phaseContentGeneratingPhaseIds`;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed : [];
    if (!ids.includes(normalizedPhaseId)) {
      window.sessionStorage.setItem(storageKey, JSON.stringify([...ids, normalizedPhaseId]));
    }
  } catch (error) {
    console.error('Không thể lưu trạng thái generating phase-content:', error);
  }
}

function unmarkPhaseContentGenerating(workspaceId, phaseId) {
  const normalizedWorkspaceId = Number(workspaceId);
  const normalizedPhaseId = Number(phaseId);
  if (!Number.isInteger(normalizedWorkspaceId) || normalizedWorkspaceId <= 0) return;
  if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
  if (typeof window === 'undefined') return;

  const storageKey = `workspace_${normalizedWorkspaceId}_phaseContentGeneratingPhaseIds`;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed : [];
    window.sessionStorage.setItem(storageKey, JSON.stringify(ids.filter((id) => Number(id) !== normalizedPhaseId)));
  } catch (error) {
    console.error('Không thể xoá trạng thái generating phase-content:', error);
  }
}

export default function QuizResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const quizFontStyle = { fontFamily: 'var(--quiz-display-font)' };

  const [result, setResult] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  const [quizRawDetails, setQuizRawDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentStatus, setAssessmentStatus] = useState('NOT_AVAILABLE');
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingKnowledge, setGeneratingKnowledge] = useState(false);
  const [knowledgeGenerationTriggered, setKnowledgeGenerationTriggered] = useState(false);
  const [knowledgeGenerationHydrated, setKnowledgeGenerationHydrated] = useState(false);
  const itemsPerPage = 20;
  const questionRefs = useRef({});
  const retryTimeoutRef = useRef(null);
  const autoKnowledgeTriggerAttemptedRef = useRef(false);
  const pendingResultPollingRef = useRef(null);

  // quizId passed via navigation state for "back to quiz" button
  const quizId = location.state?.quizId;
  const returnToQuizPath = location.state?.returnToQuizPath;
  const sourceView = String(location.state?.sourceView || '').toLowerCase();
  const sourceWorkspaceId = Number(location.state?.sourceWorkspaceId);
  const normalizedWorkspaceId = Number(
    quizRawDetails?.workspaceId
    ?? quizRawDetails?.workspace?.workspaceId
    ?? quizDetails?.workspaceId
    ?? result?.workspaceId
  );
  const returnPathWorkspaceId = useMemo(() => {
    if (!returnToQuizPath) return null;
    const matched = returnToQuizPath.match(/\/workspace\/(\d+)/);
    if (!matched) return null;
    const parsed = Number(matched[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [returnToQuizPath]);

  const resolvedWorkspaceIdForBack = Number.isInteger(sourceWorkspaceId) && sourceWorkspaceId > 0
    ? sourceWorkspaceId
    : Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0
    ? normalizedWorkspaceId
    : returnPathWorkspaceId;

  const normalizedQuizIdForBack = Number(
    quizId
    ?? result?.quizId
    ?? quizRawDetails?.quizId
    ?? quizDetails?.quizId
  );
  const hasQuizIdForBack = Number.isInteger(normalizedQuizIdForBack) && normalizedQuizIdForBack > 0;

  const directQuizDetailBackPath = Number.isInteger(resolvedWorkspaceIdForBack) && resolvedWorkspaceIdForBack > 0 && hasQuizIdForBack
    ? (sourceView === 'roadmap'
      ? `/workspace/${resolvedWorkspaceIdForBack}/roadmap/quiz/${normalizedQuizIdForBack}`
      : `/workspace/${resolvedWorkspaceIdForBack}/quiz/${normalizedQuizIdForBack}`)
    : null;

  const canUseReturnPathAsQuizDetail = useMemo(() => {
    if (!returnToQuizPath) return false;
    return /\/workspace\/\d+\/(?:quiz(?:\/\d+)?|roadmap\/quiz\/\d+)(?:\?|$)/.test(returnToQuizPath);
  }, [returnToQuizPath]);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let shouldRetry = false;
    setLoading(true);

    const loadResult = async () => {
      try {
        const res = await getAttemptResult(attemptId);
        if (cancelled) return;

        const attemptResult = res.data;
        setResult(attemptResult);

        if (attemptResult?.quizId) {
          try {
            const quizRes = await getQuizFull(attemptResult.quizId);
            if (cancelled) return;
            setQuizRawDetails(quizRes.data || null);
            setQuizDetails(normalizeQuizData(quizRes.data));
          } catch (quizErr) {
            if (cancelled) return;
            console.error('Failed to load quiz details for review:', quizErr);
            setQuizDetails(null);
            setQuizRawDetails(null);
          }
        }
      } catch (err) {
        if (cancelled) return;

        console.error('Failed to load result:', err);
        // Retry ngắn để tránh race-condition khi BE vừa ghi attempt result.
        if (retryCount < 2) {
          shouldRetry = true;
          retryTimeoutRef.current = globalThis.setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 1000);
          return;
        }
      } finally {
        if (!cancelled && !shouldRetry) {
          setLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        globalThis.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [attemptId, retryCount]);

  const preLearningGenerationContext = useMemo(() => {
    const quizSource = quizRawDetails || {};
    const quizIntent = String(
      quizSource?.quizIntent
      || quizSource?.intent
      || result?.quizIntent
      || ''
    ).toUpperCase();

    const roadmapId = Number(
      quizSource?.roadmapId
      ?? quizSource?.roadmap?.roadmapId
      ?? result?.roadmapId
    );
    const phaseId = Number(
      quizSource?.phaseId
      ?? quizSource?.phase?.phaseId
      ?? result?.phaseId
    );
    const workspaceId = Number(
      quizSource?.workspaceId
      ?? quizSource?.workspace?.workspaceId
      ?? result?.workspaceId
    );

    const attemptStatus = String(result?.status || '').toUpperCase();
    const isCompletedAttempt = !attemptStatus || attemptStatus === 'COMPLETED';
    const isPreLearningQuiz = quizIntent === 'PRE_LEARNING';
    const isValidRoadmapContext = Number.isInteger(roadmapId) && roadmapId > 0 && Number.isInteger(phaseId) && phaseId > 0;

    return {
      isPreLearningQuiz,
      isCompletedAttempt,
      isValidRoadmapContext,
      roadmapId,
      phaseId,
      workspaceId,
    };
  }, [quizRawDetails, result]);

  const preLearningGenerateDedupeKey = useMemo(
    () => `${PRE_LEARNING_PHASE_CONTENT_TRIGGER_KEY}:${attemptId}`,
    [attemptId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      setKnowledgeGenerationTriggered(false);
      setKnowledgeGenerationHydrated(true);
      return;
    }

    const triggered = window.localStorage.getItem(preLearningGenerateDedupeKey) === '1';
    setKnowledgeGenerationTriggered(triggered);
    setKnowledgeGenerationHydrated(true);
    autoKnowledgeTriggerAttemptedRef.current = false;
  }, [preLearningGenerateDedupeKey]);
  const fetchAssessment = useCallback(async () => {
    if (!attemptId) return;
    setAssessmentLoading(true);
    try {
      const res = await getAttemptAssessment(attemptId);
      const payload = res?.data || null;
      setAssessmentStatus(payload?.status || 'NOT_AVAILABLE');
      setAssessmentData(payload);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setAssessmentStatus('NOT_AVAILABLE');
      setAssessmentData(null);
    } finally {
      setAssessmentLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  useEffect(() => {
    if (assessmentStatus !== 'PROCESSING') return undefined;
    const intervalId = globalThis.setInterval(() => {
      fetchAssessment();
    }, 8000);
    return () => globalThis.clearInterval(intervalId);
  }, [assessmentStatus, fetchAssessment]);

  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, []);

  // Normalize result questions for QuestionCard format
  const reviewQuestions = useMemo(() => {
    if (!result?.questions?.length) return [];

    const questionMap = new Map((quizDetails?.questions || []).map(question => [question.id, question]));

    return result.questions.map((attemptQuestion, index) => {
      const detailQuestion = questionMap.get(attemptQuestion.questionId);
      const gradingStatus = String(attemptQuestion?.gradingStatus || '').toUpperCase();
      const evaluatedCorrect =
        typeof attemptQuestion?.correct === 'boolean'
          ? attemptQuestion.correct
          : (typeof attemptQuestion?.isCorrect === 'boolean' ? attemptQuestion.isCorrect : null);

      return {
        id: attemptQuestion.questionId,
        content: detailQuestion?.content || `Question ${index + 1}`,
        type: detailQuestion?.type || attemptQuestion.questionType || 'SINGLE_CHOICE',
        difficulty: detailQuestion?.difficulty || 'MEDIUM',
        explanation: detailQuestion?.explanation || '',
        answers: detailQuestion?.answers || [],
        selectedAnswerIds: attemptQuestion.selectedAnswerIds || [],
        textAnswer: attemptQuestion.textAnswer || '',
        isCorrect: evaluatedCorrect,
        gradingStatus,
        questionScore: attemptQuestion.questionScore || 0,
      };
    });
  }, [result, quizDetails]);

  const pendingGradingCount = useMemo(() => {
    const fromResult = Number(result?.pendingGradingQuestionCount);
    if (Number.isInteger(fromResult) && fromResult >= 0) {
      return fromResult;
    }
    return reviewQuestions.filter((question) => String(question?.gradingStatus || '').toUpperCase() === 'PENDING').length;
  }, [result?.pendingGradingQuestionCount, reviewQuestions]);

  const handleBack = useCallback(() => {
    if (directQuizDetailBackPath) {
      navigate(directQuizDetailBackPath, { replace: true });
      return;
    }

    if (canUseReturnPathAsQuizDetail && returnToQuizPath) {
      navigate(returnToQuizPath, { replace: true });
      return;
    }

    if (quizId || result?.quizId) {
      navigate('/home', { replace: true });
      return;
    }
    navigate('/');
  }, [
    directQuizDetailBackPath,
    navigate,
    canUseReturnPathAsQuizDetail,
    returnToQuizPath,
  ]);

  const jumpToQuestion = useCallback((questionIndex) => {
    const targetPage = Math.floor(questionIndex / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      setTimeout(() => {
        questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

    questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentPage, itemsPerPage]);

  const canTriggerKnowledgeAfterPreLearning = preLearningGenerationContext.isPreLearningQuiz
    && preLearningGenerationContext.isCompletedAttempt
    && preLearningGenerationContext.isValidRoadmapContext;

  const handleGenerateKnowledgeAfterPreLearning = useCallback(async () => {
    const { roadmapId, phaseId, workspaceId } = preLearningGenerationContext;
    if (!canTriggerKnowledgeAfterPreLearning || generatingKnowledge || knowledgeGenerationTriggered) return;

    setGeneratingKnowledge(true);
    try {
      markPhaseContentGenerating(workspaceId, phaseId);
      await generateRoadmapPhaseContent({
        roadmapId,
        phaseId,
        skipPreLearning: false,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(preLearningGenerateDedupeKey, '1');
      }

      setKnowledgeGenerationTriggered(true);
      showSuccess(t('workspace.quiz.result.generateKnowledgeSuccess', 'Đã gửi yêu cầu tạo knowledge cho phase này.'));
    } catch (error) {
      unmarkPhaseContentGenerating(workspaceId, phaseId);
      console.error('Failed to generate roadmap phase content after pre-learning:', error);
      showError(error?.message || t('workspace.quiz.result.generateKnowledgeFail', 'Tạo knowledge thất bại. Vui lòng thử lại.'));
    } finally {
      setGeneratingKnowledge(false);
    }
  }, [
    canTriggerKnowledgeAfterPreLearning,
    generatingKnowledge,
    knowledgeGenerationTriggered,
    preLearningGenerateDedupeKey,
    preLearningGenerationContext,
    showError,
    showSuccess,
    t,
  ]);

  useEffect(() => {
    if (!knowledgeGenerationHydrated) return;
    if (!canTriggerKnowledgeAfterPreLearning) return;
    if (knowledgeGenerationTriggered || generatingKnowledge) return;
    if (autoKnowledgeTriggerAttemptedRef.current) return;

    autoKnowledgeTriggerAttemptedRef.current = true;
    void handleGenerateKnowledgeAfterPreLearning();
  }, [
    canTriggerKnowledgeAfterPreLearning,
    generatingKnowledge,
    handleGenerateKnowledgeAfterPreLearning,
    knowledgeGenerationHydrated,
    knowledgeGenerationTriggered,
  ]);

  useEffect(() => {
    if (!attemptId) return undefined;
    if (!result) return undefined;
    if (pendingGradingCount <= 0) return undefined;

    let cancelled = false;
    pendingResultPollingRef.current = globalThis.setInterval(async () => {
      try {
        const res = await getAttemptResult(attemptId);
        if (cancelled) return;

        const latestResult = res?.data || null;
        if (!latestResult) return;
        setResult(latestResult);

        const latestPending = Number(latestResult?.pendingGradingQuestionCount);
        if (Number.isInteger(latestPending) && latestPending <= 0 && pendingResultPollingRef.current) {
          globalThis.clearInterval(pendingResultPollingRef.current);
          pendingResultPollingRef.current = null;
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed polling attempt result while grading pending:', error);
        }
      }
    }, 2500);

    return () => {
      cancelled = true;
      if (pendingResultPollingRef.current) {
        globalThis.clearInterval(pendingResultPollingRef.current);
        pendingResultPollingRef.current = null;
      }
    };
  }, [attemptId, pendingGradingCount, result]);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <h2 className="text-xl text-slate-600 dark:text-slate-300">{t('workspace.quiz.result.notFound', 'Result not found')}</h2>
      </div>
    );
  }

  const totalQuestion = Number(result.totalQuestion ?? reviewQuestions.length ?? 0);
  const correctQuestion = Number(result.correctQuestion ?? reviewQuestions.filter(q => q.isCorrect).length ?? 0);
  const passScore = result.passScore != null ? Number(result.passScore) : null;
  const accuracyPercent = totalQuestion > 0
    ? (correctQuestion / totalQuestion) * 100
    : null;

  // Ưu tiên trạng thái passed từ BE; fallback bằng tỉ lệ đúng khi dữ liệu BE không nhất quán.
  const passed = typeof result.passed === 'boolean'
    ? (passScore != null && accuracyPercent != null
      ? (result.passed || accuracyPercent >= passScore)
      : result.passed)
    : (passScore != null && accuracyPercent != null
      ? accuracyPercent >= passScore
      : null);
  const scoreValue = Number(result.maxScore) > 0 ? `${result.score ?? 0}/${result.maxScore}` : `${result.score ?? 0}`;
  const correctValue = `${correctQuestion}/${totalQuestion}`;
  const answeredValue = `${result.answeredQuestion ?? 0}/${totalQuestion}`;
  const timeTakenSeconds = getTimeTakenSeconds(result.startedAt, result.completedAt, result.timeoutAt);
  const totalPages = Math.max(1, Math.ceil(reviewQuestions.length / itemsPerPage));
  const safeNavPage = Math.min(currentPage, totalPages);
  const navStartIndex = (safeNavPage - 1) * itemsPerPage;
  const navQuestions = reviewQuestions.slice(navStartIndex, navStartIndex + itemsPerPage);
  const resultTitle = passed == null
    ? t('workspace.quiz.result.quizCompleted', 'Quiz Completed')
    : passed
      ? t('workspace.quiz.result.congratulations', 'Congratulations!')
      : t('workspace.quiz.result.keepTrying', 'Keep Trying!');
  const aiSummary = assessmentData?.summary;
  const aiStrengths = Array.isArray(assessmentData?.strengths) ? assessmentData.strengths : [];
  const aiWeaknesses = Array.isArray(assessmentData?.weaknesses) ? assessmentData.weaknesses : [];
  const recurringMistakes = Array.isArray(assessmentData?.recurringMistakes) ? assessmentData.recurringMistakes : [];
  const nextQuizPlan = assessmentData?.nextQuizPlan;
  const canGenerateRecommendedQuiz = assessmentData?.recommendationStatus === 'PENDING' && Number(assessmentData?.assessmentId) > 0;

  const handleGenerateQuizFromAssessment = async () => {
    const assessmentId = Number(assessmentData?.assessmentId);
    const workspaceId = Number(quizDetails?.workspaceId);
    if (!assessmentId || !workspaceId || generatingQuiz) return;

    setGeneratingQuiz(true);
    try {
      await generateQuizFromWorkspaceAssessment(assessmentId);
      showSuccess(t('workspace.quiz.result.generateFromAssessmentSuccess', 'Đã tạo quiz từ đánh giá AI thành công'));
      navigate(`/workspace/${workspaceId}/quiz`, { replace: true });
    } catch (err) {
      showError(err?.message || t('workspace.quiz.result.generateFromAssessmentFail', 'Tạo quiz từ đánh giá AI thất bại'));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col', fontClass)} style={quizFontStyle}>
      <QuizHeader onBack={handleBack} title={quizDetails?.title || t('workspace.quiz.result.title', 'Result')} showConfirm={false} />
      <div className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Score card */}
        {!reviewMode && (
          <div className={cn(
            'rounded-2xl p-8 mb-6 text-center border shadow-lg',
            passed == null
              ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 shadow-blue-900/10 dark:shadow-blue-900/30'
              : passed
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 shadow-emerald-900/10 dark:shadow-emerald-900/30'
              : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800 shadow-red-900/10 dark:shadow-red-900/30'
          )}>
            <div className="mb-4">
              {passed == null
                ? <BarChart3 className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400" />
                : passed
                ? <Trophy className="w-16 h-16 mx-auto text-emerald-500 dark:text-emerald-400" />
                : <XCircle className="w-16 h-16 mx-auto text-red-500 dark:text-red-400" />}
            </div>

            <h1 className={cn(
              'text-3xl font-bold mb-2',
              passed == null
                ? 'text-blue-700 dark:text-blue-300'
                : passed
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300',
            )}>
              {resultTitle}
            </h1>

            <p className="text-slate-600 dark:text-slate-300 mb-6">Attempt #{result.attemptId} • Quiz #{result.quizId}</p>

            {/* Score display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-6">
              {/* <ScoreStat label="Score" value={scoreValue} icon={BarChart3} /> */}
              <ScoreStat label={t('workspace.quiz.result.correct', 'Correct')} value={correctValue} icon={CheckCircle2} />
              <ScoreStat label={t('workspace.quiz.result.answered', 'Answered')} value={answeredValue} icon={Eye} />
              <ScoreStat label={t('workspace.quiz.result.time', 'Time')} value={formatDuration(timeTakenSeconds)} icon={Clock3} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-slate-500 dark:text-slate-400">
              {/* <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Status: {result.status || 'UNKNOWN'}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Mode: {result.isPracticeMode ? 'Practice' : 'Exam'}</span> */}
              {result.passScore != null && <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">{t('workspace.quiz.result.passScore', 'Pass Score')}: {result.passScore}</span>}
            </div>

            <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/70 bg-white/80 dark:bg-slate-800/40 p-5 mb-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
                  <Sparkles className="w-4 h-4" />
                  {t('workspace.quiz.result.aiAssessment', 'AI Assessment')}
                </h3>
                <Button variant="outline" size="sm" onClick={fetchAssessment} disabled={assessmentLoading} className="gap-2">
                  <RefreshCw className={cn('w-4 h-4', assessmentLoading && 'animate-spin')} />
                  {t('workspace.quiz.result.refreshAssessment', 'Refresh')}
                </Button>
              </div>

              {(assessmentLoading && !assessmentData) && (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('workspace.quiz.result.assessmentLoading', 'Đang tải đánh giá AI...')}</div>
              )}

              {assessmentStatus === 'NOT_AVAILABLE' && !assessmentLoading && (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('workspace.quiz.result.assessmentNotAvailable', 'Hiện chưa có đánh giá AI cho lần làm bài này.')}</div>
              )}

              {assessmentStatus === 'PROCESSING' && (
                <div className="text-sm text-amber-600 dark:text-amber-400">{t('workspace.quiz.result.assessmentProcessing', 'Đánh giá AI đang được xử lý. Trang sẽ tự cập nhật.')}</div>
              )}

              {assessmentStatus === 'READY' && assessmentData && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {aiSummary || t('workspace.quiz.result.assessmentNoSummary', 'Chưa có tóm tắt đánh giá AI.')}
                  </p>

                  {!!aiStrengths.length && (
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300 mb-1">{t('workspace.quiz.result.strengths', 'Điểm mạnh')}</p>
                      <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                        {aiStrengths.map((item, idx) => (
                          <li key={`strength-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!aiWeaknesses.length && (
                    <div>
                      <p className="font-medium text-rose-700 dark:text-rose-300 mb-1">{t('workspace.quiz.result.weaknesses', 'Điểm cần cải thiện')}</p>
                      <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-1">
                        {aiWeaknesses.map((item, idx) => (
                          <li key={`weakness-${idx}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!recurringMistakes.length && (
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100 mb-1">{t('workspace.quiz.result.recurringMistakes', 'Lỗi lặp lại')}</p>
                      <div className="space-y-2">
                        {recurringMistakes.map((mistake, idx) => (
                          <div key={`mistake-${idx}`} className="rounded-lg bg-slate-100/80 dark:bg-slate-700/40 p-3 text-sm">
                            <p className="font-medium text-slate-800 dark:text-slate-100">{mistake?.topic || t('workspace.quiz.result.unknownTopic', 'Chủ đề chưa rõ')}</p>
                            <p className="text-slate-600 dark:text-slate-300">{mistake?.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {nextQuizPlan && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{t('workspace.quiz.result.nextQuizPlan', 'Kế hoạch quiz tiếp theo')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{nextQuizPlan?.goal}</p>
                      {nextQuizPlan?.reason && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{nextQuizPlan.reason}</p>
                      )}
                    </div>
                  )}

                  {canGenerateRecommendedQuiz && (
                    <div className="pt-1">
                      <Button onClick={handleGenerateQuizFromAssessment} disabled={generatingQuiz || !quizDetails?.workspaceId} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                        {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                        {t('workspace.quiz.result.generateQuizFromAssessment', 'Tạo quiz dựa trên đánh giá AI')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {canTriggerKnowledgeAfterPreLearning && (
                <Button
                  onClick={handleGenerateKnowledgeAfterPreLearning}
                  disabled={generatingKnowledge || knowledgeGenerationTriggered}
                  className="min-w-[200px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {generatingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                  {knowledgeGenerationTriggered
                    ? t('workspace.quiz.result.generateKnowledgeDone', 'Đã tạo knowledge')
                    : t('workspace.quiz.result.generatingKnowledge', 'Đang tạo knowledge...')}
                </Button>
              )}
              <Button onClick={() => setReviewMode(true)} variant="outline" className="min-w-[160px] gap-2" disabled={reviewQuestions.length === 0}>
                <Eye className="w-4 h-4" /> {t('workspace.quiz.result.reviewAnswers', 'Review Answers')}
              </Button>
              <Button onClick={handleBack} className="min-w-[160px] gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                <ArrowLeft className="w-4 h-4" /> {t('workspace.quiz.result.backToQuiz', 'Back to Quiz')}
              </Button>
            </div>
          </div>
        )}

        {/* Review mode */}
        {reviewMode && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('workspace.quiz.result.reviewAnswersTitle', 'Review Answers')}</h2>
              <Button variant="outline" onClick={() => setReviewMode(false)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> {t('workspace.quiz.result.backToScore', 'Back to Score')}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
            <div className="space-y-4">
              {reviewQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((q, idx) => {
                const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                const isPending = String(q?.gradingStatus || '').toUpperCase() === 'PENDING';
                const isCorrect = q.isCorrect === true;
                return (
                <div key={q.id} className="relative" ref={el => { if (el) questionRefs.current[globalIdx] = el; }}>
                  {/* Correct/incorrect badge */}
                  <div className={cn(
                    'absolute -left-2 -top-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold',
                    isPending
                      ? 'bg-amber-500'
                      : (isCorrect ? 'bg-emerald-500' : 'bg-red-500')
                  )}>
                    {isPending ? '…' : (isCorrect ? '✓' : '✗')}
                  </div>
                  <QuestionCard
                    question={q}
                    questionNumber={globalIdx + 1}
                    totalQuestions={reviewQuestions.length}
                    answerValue={q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK' ? q.textAnswer : q.selectedAnswerIds}
                    showResult
                    showExplanation
                    disabled
                  />
                </div>
              );
            })}

              {reviewQuestions.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-6 p-4">
                  <Button variant="outline" disabled={currentPage === 1} onClick={() => { setCurrentPage((p) => p - 1); scrollToTop(); }}>{t('workspace.quiz.pagination.prev', 'Previous page')}</Button>
                  <span className="text-sm font-medium text-slate-500">{t('workspace.quiz.pagination.page', 'Page')} {currentPage} / {totalPages}</span>
                  <Button variant="outline" disabled={currentPage === totalPages} onClick={() => { setCurrentPage((p) => p + 1); scrollToTop(); }}>{t('workspace.quiz.pagination.next', 'Next page')}</Button>
                </div>
              )}

              {reviewQuestions.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {t('workspace.quiz.result.noReviewData', 'No detailed data available to review this attempt.')}
                </div>
              )}
            </div>

            {/* Right Sticky Nav */}
            <div className="hidden lg:block relative">
              <div className="sticky top-[96px] rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-blue-900/20">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t('workspace.quiz.result.questionList', 'Question list')}
                  </h3>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {reviewQuestions.length}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {t('workspace.quiz.result.correct', 'Correct')}: {reviewQuestions.filter((question) => question?.isCorrect === true).length}
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-300">
                    {t('workspace.quiz.result.wrong', 'Wrong')}: {reviewQuestions.filter((question) => question?.isCorrect === false).length}
                  </div>
                </div>

                <div className="grid max-h-[58vh] grid-cols-5 gap-2 overflow-y-auto pr-1 pb-1">
                  {navQuestions.map((q, idx) => {
                    const globalIdx = navStartIndex + idx;
                    const isPending = String(q?.gradingStatus || '').toUpperCase() === 'PENDING';
                    const isCorrect = q.isCorrect === true;
                    const inCurrentPage = globalIdx >= (currentPage - 1) * itemsPerPage && globalIdx < currentPage * itemsPerPage;
                    return (
                      <button
                        key={q.id}
                        onClick={() => jumpToQuestion(globalIdx)}
                        className={cn(
                          'h-9 w-9 rounded-lg border text-xs font-semibold transition-all duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900',
                          isPending
                            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-900/35'
                            : (isCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-900/35'
                              : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/25 dark:text-rose-300 dark:hover:bg-rose-900/35'),
                          inCurrentPage
                            ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                            : ''
                        )}
                      >
                        {globalIdx + 1}
                      </button>
                    );
                  })}
                </div>
                {reviewQuestions.length > itemsPerPage && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeNavPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        scrollToTop();
                      }}
                    >
                      {t('workspace.quiz.pagination.prev', 'Previous page')}
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t('workspace.quiz.pagination.page', 'Page')} {safeNavPage}/{totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeNavPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        scrollToTop();
                      }}
                    >
                      {t('workspace.quiz.pagination.next', 'Next page')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </div>

            <div className="flex justify-center mt-8 gap-3">
              <Button variant="outline" onClick={() => setReviewMode(false)} className="min-w-[160px]">{t('workspace.quiz.result.backToScore', 'Back to Score')}</Button>
              <Button onClick={handleBack} className="min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <ArrowLeft className="w-4 h-4" /> {t('workspace.quiz.result.backToQuiz', 'Back to Quiz')}
              </Button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

function ScoreStat({ label, value, icon: Icon }) {
  return (
    <div className="flex flex-col items-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl">
      {Icon && <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 mb-1" />}
      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getTimeTakenSeconds(startedAt, completedAt, timeoutAt) {
  if (!startedAt) return 0;

  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt || timeoutAt || startedAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  return Math.floor((end - start) / 1000);
}
