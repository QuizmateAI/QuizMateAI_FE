import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, Map } from "lucide-react";
import { getCurrentRoadmapKnowledgeProgress, getRoadmapGraph } from "@/api/RoadmapAPI";
import { getCurrentRoadmapPhaseProgress } from "@/api/RoadmapPhaseAPI";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import HoverMarqueeText from "@/Components/ui/HoverMarqueeText";

function RoadmapJourPanel({
  isDarkMode = false,
  workspaceId = null,
  isStudyNewRoadmap = false,
  isCollapsed = false,
  onToggleCollapse,
  selectedPhaseId: selectedPhaseIdProp = null,
  selectedKnowledgeId: selectedKnowledgeIdProp = null,
  onSelectPhase,
  reloadToken = 0,
  isGeneratingRoadmapPhases = false,
  roadmapPhaseGenerationProgress = 0,
  progressTracking = null,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  generatingPreLearningPhaseIds = [],
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [globalCurrentPhasePayload, setGlobalCurrentPhasePayload] = useState(null);
  const [currentKnowledgePayload, setCurrentKnowledgePayload] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);
  const selectedPhaseRef = useRef(null);
  const selectPhaseDebounceRef = useRef(null);
  const onSelectPhaseRef = useRef(onSelectPhase);

  useEffect(() => {
    onSelectPhaseRef.current = onSelectPhase;
  }, [onSelectPhase]);

  const queueSelectPhase = useCallback((phaseId, options = { preserveActiveView: false }) => {
    if (options?.focusRoadmapCenter) {
      onSelectPhaseRef.current?.(phaseId, options);
      return;
    }

    if (selectPhaseDebounceRef.current) {
      window.clearTimeout(selectPhaseDebounceRef.current);
    }

    selectPhaseDebounceRef.current = window.setTimeout(() => {
      onSelectPhaseRef.current?.(phaseId, options);
      selectPhaseDebounceRef.current = null;
    }, 180);
  }, []);

  useEffect(() => {
    selectedPhaseRef.current = selectedPhaseIdProp ?? selectedPhaseId;
  }, [selectedPhaseId, selectedPhaseIdProp]);

  useEffect(() => {
    const normalizedPhaseId = Number(selectedPhaseIdProp);
    if (Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
      setSelectedPhaseId(normalizedPhaseId);
      return;
    }
    if (selectedPhaseIdProp === null) {
      setSelectedPhaseId(null);
    }
  }, [selectedPhaseIdProp]);

  useEffect(() => {
    const normalizedKnowledgeId = Number(selectedKnowledgeIdProp);
    if (Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0) {
      setSelectedKnowledgeId(normalizedKnowledgeId);
      return;
    }
    if (selectedKnowledgeIdProp === null) {
      setSelectedKnowledgeId(null);
    }
  }, [selectedKnowledgeIdProp]);

  const loadRoadmap = useCallback(async () => {
    if (!workspaceId) {
      setRoadmap(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getRoadmapGraph({ workspaceId });
      const nextRoadmap = response?.data?.data ?? null;
      setRoadmap(nextRoadmap);

      const normalizedRoadmapId = Number(nextRoadmap?.roadmapId);
      if (Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0) {
        try {
          const currentResponse = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
          setGlobalCurrentPhasePayload(currentResponse?.data?.data || currentResponse?.data || null);
        } catch (currentErr) {
          console.error("Failed to load global phase progress in panel", currentErr);
        }
        try {
          const currentKnowledgeResponse = await getCurrentRoadmapKnowledgeProgress(normalizedRoadmapId);
          setCurrentKnowledgePayload(currentKnowledgeResponse?.data?.data || currentKnowledgeResponse?.data || null);
        } catch (currentKnowledgeErr) {
          console.error("Failed to load global knowledge progress in panel", currentKnowledgeErr);
          setCurrentKnowledgePayload(null);
        }
      }

      const firstPhaseId = nextRoadmap?.phases?.[0]?.phaseId ?? null;
      if (!selectedPhaseRef.current) {
        setSelectedPhaseId(firstPhaseId);
        queueSelectPhase(firstPhaseId, { preserveActiveView: true });
      }
    } catch {
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    return () => {
      if (selectPhaseDebounceRef.current) {
        window.clearTimeout(selectPhaseDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap, reloadToken]);

  const phases = useMemo(() => {
    const rawPhases = roadmap?.phases ?? [];
    return [...rawPhases].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0));
  }, [roadmap?.phases]);

  const isPhaseFinishedStatus = useCallback((phaseStatus) => {
    const normalizedStatus = String(phaseStatus || "").toUpperCase();
    return normalizedStatus === "COMPLETED" || normalizedStatus === "SKIPPED";
  }, []);

  const maxUnlockedPhaseIndex = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) return 0;

    const globalPhaseId = Number(globalCurrentPhasePayload?.phaseId);
    const globalCurrentIndex = Number.isInteger(globalPhaseId)
      ? phases.findIndex((phase) => Number(phase?.phaseId) === globalPhaseId)
      : -1;

    let contiguousFinishedCount = 0;
    for (let index = 0; index < phases.length; index += 1) {
      if (!isPhaseFinishedStatus(phases[index]?.status)) break;
      contiguousFinishedCount += 1;
    }
    const unlockedByStatusIndex = Math.min(phases.length - 1, contiguousFinishedCount);

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

      return Math.max(0, unlockedByManualProgressIndex);
    }

    return Math.max(0, globalCurrentIndex, unlockedByStatusIndex);
  }, [globalCurrentPhasePayload?.phaseId, isPhaseFinishedStatus, isStudyNewRoadmap, phases]);

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
  const isCurrentKnowledgeDoneStatus = ["DONE", "COMPLETED", "SKIPPED"].includes(currentKnowledgeStatus);
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

  const effectiveSelectedPhaseId = selectedPhaseIdProp ?? selectedPhaseId;

  if (isCollapsed) {
    return (
      <aside className={`w-full min-w-0 rounded-2xl border h-full flex flex-col items-center ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className={`w-full h-12 px-2 border-b flex items-center justify-center ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-700"}`}
            title={t("workspace.roadmap.title", "Roadmap")}
          >
            <Map className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`w-full min-w-0 rounded-2xl border h-full overflow-hidden flex flex-col ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      {/* <div className={`px-4 h-12 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
        <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-slate-800"} ${fontClass}`}>
          {t("workspace.roadmap.title", "Roadmap")}
        </p>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-700"}`}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div> */}

      <div className={loading ? "flex-1 p-4" : "flex-1 overflow-y-auto p-4 space-y-4"}>
        {loading ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
            <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <p className={`text-sm text-center ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
              {t("workspace.roadmap.loading.title", "Đang tải roadmap")}
            </p>
          </div>
        ) : isGeneratingRoadmapPhases ? (
          <div className={`rounded-2xl border px-4 py-5 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-300 bg-slate-50"}`}>
            <div className="flex items-center gap-3">
              <CircularProgressLoader
                percent={Math.max(0, Math.min(100, Number(roadmapPhaseGenerationProgress) || 0))}
                size="sm"
                color="blue"
              />
              <p className={`text-sm ${fontClass} ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
                {t("workspace.roadmap.phaseGenerating.title", "Vui lòng đợi\n Quizmate AI tạo phase")}
              </p>
            </div>
          </div>
        ) : !roadmap ? (
          <div className={`rounded-2xl border px-4 py-5 ${isDarkMode ? "border-slate-800 bg-slate-950/60 text-slate-400" : "border-slate-300 bg-slate-200 text-slate-600"}`}>
            <p className={`text-sm ${fontClass}`}>{t("workspace.roadmap.noRoadmapYet", "Chưa có roadmap")}</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                const normalizedRoadmapId = Number(roadmap?.roadmapId ?? roadmap?.id);
                setSelectedPhaseId(null);
                setSelectedKnowledgeId(null);
                queueSelectPhase(null, {
                  preserveActiveView: false,
                  knowledgeId: null,
                  focusRoadmapCenter: true,
                  roadmapId: Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
                    ? normalizedRoadmapId
                    : null,
                });
              }}
              className={`w-full relative overflow-hidden rounded-xl border px-4 py-4 text-left transition-all active:scale-[0.995] ${isDarkMode
                ? "border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 hover:border-slate-600"
                : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 hover:border-slate-300"}`}
            >
              <div
                className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full ${isDarkMode ? "bg-blue-500/10" : "bg-blue-200/60"}`}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border ${isDarkMode
                    ? "border-blue-700/60 bg-blue-900/40 text-blue-300"
                    : "border-blue-200 bg-blue-100 text-blue-700"}`}
                >
                  <Map className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    {t("workspace.roadmap.canvas.centralRoadmap", "Central roadmap")}
                  </p>
                  <h3 className={`mt-1 text-base font-semibold leading-6 whitespace-normal break-words ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                    {roadmap.title}
                  </h3>
                </div>
              </div>
            </button>

            <div className="space-y-2">
              <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.phase", "Phase")}
              </p>
              <div className="py-1 space-y-1">
                {phases.map((phase, index) => {
                      const normalizedPhaseId = Number(phase?.phaseId);
                      const active = effectiveSelectedPhaseId === phase.phaseId;
                      const hasExistingPreLearning = Array.isArray(phase?.preLearningQuizzes)
                        && phase.preLearningQuizzes.length > 0;
                      const isLockedPhase = index > maxUnlockedPhaseIndex && !hasExistingPreLearning;
                      const normalizedPhaseStatus = String(phase?.status || "").toUpperCase();
                      const isCompletedPhase = isPhaseVisuallyCompleted(phase, index);
                      const isGeneratingByClientState = generatingKnowledgePhaseIds.includes(normalizedPhaseId)
                        || generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId)
                        || generatingPreLearningPhaseIds.includes(normalizedPhaseId);
                      const isProcessingPhase = !isCompletedPhase && (
                        normalizedPhaseStatus === "PROCESSING"
                        || isGeneratingByClientState
                      );
                      const isInProgressPhase = !isCompletedPhase && !isProcessingPhase && !isLockedPhase && (
                        normalizedPhaseStatus === "IN_PROGRESS"
                        || normalizedPhaseStatus === "INPROGRESS"
                        || normalizedPhaseStatus === "STARTED"
                        || normalizedPhaseStatus === "ONGOING"
                      );

                      let statusText = t("workspace.quiz.statusLabels.ACTIVE", "Đang hoạt động");
                      let statusColorClass = "text-blue-600 dark:text-blue-400";

                      if (isCompletedPhase) {
                        statusText = t("workspace.quiz.statusLabels.COMPLETED", "Hoàn thành");
                        statusColorClass = "text-green-600";
                      } else if (isProcessingPhase) {
                        statusText = t("workspace.quiz.statusLabels.PROCESSING", "Đang xử lý");
                        statusColorClass = "text-yellow-500";
                      } else if (isInProgressPhase) {
                        statusText = t("workspace.quiz.statusLabels.IN_PROGRESS", "Đang học");
                        statusColorClass = "text-blue-600 dark:text-blue-400";
                      } else if (isLockedPhase) {
                        statusText = t("workspace.quiz.statusLabels.LOCKED", "Đã khóa");
                        statusColorClass = "text-slate-500 dark:text-slate-400";
                      }

                      return (
                        <div key={phase.phaseId} className="relative w-full">
                          {index < phases.length - 1 && (
                            <div className={`absolute left-[26px] top-[42px] bottom-[-24px] w-[2px] ${isDarkMode ? "bg-slate-700" : "bg-slate-200"} z-0`} />
                          )}

                          <div className="relative z-10 w-full pt-1 pb-1">
                            <button
                              type="button"
                              onClick={() => {
                                const normalizedRoadmapId = Number(roadmap?.roadmapId ?? roadmap?.id);
                                setSelectedPhaseId(phase.phaseId);
                                setSelectedKnowledgeId(null);
                                queueSelectPhase(phase.phaseId, {
                                  preserveActiveView: false,
                                  roadmapId: Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
                                    ? normalizedRoadmapId
                                    : null,
                                });
                              }}
                              className={`w-full rounded-xl px-4 py-3 text-left flex items-center gap-4 transition-all ${active
                                ? isDarkMode
                                  ? "bg-slate-800"
                                  : "bg-[#E5F0FF]"
                                : isDarkMode
                                  ? "bg-transparent hover:bg-slate-800/30"
                                  : "bg-transparent hover:bg-slate-50"
                              }`}
                            >
                              <div className="shrink-0 flex items-center justify-center">
                                {isCompletedPhase ? (
                                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                  </div>
                                ) : isProcessingPhase ? (
                                  <div className={`w-6 h-6 rounded-full border ${isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"} flex items-center justify-center`}>
                                    <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                                  </div>
                                ) : (
                                  <div className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center ${active
                                    ? "border-blue-200 bg-white dark:bg-slate-900"
                                    : isLockedPhase
                                      ? isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-slate-100"
                                      : isDarkMode ? "border-slate-500 bg-slate-900" : "border-slate-300 bg-white"}`}>
                                    <span className={`text-[10px] font-semibold leading-none ${active
                                      ? "text-blue-600 dark:text-blue-300"
                                      : isLockedPhase
                                        ? isDarkMode ? "text-slate-400" : "text-slate-500"
                                        : isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                                      {index + 1}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 flex flex-col justify-center min-w-0 overflow-hidden">
                                <HoverMarqueeText
                                  text={phase.title || `${t("workspace.roadmap.canvas.phase", "Phase")} ${index + 1}`}
                                  containerClassName="flex-1 w-full"
                                  className={`text-sm ${
                                    isLockedPhase
                                      ? (isDarkMode ? "text-slate-500" : "text-slate-400")
                                      : (isDarkMode ? "text-slate-200" : "text-slate-900")
                                  } ${fontClass}`}
                                  alwaysRun={active}
                                />
                                <span className={`text-xs mt-0.5 ${statusColorClass} ${fontClass}`}>
                                  {statusText}
                                </span>
                              </div>
                            </button>

                            {active && phase.knowledges?.length > 0 && (
                              <div className="mt-2 relative pl-[44px] pr-2 space-y-1 pb-1 z-10 w-full overflow-hidden">
                                {phase.knowledges.map((knowledge) => {
                                  const normalizedKnowledgeStatus = String(knowledge?.status || "").toUpperCase();
                                  const isKnowledgeCompleted = normalizedKnowledgeStatus === "COMPLETED";
                                  const normalizedKnowledgeId = Number(knowledge?.knowledgeId);
                                  const knowledgeIndex = phase.knowledges.findIndex(
                                    (item) => Number(item?.knowledgeId) === normalizedKnowledgeId,
                                  );
                                  const knowledgeQuizRequestKey = `${normalizedPhaseId}:${normalizedKnowledgeId}`;
                                  const currentKnowledgeIndexInPhase = Number.isInteger(currentKnowledgeId) && currentKnowledgeId > 0
                                    ? phase.knowledges.findIndex((item) => Number(item?.knowledgeId) === currentKnowledgeId)
                                    : -1;
                                  let contiguousCompletedKnowledgeCount = 0;
                                  for (let idx = 0; idx < phase.knowledges.length; idx += 1) {
                                    const status = String(phase.knowledges[idx]?.status || "").toUpperCase();
                                    if (!["COMPLETED", "DONE", "SKIPPED"].includes(status)) break;
                                    contiguousCompletedKnowledgeCount += 1;
                                  }
                                  const shouldUseSequentialFallbackLock = !isLockedPhase
                                    && !isCompletedPhase
                                    && index === maxUnlockedPhaseIndex
                                    && currentKnowledgePhaseIndex < 0
                                    && currentKnowledgeIndexInPhase < 0
                                    && phase.knowledges.length > 0;
                                  const isKnowledgeLockedBySequence = !isCompletedPhase && (
                                    (
                                      index === currentKnowledgePhaseIndex
                                      && currentKnowledgeIndexInPhase >= 0
                                      && knowledgeIndex > currentKnowledgeIndexInPhase + (isCurrentKnowledgeDoneStatus ? 1 : 0)
                                    )
                                    || (
                                      shouldUseSequentialFallbackLock
                                      && knowledgeIndex > contiguousCompletedKnowledgeCount
                                    )
                                  );
                                  const isKnowledgeLocked = normalizedKnowledgeStatus === "LOCKED"
                                    || isLockedPhase
                                    || isKnowledgeLockedBySequence;
                                  const isKnowledgeProcessing = !isKnowledgeCompleted && (
                                    normalizedKnowledgeStatus === "PROCESSING"
                                    || normalizedKnowledgeStatus === "GENERATING"
                                    || generatingKnowledgeQuizKnowledgeKeys.includes(knowledgeQuizRequestKey)
                                  );
                                  const isKnowledgeActive = Number(selectedKnowledgeId) === normalizedKnowledgeId;
                                  const knowledgeOrder = knowledgeIndex >= 0 ? knowledgeIndex + 1 : null;

                                  return (
                                    <button
                                      key={knowledge.knowledgeId}
                                      type="button"
                                      onClick={() => {
                                        if (!Number.isInteger(normalizedKnowledgeId) || normalizedKnowledgeId <= 0) return;
                                        const normalizedRoadmapId = Number(roadmap?.roadmapId ?? roadmap?.id);
                                        setSelectedPhaseId(phase.phaseId);
                                        setSelectedKnowledgeId(normalizedKnowledgeId);
                                        queueSelectPhase(phase.phaseId, {
                                          preserveActiveView: false,
                                          knowledgeId: normalizedKnowledgeId,
                                          roadmapId: Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
                                            ? normalizedRoadmapId
                                            : null,
                                        });
                                      }}
                                      className={`w-full rounded-xl px-3.5 py-2.5 text-left flex items-center gap-3 transition-all ${
                                        isKnowledgeActive
                                          ? isDarkMode
                                            ? "bg-slate-800"
                                            : "bg-[#E5F0FF]"
                                          : isDarkMode
                                            ? "bg-transparent hover:bg-slate-800/30"
                                            : "bg-transparent hover:bg-slate-50"
                                      }`}
                                    >
                                      {isKnowledgeCompleted ? (
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        </div>
                                      ) : isKnowledgeProcessing ? (
                                        <div className={`w-6 h-6 rounded-full border ${isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-white"} flex items-center justify-center shrink-0`}>
                                          <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                                        </div>
                                      ) : (
                                        <div className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isKnowledgeActive
                                          ? "border-blue-200 bg-white dark:bg-slate-900"
                                          : isKnowledgeLocked
                                            ? isDarkMode ? "border-slate-600 bg-slate-800" : "border-slate-300 bg-slate-100"
                                            : isDarkMode ? "border-slate-500 bg-slate-900" : "border-slate-300 bg-white"}`}>
                                          <span className={`text-[10px] font-semibold leading-none ${isKnowledgeActive
                                            ? "text-blue-600 dark:text-blue-300"
                                            : isKnowledgeLocked
                                              ? isDarkMode ? "text-slate-400" : "text-slate-500"
                                              : isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                                            {knowledgeOrder}
                                          </span>
                                        </div>
                                      )}

                                      <HoverMarqueeText
                                        text={knowledge.title}
                                        containerClassName="flex-1 min-w-0"
                                        className={`text-sm ${isKnowledgeLocked
                                          ? (isDarkMode ? "text-slate-500" : "text-slate-400")
                                          : isKnowledgeActive
                                            ? isDarkMode ? "text-blue-200" : "text-blue-800"
                                            : isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}
                                        alwaysRun={isKnowledgeActive}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default RoadmapJourPanel;
