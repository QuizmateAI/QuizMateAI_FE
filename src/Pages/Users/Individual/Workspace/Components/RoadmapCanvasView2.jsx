import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
import QuizListView from "./QuizListView";
import { useToast } from "@/context/ToastContext";
import {
  getCurrentRoadmapPhaseProgress,
  getPhaseProgressReview,
  submitRoadmapPhaseRemedialDecision,
} from "@/api/RoadmapPhaseAPI";
import { getCurrentRoadmapKnowledgeProgress } from "@/api/RoadmapAPI";
import { useRoadmapPreLearningDecision } from "../hooks/useRoadmapPreLearningDecision";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Eye,
  Share2,
  Loader2,
  Pencil,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";
import { buildWorkspaceRoadmapsPath } from "@/lib/routePaths";

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
  onReloadRoadmap,
  progressTracking = null,
  onShareRoadmap,
  onShareQuiz,
  onViewRoadmapConfig,
  onEditRoadmapConfig,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [openPhaseId, setOpenPhaseId] = useState(null);
  const [submittingRemedialDecision, setSubmittingRemedialDecision] = useState(false);
  const [remedialState, setRemedialState] = useState({
    phaseId: null,
    loadingCurrentPhase: false,
    currentPhaseProgress: null,
  });
  const [globalCurrentPhasePayload, setGlobalCurrentPhasePayload] = useState(null);
  const [currentKnowledgePayload, setCurrentKnowledgePayload] = useState(null);
  const [loadingGlobalCurrentPhase, setLoadingGlobalCurrentPhase] = useState(false);
  const [optimisticUnlockedPhaseIds, setOptimisticUnlockedPhaseIds] = useState([]);
  const [unlockingPhaseIds, setUnlockingPhaseIds] = useState([]);
  const progressSyncDebounceRef = useRef(null);
  const phaseFocusDebounceRef = useRef(null);

  const loadGlobalCurrentPhaseProgress = useCallback(async () => {
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) return;
    
    setLoadingGlobalCurrentPhase(true);
    try {
      const response = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
      const payload = response?.data?.data || response?.data || null;
      setGlobalCurrentPhasePayload(payload);
    } catch (e) {
      console.error("Failed to load global current phase progress", e);
    } finally {
      setLoadingGlobalCurrentPhase(false);
    }
  }, [roadmap?.roadmapId]);

  const loadCurrentKnowledgeProgress = useCallback(async () => {
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
      setCurrentKnowledgePayload(null);
      return;
    }

    try {
      const response = await getCurrentRoadmapKnowledgeProgress(normalizedRoadmapId);
      const payload = response?.data?.data || response?.data || response || null;
      setCurrentKnowledgePayload(payload && typeof payload === "object" ? payload : null);
    } catch (error) {
      console.error("Failed to load current roadmap knowledge progress", error);
      setCurrentKnowledgePayload(null);
    }
  }, [roadmap?.roadmapId]);

  useEffect(() => {
    if (progressSyncDebounceRef.current) {
      window.clearTimeout(progressSyncDebounceRef.current);
    }

    progressSyncDebounceRef.current = window.setTimeout(() => {
      void loadGlobalCurrentPhaseProgress();
      void loadCurrentKnowledgeProgress();
      progressSyncDebounceRef.current = null;
    }, 220);

    return () => {
      if (progressSyncDebounceRef.current) {
        window.clearTimeout(progressSyncDebounceRef.current);
      }
    };
  }, [loadGlobalCurrentPhaseProgress, loadCurrentKnowledgeProgress, roadmap?.roadmapId, selectedPhaseId, openPhaseId]);
  const [phaseReviewState, setPhaseReviewState] = useState({
    loading: false,
    data: null,
    phaseId: null,
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

  const isPhaseFinishedStatus = useCallback((phaseStatus) => {
    const normalizedStatus = String(phaseStatus || "").toUpperCase();
    return normalizedStatus === "COMPLETED" || normalizedStatus === "SKIPPED";
  }, []);

  const maxUnlockedPhaseIndex = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return 0;

    const globalPhaseId = Number(globalCurrentPhasePayload?.phaseId);
    const globalCurrentIndex = Number.isInteger(globalPhaseId)
      ? phases.findIndex((p) => Number(p.phaseId) === globalPhaseId)
      : -1;

    let contiguousFinishedCount = 0;
    for (let index = 0; index < phases.length; index += 1) {
      if (!isPhaseFinishedStatus(phases[index]?.status)) break;
      contiguousFinishedCount += 1;
    }
    const unlockedByStatusIndex = Math.min(phases.length - 1, contiguousFinishedCount);

    const unlockedByOptimisticIndex = (optimisticUnlockedPhaseIds || []).reduce((maxIndex, phaseId) => {
      const normalizedPhaseId = Number(phaseId);
      if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return maxIndex;
      const phaseIndex = phases.findIndex((phase) => Number(phase?.phaseId) === normalizedPhaseId);
      if (phaseIndex < 0) return maxIndex;
      return Math.max(maxIndex, phaseIndex);
    }, -1);

    if (isStudyNewRoadmap) {
      const unlockedByManualProgressIndex = phases.reduce((maxIndex, phase, index) => {
        const hasPreLearning = Array.isArray(phase?.preLearningQuizzes) && phase.preLearningQuizzes.length > 0;
        const hasKnowledge = Array.isArray(phase?.knowledges) && phase.knowledges.length > 0;
        const hasPostLearning = Array.isArray(phase?.postLearningQuizzes) && phase.postLearningQuizzes.length > 0;
        const isFinished = isPhaseFinishedStatus(phase?.status);

        if (hasPreLearning || hasKnowledge || hasPostLearning || isFinished) {
          return Math.max(maxIndex, index);
        }

        return maxIndex;
      }, 0);

      return Math.max(0, unlockedByManualProgressIndex, unlockedByOptimisticIndex);
    }

    return Math.max(0, globalCurrentIndex, unlockedByStatusIndex, unlockedByOptimisticIndex);
  }, [
    globalCurrentPhasePayload?.phaseId,
    isPhaseFinishedStatus,
    isStudyNewRoadmap,
    optimisticUnlockedPhaseIds,
    phases,
  ]);

  const isCurrentPayloadFinished = useMemo(() => {
    return isPhaseFinishedStatus(globalCurrentPhasePayload?.status);
  }, [globalCurrentPhasePayload?.status, isPhaseFinishedStatus]);

  const currentPayloadPhaseId = Number(globalCurrentPhasePayload?.phaseId);
  const currentPayloadPhaseIndexRaw = Number(globalCurrentPhasePayload?.phaseIndex);
  const currentPayloadPhaseIndex = Number.isInteger(currentPayloadPhaseIndexRaw)
    ? (currentPayloadPhaseIndexRaw > 0 ? currentPayloadPhaseIndexRaw - 1 : currentPayloadPhaseIndexRaw)
    : -1;
  const currentKnowledgePhaseId = Number(currentKnowledgePayload?.phaseId);
  const currentKnowledgeId = Number(currentKnowledgePayload?.knowledgeId);
  const currentKnowledgeStatus = String(currentKnowledgePayload?.status || "").toUpperCase();
  const isCurrentKnowledgeDoneStatus = ["DONE", "COMPLETED"].includes(currentKnowledgeStatus);
  const currentKnowledgePhaseIndex = Number.isInteger(currentKnowledgePhaseId)
    ? phases.findIndex((phase) => Number(phase?.phaseId) === currentKnowledgePhaseId)
    : -1;

  const isPhaseVisuallyCompleted = useCallback((phase, phaseIndex) => {
    if (!phase) return false;
    if (isPhaseFinishedStatus(phase?.status)) return true;

    const normalizedPhaseIndex = Number(phaseIndex);
    if (Number.isInteger(normalizedPhaseIndex) && normalizedPhaseIndex >= 0 && normalizedPhaseIndex < maxUnlockedPhaseIndex) {
      return true;
    }

    const normalizedPhaseId = Number(phase?.phaseId);
    const completedByCurrentPayload = isCurrentPayloadFinished
      && Number.isInteger(currentPayloadPhaseId)
      && currentPayloadPhaseId > 0
      && Number.isInteger(normalizedPhaseId)
      && normalizedPhaseId > 0
      && (
        currentPayloadPhaseId === normalizedPhaseId
        || (
          Number.isInteger(currentPayloadPhaseIndex)
          && currentPayloadPhaseIndex > normalizedPhaseIndex
        )
      );

    return completedByCurrentPayload;
  }, [
    currentPayloadPhaseId,
    currentPayloadPhaseIndex,
    isCurrentPayloadFinished,
    isPhaseFinishedStatus,
    maxUnlockedPhaseIndex,
  ]);

  useEffect(() => {
    setOptimisticUnlockedPhaseIds([]);
    setUnlockingPhaseIds([]);
  }, [roadmap?.roadmapId]);

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

  const {
    decisionState,
    submittingSkipDecision,
    decisionHandledPhaseIds,
    canShowSkipDecision,
    canShowGenerateKnowledgeFallback,
    shouldRenderDecisionCard,
    handleRoadmapPreLearningDecision,
  } = useRoadmapPreLearningDecision({
    roadmap,
    activePhase,
    onCreatePhaseKnowledge,
    onSkipSuccess: async () => {
      await onReloadRoadmap?.();
      await loadGlobalCurrentPhaseProgress();
    },
    showError,
    showSuccess,
    t,
  });

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

  const canShowRoadmapLevelFeedback = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return false;

    const allPhasesFinished = phases.every((phase) => isPhaseFinishedStatus(phase?.status));

    const postLearningSatisfied = phases.every((phase) => {
      const pl = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];
      if (pl.length === 0) return true;
      return hasCompletedPostLearning(phase);
    });

    return allPhasesFinished && postLearningSatisfied;
  }, [phases, isPhaseFinishedStatus, hasCompletedPostLearning]);

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
  }, [activePhase?.phaseId, roadmap?.roadmapId]);

  useEffect(() => {
    void syncPhaseReview();
  }, [syncPhaseReview, activePhase?.phaseId]);

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

  useEffect(() => {
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    const normalizedPhaseId = Number(activePhase?.phaseId);
    const hasPostLearning = (activePhase?.postLearningQuizzes || []).length > 0;
    const canCheckRemedial = Number.isInteger(normalizedRoadmapId)
      && normalizedRoadmapId > 0
      && Number.isInteger(normalizedPhaseId)
      && normalizedPhaseId > 0
      && hasPostLearning
      && normalizedAdaptationMode === "FLEXIBLE";

    if (!canCheckRemedial) {
      setRemedialState({
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: false,
        currentPhaseProgress: null,
      });
      return;
    }

    let cancelled = false;
    setRemedialState({
      phaseId: normalizedPhaseId,
      loadingCurrentPhase: true,
      currentPhaseProgress: null,
    });

    (async () => {
      try {
        const response = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
        if (cancelled) return;
        const payload = response?.data?.data || response?.data || null;
        setRemedialState({
          phaseId: normalizedPhaseId,
          loadingCurrentPhase: false,
          currentPhaseProgress: payload,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load remedial decision state:", error);
        setRemedialState({
          phaseId: normalizedPhaseId,
          loadingCurrentPhase: false,
          currentPhaseProgress: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activePhase?.phaseId,
    activePhase?.postLearningQuizzes,
    normalizedAdaptationMode,
    roadmap?.roadmapId,
  ]);

  const handleRoadmapRemedialDecision = useCallback(async (phaseId, option) => {
    const normalizedPhaseId = Number(phaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0 || submittingRemedialDecision) return;

    setSubmittingRemedialDecision(true);
    try {
      await submitRoadmapPhaseRemedialDecision(normalizedPhaseId, option);
      showSuccess(t("workspace.quiz.result.remedialDecisionSuccess", "Remedial roadmap option has been confirmed."));
      onReloadRoadmap?.();

      const normalizedRoadmapId = Number(roadmap?.roadmapId);
      if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
        try {
          const response = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
          const payload = response?.data?.data || response?.data || null;
          setRemedialState({
            phaseId: normalizedPhaseId,
            loadingCurrentPhase: false,
            currentPhaseProgress: payload,
          });
        } catch (refreshError) {
          console.error("Failed to refresh remedial decision state:", refreshError);
        }
      }
    } catch (error) {
      console.error("Failed to submit remedial decision:", error);
      showError(error?.message || t("workspace.quiz.result.remedialDecisionFail", "Could not update remedial roadmap decision."));
    } finally {
      setSubmittingRemedialDecision(false);
    }
  }, [onReloadRoadmap, roadmap?.roadmapId, showError, showSuccess, submittingRemedialDecision, t]);

  const togglePhase = (phaseId) => {
    setOpenPhaseId((current) => {
      const next = current === phaseId ? null : phaseId;
      if (next) {
        if (phaseFocusDebounceRef.current) {
          window.clearTimeout(phaseFocusDebounceRef.current);
        }

        phaseFocusDebounceRef.current = window.setTimeout(() => {
          onPhaseFocus?.(next, { preserveActiveView: true });
          phaseFocusDebounceRef.current = null;
        }, 180);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (phaseFocusDebounceRef.current) {
        window.clearTimeout(phaseFocusDebounceRef.current);
      }
      if (progressSyncDebounceRef.current) {
        window.clearTimeout(progressSyncDebounceRef.current);
      }
    };
  }, []);

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
    const shouldShowCreateKnowledgeQuizButton = canCreateKnowledgeQuiz && !hasQuizzes;
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
              {shouldShowCreateKnowledgeQuizButton ? (
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
                      onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", roadmapId: Number(roadmap?.roadmapId), phaseId: Number(phase.phaseId) } })}
                      embedded
                      legacyRoadmapUI
                      hideCreateButton
                      title={t("workspace.roadmap.canvas.quiz", "Quiz")}
                      refreshToken={(Number(quizRefreshToken) || 0) + targetedKnowledgeRefreshToken}
                      returnToPath={roadmap?.workspaceId ? buildWorkspaceRoadmapsPath(roadmap.workspaceId, phase.phaseId) : null}
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
            {roadmap?.description ? (
              <details className="group">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                        {roadmap?.title}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform group-open:rotate-180 shrink-0 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                  </div>
                </summary>
                <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  {roadmap.description}
                </p>
              </details>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                  {roadmap?.title}
                </p>
              </div>
            )}
            {roadmap?.aiSuggest ? (
              <details className={`group mt-3 rounded-md p-3 text-sm ${isDarkMode ? "bg-yellow-950/30 border border-yellow-800 text-yellow-200" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
                <summary className="list-none cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium ${fontClass}`}>{t("workspace.roadmap.aiSuggestTitle", "AI suggestion")}</p>
                    <ChevronDown className={`w-4 h-4 transition-transform group-open:rotate-180 ${isDarkMode ? "text-yellow-100" : "text-yellow-800"}`} />
                  </div>
                </summary>
                <p className={`${fontClass} mt-2 text-[13px] leading-snug`}>{roadmap.aiSuggest}</p>
              </details>
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
          {roadmap?.roadmapId || onViewRoadmapConfig || onEditRoadmapConfig || (onShareRoadmap && roadmap?.roadmapId) ? (
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {roadmap?.roadmapId && canShowRoadmapLevelFeedback ? (
                <DirectFeedbackButton
                  targetType="ROADMAP"
                  targetId={roadmap.roadmapId}
                  label={i18n.language === "en" ? "Feedback" : "Phản hồi"}
                  isDarkMode={isDarkMode}
                  className={`shrink-0 rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
                  title={i18n.language === "en" ? "Roadmap feedback" : "Phản hồi lộ trình"}
                />
              ) : null}
              {onViewRoadmapConfig ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onViewRoadmapConfig}
                  className={`shrink-0 rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t("workspace.roadmap.viewConfig", "View config")}
                </Button>
              ) : null}
              {onEditRoadmapConfig ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditRoadmapConfig}
                  className={`shrink-0 rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t("workspace.roadmap.editConfigAction", "Edit")}
                </Button>
              ) : null}
              {onShareRoadmap && roadmap?.roadmapId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onShareRoadmap(roadmap)}
                className={`shrink-0 rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t("home.actions.share", "Share")}
              </Button>
              ) : null}
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
          const phaseIndex = phases.findIndex((p) => Number(p.phaseId) === normalizedPhaseId);

          const hasExistingPreLearning = Array.isArray(phase?.preLearningQuizzes)
            && phase.preLearningQuizzes.length > 0;
          const isLockedPhase = phaseIndex > maxUnlockedPhaseIndex && !hasExistingPreLearning;
          const previousPhaseCompleted = phaseIndex > 0
            ? (() => {
              const previousPhase = phases[phaseIndex - 1] || null;
              const previousPhaseId = Number(previousPhase?.phaseId);
              const previousFromPhaseList = isPhaseFinishedStatus(previousPhase?.status);

              const previousFromCurrentPayloadById = isCurrentPayloadFinished
                && Number.isInteger(currentPayloadPhaseId)
                && currentPayloadPhaseId > 0
                && currentPayloadPhaseId === previousPhaseId;

              const previousFromCurrentPayloadByIndex = isCurrentPayloadFinished
                && Number.isFinite(currentPayloadPhaseIndex)
                && currentPayloadPhaseIndex >= 0
                && currentPayloadPhaseIndex >= (phaseIndex - 1);

              return previousFromPhaseList || previousFromCurrentPayloadById || previousFromCurrentPayloadByIndex;
            })()
            : true;
          const isUnlockingPhase = unlockingPhaseIds.includes(normalizedPhaseId);
          const isUnlockable = isLockedPhase
            && phaseIndex === maxUnlockedPhaseIndex + 1
            && previousPhaseCompleted
            && !isUnlockingPhase;

          const normalizedPhaseStatus = String(phase?.status || "").toUpperCase();
          const isCompletedPhase = isPhaseVisuallyCompleted(phase, phaseIndex);
          const isGeneratingPhaseContent = generatingKnowledgePhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizPhaseIds.includes(Number(phase.phaseId));
          const isGeneratingKnowledge = isGeneratingPhaseContent || isGeneratingKnowledgeQuiz;
          const isGeneratingPreLearning = generatingPreLearningPhaseIds.includes(normalizedPhaseId);
          const phaseKnowledgePercent = progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0;
          const phasePreLearningPercent = progressTracking?.getPreLearningProgress(normalizedPhaseId) ?? 0;
          const phasePostLearningPercent = progressTracking?.getPostLearningProgress(normalizedPhaseId) ?? 0;
          const phaseProcessingPercent = Math.max(phaseKnowledgePercent, phasePreLearningPercent, phasePostLearningPercent, 0);
          const isProcessingPhase = !isCompletedPhase && (
            normalizedPhaseStatus === "PROCESSING"
            || isGeneratingPhaseContent
            || isGeneratingKnowledgeQuiz
            || isGeneratingPreLearning
          );
          const phaseStatusLabel = isLockedPhase
            ? t("workspace.quiz.statusLabels.LOCKED", "Locked")
            : isCompletedPhase
            ? t("workspace.quiz.statusLabels.COMPLETED", "Completed")
            : isProcessingPhase
            ? t("workspace.quiz.statusLabels.PROCESSING", "Processing")
            : t("workspace.quiz.statusLabels.ACTIVE", "Active");
          const hasKnowledge = (phase.knowledges || []).length > 0;
          const knowledgeItems = phase.knowledges || [];
          const hasPreLearning = (phase.preLearningQuizzes || []).length > 0;
          const hasPostLearning = (phase.postLearningQuizzes || []).length > 0;
          const totalKnowledgeCount = knowledgeItems.length;
          const isSkipPreLearningPhase = skipPreLearningPhaseIds.includes(normalizedPhaseId);
          const isOpenPhase = Number(effectiveOpenPhaseId) === normalizedPhaseId;
          const isDecisionHandled = decisionHandledPhaseIds.includes(normalizedPhaseId);
          const isGeneratingKnowledgeForPhase = generatingKnowledgePhaseIds.includes(normalizedPhaseId)
            || generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId);
          const canRenderPreLearningDecisionCard = isOpenPhase
            && shouldRenderDecisionCard
            && decisionState.phaseId === normalizedPhaseId
            && !isGeneratingKnowledgeForPhase;
          const shouldShowPreLearningDecision = isStudyNewRoadmap
            && !hasPreLearning
            && !hasKnowledge
            && !isSkipPreLearningPhase;
          const shouldShowKnowledgePlaceholder = !hasKnowledge && isGeneratingPhaseContent;
          const shouldShowPreLearningPlaceholder = !hasPreLearning
            && isGeneratingPreLearning
            && !isGeneratingPhaseContent
            && !isSkipPreLearningPhase
            && !canRenderPreLearningDecisionCard;
          const shouldShowPostLearningPlaceholder = !hasPostLearning && isGeneratingPhaseContent;
          const currentKnowledgeIndexInPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
            ? knowledgeItems.findIndex((knowledge) => Number(knowledge?.knowledgeId) === currentKnowledgeId)
            : -1;
          const isPhaseBeforeCurrentKnowledge = currentKnowledgePhaseIndex >= 0 && phaseIndex < currentKnowledgePhaseIndex;
          const completedKnowledgeCount = knowledgeItems.reduce((count, _knowledge, knowledgeIndex) => {
            const isKnowledgeCompleted = isPhaseFinishedStatus(phase.status)
              || isPhaseBeforeCurrentKnowledge
              || (phaseIndex === currentKnowledgePhaseIndex && currentKnowledgeIndexInPhase >= 0 && (
                knowledgeIndex < currentKnowledgeIndexInPhase
                || (knowledgeIndex === currentKnowledgeIndexInPhase && isCurrentKnowledgeDoneStatus)
              ));
            return isKnowledgeCompleted ? count + 1 : count;
          }, 0);
          const shouldLockPostLearning = hasPostLearning
            && !isPhaseFinishedStatus(phase.status)
            && totalKnowledgeCount > 0
            && completedKnowledgeCount < totalKnowledgeCount;
          const isFlexibleRoadmap = normalizedAdaptationMode === "FLEXIBLE";
          const isCurrentRemedialPhase = Number(remedialState?.phaseId) === normalizedPhaseId;
          const currentRemedialPhaseId = Number(remedialState?.currentPhaseProgress?.phaseId);
          const canShowRemedialDecision = hasPostLearning
            && isFlexibleRoadmap
            && isCurrentRemedialPhase
            && !remedialState.loadingCurrentPhase
            && Number.isInteger(currentRemedialPhaseId)
            && currentRemedialPhaseId === normalizedPhaseId
            && remedialState?.currentPhaseProgress?.needsRemedialDecision === true;
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
                </div>
                <div className="w-full flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                    {phase?.durationLabel || `${Number(phase?.estimatedDays) || 0} ${t("workspace.roadmap.days", "days")} • ${Number(phase?.estimatedMinutesPerDay) || 0} ${t("workspace.roadmap.minutesPerDayShort", "min/day")}`}
                  </span>
                  {isCompletedPhase ? (
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                      isDarkMode
                        ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-200"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700"
                    }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("workspace.quiz.statusLabels.COMPLETED", "Completed")}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
                      isLockedPhase
                        ? (isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600")
                        : isProcessingPhase
                        ? (isDarkMode ? "bg-amber-950/60 text-amber-300" : "bg-amber-100 text-amber-800")
                        : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700")
                    }`}>
                      {isLockedPhase ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : isProcessingPhase ? (
                        <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                      {phaseStatusLabel}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </button>

              {isOpen ? (
                <div className={`relative border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  {isLockedPhase && (
                    <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-b-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white/50"}`}>
                      <div className={`p-4 rounded-xl shadow-lg border max-w-sm text-center ${isDarkMode ? "bg-slate-800 border-slate-700 shadow-blue-900/50" : "bg-white border-slate-300 shadow-slate-900/10"}`}>
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                          <Lock className={`w-6 h-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                        </div>
                        <h4 className={`text-base font-semibold mb-1 ${fontClass} ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {t("workspace.roadmap.canvas.phaseLockedTitle", "Phase này đang bị khóa")}
                        </h4>
                        <p className={`text-sm mb-4 ${fontClass} ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {t("workspace.roadmap.canvas.phaseLockedDesc", "Vui lòng mở khóa")}
                        </p>
                        <Button 
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!isUnlockable) return;

                            setOptimisticUnlockedPhaseIds((current) => {
                              if (current.includes(normalizedPhaseId)) return current;
                              return [...current, normalizedPhaseId];
                            });

                            if (isStudyNewRoadmap) {
                              return;
                            }

                            setUnlockingPhaseIds((current) => {
                              if (current.includes(normalizedPhaseId)) return current;
                              return [...current, normalizedPhaseId];
                            });

                            try {
                              await onCreatePhasePreLearning?.(phase.phaseId, { skipPreLearning: false });
                              void loadGlobalCurrentPhaseProgress();
                            } catch (error) {
                              setOptimisticUnlockedPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
                              showError(error?.message || t("workspace.roadmap.phaseUnlockFailed", "Không thể mở khóa phase này."));
                            } finally {
                              setUnlockingPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
                            }
                          }}
                          disabled={!isUnlockable}
                          className={`w-full font-medium ${fontClass} ${
                            isUnlockable 
                              ? "bg-blue-600 hover:bg-blue-700 text-white" 
                              : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          }`}
                        >
                          {isUnlockingPhase ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                          {isUnlockingPhase
                            ? t("workspace.roadmap.canvas.unlockingPhaseBtn", "Đang mở khóa...")
                            : t("workspace.roadmap.canvas.unlockPhaseBtn", "Mở khóa Phase")}
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="px-4 pt-1">
                    <DirectFeedbackButton
                      targetType="PHASE"
                      targetId={phase.phaseId}
                      label={i18n.language === "en" ? "Feedback" : "Phản hồi"}
                      isDarkMode={isDarkMode}
                      className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-slate-50 text-gray-700 hover:bg-slate-100"}`}
                      title={i18n.language === "en" ? "Phase feedback" : "Phản hồi phase"}
                    />
                  </div>
                  <div className={`px-4 py-3 space-y-4 ${isLockedPhase ? "opacity-30 pointer-events-none select-none blur-sm" : ""}`}>
                    {phase?.description ? (
                      <details className="group">
                        <summary className="list-none cursor-pointer">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"} ${fontClass}`}>
                              {t("workspace.roadmap.phaseDescriptionDropdown", "Mô tả phase")}
                            </p>
                            <ChevronDown className={`w-4 h-4 transition-transform group-open:rotate-180 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                          </div>
                        </summary>
                        <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                          {phase.description}
                        </p>
                      </details>
                    ) : null}

                    {phase?.aiSuggest ? (
                      <details className={`group rounded-md p-3 text-sm ${isDarkMode ? "bg-slate-800/40 border border-slate-700 text-slate-200" : "bg-slate-50 border border-slate-200 text-gray-700"}`}>
                        <summary className="list-none cursor-pointer">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium ${fontClass}`}>{t("workspace.roadmap.phaseAiSuggestTitle", "AI suggestion")}</p>
                            <ChevronDown className={`w-4 h-4 transition-transform group-open:rotate-180 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`} />
                          </div>
                        </summary>
                        <p className={`${fontClass} mt-2 text-[13px] leading-snug`}>{phase.aiSuggest}</p>
                      </details>
                    ) : null}

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
                        onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", roadmapId: Number(roadmap?.roadmapId), phaseId: Number(phase.phaseId) } })}
                        onShareQuiz={onShareQuiz}
                        embedded
                        legacyRoadmapUI
                        hideCreateButton
                        title={t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                        intentFilter={["PRE_LEARNING"]}
                        refreshToken={quizRefreshToken}
                        returnToPath={roadmap?.workspaceId ? buildWorkspaceRoadmapsPath(roadmap.workspaceId, phase.phaseId) : null}
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

                          {!decisionState.loadingCurrentPhase && canShowGenerateKnowledgeFallback ? (
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
                          const knowledgeIndex = knowledgeItems.findIndex(
                            (item) => Number(item?.knowledgeId) === Number(knowledge?.knowledgeId)
                          );
                          const isKnowledgeCompleted = isCompletedPhase
                            || isPhaseBeforeCurrentKnowledge
                            || (phaseIndex === currentKnowledgePhaseIndex && currentKnowledgeIndexInPhase >= 0 && (
                              knowledgeIndex < currentKnowledgeIndexInPhase
                              || (knowledgeIndex === currentKnowledgeIndexInPhase && isCurrentKnowledgeDoneStatus)
                            ));
                          const shouldUseSequentialFallbackLock = !isPhaseFinishedStatus(phase.status)
                            && phaseIndex === maxUnlockedPhaseIndex
                            && currentKnowledgePhaseIndex < 0
                            && currentKnowledgeIndexInPhase < 0
                            && knowledgeItems.length > 0;
                          const isKnowledgeLocked = !isPhaseFinishedStatus(phase.status)
                            && (
                              (
                                phaseIndex === currentKnowledgePhaseIndex
                                && currentKnowledgeIndexInPhase >= 0
                                && knowledgeIndex > currentKnowledgeIndexInPhase + (isCurrentKnowledgeDoneStatus ? 1 : 0)
                              )
                              || (
                                shouldUseSequentialFallbackLock
                                && knowledgeIndex > 0
                              )
                            );
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
                            <div key={knowledge.knowledgeId} className={`relative rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors"}`}>
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
                                <div className="shrink-0 flex items-center gap-2">
                                  {isKnowledgeCompleted ? (
                                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                                      isDarkMode
                                        ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-200"
                                        : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    }`}>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      {t("workspace.quiz.statusLabels.COMPLETED", "Completed")}
                                    </span>
                                  ) : null}
                                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isKnowledgeOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                                </div>
                              </button>

                              {isKnowledgeOpen && !isKnowledgeLocked ? (
                                <div className="px-4 pb-2">
                                  {renderKnowledgeContent(phase, knowledge)}
                                </div>
                              ) : isKnowledgeOpen && isKnowledgeLocked ? (
                                <div className="relative px-4 pb-2">
                                  <div className="opacity-50 pointer-events-none select-none">
                                    {renderKnowledgeContent(phase, knowledge)}
                                  </div>
                                  <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white/50"}`}>
                                    <div className={`rounded-xl border px-4 py-3 max-w-sm text-center ${fontClass} ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-white" : "border-slate-300 bg-white/95 text-slate-700"}`}>
                                      <div className={`flex items-center justify-center gap-2 text-base font-semibold ${fontClass}`}>
                                        <Lock className={`w-5 h-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                                        <span className={fontClass}>{t("workspace.roadmap.knowledgeLockedHint", "Please complete the previous knowledge first.")}</span>
                                      </div>
                                    </div>
                                  </div>
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
                    <div className={`relative mt-2 px-4 py-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      {shouldLockPostLearning ? (
                        <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-b-lg ${isDarkMode ? "bg-slate-900/45" : "bg-white/65"}`}>
                          <div className={`rounded-xl border px-4 py-3 max-w-sm text-center ${fontClass} ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-white" : "border-slate-300 bg-white/95 text-slate-700"}`}>
                            <div className={`flex items-center justify-center gap-2 text-base font-semibold ${fontClass}`}>
                              <Lock className={`w-5 h-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                              <span className={fontClass}>{t("workspace.roadmap.postLearningLocked", "Please complete all knowledge items in this phase to unlock post-learning.")}</span>
                            </div>
                            <p className={`mt-1 text-sm ${fontClass} ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                              {t("workspace.roadmap.postLearningUnlockProgress", "Knowledge progress to unlock: {{completed}}/{{total}}", {
                                completed: completedKnowledgeCount,
                                total: totalKnowledgeCount,
                              })}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                        </h4>
                        <div className={shouldLockPostLearning ? "opacity-50 pointer-events-none select-none" : ""}>
                          <QuizListView
                            isDarkMode={isDarkMode}
                            contextType="PHASE"
                            contextId={phase.phaseId}
                            onCreateQuiz={() => onCreatePhaseKnowledge?.(phase.phaseId)}
                            onViewQuiz={(quiz) => onViewQuiz?.(quiz, { backTarget: { view: "roadmap", roadmapId: Number(roadmap?.roadmapId), phaseId: Number(phase.phaseId) } })}
                            onShareQuiz={onShareQuiz}
                            embedded
                            legacyRoadmapUI
                            hideCreateButton
                            title={t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                            intentFilter={["POST_LEARNING"]}
                            refreshToken={quizRefreshToken}
                            returnToPath={roadmap?.workspaceId ? buildWorkspaceRoadmapsPath(roadmap.workspaceId, phase.phaseId) : null}
                          />
                        </div>

                        {remedialState.loadingCurrentPhase && isCurrentRemedialPhase && isFlexibleRoadmap ? (
                          <p className={`mt-2 text-xs ${isDarkMode ? "text-blue-300/90" : "text-blue-700/90"} ${fontClass}`}>
                            {t("workspace.quiz.result.loadingCurrentPhase", "Checking your current phase...")}
                          </p>
                        ) : null}

                        {canShowRemedialDecision ? (
                          <div className={`mt-3 rounded-lg border p-4 ${isDarkMode ? "border-blue-700/70 bg-blue-900/20" : "border-blue-200 bg-blue-50/70"}`}>
                            <p className={`text-sm font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-800"} ${fontClass}`}>
                              {t("workspace.quiz.result.postLearningDecisionTitle", "Decision after Post-learning")}
                            </p>
                            <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-slate-200" : "text-slate-700"} ${fontClass}`}>
                              {t("workspace.quiz.result.remedialDecisionHint", "Your post-learning result needs improvement. Choose how to add a remedial phase to your roadmap.")}
                            </p>
                            <div className="mt-3 flex flex-col gap-2">
                              <Button
                                type="button"
                                disabled={submittingRemedialDecision}
                                onClick={() => void handleRoadmapRemedialDecision(normalizedPhaseId, "COMPRESS_TO_KEEP_DEADLINE")}
                                className="w-full justify-start min-h-[48px] text-left whitespace-normal bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95"
                              >
                                {submittingRemedialDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {t("workspace.quiz.result.remedialCompressAction", "Create remedial phase and keep current deadline")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={submittingRemedialDecision}
                                onClick={() => void handleRoadmapRemedialDecision(normalizedPhaseId, "EXTEND_DEADLINE")}
                                className="w-full justify-start min-h-[48px] text-left whitespace-normal transition-all active:scale-95"
                              >
                                {submittingRemedialDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {t("workspace.quiz.result.remedialExtendAction", "Create remedial phase and extend deadline")}
                              </Button>
                            </div>
                          </div>
                        ) : null}
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
