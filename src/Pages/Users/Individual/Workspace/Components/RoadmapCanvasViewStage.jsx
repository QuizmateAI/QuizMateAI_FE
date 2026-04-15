import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GitBranch, Layers3, Loader2, Lock, Pencil, Sparkles, Unlock } from "lucide-react";
import QuizListView from "./QuizListView";
import { Button } from "@/Components/ui/button";
import { getCurrentRoadmapKnowledgeProgress } from "@/api/RoadmapAPI";
import { getCurrentRoadmapPhaseProgress, getPhaseProgressReview, submitRoadmapPhaseRemedialDecision } from "@/api/RoadmapPhaseAPI";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import { useToast } from "@/context/ToastContext";
import { useRoadmapPreLearningDecision } from "../hooks/useRoadmapPreLearningDecision";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
import { buildWorkspaceRoadmapsPath } from "@/lib/routePaths";
import RoadmapReviewPanel from "@/Components/workspace/RoadmapReviewPanel";

const ROOT_CARD_WIDTH = 240;
const PHASE_CARD_WIDTH = 208;
const KNOWLEDGE_CARD_WIDTH = 196;
const TOP_SECTION_CARD_BASE_WIDTH = 100;
const TOP_SECTION_CARD_MAX_WIDTH = 320;
const TIMELINE_GAP = 20;
const TIMELINE_PADDING = 20;
const STAGE_TOP_COMPONENT_SCALE = 1;
const STAGE_TOP_ROW_GAP = 16;
const STAGE_TOP_ROW_PADDING_LEFT = 16;
const STAGE_TOP_ROADMAP_MARGIN_LEFT = 20;
const STAGE_TOP_SECTION_STORAGE_KEY_PREFIX = "quizmate:workspace:roadmap:stageTopCollapsed";

function getCanvasContext() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function countWrappedLines(text, availableWidth, measureWord) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;

  let lines = 1;
  let currentLineWidth = 0;
  const spaceWidth = measureWord(" ");

  words.forEach((word) => {
    const wordWidth = measureWord(word);
    const nextWidth = currentLineWidth === 0 ? wordWidth : currentLineWidth + spaceWidth + wordWidth;

    if (nextWidth <= availableWidth) {
      currentLineWidth = nextWidth;
      return;
    }

    lines += 1;
    currentLineWidth = wordWidth;
  });

  return lines;
}

function getTitleWidthForTwoLines(text, { minWidth, maxWidth, horizontalPadding = 40, font = "600 15px sans-serif" }) {
  if (!String(text || "").trim()) return minWidth;

  const context = getCanvasContext();
  if (!context) return minWidth;
  context.font = font;

  const measureWord = (value) => context.measureText(value).width;
  const safeMinWidth = Math.max(80, Number(minWidth) || 80);
  const safeMaxWidth = Math.max(safeMinWidth, Number(maxWidth) || safeMinWidth);

  let left = safeMinWidth;
  let right = safeMaxWidth;
  let answer = safeMaxWidth;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const availableWidth = Math.max(40, mid - horizontalPadding);
    const lines = countWrappedLines(text, availableWidth, measureWord);

    if (lines <= 2) {
      answer = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return answer;
}

function normalizeTitleForWidth(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Bo phan tien to giai doan/phase de chi do do dai tieu de noi dung.
  return raw
    .replace(/^giai\s*doan\s*\d+\s*[:\-.)]?\s*/i, "")
    .replace(/^phase\s*\d+\s*[:\-.)]?\s*/i, "")
    .trim();
}

function normalizePositiveId(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function getStageTopSectionStorageKey(roadmapId) {
  const normalizedRoadmapId = normalizePositiveId(roadmapId);
  return normalizedRoadmapId
    ? `${STAGE_TOP_SECTION_STORAGE_KEY_PREFIX}:${normalizedRoadmapId}`
    : `${STAGE_TOP_SECTION_STORAGE_KEY_PREFIX}:global`;
}

function isFinishedPhaseStatus(status) {
  const normalized = String(status || "").toUpperCase();
  return normalized === "COMPLETED" || normalized === "SKIPPED";
}

function isFinishedKnowledgeStatus(status) {
  const normalized = String(status || "").toUpperCase();
  return normalized === "COMPLETED" || normalized === "SKIPPED" || normalized === "DONE";
}

function formatPhaseDurationLabel(phase, t) {
  const estimatedDays = Number(phase?.estimatedDays ?? phase?.studyDurationInDay ?? phase?.durationInDay ?? 0);
  const estimatedMinutesPerDay = Number(phase?.estimatedMinutesPerDay ?? phase?.recommendedMinutesPerDay ?? phase?.minutesPerDay ?? 0);

  if (estimatedDays > 0 && estimatedMinutesPerDay > 0) {
    return `${estimatedDays} ${t("workspace.roadmap.days", "days")} • ${estimatedMinutesPerDay} ${t("workspace.roadmap.minutesPerDayShort", "min/day")}`;
  }
  if (estimatedDays > 0) {
    return `${estimatedDays} ${t("workspace.roadmap.days", "days")}`;
  }
  if (estimatedMinutesPerDay > 0) {
    return `${estimatedMinutesPerDay} ${t("workspace.roadmap.minutesPerDayShort", "min/day")}`;
  }

  return phase?.durationLabel || null;
}

function RoadmapCanvasViewStage({
  roadmap,
  isDarkMode = false,
  fontClass = "font-sans",
  selectedPhaseId: selectedPhaseIdProp = null,
  selectedKnowledgeId: selectedKnowledgeIdProp = null,
  onPhaseFocus,
  onViewQuiz,
  isStudyNewRoadmap = false,
  adaptationMode = "",
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  knowledgeQuizRefreshByKnowledgeKey = {},
  quizRefreshToken = 0,
  progressTracking = null,
  generatingPreLearningPhaseIds = [],
  skipPreLearningPhaseIds = [],
  onReloadRoadmap,
  onCreateKnowledgeQuizForKnowledge,
  onCreatePhasePreLearning,
  onCreatePhaseKnowledge,
  onEditRoadmapConfig,
  onTopSectionCollapsedChange,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const timelineRef = useRef(null);
  const knowledgeBranchRef = useRef(null);
  const dragStateRef = useRef(null);
  const progressSyncDebounceRef = useRef(null);
  const previousKnowledgeGenerationRef = useRef(false);
  const phaseReviewInFlightRef = useRef(false);
  const [selectedType, setSelectedType] = useState("roadmap");
  const [selectedPhaseId, setSelectedPhaseId] = useState(normalizePositiveId(roadmap?.phases?.[0]?.phaseId));
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);
  const [globalCurrentPhasePayload, setGlobalCurrentPhasePayload] = useState(null);
  const [currentKnowledgePayload, setCurrentKnowledgePayload] = useState(null);
  const [optimisticUnlockedPhaseIds, setOptimisticUnlockedPhaseIds] = useState([]);
  const [unlockingPhaseIds, setUnlockingPhaseIds] = useState([]);
  const [submittingRemedialDecision, setSubmittingRemedialDecision] = useState(false);
  const [remedialState, setRemedialState] = useState({
    phaseId: null,
    loadingCurrentPhase: false,
    currentPhaseProgress: null,
  });
  const [phaseReviewState, setPhaseReviewState] = useState({
    loading: false,
    data: null,
    phaseId: null,
  });
  const [isTopSectionCollapsed, setIsTopSectionCollapsed] = useState(true);
  const [hydratedStageTopSectionStorageKey, setHydratedStageTopSectionStorageKey] = useState(null);

  useEffect(() => {
    onTopSectionCollapsedChange?.(isTopSectionCollapsed);
  }, [isTopSectionCollapsed, onTopSectionCollapsedChange]);

  const phases = Array.isArray(roadmap?.phases) ? roadmap.phases : [];
  const topComponentScale = Math.min(2, Math.max(0.4, STAGE_TOP_COMPONENT_SCALE));
  const normalizedAdaptationMode = String(adaptationMode || "").toUpperCase();
  const normalizedSelectedPhaseIdProp = normalizePositiveId(selectedPhaseIdProp);
  const normalizedSelectedKnowledgeIdProp = normalizePositiveId(selectedKnowledgeIdProp);
  const normalizedSelectedPhaseId = normalizePositiveId(selectedPhaseId);
  const normalizedSelectedKnowledgeId = normalizePositiveId(selectedKnowledgeId);
  const selectedPhase = selectedPhaseId
    ? phases.find((phase) => normalizePositiveId(phase?.phaseId) === normalizedSelectedPhaseId) ?? null
    : null;
  const selectedKnowledges = Array.isArray(selectedPhase?.knowledges) ? selectedPhase.knowledges : [];
  const hasSelectedPhaseKnowledges = selectedKnowledges.length > 0;
  const selectedKnowledge = selectedPhase && selectedKnowledgeId
    ? selectedKnowledges.find((knowledge) => normalizePositiveId(knowledge?.knowledgeId) === normalizedSelectedKnowledgeId) ?? null
    : null;
  const stageTopSectionStorageKey = useMemo(
    () => getStageTopSectionStorageKey(roadmap?.roadmapId ?? roadmap?.id),
    [roadmap?.id, roadmap?.roadmapId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setHydratedStageTopSectionStorageKey(null);

    try {
      const savedCollapsedValue = window.localStorage.getItem(stageTopSectionStorageKey);
      if (savedCollapsedValue === "1" || savedCollapsedValue === "0") {
        setIsTopSectionCollapsed(savedCollapsedValue === "1");
      } else {
        window.localStorage.setItem(stageTopSectionStorageKey, isTopSectionCollapsed ? "1" : "0");
      }
    } catch {
      // Bo qua loi storage de tranh anh huong luong roadmap.
    } finally {
      setHydratedStageTopSectionStorageKey(stageTopSectionStorageKey);
    }
  }, [stageTopSectionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedStageTopSectionStorageKey !== stageTopSectionStorageKey) return;

    try {
      window.localStorage.setItem(stageTopSectionStorageKey, isTopSectionCollapsed ? "1" : "0");
    } catch {
      // Bo qua loi storage de tranh anh huong luong roadmap.
    }
  }, [hydratedStageTopSectionStorageKey, isTopSectionCollapsed, stageTopSectionStorageKey]);

  const roadmapCardWidth = useMemo(() => {
    const normalizedTitle = normalizeTitleForWidth(roadmap?.title) || String(roadmap?.title || "");
    return getTitleWidthForTwoLines(normalizedTitle, {
      minWidth: ROOT_CARD_WIDTH,
      maxWidth: TOP_SECTION_CARD_MAX_WIDTH,
    });
  }, [roadmap?.title]);
  const phaseCardWidths = useMemo(() => phases.map((phase) => {
    const normalizedTitle = normalizeTitleForWidth(phase?.title) || String(phase?.title || "");
    return getTitleWidthForTwoLines(normalizedTitle, {
      minWidth: PHASE_CARD_WIDTH,
      maxWidth: TOP_SECTION_CARD_MAX_WIDTH,
    });
  }), [phases]);
  const selectedKnowledgeCardWidths = useMemo(() => selectedKnowledges.map((knowledge) => {
    const normalizedTitle = normalizeTitleForWidth(knowledge?.title) || String(knowledge?.title || "");
    return getTitleWidthForTwoLines(normalizedTitle, {
      minWidth: KNOWLEDGE_CARD_WIDTH,
      maxWidth: TOP_SECTION_CARD_MAX_WIDTH,
    });
  }), [selectedKnowledges]);

  const globalPhaseId = Number(globalCurrentPhasePayload?.phaseId);
  const globalCurrentIndex = Number.isInteger(globalPhaseId)
    ? phases.findIndex((phase) => normalizePositiveId(phase?.phaseId) === globalPhaseId)
    : -1;
  let contiguousFinishedCount = 0;
  for (let index = 0; index < phases.length; index += 1) {
    if (!isFinishedPhaseStatus(phases[index]?.status)) break;
    contiguousFinishedCount += 1;
  }
  const unlockedByStatusIndex = Math.min(Math.max(phases.length - 1, 0), contiguousFinishedCount);
  const unlockedByOptimisticIndex = optimisticUnlockedPhaseIds.reduce((maxIndex, phaseId) => {
    const normalizedPhaseId = normalizePositiveId(phaseId);
    if (!normalizedPhaseId) return maxIndex;
    const phaseIndex = phases.findIndex((phase) => normalizePositiveId(phase?.phaseId) === normalizedPhaseId);
    return phaseIndex >= 0 ? Math.max(maxIndex, phaseIndex) : maxIndex;
  }, -1);
  const maxUnlockedPhaseIndex = useMemo(() => {
    if (isStudyNewRoadmap) {
      const unlockedByManualProgressIndex = phases.reduce((maxIndex, phase, index) => {
        const hasPreLearning = Array.isArray(phase?.preLearningQuizzes) && phase.preLearningQuizzes.length > 0;
        const hasKnowledge = Array.isArray(phase?.knowledges) && phase.knowledges.length > 0;
        const hasPostLearning = Array.isArray(phase?.postLearningQuizzes) && phase.postLearningQuizzes.length > 0;
        const isFinished = isFinishedPhaseStatus(phase?.status);

        if (hasPreLearning || hasKnowledge || hasPostLearning || isFinished) {
          return Math.max(maxIndex, index);
        }

        return maxIndex;
      }, 0);

      return Math.max(unlockedByManualProgressIndex, unlockedByOptimisticIndex, 0);
    }

    return Math.max(unlockedByStatusIndex, unlockedByOptimisticIndex, globalCurrentIndex, 0);
  }, [globalCurrentIndex, isStudyNewRoadmap, phases, unlockedByOptimisticIndex, unlockedByStatusIndex]);

  const isCurrentPayloadFinished = isFinishedPhaseStatus(globalCurrentPhasePayload?.status);
  const currentPayloadPhaseId = Number(globalCurrentPhasePayload?.phaseId);
  const currentPayloadPhaseIndexRaw = Number(globalCurrentPhasePayload?.phaseIndex);
  const currentPayloadPhaseIndex = Number.isInteger(currentPayloadPhaseIndexRaw)
    ? (currentPayloadPhaseIndexRaw > 0 ? currentPayloadPhaseIndexRaw - 1 : currentPayloadPhaseIndexRaw)
    : -1;
  const currentPayloadStatus = String(globalCurrentPhasePayload?.status || "").toUpperCase();
  const isCurrentPayloadActiveStatus = ["IN_PROGRESS", "ACTIVE", "PROCESSING"].includes(currentPayloadStatus);
  const isCurrentPhaseByPayload = useCallback((phaseId) => {
    const normalizedPhaseId = Number(phaseId);
    return isStudyNewRoadmap
      && isCurrentPayloadActiveStatus
      && Number.isInteger(currentPayloadPhaseId)
      && currentPayloadPhaseId > 0
      && Number.isInteger(normalizedPhaseId)
      && normalizedPhaseId > 0
      && currentPayloadPhaseId === normalizedPhaseId;
  }, [currentPayloadPhaseId, isCurrentPayloadActiveStatus, isStudyNewRoadmap]);

  const isPhaseCompleted = (phase, phaseIndex) => {
    if (!phase) return false;
    if (isFinishedPhaseStatus(phase?.status)) return true;

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
  };

  const selectedPhaseIndex = phases.findIndex((phase) => normalizePositiveId(phase?.phaseId) === normalizedSelectedPhaseId);
  const selectedPhaseHasExistingPreLearning = Array.isArray(selectedPhase?.preLearningQuizzes) && selectedPhase.preLearningQuizzes.length > 0;
  const isSelectedPhaseCurrentByPayload = isCurrentPhaseByPayload(selectedPhase?.phaseId);
  const isSelectedPhaseLocked = selectedType === "phase"
    && Boolean(selectedPhase)
    && selectedPhaseIndex > maxUnlockedPhaseIndex
    && !selectedPhaseHasExistingPreLearning
    && !isSelectedPhaseCurrentByPayload;
  const selectedPreviousPhaseCompleted = selectedPhaseIndex > 0
    ? isPhaseCompleted(phases[selectedPhaseIndex - 1], selectedPhaseIndex - 1)
    : true;
  const isSelectedPhaseUnlocking = selectedType === "phase" && unlockingPhaseIds.includes(normalizedSelectedPhaseId);
  const isSelectedPhaseUnlockable = isSelectedPhaseLocked
    && selectedPhaseIndex === maxUnlockedPhaseIndex + 1
    && selectedPreviousPhaseCompleted
    && !isSelectedPhaseUnlocking;

  const currentKnowledgePhaseId = Number(currentKnowledgePayload?.phaseId);
  const currentKnowledgeId = Number(currentKnowledgePayload?.knowledgeId);
  const currentKnowledgeStatus = String(currentKnowledgePayload?.status || "").toUpperCase();
  const isCurrentKnowledgeDoneStatus = ["DONE", "COMPLETED"].includes(currentKnowledgeStatus);
  const currentKnowledgePhaseIndex = Number.isInteger(currentKnowledgePhaseId)
    ? phases.findIndex((phase) => normalizePositiveId(phase?.phaseId) === currentKnowledgePhaseId)
    : -1;

  const knowledgeGenerationSignature = useMemo(() => {
    const normalizedPhaseIds = [
      ...(Array.isArray(generatingKnowledgePhaseIds) ? generatingKnowledgePhaseIds : []),
      ...(Array.isArray(generatingKnowledgeQuizPhaseIds) ? generatingKnowledgeQuizPhaseIds : []),
    ]
      .map((phaseId) => Number(phaseId))
      .filter((phaseId) => Number.isInteger(phaseId) && phaseId > 0)
      .filter((phaseId, index, array) => array.indexOf(phaseId) === index)
      .sort((a, b) => a - b);

    return normalizedPhaseIds.join(",");
  }, [generatingKnowledgePhaseIds, generatingKnowledgeQuizPhaseIds]);

  const hasKnowledgeGenerationRunning = knowledgeGenerationSignature.length > 0;

  const resolveKnowledgeLockState = (phase, phaseIndex, knowledgeIndex) => {
    const phaseKnowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
    const hasExistingPreLearning = Array.isArray(phase?.preLearningQuizzes) && phase.preLearningQuizzes.length > 0;
    const isPhaseLockedForKnowledge = phaseIndex > maxUnlockedPhaseIndex
      && !hasExistingPreLearning
      && !isCurrentPhaseByPayload(phase?.phaseId);
    const currentKnowledgeIndexInPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
      ? phaseKnowledges.findIndex((knowledge) => normalizePositiveId(knowledge?.knowledgeId) === currentKnowledgeId)
      : -1;
    const shouldUseSequentialFallbackLock = !isFinishedPhaseStatus(phase?.status)
      && !isPhaseLockedForKnowledge
      && phaseIndex === maxUnlockedPhaseIndex
      && currentKnowledgePhaseIndex < 0
      && currentKnowledgeIndexInPhase < 0
      && phaseKnowledges.length > 0;
    const isKnowledgeLockedBySequence = !isFinishedPhaseStatus(phase?.status)
      && (
        (
          phaseIndex === currentKnowledgePhaseIndex
          &&
          currentKnowledgeIndexInPhase >= 0
          && knowledgeIndex > currentKnowledgeIndexInPhase + (isCurrentKnowledgeDoneStatus ? 1 : 0)
        )
        || (shouldUseSequentialFallbackLock && knowledgeIndex > 0)
      );

    return {
      isPhaseLockedForKnowledge,
      isKnowledgeLockedBySequence,
    };
  };

  const loadCurrentKnowledgeProgress = useCallback(async () => {
    const roadmapId = normalizePositiveId(roadmap?.roadmapId);
    if (!roadmapId) {
      setCurrentKnowledgePayload(null);
      return;
    }

    try {
      const response = await getCurrentRoadmapKnowledgeProgress(roadmapId);
      const payload = response?.data?.data || response?.data || null;
      setCurrentKnowledgePayload(payload && typeof payload === "object" ? payload : null);
    } catch {
      setCurrentKnowledgePayload(null);
    }
  }, [roadmap?.roadmapId]);

  const loadGlobalCurrentPhaseProgress = useCallback(async () => {
    const roadmapId = normalizePositiveId(roadmap?.roadmapId);
    if (!roadmapId) {
      setGlobalCurrentPhasePayload(null);
      return;
    }

    try {
      const response = await getCurrentRoadmapPhaseProgress(roadmapId);
      const payload = response?.data?.data || response?.data || null;
      setGlobalCurrentPhasePayload(payload && typeof payload === "object" ? payload : null);
    } catch {
      setGlobalCurrentPhasePayload(null);
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
  }, [
    knowledgeGenerationSignature,
    loadCurrentKnowledgeProgress,
    loadGlobalCurrentPhaseProgress,
    quizRefreshToken,
    roadmap?.roadmapId,
    selectedPhaseId,
  ]);

  useEffect(() => {
    const wasGeneratingKnowledge = previousKnowledgeGenerationRef.current;
    if (wasGeneratingKnowledge && !hasKnowledgeGenerationRunning) {
      void loadGlobalCurrentPhaseProgress();
      void loadCurrentKnowledgeProgress();
    }
    previousKnowledgeGenerationRef.current = hasKnowledgeGenerationRunning;
  }, [hasKnowledgeGenerationRunning, loadCurrentKnowledgeProgress, loadGlobalCurrentPhaseProgress]);

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
    activePhase: selectedType === "phase" ? selectedPhase : null,
    onCreatePhaseKnowledge,
    onSkipSuccess: async () => {
      await loadGlobalCurrentPhaseProgress();
      await loadCurrentKnowledgeProgress();
      onReloadRoadmap?.();
    },
    showError,
    showSuccess,
    t,
  });

  const selectedKnowledgeIndex = selectedKnowledge
    ? selectedKnowledges.findIndex((knowledge) => normalizePositiveId(knowledge?.knowledgeId) === normalizedSelectedKnowledgeId)
    : -1;
  const selectedKnowledgeStatus = String(selectedKnowledge?.status || "").toUpperCase();
  const selectedKnowledgeLockState = selectedKnowledge && selectedPhaseIndex >= 0 && selectedKnowledgeIndex >= 0
    ? resolveKnowledgeLockState(selectedPhase, selectedPhaseIndex, selectedKnowledgeIndex)
    : null;
  const isSelectedKnowledgeLocked = selectedType === "knowledge"
    && Boolean(selectedKnowledge)
    && (
      selectedKnowledgeStatus === "LOCKED"
      || selectedKnowledgeLockState?.isPhaseLockedForKnowledge
      || selectedKnowledgeLockState?.isKnowledgeLockedBySequence
    );

  const hasCompletedPostLearning = useCallback((phase) => {
    const postLearningQuizzes = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];
    return postLearningQuizzes.some((quiz) => {
      const attempted = quiz?.myAttempted === true;
      const passed = quiz?.myPassed === true;
      const status = String(quiz?.status || "").toUpperCase();
      return attempted || passed || status === "COMPLETED";
    });
  }, []);

  const canShowRoadmapLevelFeedback = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return false;

    const allPhasesFinished = phases.every((phase) => isFinishedPhaseStatus(phase?.status));
    const postLearningSatisfied = phases.every((phase) => {
      const pl = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];
      if (pl.length === 0) return true;
      return hasCompletedPostLearning(phase);
    });

    return allPhasesFinished && postLearningSatisfied;
  }, [hasCompletedPostLearning, phases]);

  const activePhase = selectedType === "phase" ? selectedPhase : null;

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
      } catch {
        // Khong co review la luong hop le, an card.
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
  }, [activePhase?.phaseId, syncPhaseReview]);

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
  const branchOffset = selectedPhaseIndex < 0
    ? TIMELINE_PADDING
    : TIMELINE_PADDING
      + roadmapCardWidth
      + TIMELINE_GAP
      + phaseCardWidths.slice(0, selectedPhaseIndex).reduce((sum, width) => sum + width, 0)
      + selectedPhaseIndex * TIMELINE_GAP;
  const topPhaseLineSegments = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return [];

    const roadmapLeft = STAGE_TOP_ROW_PADDING_LEFT + STAGE_TOP_ROADMAP_MARGIN_LEFT;
    const roadmapRight = roadmapLeft + roadmapCardWidth;

    return phases.map((phase, index) => {
      const previousWidthsTotal = phaseCardWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      const currentLeft = roadmapRight + STAGE_TOP_ROW_GAP + previousWidthsTotal + index * STAGE_TOP_ROW_GAP;
      const previousRight = index === 0
        ? roadmapRight
        : roadmapRight + STAGE_TOP_ROW_GAP + previousWidthsTotal + (index - 1) * STAGE_TOP_ROW_GAP;

      return {
        key: `phase-link-${phase?.phaseId ?? index}`,
        left: previousRight,
        width: Math.max(0, currentLeft - previousRight),
      };
    });
  }, [phaseCardWidths, phases, roadmapCardWidth]);
  const knowledgeBranchLineWidth = selectedKnowledges.length > 0
    ? selectedKnowledgeCardWidths.slice(0, -1).reduce((sum, width) => sum + width, 0)
      + Math.max(selectedKnowledges.length - 1, 0) * 12
      + 8
    : 0;

  const getSelectedPhaseViewportLeft = (timelineElement) => {
    if (!timelineElement || selectedPhaseIndex < 0) {
      return timelineElement?.scrollLeft ?? 0;
    }

    const phaseLeft = TIMELINE_PADDING
      + roadmapCardWidth
      + TIMELINE_GAP
      + phaseCardWidths.slice(0, selectedPhaseIndex).reduce((sum, width) => sum + width, 0)
      + selectedPhaseIndex * TIMELINE_GAP;
    const maxLeft = Math.max(0, timelineElement.scrollWidth - timelineElement.clientWidth - 16);
    return Math.max(0, Math.min(phaseLeft - 24, maxLeft));
  };

  const getKnowledgeBranchViewportTarget = () => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return null;
    }

    const selectedPhaseLeft = getSelectedPhaseViewportLeft(timelineElement);

    if (selectedType === "phase" && !hasSelectedPhaseKnowledges) {
      return { left: selectedPhaseLeft, top: 0 };
    }

    if (selectedType !== "phase" && selectedType !== "knowledge") {
      return { left: 0, top: 0 };
    }

    const knowledgeBranchElement = knowledgeBranchRef.current;
    if (!knowledgeBranchElement) {
      return { left: selectedPhaseLeft, top: 0 };
    }

    const viewportWidth = timelineElement.clientWidth;
    const viewportHeight = timelineElement.clientHeight;
    const branchLeft = knowledgeBranchElement.offsetLeft;
    const branchTop = knowledgeBranchElement.offsetTop;
    const branchWidth = knowledgeBranchElement.offsetWidth;
    const branchHeight = knowledgeBranchElement.offsetHeight;
    const maxLeft = Math.max(0, timelineElement.scrollWidth - viewportWidth - 16);
    const maxTop = Math.max(0, timelineElement.scrollHeight - viewportHeight - 16);

    const rawLeft = branchWidth < viewportWidth
      ? branchLeft - (viewportWidth - branchWidth) / 2
      : branchLeft - 24;
    const rawTop = branchHeight < viewportHeight
      ? branchTop - (viewportHeight - branchHeight) / 2
      : branchTop - 20;

    if (selectedType === "knowledge") {
      const selectedKnowledgeIndexForViewport = selectedKnowledges.findIndex(
        (knowledge) => normalizePositiveId(knowledge?.knowledgeId) === normalizedSelectedKnowledgeId,
      );

      if (selectedKnowledgeIndexForViewport >= 0) {
        const knowledgeGap = 12;
        const knowledgeLeftWithinBranch = selectedKnowledgeCardWidths
          .slice(0, selectedKnowledgeIndexForViewport)
          .reduce((sum, width) => sum + width, 0)
          + selectedKnowledgeIndexForViewport * knowledgeGap;
        const selectedCardWidth = selectedKnowledgeCardWidths[selectedKnowledgeIndexForViewport] ?? KNOWLEDGE_CARD_WIDTH;
        const selectedCardLeft = branchLeft + knowledgeLeftWithinBranch;
        const selectedCardRight = selectedCardLeft + selectedCardWidth;
        const viewportPadding = 24;
        const currentViewportLeft = timelineElement.scrollLeft;

        let nextLeft = currentViewportLeft;
        if (selectedCardLeft < currentViewportLeft + viewportPadding) {
          nextLeft = Math.max(0, selectedCardLeft - viewportPadding);
        } else if (selectedCardRight > currentViewportLeft + viewportWidth - viewportPadding) {
          nextLeft = Math.min(maxLeft, selectedCardRight - viewportWidth + viewportPadding);
        }

        return {
          left: nextLeft,
          top: Math.max(0, Math.min(rawTop, maxTop)),
        };
      }
    }

    return {
      left: selectedType === "phase"
        ? selectedPhaseLeft
        : Math.max(0, Math.min(rawLeft, maxLeft)),
      top: Math.max(0, Math.min(rawTop, maxTop)),
    };
  };

  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return;
    }

    timelineElement.scrollLeft = 0;
    timelineElement.scrollTop = 0;
  }, [roadmap?.roadmapId]);

  useEffect(() => {
    if (!Array.isArray(phases) || phases.length === 0) {
      setSelectedType("roadmap");
      setSelectedPhaseId(null);
      setSelectedKnowledgeId(null);
      return;
    }

    if (selectedPhaseIdProp === null && selectedKnowledgeIdProp === null) {
      setSelectedType("roadmap");
      setSelectedPhaseId(null);
      setSelectedKnowledgeId(null);
      return;
    }

    if (normalizedSelectedPhaseIdProp) {
      const hasExternalPhase = phases.some(
        (phase) => normalizePositiveId(phase?.phaseId) === normalizedSelectedPhaseIdProp,
      );
      if (hasExternalPhase) {
        setSelectedPhaseId(normalizedSelectedPhaseIdProp);

        const externalPhase = phases.find(
          (phase) => normalizePositiveId(phase?.phaseId) === normalizedSelectedPhaseIdProp,
        );
        const externalKnowledges = Array.isArray(externalPhase?.knowledges)
          ? externalPhase.knowledges
          : [];
        const hasExternalKnowledge = externalKnowledges.some(
          (knowledge) =>
            normalizePositiveId(knowledge?.knowledgeId) ===
            normalizedSelectedKnowledgeIdProp,
        );

        if (hasExternalKnowledge) {
          setSelectedType("knowledge");
          setSelectedKnowledgeId(normalizedSelectedKnowledgeIdProp);
        } else {
          setSelectedType("phase");
          setSelectedKnowledgeId(null);
        }
        return;
      }
    }

    const hasCurrentPhase = phases.some(
      (phase) => normalizePositiveId(phase?.phaseId) === normalizePositiveId(selectedPhaseId),
    );
    if (!hasCurrentPhase) {
      setSelectedType("phase");
      setSelectedPhaseId(normalizePositiveId(phases[0]?.phaseId));
      setSelectedKnowledgeId(null);
    }
  }, [
    normalizedSelectedKnowledgeIdProp,
    normalizedSelectedPhaseIdProp,
    phases,
    selectedKnowledgeIdProp,
    selectedPhaseIdProp,
    selectedPhaseId,
  ]);

  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return;
    }

    const viewportTarget = getKnowledgeBranchViewportTarget();
    if (!viewportTarget) {
      return;
    }

    timelineElement.scrollTo({
      left: viewportTarget.left,
      top: viewportTarget.top,
      behavior: "smooth",
    });
  }, [hasSelectedPhaseKnowledges, normalizedSelectedKnowledgeId, selectedKnowledgeCardWidths, selectedKnowledges, selectedPhaseId, selectedType]);

  const handleTimelineScroll = () => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return;
    }

    const viewportTarget = getKnowledgeBranchViewportTarget();
    const maxVerticalScroll = viewportTarget?.top ?? 0;
    if (timelineElement.scrollTop > maxVerticalScroll) {
      timelineElement.scrollTop = maxVerticalScroll;
    }
  };

  const startTimelineDrag = (event) => {
    const timelineElement = timelineRef.current;
    if (!timelineElement || event.target.closest("button")) {
      return;
    }

    dragStateRef.current = {
      startX: event.clientX,
      originScrollLeft: timelineElement.scrollLeft,
    };
    timelineElement.setPointerCapture?.(event.pointerId);
  };

  const moveTimelineDrag = (event) => {
    const timelineElement = timelineRef.current;
    const dragState = dragStateRef.current;
    if (!timelineElement || !dragState) {
      return;
    }

    timelineElement.scrollLeft = dragState.originScrollLeft - (event.clientX - dragState.startX);
  };

  const stopTimelineDrag = (event) => {
    const timelineElement = timelineRef.current;
    dragStateRef.current = null;
    if (timelineElement?.hasPointerCapture?.(event.pointerId)) {
      timelineElement.releasePointerCapture(event.pointerId);
    }
  };

  const selectRoadmap = () => {
    setSelectedType("roadmap");
    setSelectedPhaseId(null);
    setSelectedKnowledgeId(null);
    onPhaseFocus?.(null, {
      preserveActiveView: true,
      focusRoadmapCenter: true,
      knowledgeId: null,
    });
    timelineRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectPhase = (phaseId) => {
    const normalizedPhaseId = normalizePositiveId(phaseId);
    if (!normalizedPhaseId) return;
    setSelectedType("phase");
    setSelectedPhaseId(normalizedPhaseId);
    setSelectedKnowledgeId(null);
    onPhaseFocus?.(normalizedPhaseId, {
      preserveActiveView: true,
      knowledgeId: null,
    });
  };

  const selectKnowledge = (phaseId, knowledgeId) => {
    const normalizedPhaseId = normalizePositiveId(phaseId);
    const normalizedKnowledgeId = normalizePositiveId(knowledgeId);
    if (!normalizedPhaseId || !normalizedKnowledgeId) return;
    setSelectedType("knowledge");
    setSelectedPhaseId(normalizedPhaseId);
    setSelectedKnowledgeId(normalizedKnowledgeId);
    onPhaseFocus?.(normalizedPhaseId, {
      preserveActiveView: true,
      knowledgeId: normalizedKnowledgeId,
    });
  };

  const maxPhaseIndex = phases.length - 1;
  const canGoPrevPhase = selectedPhaseIndex >= 0;
  const canGoNextPhase = selectedPhaseIndex >= 0
    ? selectedPhaseIndex < maxPhaseIndex
    : maxPhaseIndex >= 0;
  const selectedKnowledgeNavIndex = selectedKnowledges.findIndex(
    (knowledge) => normalizePositiveId(knowledge?.knowledgeId) === normalizedSelectedKnowledgeId,
  );
  const canShowKnowledgeArrows = Boolean(selectedPhase) && hasSelectedPhaseKnowledges;
  const canGoPrevKnowledge = canShowKnowledgeArrows
    && selectedType === "knowledge"
    && selectedKnowledgeNavIndex > 0;
  const canGoNextKnowledge = canShowKnowledgeArrows
    && (
      (selectedType === "phase" && selectedKnowledgeNavIndex < 0)
      || (selectedType === "knowledge" && selectedKnowledgeNavIndex >= 0 && selectedKnowledgeNavIndex < selectedKnowledges.length - 1)
    );

  const goToPrevPhase = () => {
    if (!canGoPrevPhase) return;
    if (selectedPhaseIndex === 0) {
      selectRoadmap();
      return;
    }
    const previousPhase = phases[selectedPhaseIndex - 1];
    const previousPhaseId = normalizePositiveId(previousPhase?.phaseId);
    if (!previousPhaseId) return;
    selectPhase(previousPhaseId);
  };

  const goToNextPhase = () => {
    if (!canGoNextPhase) return;

    if (selectedPhaseIndex < 0) {
      const firstPhaseId = normalizePositiveId(phases[0]?.phaseId);
      if (!firstPhaseId) return;
      selectPhase(firstPhaseId);
      return;
    }

    const nextPhase = phases[selectedPhaseIndex + 1];
    const nextPhaseId = normalizePositiveId(nextPhase?.phaseId);
    if (!nextPhaseId) return;
    selectPhase(nextPhaseId);
  };

  const goToPrevKnowledge = () => {
    if (!canGoPrevKnowledge || !selectedPhase) return;
    const previousKnowledge = selectedKnowledges[selectedKnowledgeNavIndex - 1];
    const previousKnowledgeId = normalizePositiveId(previousKnowledge?.knowledgeId);
    const phaseId = normalizePositiveId(selectedPhase?.phaseId);
    if (!previousKnowledgeId || !phaseId) return;
    selectKnowledge(phaseId, previousKnowledgeId);
  };

  const goToNextKnowledge = () => {
    if (!canGoNextKnowledge || !selectedPhase) return;
    const phaseId = normalizePositiveId(selectedPhase?.phaseId);
    if (!phaseId) return;

    if (selectedType === "phase" && selectedKnowledgeNavIndex < 0) {
      const firstKnowledgeId = normalizePositiveId(selectedKnowledges[0]?.knowledgeId);
      if (!firstKnowledgeId) return;
      selectKnowledge(phaseId, firstKnowledgeId);
      return;
    }

    const nextKnowledge = selectedKnowledges[selectedKnowledgeNavIndex + 1];
    const nextKnowledgeId = normalizePositiveId(nextKnowledge?.knowledgeId);
    if (!nextKnowledgeId) return;
    selectKnowledge(phaseId, nextKnowledgeId);
  };

  const handleUnlockSelectedPhase = async () => {
    if (!isSelectedPhaseUnlockable || !selectedPhase) return;
    const phaseId = normalizePositiveId(selectedPhase?.phaseId);
    if (!phaseId) return;

    setOptimisticUnlockedPhaseIds((current) => (current.includes(phaseId) ? current : [...current, phaseId]));

    if (isStudyNewRoadmap) {
      return;
    }

    if (typeof onCreatePhasePreLearning !== "function") {
      return;
    }

    setUnlockingPhaseIds((current) => (current.includes(phaseId) ? current : [...current, phaseId]));
    try {
      await onCreatePhasePreLearning(phaseId, { skipPreLearning: false });
    } catch {
      setOptimisticUnlockedPhaseIds((current) => current.filter((id) => id !== phaseId));
    } finally {
      setUnlockingPhaseIds((current) => current.filter((id) => id !== phaseId));
    }
  };

  const summaryChips = [
    {
      key: "phaseCount",
      icon: Layers3,
      value: `${roadmap?.stats?.phaseCount ?? 0} ${t("workspace.roadmap.canvas.phases")}`,
      accent: "text-emerald-500",
    },
    {
      key: "knowledgeCount",
      icon: GitBranch,
      value: `${roadmap?.stats?.knowledgeCount ?? 0} ${t("workspace.roadmap.canvas.knowledges")}`,
      accent: "text-blue-500",
    },
    {
      key: "quizCount",
      icon: BookOpenCheck,
      value: `${roadmap?.stats?.quizCount ?? 0} ${t("workspace.roadmap.canvas.quizzes")}`,
      accent: "text-amber-500",
    },
  ];

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
      </div>
    );
  };

  const renderDetailContent = () => {
    if (selectedType === "knowledge" && selectedKnowledge && selectedPhase) {
      const normalizedPhaseId = normalizePositiveId(selectedPhase?.phaseId);
      const normalizedKnowledgeId = normalizePositiveId(selectedKnowledge?.knowledgeId);
      const knowledgeQuizRequestKey = `${normalizedPhaseId}:${normalizedKnowledgeId}`;
      const targetedKnowledgeRefreshToken = Number(knowledgeQuizRefreshByKnowledgeKey?.[knowledgeQuizRequestKey] || 0);
      const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizKnowledgeKeys.includes(knowledgeQuizRequestKey);
      const hasKnowledgeQuiz = Array.isArray(selectedKnowledge?.quizzes) && selectedKnowledge.quizzes.length > 0;
      const canCreateKnowledgeQuiz = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0;
      const shouldShowCreateKnowledgeQuizButton = canCreateKnowledgeQuiz && !hasKnowledgeQuiz;
      const shouldRenderKnowledgeQuizList = hasKnowledgeQuiz || targetedKnowledgeRefreshToken > 0;
      const flashcards = selectedKnowledge?.flashcards || [];
      const hasFlashcards = flashcards.length > 0;
      return (
        <div className="relative">
          <div className={`space-y-6 ${isSelectedKnowledgeLocked ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                  {t("workspace.roadmap.canvas.view2KnowledgeDetail")}
                </p>
                {isFinishedKnowledgeStatus(selectedKnowledge?.status) ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${isDarkMode ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {t("workspace.quiz.statusLabels.COMPLETED", "Completed")}
                  </span>
                ) : null}
              </div>
              <h3 className={`mt-2 text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {selectedKnowledge.title}
              </h3>
              <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                {selectedPhase.title}
              </p>
              <p className={`mt-4 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                {selectedKnowledge.description}
              </p>
            </div>

            <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-blue-100 bg-[#F7FBFF]"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                  {t("workspace.roadmap.canvas.quiz")}
                </p>
                {shouldShowCreateKnowledgeQuizButton && typeof onCreateKnowledgeQuizForKnowledge === "function" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onCreateKnowledgeQuizForKnowledge(selectedPhase?.phaseId, selectedKnowledge?.knowledgeId)}
                    disabled={isGeneratingKnowledgeQuiz}
                    className="h-7 px-2.5 text-xs bg-[#2563EB] hover:bg-blue-700 text-white transition-all active:scale-95"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t("workspace.roadmap.createKnowledgeQuiz", "Create quiz")}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3">
                {isGeneratingKnowledgeQuiz && !hasKnowledgeQuiz ? (
                  renderLoadingPlaceholder(
                    t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                    true,
                    progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0,
                  )
                ) : (
                  <>
                    {isGeneratingKnowledgeQuiz ? (
                      <div className="mb-2">
                        {renderLoadingPlaceholder(
                          t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                          true,
                          progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0,
                        )}
                      </div>
                    ) : null}
                    {shouldRenderKnowledgeQuizList ? (
                      <QuizListView
                        isDarkMode={isDarkMode}
                        contextType="KNOWLEDGE"
                        contextId={selectedKnowledge?.knowledgeId}
                        onViewQuiz={(quiz) => onViewQuiz?.(quiz, {
                          backTarget: {
                            view: "roadmap",
                            roadmapId: Number(roadmap?.roadmapId),
                            phaseId: Number(selectedPhase?.phaseId),
                            knowledgeId: Number(selectedKnowledge?.knowledgeId),
                          },
                        })}
                        embedded
                        legacyRoadmapUI
                        hideCreateButton
                        title={t("workspace.roadmap.canvas.quiz")}
                        refreshToken={(Number(quizRefreshToken) || 0) + targetedKnowledgeRefreshToken}
                        returnToPath={roadmap?.workspaceId ? buildWorkspaceRoadmapsPath(roadmap.workspaceId, selectedPhase?.phaseId) : null}
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

            {hasFlashcards ? (
              <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-amber-900/60 bg-amber-950/25" : "border-amber-100 bg-amber-50"}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                  {t("workspace.roadmap.canvas.flashcard", "Flashcard")}
                </p>
                <div className="mt-3 space-y-0.5">
                  {flashcards.map(renderFlashcardItem)}
                </div>
              </div>
            ) : null}
          </div>
          {isSelectedKnowledgeLocked ? (
            <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-2xl ${isDarkMode ? "bg-slate-900/45" : "bg-white/50"}`}>
              <div className={`rounded-xl border px-4 py-3 max-w-sm text-center ${fontClass} ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-white" : "border-slate-300 bg-white/95 text-slate-700"}`}>
                <div className={`flex items-center justify-center gap-2 text-sm font-semibold ${fontClass}`}>
                  <Lock className={`w-4 h-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
                  <span>{t("workspace.roadmap.knowledgeLockedHint", "Please complete the previous knowledge first.")}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (selectedType === "phase" && selectedPhase) {
      const phaseKnowledges = Array.isArray(selectedPhase?.knowledges) ? selectedPhase.knowledges : [];
      const phasePreLearningQuizzes = Array.isArray(selectedPhase?.preLearningQuizzes)
        ? selectedPhase.preLearningQuizzes
        : [];
      const phasePostLearningQuizzes = Array.isArray(selectedPhase?.postLearningQuizzes)
        ? selectedPhase.postLearningQuizzes
        : [];
      const normalizedPhaseId = normalizePositiveId(selectedPhase?.phaseId);
      const isGeneratingPhaseContent = generatingKnowledgePhaseIds.includes(normalizedPhaseId);
      const isGeneratingKnowledgeQuiz = generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId);
      const isGeneratingKnowledge = isGeneratingPhaseContent || isGeneratingKnowledgeQuiz;
      const shouldShowKnowledgePlaceholder = phaseKnowledges.length === 0 && isGeneratingKnowledge;
      const phaseKnowledgePercent = progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0;
      const phasePreLearningPercent = progressTracking?.getPreLearningProgress(normalizedPhaseId) ?? 0;
      const hasPreLearningQuiz = phasePreLearningQuizzes.length > 0;
      const hasPostLearningQuiz = phasePostLearningQuizzes.length > 0;
      const isSkipPreLearningPhase = skipPreLearningPhaseIds.includes(normalizedPhaseId);
      const isDecisionHandled = decisionHandledPhaseIds.includes(normalizedPhaseId);
      const isGeneratingPreLearning = generatingPreLearningPhaseIds.includes(normalizedPhaseId);
      const isGeneratingKnowledgeForPhase = isGeneratingPhaseContent || isGeneratingKnowledgeQuiz;
      const canRenderPreLearningDecisionCard = shouldRenderDecisionCard
        && decisionState.phaseId === normalizedPhaseId
        && !isGeneratingKnowledgeForPhase;
      const shouldShowPreLearningDecision = isStudyNewRoadmap
        && !hasPreLearningQuiz
        && phaseKnowledges.length === 0
        && !isSkipPreLearningPhase;
      const totalKnowledgeCount = phaseKnowledges.length;
      const currentKnowledgeIndexInPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
        ? phaseKnowledges.findIndex((knowledge) => normalizePositiveId(knowledge?.knowledgeId) === currentKnowledgeId)
        : -1;
      const isPhaseBeforeCurrentKnowledge = currentKnowledgePhaseIndex >= 0 && selectedPhaseIndex < currentKnowledgePhaseIndex;
      const completedKnowledgeCount = phaseKnowledges.reduce((count, _knowledge, knowledgeIndex) => {
        const isKnowledgeCompleted = isFinishedPhaseStatus(selectedPhase.status)
          || isPhaseBeforeCurrentKnowledge
          || (selectedPhaseIndex === currentKnowledgePhaseIndex && currentKnowledgeIndexInPhase >= 0 && (
            knowledgeIndex < currentKnowledgeIndexInPhase
            || (knowledgeIndex === currentKnowledgeIndexInPhase && isCurrentKnowledgeDoneStatus)
          ));
        return isKnowledgeCompleted ? count + 1 : count;
      }, 0);
      const shouldLockPostLearning = hasPostLearningQuiz
        && !isFinishedPhaseStatus(selectedPhase.status)
        && totalKnowledgeCount > 0
        && completedKnowledgeCount < totalKnowledgeCount;
      const isFlexibleRoadmap = normalizedAdaptationMode === "FLEXIBLE";
      const isCurrentRemedialPhase = Number(remedialState?.phaseId) === normalizedPhaseId;
      const currentRemedialPhaseId = Number(remedialState?.currentPhaseProgress?.phaseId);
      const canShowRemedialDecision = hasPostLearningQuiz
        && isFlexibleRoadmap
        && isCurrentRemedialPhase
        && !remedialState.loadingCurrentPhase
        && Number.isInteger(currentRemedialPhaseId)
        && currentRemedialPhaseId === normalizedPhaseId
        && remedialState?.currentPhaseProgress?.needsRemedialDecision === true;

      return (
        <div className="space-y-6">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-sky-300" : "text-sky-700"} ${fontClass}`}>
              {t("workspace.roadmap.canvas.view2PhaseDetail")}
            </p>
            <h3 className={`mt-2 text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {selectedPhase.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {formatPhaseDurationLabel(selectedPhase, t) ? (
                <span className={`rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
                  {formatPhaseDurationLabel(selectedPhase, t)}
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
                {phaseKnowledges.length} {t("workspace.roadmap.canvas.knowledges")}
              </span>
            </div>
            <p className={`mt-4 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
              {selectedPhase.description}
            </p>
          </div>

          {phaseReviewState?.data?.summary && Number(phaseReviewState?.phaseId) === Number(selectedPhase?.phaseId) ? (
            <div className={`rounded-lg border px-4 py-3 ${isDarkMode ? "border-emerald-800/70 bg-emerald-950/30" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-emerald-200" : "text-emerald-800"} ${fontClass}`}>
                {t("workspace.roadmap.phaseReviewTitle", "Đánh giá AI cho phase hiện tại")}
              </p>
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

          {hasPreLearningQuiz ? (
            <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-cyan-900/60 bg-cyan-950/25" : "border-cyan-100 bg-cyan-50"}`}>
              <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-cyan-300" : "text-cyan-700"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
              </p>
              <div className="mt-3">
                <QuizListView
                  isDarkMode={isDarkMode}
                  contextType="PHASE"
                  contextId={selectedPhase?.phaseId}
                  intentFilter={["PRE_LEARNING"]}
                  onViewQuiz={(quiz) => onViewQuiz?.(quiz, {
                    backTarget: {
                      view: "roadmap",
                      roadmapId: Number(roadmap?.roadmapId),
                      phaseId: Number(selectedPhase?.phaseId),
                    },
                  })}
                  embedded
                  legacyRoadmapUI
                  hideCreateButton
                  title={t("workspace.roadmap.canvas.quiz")}
                />
              </div>
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
            </div>
          ) : null}

          {phaseKnowledges.length > 0 ? (
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.view2KnowledgeBranch")}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {phaseKnowledges.map((knowledge, index) => {
                  const active = normalizedSelectedKnowledgeId === normalizePositiveId(knowledge?.knowledgeId) && selectedType === "knowledge";
                  const normalizedKnowledgeId = normalizePositiveId(knowledge?.knowledgeId);
                  const normalizedPhaseId = normalizePositiveId(selectedPhase?.phaseId);
                  const knowledgeQuizRequestKey = `${normalizedPhaseId}:${normalizedKnowledgeId}`;
                  const normalizedKnowledgeStatus = String(knowledge?.status || "").toUpperCase();
                  const isKnowledgeCompleted = isFinishedKnowledgeStatus(normalizedKnowledgeStatus);
                  const isKnowledgeProcessing = !isKnowledgeCompleted && (
                    normalizedKnowledgeStatus === "PROCESSING"
                    || normalizedKnowledgeStatus === "GENERATING"
                    || generatingKnowledgeQuizKnowledgeKeys.includes(knowledgeQuizRequestKey)
                  );
                  return (
                    <button
                      key={knowledge.knowledgeId}
                      type="button"
                      onClick={() => selectKnowledge(selectedPhase.phaseId, knowledge.knowledgeId)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${active
                        ? isDarkMode
                          ? "border-sky-400 bg-sky-500/10"
                          : "border-sky-500 bg-sky-50"
                        : isDarkMode
                          ? "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                          : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.knowledge", "Knowledge")} {index + 1}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {isKnowledgeCompleted ? (
                            <CheckCircle2 className={`h-3.5 w-3.5 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`} />
                          ) : null}
                          {isKnowledgeProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
                          ) : null}
                          {normalizedKnowledgeStatus === "LOCKED" ? (
                            <Lock className={`h-3.5 w-3.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <p className={`text-sm font-medium ${active
                          ? isDarkMode ? "text-sky-200" : "text-sky-900"
                          : isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {knowledge.title}
                        </p>
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                        {knowledge.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : shouldShowKnowledgePlaceholder ? (
            <div>
              <p className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.knowledge", "Knowledge")}
              </p>
              <div className="space-y-2">
                {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                  t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                  false,
                  phaseKnowledgePercent,
                ) : null}
                {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                  t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                  false,
                  phaseKnowledgePercent,
                ) : null}
              </div>
            </div>
          ) : null}

          {hasPostLearningQuiz ? (
            <div className={`relative rounded-[26px] border p-4 ${isDarkMode ? "border-emerald-900/60 bg-emerald-950/25" : "border-emerald-100 bg-emerald-50"}`}>
              {shouldLockPostLearning ? (
                <div className={`absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-[26px] ${isDarkMode ? "bg-slate-900/45" : "bg-white/65"}`}>
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
              <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.postLearning")}
              </p>
              <div className={`mt-3 ${shouldLockPostLearning ? "opacity-50 pointer-events-none select-none" : ""}`}>
                <QuizListView
                  isDarkMode={isDarkMode}
                  contextType="PHASE"
                  contextId={selectedPhase?.phaseId}
                  intentFilter={["POST_LEARNING"]}
                  onViewQuiz={(quiz) => onViewQuiz?.(quiz, {
                    backTarget: {
                      view: "roadmap",
                      roadmapId: Number(roadmap?.roadmapId),
                      phaseId: Number(selectedPhase?.phaseId),
                    },
                  })}
                  embedded
                  legacyRoadmapUI
                  hideCreateButton
                  title={t("workspace.roadmap.canvas.quiz")}
                />
              </div>
              {canShowRemedialDecision ? (
                <div className={`mt-3 rounded-lg border p-4 ${isDarkMode ? "border-amber-700/70 bg-amber-900/20" : "border-amber-200 bg-amber-50/80"}`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-amber-200" : "text-amber-800"} ${fontClass}`}>
                    {t("workspace.quiz.result.remedialDecisionTitle", "Choose your roadmap adjustment")}
                  </p>
                  <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}>
                    {t("workspace.quiz.result.remedialDecisionDescription", "Your current results suggest adjusting the roadmap. Please choose one option.")}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      disabled={submittingRemedialDecision}
                      onClick={() => void handleRoadmapRemedialDecision(normalizedPhaseId, "COMPRESS_TO_KEEP_DEADLINE")}
                      className="min-w-[200px] gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {submittingRemedialDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t("workspace.quiz.result.remedialCompressAction", "Keep deadline (compress)")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submittingRemedialDecision}
                      onClick={() => void handleRoadmapRemedialDecision(normalizedPhaseId, "EXTEND_DEADLINE")}
                      className="min-w-[200px] gap-2"
                    >
                      {submittingRemedialDecision ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {t("workspace.quiz.result.remedialExtendAction", "Extend deadline")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {shouldShowPreLearningDecision ? (
            <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
              {isGeneratingKnowledge ? (
                <div className="space-y-2">
                  {isGeneratingPhaseContent ? renderLoadingPlaceholder(
                    t("workspace.roadmap.generatingKnowledge", "Please wait while AI generates knowledge for this phase..."),
                    true,
                    phaseKnowledgePercent,
                  ) : null}
                  {isGeneratingKnowledgeQuiz ? renderLoadingPlaceholder(
                    t("workspace.roadmap.generatingKnowledgeQuiz", "AI is generating quiz for this knowledge..."),
                    true,
                    phaseKnowledgePercent,
                  ) : null}
                </div>
              ) : isGeneratingPreLearning ? (
                renderLoadingPlaceholder(
                  t("workspace.roadmap.generatingPreLearning", "AI is generating pre-learning for this phase..."),
                  true,
                  phasePreLearningPercent,
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
                      onClick={() => onCreatePhasePreLearning?.(selectedPhase.phaseId, { skipPreLearning: false })}
                      className={`${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                      {t("workspace.roadmap.studyNew.hasFoundation", "I already have foundation in this phase")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onCreatePhaseKnowledge?.(selectedPhase.phaseId, { skipPreLearning: true })}
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
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {roadmap?.roadmapId && canShowRoadmapLevelFeedback ? (
          <div className="flex justify-end">
            <DirectFeedbackButton
              targetType="ROADMAP"
              targetId={roadmap.roadmapId}
              label={i18n.language === "en" ? "Feedback" : "Phản hồi"}
              isDarkMode={isDarkMode}
              className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
              title={i18n.language === "en" ? "Roadmap feedback" : "Phản hồi lộ trình"}
            />
          </div>
        ) : null}
        <div>
          <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
            {t("workspace.roadmap.canvas.centralRoadmap")}
          </p>
          <h3 className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {roadmap?.title}
          </h3>
          <p className={`mt-4 text-sm leading-7 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {roadmap?.description}
          </p>
        </div>

        {Number.isInteger(Number(roadmap?.roadmapId ?? roadmap?.id)) && Number(roadmap?.roadmapId ?? roadmap?.id) > 0 && (
          <RoadmapReviewPanel roadmapId={Number(roadmap?.roadmapId ?? roadmap?.id)} isDarkMode={isDarkMode} />
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <div
                key={chip.key}
                className={`rounded-2xl border px-3 py-3 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-gray-200 bg-[#F8FBFF]"}`}
              >
                <Icon className={`h-4 w-4 ${chip.accent}`} />
                <p className={`mt-2 text-xs font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                  {chip.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className={`rounded-[22px] border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-950/50 text-slate-300" : "border-sky-100 bg-sky-50 text-gray-700"}`}>
          <p className={`text-xs ${fontClass}`}>{t("workspace.roadmap.canvas.view2RoadmapHint")}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full overflow-y-auto overflow-x-hidden ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="flex h-full min-h-0 flex-col p-3">
        <div
          className={`shrink-0 overflow-hidden rounded-[26px] border p-2 ${isDarkMode ? "border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" : "border-gray-200 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]"}`}
        >
          <div className={`flex items-center justify-between rounded-[18px] border px-3.5 py-2.5 backdrop-blur-sm ${isDarkMode ? "border-slate-700/80 bg-slate-900/65" : "border-slate-200 bg-white/85"}`}>
            <div className="flex items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${isTopSectionCollapsed
                ? (isDarkMode ? "bg-slate-500" : "bg-slate-400")
                : "bg-emerald-500"}`}
              />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.view2TopSectionTitle", "Lộ trình theo giai đoạn")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTopSectionCollapsed((current) => !current)}
              className={`h-8 min-w-[132px] gap-2 rounded-full px-3.5 text-xs font-medium shadow-sm transition-all active:scale-95 ${isDarkMode ? "border-slate-600 bg-slate-900/85 text-slate-100 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                {isTopSectionCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              </span>
              {isTopSectionCollapsed
                ? t("workspace.roadmap.canvas.expandTopSection", "Mở rộng sơ đồ")
                : t("workspace.roadmap.canvas.collapseTopSection", "Thu gọn sơ đồ")}
            </Button>
          </div>

          {!isTopSectionCollapsed ? (
            <div
              className="mt-2 overflow-hidden rounded-[22px]"
              style={{
                transform: `scale(${topComponentScale})`,
                transformOrigin: "top left",
                width: `${100 / topComponentScale}%`,
              }}
            >
              <div className="relative">
                <div className="pointer-events-none absolute left-1 right-1 top-10 z-30 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goToPrevPhase}
                    disabled={!canGoPrevPhase}
                    className={`pointer-events-auto h-10 w-10 rounded-full shadow-md transition-all active:scale-95 ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100"}`}
                    aria-label={t("workspace.roadmap.canvas.prevPhase", "Phase trước")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goToNextPhase}
                    disabled={!canGoNextPhase}
                    className={`pointer-events-auto h-10 w-10 rounded-full shadow-md transition-all active:scale-95 ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100"}`}
                    aria-label={t("workspace.roadmap.canvas.nextPhase", "Phase tiếp theo")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {canShowKnowledgeArrows ? (
                  <div className="pointer-events-none absolute left-1 right-1 top-[160px] z-30 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={goToPrevKnowledge}
                      disabled={!canGoPrevKnowledge}
                      className={`pointer-events-auto h-10 w-10 rounded-full shadow-md transition-all active:scale-95 ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100"}`}
                      aria-label={t("workspace.roadmap.canvas.prevKnowledge", "Knowledge trước")}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={goToNextKnowledge}
                      disabled={!canGoNextKnowledge}
                      className={`pointer-events-auto h-10 w-10 rounded-full shadow-md transition-all active:scale-95 ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100"}`}
                      aria-label={t("workspace.roadmap.canvas.nextKnowledge", "Knowledge tiếp theo")}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                ) : null}

                <div
                  ref={timelineRef}
                  className="relative overflow-x-auto overflow-y-auto [scrollbar-gutter:stable_both-edges]"
                  onScroll={handleTimelineScroll}
                  onPointerDown={startTimelineDrag}
                  onPointerMove={moveTimelineDrag}
                  onPointerUp={stopTimelineDrag}
                  onPointerCancel={stopTimelineDrag}
                >
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage: isDarkMode
                    ? "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)"
                    : "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
                  backgroundSize: "42px 42px",
                }}
              />

              <div className="relative min-w-max pb-6 pl-4 pr-4 pt-5">
                {topPhaseLineSegments.map((segment) => (
                  <div
                    key={segment.key}
                    className={`absolute top-[58px] h-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`}
                    style={{ left: segment.left, width: segment.width }}
                  />
                ))}

                <div className="relative flex items-start gap-4">
                  <button
                    type="button"
                    onClick={selectRoadmap}
                    style={{ width: roadmapCardWidth }}
                    className={`relative z-20 ml-5 shrink-0 rounded-[24px] border px-4 py-3 text-left shadow-[0_18px_48px_rgba(15,23,42,0.14)] transition-all ${selectedType === "roadmap"
                      ? isDarkMode
                        ? "border-emerald-400 bg-slate-900"
                        : "border-emerald-500 bg-emerald-50"
                      : isDarkMode
                        ? "border-slate-700 bg-slate-900/95 hover:border-slate-600"
                        : "border-white/80 bg-white/95 hover:border-blue-200"}`}
                  >
                    <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                      {t("workspace.roadmap.canvas.centralRoadmap")}
                    </p>
                    <h3 className={`mt-1.5 text-[clamp(12px,1.25vw,16px)] font-semibold leading-5 whitespace-normal break-words ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                      {roadmap?.title}
                    </h3>
                  </button>

                  {phases.map((phase, index) => {
                    const active = selectedType !== "roadmap" && normalizedSelectedPhaseId === normalizePositiveId(phase?.phaseId);
                    const hasExistingPreLearning = Array.isArray(phase?.preLearningQuizzes) && phase.preLearningQuizzes.length > 0;
                    const isPhaseLocked = index > maxUnlockedPhaseIndex
                      && !hasExistingPreLearning
                      && !isCurrentPhaseByPayload(phase?.phaseId);
                    const isCompletedPhase = isPhaseCompleted(phase, index);
                    return (
                      <button
                        key={phase.phaseId}
                        type="button"
                        onClick={() => selectPhase(phase.phaseId)}
                        style={{ width: phaseCardWidths[index] ?? PHASE_CARD_WIDTH }}
                        className={`relative z-10 shrink-0 rounded-[22px] border px-3.5 py-3 text-left shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all ${index === phases.length - 1 ? "mr-10" : ""} ${isPhaseLocked
                          ? isDarkMode
                            ? "cursor-pointer border-slate-700 bg-slate-900/60 opacity-70"
                            : "cursor-pointer border-gray-200 bg-gray-100 opacity-80"
                          : active
                          ? isDarkMode
                            ? "border-sky-400 bg-slate-900"
                            : "border-sky-500 bg-sky-50"
                          : isDarkMode
                            ? "border-slate-700 bg-slate-900/95 hover:border-slate-600"
                            : "border-white/80 bg-white/95 hover:border-blue-200"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-sky-300" : "text-sky-700"} ${fontClass}`}>
                            {t("workspace.roadmap.canvas.phase")} {index + 1}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {isCompletedPhase ? (
                              <CheckCircle2 className={`h-3.5 w-3.5 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`} />
                            ) : null}
                            {isPhaseLocked ? <Lock className={`h-3.5 w-3.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} /> : null}
                          </div>
                        </div>
                        <h4 className={`mt-1.5 text-[clamp(12px,1.2vw,15px)] font-semibold leading-5 whitespace-normal break-words ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {phase.title}
                        </h4>
                      </button>
                    );
                  })}
                </div>

                {selectedType !== "roadmap" && selectedPhase && hasSelectedPhaseKnowledges ? (
                  <div ref={knowledgeBranchRef} className="relative mt-5 min-h-[112px] pb-2" style={{ marginLeft: branchOffset }}>
                    <div className={`absolute left-8 top-[-20px] h-[20px] w-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />
                    <div
                      className={`absolute left-8 top-0 h-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`}
                      style={{ width: knowledgeBranchLineWidth }}
                    />
                    <div className="relative flex min-w-max items-start gap-3 pt-4">
                      {selectedKnowledges.map((knowledge) => {
                        const active = selectedType === "knowledge" && normalizedSelectedKnowledgeId === normalizePositiveId(knowledge?.knowledgeId);
                        const selectedPhaseInTimeline = phases.find((phase) => normalizePositiveId(phase?.phaseId) === normalizePositiveId(selectedPhase?.phaseId));
                        const selectedPhaseIndexInTimeline = phases.findIndex((phase) => normalizePositiveId(phase?.phaseId) === normalizePositiveId(selectedPhaseInTimeline?.phaseId));
                        const knowledgeItems = Array.isArray(selectedPhaseInTimeline?.knowledges) ? selectedPhaseInTimeline.knowledges : [];
                        const currentKnowledgeIndexInPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
                          ? knowledgeItems.findIndex((item) => normalizePositiveId(item?.knowledgeId) === currentKnowledgeId)
                          : -1;
                        const isPhaseBeforeCurrentKnowledge = currentKnowledgePhaseIndex >= 0 && selectedPhaseIndexInTimeline < currentKnowledgePhaseIndex;
                        const knowledgeIndex = selectedKnowledges.findIndex((item) => normalizePositiveId(item?.knowledgeId) === normalizePositiveId(knowledge?.knowledgeId));
                        const knowledgeLockState = resolveKnowledgeLockState(selectedPhaseInTimeline, selectedPhaseIndexInTimeline, knowledgeIndex);
                        const knowledgeStatus = String(knowledge?.status || "").toUpperCase();
                        const isKnowledgeLocked = knowledgeStatus === "LOCKED"
                          || knowledgeLockState.isPhaseLockedForKnowledge
                          || knowledgeLockState.isKnowledgeLockedBySequence;
                        const knowledgeQuizRequestKey = `${normalizePositiveId(selectedPhaseInTimeline?.phaseId)}:${normalizePositiveId(knowledge?.knowledgeId)}`;
                        const isCompletedPhase = isPhaseCompleted(selectedPhaseInTimeline, selectedPhaseIndexInTimeline);
                        const isKnowledgeCompleted = isCompletedPhase
                          || isPhaseBeforeCurrentKnowledge
                          || (selectedPhaseIndexInTimeline === currentKnowledgePhaseIndex && currentKnowledgeIndexInPhase >= 0 && (
                            knowledgeIndex < currentKnowledgeIndexInPhase
                            || (knowledgeIndex === currentKnowledgeIndexInPhase && isCurrentKnowledgeDoneStatus)
                          ));
                        const isKnowledgeProcessing = !isKnowledgeCompleted && !isKnowledgeLocked && (
                          knowledgeStatus === "PROCESSING"
                          || knowledgeStatus === "GENERATING"
                          || generatingKnowledgeQuizKnowledgeKeys.includes(knowledgeQuizRequestKey)
                        );
                        return (
                          <button
                            key={knowledge.knowledgeId}
                            type="button"
                            onClick={() => selectKnowledge(selectedPhase.phaseId, knowledge.knowledgeId)}
                            style={{ width: selectedKnowledgeCardWidths[knowledgeIndex] ?? KNOWLEDGE_CARD_WIDTH }}
                            className={`relative shrink-0 rounded-[20px] border px-3 py-2.5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.1)] transition-all ${isKnowledgeLocked
                              ? isDarkMode
                                ? "cursor-pointer border-slate-700 bg-slate-900/60 opacity-70"
                                : "cursor-pointer border-gray-200 bg-gray-100 opacity-80"
                              : active
                              ? isDarkMode
                                ? "border-sky-400 bg-sky-500/10"
                                : "border-sky-500 bg-sky-50"
                              : isDarkMode
                                ? "border-slate-700 bg-slate-950/95 hover:border-slate-600"
                                : "border-white/80 bg-white/95 hover:border-emerald-200"}`}
                          >
                            <div className={`absolute left-7 top-[-16px] h-[16px] w-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                                {t("workspace.roadmap.canvas.knowledge", "Knowledge")} {knowledgeIndex + 1}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {isKnowledgeCompleted ? (
                                  <CheckCircle2 className={`h-3.5 w-3.5 ${isDarkMode ? "text-emerald-300" : "text-emerald-600"}`} />
                                ) : null}
                                {isKnowledgeProcessing ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
                                ) : null}
                                {isKnowledgeLocked ? (
                                  <Lock className={`h-3.5 w-3.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-1.5">
                              <h5 className={`text-[clamp(11px,1.1vw,15px)] font-semibold leading-5 whitespace-normal break-words ${active
                                ? isDarkMode ? "text-sky-200" : "text-sky-900"
                                : isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                                {knowledge.title}
                              </h5>
                            </div>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                ) : null}
              </div>
            </div>
            </div>
            </div>
          ) : null}
        </div>

        <div
          className={`mt-3 flex flex-col rounded-[26px] border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-gray-200 bg-white"}`}
        >
          <div className={`flex items-center justify-between gap-3 border-b px-4 py-3.5 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.view2DetailPanelTitle")}
              </p>
              <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {selectedType === "knowledge"
                  ? t("workspace.roadmap.canvas.view2KnowledgeHint")
                  : selectedType === "phase"
                    ? t("workspace.roadmap.canvas.view2PhaseHint")
                    : t("workspace.roadmap.canvas.view2RoadmapHint")}
              </p>
            </div>
            {selectedType === "phase" && selectedPhase ? (
              <div className="flex items-center gap-2">
                {typeof onEditRoadmapConfig === "function" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onEditRoadmapConfig}
                    className={`h-8 rounded-full px-3 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    <span className={fontClass}>{t("workspace.roadmap.editConfigAction", "Edit")}</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative overflow-visible px-4 py-4">
            {isSelectedPhaseLocked ? (
              <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-b-[26px] ${isDarkMode ? "bg-slate-900/55" : "bg-white/55"}`}>
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
                    onClick={handleUnlockSelectedPhase}
                    disabled={!isSelectedPhaseUnlockable}
                    className={`w-full font-medium ${fontClass} ${
                      isSelectedPhaseUnlockable
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {isSelectedPhaseUnlocking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlock className="w-4 h-4 mr-2" />}
                    {isSelectedPhaseUnlocking
                      ? t("workspace.roadmap.canvas.unlockingPhaseBtn", "Đang mở khóa...")
                      : t("workspace.roadmap.canvas.unlockPhaseBtn", "Mở khóa Phase")}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className={isSelectedPhaseLocked ? "opacity-30 pointer-events-none select-none blur-sm" : ""}>
              {renderDetailContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoadmapCanvasViewStage;
