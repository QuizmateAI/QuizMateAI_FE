import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CheckCircle2, Eye, FileText, Loader2, Pencil } from "lucide-react";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import { getRoadmapGraph } from "@/api/RoadmapAPI";
import RoadmapCanvasView2 from "./RoadmapCanvasView2";
import RoadmapCanvasViewStage from "./RoadmapCanvasViewStage";
import RoadmapCanvasViewOverview from "./RoadmapCanvasViewOverview";

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

    (phase.knowledges ?? []).forEach((knowledge) => {
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
  const phaseLayouts = (phases ?? []).map((phase, index) => {
    const side = getPhaseSide(index);
    const phaseX = PHASE_X_BY_SIDE[side];
    const phaseY = PHASE_Y_POSITIONS[index] ?? CENTER_Y;
    const phaseOffset = phaseOffsets[phase.phaseId] ?? { x: 0, y: 0 };
    const knowledgeX = KNOWLEDGE_X_BY_SIDE[side];
    const knowledges = (phase.knowledges ?? []).map((knowledge, knowledgeIndex) => {
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

    const knowledgeLinks = (phase.knowledges ?? []).map((knowledge) => ({
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

function normalizeEmptyStateMaterialId(material) {
  const materialId = Number(material?.id ?? material?.materialId ?? 0);
  return Number.isInteger(materialId) && materialId > 0 ? materialId : null;
}

function formatEmptyStateMaterialType(material) {
  const rawType = String(material?.type ?? material?.materialType ?? "").trim();
  if (!rawType) return "FILE";

  const normalizedType = rawType.toLowerCase();
  if (normalizedType.includes("pdf")) return "PDF";
  if (normalizedType.includes("word") || normalizedType.includes("doc")) return "DOCX";
  if (normalizedType.includes("spreadsheet") || normalizedType.includes("excel") || normalizedType.includes("xls")) return "XLSX";
  if (normalizedType.includes("presentation") || normalizedType.includes("powerpoint") || normalizedType.includes("ppt")) return "PPTX";
  if (normalizedType.includes("image")) return "IMAGE";
  if (normalizedType.includes("audio")) return "AUDIO";
  if (normalizedType.includes("video")) return "VIDEO";
  return rawType.toUpperCase();
}

function formatEmptyStateMaterialDate(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function RoadmapCanvasView({
  isDarkMode = false,
  workspaceId = null,
  onCreateRoadmap,
  onCreateRoadmapPhases,
  onRoadmapPhaseFocus,
  onCreatePhaseKnowledge,
  onCreateKnowledgeQuizForKnowledge,
  onCreatePhasePreLearning,
  isStudyNewRoadmap = false,
  adaptationMode = "",
  onViewQuiz,
  isGeneratingRoadmapPhases = false,
  roadmapPhaseGenerationProgress = 0,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  knowledgeQuizRefreshByKey = {},
  generatingPreLearningPhaseIds = [],
  skipPreLearningPhaseIds = [],
  reloadToken = 0,
  onReloadRoadmap,
  forcedCanvasView = null,
  onCanvasViewChange,
  selectedPhaseId = null,
  selectedKnowledgeId = null,
  disableCreate = false,
  hideCreateButton = false,
  onEmptyStateAction,
  emptyStateTitle = "",
  emptyStateDescription = "",
  emptyStateActionLabel = "",
  progressTracking = null,
  onShareRoadmap,
  onShareQuiz,
  onViewRoadmapConfig,
  onEditRoadmapConfig,
  emptyStateMaterials = [],
  selectedEmptyStateMaterialIds = [],
  onToggleEmptyStateMaterial,
  onToggleAllEmptyStateMaterials,
  onRoadmapLoad,
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
  const hasLoadedRoadmapRef = useRef(false);
  const roadmapRef = useRef(null);
  const normalizedEmptyStateMaterialIds = useMemo(
    () => selectedEmptyStateMaterialIds
      .map((materialId) => Number(materialId))
      .filter((materialId, index, array) => Number.isInteger(materialId) && materialId > 0 && array.indexOf(materialId) === index),
    [selectedEmptyStateMaterialIds],
  );
  const selectableEmptyStateMaterials = useMemo(
    () => (Array.isArray(emptyStateMaterials) ? emptyStateMaterials : [])
      .map((material, index) => {
        const materialId = normalizeEmptyStateMaterialId(material);
        return materialId
          ? { ...material, __materialId: materialId, __renderKey: `empty-state-material:${materialId}` }
          : { ...material, __materialId: null, __renderKey: `empty-state-material:fallback:${index}` };
      })
      .filter((material) => Number.isInteger(material.__materialId) && material.__materialId > 0),
    [emptyStateMaterials],
  );
  const hasEmptyStateMaterialPicker = selectableEmptyStateMaterials.length > 0
    && typeof onToggleEmptyStateMaterial === "function";
  const areAllEmptyStateMaterialsSelected = hasEmptyStateMaterialPicker
    && selectableEmptyStateMaterials.every((material) => normalizedEmptyStateMaterialIds.includes(material.__materialId));
  const shouldDisableEmptyStateAction = disableCreate
    || (hasEmptyStateMaterialPicker && normalizedEmptyStateMaterialIds.length === 0);

  useEffect(() => {
    roadmapRef.current = roadmap;
  }, [roadmap]);

  const persistCanvasView = useCallback((roadmapId, canvasView) => {
    if (!roadmapId || !canvasView) return;
    localStorage.setItem(`roadmap_${roadmapId}_canvasView`, canvasView);
  }, []);

  const loadRoadmap = useCallback(async ({ soft = false } = {}) => {
    const shouldKeepViewportState = soft && hasLoadedRoadmapRef.current && Boolean(roadmapRef.current);
    if (!shouldKeepViewportState) {
      setLoading(true);
    }

    try {
      const response = await getRoadmapGraph({ workspaceId });
      const nextRoadmap = response?.data?.data ?? null;
      const storedCanvasView = nextRoadmap?.roadmapId
        ? localStorage.getItem(`roadmap_${nextRoadmap.roadmapId}_canvasView`)
        : null;
      const resolvedCanvasView = forcedCanvasView
        || nextRoadmap?.canvasView
        || (storedCanvasView === "view1" || storedCanvasView === "view2" || storedCanvasView === "overview" ? storedCanvasView : null)
        || "view1";
      const mergedRoadmap = nextRoadmap
        ? { ...nextRoadmap, canvasView: resolvedCanvasView }
        : null;
      setRoadmap(mergedRoadmap);
      if (mergedRoadmap?.canvasView) {
        onCanvasViewChange?.(mergedRoadmap.canvasView);
      }
      if (mergedRoadmap?.roadmapId) {
        onRoadmapLoad?.(mergedRoadmap.roadmapId);
      }

      if (!shouldKeepViewportState) {
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
      }

      hasLoadedRoadmapRef.current = true;
    } finally {
      if (!shouldKeepViewportState) {
        setLoading(false);
      }
    }
  }, [forcedCanvasView, onCanvasViewChange, workspaceId]);

  useEffect(() => {
    if (!forcedCanvasView) return;
    setRoadmap((current) => (current ? { ...current, canvasView: forcedCanvasView } : current));
    if (roadmap?.roadmapId) {
      persistCanvasView(roadmap.roadmapId, forcedCanvasView);
      onCanvasViewChange?.(forcedCanvasView);
    }
  }, [forcedCanvasView, onCanvasViewChange, persistCanvasView, roadmap?.roadmapId]);

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
    loadRoadmap({ soft: hasLoadedRoadmapRef.current });
  }, [loadRoadmap, reloadToken]);

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

  const renderRoadmapConfigActionButtons = useCallback((buttonClassName = "") => (
    <>
      {onViewRoadmapConfig ? (
        <Button
          type="button"
          variant="outline"
          onClick={onViewRoadmapConfig}
          className={buttonClassName || `rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          <Eye className="mr-2 h-4 w-4" />
          <span className={fontClass}>{t("workspace.roadmap.viewConfig", "View config")}</span>
        </Button>
      ) : null}
      {onEditRoadmapConfig ? (
        <Button
          type="button"
          variant="outline"
          onClick={onEditRoadmapConfig}
          className={buttonClassName || `rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          <Pencil className="mr-2 h-4 w-4" />
          <span className={fontClass}>{t("workspace.roadmap.editConfigAction", "Edit")}</span>
        </Button>
      ) : null}
    </>
  ), [fontClass, isDarkMode, onEditRoadmapConfig, onViewRoadmapConfig, t]);

  const handleSelectCanvasView = useCallback(async (canvasView) => {
    if (!canvasView) return;

    if (roadmap?.roadmapId) {
      persistCanvasView(roadmap.roadmapId, canvasView);
      setRoadmap((current) => (current ? { ...current, canvasView } : current));
      onCanvasViewChange?.(canvasView);
      return;
    }

    if (!onCreateRoadmap) return;

    setIsCreatingRoadmap(true);
    try {
      await onCreateRoadmap({ mode: "ai", canvasView });
      await loadRoadmap();
    } finally {
      setIsCreatingRoadmap(false);
    }
  }, [loadRoadmap, onCanvasViewChange, onCreateRoadmap, persistCanvasView, roadmap?.roadmapId]);

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

  const hasPhase = (roadmap?.phases?.length ?? 0) > 0;

  if (loading && !roadmap) {
    return (
      <div className={`h-full flex items-center justify-center p-8 ${isDarkMode ? "bg-slate-900 text-slate-300" : "bg-white text-gray-700"}`}>
        <div className="max-w-xl text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
          <p className={`mt-4 text-lg font-semibold ${fontClass}`}>
            {t("workspace.roadmap.loading.title", "Loading roadmap")}
          </p>
          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.roadmap.loading.description", "Please wait while AI generates roadmap title, description, and structure")}
          </p>
        </div>
      </div>
    );
  }

  if (isGeneratingRoadmapPhases) {
    return (
      <div className={`h-full flex items-center justify-center p-8 ${isDarkMode ? "bg-slate-900 text-slate-300" : "bg-white text-gray-700"}`}>
        <div className="max-w-xl text-center">
          <CircularProgressLoader
            percent={Math.max(0, Math.min(100, Number(roadmapPhaseGenerationProgress) || 0))}
            size="lg"
            color="blue"
            className="mx-auto"
          />
          <p className={`mt-4 text-lg font-semibold ${fontClass}`}>
            {t("workspace.roadmap.phaseGenerating.title", "Please wait while AI generates phases")}
          </p>
          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.roadmap.phaseGenerating.description", "The system is generating phase list from selected materials.")}
          </p>
        </div>
      </div>
    );
  }

  if (!roadmap || !hasPhase) {
    return (
      <div className={`flex h-full w-full flex-col px-8 pb-8 pt-4 ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-white text-gray-500"}`}>
        {onViewRoadmapConfig || onEditRoadmapConfig ? (
          <div className="mb-3 flex w-full items-start justify-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {renderRoadmapConfigActionButtons("rounded-full")}
            </div>
          </div>
        ) : null}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center pt-4">
          <div className="max-w-2xl text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl ${isDarkMode ? "bg-blue-950/50 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
              <BookOpen className="w-8 h-8" />
            </div>
            <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {emptyStateTitle || t("workspace.roadmap.emptyRoadmapTitle", "Welcome to roadmap")}
            </p>
            <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {emptyStateDescription || t("workspace.roadmap.emptyRoadmapDescription", "Generate phases with AI to start your learning roadmap from selected materials.")}
            </p>
            {!hideCreateButton && (
              <div className="mt-6 flex items-center justify-center">
                <Button
                  type="button"
                  disabled={isCreatingRoadmap || shouldDisableEmptyStateAction}
                  onClick={() => (onEmptyStateAction || onCreateRoadmapPhases)?.()}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full px-6 h-10"
                >
                  {emptyStateActionLabel || t("workspace.roadmap.createPhaseButton", "Create phases")}
                </Button>
              </div>
            )}
          </div>
          {hasEmptyStateMaterialPicker ? (
            <div className={`mt-8 w-full rounded-[28px] border p-5 ${isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50/70"}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
                    {t("workspace.roadmap.materialPicker.title", "Materials for phase generation")}
                  </p>
                  <p className={`mt-1 text-xs leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    {t("workspace.roadmap.materialPicker.description", "Choose the documents AI should use when drafting roadmap phases for this group.")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.08] text-slate-100" : "bg-white text-slate-700 border border-slate-200"}`}>
                    {normalizedEmptyStateMaterialIds.length}/{selectableEmptyStateMaterials.length} {t("workspace.roadmap.materialPicker.selected", "selected")}
                  </span>
                  {typeof onToggleAllEmptyStateMaterials === "function" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onToggleAllEmptyStateMaterials(!areAllEmptyStateMaterialsSelected)}
                      className={`h-9 rounded-full px-4 text-xs ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}
                    >
                      {areAllEmptyStateMaterialsSelected
                        ? t("workspace.roadmap.materialPicker.clearAll", "Clear all")
                        : t("workspace.roadmap.materialPicker.selectAll", "Select all")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {selectableEmptyStateMaterials.map((material) => {
                  const isSelected = normalizedEmptyStateMaterialIds.includes(material.__materialId);
                  const materialTitle = material?.title || material?.name || t("workspace.roadmap.materialPicker.untitled", "Untitled material");

                  return (
                    <button
                      key={material.__renderKey}
                      type="button"
                      onClick={() => onToggleEmptyStateMaterial?.(material.__materialId)}
                      className={`rounded-[22px] border p-4 text-left transition ${isSelected
                        ? (isDarkMode ? "border-blue-400/50 bg-blue-500/10" : "border-blue-300 bg-blue-50")
                        : (isDarkMode ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected
                          ? (isDarkMode ? "border-blue-300 bg-blue-400/20 text-blue-200" : "border-blue-500 bg-blue-500 text-white")
                          : (isDarkMode ? "border-slate-600 text-slate-500" : "border-slate-300 text-slate-300")
                        }`}>
                          {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current opacity-70" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`} />
                            <p className={`line-clamp-2 text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
                              {materialTitle}
                            </p>
                          </div>
                          <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                            <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${isDarkMode ? "bg-white/[0.07] text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                              {formatEmptyStateMaterialType(material)}
                            </span>
                            {formatEmptyStateMaterialDate(material?.uploadedAt, i18n.language) ? (
                              <span>{formatEmptyStateMaterialDate(material?.uploadedAt, i18n.language)}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Swapped mapping by request:
  // view1 -> canvas view 2, view2 -> canvas view 1
  const effectiveCanvasView = roadmap?.canvasView === "overview"
    ? "overview"
    : roadmap?.canvasView === "view2"
    ? "view2"
    : "view1";

  if (effectiveCanvasView === "view1") {
    return (
      <RoadmapCanvasView2
        roadmap={roadmap}
        isDarkMode={isDarkMode}
        fontClass={fontClass}
        selectedPhaseId={selectedPhaseId}
        onPhaseFocus={onRoadmapPhaseFocus}
        onCreatePhaseKnowledge={onCreatePhaseKnowledge}
        onCreateKnowledgeQuizForKnowledge={onCreateKnowledgeQuizForKnowledge}
        onCreatePhasePreLearning={onCreatePhasePreLearning}
        isStudyNewRoadmap={isStudyNewRoadmap}
        adaptationMode={adaptationMode}
        onViewQuiz={onViewQuiz}
        generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
        generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
        generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
        knowledgeQuizRefreshByKnowledgeKey={knowledgeQuizRefreshByKey}
        generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
        skipPreLearningPhaseIds={skipPreLearningPhaseIds}
        quizRefreshToken={reloadToken}
        onReloadRoadmap={onReloadRoadmap}
        progressTracking={progressTracking}
        onShareRoadmap={onShareRoadmap}
        onShareQuiz={onShareQuiz}
        onViewRoadmapConfig={onViewRoadmapConfig}
        onEditRoadmapConfig={onEditRoadmapConfig}
      />
    );
  }

  if (effectiveCanvasView === "view2") {
    return (
      <RoadmapCanvasViewStage
        roadmap={roadmap}
        isDarkMode={isDarkMode}
        fontClass={fontClass}
        selectedPhaseId={selectedPhaseId}
        selectedKnowledgeId={selectedKnowledgeId}
        onPhaseFocus={onRoadmapPhaseFocus}
        onViewQuiz={onViewQuiz}
        isStudyNewRoadmap={isStudyNewRoadmap}
        adaptationMode={adaptationMode}
        generatingKnowledgePhaseIds={generatingKnowledgePhaseIds}
        generatingKnowledgeQuizPhaseIds={generatingKnowledgeQuizPhaseIds}
        generatingKnowledgeQuizKnowledgeKeys={generatingKnowledgeQuizKnowledgeKeys}
        knowledgeQuizRefreshByKnowledgeKey={knowledgeQuizRefreshByKey}
        quizRefreshToken={reloadToken}
        progressTracking={progressTracking}
        generatingPreLearningPhaseIds={generatingPreLearningPhaseIds}
        skipPreLearningPhaseIds={skipPreLearningPhaseIds}
        onReloadRoadmap={onReloadRoadmap}
        onCreateKnowledgeQuizForKnowledge={onCreateKnowledgeQuizForKnowledge}
        onCreatePhasePreLearning={onCreatePhasePreLearning}
        onCreatePhaseKnowledge={onCreatePhaseKnowledge}
        onEditRoadmapConfig={onEditRoadmapConfig}
      />
    );
  }

  if (effectiveCanvasView === "overview") {
    return (
      <RoadmapCanvasViewOverview
        roadmap={roadmap}
        isDarkMode={isDarkMode}
        fontClass={fontClass}
        i18n={i18n}
        t={t}
        labels={labels}
        isExpanded={isExpanded}
        isExpandedMode={isExpandedMode}
        isExpandedClosing={isExpandedClosing}
        isExpandedHeaderHidden={isExpandedHeaderHidden}
        setIsExpandedHeaderHidden={setIsExpandedHeaderHidden}
        openExpandedView={openExpandedView}
        closeExpandedView={closeExpandedView}
        setIsExpanded={setIsExpanded}
        resetViewport={resetViewport}
        adjustZoom={adjustZoom}
        draggingMode={draggingMode}
        viewportRef={viewportRef}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
        transform={transform}
        layout={layout}
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        centerX={CENTER_X}
        centerY={CENTER_Y}
        expandedKnowledges={expandedKnowledges}
        toggleKnowledge={toggleKnowledge}
        handlePhaseDragStart={handlePhaseDragStart}
        handleKnowledgeDragStart={handleKnowledgeDragStart}
        onShareRoadmap={onShareRoadmap}
        renderRoadmapConfigActionButtons={renderRoadmapConfigActionButtons}
        onSelectCenterRoadmap={() => handleSelectCanvasView("view2")}
      />
    );
  }

  return null;
}

export default RoadmapCanvasView;

