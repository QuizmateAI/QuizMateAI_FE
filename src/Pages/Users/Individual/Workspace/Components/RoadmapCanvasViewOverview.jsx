import React from "react";
import { BookOpenCheck, ChevronDown, ChevronUp, Compass, GitBranch, GripHorizontal, Layers3, Map, Maximize2, Minimize2, Share2, TimerReset, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/Components/ui/button";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";

function RoadmapCanvasViewOverview({
  roadmap,
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
}) {
  const CANVAS_WIDTH = canvasWidth;
  const CANVAS_HEIGHT = canvasHeight;
  const CENTER_X = centerX;
  const CENTER_Y = centerY;
  const roadmapPhases = Array.isArray(roadmap?.phases) ? roadmap.phases : [];
  const ROOT_POSITION = { x: 250, y: 170 };
  const PHASE_X = 700;
  const KNOWLEDGE_X = 1210;
  const PHASE_START_Y = 170;
  const PHASE_CARD_BASE_HEIGHT = 188;
  const KNOWLEDGE_CARD_HEIGHT_COLLAPSED = 118;
  const KNOWLEDGE_CARD_HEIGHT_EXPANDED = 152;
  const KNOWLEDGE_CARD_VERTICAL_GAP = 22;
  const PHASE_BLOCK_GAP = 72;

  const estimatePhaseCardHeight = (phase) => {
    const title = String(phase?.title || "");
    const description = String(phase?.description || "");

    const estimatedTitleLines = Math.max(1, Math.ceil(title.length / 28));
    const estimatedDescriptionLines = Math.max(1, Math.ceil(description.length / 48));

    const titleHeight = estimatedTitleLines * 24;
    const descriptionHeight = estimatedDescriptionLines * 20;
    return Math.max(PHASE_CARD_BASE_HEIGHT, 112 + titleHeight + descriptionHeight);
  };

  const phaseOverviewLayouts = [];
  let phaseCursorTop = PHASE_START_Y;

  roadmapPhases.forEach((phase) => {
    const phaseKnowledges = Array.isArray(phase?.knowledges) ? phase.knowledges : [];
    const phaseKnowledgeLayouts = phaseKnowledges.map((knowledge) => {
      const isExpanded = Boolean(expandedKnowledges[knowledge?.knowledgeId]);
      return {
        knowledge,
        cardHeight: isExpanded ? KNOWLEDGE_CARD_HEIGHT_EXPANDED : KNOWLEDGE_CARD_HEIGHT_COLLAPSED,
      };
    });

    const phaseTrackHeight = phaseKnowledgeLayouts.length > 0
      ? phaseKnowledgeLayouts.reduce((totalHeight, currentKnowledge, index) => (
        totalHeight
        + currentKnowledge.cardHeight
        + (index > 0 ? KNOWLEDGE_CARD_VERTICAL_GAP : 0)
      ), 0)
      : 72;

    const phaseCardHeight = estimatePhaseCardHeight(phase);
    const phaseBlockHeight = Math.max(phaseCardHeight, phaseTrackHeight);
    const phaseY = phaseCursorTop + phaseBlockHeight / 2;
    const phaseTrackTop = phaseY - phaseTrackHeight / 2;

    let knowledgeCursorY = phaseTrackTop;
    const positionedKnowledges = phaseKnowledgeLayouts.map((knowledgeLayout) => {
      const knowledgeY = knowledgeCursorY + knowledgeLayout.cardHeight / 2;
      knowledgeCursorY += knowledgeLayout.cardHeight + KNOWLEDGE_CARD_VERTICAL_GAP;
      return {
        ...knowledgeLayout,
        y: knowledgeY,
      };
    });

    phaseOverviewLayouts.push({
      phase,
      phaseY,
      phaseTrackTop,
      phaseTrackHeight,
      knowledges: positionedKnowledges,
    });

    phaseCursorTop += phaseBlockHeight + PHASE_BLOCK_GAP;
  });

  const overviewCanvasHeight = Math.max(CANVAS_HEIGHT, phaseCursorTop + 240);
  const content = (
    <div className={`${isExpandedMode
      ? `fixed inset-3 sm:inset-5 z-[140] rounded-2xl border shadow-2xl flex flex-col transition-all duration-200 ease-out ${isExpandedClosing ? "animate-[roadmapPopOut_180ms_ease-in_forwards]" : "animate-[roadmapPopIn_180ms_ease-out]"} ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`
      : `h-full flex flex-col ${isDarkMode ? "bg-slate-900" : "bg-white"}`}`}
    >
      <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-in-out ${isExpandedMode && isExpandedHeaderHidden ? "max-h-0 opacity-0 -translate-y-3 pointer-events-none" : "max-h-[220px] opacity-100 translate-y-0"}`}>
      <div className={`px-5 py-4 border-b flex items-center justify-between gap-4 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div>
          <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {roadmap.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {roadmap?.roadmapId ? (
            <DirectFeedbackButton
              targetType="ROADMAP"
              targetId={roadmap.roadmapId}
              label={i18n.language === "en" ? "Feedback" : "Feedback"}
              isDarkMode={isDarkMode}
              className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
              title={i18n.language === "en" ? "Roadmap feedback" : "Roadmap feedback"}
            />
          ) : null}
          {renderRoadmapConfigActionButtons()}
          {onShareRoadmap && roadmap?.roadmapId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onShareRoadmap(roadmap)}
              className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              <Share2 className="w-4 h-4 mr-2" />
              <span className={fontClass}>{t("home.actions.share", "Share")}</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={resetViewport}
            className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            <Compass className="w-4 h-4 mr-2" />
            <span className={fontClass}>{labels.resetView}</span>
          </Button>
        </div>
      </div>

      <div className={`px-5 py-3 border-b flex flex-wrap items-center gap-2 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-gray-200 bg-[#F7FBFF]"}`}>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <Layers3 className="w-3.5 h-3.5 text-emerald-500" />
          <span className={fontClass}>{roadmap.stats?.phaseCount ?? 0} {labels.phases}</span>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <GitBranch className="w-3.5 h-3.5 text-blue-500" />
          <span className={fontClass}>{roadmap.stats?.knowledgeCount ?? 0} {labels.knowledges}</span>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <BookOpenCheck className="w-3.5 h-3.5 text-amber-500" />
          <span className={fontClass}>{roadmap.stats?.quizCount ?? 0} {labels.quizzes}</span>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <TimerReset className="w-3.5 h-3.5 text-violet-500" />
          <span className={fontClass}>{roadmap.estimatedDuration}</span>
        </div>
        <p className={`text-xs ml-auto ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
          {labels.dragHint}
        </p>
      </div>
      </div>

      <div
        ref={viewportRef}
        className={`relative flex-1 overflow-hidden touch-none ${draggingMode ? "cursor-grabbing" : "cursor-grab"} ${isDarkMode ? "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.14),transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
            onClick={() => adjustZoom("out")}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white/95 text-gray-700 hover:bg-gray-100"}`}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            title={labels.zoomIn}
            aria-label={labels.zoomIn}
            onClick={() => adjustZoom("in")}
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

        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: isDarkMode
              ? "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)"
              : "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: overviewCanvasHeight,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={CANVAS_WIDTH} height={overviewCanvasHeight}>
            {phaseOverviewLayouts.map((phaseLayout) => {
              const { phase, phaseY, phaseTrackHeight, knowledges } = phaseLayout;
              const elbowX = ROOT_POSITION.x + 180;

              return (
                <React.Fragment key={`connector:${phase.phaseId}`}>
                  <path
                    d={`M ${ROOT_POSITION.x + 120} ${ROOT_POSITION.y} L ${elbowX} ${ROOT_POSITION.y} L ${elbowX} ${phaseY} L ${PHASE_X - 170} ${phaseY}`}
                    fill="none"
                    stroke={isDarkMode ? "rgba(148,163,184,0.55)" : "rgba(59,130,246,0.55)"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {knowledges.length > 0 ? (
                    <path
                      d={`M ${PHASE_X + 170} ${phaseY} L ${KNOWLEDGE_X - 180} ${phaseY}`}
                      fill="none"
                      stroke={isDarkMode ? "rgba(148,163,184,0.45)" : "rgba(59,130,246,0.45)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="6 8"
                    />
                  ) : null}

                  {knowledges.map(({ knowledge, y: knowledgeY }) => {
                    return (
                      <path
                        key={`knowledge-connector:${phase.phaseId}:${knowledge.knowledgeId}`}
                        d={`M ${KNOWLEDGE_X - 180} ${phaseY} L ${KNOWLEDGE_X - 120} ${phaseY} L ${KNOWLEDGE_X - 120} ${knowledgeY} L ${KNOWLEDGE_X - 95} ${knowledgeY}`}
                        fill="none"
                        stroke={isDarkMode ? "rgba(94,234,212,0.4)" : "rgba(14,165,233,0.35)"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </svg>

          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-[320px] rounded-2xl border px-6 py-5 shadow-xl ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            style={{ left: ROOT_POSITION.x, top: ROOT_POSITION.y }}
          >
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] ${isDarkMode ? "bg-emerald-900/45 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
              <Map className="h-3.5 w-3.5" />
              <span className={fontClass}>{labels.centralRoadmap}</span>
            </div>
            <h2 className={`mt-3 text-xl font-semibold leading-7 ${fontClass}`}>{roadmap.title}</h2>
            <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
              {roadmap.description}
            </p>
            <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"} ${fontClass}`}>
              {labels.estimatedDuration}: {roadmap.estimatedDuration}
            </div>
          </div>

          {phaseOverviewLayouts.map((phaseLayout) => {
            const { phase, phaseY, knowledges: phaseKnowledges } = phaseLayout;

            return (
              <React.Fragment key={phase.phaseId}>
                <div
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[340px] rounded-2xl border px-5 py-4 shadow-lg ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
                  style={{ left: PHASE_X, top: phaseY }}
                >
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${isDarkMode ? "text-sky-300" : "text-sky-700"} ${fontClass}`}>
                    {labels.phase} {phase.phaseIndex + 1}
                  </p>
                  <h3 className={`mt-1 text-base font-semibold ${fontClass}`}>{phase.title}</h3>
                  <p className={`mt-2 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
                    {phase.description}
                  </p>
                  <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${fontClass}`}>
                    <span className={`rounded-full px-2.5 py-1 ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                      {phase.durationLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 ${isDarkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                      {(phase.knowledges ?? []).length} {labels.knowledges}
                    </span>
                  </div>
                </div>

                {phaseKnowledges.map(({ knowledge, y: knowledgeY }) => {
                  const isExpanded = Boolean(expandedKnowledges[knowledge.knowledgeId]);
                  return (
                    <button
                      key={knowledge.knowledgeId}
                      type="button"
                      onClick={() => toggleKnowledge(knowledge.knowledgeId)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-[250px] rounded-xl border px-4 py-3 text-left transition-all ${isDarkMode ? "border-slate-700 bg-slate-950/95 text-slate-100 hover:border-slate-500" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"}`}
                      style={{ left: KNOWLEDGE_X, top: knowledgeY }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-[10px] uppercase tracking-[0.16em] ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                            {labels.knowledges}
                          </p>
                          <h4 className={`mt-1 text-sm font-semibold leading-5 ${fontClass}`}>
                            {knowledge.title}
                          </h4>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                      <p className={`mt-2 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
                        {knowledge.description}
                      </p>
                      {isExpanded ? (
                        <div className={`mt-2 border-t pt-2 text-[11px] ${isDarkMode ? "border-slate-800 text-slate-300" : "border-slate-200 text-slate-600"} ${fontClass}`}>
                          <div>{labels.quiz}: {knowledge.quizzes?.length ?? 0}</div>
                          <div>{labels.flashcard}: {knowledge.flashcards?.length ?? 0}</div>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`@keyframes roadmapFadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes roadmapFadeOut { from { opacity: 1; } to { opacity: 0; } } @keyframes roadmapPopIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } } @keyframes roadmapPopOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.97); } }`}</style>
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
