import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, Eye, Trophy, XCircle, CheckCircle2, BarChart3, Clock3, Sparkles, RefreshCw, WandSparkles, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import DirectFeedbackButton from '@/Components/feedback/DirectFeedbackButton';
import QuestionCard from './components/QuestionCard';
import QuizHeader from './components/QuizHeader';
import CommunityQuizFeedbackDialog from '@/Pages/Users/Quiz/components/CommunityQuizFeedbackDialog';
import { getAttemptResult, getQuizFullForAttempt, getAttemptAssessment, refreshAttemptAssessment } from '@/api/QuizAPI';
import { useWebSocket } from '@/hooks/useWebSocket';
import { generateRoadmapPhaseContent } from '@/api/AIAPI';
import {
  getCurrentRoadmapPhaseProgress,
  submitRoadmapPhaseSkipDecision,
} from '@/api/RoadmapPhaseAPI';
import { buildQuestionSectionPathMap, collectAllSectionKeys, countSectionQuestions, getSectionChildren, getSectionKey, getSectionSharedContext, getSectionTitle, isQuestionGroupSection, normalizeQuizData, normalizeVisibleSectionGroups } from './utils/quizTransform';
import { MockTestReviewExtensions } from '@/Pages/Users/MockTest/components/MockTestReviewExtensions';
import { useToast } from '@/context/ToastContext';
import MixedMathText from '@/Components/math/MixedMathText';
import {
  buildGroupWorkspaceSectionPath,
  buildQuizAttemptPath,
  buildWorkspaceQuizPath,
  buildWorkspaceRoadmapQuizPath,
  buildWorkspaceRoadmapsPath,
  extractWorkspaceIdFromPath,
  isGroupWorkspacePath,
  isWorkspaceQuizDetailPath,
  isWorkspaceMockTestDetailPath,
} from '@/lib/routePaths';

const PRE_LEARNING_PHASE_CONTENT_TRIGGER_KEY = 'prelearning_phasecontent_triggered_attempts';
const RESULT_CONTEXT_STORAGE_KEY_PREFIX = 'quiz_result_context:';
const RESULT_BOOTSTRAP_MAX_RETRIES = 8;
const RESULT_BOOTSTRAP_RETRY_DELAY_MS = 1500;
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

function extractKnowledgeIdFromPath(path) {
  if (!path) return null;

  const match = String(path).match(/\/knowledges\/(\d+)/);
  if (!match) return null;

  return normalizePositiveInteger(match[1]);
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
  const [generatingKnowledge, setGeneratingKnowledge] = useState(false);
  const [loadingCurrentPhase, setLoadingCurrentPhase] = useState(false);
  const [currentPhaseProgress, setCurrentPhaseProgress] = useState(null);
  const [submittingSkipDecision, setSubmittingSkipDecision] = useState(false);
  const [knowledgeGenerationTriggered, setKnowledgeGenerationTriggered] = useState(false);
  const [knowledgeGenerationHydrated, setKnowledgeGenerationHydrated] = useState(false);
  const [expandedReviewSections, setExpandedReviewSections] = useState({});
  const [communityFeedbackOpen, setCommunityFeedbackOpen] = useState(false);
  const itemsPerPage = 20;
  const questionRefs = useRef({});
  const retryTimeoutRef = useRef(null);
  const pendingResultPollingRef = useRef(null);
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
  const challengeContext = location.state?.challengeContext || storedResultContext?.challengeContext || null;
  const sourceWorkspaceId = normalizePositiveInteger(location.state?.sourceWorkspaceId)
    ?? normalizePositiveInteger(storedResultContext?.sourceWorkspaceId);
  const sourcePhaseId = normalizePositiveInteger(location.state?.sourcePhaseId)
    ?? normalizePositiveInteger(storedResultContext?.sourcePhaseId);
  const sourceKnowledgeId = normalizePositiveInteger(location.state?.sourceKnowledgeId)
    ?? normalizePositiveInteger(storedResultContext?.sourceKnowledgeId)
    ?? normalizePositiveInteger(quizDetails?.knowledgeId)
    ?? normalizePositiveInteger(result?.knowledgeId)
    ?? normalizePositiveInteger(quizRawDetails?.knowledgeId)
    ?? extractKnowledgeIdFromPath(returnToQuizPath);
  const sourceRoadmapId = normalizePositiveInteger(location.state?.sourceRoadmapId)
    ?? normalizePositiveInteger(storedResultContext?.sourceRoadmapId)
    ?? normalizePositiveInteger(quizDetails?.roadmapId)
    ?? normalizePositiveInteger(result?.roadmapId)
    ?? normalizePositiveInteger(quizRawDetails?.roadmapId);
  const returnPathWorkspaceId = useMemo(() => {
    return extractWorkspaceIdFromPath(returnToQuizPath);
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
  const communitySourceQuizId = normalizePositiveInteger(
    quizRawDetails?.communitySourceQuizId
    ?? result?.communitySourceQuizId
    ?? quizDetails?.communitySourceQuizId,
  );
  const canLeaveCommunityFeedback = Boolean(communitySourceQuizId && hasQuizIdForBack);

  useEffect(() => {
    writeStoredResultContext(attemptId, {
      quizId: hasQuizIdForBack ? normalizedQuizIdForBack : null,
      attemptMode: attemptMode || null,
      returnToQuizPath: returnToQuizPath || null,
      openReviewMode: reviewMode ? true : null,
      sourceView: sourceView || null,
      sourceWorkspaceId,
      sourcePhaseId,
      sourceKnowledgeId,
      sourceRoadmapId,
      challengeContext: challengeContext || null,
    });
  }, [
    attemptId,
    attemptMode,
    challengeContext,
    hasQuizIdForBack,
    normalizedQuizIdForBack,
    reviewMode,
    returnToQuizPath,
    sourceKnowledgeId,
    sourcePhaseId,
    sourceRoadmapId,
    sourceView,
    sourceWorkspaceId,
  ]);

  // When returnToQuizPath is already a group-workspace or mock-test path, skip constructing an
  // individual workspace path — canUseReturnPathAsQuizDetail + returnToQuizPath will handle it below.
  const directQuizDetailBackPath = Number.isInteger(resolvedWorkspaceIdForBack)
    && resolvedWorkspaceIdForBack > 0
    && hasQuizIdForBack
    && !isGroupWorkspacePath(returnToQuizPath)
    && !isWorkspaceMockTestDetailPath(returnToQuizPath)
    ? (sourceView === 'roadmap'
      ? buildWorkspaceRoadmapQuizPath(resolvedWorkspaceIdForBack, {
        roadmapId: sourceRoadmapId,
        phaseId: sourcePhaseId,
        knowledgeId: sourceKnowledgeId,
        quizId: normalizedQuizIdForBack,
      })
      : buildWorkspaceQuizPath(resolvedWorkspaceIdForBack, normalizedQuizIdForBack))
    : null;

  const canUseReturnPathAsQuizDetail = useMemo(() => {
    if (!returnToQuizPath) return false;
    return isWorkspaceQuizDetailPath(returnToQuizPath) || isGroupWorkspacePath(returnToQuizPath) || isWorkspaceMockTestDetailPath(returnToQuizPath);
  }, [returnToQuizPath]);

  const resumeAttemptPath = useMemo(() => {
    if (!hasQuizIdForBack) return null;
    if (attemptMode !== 'exam' && attemptMode !== 'practice') return null;
    return buildQuizAttemptPath(attemptMode, normalizedQuizIdForBack);
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

  const applyAssessmentPayload = useCallback((payload) => {
    setAssessmentStatus(payload?.status || 'NOT_AVAILABLE');
    setAssessmentData(payload || null);
  }, []);

  const fetchAssessment = useCallback(async () => {
    if (!attemptId) return;
    setAssessmentLoading(true);
    try {
      const res = await getAttemptAssessment(attemptId);
      applyAssessmentPayload(res?.data || null);
    } catch (err) {
      console.error('Failed to load assessment:', err);
      applyAssessmentPayload(null);
    } finally {
      setAssessmentLoading(false);
    }
  }, [applyAssessmentPayload, attemptId]);

  const handleRefreshAssessment = useCallback(async () => {
    if (!attemptId) return;
    if (assessmentStatus !== 'FAILED') {
      await fetchAssessment();
      return;
    }

    setAssessmentLoading(true);
    try {
      const res = await refreshAttemptAssessment(attemptId);
      applyAssessmentPayload(res?.data || null);
      showSuccess(t('quizResultPage.refreshAssessmentQueued', 'AI assessment refresh has started.'));
    } catch (err) {
      console.error('Failed to refresh assessment:', err);
      showError(t('quizResultPage.refreshAssessmentFail', 'Unable to refresh AI assessment right now.'));
      await fetchAssessment();
    } finally {
      setAssessmentLoading(false);
    }
  }, [applyAssessmentPayload, assessmentStatus, attemptId, fetchAssessment, showError, showSuccess, t]);

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
        content: detailQuestion?.content || t('quizResultPage.questionFallback', 'Question {{index}}', { index: index + 1 }),
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
        number: Number(detailQuestion?.number) || (index + 1),
      };
    });
  }, [result, quizDetails]);
  const reviewQuestionMap = useMemo(
    () => new Map(reviewQuestions.map((question) => [question.id, question])),
    [reviewQuestions],
  );
  const reviewSectionGroups = useMemo(() => {
    const mapReviewSection = (section) => {
      if (!section) return null;

      const mappedQuestions = (section.questions || [])
        .map((question) => reviewQuestionMap.get(question.id))
        .filter(Boolean);
      const mappedChildren = getSectionChildren(section)
        .map(mapReviewSection)
        .filter(Boolean);

      return {
        ...section,
        questions: mappedQuestions,
        children: mappedChildren,
      };
    };

    return (quizDetails?.sectionGroups || [])
      .map(mapReviewSection)
      .filter(Boolean);
  }, [quizDetails?.sectionGroups, reviewQuestionMap]);
  const reviewQuestionSectionPathMap = useMemo(
    () => buildQuestionSectionPathMap(reviewSectionGroups),
    [reviewSectionGroups],
  );

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
  const shouldShowAssessmentSection = assessmentLoading || assessmentStatus !== 'NOT_AVAILABLE';
  const isMockTestReviewLayout = String(quizRawDetails?.quizIntent || result?.quizIntent || quizDetails?.quizIntent || '').toUpperCase() === 'MOCK_TEST'
    && reviewSectionGroups.length > 0;

  useEffect(() => {
    if (!isMockTestReviewLayout) {
      setExpandedReviewSections({});
      return;
    }

    setExpandedReviewSections(
      Object.fromEntries(
        collectAllSectionKeys(reviewSectionGroups).map((sectionKey) => [sectionKey, true]),
      ),
    );
  }, [isMockTestReviewLayout, reviewSectionGroups]);

  useEffect(() => {
    setReviewMode(shouldStartInReviewMode);
  }, [attemptId, shouldStartInReviewMode]);

  useEffect(() => {
    if (isGradingPending) {
      setReviewMode(true);
    }
  }, [isGradingPending]);

  const openReviewSectionsForQuestionIndex = useCallback((questionIndex) => {
    const question = reviewQuestions[questionIndex];
    if (!question) return;

    const sectionKeys = reviewQuestionSectionPathMap.get(Number(question.id)) || [];
    if (sectionKeys.length === 0) return;

    setExpandedReviewSections((prev) => {
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
  }, [reviewQuestionSectionPathMap, reviewQuestions]);

  const jumpToQuestion = useCallback((questionIndex) => {
    if (isMockTestReviewLayout) {
      openReviewSectionsForQuestionIndex(questionIndex);
      window.setTimeout(() => {
        questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 20);
      return;
    }

    const targetPage = Math.floor(questionIndex / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      window.setTimeout(() => {
        questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 30);
      return;
    }

    questionRefs.current[questionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentPage, isMockTestReviewLayout, itemsPerPage, openReviewSectionsForQuestionIndex]);

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
    // Challenge context: navigate back to group workspace challenge tab
    if (challengeContext?.workspaceId) {
      navigate(buildGroupWorkspaceSectionPath(challengeContext.workspaceId, 'challenge'), { replace: true });
      return;
    }

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
    challengeContext,
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
        sourceRoadmapId,
        sourceKnowledgeId,
        sourcePhaseId,
      },
    });
  }, [
    handleBack,
    navigate,
    normalizedQuizIdForBack,
    resumeAttemptPath,
    returnToQuizPath,
    sourceRoadmapId,
    sourceKnowledgeId,
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
      showSuccess(t('quizResultPage.generateKnowledgeSuccess', 'Knowledge generation request sent for this phase.'));
      const normalizedWorkspaceId = Number(workspaceId);
const normalizedPhaseId = Number(phaseId);
if (
Number.isInteger(normalizedWorkspaceId)
&& normalizedWorkspaceId > 0
&& Number.isInteger(normalizedPhaseId)
&& normalizedPhaseId > 0
) {
navigate(buildWorkspaceRoadmapsPath(normalizedWorkspaceId, normalizedPhaseId), { replace: true });
return;
}

handleBack();

    } catch (error) {
      unmarkPhaseContentGenerating(workspaceId, phaseId);
      console.error('Failed to generate roadmap phase content after pre-learning:', error);
      showError(error?.message || t('quizResultPage.generateKnowledgeFail', 'Failed to generate knowledge. Please try again.'));
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

  const hasSkipableDecision = currentPhaseProgress?.skipable === true
    || currentPhaseProgress?.skipable === false;
  const normalizedCurrentPhaseStatus = String(currentPhaseProgress?.status || '').toUpperCase();
  const isCurrentPhaseCompleted = normalizedCurrentPhaseStatus === 'COMPLETED';
  const shouldRenderPreLearningDecisionCard = canTriggerKnowledgeAfterPreLearning
    && isAssessmentReady
    && hasSkipableDecision
    && !isCurrentPhaseCompleted;
  const canShowSkipDecision = shouldRenderPreLearningDecisionCard
    && currentPhaseProgress?.skipable === true;
  const canShowGenerateKnowledgeFallback = shouldRenderPreLearningDecisionCard
    && !loadingCurrentPhase
    && !canShowSkipDecision;

  const handleSkipDecision = useCallback(async (skipped) => {
    if (!canTriggerKnowledgeAfterPreLearning || submittingSkipDecision) return;

    const phaseId = Number(currentPhaseProgress?.phaseId ?? preLearningGenerationContext.phaseId);
    if (!Number.isInteger(phaseId) || phaseId <= 0) {
      showError(t('quizResultPage.skipDecisionMissingPhase', 'Cannot determine the phase for this decision.'));
      return;
    }

    setSubmittingSkipDecision(true);
    try {
      await submitRoadmapPhaseSkipDecision(phaseId, skipped);

      if (skipped) {
        showSuccess(t('quizResultPage.skipPhaseSuccess', 'Current phase has been skipped successfully.'));
        const latestCurrent = await fetchCurrentRoadmapPhase();
        const nextPhaseId = Number(latestCurrent?.phaseId);
        const workspaceId = Number(preLearningGenerationContext.workspaceId);

        if (Number.isInteger(workspaceId) && workspaceId > 0 && Number.isInteger(nextPhaseId) && nextPhaseId > 0) {
          navigate(buildWorkspaceRoadmapsPath(workspaceId, nextPhaseId), { replace: true });
          return;
        }

        handleBack();
        return;
      }

      await handleGenerateKnowledgeAfterPreLearning();
    } catch (error) {
      console.error('Failed to submit skip decision:', error);
      showError(error?.message || t('quizResultPage.skipPhaseFail', 'Could not update skip decision for this phase.'));
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
              ? t('quizResultPage.waitingForResult', 'Waiting for your result...')
              : t('quizResultPage.loading', 'Loading result...')}
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
      ? t('quizResultPage.incompleteAttempt', 'This quiz attempt is not complete yet. Return to continue or submit before viewing the result.')
      : activeResultError?.statusCode === 404 || activeResultError?.statusCode === 409
      ? t('quizResultPage.pendingOrMissing', 'This attempt result is not ready yet or no longer exists.')
      : t('quizResultPage.unavailable', 'This attempt result is currently unavailable. Please try again.');

    return (
      <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center', fontClass)} style={quizFontStyle}>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 text-center">
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-100">
            {t('quizResultPage.notFound', 'Result not found')}
          </h2>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            {resultErrorMessage}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isIncompleteAttempt && resumeAttemptPath && (
              <Button type="button" onClick={handleResumeAttempt} className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <ArrowLeft className="h-4 w-4" />
                {t('quizResultPage.resumeAttempt', 'Resume attempt')}
              </Button>
            )}
            <Button type="button" onClick={retryLoadResult} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <RefreshCw className="h-4 w-4" />
              {t('quizResultPage.retryLoad', 'Retry')}
            </Button>
            <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('quizResultPage.backToQuiz', 'Back to Quiz')}
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
  const gradingProgressText = t('quizResultPage.gradingProgress', 'Grading: {{pending}}/{{total}}', {
    pending: pendingGradingCount,
    total: totalQuestion,
  });
  const timeTakenSeconds = getTimeTakenSeconds(result.startedAt, result.completedAt, result.timeoutAt);
  const totalPages = isMockTestReviewLayout ? 1 : Math.max(1, Math.ceil(reviewQuestions.length / itemsPerPage));
  const safeNavPage = Math.min(currentPage, totalPages);
  const navStartIndex = (safeNavPage - 1) * itemsPerPage;
  const navQuestions = isMockTestReviewLayout
    ? reviewQuestions
    : reviewQuestions.slice(navStartIndex, navStartIndex + itemsPerPage);
  const toggleReviewSection = (sectionKey) => {
    setExpandedReviewSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };
  const renderReviewQuestionCard = (question) => {
    const questionNumber = Number(question?.number) || 1;
    const questionIndex = questionNumber - 1;
    return (
      <div key={question.id} className="relative scroll-mt-24" ref={(element) => { if (element) questionRefs.current[questionIndex] = element; }}>
        <QuestionCard
          question={question}
          questionNumber={questionNumber}
          totalQuestions={reviewQuestions.length}
          showHeaderMeta={false}
          answerValue={
            question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK'
              ? question.textAnswer
              : question.type === 'MATCHING'
                ? { matchingPairs: question.matchingPairs }
                : question.selectedAnswerIds
          }
          showResult
          showExplanation
          disabled
        />
      </div>
    );
  };

  const renderSharedContext = (sharedContext) => {
    if (!sharedContext) return null;

    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-slate-200">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
          {t('mockTestForms.detail.sharedContext', 'Shared context')}
        </p>
        <MixedMathText as="div">{sharedContext}</MixedMathText>
      </div>
    );
  };

  const renderReviewSection = (section, sectionIndex, depth = 0, pathLabel = `${sectionIndex + 1}`) => {
    const childSections = getSectionChildren(section);
    const sectionKey = getSectionKey(section, `review-section-${pathLabel}`);
    const isExpanded = expandedReviewSections[sectionKey] ?? true;
    const isQuestionGroup = isQuestionGroupSection(section);
    const sharedContext = getSectionSharedContext(section);
    const isSharedContextGroup = isQuestionGroup && Boolean(sharedContext);
    const sectionTitle = getSectionTitle(
      section,
      t('mockTestForms.detail.section', 'Section'),
    );

    if (isSharedContextGroup) {
      return (
        <section
          key={section.sectionId ?? `review-section-${pathLabel}`}
          className={cn(
            'space-y-4',
            depth === 0
              ? 'rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-blue-950/20'
              : 'pl-5 border-l-2 border-slate-200 dark:border-slate-700',
          )}
        >
          <div className="flex w-full flex-wrap items-center gap-3 rounded-2xl text-left">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {sectionTitle}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {countSectionQuestions(section)} {t('mockTestForms.detail.questions', 'questions')}
              </p>
            </div>
          </div>

          {renderSharedContext(sharedContext)}

          {Array.isArray(section?.questions) && section.questions.length > 0 && (
            <div className="space-y-4">
              {section.questions.map((question) => renderReviewQuestionCard(question))}
            </div>
          )}

          {childSections.length > 0 && (
            <div className="space-y-6">
              {childSections.map((childSection, childIndex) => renderReviewSection(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
            </div>
          )}
        </section>
      );
    }

    return (
      <section
        key={section.sectionId ?? `review-section-${pathLabel}`}
        className={cn(
          'space-y-4',
          depth === 0
            ? 'rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-blue-950/20'
            : 'pl-5 border-l-2 border-slate-200 dark:border-slate-700',
        )}
      >
        <button
          type="button"
          onClick={() => toggleReviewSection(sectionKey)}
          className="flex w-full flex-wrap items-center gap-3 rounded-2xl text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
        >
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {sectionTitle}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {countSectionQuestions(section)} {t('mockTestForms.detail.questions', 'questions')}
            </p>
          </div>
        </button>

        {isExpanded && (
          <>
            {Array.isArray(section?.questions) && section.questions.length > 0 && (
              <div className="space-y-4">
                {section.questions.map((question) => renderReviewQuestionCard(question))}
              </div>
            )}

            {childSections.length > 0 && (
              <div className="space-y-6">
                {childSections.map((childSection, childIndex) => renderReviewSection(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  const renderReviewNavButton = (question, fallbackIndex = 0) => {
    const questionNumber = Number(question?.number) || (fallbackIndex + 1);
    const isPending = isPendingQuestionGrading(question) || !hasResolvedQuestionResult(question);
    const isCorrect = question.isCorrect === true;

    return (
      <button
        key={question.id}
        onClick={() => jumpToQuestion(questionNumber - 1)}
        className={cn(
          'relative aspect-square w-full rounded-[14px] border text-[12px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
          isPending
            ? 'border-amber-300/90 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/25 dark:text-amber-300 dark:hover:bg-amber-900/35'
            : isCorrect
              ? 'border-emerald-300/90 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-900/35'
              : 'border-rose-300/90 bg-rose-50 text-rose-700 hover:border-rose-400 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/25 dark:text-rose-300 dark:hover:bg-rose-900/35',
        )}
      >
        <span className="relative z-10 leading-none">{questionNumber}</span>
      </button>
    );
  };

  const renderReviewNavSection = (section, sectionIndex, depth = 0, pathLabel = `${sectionIndex + 1}`) => {
    const childSections = normalizeVisibleSectionGroups(getSectionChildren(section));
    const isQuestionGroup = isQuestionGroupSection(section);
    const isSharedContextGroup = isQuestionGroup && Boolean(getSectionSharedContext(section));
    const sectionTitle = getSectionTitle(
      section,
      `${t('mockTestForms.detail.section', 'Section')} ${pathLabel}`,
    );

    return (
      <div
        key={section.sectionId ?? `review-nav-section-${pathLabel}`}
        className={cn('space-y-2', depth > 0 && !isSharedContextGroup && 'pl-4 border-l border-slate-200 dark:border-slate-700')}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'min-w-0 truncate',
            isSharedContextGroup
              ? 'text-xs font-medium text-slate-500 dark:text-slate-400'
              : 'text-sm font-semibold text-slate-700 dark:text-slate-100',
          )}>
            {sectionTitle}
          </p>
          {!isSharedContextGroup && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
              {countSectionQuestions(section)}
            </span>
          )}
        </div>

        {Array.isArray(section?.questions) && section.questions.length > 0 && (
          <div className="grid grid-cols-5 gap-1.5">
            {section.questions.map((question, questionIndex) => renderReviewNavButton(question, questionIndex))}
          </div>
        )}

        {childSections.length > 0 && (
          <div className="space-y-3">
            {childSections.map((childSection, childIndex) => renderReviewNavSection(childSection, childIndex, depth + 1, `${pathLabel}.${childIndex + 1}`))}
          </div>
        )}
      </div>
    );
  };
  const resolvedPassed = isGradingPending ? null : passed;
  const isMockTestResult = String(quizRawDetails?.quizIntent || result?.quizIntent || '').toUpperCase() === 'MOCK_TEST';
  const completedFallback = isMockTestResult
    ? t('quizResultPage.mockTestCompleted', 'Mock Test Submitted')
    : t('quizResultPage.quizCompleted', 'Quiz Completed');
  const resultTitle = isGradingPending
    ? t('quizResultPage.gradingTitle', 'AI is grading')
    : resolvedPassed == null
      ? completedFallback
      : resolvedPassed
        ? t('quizResultPage.congratulations', 'Congratulations!')
        : t('quizResultPage.keepTrying', 'Keep Trying!');
  const aiSummary = assessmentData?.summary;
  const strengths = Array.isArray(assessmentData?.strengths) ? assessmentData.strengths.filter(Boolean) : [];
  const weaknesses = Array.isArray(assessmentData?.weaknesses) ? assessmentData.weaknesses.filter(Boolean) : [];
  return (
    <div className={cn('min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col', fontClass)} style={quizFontStyle}>
      <QuizHeader
        onBack={reviewMode ? () => setReviewMode(false) : handleBack}
        title={quizDetails?.title || t('quizResultPage.title', 'Result')}
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
                <ScoreStat label={t('quizResultPage.correct', 'Correct')} value={correctValue} icon={CheckCircle2} />
                <ScoreStat label={t('quizResultPage.answered', 'Answered')} value={answeredValue} icon={Eye} />
                <ScoreStat label={t('quizResultPage.time', 'Time')} value={formatDuration(timeTakenSeconds)} icon={Clock3} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {/* <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Status: {result.status || 'UNKNOWN'}</span>
                <span className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-800/60">Mode: {result.isPracticeMode ? 'Practice' : 'Exam'}</span> */}
                {result.passScore != null && <span className="rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 font-medium text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">{t('quizResultPage.passScore', 'Pass Score')}: {result.passScore}</span>}
              </div>
            </div>

            {shouldShowAssessmentSection && (
              <>
                <SectionDivider label={t('quizResultPage.assessmentSection', 'AI insights')} />

                <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/70 bg-white/80 dark:bg-slate-800/40 p-5 mb-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h3 className="flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
                  <Sparkles className="w-4 h-4" />
                  {t('quizResultPage.aiAssessment', 'AI Assessment')}
                </h3>
                <Button variant="outline" size="sm" onClick={handleRefreshAssessment} disabled={assessmentLoading} className="gap-2">
                  <RefreshCw className={cn('w-4 h-4', assessmentLoading && 'animate-spin')} />
                  {t('quizResultPage.refreshAssessment', 'Refresh')}
                </Button>
              </div>

              {(assessmentLoading && !assessmentData) && (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t('quizResultPage.assessmentLoading', 'Loading AI assessment...')}</div>
              )}

              {assessmentStatus === 'PROCESSING' && (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-300">
                  {t('quizResultPage.assessmentProcessing', 'AI assessment is still processing. This page will refresh automatically.')}
                </div>
              )}

              {assessmentStatus === 'FAILED' && (
                <div className="rounded-lg border border-rose-200/80 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/20 dark:text-rose-300">
                  {assessmentData?.message || t('quizResultPage.assessmentFailed', 'AI assessment could not be completed yet. Try refreshing after grading finishes.')}
                </div>
              )}

                {assessmentStatus === 'READY' && assessmentData && (
                  <div className="space-y-4">
                    {(strengths.length > 0 || weaknesses.length > 0) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {strengths.length > 0 && (
                          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-800/70 dark:bg-emerald-950/20">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300 mb-2">
                              {t('quizResultPage.strengths', 'Strengths')}
                            </p>
                            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                              {strengths.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="mt-1 text-emerald-500 text-xs">&#10003;</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {weaknesses.length > 0 && (
                          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 dark:border-amber-800/70 dark:bg-amber-950/20">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300 mb-2">
                              {t('quizResultPage.weaknesses', 'Needs improvement')}
                            </p>
                            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                              {weaknesses.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="mt-1 text-amber-500 text-xs">&#9679;</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {aiSummary || t('quizResultPage.assessmentNoSummary', 'No AI assessment summary yet.')}
                    </p>

                </div>
              )}
                </div>
              </>
            )}

            {canTriggerKnowledgeAfterPreLearning && isAssessmentReady && (
              <div className="rounded-xl border border-blue-200/80 dark:border-blue-700/70 bg-blue-50/70 dark:bg-blue-900/20 p-4 mb-6 text-left space-y-3">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  {t('quizResultPage.preLearningDecisionTitle', 'Decision after Pre-learning')}
                </p>

                {loadingCurrentPhase && (
                  <p className="text-sm text-blue-700/90 dark:text-blue-300/90">
                    {t('quizResultPage.loadingCurrentPhase', 'Checking your current phase...')}
                  </p>
                )}

                {!loadingCurrentPhase && canShowSkipDecision && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {t('quizResultPage.skipPhaseEligibleHint', 'You are eligible to skip this phase. Do you want to skip or continue practicing?')}
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
                        {t('quizResultPage.skipPhaseAction', 'Skip this phase')}
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
                          ? t('quizResultPage.generateKnowledgeDone', 'Knowledge request sent')
                          : t('quizResultPage.continuePracticeAction', 'Continue practicing')}
                      </Button>
                    </div>
                  </div>
                )}

                {canShowGenerateKnowledgeFallback && (
                  <Button
                    type="button"
                    onClick={handleGenerateKnowledgeAfterPreLearning}
                    disabled={generatingKnowledge || knowledgeGenerationTriggered || submittingSkipDecision}
                    className="min-w-[220px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {generatingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}
                    {knowledgeGenerationTriggered
                      ? t('quizResultPage.generateKnowledgeDone', 'Knowledge request sent')
                      : t('quizResultPage.generateKnowledgeAction', 'Generate practice knowledge')}
                  </Button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <SectionDivider />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setReviewMode(true)} variant="outline" className="min-w-[180px] gap-2" disabled={reviewQuestions.length === 0}>
                <Eye className="w-4 h-4" /> {t('quizResultPage.reviewAnswers', 'Review Answers')}
              </Button>
              {hasQuizIdForBack ? (
                <DirectFeedbackButton
                  targetType="QUIZ"
                  targetId={normalizedQuizIdForBack}
                  label={t('quizResultPage.feedbackAction', 'Feedback')}
                  className="min-w-[180px] gap-2"
                />
              ) : null}
              {canLeaveCommunityFeedback ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCommunityFeedbackOpen(true)}
                  className="min-w-[220px] gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {quizRawDetails?.communityFeedbackSubmitted
                      ? t('quizResultPage.communityFeedbackUpdate', 'Update community feedback')
                      : t('quizResultPage.communityFeedbackAction', 'Leave community feedback')}
                  </span>
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {/* Mock test extensions: section + bloom breakdown + cohort stats — chỉ render ở trang tổng quan */}
        {!reviewMode && String(quizRawDetails?.quizIntent || result?.quizIntent || '').toUpperCase() === 'MOCK_TEST' && (
          <div className="mb-6">
            <MockTestReviewExtensions
              result={result}
              quizRaw={quizRawDetails}
              reviewQuestions={reviewQuestions}
              quizId={result?.quizId}
            />
          </div>
        )}

        {/* Review mode */}
        {reviewMode && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('quizResultPage.reviewAnswersTitle', 'Review Answers')}</h2>
            </div>

            {isGradingPending && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-800/70 dark:bg-blue-950/20 dark:text-blue-300">
                {gradingProgressText}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_272px] xl:grid-cols-[minmax(0,1fr)_288px]">
              <div className="space-y-4">
                {isMockTestReviewLayout
                  ? reviewSectionGroups.map((section, sectionIndex) => renderReviewSection(section, sectionIndex))
                  : reviewQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((q, idx) => {
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

                {!isMockTestReviewLayout && reviewQuestions.length > itemsPerPage && (
                  <div className="mt-6 flex items-center justify-between p-4">
                    <Button variant="outline" disabled={currentPage === 1} onClick={() => { setCurrentPage((p) => p - 1); scrollToTop(); }}>
                      {t('quizResultPage.paginationPrev', 'Previous page')}
                    </Button>
                    <span className="text-sm font-medium text-slate-500">
                      {t('quizResultPage.paginationPage', 'Page')} {currentPage} / {totalPages}
                    </span>
                    <Button variant="outline" disabled={currentPage === totalPages} onClick={() => { setCurrentPage((p) => p + 1); scrollToTop(); }}>
                      {t('quizResultPage.paginationNext', 'Next page')}
                    </Button>
                  </div>
                )}

                {reviewQuestions.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {t('quizResultPage.noReviewData', 'No detailed data available to review this attempt.')}
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
                          {t('quizResultPage.reviewAnswersTitle', 'Review Answers')}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                          {t('quizResultPage.questionList', 'Question list')}
                        </h3>
                        <p className="max-w-[150px] text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                          {t('quizResultPage.questionListHint', 'Click a number to jump straight to that question.')}
                        </p>
                      </div>
                      <div className="min-w-[62px] rounded-[20px] border border-slate-200/80 bg-white/80 px-2.5 py-2 text-right shadow-sm dark:border-slate-700/80 dark:bg-slate-950/60">
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {t('quizResultPage.total', 'Total')}
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
                            {t('quizResultPage.correct', 'Correct')}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-200">{reviewSummary.correct}</p>
                      </div>
                      <div className="min-h-[82px] rounded-[20px] border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 shadow-sm dark:border-rose-800/60 dark:bg-rose-950/30">
                        <div className="mb-1 flex items-center gap-2 text-rose-700 dark:text-rose-300">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                            {t('quizResultPage.wrong', 'Wrong')}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-200">{reviewSummary.wrong}</p>
                      </div>
                      {reviewSummary.pending > 0 && (
                        <div className="col-span-2 rounded-[20px] border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30">
                          <div className="mb-1 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                              {t('quizResultPage.pending', 'Pending')}
                            </span>
                          </div>
                          <p className="text-base font-bold text-amber-700 dark:text-amber-200">{reviewSummary.pending}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {t('quizResultPage.questionList', 'Question list')}
                        </span>
                        {!isMockTestReviewLayout && totalPages > 1 && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                            {t('quizResultPage.paginationPage', 'Page')} {safeNavPage}/{totalPages}
                          </span>
                        )}
                      </div>

                      {isMockTestReviewLayout ? (
                        <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-0.5">
                          {reviewSectionGroups.map((section, sectionIndex) => renderReviewNavSection(section, sectionIndex))}
                        </div>
                      ) : (
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
                      )}

                      {!isMockTestReviewLayout && reviewQuestions.length > itemsPerPage && (
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
                            {t('quizResultPage.paginationPrev', 'Previous page')}
                          </Button>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {t('quizResultPage.paginationPage', 'Page')} {safeNavPage}/{totalPages}
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
                            {t('quizResultPage.paginationNext', 'Next page')}
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

      <CommunityQuizFeedbackDialog
        open={communityFeedbackOpen}
        onOpenChange={setCommunityFeedbackOpen}
        sourceQuizId={communitySourceQuizId}
        clonedQuizId={normalizedQuizIdForBack}
        initialRating={quizRawDetails?.communityMyRating}
        initialComment={quizRawDetails?.communityMyComment || ''}
        onSubmitted={(nextFeedback) => {
          setQuizRawDetails((prev) => prev ? {
            ...prev,
            communityFeedbackSubmitted: true,
            communityMyRating: nextFeedback?.rating ?? prev.communityMyRating,
            communityMyComment: nextFeedback?.comment ?? prev.communityMyComment,
          } : prev);
        }}
      />
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
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{value}</span>
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
