import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, GitBranch, Layers3 } from "lucide-react";

const ROOT_CARD_WIDTH = 240;
const PHASE_CARD_WIDTH = 208;
const KNOWLEDGE_CARD_WIDTH = 196;
const TIMELINE_GAP = 24;
const TIMELINE_PADDING = 24;

function RoadmapCanvasView2({ roadmap, isDarkMode = false, fontClass = "font-sans" }) {
  const { t } = useTranslation();
  const timelineRef = useRef(null);
  const knowledgeBranchRef = useRef(null);
  const dragStateRef = useRef(null);
  const [selectedType, setSelectedType] = useState("roadmap");
  const [selectedPhaseId, setSelectedPhaseId] = useState(roadmap?.phases?.[0]?.phaseId ?? null);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState(null);

  const selectedPhase = selectedPhaseId
    ? roadmap?.phases?.find((phase) => phase.phaseId === selectedPhaseId) ?? null
    : null;
  const selectedKnowledge = selectedPhase && selectedKnowledgeId
    ? selectedPhase.knowledges.find((knowledge) => knowledge.knowledgeId === selectedKnowledgeId) ?? null
    : null;

  const selectedPhaseIndex = roadmap?.phases?.findIndex((phase) => phase.phaseId === selectedPhaseId) ?? -1;
  const branchOffset = selectedPhaseIndex < 0
    ? TIMELINE_PADDING
    : TIMELINE_PADDING + ROOT_CARD_WIDTH + TIMELINE_GAP + selectedPhaseIndex * (PHASE_CARD_WIDTH + TIMELINE_GAP);

  const getKnowledgeBranchViewportTarget = () => {
    const timelineElement = timelineRef.current;
    if (!timelineElement) {
      return null;
    }

    if (selectedType !== "phase" && selectedType !== "knowledge") {
      return { left: timelineElement.scrollLeft, top: 0 };
    }

    const knowledgeBranchElement = knowledgeBranchRef.current;
    if (!knowledgeBranchElement) {
      return null;
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

    return {
      left: Math.max(0, Math.min(rawLeft, maxLeft)),
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
  }, [selectedPhaseId, selectedType]);

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
    setSelectedKnowledgeId(null);
    timelineRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectPhase = (phaseId) => {
    setSelectedType("phase");
    setSelectedPhaseId(phaseId);
    setSelectedKnowledgeId(null);
  };

  const selectKnowledge = (phaseId, knowledgeId) => {
    setSelectedType("knowledge");
    setSelectedPhaseId(phaseId);
    setSelectedKnowledgeId(knowledgeId);
  };

  const summaryChips = [
    {
      key: "phaseCount",
      icon: Layers3,
      value: `${roadmap.stats.phaseCount} ${t("workspace.roadmap.canvas.phases")}`,
      accent: "text-emerald-500",
    },
    {
      key: "knowledgeCount",
      icon: GitBranch,
      value: `${roadmap.stats.knowledgeCount} ${t("workspace.roadmap.canvas.knowledges")}`,
      accent: "text-blue-500",
    },
    {
      key: "quizCount",
      icon: BookOpenCheck,
      value: `${roadmap.stats.quizCount} ${t("workspace.roadmap.canvas.quizzes")}`,
      accent: "text-amber-500",
    },
  ];

  const renderDetailContent = () => {
    if (selectedType === "knowledge" && selectedKnowledge && selectedPhase) {
      return (
        <div className="space-y-6">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
              {t("workspace.roadmap.canvas.view2KnowledgeDetail")}
            </p>
            <h3 className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {selectedKnowledge.title}
            </h3>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
              {selectedPhase.title}
            </p>
            <p className={`mt-4 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
              {selectedKnowledge.description}
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-blue-100 bg-[#F7FBFF]"}`}>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.quiz")}
              </p>
              <div className="mt-3 space-y-3">
                {selectedKnowledge.quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200" : "border-blue-100 bg-white text-gray-700"}`}
                  >
                    <p className={`text-sm font-medium ${fontClass}`}>{quiz.title}</p>
                    <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                      {quiz.questionCount} {t("workspace.roadmap.canvas.questions")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-amber-100 bg-[#FFF9ED]"}`}>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {t("workspace.roadmap.canvas.flashcard")}
              </p>
              <div className="mt-3 space-y-3">
                {selectedKnowledge.flashcards.map((flashcard) => (
                  <div
                    key={flashcard.id}
                    className={`rounded-2xl border px-4 py-3 ${isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200" : "border-amber-100 bg-white text-gray-700"}`}
                  >
                    <p className={`text-sm font-medium ${fontClass}`}>{flashcard.title}</p>
                    <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                      {flashcard.cardCount} {t("workspace.roadmap.canvas.cards")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedType === "phase" && selectedPhase) {
      return (
        <div className="space-y-6">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-sky-300" : "text-sky-700"} ${fontClass}`}>
              {t("workspace.roadmap.canvas.view2PhaseDetail")}
            </p>
            <h3 className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {selectedPhase.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
                {selectedPhase.durationLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
                {selectedPhase.knowledges.length} {t("workspace.roadmap.canvas.knowledges")}
              </span>
            </div>
            <p className={`mt-4 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
              {selectedPhase.description}
            </p>
          </div>

          <div className={`rounded-[26px] border p-4 ${isDarkMode ? "border-amber-900/50 bg-amber-950/20" : "border-amber-100 bg-amber-50"}`}>
            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
              {t("workspace.roadmap.canvas.postLearning")}
            </p>
            <div className={`mt-3 rounded-2xl border px-4 py-4 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-amber-100 bg-white"}`}>
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {selectedPhase.postLearning.title}
              </p>
              <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {selectedPhase.postLearning.questionCount} {t("workspace.roadmap.canvas.questions")}
              </p>
            </div>
          </div>

          <div>
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {t("workspace.roadmap.canvas.view2KnowledgeBranch")}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedPhase.knowledges.map((knowledge) => {
                const active = selectedKnowledgeId === knowledge.knowledgeId && selectedType === "knowledge";
                return (
                  <button
                    key={knowledge.knowledgeId}
                    type="button"
                    onClick={() => selectKnowledge(selectedPhase.phaseId, knowledge.knowledgeId)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-all ${active
                      ? isDarkMode
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-emerald-500 bg-emerald-50"
                      : isDarkMode
                        ? "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                        : "border-gray-200 bg-white hover:border-gray-300"}`}
                  >
                    <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                      {knowledge.title}
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                      {knowledge.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
            {t("workspace.roadmap.canvas.centralRoadmap")}
          </p>
          <h3 className={`mt-2 text-3xl font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {roadmap.title}
          </h3>
          <p className={`mt-4 text-sm leading-7 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {roadmap.description}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryChips.map((chip) => {
            const Icon = chip.icon;
            return (
              <div
                key={chip.key}
                className={`rounded-2xl border px-4 py-4 ${isDarkMode ? "border-slate-800 bg-slate-950/50" : "border-gray-200 bg-[#F8FBFF]"}`}
              >
                <Icon className={`h-4 w-4 ${chip.accent}`} />
                <p className={`mt-3 text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                  {chip.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className={`rounded-[26px] border px-5 py-4 ${isDarkMode ? "border-slate-800 bg-slate-950/50 text-slate-300" : "border-sky-100 bg-sky-50 text-gray-700"}`}>
          <p className={`text-sm ${fontClass}`}>{t("workspace.roadmap.canvas.view2RoadmapHint")}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full overflow-hidden ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className={`min-h-0 basis-1/4 rounded-[30px] border ${isDarkMode ? "border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" : "border-gray-200 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]"}`}>
          <div className="flex h-full flex-col overflow-hidden rounded-[30px]">
            <div
              ref={timelineRef}
              className="relative flex-1 overflow-x-auto overflow-y-auto"
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

              <div className="relative min-w-max pb-8 pl-6 pr-6 pt-7">
                <div className={`absolute left-[52px] right-[52px] top-[70px] h-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />

                <div className="relative flex items-start gap-6">
                  <button
                    type="button"
                    onClick={selectRoadmap}
                    style={{ width: ROOT_CARD_WIDTH }}
                    className={`relative z-20 shrink-0 rounded-[28px] border px-5 py-4 text-left shadow-[0_18px_48px_rgba(15,23,42,0.14)] transition-all ${selectedType === "roadmap"
                      ? isDarkMode
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-emerald-500 bg-emerald-50"
                      : isDarkMode
                        ? "border-slate-700 bg-slate-900/95 hover:border-slate-600"
                        : "border-white/80 bg-white/95 hover:border-blue-200"}`}
                  >
                    <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                      {t("workspace.roadmap.canvas.centralRoadmap")}
                    </p>
                    <h3 className={`mt-2 text-lg font-semibold leading-7 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                      {roadmap.title}
                    </h3>
                  </button>

                  {roadmap.phases.map((phase, index) => {
                    const active = selectedType !== "roadmap" && selectedPhaseId === phase.phaseId;
                    return (
                      <button
                        key={phase.phaseId}
                        type="button"
                        onClick={() => selectPhase(phase.phaseId)}
                        style={{ width: PHASE_CARD_WIDTH }}
                        className={`relative z-10 shrink-0 rounded-[26px] border px-4 py-4 text-left shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all ${active
                          ? isDarkMode
                            ? "border-sky-400 bg-sky-500/10"
                            : "border-sky-500 bg-sky-50"
                          : isDarkMode
                            ? "border-slate-700 bg-slate-900/95 hover:border-slate-600"
                            : "border-white/80 bg-white/95 hover:border-blue-200"}`}
                      >
                        <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-sky-300" : "text-sky-700"} ${fontClass}`}>
                          {t("workspace.roadmap.canvas.phase")} {index + 1}
                        </p>
                        <h4 className={`mt-2 text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                          {phase.title}
                        </h4>
                      </button>
                    );
                  })}
                </div>

                {selectedType !== "roadmap" && selectedPhase ? (
                  <div ref={knowledgeBranchRef} className="relative mt-7 min-h-[132px] pb-2" style={{ marginLeft: branchOffset }}>
                    <div className={`absolute left-8 top-[-20px] h-[20px] w-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />
                    <div className={`absolute left-8 right-0 top-0 h-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />
                    <div className="relative flex min-w-max items-start gap-3 pt-4">
                      {selectedPhase.knowledges.map((knowledge) => {
                        const active = selectedType === "knowledge" && selectedKnowledgeId === knowledge.knowledgeId;
                        return (
                          <button
                            key={knowledge.knowledgeId}
                            type="button"
                            onClick={() => selectKnowledge(selectedPhase.phaseId, knowledge.knowledgeId)}
                            style={{ width: KNOWLEDGE_CARD_WIDTH }}
                            className={`relative shrink-0 rounded-[22px] border px-3.5 py-3.5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.1)] transition-all ${active
                              ? isDarkMode
                                ? "border-emerald-400 bg-emerald-500/10"
                                : "border-emerald-500 bg-emerald-50"
                              : isDarkMode
                                ? "border-slate-700 bg-slate-950/95 hover:border-slate-600"
                                : "border-white/80 bg-white/95 hover:border-emerald-200"}`}
                          >
                            <div className={`absolute left-7 top-[-16px] h-[16px] w-[2px] ${isDarkMode ? "bg-slate-700" : "bg-blue-200"}`} />
                            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                              {t("workspace.roadmap.canvas.knowledges")}
                            </p>
                            <h5 className={`mt-2 text-sm font-semibold leading-5 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                              {knowledge.title}
                            </h5>
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

        <div className={`mt-4 min-h-0 basis-3/4 rounded-[30px] border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-gray-200 bg-white"}`}>
          <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
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
            <span className={`rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-700"}`}>
              {selectedType === "knowledge"
                ? t("workspace.roadmap.canvas.view2KnowledgeDetail")
                : selectedType === "phase"
                  ? t("workspace.roadmap.canvas.view2PhaseDetail")
                  : t("workspace.roadmap.canvas.centralRoadmap")}
            </span>
          </div>

          <div className="h-[calc(100%-4.5rem)] overflow-y-auto px-5 py-5">
            {renderDetailContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoadmapCanvasView2;
