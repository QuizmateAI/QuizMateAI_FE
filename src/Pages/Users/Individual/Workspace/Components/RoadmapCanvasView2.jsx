import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import QuizListView from "./QuizListView";
import { useToast } from "@/context/ToastContext";
import { getAttemptAssessment, getQuizHistory } from "@/api/QuizAPI";
import {
  createPhaseProgressReview,
  getCurrentRoadmapPhaseProgress,
  getPhaseProgressReview,
  submitRoadmapPhaseSkipDecision,
} from "@/api/RoadmapPhaseAPI";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Share2,
  Loader2,
  Sparkles,
} from "lucide-react";

function RoadmapCanvasView2({
  roadmap,
  isDarkMode = false,
  fontClass = "font-sans",
  selectedPhaseId = null,
  onPhaseFocus,
  onCreatePhaseKnowledge,
  onCreateKnowledgeQuizForKnowledge,
  onCreatePhasePreLearning,
  isStudyNewRoadmap = false,
  adaptationMode = "",
  onViewQuiz,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  knowledgeQuizRefreshByKnowledgeKey = {},
  generatingPreLearningPhaseIds = [],
  skipPreLearningPhaseIds = [],
  quizRefreshToken = 0,
  progressTracking = null,
  onShareRoadmap,
  onShareQuiz,
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [openPhaseId, setOpenPhaseId] = useState(null);
  const [decisionState, setDecisionState] = useState({
    phaseId: null,
    loadingAssessment: false,
    assessmentStatus: "NOT_AVAILABLE",
    assessmentData: null,
    loadingCurrentPhase: false,
    currentPhaseProgress: null,
  });
  const [submittingSkipDecision, setSubmittingSkipDecision] = useState(false);
  const [decisionHandledPhaseIds, setDecisionHandledPhaseIds] = useState([]);
  const [phaseReviewState, setPhaseReviewState] = useState({
    loading: false,
    data: null,
    phaseId: null,
  });
  const preLearningDecisionFetchRef = useRef({
    inFlightKey: null,
    lastLoadedKey: null,
    lastLoadedAt: 0,
  });
  const phaseReviewInFlightRef = useRef(false);
  const getDefaultOpenKnowledgeMap = (phaseList = []) => {
    return (phaseList || []).reduce((accumulator, phase) => {
      const phaseId = Number(phase?.phaseId);
      if (!Number.isInteger(phaseId) || phaseId <= 0) return accumulator;

      (phase?.knowledges || []).forEach((knowledge) => {
        const knowledgeId = Number(knowledge?.knowledgeId);
        if (!Number.isInteger(knowledgeId) || knowledgeId <= 0) return;
        accumulator[`${phaseId}:${knowledgeId}`] = true;
      });

      return accumulator;
    }, {});
  };
  const knowledgeDropdownStorageKey = useMemo(() => {
    const normalizedWorkspaceId = Number(roadmap?.workspaceId);
    const normalizedRoadmapId = Number(roadmap?.roadmapId);

    if (Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0
      && Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
      return `workspace_${normalizedWorkspaceId}_roadmap_${normalizedRoadmapId}_knowledge_dropdown`;
    }

    return null;
  }, [roadmap?.roadmapId, roadmap?.workspaceId]);

  const phases = useMemo(() => {
    const rawPhases = roadmap?.phases ?? [];
    return [...rawPhases].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0));
  }, [roadmap?.phases]);
  const normalizedAdaptationMode = String(adaptationMode || "").toUpperCase();

  const getPersistedKnowledgeMap = (storageKey) => {
    if (!storageKey || typeof window === "undefined") {
      return {};
    }

    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed).reduce((accumulator, [key, value]) => {
        if (typeof value === "boolean") {
          accumulator[key] = value;
        }
        return accumulator;
      }, {});
    } catch (error) {
      console.error("Failed to restore knowledge dropdown state:", error);
      return {};
    }
  };

  const defaultOpenKnowledgeMap = useMemo(() => getDefaultOpenKnowledgeMap(phases), [phases]);
  const [persistedKnowledgeState, setPersistedKnowledgeState] = useState(() => ({
    key: knowledgeDropdownStorageKey,
    map: getPersistedKnowledgeMap(knowledgeDropdownStorageKey),
  }));
  const persistedKnowledgeMap = useMemo(() => {
    if (persistedKnowledgeState.key === knowledgeDropdownStorageKey) {
      return persistedKnowledgeState.map;
    }

    return getPersistedKnowledgeMap(knowledgeDropdownStorageKey);
  }, [knowledgeDropdownStorageKey, persistedKnowledgeState]);
  const openKnowledgeMap = useMemo(
    () => ({
      ...defaultOpenKnowledgeMap,
      ...persistedKnowledgeMap,
    }),
    [defaultOpenKnowledgeMap, persistedKnowledgeMap]
  );

  const fallbackPhaseId = phases[0]?.phaseId ?? null;
  const hasSelectedPhaseFromSidebar = phases.some((phase) => phase.phaseId === selectedPhaseId);
  const effectiveOpenPhaseId = hasSelectedPhaseFromSidebar
    ? selectedPhaseId
    : phases.some((phase) => phase.phaseId === openPhaseId)
    ? openPhaseId
    : fallbackPhaseId;
  const activePhase = phases.find((phase) => phase.phaseId === effectiveOpenPhaseId) || null;

  const hasCompletedPostLearning = useCallback((phase) => {
    const postLearningQuizzes = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];
    return postLearningQuizzes.some((quiz) => {
      const attempted = quiz?.myAttempted === true;
      const passed = quiz?.myPassed === true;
      const status = String(quiz?.status || "").toUpperCase();
      return attempted || passed || status === "COMPLETED";
    });
  }, []);

  const hasPassedPostLearning = useCallback((phase) => {
    const postLearningQuizzes = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];
    return postLearningQuizzes.some((quiz) => quiz?.myPassed === true);
  }, []);

  const resolvePostLearningReviewEligibility = useCallback((phase) => {
    if (!phase) return false;
    const isFlexible = normalizedAdaptationMode === "FLEXIBLE";
    const isStrict = normalizedAdaptationMode === "STRICT";
    const isDone = hasCompletedPostLearning(phase);
    const isPassed = hasPassedPostLearning(phase);

    if (isFlexible) return isDone;
    if (isStrict) return isPassed;

    return isPassed;
  }, [hasCompletedPostLearning, hasPassedPostLearning, normalizedAdaptationMode]);

  const syncPhaseReview = useCallback(async () => {
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    const activePhaseId = Number(activePhase?.phaseId);
    if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
      setPhaseReviewState({ loading: false, data: null, phaseId: null });
      return;
    }
    if (!Number.isInteger(activePhaseId) || activePhaseId <= 0) {
      setPhaseReviewState({ loading: false, data: null, phaseId: null });
      return;
    }

    if (phaseReviewInFlightRef.current) return;
    phaseReviewInFlightRef.current = true;
    setPhaseReviewState({ loading: true, data: null, phaseId: activePhaseId });

    try {
      const currentResponse = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
      const currentPhaseProgress = currentResponse?.data?.data || currentResponse?.data || null;
      const phaseProgressId = Number(currentPhaseProgress?.phaseProgressId);
      const currentPhaseId = Number(currentPhaseProgress?.phaseId);

      const currentPhase = phases.find((phase) => Number(phase?.phaseId) === activePhaseId) || null;
      const eligibleToCreateReview = resolvePostLearningReviewEligibility(currentPhase);
      const canCreateForActivePhase = Number.isInteger(currentPhaseId)
        && currentPhaseId === activePhaseId;
      const reviewCreationKey = `phase_review_created:${normalizedRoadmapId}:${phaseProgressId}`;
      const alreadyCreated = typeof window !== "undefined"
        ? window.sessionStorage.getItem(reviewCreationKey) === "1"
        : false;

      if (
        canCreateForActivePhase
        &&
        eligibleToCreateReview
        && Number.isInteger(phaseProgressId)
        && phaseProgressId > 0
        && !alreadyCreated
      ) {
        try {
          await createPhaseProgressReview(phaseProgressId);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(reviewCreationKey, "1");
          }
        } catch (createError) {
          const createStatus = Number(createError?.response?.status || 0);
          // 409 thuong la du lieu progress chua du, van thu GET review de hien thi neu da ton tai.
          if (createStatus !== 409) {
            console.error("Failed to create phase progress review:", createError);
          }
        }
      }

      try {
        const reviewResponse = await getPhaseProgressReview(activePhaseId);
        const reviewData = reviewResponse?.data?.data || reviewResponse?.data || null;
        const reviewPhaseId = Number(reviewData?.phaseId);
        if (reviewData?.summary && reviewPhaseId === activePhaseId) {
          setPhaseReviewState({ loading: false, data: reviewData, phaseId: activePhaseId });
          return;
        }
      } catch (reviewError) {
        // Chưa có review thì ẩn khung, không coi là lỗi UI.
      }

      setPhaseReviewState({ loading: false, data: null, phaseId: activePhaseId });
    } catch (error) {
      console.error("Failed to sync phase review state:", error);
      setPhaseReviewState((current) => ({ ...current, loading: false }));
    } finally {
      phaseReviewInFlightRef.current = false;
    }
  }, [activePhase?.phaseId, phases, resolvePostLearningReviewEligibility, roadmap?.roadmapId]);

  useEffect(() => {
    void syncPhaseReview();
  }, [syncPhaseReview, quizRefreshToken, activePhase?.phaseId]);

  const phaseReviewConfidencePercent = useMemo(() => {
    const rawScore = Number(phaseReviewState?.data?.confidenceScore);
    if (!Number.isFinite(rawScore)) return null;
    const normalizedScore = Math.max(0, Math.min(1, rawScore));
    return Math.round(normalizedScore * 100);
  }, [phaseReviewState?.data?.confidenceScore]);

  const phaseReviewSegmentFillPercents = useMemo(() => {
    if (typeof phaseReviewConfidencePercent !== "number") {
      return [0, 0, 0];
    }

    const segmentSize = 100 / 3;
    return [0, 1, 2].map((index) => {
      const segmentStart = index * segmentSize;
      const segmentEnd = segmentStart + segmentSize;
      if (phaseReviewConfidencePercent <= segmentStart) return 0;
      if (phaseReviewConfidencePercent >= segmentEnd) return 100;
      return Math.max(0, Math.min(100, ((phaseReviewConfidencePercent - segmentStart) / segmentSize) * 100));
    });
  }, [phaseReviewConfidencePercent]);

  const phaseReviewAssessedAtLabel = useMemo(() => {
    const rawValue = phaseReviewState?.data?.assessedAt;
    if (!rawValue) return null;
    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(parsedDate);
  }, [phaseReviewState?.data?.assessedAt]);

  const loadPreLearningDecisionState = useCallback(async (phase) => {
    const normalizedPhaseId = Number(phase?.phaseId);
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    const normalizedWorkspaceId = Number(roadmap?.workspaceId);
    const hasValidContext = Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0
      && Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
      && Number.isInteger(normalizedWorkspaceId) && normalizedWorkspaceId > 0;

    const preLearningQuizzes = Array.isArray(phase?.preLearningQuizzes) ? phase.preLearningQuizzes : [];
    const attemptedPreLearningQuiz = preLearningQuizzes
      .filter((quiz) => quiz?.myAttempted === true)
      .sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return bTime - aTime;
      })[0] || null;

    if (!hasValidContext || !attemptedPreLearningQuiz?.quizId) {
      setDecisionState({
        phaseId: normalizedPhaseId,
        loadingAssessment: false,
        assessmentStatus: "NOT_AVAILABLE",
        assessmentData: null,
        loadingCurrentPhase: false,
        currentPhaseProgress: null,
      });
      return;
    }

    const requestKey = `${normalizedRoadmapId}:${normalizedPhaseId}:${Number(attemptedPreLearningQuiz?.quizId)}`;
    const now = Date.now();
    if (preLearningDecisionFetchRef.current.inFlightKey === requestKey) {
      return;
    }
    if (
      preLearningDecisionFetchRef.current.lastLoadedKey === requestKey
      && (now - preLearningDecisionFetchRef.current.lastLoadedAt) < 1200
    ) {
      return;
    }

    preLearningDecisionFetchRef.current.inFlightKey = requestKey;

    setDecisionState({
      phaseId: normalizedPhaseId,
      loadingAssessment: true,
      assessmentStatus: "NOT_AVAILABLE",
      assessmentData: null,
      loadingCurrentPhase: false,
      currentPhaseProgress: null,
    });

    try {
      const historyResponse = await getQuizHistory(attemptedPreLearningQuiz.quizId);
      const attempts = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
      const latestCompletedAttempt = attempts
        .filter((attempt) => String(attempt?.status || "").toUpperCase() === "COMPLETED")
        .sort((a, b) => {
          const aTime = new Date(a?.submittedAt || a?.createdAt || 0).getTime();
          const bTime = new Date(b?.submittedAt || b?.createdAt || 0).getTime();
          if (aTime !== bTime) return bTime - aTime;
          return Number(b?.attemptId || 0) - Number(a?.attemptId || 0);
        })[0] || null;

      const latestAttemptId = Number(latestCompletedAttempt?.attemptId);
      if (!Number.isInteger(latestAttemptId) || latestAttemptId <= 0) {
        setDecisionState((current) => ({
          ...current,
          phaseId: normalizedPhaseId,
          loadingAssessment: false,
          assessmentStatus: "NOT_AVAILABLE",
          assessmentData: null,
        }));
        return;
      }

      const assessmentResponse = await getAttemptAssessment(latestAttemptId);
      const assessmentPayload = assessmentResponse?.data?.data || assessmentResponse?.data || null;
      const assessmentStatus = assessmentPayload?.status || "NOT_AVAILABLE";
      const assessmentData = assessmentStatus === "READY" ? assessmentPayload : null;

      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingAssessment: false,
        assessmentStatus,
        assessmentData,
      }));

      const isAssessmentReady = assessmentStatus === "READY" && Boolean(assessmentData);
      if (!isAssessmentReady) return;

      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: true,
      }));

      const phaseProgressResponse = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
      const phaseProgressPayload = phaseProgressResponse?.data?.data || phaseProgressResponse?.data || null;

      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: false,
        currentPhaseProgress: phaseProgressPayload,
      }));
    } catch (error) {
      console.error("Failed to load post pre-learning decision state:", error);
      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingAssessment: false,
        loadingCurrentPhase: false,
        assessmentStatus: "NOT_AVAILABLE",
        assessmentData: null,
        currentPhaseProgress: null,
      }));
    } finally {
      preLearningDecisionFetchRef.current.lastLoadedKey = requestKey;
      preLearningDecisionFetchRef.current.lastLoadedAt = Date.now();
      preLearningDecisionFetchRef.current.inFlightKey = null;
    }
  }, [roadmap?.roadmapId, roadmap?.workspaceId]);

  useEffect(() => {
    if (!activePhase) return;

    const normalizedPhaseId = Number(activePhase?.phaseId);
    const hasPreLearning = (activePhase?.preLearningQuizzes || []).length > 0;
    const hasKnowledge = (activePhase?.knowledges || []).length > 0;
    const isSkipPreLearningPhase = skipPreLearningPhaseIds.includes(normalizedPhaseId);

    if (!isStudyNewRoadmap || !hasPreLearning || hasKnowledge || isSkipPreLearningPhase) {
      setDecisionState({
        phaseId: normalizedPhaseId,
        loadingAssessment: false,
        assessmentStatus: "NOT_AVAILABLE",
        assessmentData: null,
        loadingCurrentPhase: false,
        currentPhaseProgress: null,
      });
      return;
    }

    void loadPreLearningDecisionState(activePhase);
  }, [
    activePhase,
    isStudyNewRoadmap,
    loadPreLearningDecisionState,
    skipPreLearningPhaseIds,
  ]);

  const handleRoadmapPreLearningDecision = useCallback(async (phaseId, skipped) => {
    const normalizedPhaseId = Number(phaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0 || submittingSkipDecision) return;

    setSubmittingSkipDecision(true);
    try {
      if (skipped) {
        await submitRoadmapPhaseSkipDecision(normalizedPhaseId, true);
        setDecisionHandledPhaseIds((current) => Array.from(new Set([...current, normalizedPhaseId])));
        showSuccess(t("workspace.quiz.result.skipPhaseSuccess", "Current phase has been skipped successfully."));
        return;
      }

      await onCreatePhaseKnowledge?.(normalizedPhaseId, { skipPreLearning: false });
      setDecisionHandledPhaseIds((current) => Array.from(new Set([...current, normalizedPhaseId])));
    } catch (error) {
      console.error("Failed to update pre-learning decision:", error);
      showError(error?.message || t("workspace.quiz.result.skipPhaseFail", "Could not update skip decision for this phase."));
    } finally {
      setSubmittingSkipDecision(false);
    }
  }, [onCreatePhaseKnowledge, showError, showSuccess, submittingSkipDecision, t]);

  const togglePhase = (phaseId) => {
    setOpenPhaseId((current) => {
      const next = current === phaseId ? null : phaseId;
      if (next) {
        onPhaseFocus?.(next, { preserveActiveView: true });
      }
      return next;
    });
  };

  const toggleKnowledge = (phaseId, knowledgeId) => {
    const key = `${phaseId}:${knowledgeId}`;
    const nextKnowledgeMap = {
      ...openKnowledgeMap,
      [key]: !openKnowledgeMap[key],
    };

    if (knowledgeDropdownStorageKey && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(knowledgeDropdownStorageKey, JSON.stringify(nextKnowledgeMap));
      } catch (error) {
        console.error("Failed to save knowledge dropdown state:", error);
      }
    }

    setPersistedKnowledgeState({
      key: knowledgeDropdownStorageKey,
      map: nextKnowledgeMap,
    });
  };

  const renderLoadingPlaceholder = (message, compact = false, percent = 0, color = "blue") => {
    const displayPercent = Math.max(0, Math.min(100, Number(percent) || 0));
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border ${compact ? "px-3 py-2" : "px-4 py-3"} ${
          isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
        }`}
      >
        <CircularProgressLoader
          percent={displayPercent}
          size={compact ? "sm" : "md"}
          color={color}
          className="shrink-0"
        />
        <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
          {message}
        </p>
      </div>
    );
  };

  const renderQuizItem = (quiz) => {
    const status = String(quiz?.status || "DRAFT").toUpperCase();
    const questionCount = Number(quiz?.questionCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={quiz?.quizId || quiz?.id || `${quiz?.title}-quiz`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{quiz?.title}</p>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            <span className="flex items-center gap-1"><BookOpenCheck className="w-3 h-3" />{questionCount} {t("workspace.roadmap.canvas.questions")}</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderFlashcardItem = (flashcard) => {
    const status = String(flashcard?.status || "DRAFT").toUpperCase();
    const count = Number(flashcard?.cardCount ?? flashcard?.itemCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={flashcard?.flashcardSetId || flashcard?.id || `${flashcard?.title}-flashcard`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {flashcard?.title || flashcard?.flashcardSetName}
          </p>
          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {count} {t("workspace.roadmap.canvas.cards")}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderKnowledgeContent = (phase, knowledge) => {
    const normalizedPhaseId = Number(phase?.phaseId);
    const knowledgeId = Number(knowledge?.knowledgeId);
    const knowledgeQuizRequestKey = `${normalizedPhaseId}:${knowledgeId}`;
    const targetedKnowledgeRefreshToken = Number(knowledgeQuizRefreshByKnowledgeKey?.[knowledgeQuizRequestKey] || 0);
    const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizKnowledgeKeys.includes(knowledgeQuizRequestKey);
    const canCreateKnowledgeQuiz = Number.isInteger(knowledgeId) && knowledgeId > 0;
    const quizzes = knowledge?.quizzes || [];
    const hasQuizzes = quizzes.length > 0;
    const shouldRenderKnowledgeQuizList = hasQuizzes || targetedKnowledgeRefreshToken > 0;
    const flashcards = knowledge?.flashcards || [];
    const hasFlashcards = flashcards.length > 0;

    return (
      <div className={`border-t pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>

        {hasQuizzes || isGeneratingKnowledgeQuiz || canCreateKnowledgeQuiz ? (
          <div className={`${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div className="px-4 pt-2 pb-1 flex items-center justify-between gap-2">
              <h5 className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.roadmap.canvas.quiz", "Quiz")}
              </h5>
              {canCreateKnowledgeQuiz ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onCreateKnowledgeQuizForKnowledge?.(phase?.phaseId, knowledgeId)}
                  disabled={isGeneratingKnowledgeQuiz}
                  className="h-7 px-2.5 text-xs bg-[#2563EB] hover:bg-blue-700 text-white transition-all active:scale-95"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t("workspace.roadmap.createKnowledgeQuiz", "Create quiz")}
                </Button>
              ) : null}
            </div>
            <div className="px-4 pb-2">
              {isGeneratingKnowledgeQuiz && !hasQuizzes ? (
                renderLoadingPlaceholder(
                  t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                  true,
                  progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0
                )
              ) : (
                <>
                  {isGeneratingKnowledgeQuiz ? (
                    <div className="mb-2">
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                        true,
                        progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0
                      )}
                    </div>
                  ) : null}
                  {shouldRenderKnowledgeQuizList ? (
                    <QuizListView
                      isDarkMode={isDarkMode}
                      contextType="KNOWLEDGE"
                      contextId={knowledge.knowledgeId}
                      onCreateQuiz={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                      onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                      embedded
                      hideCreateButton
                      title={t("workspace.roadmap.canvas.quiz", "Quiz")}
                      refreshToken={(Number(quizRefreshToken) || 0) + targetedKnowledgeRefreshToken}
                      returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                    />
                  ) : !isGeneratingKnowledgeQuiz ? (
                    <p className={`px-1 py-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                      {t("workspace.roadmap.noQuizYet", "No quiz created yet")}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}

        {hasFlashcards && (
          <div className={`${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h5 className={`text-xs font-semibold px-4 py-2 uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.canvas.flashcard", "Flashcard")}
            </h5>
            <div className={`px-4 space-y-0.5`}>
              {flashcards.map(renderFlashcardItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!roadmap) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
        <p className={fontClass}>{t("workspace.roadmap.noRoadmapYet", "No roadmap yet")}</p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="space-y-3">
        <div className={`rounded-lg border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
          <div className="min-w-0 w-full">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {roadmap?.title}
            </p>
            {roadmap?.description ? (
              <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {roadmap.description}
              </p>
            ) : null}
            {roadmap?.aiSuggest ? (
              <div className={`mt-3 rounded-md p-3 text-sm ${isDarkMode ? "bg-yellow-950/30 border border-yellow-800 text-yellow-200" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
                <p className={`font-medium mb-1 ${fontClass}`}>{t('workspace.roadmap.aiSuggestTitle', 'AI suggestion')}</p>
                <p className={`${fontClass} text-[13px] leading-snug`}>{roadmap.aiSuggest}</p>
              </div>
            ) : null}
            <div className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
              {Number(roadmap?.estimatedTotalDays) > 0 ? (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                  {t("workspace.roadmap.totalDays", "Total days")}: {Number(roadmap?.estimatedTotalDays)}
                </span>
              ) : null}
              {Number(roadmap?.estimatedMinutesPerDay) > 0 ? (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-800" : "bg-white border border-slate-200"}`}>
                  {t("workspace.roadmap.minutesPerDay", "Minutes/day")}: {Number(roadmap?.estimatedMinutesPerDay)}
                </span>
              ) : null}
            </div>
          </div>
          {onShareRoadmap && roadmap?.roadmapId ? (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onShareRoadmap(roadmap)}
                className={`shrink-0 rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t("home.actions.share", "Share")}
              </Button>
            </div>
          ) : null}
        </div>

        {phaseReviewState?.data?.summary && Number(phaseReviewState?.phaseId) === Number(activePhase?.phaseId) ? (
          <div className={`rounded-lg border px-4 py-3 ${isDarkMode ? "border-emerald-800/70 bg-emerald-950/30" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-emerald-200" : "text-emerald-800"} ${fontClass}`}>
                {t("workspace.roadmap.phaseReviewTitle", "Đánh giá AI cho phase hiện tại")}
              </p>
            </div>

            {typeof phaseReviewConfidencePercent === "number" ? (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-medium ${isDarkMode ? "text-emerald-100" : "text-emerald-800"} ${fontClass}`}>
                    {t("workspace.roadmap.phaseReviewConfidence", "Độ tin cậy")}
                  </p>
                  <p className={`text-xs font-semibold ${isDarkMode ? "text-emerald-100" : "text-emerald-800"} ${fontClass}`}>
                    {phaseReviewConfidencePercent}%
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[
                    { color: "#ef4444", fill: phaseReviewSegmentFillPercents[0] },
                    { color: "#f59e0b", fill: phaseReviewSegmentFillPercents[1] },
                    { color: "#22c55e", fill: phaseReviewSegmentFillPercents[2] },
                  ].map((segment, index) => (
                    <div
                      key={`confidence-segment-${index}`}
                      className={`h-3 overflow-hidden rounded-sm border ${isDarkMode ? "border-slate-700 bg-white/95" : "border-slate-200 bg-white"}`}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${segment.fill}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
              {phaseReviewState.data.summary}
            </p>

            {phaseReviewAssessedAtLabel ? (
              <div className="mt-3 text-right">
                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                  {t("workspace.roadmap.phaseReviewAssessedAt", "Đánh giá lúc")}: {phaseReviewAssessedAtLabel}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {activePhase ? [activePhase].map((phase) => {
          const isOpen = effectiveOpenPhaseId === phase.phaseId;
          const normalizedPhaseId = Number(phase.phaseId);
          const normalizedPhaseStatus = String(phase?.status || "").toUpperCase();
          const isCompletedPhase = normalizedPhaseStatus === "COMPLETED";
          const isGeneratingPhaseContent = generatingKnowledgePhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizPhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledge = isGeneratingPhaseContent || isGeneratingKnowledgeQuiz;
          const isGeneratingPreLearning = generatingPreLearningPhaseIds.includes(normalizedPhaseId);
          const phaseKnowledgePercent = progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0;
          const phasePreLearningPercent = progressTracking?.getPreLearningProgress(normalizedPhaseId) ?? 0;
          const phasePostLearningPercent = progressTracking?.getPostLearningProgress(normalizedPhaseId) ?? 0;
          const phaseProcessingPercent = Math.max(phaseKnowledgePercent, phasePreLearningPercent, phasePostLearningPercent, 0);
          const hasPendingProgress = phaseProcessingPercent > 0 && phaseProcessingPercent < 100;
          const isProcessingPhase = !isCompletedPhase && (
            normalizedPhaseStatus === "PROCESSING"
            || isGeneratingPhaseContent
            || isGeneratingKnowledgeQuiz
            || isGeneratingPreLearning
            || hasPendingProgress
          );
          const phaseStatusLabel = isCompletedPhase
            ? t("workspace.quiz.statusLabels.COMPLETED", "Completed")
            : isProcessingPhase
            ? t("workspace.quiz.statusLabels.PROCESSING", "Processing")
            : t("workspace.quiz.statusLabels.ACTIVE", "Active");
          const hasKnowledge = (phase.knowledges || []).length > 0;
          const knowledgeItems = phase.knowledges || [];
          const hasPreLearning = (phase.preLearningQuizzes || []).length > 0;
          const hasPostLearning = (phase.postLearningQuizzes || []).length > 0;
          const totalKnowledgeCount = knowledgeItems.length;
          const passedKnowledgeCount = knowledgeItems.filter((knowledge) =>
            (knowledge?.quizzes || []).some((quiz) => quiz?.myPassed === true)
          ).length;
          const preLearningQuizzes = phase.preLearningQuizzes || [];
          const hasAttemptedPreLearning = preLearningQuizzes.some((quiz) => {
            const attempted = quiz?.myAttempted === true;
            const passed = quiz?.myPassed === true;
            const status = String(quiz?.status || "").toUpperCase();
            return attempted || passed || status === "COMPLETED";
          });
          const shouldShowCreatePhaseContentAction = hasPreLearning
            && hasAttemptedPreLearning
            && !hasKnowledge
            && !isGeneratingKnowledge;
          const isSkipPreLearningPhase = skipPreLearningPhaseIds.includes(normalizedPhaseId);
          const isOpenPhase = Number(effectiveOpenPhaseId) === normalizedPhaseId;
          const isDecisionHandled = decisionHandledPhaseIds.includes(normalizedPhaseId);
          const isPhaseDecisionReady = isOpenPhase
            && decisionState.phaseId === normalizedPhaseId
            && decisionState.assessmentStatus === "READY"
            && Boolean(decisionState.assessmentData);
          const canRenderPreLearningDecisionCard = isStudyNewRoadmap
            && hasPreLearning
            && !hasKnowledge
            && !isSkipPreLearningPhase
            && isPhaseDecisionReady;
          const isGeneratingKnowledgeForPhase = generatingKnowledgePhaseIds.includes(normalizedPhaseId)
            || generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId);
          const canShowSkipDecision = canRenderPreLearningDecisionCard
            && decisionState.currentPhaseProgress?.skipable === true
            && !isDecisionHandled;
          const shouldShowPreLearningDecision = isStudyNewRoadmap && !hasPreLearning && !hasKnowledge;
          const shouldShowKnowledgePlaceholder = !hasKnowledge && isGeneratingPhaseContent;
          const shouldShowPreLearningPlaceholder = !hasPreLearning
            && isGeneratingPreLearning
            && !isSkipPreLearningPhase
            && !shouldShowPreLearningDecision;
          const shouldShowPostLearningPlaceholder = !hasPostLearning && isGeneratingPhaseContent;
          const shouldLockPostLearning = false;
          return (
            <div key={phase.phaseId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
              <button
                type="button"
                onClick={() => togglePhase(phase.phaseId)}
                className={`w-full px-4 py-4 flex flex-col items-stretch gap-3 text-left hover:bg-slate-50`}
              >
                <div className="min-w-0 w-full">
                  <p className={`text-xs uppercase tracking-[0.15em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    {t("workspace.roadmap.canvas.phase", "Phase")} {Number(phase?.phaseIndex ?? 0) + 1}
                  </p>
                  <h3 className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{phase.title}</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{phase.description}</p>
                  {phase?.aiSuggest ? (
                    <div className={`mt-2 rounded-md p-3 text-sm ${isDarkMode ? "bg-slate-800/40 border border-slate-700 text-slate-200" : "bg-slate-50 border border-slate-200 text-gray-700"}`}>
                      <p className={`font-medium mb-1 ${fontClass}`}>{t('workspace.roadmap.phaseAiSuggestTitle', 'AI suggestion')}</p>
                      <p className={`${fontClass} text-[13px] leading-snug`}>{phase.aiSuggest}</p>
                    </div>
                  ) : null}
                </div>
                <div className="w-full flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                    {phase?.durationLabel || `${Number(phase?.estimatedDays) || 0} ${t("workspace.roadmap.days", "days")} • ${Number(phase?.estimatedMinutesPerDay) || 0} ${t("workspace.roadmap.minutesPerDayShort", "min/day")}`}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
                    isCompletedPhase
                      ? (isDarkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-green-100 text-green-800")
                      : isProcessingPhase
                      ? (isDarkMode ? "bg-amber-950/60 text-amber-300" : "bg-amber-100 text-amber-800")
                      : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700")
                  }`}>
                    {isCompletedPhase ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isProcessingPhase ? (
                      <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                    {phaseStatusLabel}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </button>

              {isOpen ? (
                <div className={`border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="px-4 py-3 space-y-4">
                    {hasPreLearning && !isSkipPreLearningPhase ? (
                    <div>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                      </h4>
                      <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                        {t("workspace.roadmap.preLearningHelper", "Please complete pre-learning so AI can tailor the roadmap to your level.")}
                      </p>
                      <QuizListView
                        isDarkMode={isDarkMode}
                        contextType="PHASE"
                        contextId={phase.phaseId}
                        onCreateQuiz={() => onCreatePhasePreLearning?.(phase.phaseId, { skipPreLearning: false })}
                        onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                        onShareQuiz={onShareQuiz}
                        embedded
                        hideCreateButton
                        title={t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                        intentFilter={["PRE_LEARNING"]}
                        refreshToken={quizRefreshToken}
                        returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                      />

                      {canRenderPreLearningDecisionCard ? (
                        <div className={`mt-3 rounded-lg border p-4 ${isDarkMode ? "border-blue-700/70 bg-blue-900/20" : "border-blue-200 bg-blue-50/70"}`}>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-800"} ${fontClass}`}>
                            {t("workspace.quiz.result.preLearningDecisionTitle", "Decision after Pre-learning")}
                          </p>

                          {decisionState.loadingCurrentPhase ? (
                            <p className={`mt-2 text-sm ${isDarkMode ? "text-blue-300/90" : "text-blue-700/90"} ${fontClass}`}>
                              {t("workspace.quiz.result.loadingCurrentPhase", "Checking your current phase...")}
                            </p>
                          ) : null}

                          {!decisionState.loadingCurrentPhase && canShowSkipDecision ? (
                            <div className="mt-3 space-y-3">
                              <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-200" : "text-slate-700"} ${fontClass}`}>
                                {t("workspace.quiz.result.skipPhaseEligibleHint", "You are eligible to skip this phase. Do you want to skip or continue practicing?")}
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  type="button"
                                  disabled={submittingSkipDecision || isGeneratingKnowledgeForPhase}
                                  onClick={() => void handleRoadmapPreLearningDecision(normalizedPhaseId, true)}
                                  className="min-w-[180px] gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95"
                                >
                                  {(submittingSkipDecision && !isGeneratingKnowledgeForPhase)
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                  {t("workspace.quiz.result.skipPhaseAction", "Skip this phase")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={submittingSkipDecision || isGeneratingKnowledgeForPhase || isDecisionHandled}
                                  onClick={() => void handleRoadmapPreLearningDecision(normalizedPhaseId, false)}
                                  className="min-w-[220px] gap-2 transition-all active:scale-95"
                                >
                                  {(submittingSkipDecision || isGeneratingKnowledgeForPhase)
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Sparkles className="w-4 h-4" />}
                                  {isDecisionHandled
                                    ? t("workspace.quiz.result.generateKnowledgeDone", "Knowledge request sent")
                                    : t("workspace.quiz.result.continuePracticeAction", "Continue practicing")}
                                </Button>
                              </div>
                            </div>
                          ) : null}

                          {!decisionState.loadingCurrentPhase && !canShowSkipDecision ? (
                            <div className="mt-3">
                              <Button
                                type="button"
                                onClick={() => void handleRoadmapPreLearningDecision(normalizedPhaseId, false)}
                                disabled={submittingSkipDecision || isGeneratingKnowledgeForPhase || isDecisionHandled}
                                className="min-w-[220px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95"
                              >
                                {(submittingSkipDecision || isGeneratingKnowledgeForPhase)
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Sparkles className="w-4 h-4" />}
                                {isDecisionHandled
                                  ? t("workspace.quiz.result.generateKnowledgeDone", "Knowledge request sent")
                                  : t("workspace.quiz.result.generateKnowledgeAction", "Generate practice knowledge")}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* {shouldShowCreatePhaseContentAction ? (
                        <details className={`mt-3 rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"}`}>
                          <summary className={`cursor-pointer list-none px-3 py-2 text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                            {t("workspace.roadmap.nextStepTitle", "Next step")}
                          </summary>
                          <div className="px-3 pb-3">
                            <Button
                              type="button"
                              onClick={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white transition-all active:scale-95"
                            >
                              {t("workspace.roadmap.createKnowledgeAndPostLearning", "Generate knowledge and post-learning")}
                            </Button>
                          </div>
                        </details>
                      ) : null} */}
                    </div>
                    ) : shouldShowPreLearningPlaceholder ? (
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                        </h4>
                        {renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingPreLearning", "AI is generating pre-learning for this phase..."),
                          false,
                          progressTracking?.getPreLearningProgress(Number(phase?.phaseId)) ?? 0
                        )}
                      </div>
                    ) : null}

                  </div>

                  {/* Knowledge Items */}
                  {hasKnowledge && (
                    <div className={`border-t mt-2 pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className="space-y-1">
                        {(phase.knowledges || []).map((knowledge) => {
                          const knowledgeKey = `${phase.phaseId}:${knowledge.knowledgeId}`;
                          const isKnowledgeOpen = Boolean(openKnowledgeMap[knowledgeKey]);
                          const knowledgeTargetDay = Number(knowledge?.targetDayIndex) || 0;
                          const knowledgePlannedMinutes = Number(knowledge?.plannedStudyMinutes) || 0;
                          const knowledgeTimeLabel = knowledgeTargetDay > 0 && knowledgePlannedMinutes > 0
                            ? `${t("workspace.roadmap.day", "Day")} ${knowledgeTargetDay} • ${knowledgePlannedMinutes} ${t("workspace.roadmap.minutes", "min")}`
                            : knowledgeTargetDay > 0
                            ? `${t("workspace.roadmap.day", "Day")} ${knowledgeTargetDay}`
                            : knowledgePlannedMinutes > 0
                            ? `${knowledgePlannedMinutes} ${t("workspace.roadmap.minutes", "min")}`
                            : "";
                          return (
                            <div key={knowledge.knowledgeId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors"}`}>
                              <button
                                type="button"
                                onClick={() => toggleKnowledge(phase.phaseId, knowledge.knowledgeId)}
                                className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{knowledge.title}</p>
                                    {knowledgeTimeLabel ? (
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                                        {knowledgeTimeLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isKnowledgeOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                              </button>

                              {isKnowledgeOpen ? (
                                <div className="px-4 pb-2">
                                  {renderKnowledgeContent(phase, knowledge)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {shouldShowKnowledgePlaceholder && !shouldShowPreLearningDecision ? (
                    <div className={`border-t mt-2 pt-3 px-4 pb-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.knowledge", "Knowledge")}
                      </h4>
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                        false,
                        progressTracking?.getKnowledgeProgress(Number(phase?.phaseId)) ?? 0
                      )}
                    </div>
                  ) : null}

                  {hasPostLearning ? (
                    <div className={`mt-2 px-4 py-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                        </h4>
                        <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                          {t("workspace.roadmap.postLearningHelper", "Complete post-learning to evaluate your mastery after finishing this phase.")}
                        </p>
                        <p className={`text-xs mb-2 ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                          {t("workspace.roadmap.postLearningProgress", "Unlock progress: {{passed}}/{{total}} knowledge items are eligible.", {
                            passed: passedKnowledgeCount,
                            total: totalKnowledgeCount,
                          })}
                        </p>
                        {shouldLockPostLearning ? (
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                            {t("workspace.roadmap.postLearningLocked", "Each knowledge item must pass at least one practice quiz to unlock post-learning.")}
                          </p>
                        ) : null}
                        <div className={shouldLockPostLearning ? "opacity-50 pointer-events-none select-none" : ""}>
                          <QuizListView
                            isDarkMode={isDarkMode}
                            contextType="PHASE"
                            contextId={phase.phaseId}
                            onCreateQuiz={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                            onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", phaseId: Number(phase.phaseId) } })}
                            onShareQuiz={onShareQuiz}
                            embedded
                            hideCreateButton
                            title={t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                            intentFilter={["POST_LEARNING"]}
                            refreshToken={quizRefreshToken}
                            returnToPath={roadmap?.workspaceId ? `/workspace/${roadmap.workspaceId}/roadmap?phaseId=${phase.phaseId}` : null}
                          />
                        </div>
                      </div>
                    </div>
                  ) : shouldShowPostLearningPlaceholder ? (
                    <div className={`mt-2 px-4 py-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                      </h4>
                      {renderLoadingPlaceholder(
                        t("workspace.roadmap.generatingPostLearning", "AI is generating post-learning for this phase..."),
                        false,
                        progressTracking?.getPostLearningProgress(Number(phase?.phaseId)) ?? 0
                      )}
                    </div>
                  ) : null}

                  {shouldShowPreLearningDecision && (
                    <div className={`border-t mt-2 pt-4 px-4 pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                        {isGeneratingKnowledge ? (
                          <div className="space-y-2">
                            {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                              t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                              true,
                              phaseKnowledgePercent
                            ) : null}
                            {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                              t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                              true,
                              phaseKnowledgePercent
                            ) : null}
                          </div>
                        ) : isGeneratingPreLearning ? (
                          renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingPreLearning", "AI is generating pre-learning for this phase..."),
                            true,
                            phasePreLearningPercent
                          )
                        ) : (
                          <div className="flex flex-col gap-3">
                            <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                              {t("workspace.roadmap.preLearningPrompt", "How would you like to start this phase?")}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => onCreatePhasePreLearning?.(phase.phaseId, { skipPreLearning: false })}
                                className={`${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                              >
                                {t("workspace.roadmap.studyNew.hasFoundation", "I already have foundation in this phase")}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => onCreatePhaseKnowledge?.(phase.phaseId, { skipPreLearning: true })}
                                className="bg-[#2563EB] hover:bg-blue-700 text-white"
                              >
                                {t("workspace.roadmap.studyNew.noBackground", "I am new to this phase")}
                              </Button>
                            </div>
                            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                              {t("workspace.roadmap.studyNew.preLearningNote", "If you score 90%+ in pre-learning, this phase may be skipped.")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!hasKnowledge && hasPreLearning && isGeneratingKnowledge && (
                    <div className={`border-t mt-2 pt-4 px-4 pb-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className={`rounded-lg border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                        <div className="space-y-2">
                          {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                            true,
                            phaseKnowledgePercent
                          ) : null}
                          {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                            t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                            true,
                            phaseKnowledgePercent
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Placeholder tổng ở cuối đang bị trùng với placeholder trong từng knowledge item nên tạm thời tắt. */}
                  {/* {isGeneratingKnowledge && hasKnowledge && (
                    <div className={`border-t px-4 py-3 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className="space-y-1">
                        {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                          true,
                          phaseKnowledgePercent
                        ) : null}
                        {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                          true,
                          phaseKnowledgePercent
                        ) : null}
                      </div>
                    </div>
                  )} */}
                </div>
              ) : null}
            </div>
          );
        }) : null}
      </div>
    </div>
  );
}

export default RoadmapCanvasView2;
