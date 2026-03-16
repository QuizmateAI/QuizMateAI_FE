import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpenCheck, ChevronDown, ChevronUp, Compass, GitBranch, GripHorizontal, Layers3, Map, Maximize2, Minimize2, Rows3, TimerReset, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { getRoadmapGraph } from "@/api/RoadmapAPI";
import RoadmapCanvasView2 from "./RoadmapCanvasView2";

const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1220;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const PHASE_Y_POSITIONS = [170, 430, 790, 1050];
const PHASE_X_BY_SIDE = {
  left: 540,
  right: 1260,
};
const KNOWLEDGE_X_BY_SIDE = {
  left: 160,
  right: 1640,
};
const KNOWLEDGE_OFFSETS = [-180, 180];
const CENTER_CARD_SIZE = { width: 330, height: 290 };
const PHASE_CARD_SIZE = { width: 290, height: 270 };
const KNOWLEDGE_CARD_WIDTH = 290;
const FIT_EDGE_PADDING = 56;
const PAN_MARGIN = 56;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPhaseSide(index) {
  return index % 2 === 0 ? "left" : "right";
}

function estimateKnowledgeCardHeight(knowledge, isExpanded) {
  if (!isExpanded) {
    return 132;
  }

  const quizCount = knowledge.quizzes?.length ?? 0;
  const flashcardCount = knowledge.flashcards?.length ?? 0;
  const headerHeight = 132;
  const listContainerTop = 46;
  const quizSectionHeight = 24 + quizCount * 54;
  const flashcardSectionHeight = 24 + flashcardCount * 54;
  const sectionGap = 16;
  const bottomPadding = 14;
  return headerHeight + listContainerTop + quizSectionHeight + flashcardSectionHeight + sectionGap + bottomPadding;
}

function buildLayoutBounds(layout, expandedKnowledges) {
  const rectangles = [
    {
      x: CENTER_X,
      y: CENTER_Y,
      width: CENTER_CARD_SIZE.width,
      height: CENTER_CARD_SIZE.height,
    },
  ];

  layout.phaseLayouts.forEach((phase) => {
    rectangles.push({
      x: phase.x,
      y: phase.y,
      width: PHASE_CARD_SIZE.width,
      height: PHASE_CARD_SIZE.height,
    });

    phase.knowledges.forEach((knowledge) => {
      const knowledgeHeight = estimateKnowledgeCardHeight(knowledge, Boolean(expandedKnowledges[knowledge.knowledgeId]));
      rectangles.push({
        x: knowledge.x,
        y: knowledge.y,
        width: KNOWLEDGE_CARD_WIDTH,
        height: knowledgeHeight,
      });
    });
  });

  const minX = Math.min(...rectangles.map((rectangle) => rectangle.x - rectangle.width / 2));
  const maxX = Math.max(...rectangles.map((rectangle) => rectangle.x + rectangle.width / 2));
  const minY = Math.min(...rectangles.map((rectangle) => rectangle.y - rectangle.height / 2));
  const maxY = Math.max(...rectangles.map((rectangle) => rectangle.y + rectangle.height / 2));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function buildLayout(phases, phaseOffsets, knowledgeOffsets) {
  const phaseLayouts = phases.map((phase, index) => {
    const side = getPhaseSide(index);
    const phaseX = PHASE_X_BY_SIDE[side];
    const phaseY = PHASE_Y_POSITIONS[index] ?? CENTER_Y;
    const phaseOffset = phaseOffsets[phase.phaseId] ?? { x: 0, y: 0 };
    const knowledgeX = KNOWLEDGE_X_BY_SIDE[side];
    const knowledges = phase.knowledges.map((knowledge, knowledgeIndex) => {
      const knowledgeOffset = knowledgeOffsets[phase.phaseId]?.[knowledge.knowledgeId] ?? { x: 0, y: 0 };
      return {
        ...knowledge,
        x: knowledgeX + phaseOffset.x + knowledgeOffset.x,
        y: phaseY + phaseOffset.y + (KNOWLEDGE_OFFSETS[knowledgeIndex] ?? knowledgeIndex * 150) + knowledgeOffset.y,
      };
    });

    return {
      ...phase,
      side,
      x: phaseX + phaseOffset.x,
      y: phaseY + phaseOffset.y,
      knowledges,
    };
  });

  const connections = phaseLayouts.flatMap((phase) => {
    const centerLink = {
      key: `center-${phase.phaseId}`,
      x1: CENTER_X,
      y1: CENTER_Y,
      x2: phase.x,
      y2: phase.y,
    };

    const knowledgeLinks = phase.knowledges.map((knowledge) => ({
      key: `${phase.phaseId}-${knowledge.knowledgeId}`,
      x1: phase.x,
      y1: phase.y,
      x2: knowledge.x,
      y2: knowledge.y,
    }));

    return [centerLink, ...knowledgeLinks];
  });

  return { phaseLayouts, connections };
}

function RoadmapCanvasView({
  isDarkMode = false,
  workspaceId = null,
  groupId = null,
  onCreateRoadmap,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const hasInitializedOverviewRef = useRef(false);
  const transformRef = useRef({ x: -CENTER_X + 520, y: -CENTER_Y + 390, scale: 1 });
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedKnowledges, setExpandedKnowledges] = useState({});
  const [phaseOffsets, setPhaseOffsets] = useState({});
  const [knowledgeOffsets, setKnowledgeOffsets] = useState({});
  const [draggingMode, setDraggingMode] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandedHeaderHidden, setIsExpandedHeaderHidden] = useState(false);
  const [isExpandedClosing, setIsExpandedClosing] = useState(false);
  const [isCreatingRoadmap, setIsCreatingRoadmap] = useState(false);
  const [transform, setTransform] = useState({ x: -CENTER_X + 520, y: -CENTER_Y + 390, scale: 1 });

  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRoadmapGraph({ workspaceId, groupId });
      const nextRoadmap = response?.data?.data ?? null;
      setRoadmap(nextRoadmap);
      const firstKnowledgeIds = nextRoadmap?.phases?.reduce((accumulator, phase) => {
        if (phase.knowledges?.[0]?.knowledgeId) {
          accumulator[phase.knowledges[0].knowledgeId] = true;
        }
        return accumulator;
      }, {});
      setExpandedKnowledges(firstKnowledgeIds ?? {});
      setPhaseOffsets({});
      setKnowledgeOffsets({});
      hasInitializedOverviewRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [groupId, workspaceId]);

  const getFitScaleForBounds = (bounds, rect, padding = FIT_EDGE_PADDING) => {
    const scaleX = (rect.width - padding * 2) / bounds.width;
    const scaleY = (rect.height - padding * 2) / bounds.height;
    return Math.max(0.05, Math.min(scaleX, scaleY));
  };

  const getZoomLimits = (bounds) => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return { minScale: 0.1, maxScale: 3 };
    }

    const rect = viewportElement.getBoundingClientRect();
    const fitScale = getFitScaleForBounds(bounds, rect, FIT_EDGE_PADDING);
    return {
      minScale: clamp(fitScale, 0.05, 1),
      maxScale: clamp(fitScale * 3.2, 1.2, 4),
    };
  };

  const getOverviewTransform = (bounds) => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return { x: -CENTER_X + 520, y: -CENTER_Y + 390, scale: 1 };
    }

    const rect = viewportElement.getBoundingClientRect();
    const scale = clamp(getFitScaleForBounds(bounds, rect, FIT_EDGE_PADDING), 0.05, 1.5);

    return {
      x: rect.width / 2 - bounds.centerX * scale,
      y: rect.height / 2 - bounds.centerY * scale,
      scale,
    };
  };

  const clampTransformToViewport = (nextTransform, bounds) => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return nextTransform;
    }

    const rect = viewportElement.getBoundingClientRect();
    const scaledWidth = bounds.width * nextTransform.scale;
    const scaledHeight = bounds.height * nextTransform.scale;
    const margin = PAN_MARGIN;

    let minX;
    let maxX;
    if (scaledWidth + margin * 2 <= rect.width) {
      const centeredX = rect.width / 2 - bounds.centerX * nextTransform.scale;
      minX = centeredX - margin;
      maxX = centeredX + margin;
    } else {
      minX = rect.width - bounds.maxX * nextTransform.scale - margin;
      maxX = -bounds.minX * nextTransform.scale + margin;
    }

    let minY;
    let maxY;
    if (scaledHeight + margin * 2 <= rect.height) {
      const centeredY = rect.height / 2 - bounds.centerY * nextTransform.scale;
      minY = centeredY - margin;
      maxY = centeredY + margin;
    } else {
      minY = rect.height - bounds.maxY * nextTransform.scale - margin;
      maxY = -bounds.minY * nextTransform.scale + margin;
    }

    return {
      ...nextTransform,
      x: clamp(nextTransform.x, minX, maxX),
      y: clamp(nextTransform.y, minY, maxY),
    };
  };

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const layout = useMemo(() => buildLayout(roadmap?.phases ?? [], phaseOffsets, knowledgeOffsets), [knowledgeOffsets, phaseOffsets, roadmap]);
  const layoutBounds = useMemo(() => buildLayoutBounds(layout, expandedKnowledges), [expandedKnowledges, layout]);
  const labels = useMemo(() => ({
    resetView: t("workspace.roadmap.canvas.resetView"),
    dragHint: t("workspace.roadmap.canvas.dragHint"),
    centralRoadmap: t("workspace.roadmap.canvas.centralRoadmap"),
    estimatedDuration: t("workspace.roadmap.canvas.estimatedDuration"),
    phases: t("workspace.roadmap.canvas.phases"),
    knowledges: t("workspace.roadmap.canvas.knowledges"),
    quizzes: t("workspace.roadmap.canvas.quizzes"),
    questions: t("workspace.roadmap.canvas.questions"),
    cards: t("workspace.roadmap.canvas.cards"),
    postLearning: t("workspace.roadmap.canvas.postLearning"),
    phase: t("workspace.roadmap.canvas.phase"),
    movePhase: t("workspace.roadmap.canvas.movePhase"),
    moveKnowledge: t("workspace.roadmap.canvas.moveKnowledge"),
    expand: t("workspace.roadmap.canvas.expand"),
    collapse: t("workspace.roadmap.canvas.collapse"),
    hideTopBar: t("workspace.roadmap.canvas.hideTopBar"),
    showTopBar: t("workspace.roadmap.canvas.showTopBar"),
    zoomIn: t("workspace.roadmap.canvas.zoomIn"),
    zoomOut: t("workspace.roadmap.canvas.zoomOut"),
    emptyTitle: t("workspace.roadmap.canvas.emptyTitle"),
    emptyDescription: t("workspace.roadmap.canvas.emptyDescription"),
    selectorTitle: t("workspace.roadmap.canvas.selectorTitle"),
    selectorDescription: t("workspace.roadmap.canvas.selectorDescription"),
    canvasView1Title: t("workspace.roadmap.canvasView1Title"),
    canvasView1Description: t("workspace.roadmap.canvasView1Description"),
    canvasView2Title: t("workspace.roadmap.canvasView2Title"),
    canvasView2Description: t("workspace.roadmap.canvasView2Description"),
    quiz: t("workspace.roadmap.canvas.quiz"),
    flashcard: t("workspace.roadmap.canvas.flashcard"),
  }), [t]);

  const handleCreateMockRoadmap = useCallback(async (canvasView) => {
    if (!onCreateRoadmap) {
      return;
    }

    setIsCreatingRoadmap(true);
    try {
      await onCreateRoadmap({ mode: "ai", canvasView });
      await loadRoadmap();
    } finally {
      setIsCreatingRoadmap(false);
    }
  }, [loadRoadmap, onCreateRoadmap]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    if (!isExpanded) {
      setIsExpandedHeaderHidden(false);
    }
  }, [isExpanded]);

  const openExpandedView = () => {
    setIsExpandedClosing(false);
    setIsExpanded(true);
  };

  const closeExpandedView = () => {
    setIsExpandedClosing(true);
    window.setTimeout(() => {
      setIsExpanded(false);
      setIsExpandedClosing(false);
    }, 180);
  };

  const isExpandedMode = isExpanded || isExpandedClosing;

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement || loading) {
      return undefined;
    }

    const handleWheel = (event) => {
      event.preventDefault();
      const viewportRect = viewportElement.getBoundingClientRect();
      const currentTransform = transformRef.current;
      const cursorX = event.clientX - viewportRect.left;
      const cursorY = event.clientY - viewportRect.top;
      const { minScale, maxScale } = getZoomLimits(layoutBounds);
      const nextScale = clamp(currentTransform.scale + (event.deltaY > 0 ? -0.08 : 0.08), minScale, maxScale);
      const worldX = (cursorX - currentTransform.x) / currentTransform.scale;
      const worldY = (cursorY - currentTransform.y) / currentTransform.scale;

      setTransform(clampTransformToViewport({
        x: cursorX - worldX * nextScale,
        y: cursorY - worldY * nextScale,
        scale: nextScale,
      }, layoutBounds));
    };

    viewportElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewportElement.removeEventListener("wheel", handleWheel);
    };
  }, [layoutBounds, loading]);

  useEffect(() => {
    if (loading || !roadmap || hasInitializedOverviewRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTransform(clampTransformToViewport(getOverviewTransform(layoutBounds), layoutBounds));
      hasInitializedOverviewRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [layoutBounds, loading, roadmap]);

  useEffect(() => {
    if (loading || !roadmap) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTransform(clampTransformToViewport(getOverviewTransform(layoutBounds), layoutBounds));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isExpanded]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement || loading) {
      return undefined;
    }

    const preventNativeDrag = (event) => {
      event.preventDefault();
    };

    viewportElement.addEventListener("dragstart", preventNativeDrag);
    return () => {
      viewportElement.removeEventListener("dragstart", preventNativeDrag);
    };
  }, [loading]);

  const toggleKnowledge = (knowledgeId) => {
    setExpandedKnowledges((current) => ({
      ...current,
      [knowledgeId]: !current[knowledgeId],
    }));
  };

  const handlePointerDown = (event) => {
    if (event.target.closest("button") || event.target.closest("[data-no-pan='true']")) {
      return;
    }

    event.preventDefault();

    dragRef.current = {
      type: "viewport",
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setDraggingMode("viewport");
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePhaseDragStart = (phaseId, event) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: "phase",
      phaseId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: phaseOffsets[phaseId]?.x ?? 0,
      originOffsetY: phaseOffsets[phaseId]?.y ?? 0,
    };
    setDraggingMode("phase");
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handleKnowledgeDragStart = (phaseId, knowledgeId, event) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: "knowledge",
      phaseId,
      knowledgeId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: knowledgeOffsets[phaseId]?.[knowledgeId]?.x ?? 0,
      originOffsetY: knowledgeOffsets[phaseId]?.[knowledgeId]?.y ?? 0,
    };
    setDraggingMode("knowledge");
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragState = dragRef.current;
    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (dragState.type === "phase") {
      setPhaseOffsets((current) => ({
        ...current,
        [dragState.phaseId]: {
          x: dragState.originOffsetX + deltaX / transformRef.current.scale,
          y: dragState.originOffsetY + deltaY / transformRef.current.scale,
        },
      }));
      return;
    }

    if (dragState.type === "knowledge") {
      setKnowledgeOffsets((current) => ({
        ...current,
        [dragState.phaseId]: {
          ...(current[dragState.phaseId] ?? {}),
          [dragState.knowledgeId]: {
            x: dragState.originOffsetX + deltaX / transformRef.current.scale,
            y: dragState.originOffsetY + deltaY / transformRef.current.scale,
          },
        },
      }));
      return;
    }

    setTransform((current) => clampTransformToViewport({
      ...current,
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    }, layoutBounds));
  };

  const handlePointerUp = (event) => {
    dragRef.current = null;
    setDraggingMode(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetViewport = () => {
    setTransform(clampTransformToViewport(getOverviewTransform(layoutBounds), layoutBounds));
  };

  const adjustZoom = (direction) => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const rect = viewportElement.getBoundingClientRect();
    const cursorX = rect.width / 2;
    const cursorY = rect.height / 2;
    const currentTransform = transformRef.current;
    const zoomStep = direction === "in" ? 0.1 : -0.1;
    const { minScale, maxScale } = getZoomLimits(layoutBounds);
    const nextScale = clamp(currentTransform.scale + zoomStep, minScale, maxScale);
    const worldX = (cursorX - currentTransform.x) / currentTransform.scale;
    const worldY = (cursorY - currentTransform.y) / currentTransform.scale;

    setTransform(clampTransformToViewport({
      x: cursorX - worldX * nextScale,
      y: cursorY - worldY * nextScale,
      scale: nextScale,
    }, layoutBounds));
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
        <ListSpinner label={t("workspace.chat.aiThinking")} />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className={`h-full flex items-center justify-center p-8 ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-white text-gray-500"}`}>
        <div className="max-w-3xl text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl ${isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-50 text-emerald-600"}`}>
            <Map className="w-8 h-8" />
          </div>
          <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {labels.selectorTitle}
          </p>
          <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {labels.selectorDescription}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 text-left">
            <button
              type="button"
              disabled={isCreatingRoadmap}
              onClick={() => handleCreateMockRoadmap("view1")}
              className={`rounded-[28px] border p-5 transition-all ${isDarkMode ? "border-slate-700 bg-slate-900/80 hover:border-slate-500" : "border-gray-200 bg-white hover:border-blue-300"}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Map className="h-5 w-5" />
              </div>
              <p className={`mt-4 text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {labels.canvasView1Title}
              </p>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                {labels.canvasView1Description}
              </p>
            </button>

            <button
              type="button"
              disabled={isCreatingRoadmap}
              onClick={() => handleCreateMockRoadmap("view2")}
              className={`rounded-[28px] border p-5 transition-all ${isDarkMode ? "border-slate-700 bg-slate-900/80 hover:border-slate-500" : "border-gray-200 bg-white hover:border-blue-300"}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <Rows3 className="h-5 w-5" />
              </div>
              <p className={`mt-4 text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
                {labels.canvasView2Title}
              </p>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                {labels.canvasView2Description}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roadmap.canvasView === "view2") {
    return <RoadmapCanvasView2 roadmap={roadmap} isDarkMode={isDarkMode} fontClass={fontClass} />;
  }

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
          <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {roadmap.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <span className={fontClass}>{roadmap.stats.phaseCount} {labels.phases}</span>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <GitBranch className="w-3.5 h-3.5 text-blue-500" />
          <span className={fontClass}>{roadmap.stats.knowledgeCount} {labels.knowledges}</span>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-gray-700 border border-gray-200"}`}>
          <BookOpenCheck className="w-3.5 h-3.5 text-amber-500" />
          <span className={fontClass}>{roadmap.stats.quizCount} {labels.quizzes}</span>
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
            height: CANVAS_HEIGHT,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {layout.connections.map((connection) => {
              const controlX = (connection.x1 + connection.x2) / 2;
              return (
                <path
                  d={`M ${connection.x1} ${connection.y1} C ${controlX} ${connection.y1}, ${controlX} ${connection.y2}, ${connection.x2} ${connection.y2}`}
                  fill="none"
                  stroke={isDarkMode ? "rgba(96,165,250,0.5)" : "rgba(37,99,235,0.38)"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={connection.key.startsWith("center") ? "0" : "10 8"}
                />
              );
            })}
          </svg>

          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-[330px] rounded-[32px] border px-7 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] select-none ${isDarkMode ? "border-slate-700 bg-slate-900/95 text-slate-100" : "border-white/80 bg-white/95 text-gray-900"}`}
            style={{ left: CENTER_X, top: CENTER_Y }}
          >
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${isDarkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
              <Map className="w-3.5 h-3.5" />
              <span className={fontClass}>{labels.centralRoadmap}</span>
            </div>
            <h2 data-no-pan="true" className={`mt-4 text-2xl font-semibold tracking-tight select-text cursor-text ${fontClass}`}>{roadmap.title}</h2>
            <p data-no-pan="true" className={`mt-3 text-sm leading-6 select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
              {roadmap.description}
            </p>
            <div className={`mt-5 rounded-2xl px-4 py-3 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-[#F7FBFF] text-gray-700 border border-blue-100"}`}>
              <p data-no-pan="true" className={`text-xs uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {labels.estimatedDuration}
              </p>
              <p data-no-pan="true" className={`mt-1 text-sm font-medium select-text cursor-text ${fontClass}`}>{roadmap.estimatedDuration}</p>
            </div>
          </div>

          {layout.phaseLayouts.map((phase) => (
            <React.Fragment key={phase.phaseId}>
              <div
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-[290px] rounded-[28px] border px-5 py-5 shadow-lg select-none ${isDarkMode ? "border-slate-700 bg-slate-900/90 text-slate-100" : "border-white/80 bg-white/95 text-gray-900"}`}
                style={{ left: phase.x, top: phase.y }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p data-no-pan="true" className={`text-xs uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                      {labels.phase} {phase.phaseIndex + 1}
                    </p>
                    <h3 data-no-pan="true" className={`mt-1 text-lg font-semibold select-text cursor-text ${fontClass}`}>{phase.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span data-no-pan="true" className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] select-text cursor-text ${isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                      {phase.durationLabel}
                    </span>
                    <button
                      type="button"
                      title={labels.movePhase}
                      aria-label={labels.movePhase}
                      onPointerDown={(event) => handlePhaseDragStart(phase.phaseId, event)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full cursor-grab active:cursor-grabbing ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      <GripHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p data-no-pan="true" className={`mt-3 text-sm leading-6 select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                  {phase.description}
                </p>
                <div className={`mt-4 rounded-2xl border px-3.5 py-3 ${isDarkMode ? "border-amber-900/50 bg-amber-950/30" : "border-amber-100 bg-amber-50"}`}>
                  <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                    {labels.postLearning}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-sm font-medium select-text cursor-text ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                    {phase.postLearning.title}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-xs select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                    {phase.postLearning.questionCount} {labels.questions}
                  </p>
                </div>
              </div>

              {phase.knowledges.map((knowledge) => {
                const isExpanded = Boolean(expandedKnowledges[knowledge.knowledgeId]);
                return (
                  <div
                    key={knowledge.knowledgeId}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-[290px]"
                    style={{ left: knowledge.x, top: knowledge.y }}
                  >
                    <div className={`rounded-[24px] border px-4 py-4 shadow-lg select-none ${isDarkMode ? "border-slate-700 bg-slate-950/95 text-slate-100" : "border-white/80 bg-white/95 text-gray-900"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleKnowledge(knowledge.knowledgeId)}
                          className="w-full text-left cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                              <GitBranch className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <h4 data-no-pan="true" className={`text-sm font-semibold select-text cursor-text ${fontClass}`}>{knowledge.title}</h4>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                              <p data-no-pan="true" className={`mt-1 text-xs leading-5 select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                                {knowledge.description}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          title={labels.moveKnowledge}
                          aria-label={labels.moveKnowledge}
                          onPointerDown={(event) => handleKnowledgeDragStart(phase.phaseId, knowledge.knowledgeId, event)}
                          className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full cursor-grab active:cursor-grabbing ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          <GripHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className={`mt-4 space-y-3 border-t pt-4 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
                          <div>
                            <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                              {labels.quiz}
                            </p>
                            <div className="mt-2 space-y-2">
                              {knowledge.quizzes.map((quiz) => (
                                <div
                                  key={quiz.id}
                                  className={`rounded-2xl px-3 py-2 text-sm ${isDarkMode ? "bg-slate-900 border border-slate-800 text-slate-200" : "bg-[#F7FBFF] border border-blue-100 text-gray-700"}`}
                                >
                                  <p data-no-pan="true" className={`font-medium select-text cursor-text ${fontClass}`}>{quiz.title}</p>
                                  <p data-no-pan="true" className={`mt-1 text-xs select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                                    {quiz.questionCount} {labels.questions}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                              {labels.flashcard}
                            </p>
                            <div className="mt-2 space-y-2">
                              {knowledge.flashcards.map((flashcard) => (
                                <div
                                  key={flashcard.id}
                                  className={`rounded-2xl px-3 py-2 text-sm ${isDarkMode ? "bg-slate-900 border border-slate-800 text-slate-200" : "bg-[#FFF9ED] border border-amber-100 text-gray-700"}`}
                                >
                                  <p data-no-pan="true" className={`font-medium select-text cursor-text ${fontClass}`}>{flashcard.title}</p>
                                  <p data-no-pan="true" className={`mt-1 text-xs select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                                    {flashcard.cardCount} {labels.cards}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
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

export default RoadmapCanvasView;