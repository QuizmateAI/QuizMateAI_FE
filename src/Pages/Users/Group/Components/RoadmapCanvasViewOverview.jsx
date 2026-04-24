import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDot, Clock, Lock, Maximize2, Minimize2, X, ZoomIn, ZoomOut, CheckCircle2 } from "lucide-react";

const DONE = new Set(["COMPLETED", "DONE", "SKIPPED", "PASSED", "FINISHED", "SUBMITTED"]);
const ACTIVE = new Set(["CURRENT", "IN_PROGRESS", "PROCESSING", "ACTIVE"]);

const ZOOM_STEP = 0.1;

const NODE_COLORS = {
  done: "#10b981",
  current: "#0ea5e9",
  next: "#f59e0b",
  locked: "#94a3b8",
};

const STATUS_BADGE_STYLES = {
  done: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  current: "bg-sky-100 text-sky-800 border border-sky-300",
  next: "bg-amber-100 text-amber-800 border border-amber-300",
  locked: "bg-slate-200 text-slate-600 border border-slate-300",
};

const STATUS_ICONS = {
  done: CheckCircle2,
  current: CircleDot,
  next: Clock,
  locked: Lock,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getStatus(value) {
  return String(value || "").toUpperCase();
}

function isDoneStatus(status) {
  return DONE.has(getStatus(status));
}

function isFinishedPhaseStatus(status) {
  const normalized = getStatus(status);
  return normalized === "COMPLETED" || normalized === "SKIPPED";
}

function isActiveStatus(status) {
  return ACTIVE.has(getStatus(status));
}

function isLockedStatus(status) {
  return getStatus(status) === "LOCKED";
}

function isCompletedQuiz(quiz) {
  const status = getStatus(quiz?.status);
  return quiz?.myAttempted === true || quiz?.myPassed === true || DONE.has(status);
}

function isCompletedKnowledge(knowledge) {
  return DONE.has(getStatus(knowledge?.status));
}

function isPhaseEffectivelyDone(phase) {
  const phaseStatus = getStatus(phase?.status);
  if (DONE.has(phaseStatus)) return true;

  const preLearningQuizzes = Array.isArray(phase?.preLearningQuizzes) ? phase.preLearningQuizzes : [];
  const knowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
  const postLearningQuizzes = Array.isArray(phase?.postLearningQuizzes) ? phase.postLearningQuizzes : [];

  const hasAnyChildStage = preLearningQuizzes.length > 0 || knowledges.length > 0 || postLearningQuizzes.length > 0;
  if (!hasAnyChildStage) return false;

  const preLearningDone = preLearningQuizzes.length === 0 || preLearningQuizzes.every(isCompletedQuiz);
  const knowledgesDone = knowledges.length === 0 || knowledges.every(isCompletedKnowledge);
  const postLearningDone = postLearningQuizzes.length === 0 || postLearningQuizzes.some(isCompletedQuiz);
  return preLearningDone && knowledgesDone && postLearningDone;
}

function resolvePayloadPhaseIndex(phases, currentPhaseProgress) {
  const payloadPhaseId = Number(currentPhaseProgress?.phaseId);
  const payloadPhaseIndexRaw = Number(currentPhaseProgress?.phaseIndex);
  const payloadPhaseIndex = Number.isInteger(payloadPhaseIndexRaw)
    ? (payloadPhaseIndexRaw > 0 ? payloadPhaseIndexRaw - 1 : payloadPhaseIndexRaw)
    : -1;

  const payloadIndexById = Number.isInteger(payloadPhaseId) && payloadPhaseId > 0
    ? phases.findIndex((phase) => Number(phase?.phaseId) === payloadPhaseId)
    : -1;

  if (payloadIndexById >= 0) return payloadIndexById;

  if (Number.isInteger(payloadPhaseIndex) && payloadPhaseIndex >= 0 && payloadPhaseIndex < phases.length) {
    return payloadPhaseIndex;
  }

  return -1;
}

function getPayloadDoneThroughIndex(phases, currentPhaseProgress) {
  const payloadStatus = getStatus(currentPhaseProgress?.status);
  if (!isDoneStatus(payloadStatus)) return -1;

  const payloadIndex = resolvePayloadPhaseIndex(phases, currentPhaseProgress);
  return payloadIndex >= 0 ? payloadIndex : -1;
}

function getVisualState(phase, index, currentIndex, payloadDoneThroughIndex) {
  const status = getStatus(phase?.status);
  const isDone = isPhaseEffectivelyDone(phase);
  if (isDone || index <= payloadDoneThroughIndex || (currentIndex >= 0 && index < currentIndex)) return "done";
  if (currentIndex >= 0 && (ACTIVE.has(status) || index === currentIndex)) return "current";
  if (currentIndex >= 0 && index === currentIndex + 1) return "next";
  return "locked";
}

function getCurrentIndex(phases, currentPhaseProgress) {
  if (!Array.isArray(phases) || phases.length === 0) return -1;

  const payloadStatus = getStatus(currentPhaseProgress?.status);
  const payloadIndex = resolvePayloadPhaseIndex(phases, currentPhaseProgress);

  if (payloadIndex >= 0) {
    if (isActiveStatus(payloadStatus) && !isPhaseEffectivelyDone(phases[payloadIndex])) {
      return payloadIndex;
    }

    if (isDoneStatus(payloadStatus)) {
      const nextPhaseIndex = payloadIndex + 1;
      if (nextPhaseIndex >= phases.length) return -1;

      const firstIncompleteAfterPayload = phases.findIndex(
        (phase, index) => index >= nextPhaseIndex && !isPhaseEffectivelyDone(phase),
      );
      if (firstIncompleteAfterPayload >= 0) return firstIncompleteAfterPayload;
    }
  }

  const firstIncomplete = phases.findIndex((phase) => !isPhaseEffectivelyDone(phase));
  if (firstIncomplete < 0) return -1;

  const activeIndex = phases.findIndex((phase) => {
    const status = getStatus(phase?.status);
    return ACTIVE.has(status) && !isPhaseEffectivelyDone(phase);
  });
  if (activeIndex >= 0) return activeIndex;
  return firstIncomplete;
}

function getResponsiveLayout(viewportWidth) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 1280;

  if (width < 640) {
    return {
      phaseGap: 200,
      amplitude: 34,
      centerY: 120,
      svgHeight: 460,
      cardWidth: 180,
      cardHeight: 110,
      padLeft: 100,
      padRight: 100,
      boneLength: 32,
      nodeRadius: 8,
      currentNodeRadius: 11,
      waveGlowStroke: 24,
      waveStroke: 4,
      defaultZoom: 0.9,
      minZoom: 0.72,
      maxZoom: 1.2,
    };
  }

  if (width < 900) {
    return {
      phaseGap: 240,
      amplitude: 40,
      centerY: 250,
      svgHeight: 500,
      cardWidth: 210,
      cardHeight: 115,
      padLeft: 120,
      padRight: 120,
      boneLength: 38,
      nodeRadius: 9,
      currentNodeRadius: 12,
      waveGlowStroke: 28,
      waveStroke: 4.5,
      defaultZoom: 0.96,
      minZoom: 0.75,
      maxZoom: 1.25,
    };
  }

  if (width < 1024) {
    return {
      phaseGap: 270,
      amplitude: 46,
      centerY: 290,
      svgHeight: 580,
      cardWidth: 236,
      cardHeight: 125,
      padLeft: 135,
      padRight: 135,
      boneLength: 42,
      nodeRadius: 10,
      currentNodeRadius: 13,
      waveGlowStroke: 30,
      waveStroke: 5,
      defaultZoom: 1,
      minZoom: 0.78,
      maxZoom: 1.3,
    };
  }

  if (width < 1500) {
    return {
      phaseGap: 300,
      amplitude: 54,
      centerY: 310,
      svgHeight: 620,
      cardWidth: 260,
      cardHeight: 135,
      padLeft: 150,
      padRight: 150,
      boneLength: 46,
      nodeRadius: 10,
      currentNodeRadius: 14,
      waveGlowStroke: 32,
      waveStroke: 5,
      defaultZoom: 1,
      minZoom: 0.8,
      maxZoom: 1.4,
    };
  }

  return {
    phaseGap: 330,
    amplitude: 58,
    centerY: 330,
    svgHeight: 660,
    cardWidth: 280,
    cardHeight: 145,
    padLeft: 165,
    padRight: 165,
    boneLength: 48,
    nodeRadius: 10,
    currentNodeRadius: 14,
    waveGlowStroke: 34,
    waveStroke: 5,
    defaultZoom: 1,
    minZoom: 0.82,
    maxZoom: 1.45,
  };
}

function getPhaseX(index, padLeft, phaseGap) {
  return padLeft + index * phaseGap;
}

function getPhaseY(index, centerY, amplitude) {
  return centerY + (index % 2 === 0 ? -amplitude : amplitude);
}

function isCardAbove(index) {
  return index % 2 === 0;
}

function computeWavePath(count, { padLeft, phaseGap, centerY, amplitude }) {
  if (count < 1) return "";

  const points = Array.from({ length: count }, (_, index) => ({
    x: getPhaseX(index, padLeft, phaseGap),
    y: getPhaseY(index, centerY, amplitude),
  }));

  if (count === 1) {
    const point = points[0];
    return `M ${point.x - 40},${centerY} Q ${point.x - 20},${point.y} ${point.x},${point.y} Q ${point.x + 20},${point.y} ${point.x + 40},${centerY}`;
  }

  let path = `M ${points[0].x - 60},${centerY} Q ${points[0].x - 30},${points[0].y} ${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
  }
  const last = points[points.length - 1];
  path += ` Q ${last.x + 30},${last.y} ${last.x + 60},${centerY}`;
  return path;
}

function computeTotalWidth(count, { padLeft, padRight, phaseGap }) {
  return padLeft + Math.max(0, count - 1) * phaseGap + padRight;
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

function RoadmapCanvasViewOverview({
  roadmap,
  currentPhaseProgress = null,
  currentKnowledgeProgress = null,
  isStudyNewRoadmap = false,
  isDarkMode = false,
  fontClass,
  i18n,
  t,
  labels,
  isExpanded = false,
  isExpandedMode = false,
  isExpandedClosing = false,
  isExpandedHeaderHidden = false,
  setIsExpandedHeaderHidden,
  openExpandedView,
  closeExpandedView,
  setIsExpanded,
  resetViewport,
  adjustZoom,
  draggingMode,
  viewportRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  transform,
  layout,
  canvasWidth,
  canvasHeight,
  centerX,
  centerY,
  expandedKnowledges,
  toggleKnowledge,
  handlePhaseDragStart,
  handleKnowledgeDragStart,
  onShareRoadmap,
  renderRoadmapConfigActionButtons,
  onSelectCenterRoadmap,
}) {
  const scrollContainerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);

  const CANVAS_WIDTH = canvasWidth;
  const [viewportWidth, setViewportWidth] = useState(CANVAS_WIDTH || 1280);
  const roadmapPhases = Array.isArray(roadmap?.phases) ? roadmap.phases : [];
  const selectedPhaseDetail = useMemo(() => {
    const normalizedPhaseId = Number(selectedPhaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return null;
    return roadmapPhases.find((phase) => Number(phase?.phaseId) === normalizedPhaseId) || null;
  }, [roadmapPhases, selectedPhaseId]);
  const currentPayloadPhaseId = Number(currentPhaseProgress?.phaseId);
  const currentPayloadStatus = getStatus(currentPhaseProgress?.status);
  const isCurrentPayloadActiveStatus = ["IN_PROGRESS", "ACTIVE", "PROCESSING"].includes(currentPayloadStatus);
  const globalCurrentIndex = Number.isInteger(currentPayloadPhaseId) && currentPayloadPhaseId > 0
    ? roadmapPhases.findIndex((phase) => Number(phase?.phaseId) === currentPayloadPhaseId)
    : -1;

  const maxUnlockedPhaseIndex = useMemo(() => {
    if (!Array.isArray(roadmapPhases) || roadmapPhases.length === 0) return 0;

    let contiguousFinishedCount = 0;
    for (let index = 0; index < roadmapPhases.length; index += 1) {
      if (!isFinishedPhaseStatus(roadmapPhases[index]?.status)) break;
      contiguousFinishedCount += 1;
    }
    const unlockedByStatusIndex = Math.min(roadmapPhases.length - 1, contiguousFinishedCount);

    if (isStudyNewRoadmap) {
      const unlockedByManualProgressIndex = roadmapPhases.reduce((maxIndex, phase, index) => {
        const hasPreLearning = Array.isArray(phase?.preLearningQuizzes) && phase.preLearningQuizzes.length > 0;
        const hasKnowledge = Array.isArray(phase?.knowledges) && phase.knowledges.length > 0;
        const hasPostLearning = Array.isArray(phase?.postLearningQuizzes) && phase.postLearningQuizzes.length > 0;
        const isFinished = isFinishedPhaseStatus(phase?.status);

        if (hasPreLearning || hasKnowledge || hasPostLearning || isFinished) {
          return Math.max(maxIndex, index);
        }

        return maxIndex;
      }, 0);

      return Math.max(0, unlockedByManualProgressIndex);
    }

    return Math.max(0, globalCurrentIndex, unlockedByStatusIndex);
  }, [globalCurrentIndex, isStudyNewRoadmap, roadmapPhases]);

  const selectedPhaseKnowledges = useMemo(
    () => (Array.isArray(selectedPhaseDetail?.knowledges) ? selectedPhaseDetail.knowledges : []),
    [selectedPhaseDetail],
  );

  const selectedPhaseIndex = useMemo(
    () => roadmapPhases.findIndex((phase) => Number(phase?.phaseId) === Number(selectedPhaseDetail?.phaseId)),
    [roadmapPhases, selectedPhaseDetail?.phaseId],
  );

  const selectedPhaseVisualState = useMemo(() => {
    if (!selectedPhaseDetail || selectedPhaseIndex < 0) return "locked";

    const resolvedCurrentIndex = getCurrentIndex(roadmapPhases, currentPhaseProgress);
    const resolvedPayloadDoneThroughIndex = getPayloadDoneThroughIndex(roadmapPhases, currentPhaseProgress);

    return getVisualState(
      selectedPhaseDetail,
      selectedPhaseIndex,
      resolvedCurrentIndex,
      resolvedPayloadDoneThroughIndex,
    );
  }, [currentPhaseProgress, roadmapPhases, selectedPhaseDetail, selectedPhaseIndex]);

  const isSelectedPhaseCurrentByPayload = useMemo(() => {
    const normalizedSelectedPhaseId = Number(selectedPhaseDetail?.phaseId);
    return isStudyNewRoadmap
      && isCurrentPayloadActiveStatus
      && Number.isInteger(currentPayloadPhaseId)
      && currentPayloadPhaseId > 0
      && Number.isInteger(normalizedSelectedPhaseId)
      && normalizedSelectedPhaseId > 0
      && currentPayloadPhaseId === normalizedSelectedPhaseId;
  }, [
    currentPayloadPhaseId,
    isCurrentPayloadActiveStatus,
    isStudyNewRoadmap,
    selectedPhaseDetail?.phaseId,
  ]);

  const selectedPhaseHasExistingPreLearning =
    Array.isArray(selectedPhaseDetail?.preLearningQuizzes) && selectedPhaseDetail.preLearningQuizzes.length > 0;

  const isSelectedPhaseLocked = useMemo(
    () => selectedPhaseVisualState === "locked"
      && !selectedPhaseHasExistingPreLearning
      && !isSelectedPhaseCurrentByPayload,
    [
      isSelectedPhaseCurrentByPayload,
      selectedPhaseHasExistingPreLearning,
      selectedPhaseVisualState,
    ],
  );

  const currentKnowledgePhaseId = Number(currentKnowledgeProgress?.phaseId);
  const currentKnowledgeId = Number(currentKnowledgeProgress?.knowledgeId);
  const currentKnowledgeStatus = getStatus(currentKnowledgeProgress?.status);
  const isCurrentKnowledgeDoneStatus = ["DONE", "COMPLETED", "SKIPPED"].includes(currentKnowledgeStatus);
  const currentKnowledgePhaseIndex = Number.isInteger(currentKnowledgePhaseId) && currentKnowledgePhaseId > 0
    ? roadmapPhases.findIndex((phase) => Number(phase?.phaseId) === currentKnowledgePhaseId)
    : -1;
  const currentKnowledgeIndexInSelectedPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
    ? selectedPhaseKnowledges.findIndex((knowledge) => Number(knowledge?.knowledgeId) === currentKnowledgeId)
    : -1;

  const isSelectedPhaseEffectivelyDone = useMemo(
    () => isPhaseEffectivelyDone(selectedPhaseDetail) || selectedPhaseVisualState === "done",
    [selectedPhaseDetail, selectedPhaseVisualState],
  );

  const selectedPhaseKnowledgeStates = useMemo(
    () => {
      return selectedPhaseKnowledges.map((knowledge, knowledgeIndex) => {
        const knowledgeStatus = getStatus(knowledge?.status);
        if (isSelectedPhaseEffectivelyDone) return "done";
        if (isDoneStatus(knowledgeStatus)) return "done";
        if (isLockedStatus(knowledgeStatus)) return "locked";
        if (
          Number.isInteger(currentKnowledgePhaseId)
          && currentKnowledgePhaseId > 0
          && currentKnowledgePhaseId === Number(selectedPhaseDetail?.phaseId)
          && currentKnowledgeIndexInSelectedPhase >= 0
          && knowledgeIndex < currentKnowledgeIndexInSelectedPhase
        ) {
          return "done";
        }
        const isKnowledgeLockedBySequence = !isFinishedPhaseStatus(selectedPhaseDetail?.status)
          && selectedPhaseIndex === currentKnowledgePhaseIndex
          && currentKnowledgeIndexInSelectedPhase >= 0
          && knowledgeIndex > currentKnowledgeIndexInSelectedPhase + (isCurrentKnowledgeDoneStatus ? 1 : 0);
        if (isSelectedPhaseLocked || isKnowledgeLockedBySequence) return "locked";
        if (
          Number.isInteger(currentKnowledgePhaseId)
          && currentKnowledgePhaseId > 0
          && currentKnowledgePhaseId === Number(selectedPhaseDetail?.phaseId)
          && currentKnowledgeIndexInSelectedPhase === knowledgeIndex
          && isCurrentKnowledgeDoneStatus
        ) {
          return "done";
        }
        if (
          Number.isInteger(currentKnowledgePhaseId)
          && currentKnowledgePhaseId > 0
          && currentKnowledgePhaseId === Number(selectedPhaseDetail?.phaseId)
          && currentKnowledgeIndexInSelectedPhase === knowledgeIndex
          && !isCurrentKnowledgeDoneStatus
        ) {
          return "current";
        }
        if (isActiveStatus(knowledgeStatus)) return "current";

        return "current";
      });
    },
    [
      currentKnowledgeIndexInSelectedPhase,
      currentKnowledgePhaseId,
      currentKnowledgePhaseIndex,
      isCurrentKnowledgeDoneStatus,
      isSelectedPhaseEffectivelyDone,
      isSelectedPhaseLocked,
      maxUnlockedPhaseIndex,
      selectedPhaseDetail?.phaseId,
      selectedPhaseDetail?.status,
      selectedPhaseIndex,
      selectedPhaseKnowledges,
    ],
  );

  const selectedPhaseDoneKnowledgeCount = useMemo(
    () => selectedPhaseKnowledgeStates.filter((state) => state === "done").length,
    [selectedPhaseKnowledgeStates],
  );

  useEffect(() => {
    const containerElement = viewportRef?.current;
    if (!containerElement) return undefined;

    const updateWidth = () => {
      const nextWidth = containerElement.clientWidth || CANVAS_WIDTH || 1280;
      setViewportWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(() => updateWidth());
      resizeObserver.observe(containerElement);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [CANVAS_WIDTH, viewportRef]);

  // Handle horizontal scrolling via mouse wheel
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.deltaY !== 0 && !e.shiftKey && scrollContainerRef.current) {
        e.preventDefault();
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  const currentIndex = useMemo(
    () => getCurrentIndex(roadmapPhases, currentPhaseProgress),
    [currentPhaseProgress, roadmapPhases],
  );
  const payloadDoneThroughIndex = useMemo(
    () => getPayloadDoneThroughIndex(roadmapPhases, currentPhaseProgress),
    [currentPhaseProgress, roadmapPhases],
  );

  const FISHBONE_GLOBAL_SCALE = 0.9; // THAY ĐỔI CHỈ SỐ NÀY ĐỂ ZOOM TO/NHỎ TOÀN BỘ XƯƠNG CÁ (VD: 0.8 là nhỏ đi 20%, 1.2 là to lên 20%)
  const FISHBONE_VERTICAL_SCALE = 0.5; // THAY ĐỔI CHỈ SỐ NÀY ĐỂ TĂNG/GIẢM KHÔNG GIAN CHIỀU DỌC TRÊN DƯỚI (VD: 0.8 là lùn đi, 1.2 là cao lên)

  const baseLayoutConfig = useMemo(() => getResponsiveLayout(viewportWidth), [viewportWidth]);
  const layoutConfig = useMemo(() => ({
    ...baseLayoutConfig,
    svgHeight: baseLayoutConfig.svgHeight * FISHBONE_VERTICAL_SCALE,
    centerY: baseLayoutConfig.centerY * FISHBONE_VERTICAL_SCALE,
  }), [baseLayoutConfig]);

  const effectiveZoomLevel = clamp(zoomLevel, layoutConfig.minZoom, layoutConfig.maxZoom) * FISHBONE_GLOBAL_SCALE;

  const totalWidth = computeTotalWidth(roadmapPhases.length, layoutConfig);
  const wavePath = computeWavePath(roadmapPhases.length, layoutConfig);
  const scaledWidth = Math.max(totalWidth * effectiveZoomLevel, 1);

  const scrollByOffset = (offset) => {
    scrollContainerRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const zoomIn = () => setZoomLevel((current) => clamp(current + ZOOM_STEP, layoutConfig.minZoom, layoutConfig.maxZoom));
  const zoomOut = () => setZoomLevel((current) => clamp(current - ZOOM_STEP, layoutConfig.minZoom, layoutConfig.maxZoom));
  const resetFishboneViewport = () => {
    setZoomLevel(layoutConfig.defaultZoom);
    scrollContainerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const handleSelectKnowledgeFromDrawer = (phaseId, knowledgeId, isLocked) => {
    if (isLocked) return;

    const normalizedPhaseId = Number(phaseId);
    const normalizedKnowledgeId = Number(knowledgeId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
    if (!Number.isInteger(normalizedKnowledgeId) || normalizedKnowledgeId <= 0) return;

    onSelectCenterRoadmap?.(normalizedPhaseId, { knowledgeId: normalizedKnowledgeId });
    setSelectedPhaseId(null);
  };

  const handlePhaseCardClick = (phase) => {
    const normalizedPhaseId = Number(phase?.phaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;

    const phaseKnowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
    if (phaseKnowledges.length === 0) {
      onSelectCenterRoadmap?.(normalizedPhaseId);
      return;
    }

    setSelectedPhaseId(normalizedPhaseId);
  };

  const content = (
    <div className={`${isExpandedMode
      ? `fixed inset-3 sm:inset-5 z-[140] rounded-2xl border shadow-2xl flex flex-col transition-all duration-200 ease-out ${isExpandedClosing ? "animate-[roadmapPopOut_180ms_ease-in_forwards]" : "animate-[roadmapPopIn_180ms_ease-out]"} ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`
      : `h-full flex flex-col ${isDarkMode ? "bg-slate-900" : "bg-white"}`}`}
    >
      <div
        ref={viewportRef}
        className={`relative flex-1 flex flex-col overflow-hidden ${isDarkMode ? "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]"}`}
        onDragStart={(event) => event.preventDefault()}
      >
        {isExpandedMode ? (
          <div className="absolute top-3 left-3 z-20">
            <button
              type="button"
              title={isExpandedHeaderHidden ? labels.showTopBar : labels.hideTopBar}
              aria-label={isExpandedHeaderHidden ? labels.showTopBar : labels.hideTopBar}
              onClick={() => setIsExpandedHeaderHidden((current) => !current)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-100"}`}
            >
              {isExpandedHeaderHidden ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              <span className={`text-xs font-medium ${fontClass}`}>
                {isExpandedHeaderHidden ? labels.showTopBar : labels.hideTopBar}
              </span>
            </button>
          </div>
        ) : null}

        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            type="button"
            title={labels.zoomOut}
            aria-label={labels.zoomOut}
            onClick={zoomOut}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-100"}`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            title={labels.zoomIn}
            aria-label={labels.zoomIn}
            onClick={zoomIn}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-100"}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            title={isExpandedMode ? labels.collapse : labels.expand}
            aria-label={isExpandedMode ? labels.collapse : labels.expand}
            onClick={() => {
              if (isExpandedMode) {
                closeExpandedView();
                return;
              }
              openExpandedView();
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-100"}`}
          >
            {isExpandedMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        <section
          role="region"
          aria-label={labels.selectorTitle}
          className={`relative flex-1 flex flex-col overflow-visible ${isExpandedMode
            ? `m-2 sm:m-3 lg:m-4 rounded-[20px] sm:rounded-[24px] border shadow-[0_24px_56px_-42px_rgba(15,23,42,0.28)] ${isDarkMode ? "border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" : "border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50"}`
            : "m-0 rounded-none border-0 bg-transparent shadow-none"
          }`}
        >
          <button
            type="button"
            className={`absolute -left-4 sm:-left-5 top-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-600 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white/95 text-slate-600 hover:bg-white"}`}
            onClick={() => scrollByOffset(-layoutConfig.phaseGap)}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={`absolute -right-4 sm:-right-5 top-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 -translate-y-1/2 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-600 bg-slate-900/95 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white/95 text-slate-600 hover:bg-white"}`}
            onClick={() => scrollByOffset(layoutConfig.phaseGap)}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-4 sm:w-6 ${isDarkMode ? "bg-gradient-to-r from-slate-900 to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent"}`} />
          <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-4 sm:w-6 ${isDarkMode ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-slate-50 to-transparent"}`} />

          <div
            ref={scrollContainerRef}
            className="relative flex-1 overflow-x-auto overflow-y-hidden flex items-center"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="relative shrink-0" style={{ width: scaledWidth, height: layoutConfig.svgHeight }}>
              <div
                className="absolute left-0 top-0 flex items-center justify-center"
                style={{
                  width: totalWidth,
                  height: layoutConfig.svgHeight,
                  transform: `scale(${effectiveZoomLevel})`,
                  transformOrigin: "left center",
                }}
              >
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={totalWidth}
                  height={layoutConfig.svgHeight}
                  viewBox={`0 0 ${totalWidth} ${layoutConfig.svgHeight}`}
                >
                  <defs>
                    <linearGradient id="overview-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="40%" stopColor="#14b8a6" />
                      <stop offset="70%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="overview-wave-dim" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.14" />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
                    </linearGradient>
                  </defs>

                  <path d={wavePath} fill="none" stroke="url(#overview-wave-dim)" strokeWidth={layoutConfig.waveGlowStroke} strokeLinecap="round" />
                  <path d={wavePath} fill="none" stroke="url(#overview-wave-grad)" strokeWidth={layoutConfig.waveStroke} strokeLinecap="round" />
                  <path d={wavePath} fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.32" strokeDasharray="8 12" />

                  {roadmapPhases.map((phase, index) => {
                    const state = getVisualState(phase, index, currentIndex, payloadDoneThroughIndex);
                    const x = getPhaseX(index, layoutConfig.padLeft, layoutConfig.phaseGap);
                    const y = getPhaseY(index, layoutConfig.centerY, layoutConfig.amplitude);
                    const above = isCardAbove(index);
                    const nodeRadius = state === "current" ? layoutConfig.currentNodeRadius : layoutConfig.nodeRadius;
                    const boneEndY = above ? y - layoutConfig.boneLength : y + layoutConfig.boneLength;

                    return (
                      <g key={`node:${phase.phaseId || index}`}>
                        <line
                          x1={x}
                          y1={y + (above ? -nodeRadius - 4 : nodeRadius + 4)}
                          x2={x}
                          y2={boneEndY}
                          stroke={NODE_COLORS[state]}
                          strokeWidth="2"
                          strokeDasharray={state === "locked" ? "4 4" : "none"}
                          opacity={state === "locked" ? 0.45 : 0.74}
                        />
                        <circle cx={x} cy={boneEndY} r="3" fill={NODE_COLORS[state]} opacity={state === "locked" ? 0.45 : 0.64} />
                        <circle cx={x} cy={y} r={nodeRadius + 8} fill={NODE_COLORS[state]} opacity={state === "locked" ? 0.16 : 0.24} />
                        
                        {state === "current" && (
                          <circle cx={x} cy={y} r={nodeRadius + 3} fill="none" stroke={NODE_COLORS.current} strokeWidth="2" opacity="0.6">
                            <animate attributeName="r" from={nodeRadius + 3} to={nodeRadius + 18} dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        
                        <circle cx={x} cy={y} r={nodeRadius + 3} fill="#fff" />
                        <circle cx={x} cy={y} r={nodeRadius} fill={NODE_COLORS[state]} />
                        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="10" fontWeight="700">
                          {index + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {roadmapPhases.map((phase, index) => {
                  const state = getVisualState(phase, index, currentIndex, payloadDoneThroughIndex);
                  const StatusIcon = STATUS_ICONS[state];
                  const above = isCardAbove(index);
                  const x = getPhaseX(index, layoutConfig.padLeft, layoutConfig.phaseGap);
                  const y = getPhaseY(index, layoutConfig.centerY, layoutConfig.amplitude);
                  const cardTop = above
                    ? y - layoutConfig.boneLength - layoutConfig.cardHeight - 12
                    : y + layoutConfig.boneLength + 12;
                  const isLocked = state === "locked";

                  const borderColor = {
                    done: "border-emerald-400",
                    current: "border-sky-400",
                    next: "border-amber-400",
                    locked: "border-slate-300",
                  }[state];

                  const cardSurface = {
                    done: isDarkMode ? "bg-emerald-900/20" : "bg-emerald-50/90",
                    current: isDarkMode ? "bg-sky-900/20" : "bg-sky-50/90",
                    next: isDarkMode ? "bg-amber-900/20" : "bg-amber-50/90",
                    locked: isDarkMode ? "bg-slate-900/85" : "bg-slate-100/95",
                  }[state];

                  const accentBar = {
                    done: "bg-emerald-500",
                    current: "bg-sky-500",
                    next: "bg-amber-500",
                    locked: "bg-slate-400",
                  }[state];

                  return (
                    <div
                      key={`phase-card:${phase.phaseId || index}`}
                      className="absolute"
                      style={{
                        left: x - layoutConfig.cardWidth / 2,
                        top: cardTop,
                        width: layoutConfig.cardWidth,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handlePhaseCardClick(phase)}
                        className={`relative block w-full overflow-hidden rounded-xl border-2 text-left shadow-sm transition-all duration-300 ${borderColor} ${cardSurface} ${isLocked
                          ? "opacity-85 saturate-0"
                          : state === "current"
                            ? "shadow-lg ring-2 ring-sky-300/70"
                            : "hover:shadow-md"
                        }`}
                      >
                        <div className={`h-1 w-full ${accentBar}`} />

                        <div className="p-2.5 sm:p-3">
                          <div className="mb-1 flex items-center gap-1.5">
                            <span className={`text-[10px] uppercase tracking-[0.16em] font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                              {labels.phase} {index + 1}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_BADGE_STYLES[state]}`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {state === "done"
                                ? t("workspace.shell.phaseCompleted", "Completed")
                                : state === "current"
                                  ? t("workspace.shell.phaseCurrent", "Current")
                                  : state === "next"
                                    ? t("workspace.timeline.phaseNext", "Next")
                                    : t("workspace.shell.phaseLocked", "Locked")}
                            </span>
                          </div>

                          <h4 className={`leading-none font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`} style={{ fontSize: layoutConfig.cardWidth < 180 ? 12 : 13, lineHeight: 1.35 }}>
                            <span className={fontClass}>{phase?.title}</span>
                          </h4>

                          <p className={`mt-1 leading-5 line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`} style={{ fontSize: layoutConfig.cardWidth < 180 ? 10 : 11 }}>
                            {phase?.description || t("workspace.shell.phaseDescriptionFallback", "This phase is ready for knowledge and quiz generation.")}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {formatPhaseDurationLabel(phase, t) ? (
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                                {formatPhaseDurationLabel(phase, t)}
                              </span>
                            ) : null}
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                              {(phase?.knowledges ?? []).length} {labels.knowledges}
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedPhaseDetail ? (
            <>
              <button
                type="button"
                aria-label={t("workspace.roadmap.canvas.closePhaseDetail", "Close phase detail")}
                onClick={() => setSelectedPhaseId(null)}
                className="fixed inset-0 z-[170] bg-slate-950/45 backdrop-blur-[1px] animate-[roadmapFadeIn_180ms_ease-out]"
              />

              <aside
                className={`fixed inset-y-0 right-0 z-[180] w-full max-w-[520px] border-l shadow-2xl backdrop-blur-sm animate-[roadmapSlideInRight_220ms_ease-out] ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                onWheelCapture={(event) => event.stopPropagation()}
              >
                <div className="flex h-full flex-col">
                  <div className={`flex items-start justify-between gap-3 border-b px-4 py-4 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {labels.phase}
                      </p>
                      <h3 className={`mt-1 text-lg font-bold leading-snug ${fontClass}`}>
                        {selectedPhaseDetail?.title || t("workspace.roadmap.phaseUntitled", "Untitled phase")}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPhaseId(null)}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
                      aria-label={t("workspace.roadmap.canvas.closePhaseDetail", "Close phase detail")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className={`flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-4 py-4 ${isDarkMode ? "bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-900/90" : "bg-gradient-to-b from-white via-sky-50/50 to-cyan-50/60"}`} onWheelCapture={(event) => event.stopPropagation()}>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}>
                      {selectedPhaseDetail?.description || t("workspace.shell.phaseDescriptionFallback", "This phase is ready for knowledge and quiz generation.")}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "border-sky-700/60 bg-sky-900/30 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
                        {(selectedPhaseDetail?.knowledges ?? []).length} {labels.knowledges}
                      </span>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${isDarkMode ? "border-emerald-700/60 bg-emerald-900/30 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                        {selectedPhaseDoneKnowledgeCount}/{selectedPhaseKnowledges.length} {t("workspace.shell.phaseCompleted", "Completed")}
                      </span>
                    </div>

                    {selectedPhaseKnowledges.length === 0 ? (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${isDarkMode ? "border-slate-700 bg-slate-900/80 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                        {t("workspace.roadmap.canvas.noKnowledgeInPhase", "This phase does not have knowledge items yet.")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedPhaseKnowledges.map((knowledge, knowledgeIndex) => {
                          const knowledgeState = selectedPhaseKnowledgeStates[knowledgeIndex] || "current";
                          const isKnowledgeDone = knowledgeState === "done";
                          const isKnowledgeLocked = knowledgeState === "locked";
                          const isKnowledgeCurrent = knowledgeState === "current";
                          const knowledgeBadgeClassName = isKnowledgeDone
                            ? (isDarkMode ? "bg-emerald-900/50 text-emerald-200" : "bg-emerald-100 text-emerald-800")
                            : isKnowledgeCurrent
                              ? (isDarkMode ? "bg-sky-900/50 text-sky-200" : "bg-sky-100 text-sky-800")
                              : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700");
                          const KnowledgeStatusIcon = isKnowledgeLocked ? Lock : CircleDot;
                          const knowledgeStatusLabel = isKnowledgeDone
                            ? t("workspace.shell.phaseCompleted", "Completed")
                            : isKnowledgeCurrent
                              ? t("workspace.shell.phaseCurrent", "Current")
                              : t("workspace.shell.phaseLocked", "Locked");
                          const knowledgeSurfaceClassName = isKnowledgeDone
                            ? (isDarkMode
                              ? "border-emerald-700/50 bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-cyan-950/30"
                              : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50")
                            : isKnowledgeCurrent
                              ? (isDarkMode
                                ? "border-sky-700/50 bg-gradient-to-br from-sky-950/40 via-blue-950/30 to-indigo-950/30"
                                : "border-sky-200 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50")
                              : (isDarkMode
                                ? "border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800"
                                : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100");

                          return (
                            <button
                              type="button"
                              key={`overview-phase-knowledge-${knowledge?.knowledgeId || knowledgeIndex}`}
                              onClick={() => handleSelectKnowledgeFromDrawer(selectedPhaseDetail?.phaseId, knowledge?.knowledgeId, isKnowledgeLocked)}
                              className={`w-full rounded-2xl border p-3 text-left transition-all duration-200 ${knowledgeSurfaceClassName} ${isKnowledgeLocked
                                ? "cursor-not-allowed opacity-75"
                                : "active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md"
                              }`}
                              disabled={isKnowledgeLocked}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                                    {t("workspace.roadmap.canvas.knowledge", "Knowledge")} {knowledgeIndex + 1}
                                  </p>
                                  <p className={`mt-1 text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
                                    {knowledge?.title || t("workspace.roadmap.knowledgeUntitled", "Untitled knowledge")}
                                  </p>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${knowledgeBadgeClassName}`}>
                                  <KnowledgeStatusIcon className="h-3 w-3" />
                                  {knowledgeStatusLabel}
                                </span>
                              </div>

                              {knowledge?.description ? (
                                <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}>
                                  {knowledge.description}
                                </p>
                              ) : null}

                              {/* <div className="mt-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-2.5 py-2 text-xs text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                                <span className="font-semibold text-slate-600">
                                  {t("workspace.roadmap.canvas.openInStage", "Open in stage view")}
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              </div> */}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-2 sm:bottom-3 z-20 flex justify-center px-2 sm:px-4">
            <div className={`flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border px-2 sm:px-2.5 py-1 backdrop-blur-sm ${isDarkMode ? "border-slate-700 bg-slate-900/85" : "border-slate-200/90 bg-white/92"}`}>
              {[
                { state: "done", label: t("workspace.shell.phaseCompleted", "Completed") },
                { state: "current", label: t("workspace.shell.phaseCurrent", "Current") },
                { state: "next", label: t("workspace.timeline.phaseNext", "Next") },
                { state: "locked", label: t("workspace.shell.phaseLocked", "Locked") },
              ].map(({ state, label }) => (
                <div key={state} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NODE_COLORS[state] }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      <style>{`@keyframes roadmapFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes roadmapFadeOut { from { opacity: 1; } to { opacity: 0; } } @keyframes roadmapPopIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } } @keyframes roadmapPopOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.97); } } @keyframes roadmapSlideInRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      {isExpanded ? (
        <div
          className="fixed inset-0 z-[130] bg-slate-950/60 backdrop-blur-[2px] animate-[roadmapFadeIn_180ms_ease-out]"
          onClick={() => setIsExpanded(false)}
        />
      ) : null}
      {content}
    </>
  );
}

export default RoadmapCanvasViewOverview;
