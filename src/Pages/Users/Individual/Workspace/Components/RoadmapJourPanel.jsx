import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, ChevronsLeft, Loader2, Lock, Map } from "lucide-react";
import { getRoadmapGraph } from "@/api/RoadmapAPI";
import { getCurrentRoadmapPhaseProgress } from "@/api/RoadmapPhaseAPI";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import HoverMarqueeText from "@/Components/ui/HoverMarqueeText";

function RoadmapJourPanel({
  isDarkMode = false,
  workspaceId = null,
  isCollapsed = false,
  onToggleCollapse,
  selectedPhaseId: selectedPhaseIdProp = null,
  onSelectPhase,
  reloadToken = 0,
  isGeneratingRoadmapPhases = false,
  roadmapPhaseGenerationProgress = 0,
  progressTracking = null,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingPreLearningPhaseIds = [],
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [globalCurrentPhasePayload, setGlobalCurrentPhasePayload] = useState(null);
  const [isPhaseOpen, setIsPhaseOpen] = useState(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const selectedPhaseRef = useRef(null);

  useEffect(() => {
    selectedPhaseRef.current = selectedPhaseIdProp ?? selectedPhaseId;
  }, [selectedPhaseId, selectedPhaseIdProp]);

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
      }

      const firstPhaseId = nextRoadmap?.phases?.[0]?.phaseId ?? null;
      if (!selectedPhaseRef.current) {
        setSelectedPhaseId(firstPhaseId);
        onSelectPhase?.(firstPhaseId, { preserveActiveView: true });
      }
    } catch {
      setRoadmap(null);
    } finally {
      setLoading(false);
    }
  }, [onSelectPhase, workspaceId]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap, reloadToken]);

  const phases = useMemo(() => {
    const rawPhases = roadmap?.phases ?? [];
    return [...rawPhases].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0));
  }, [roadmap?.phases]);

  const maxUnlockedPhaseIndex = useMemo(() => {
    if (!globalCurrentPhasePayload?.phaseId) return 0;
    const globalPhaseId = Number(globalCurrentPhasePayload.phaseId);
    const idx = phases.findIndex((p) => Number(p.phaseId) === globalPhaseId);
    return Math.max(0, idx);
  }, [globalCurrentPhasePayload?.phaseId, phases]);

  const effectiveSelectedPhaseId = selectedPhaseIdProp ?? selectedPhaseId;

  if (isCollapsed) {
    return (
      <aside className={`rounded-2xl border h-full flex flex-col items-center ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
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
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className={`px-4 h-12 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
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
            <div
              className={`relative overflow-hidden rounded-xl border px-4 py-4 ${isDarkMode
                ? "border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40"
                : "border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50"}`}
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
            </div>

            <div className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
              <button
                type="button"
                onClick={() => setIsPhaseOpen((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
              >
                <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                  {t("workspace.roadmap.canvas.phase", "Phase")}
                </p>
                <ChevronDown className={`w-4 h-4 transition-transform ${isPhaseOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
              </button>

              {isPhaseOpen ? (
                <div className={`border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <div className="px-2 py-2 space-y-1">
                    {phases.map((phase, index) => {
                      const normalizedPhaseId = Number(phase?.phaseId);
                      const active = effectiveSelectedPhaseId === phase.phaseId;
                      const isLockedPhase = index > maxUnlockedPhaseIndex;
                      const normalizedPhaseStatus = String(phase?.status || "").toUpperCase();
                      const isCompletedPhase = normalizedPhaseStatus === "COMPLETED";
                      const phaseKnowledgePercent = progressTracking?.getKnowledgeProgress(normalizedPhaseId) ?? 0;
                      const phasePreLearningPercent = progressTracking?.getPreLearningProgress(normalizedPhaseId) ?? 0;
                      const phasePostLearningPercent = progressTracking?.getPostLearningProgress(normalizedPhaseId) ?? 0;
                      const phaseProcessingPercent = Math.max(
                        Number(phaseKnowledgePercent) || 0,
                        Number(phasePreLearningPercent) || 0,
                        Number(phasePostLearningPercent) || 0,
                        0
                      );
                      const isGeneratingByClientState = generatingKnowledgePhaseIds.includes(normalizedPhaseId)
                        || generatingKnowledgeQuizPhaseIds.includes(normalizedPhaseId)
                        || generatingPreLearningPhaseIds.includes(normalizedPhaseId);
                      const isProcessingPhase = !isCompletedPhase && (
                        normalizedPhaseStatus === "PROCESSING"
                        || isGeneratingByClientState
                        || (phaseProcessingPercent > 0 && phaseProcessingPercent < 100)
                      );
                      return (
                        <button
                          key={phase.phaseId}
                          type="button"
                          onClick={() => {
                            setSelectedPhaseId(phase.phaseId);
                            onSelectPhase?.(phase.phaseId, { preserveActiveView: false });
                          }}
                          className={`w-full rounded-lg px-3 py-2.5 text-left flex items-center gap-2 border-l-4 transition-all ${active
                            ? isDarkMode
                              ? "border-l-blue-500 bg-slate-800/50"
                              : "border-l-blue-500 bg-blue-50 text-blue-900"
                            : isDarkMode
                              ? "border-l-transparent bg-transparent hover:bg-slate-800/30"
                              : "border-l-transparent bg-transparent hover:bg-slate-50"}`}
                        >
                          {isLockedPhase ? (
                            <Lock className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                          ) : isCompletedPhase ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          ) : isProcessingPhase ? (
                            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin shrink-0" />
                          ) : (
                            <div className={`w-4 h-4 shrink-0 rounded-full border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
                          )}
                          <HoverMarqueeText
                            text={phase.title || `${t("workspace.roadmap.canvas.phase", "Phase")} ${index + 1}`}
                            containerClassName="flex-1"
                            className={`text-sm ${
                              isLockedPhase 
                                ? (isDarkMode ? "text-slate-500" : "text-slate-400")
                                : (isDarkMode ? "text-slate-200" : "text-gray-900")
                            } ${fontClass}`}
                            alwaysRun={active}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default RoadmapJourPanel;