import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Eye, Trophy, XCircle, CheckCircle2, BarChart3, Clock3, Sparkles, RefreshCw, WandSparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import QuestionCard from './components/QuestionCard';
import QuizHeader from './components/QuizHeader';
import { getAttemptResult, getQuizFullForAttempt, getAttemptAssessment, generateQuizFromWorkspaceAssessment } from '@/api/QuizAPI';
import { useWebSocket } from '@/hooks/useWebSocket';
import { generateRoadmapPhaseContent } from '@/api/AIAPI';
import {
  getCurrentRoadmapPhaseProgress,
  submitRoadmapPhaseSkipDecision,
} from '@/api/RoadmapPhaseAPI';
import { normalizeQuizData } from './utils/quizTransform';
import { useToast } from '@/context/ToastContext';

const PRE_LEARNING_PHASE_CONTENT_TRIGGER_KEY = 'prelearning_phasecontent_triggered_attempts';
const RESULT_CONTEXT_STORAGE_KEY_PREFIX = 'quiz_result_context:';
const RESULT_BOOTSTRAP_MAX_RETRIES = 8;
const RESULT_BOOTSTRAP_RETRY_DELAY_MS = 1500;
const ASSESSMENT_NOT_AVAILABLE_POLL_LIMIT = 10;
const ASSESSMENT_NOT_AVAILABLE_POLL_INTERVAL_MS = 3000;
const RETRYABLE_RESULT_STATUS_CODES = new Set([404, 409, 425, 429, 500, 502, 503, 504]);

function isPendingQuestionGrading(question) {
  return String(question?.gradingStatus || '').toUpperCase() === 'PENDING';
}

function isFailedQuestionGrading(question) {
  return String(question?.gradingStatus || '').toUpperCase() === 'FAILED';
}

function hasResolvedQuestionResult(question) {
  return question?.isCorrect === true || question?.isCorrect === false;
}

function normalizePositiveInteger(value) {
  const normalizedValue = Number(value);
  return Number.isInteger(normalizedValue) && normalizedValue > 0 ? normalizedValue : null;
}

function readStoredResultContext(attemptId) {
  const normalizedAttemptId = normalizePositiveInteger(attemptId);
  if (!normalizedAttemptId || typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(`${RESULT_CONTEXT_STORAGE_KEY_PREFIX}${normalizedAttemptId}`);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch (error) {
    console.error('Không thể đọc result context đã lưu:', error);
    return {};
  }
}

function writeStoredResultContext(attemptId, context) {
  const normalizedAttemptId = normalizePositiveInteger(attemptId);
  if (!normalizedAttemptId || typeof window === 'undefined' || !context || typeof context !== 'object') {
    return;
  }

  const persistedContext = Object.fromEntries(
    Object.entries(context).filter(([, value]) => value != null && value !== ''),
  );

  try {
    if (Object.keys(persistedContext).length === 0) {
      window.sessionStorage.removeItem(`${RESULT_CONTEXT_STORAGE_KEY_PREFIX}${normalizedAttemptId}`);
      return;
    }

    window.sessionStorage.setItem(
      `${RESULT_CONTEXT_STORAGE_KEY_PREFIX}${normalizedAttemptId}`,
      JSON.stringify(persistedContext),
    );
  } catch (error) {
    console.error('Không thể lưu result context:', error);
  }
}

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

function getRequestStatusCode(error) {
  const normalizedStatusCode = Number(error?.statusCode ?? error?.response?.status);
  return Number.isInteger(normalizedStatusCode) ? normalizedStatusCode : null;
}

function isIncompleteAttemptResultError(error) {
  const statusCode = getRequestStatusCode(error);
  const normalizedMessage = String(error?.message || '').toLowerCase();
  return statusCode === 400 && normalizedMessage.includes('chua hoan thanh')
    || statusCode === 400 && normalizedMessage.includes('chưa hoàn thành')
    || statusCode === 400 && normalizedMessage.includes('not completed');
}

function canRetryBootstrapResult(error, retryCount) {
  if (retryCount >= RESULT_BOOTSTRAP_MAX_RETRIES) {
    return false;
  }

  if (isIncompleteAttemptResultError(error)) {
    return true;
  }

  const statusCode = getRequestStatusCode(error);
  return statusCode == null || RETRYABLE_RESULT_STATUS_CODES.has(statusCode);
}

function SectionDivider({ label, className = '' }) {
  return (
    <div className={cn('relative my-6', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200/80 dark:border-slate-700/80" />
      </div>
      <div className="relative flex justify-center">
        <span className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/85 dark:text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export default function QuizResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const quizFontStyle = { fontFamily: 'var(--quiz-display-font)' };
  const storedResultContext = useMemo(() => readStoredResultContext(attemptId), [attemptId]);
  const shouldStartInReviewMode = location.state?.openReviewMode === true
    || storedResultContext?.openReviewMode === true;

  const [result, setResult] = useState(null);
  const [quizDetails, setQuizDetails] = useState(null);
  const [quizRawDetails, setQuizRawDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reviewMode, setReviewMode] = useState(shouldStartInReviewMode);
  const [retryCount, setRetryCount] = useState(0);
  const [resultBootstrapError, setResultBootstrapError] = useState(null);
  const [resultReloadSeed, setResultReloadSeed] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentStatus, setAssessmentStatus] = useState('NOT_AVAILABLE');
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingKnowledge, setGeneratingKnowledge] = useState(false);
  const [loadingCurrentPhase, setLoadingCurrentPhase] = useState(false);
  const [currentPhaseProgress, setCurrentPhaseProgress] = useState(null);
  const [submittingSkipDecision, setSubmittingSkipDecision] = useState(false);
  const [knowledgeGenerationTriggered, setKnowledgeGenerationTriggered] = useState(false);
  const [knowledgeGenerationHydrated, setKnowledgeGenerationHydrated] = useState(false);
  const itemsPerPage = 20;
  const questionRefs = useRef({});
  const retryTimeoutRef = useRef(null);
  const pendingResultPollingRef = useRef(null);
  const assessmentNotAvailablePollingRef = useRef(null);
  const assessmentNotAvailablePollCountRef = useRef(0);
  const lastAttemptRefreshAtRef = useRef(0);
  const initialPendingJumpDoneRef = useRef(false);

  const isIncompleteAttemptError = useCallback((error) => {
    const statusCode = getRequestStatusCode(error);
    const errorMessage = String(error?.data?.message || error?.response?.data?.message || error?.message || '').toLowerCase();
    return statusCode === 400 && (errorMessage.includes('chưa hoàn thành') || errorMessage.includes('chua hoan thanh'));
  }, []);

  // quizId passed via navigation state for "back to quiz" button
  const quizId = normalizePositiveInteger(location.state?.quizId) ?? normalizePositiveInteger(storedResultContext?.quizId);
  const attemptMode = String(location.state?.attemptMode || storedResultContext?.attemptMode || '').toLowerCase();
  const returnToQuizPath = location.state?.returnToQuizPath || storedResultContext?.returnToQuizPath || null;
  const sourceView = String(location.state?.sourceView || storedResultContext?.sourceView || '').toLowerCase();
  const sourceWorkspaceId = normalizePositiveInteger(location.state?.sourceWorkspaceId)
    ?? normalizePositiveInteger(storedResultContext?.sourceWorkspaceId);
  const sourcePhaseId = normalizePositiveInteger(location.state?.sourcePhaseId)
    ?? normalizePositiveInteger(storedResultContext?.sourcePhaseId);
  const sourceRoadmapId = normalizePositiveInteger(location.state?.sourceRoadmapId)
    ?? normalizePositiveInteger(storedResultContext?.sourceRoadmapId)
    ?? normalizePositiveInteger(quizDetails?.roadmapId)
    ?? normalizePositiveInteger(result?.roadmapId)
    ?? normalizePositiveInteger(quizRawDetails?.roadmapId);
  const returnPathWorkspaceId = useMemo(() => {
    if (!returnToQuizPath) return null;
    const matched = returnToQuizPath.match(/\/workspace\/(\d+)/);
    if (!matched) return null;
    return normalizePositiveInteger(matched[1]);
  }, [returnToQuizPath]);

  const normalizedWorkspaceId = normalizePositiveInteger(
    sourceWorkspaceId
    ?? quizRawDetails?.workspaceId
    ?? quizRawDetails?.workspace?.workspaceId
    ?? quizDetails?.workspaceId
    ?? result?.workspaceId
    ?? returnPathWorkspaceId
  );

  const resolvedWorkspaceIdForBack = Number.isInteger(sourceWorkspaceId) && sourceWorkspaceId > 0
    ? sourceWorkspaceId
    : Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0
    ? normalizedWorkspaceId
    : returnPathWorkspaceId;

  const normalizedQuizIdForBack = normalizePositiveInteger(
    quizId
    ?? result?.quizId
    ?? quizRawDetails?.quizId
    ?? quizDetails?.quizId
  );
  const hasQuizIdForBack = Boolean(normalizedQuizIdForBack);

  useEffect(() => {
    writeStoredResultContext(attemptId, {
      quizId: hasQuizIdForBack ? normalizedQuizIdForBack : null,
      attemptMode: attemptMode || null,
      returnToQuizPath: returnToQuizPath || null,
      openReviewMode: reviewMode ? true : null,
      sourceView: sourceView || null,
      sourceWorkspaceId,
      sourcePhaseId,
      sourceRoadmapId,
    });
  }, [
    attemptId,
    attemptMode,
    hasQuizIdForBack,
    normalizedQuizIdForBack,
    reviewMode,
    returnToQuizPath,
    sourcePhaseId,
    sourceRoadmapId,
    sourceView,
    sourceWorkspaceId,
  ]);

  const directQuizDetailBackPath = Number.isInteger(resolvedWorkspaceIdForBack) && resolvedWorkspaceIdForBack > 0 && hasQuizIdForBack
    ? (sourceView === 'roadmap'
      ? (sourceRoadmapId && sourcePhaseId
        ? `/workspace/${resolvedWorkspaceIdForBack}/roadmap/${sourceRoadmapId}/phase/${sourcePhaseId}/quiz/${normalizedQuizIdForBack}`
        : `/workspace/${resolvedWorkspaceIdForBack}/roadmap/quiz/${normalizedQuizIdForBack}`)
      : `/workspace/${resolvedWorkspaceIdForBack}/quiz/${normalizedQuizIdForBack}`)
    : null;

  const canUseReturnPathAsQuizDetail = useMemo(() => {
    if (!returnToQuizPath) return false;
    return /\/workspace\/\d+\/(?:quiz(?:\/\d+)?|roadmap\/(?:\d+\/phase\/\d+\/)?quiz\/\d+)(?:\?|$)/.test(returnToQuizPath);
  }, [returnToQuizPath]);

  const resumeAttemptPath = useMemo(() => {
    if (!hasQuizIdForBack) return null;
    if (attemptMode !== 'exam' && attemptMode !== 'practice') return null;
    return `/quiz/${attemptMode}/${normalizedQuizIdForBack}`;
  }, [attemptMode, hasQuizIdForBack, normalizedQuizIdForBack]);

  const retryLoadResult = useCallback(() => {
    setResult(null);
    setQuizDetails(null);
    setQuizRawDetails(null);
    setRetryCount(0);
    setResultBootstrapError(null);
    setLoading(true);
    setResultReloadSeed((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let shouldRetry = false;
    // Reset dữ liệu cũ khi chuyển attempt để tránh polling theo state của attempt trước.
    setResult(null);
    setQuizDetails(null);
    setQuizRawDetails(null);
    setLoadError(null);
    lastAttemptRefreshAtRef.current = 0;
    initialPendingJumpDoneRef.current = false;
    setLoading(true);
    setResultBootstrapError(null);

    const loadResult = async () => {
      try {
        const res = await getAttemptResult(attemptId);
        if (cancelled) return;

        const attemptResult = res.data;
        setResult(attemptResult);
        setRetryCount(0);
        setResultBootstrapError(null);

        if (attemptResult?.quizId) {
          try {
            const quizRes = await getQuizFullForAttempt(attemptResult.quizId);
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
        const statusCode = getRequestStatusCode(err);
        const errorMessage = String(err?.response?.data?.message || err?.message || '');
        const isIncompleteAttempt = isIncompleteAttemptResultError(err);

        // Result có thể được BE ghi trễ hơn lúc FE điều hướng xong.
        if (canRetryBootstrapResult(err, retryCount)) {
          shouldRetry = true;
          setResultBootstrapError({
            statusCode,
            message: errorMessage,
            isRetrying: true,
          });
          retryTimeoutRef.current = globalThis.setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, RESULT_BOOTSTRAP_RETRY_DELAY_MS);
          return;
        }

        // Tất cả retries đã hết - lưu error để hiển thị
        if (cancelled) return;
        setLoadError({
          statusCode,
          message: errorMessage,
          isIncompleteAttempt,
        });
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
  }, [attemptId, retryCount, resultReloadSeed]);

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
    assessmentNotAvailablePollCountRef.current = 0;
    if (assessmentNotAvailablePollingRef.current) {
      globalThis.clearInterval(assessmentNotAvailablePollingRef.current);
      assessmentNotAvailablePollingRef.current = null;
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
        matchingPairs: attemptQuestion.matchingPairs || [],
        correctMatchingPairs: attemptQuestion.correctMatchingPairs || detailQuestion?.correctMatchingPairs || [],
        matchingRightOptions: detailQuestion?.matchingRightOptions || [],
        isCorrect: evaluatedCorrect,
        gradingStatus,
        questionScore: attemptQuestion.questionScore || 0,
      };
    });
  }, [result, quizDetails]);

  const pendingGradingCount = useMemo(() => {
    const pendingFromQuestions = reviewQuestions.filter(isPendingQuestionGrading).length;
    const fromResult = Number(result?.pendingGradingQuestionCount);
    if (Number.isInteger(fromResult) && fromResult >= 0) {
      return Math.max(fromResult, pendingFromQuestions);
    }
    return pendingFromQuestions;
  }, [result?.pendingGradingQuestionCount, reviewQuestions]);
  const reviewSummary = useMemo(() => {
    const summary = reviewQuestions.reduce((stats, question) => {
      if (question?.isCorrect === true) {
        stats.correct += 1;
      } else if (question?.isCorrect === false) {
        stats.wrong += 1;
      } else {
        stats.pending += 1;
      }

      return stats;
    }, {
      total: reviewQuestions.length,
      correct: 0,
      wrong: 0,
      pending: 0,
    });

    const unresolvedSlots = Math.max(reviewQuestions.length - summary.correct - summary.wrong, 0);
    return {
      ...summary,
      pending: Math.min(unresolvedSlots, Math.max(summary.pending, pendingGradingCount)),
    };
  }, [pendingGradingCount, reviewQuestions]);
  const isGradingPending = pendingGradingCount > 0;

  useEffect(() => {
    setReviewMode(shouldStartInReviewMode);
  }, [attemptId, shouldStartInReviewMode]);

  useEffect(() => {
    if (isGradingPending) {
      setReviewMode(true);
    }
  }, [isGradingPending]);

  useEffect(() => {
    if (!attemptId || !result || isGradingPending || assessmentStatus !== 'NOT_AVAILABLE') {
      return undefined;
    }

    assessmentNotAvailablePollCountRef.current = 0;
    assessmentNotAvailablePollingRef.current = globalThis.setInterval(() => {
      assessmentNotAvailablePollCountRef.current += 1;
      void fetchAssessment();

      if (assessmentNotAvailablePollCountRef.current >= ASSESSMENT_NOT_AVAILABLE_POLL_LIMIT
        && assessmentNotAvailablePollingRef.current) {
        globalThis.clearInterval(assessmentNotAvailablePollingRef.current);
        assessmentNotAvailablePollingRef.current = null;
      }
    }, ASSESSMENT_NOT_AVAILABLE_POLL_INTERVAL_MS);

    return () => {
      if (assessmentNotAvailablePollingRef.current) {
        globalThis.clearInterval(assessmentNotAvailablePollingRef.current);
        assessmentNotAvailablePollingRef.current = null;
      }
    };
  }, [assessmentStatus, attemptId, fetchAssessment, isGradingPending, result]);

  const jumpToQuestion = useCallback((questionIndex) => {
    const targetPage = Math.floor(questionIndex / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      window.setTimeout(() => {
        questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 30);
      return;
    }

    questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentPage, itemsPerPage]);

  const refreshAttemptResult = useCallback(async () => {
    if (!attemptId) return;

    const now = Date.now();
    // Chặn refresh dày đặc từ websocket + polling cùng lúc.
    if (now - lastAttemptRefreshAtRef.current < 1200) {
      return null;
    }
    lastAttemptRefreshAtRef.current = now;

    try {
      const res = await getAttemptResult(attemptId);
      const latestResult = res?.data || null;
      if (latestResult) {
        setResult(latestResult);
      }
      return latestResult;
    } catch (error) {
      if (!isIncompleteAttemptError(error)) {
        console.error('Failed to refresh attempt result from grading event:', error);
      }
    }
    return null;
  }, [attemptId, isIncompleteAttemptError]);

  const handleQuizAttemptGrading = useCallback((event) => {
    if (!event) return;
    const eventAttemptId = Number(event?.attemptId);
    if (!Number.isInteger(eventAttemptId) || eventAttemptId !== Number(attemptId)) return;

    const pendingCount = Number(event?.pendingGradingQuestionCount);
    const failedCount = Number(event?.failedGradingQuestionCount);
    const hasEventScore = event?.score != null && Number.isFinite(Number(event.score));
    const status = String(event?.status || '').toUpperCase();
    const updatedQuestionId = Number(event?.updatedQuestionId);
    const hasUpdatedQuestionId = Number.isInteger(updatedQuestionId);
    const hasUpdatedQuestionCorrect = typeof event?.updatedQuestionCorrect === 'boolean';
    const updatedQuestionGradingStatus = event?.updatedQuestionGradingStatus || null;
    const updatedQuestionGradingReason = typeof event?.updatedQuestionGradingReason === 'string'
      ? event.updatedQuestionGradingReason
      : null;
    let nextPendingQuestionIndex = null;

    setResult((previousResult) => {
      if (!previousResult) return previousResult;

      const previousQuestions = Array.isArray(previousResult.questions) ? previousResult.questions : [];
      const nextQuestions = previousQuestions.map((questionResult) => {
        if (!hasUpdatedQuestionId || Number(questionResult?.questionId) !== updatedQuestionId) {
          return questionResult;
        }

        return {
          ...questionResult,
          ...(updatedQuestionGradingStatus ? { gradingStatus: updatedQuestionGradingStatus } : {}),
          ...(hasUpdatedQuestionCorrect ? { correct: event.updatedQuestionCorrect } : {}),
          ...(updatedQuestionGradingReason ? { gradingReason: updatedQuestionGradingReason } : {}),
        };
      });

      if (hasUpdatedQuestionId && updatedQuestionGradingStatus && String(updatedQuestionGradingStatus).toUpperCase() !== 'PENDING') {
        const updatedQuestionIndex = nextQuestions.findIndex((questionResult) => Number(questionResult?.questionId) === updatedQuestionId);
        const nextForwardPendingIndex = nextQuestions.findIndex((questionResult, index) => index > updatedQuestionIndex && isPendingQuestionGrading(questionResult));
        const nextAnyPendingIndex = nextForwardPendingIndex >= 0
          ? nextForwardPendingIndex
          : nextQuestions.findIndex(isPendingQuestionGrading);
        nextPendingQuestionIndex = nextAnyPendingIndex >= 0 ? nextAnyPendingIndex : null;
      }

      const pendingFromQuestions = nextQuestions.filter(isPendingQuestionGrading).length;
      const failedFromQuestions = nextQuestions.filter(isFailedQuestionGrading).length;
      const correctFromQuestions = nextQuestions.filter((questionResult) => questionResult?.correct === true).length;

      return {
        ...previousResult,
        questions: nextQuestions,
        correctQuestion: correctFromQuestions,
        ...(Number.isInteger(pendingCount)
          ? { pendingGradingQuestionCount: Math.max(pendingCount, pendingFromQuestions) }
          : { pendingGradingQuestionCount: pendingFromQuestions }),
        ...(Number.isInteger(failedCount)
          ? { failedGradingQuestionCount: Math.max(failedCount, failedFromQuestions) }
          : { failedGradingQuestionCount: failedFromQuestions }),
        ...(hasEventScore ? { score: Number(event.score) } : {}),
      };
    });

    const isDone = event?.allGradingFinished === true
      || (Number.isInteger(pendingCount) && pendingCount <= 0)
      || status === 'COMPLETED'
      || status === 'COMPLETED_WITH_ERRORS';

    if (reviewMode && Number.isInteger(nextPendingQuestionIndex) && nextPendingQuestionIndex >= 0) {
      globalThis.setTimeout(() => {
        jumpToQuestion(nextPendingQuestionIndex);
      }, 0);
    }

    void refreshAttemptResult();

    if (isDone) {
      globalThis.setTimeout(() => {
        void refreshAttemptResult();
      }, 1500);
      void fetchAssessment();
    }
  }, [attemptId, fetchAssessment, jumpToQuestion, refreshAttemptResult, reviewMode]);

  const wsWorkspaceId = Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0
    ? normalizedWorkspaceId
    : undefined;

  const { isConnected: isQuizGradingSocketConnected } = useWebSocket({
    workspaceId: wsWorkspaceId,
    enabled: Boolean(attemptId) && isGradingPending,
    onQuizAttemptGrading: handleQuizAttemptGrading,
  });

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

  const handleResumeAttempt = useCallback(() => {
    if (!resumeAttemptPath) {
      handleBack();
      return;
    }

    navigate(resumeAttemptPath, {
      replace: true,
      state: {
        autoStart: true,
        quizId: normalizedQuizIdForBack,
        returnToQuizPath,
        sourceView,
        sourceWorkspaceId,
        sourcePhaseId,
      },
    });
  }, [
    handleBack,
    navigate,
    normalizedQuizIdForBack,
    resumeAttemptPath,
    returnToQuizPath,
    sourcePhaseId,
    sourceView,
    sourceWorkspaceId,
  ]);

  const canTriggerKnowledgeAfterPreLearning = preLearningGenerationContext.isPreLearningQuiz
    && preLearningGenerationContext.isCompletedAttempt
    && preLearningGenerationContext.isValidRoadmapContext;

  const isAssessmentReady = assessmentStatus === 'READY' && Boolean(assessmentData);

  const fetchCurrentRoadmapPhase = useCallback(async () => {
    if (!canTriggerKnowledgeAfterPreLearning || !isAssessmentReady) return null;

    setLoadingCurrentPhase(true);
    try {
      const response = await getCurrentRoadmapPhaseProgress(preLearningGenerationContext.roadmapId);
      const payload = response?.data?.data || response?.data || null;
      setCurrentPhaseProgress(payload);
      return payload;
    } catch (error) {
      console.error('Failed to load current roadmap phase progress:', error);
      setCurrentPhaseProgress(null);
      return null;
    } finally {
      setLoadingCurrentPhase(false);
    }
  }, [canTriggerKnowledgeAfterPreLearning, isAssessmentReady, preLearningGenerationContext.roadmapId]);

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
      const normalizedWorkspaceId = Number(workspaceId);
const normalizedPhaseId = Number(phaseId);
if (
Number.isInteger(normalizedWorkspaceId)
&& normalizedWorkspaceId > 0
&& Number.isInteger(normalizedPhaseId)
&& normalizedPhaseId > 0
) {
navigate(`/workspace/${normalizedWorkspaceId}/roadmap?phaseId=${normalizedPhaseId}`, { replace: true });
return;
}

handleBack();

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
    navigate,
handleBack,
    showError,
    showSuccess,
    t,
  ]);

  useEffect(() => {
    if (!knowledgeGenerationHydrated) return;
    if (!canTriggerKnowledgeAfterPreLearning) return;
    if (!isAssessmentReady) return;

    void fetchCurrentRoadmapPhase();
  }, [
    canTriggerKnowledgeAfterPreLearning,
    fetchCurrentRoadmapPhase,
    isAssessmentReady,
    knowledgeGenerationHydrated,
  ]);

  const canShowSkipDecision = canTriggerKnowledgeAfterPreLearning
    && isAssessmentReady
    && currentPhaseProgress?.skipable === true
    && !knowledgeGenerationTriggered;

  const handleSkipDecision = useCallback(async (skipped) => {
    if (!canTriggerKnowledgeAfterPreLearning || submittingSkipDecision) return;

    const phaseId = Number(currentPhaseProgress?.phaseId ?? preLearningGenerationContext.phaseId);
    if (!Number.isInteger(phaseId) || phaseId <= 0) {
      showError(t('workspace.quiz.result.skipDecisionMissingPhase', 'Không xác định được phase để cập nhật quyết định.'));
      return;
    }

    setSubmittingSkipDecision(true);
    try {
      await submitRoadmapPhaseSkipDecision(phaseId, skipped);

      if (skipped) {
        showSuccess(t('workspace.quiz.result.skipPhaseSuccess', 'Đã bỏ qua phase hiện tại.')); 
        const latestCurrent = await fetchCurrentRoadmapPhase();
        const nextPhaseId = Number(latestCurrent?.phaseId);
        const workspaceId = Number(preLearningGenerationContext.workspaceId);

        if (Number.isInteger(workspaceId) && workspaceId > 0 && Number.isInteger(nextPhaseId) && nextPhaseId > 0) {
          navigate(`/workspace/${workspaceId}/roadmap?phaseId=${nextPhaseId}`, { replace: true });
          return;
        }

        handleBack();
        return;
      }

      await handleGenerateKnowledgeAfterPreLearning();
    } catch (error) {
      console.error('Failed to submit skip decision:', error);
      showError(error?.message || t('workspace.quiz.result.skipPhaseFail', 'Không thể cập nhật quyết định skip phase.'));
    } finally {
      setSubmittingSkipDecision(false);
    }
  }, [
    canTriggerKnowledgeAfterPreLearning,
    submittingSkipDecision,
    currentPhaseProgress?.phaseId,
    preLearningGenerationContext.phaseId,
    preLearningGenerationContext.workspaceId,
    showError,
    t,
    showSuccess,
    fetchCurrentRoadmapPhase,
    navigate,
    handleBack,
    handleGenerateKnowledgeAfterPreLearning,
  ]);

  useEffect(() => {
    if (!attemptId) return undefined;
    if (!result) return undefined;
    if (pendingGradingCount <= 0) return undefined;

    let cancelled = false;
    const pollingIntervalMs = isQuizGradingSocketConnected ? 8000 : 2500;
    pendingResultPollingRef.current = globalThis.setInterval(async () => {
      try {
        const latestResult = await refreshAttemptResult();
        if (cancelled) return;
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
    }, pollingIntervalMs);

    return () => {
      cancelled = true;
      if (pendingResultPollingRef.current) {
        globalThis.clearInterval(pendingResultPollingRef.current);
        pendingResultPollingRef.current = null;
      }
    };
  }, [attemptId, pendingGradingCount, result, refreshAttemptResult, isQuizGradingSocketConnected]);

  useEffect(() => {
    if (!reviewMode || !isGradingPending || reviewQuestions.length === 0 || initialPendingJumpDoneRef.current) {
      return;
    }

    const firstPendingQuestionIndex = reviewQuestions.findIndex(isPendingQuestionGrading);
    if (firstPendingQuestionIndex < 0) {
      return;
    }

    initialPendingJumpDoneRef.current = true;
    globalThis.setTimeout(() => {
      jumpToQuestion(firstPendingQuestionIndex);
    }, 0);
  }, [isGradingPending, jumpToQuestion, reviewMode, reviewQuestions]);

  if (loading) {
    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {retryCount > 0
              ? t('workspace.quiz.result.waitingForResult', 'Đang chờ hệ thống trả kết quả bài làm...')
              : t('workspace.quiz.result.loading', 'Đang tải kết quả...')}
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    const activeResultError = loadError ?? resultBootstrapError;
    const isIncompleteAttempt = Boolean(activeResultError?.isIncompleteAttempt)
      || isIncompleteAttemptResultError(activeResultError);
    const resultErrorMessage = isIncompleteAttempt
      ? t('workspace.quiz.result.incompleteAttempt', 'Lượt làm quiz này chưa hoàn thành. Hãy quay lại để tiếp tục làm bài hoặc nộp bài trước khi xem kết quả.')
      : activeResultError?.statusCode === 404 || activeResultError?.statusCode === 409
      ? t('workspace.quiz.result.pendingOrMissing', 'Kết quả bài làm này chưa sẵn sàng hoặc không còn tồn tại.')
      : t('workspace.quiz.result.unavailable', 'Hiện chưa lấy được kết quả bài làm này. Vui lòng thử lại.');

    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 text-center">
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-100">
            {t('workspace.quiz.result.notFound', 'Không tìm thấy kết quả')}
          </h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {resultErrorMessage}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isIncompleteAttempt && resumeAttemptPath && (
              <Button type="button" onClick={handleResumeAttempt} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <ArrowLeft className="h-4 w-4" />
                {t('workspace.quiz.result.resumeAttempt', 'Tiếp tục làm bài')}
              </Button>
            )}
            <Button type="button" onClick={retryLoadResult} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <RefreshCw className="h-4 w-4" />
              {t('workspace.quiz.result.retryLoad', 'Thử lại')}
            </Button>
            <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('workspace.quiz.result.backToQuiz', 'Back to Quiz')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestion = Number(result.totalQuestion ?? reviewQuestions.length ?? 0);
  const correctQuestion = reviewQuestions.length > 0
    ? reviewQuestions.filter((question) => question?.isCorrect === true).length
    : Number(result.correctQuestion ?? 0);
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
  const gradingProgressText = t('workspace.quiz.result.gradingProgress', 'Đang chấm: {{pending}}/{{total}}', {
    pending: pendingGradingCount,
    total: totalQuestion,
  });
  const timeTakenSeconds = getTimeTakenSeconds(result.startedAt, result.completedAt, result.timeoutAt);
  const totalPages = Math.max(1, Math.ceil(reviewQuestions.length / itemsPerPage));
  const safeNavPage = Math.min(currentPage, totalPages);
  const navStartIndex = (safeNavPage - 1) * itemsPerPage;
  const navQuestions = reviewQuestions.slice(navStartIndex, navStartIndex + itemsPerPage);
  const resolvedPassed = isGradingPending ? null : passed;
  const resultTitle = isGradingPending
    ? t('workspace.quiz.result.gradingTitle', 'AI đang chấm điểm')
    : resolvedPassed == null
      ? t('workspace.quiz.result.quizCompleted', 'Quiz Completed')
      : resolvedPassed
        ? t('workspace.quiz.result.congratulations', 'Congratulations!')
        : t('workspace.quiz.result.keepTrying', 'Keep Trying!');
  const aiSummary = assessmentData?.summary;
  const nextQuizPlan = assessmentData?.nextQuizPlan;
  const profileReadiness = assessmentData?.profileReadiness || null;
  const learnerExplanation = assessmentData?.learnerExplanation || null;
  const shortTermGoals = Array.isArray(assessmentData?.shortTermGoals) ? assessmentData.shortTermGoals : [];
  const communityQuizSuggestions = Array.isArray(assessmentData?.communityQuizSuggestions)
    ? assessmentData.communityQuizSuggestions.slice(0, 2)
    : [];
  const recommendedQuizTitle = nextQuizPlan?.displayTitle
    || shortTermGoals[0]?.title
    || null;
  const recommendedQuizGoal = nextQuizPlan?.goal
    || learnerExplanation?.whatToStudyNext
    || shortTermGoals[0]?.detail
    || null;
  const communitySuggestionText = communityQuizSuggestions
    .map((quiz) => quiz?.title)
    .filter(Boolean)
    .join(', ');
  const recommendationFootnote = profileReadiness?.remainingQuizCount > 0
    ? t('workspace.quiz.result.profileResultPending', 'Hệ thống sẽ gợi ý chính xác hơn sau thêm vài bài quiz nữa.')
    : '';
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
      <QuizHeader
        onBack={reviewMode ? () => setReviewMode(false) : handleBack}
        title={quizDetails?.title || t('workspace.quiz.result.title', 'Result')}
        showConfirm={false}
      />
      <div className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Score card */}
        {!reviewMode && (
          <div className={cn(
            'rounded-2xl p-8 mb-6 text-center border-2 shadow-xl',
            passed == null
              ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 shadow-blue-900/10 dark:shadow-blue-900/30'
              : resolvedPassed
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 shadow-emerald-900/10 dark:shadow-emerald-900/30'
              : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800 shadow-red-900/10 dark:shadow-red-900/30'
          )}>
            <div className="mb-4">
              {isGradingPending
                ? <Loader2 className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400 animate-spin" />
                : resolvedPassed == null
                ? <BarChart3 className="w-16 h-16 mx-auto text-blue-500 dark:text-blue-400" />
                : resolvedPassed
                ? <Trophy className="w-16 h-16 mx-auto text-emerald-500 dark:text-emerald-400" />
                : <XCircle className="w-16 h-16 mx-auto text-red-500 dark:text-red-400" />}
            </div>

            <h1 className={cn(
              'text-3xl font-bold mb-2',
              resolvedPassed == null
                ? 'text-blue-700 dark:text-blue-300'
                : resolvedPassed
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300',
            )}>
              {resultTitle}
            </h1>

            <div className="mx-auto mb-6 max-w-4xl rounded-2xl border border-white/70 bg-white/45 p-4 shadow-inner shadow-white/60 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/25 dark:shadow-slate-950/20">
              {/* Score display */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                {/* <ScoreStat label="Score" value={scoreValue} icon={BarChart3} /> */}
                <ScoreStat label={t('workspace.quiz.result.correct', 'Correct')} value={correctValue} icon={CheckCircle2} />
                <ScoreStat label={t('workspace.quiz.result.answered', 'Answered')} value={answeredValue} icon={Eye} />
                <ScoreStat label={t('workspace.quiz.result.time', 'Time')} value={formatDuration(timeTakenSeconds)} icon={Clock3} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {/* <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Status: {result.status || 'UNKNOWN'}</span>
                <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Mode: {result.isPracticeMode ? 'Practice' : 'Exam'}</span> */}
                {result.passScore != null && <span className="rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 font-medium text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">{t('workspace.quiz.result.passScore', 'Pass Score')}: {result.passScore}</span>}
              </div>
            </div>

            <SectionDivider label={t('workspace.quiz.result.assessmentSection', 'Nhận xét của Quizmate AI')} />

            <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/70 bg-white/80 dark:bg-slate-800/40 p-5 mb-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
                  <Sparkles className="w-4 h-4" />
                  {t('workspace.quiz.result.aiAssessment', 'Đánh giá của AI')}
                </h3>
                <Button variant="outline" size="sm" onClick={fetchAssessment} disabled={assessmentLoading} className="gap-2">
                  <RefreshCw className={cn('w-4 h-4', assessmentLoading && 'animate-spin')} />
                  {t('workspace.quiz.result.refreshAssessment', 'Refresh')}
                </Button>
              </div>

              {(assessmentLoading && !assessmentData) && (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('workspace.quiz.result.assessmentLoading', 'Đang tải đánh giá AI...')}</div>
              )}

              {!assessmentLoading && assessmentStatus === 'NOT_AVAILABLE' && (
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300">
                  {assessmentData?.message || t('workspace.quiz.result.assessmentUnavailable', 'Chưa có đánh giá AI cho lượt làm này. Hoàn thành thêm bài quiz để nhận gợi ý tiếp theo.')}
                </div>
              )}

              {assessmentStatus === 'PROCESSING' && (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-300">
                  {t('workspace.quiz.result.assessmentProcessing', 'Đánh giá AI đang được xử lý. Trang sẽ tự cập nhật.')}
                </div>
              )}

              {assessmentStatus === 'FAILED' && (
                <div className="rounded-lg border border-rose-200/80 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/20 dark:text-rose-300">
                  {assessmentData?.message || t('workspace.quiz.result.assessmentFailed', 'Đánh giá AI chưa thể hoàn tất. Hãy thử refresh lại sau khi hệ thống xử lý xong grading.')}
                </div>
              )}

                {assessmentStatus === 'READY' && assessmentData && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {aiSummary || t('workspace.quiz.result.assessmentNoSummary', 'Chưa có tóm tắt đánh giá AI.')}
                    </p>

                    {(recommendedQuizTitle || recommendedQuizGoal || communitySuggestionText || recommendationFootnote) && (
                      <div className="rounded-xl border border-violet-200/80 bg-violet-50/70 p-4 dark:border-violet-800/70 dark:bg-violet-950/20">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
                          {t('workspace.quiz.result.nextResultSummary', 'Đề xuất tiếp theo')}
                        </p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {recommendedQuizTitle && (
                            <p>
                              <span className="font-semibold text-violet-700 dark:text-violet-300">
                                {t('workspace.quiz.result.recommendedQuizTitle', 'Quiz nên làm tiếp')}:
                              </span>{' '}
                              {recommendedQuizTitle}
                            </p>
                          )}
                          {recommendedQuizGoal && (
                            <p>
                              <span className="font-semibold text-violet-700 dark:text-violet-300">
                                {t('workspace.quiz.result.recommendedQuizGoal', 'Mục tiêu')}:
                              </span>{' '}
                              {recommendedQuizGoal}
                            </p>
                          )}
                          {communitySuggestionText && (
                            <p>
                              <span className="font-semibold text-violet-700 dark:text-violet-300">
                                {t('workspace.quiz.result.communitySuggestionTitle', 'Quiz cộng đồng phù hợp')}:
                              </span>{' '}
                              {communitySuggestionText}
                            </p>
                          )}
                          {recommendationFootnote && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {recommendationFootnote}
                            </p>
                          )}
                        </div>
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

            {canTriggerKnowledgeAfterPreLearning && isAssessmentReady && (
              <div className="rounded-xl border border-blue-200/80 dark:border-blue-700/70 bg-blue-50/70 dark:bg-blue-900/20 p-4 mb-6 text-left space-y-3">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {t('workspace.quiz.result.preLearningDecisionTitle', 'Quyết định sau Pre-learning')}
                </p>

                {loadingCurrentPhase && (
                  <p className="text-sm text-blue-700/90 dark:text-blue-300/90">
                    {t('workspace.quiz.result.loadingCurrentPhase', 'Đang kiểm tra phase hiện tại...')}
                  </p>
                )}

                {!loadingCurrentPhase && canShowSkipDecision && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {t('workspace.quiz.result.skipPhaseEligibleHint', 'Bạn đã đủ điều kiện để bỏ qua giai đoạn này. Bạn muốn bỏ qua hay tiếp tục luyện tập?')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        disabled={submittingSkipDecision || generatingKnowledge}
                        onClick={() => void handleSkipDecision(true)}
                        className="min-w-[180px] gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {(submittingSkipDecision && !generatingKnowledge)
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />}
                        {t('workspace.quiz.result.skipPhaseAction', 'Bỏ qua phase')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submittingSkipDecision || generatingKnowledge || knowledgeGenerationTriggered}
                        onClick={() => void handleSkipDecision(false)}
                        className="min-w-[220px] gap-2"
                      >
                        {(generatingKnowledge || submittingSkipDecision)
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <WandSparkles className="w-4 h-4" />}
                        {knowledgeGenerationTriggered
                          ? t('workspace.quiz.result.generateKnowledgeDone', 'Đã tạo knowledge')
                          : t('workspace.quiz.result.continuePracticeAction', 'Tiếp tục luyện tập')}
                      </Button>
                    </div>
                  </div>
                )}

                {!loadingCurrentPhase && preLearningGenerationContext.isPreLearningQuiz && !canShowSkipDecision && (
                  <Button
                    type="button"
                    onClick={handleGenerateKnowledgeAfterPreLearning}
                    disabled={generatingKnowledge || knowledgeGenerationTriggered || submittingSkipDecision}
                    className="min-w-[220px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {generatingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    {knowledgeGenerationTriggered
                      ? t('workspace.quiz.result.generateKnowledgeDone', 'Đã tạo knowledge')
                      : t('workspace.quiz.result.generateKnowledgeAction', 'Tạo knowledge luyện tập')}
                  </Button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <SectionDivider />
            <div className="flex items-center justify-center">
              <Button onClick={() => setReviewMode(true)} variant="outline" className="min-w-[180px] gap-2" disabled={reviewQuestions.length === 0}>
                <Eye className="w-4 h-4" /> {t('workspace.quiz.result.reviewAnswers', 'Review Answers')}
              </Button>
            </div>
          </div>
        )}

        {/* Review mode */}
        {reviewMode && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('workspace.quiz.result.reviewAnswersTitle', 'Review Answers')}</h2>
            </div>

            {isGradingPending && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-800/70 dark:bg-blue-950/20 dark:text-blue-300">
                {gradingProgressText}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_272px] xl:grid-cols-[minmax(0,1fr)_288px]">
              <div className="space-y-4">
                {reviewQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((q, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                  return (
                    <div key={q.id} className="relative scroll-mt-24" ref={(el) => { if (el) questionRefs.current[globalIdx] = el; }}>
                      <QuestionCard
                        question={q}
                        questionNumber={globalIdx + 1}
                        totalQuestions={reviewQuestions.length}
                        showHeaderMeta={false}
                        answerValue={
                          q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK'
                            ? q.textAnswer
                            : q.type === 'MATCHING'
                              ? { matchingPairs: q.matchingPairs }
                              : q.selectedAnswerIds
                        }
                        showResult
                        showExplanation
                        disabled
                      />
                    </div>
                  );
                })}

                {reviewQuestions.length > itemsPerPage && (
                  <div className="mt-6 flex items-center justify-between p-4">
                    <Button variant="outline" disabled={currentPage === 1} onClick={() => { setCurrentPage((p) => p - 1); scrollToTop(); }}>
                      {t('workspace.quiz.pagination.prev', 'Previous page')}
                    </Button>
                    <span className="text-sm font-medium text-slate-500">
                      {t('workspace.quiz.pagination.page', 'Page')} {currentPage} / {totalPages}
                    </span>
                    <Button variant="outline" disabled={currentPage === totalPages} onClick={() => { setCurrentPage((p) => p + 1); scrollToTop(); }}>
                      {t('workspace.quiz.pagination.next', 'Next page')}
                    </Button>
                  </div>
                )}

                {reviewQuestions.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {t('workspace.quiz.result.noReviewData', 'No detailed data available to review this attempt.')}
                  </div>
                )}
              </div>

              {/* Right Sticky Nav */}
              <div className="relative hidden lg:block">
                <div className="sticky top-[96px] rounded-[26px] border border-slate-200/80 bg-white/95 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-blue-950/10 xl:p-4">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_40%)]" />
                  <div className="relative">
                    <div className="mb-3 flex items-start justify-between gap-2.5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                          {t('workspace.quiz.result.reviewAnswersTitle', 'Review Answers')}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                          {t('workspace.quiz.result.questionList', 'Question list')}
                        </h3>
                        <p className="max-w-[150px] text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                          {t('workspace.quiz.result.questionListHint', 'Click a number to jump straight to that question.')}
                        </p>
                      </div>
                      <div className="min-w-[62px] rounded-[20px] border border-slate-200/80 bg-white/80 px-2.5 py-2 text-right shadow-sm dark:border-slate-700/80 dark:bg-slate-950/60">
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {t('workspace.quiz.result.total', 'Total')}
                        </p>
                        <p className="text-[26px] font-bold leading-none text-slate-900 dark:text-slate-50">
                          {reviewSummary.total}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2 text-left">
                      <div className="min-h-[82px] rounded-[20px] border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
                        <div className="mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                            {t('workspace.quiz.result.correct', 'Correct')}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-200">{reviewSummary.correct}</p>
                      </div>
                      <div className="min-h-[82px] rounded-[20px] border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 shadow-sm dark:border-rose-800/60 dark:bg-rose-950/30">
                        <div className="mb-1 flex items-center gap-2 text-rose-700 dark:text-rose-300">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                            {t('workspace.quiz.result.wrong', 'Wrong')}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-200">{reviewSummary.wrong}</p>
                      </div>
                      {reviewSummary.pending > 0 && (
                        <div className="col-span-2 rounded-[20px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30">
                          <div className="mb-1 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                              {t('workspace.quiz.result.pending', 'Pending')}
                            </span>
                          </div>
                          <p className="text-base font-bold text-amber-700 dark:text-amber-200">{reviewSummary.pending}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {t('workspace.quiz.result.questionList', 'Question list')}
                        </span>
                        {totalPages > 1 && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                            {t('workspace.quiz.pagination.page', 'Page')} {safeNavPage}/{totalPages}
                          </span>
                        )}
                      </div>

                      <div className="grid max-h-[48vh] grid-cols-5 gap-1.5 overflow-y-auto pr-0.5">
                        {navQuestions.map((q, idx) => {
                          const globalIdx = navStartIndex + idx;
                          const isPending = isPendingQuestionGrading(q) || !hasResolvedQuestionResult(q);
                          const isCorrect = q.isCorrect === true;
                          const inCurrentPage = globalIdx >= (currentPage - 1) * itemsPerPage && globalIdx < currentPage * itemsPerPage;

                          return (
                            <button
                              key={q.id}
                              onClick={() => jumpToQuestion(globalIdx)}
                              className={cn(
                                'relative aspect-square w-full rounded-[14px] border text-[12px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
                                isPending
                                  ? 'border-amber-300/90 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-900/35'
                                  : isCorrect
                                    ? 'border-emerald-300/90 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-900/35'
                                    : 'border-rose-300/90 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/25 dark:text-rose-300 dark:hover:bg-rose-900/35',
                                inCurrentPage
                                  ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900'
                                  : ''
                              )}
                            >
                              <span className="relative z-10 leading-none">{globalIdx + 1}</span>
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
              </div>
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
    <div className="flex flex-col items-center rounded-2xl border-2 border-slate-300/95 bg-white p-5 shadow-md shadow-slate-900/5 dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-slate-950/20">
      {Icon && (
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4.5 w-4.5" />
        </div>
      )}
      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
      <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
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
