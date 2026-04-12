import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BookOpen, BookOpenCheck, CheckCircle2, ChevronDown, ChevronUp, Compass, Eye, FileText, GitBranch, GripHorizontal, Layers3, Loader2, Map, Maximize2, Minimize2, Pencil, Share2, TimerReset, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import HomeButton from "@/Components/ui/HomeButton";
import ListSpinner from "@/Components/ui/ListSpinner";
import CircularProgressLoader from "@/Components/ui/CircularProgressLoader";
import DirectFeedbackButton from "@/Components/feedback/DirectFeedbackButton";
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
        || (storedCanvasView === "view1" || storedCanvasView === "view2" ? storedCanvasView : null)
        || "view1";
      const mergedRoadmap = nextRoadmap
        ? { ...nextRoadmap, canvasView: resolvedCanvasView }
        : null;
      setRoadmap(mergedRoadmap);
      if (mergedRoadmap?.canvasView) {
        onCanvasViewChange?.(mergedRoadmap.canvasView);
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
      phaseGap: FS_PHASE_GAP,
      amplitude: FS_WAVE_AMPLITUDE,
      centerY: FS_WAVE_CENTER_Y,
      svgHeight: FS_SVG_HEIGHT,
      cardWidth: FS_CARD_WIDTH,
      padLeft: FS_PAD_LEFT,
      padRight: FS_PAD_RIGHT,
      boneLength: FS_BONE_LENGTH,
      minFitZoom: 0.82,
    };
  }

  if (width < 1024) {
    return {
      phaseGap: 208,
      amplitude: 42,
      centerY: 216,
      svgHeight: 512,
      cardWidth: 196,
      padLeft: 96,
      padRight: 96,
      boneLength: 40,
      minFitZoom: 0.68,
    };
  }

  if (width < 1400) {
    return {
      phaseGap: 232,
      amplitude: 50,
      centerY: 238,
      svgHeight: 564,
      cardWidth: 216,
      padLeft: 112,
      padRight: 112,
      boneLength: 44,
      minFitZoom: 0.74,
    };
  }

  if (width < 1680) {
    return {
      phaseGap: 256,
      amplitude: 54,
      centerY: 252,
      svgHeight: 606,
      cardWidth: 228,
      padLeft: 128,
      padRight: 128,
      boneLength: 46,
      minFitZoom: 0.8,
    };
  }

  return {
    phaseGap: PHASE_GAP,
    amplitude: WAVE_AMPLITUDE,
    centerY: WAVE_CENTER_Y,
    svgHeight: SVG_HEIGHT,
    cardWidth: CARD_WIDTH,
    padLeft: PAD_LEFT,
    padRight: PAD_RIGHT,
    boneLength: BONE_LENGTH,
      minFitZoom: 0.84,
  };
}

const NODE_COLORS = {
  done: "#10b981",
  current: "#0ea5e9",
  next: "#f59e0b",
  locked: "#94a3b8",
};

const NODE_GLOW = {
  done: "rgba(16,185,129,0.35)",
  current: "rgba(14,165,233,0.4)",
  next: "rgba(245,158,11,0.3)",
  locked: "transparent",
};

const STATUS_BADGE_STYLES = {
  done: "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  current: "bg-sky-100 text-sky-800 border border-sky-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  next: "bg-amber-100 text-amber-800 border border-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
  locked: "bg-slate-200 text-slate-600 border border-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]",
};

const STATUS_ICONS = {
  done: CheckCircle2,
  current: CircleDot,
  next: Clock,
  locked: Lock,
};

const STATUS_LABELS = {
  done: "workspace.shell.phaseCompleted",
  current: "workspace.shell.phaseCurrent",
  next: "workspace.timeline.phaseNext",
  locked: "workspace.shell.phaseLocked",
};

/* ─── Geometry helpers (accept constants as params for fullscreen) ─── */
function getPhaseX(index, padLeft = PAD_LEFT, phaseGap = PHASE_GAP) {
  return padLeft + index * phaseGap;
}
function getPhaseY(index, centerY = WAVE_CENTER_Y, amplitude = WAVE_AMPLITUDE) {
  return centerY + (index % 2 === 0 ? -amplitude : amplitude);
}
function isCardAbove(index) {
  return index % 2 === 0;
}

function computeWavePath(count, padLeft = PAD_LEFT, phaseGap = PHASE_GAP, centerY = WAVE_CENTER_Y, amplitude = WAVE_AMPLITUDE) {
  if (count < 1) return "";
  const gX = (i) => getPhaseX(i, padLeft, phaseGap);
  const gY = (i) => getPhaseY(i, centerY, amplitude);

  if (count === 1) {
    const x = gX(0);
    const y = gY(0);
    return `M ${x - 40},${centerY} Q ${x - 20},${y} ${x},${y} Q ${x + 20},${y} ${x + 40},${centerY}`;
  }
  const pts = Array.from({ length: count }, (_, i) => ({ x: gX(i), y: gY(i) }));
  let d = `M ${pts[0].x - 60},${centerY} Q ${pts[0].x - 30},${pts[0].y} ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cur = pts[i];
    const nxt = pts[i + 1];
    const cpx = (cur.x + nxt.x) / 2;
    d += ` C ${cpx},${cur.y} ${cpx},${nxt.y} ${nxt.x},${nxt.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` Q ${last.x + 30},${last.y} ${last.x + 60},${centerY}`;
  return d;
}

function computeTotalWidth(count, padLeft = PAD_LEFT, padRight = PAD_RIGHT, phaseGap = PHASE_GAP) {
  return padLeft + Math.max(0, count - 1) * phaseGap + padRight;
}

function getLocalizedConfigOptionTitle(t, optionGroup, value, fallback = "—") {
  if (!value) return fallback;
  const normalizedValue = String(value).trim().toUpperCase();
  const optionKey = `workspace.profileConfig.options.${optionGroup}.${normalizedValue}.title`;
  const translated = t(optionKey);
  return translated === optionKey ? normalizedValue : translated;
}

function getFormattedRoadmapConfigValue(t, fieldKey, value) {
  if (value == null || value === "") {
    return t("workspace.shell.roadmapConfigMissing", "Chưa cấu hình");
  }

  if (fieldKey === "estimatedTotalDays") {
    return t("workspace.onboarding.summary.values.estimatedTotalDays", {
      value,
      defaultValue: `${value} days`,
    });
  }

  if (fieldKey === "recommendedMinutesPerDay") {
    return t("workspace.onboarding.summary.values.recommendedMinutesPerDay", {
      value,
      defaultValue: `${value} minutes/day`,
    });
  }

  if (fieldKey === "knowledgeLoad") {
    return getLocalizedConfigOptionTitle(t, "knowledgeLoad", value);
  }

  if (fieldKey === "roadmapSpeedMode") {
    return getLocalizedConfigOptionTitle(t, "roadmapSpeedMode", value);
  }

  if (fieldKey === "adaptationMode") {
    return getLocalizedConfigOptionTitle(t, "adaptationMode", value);
  }

  return String(value);
}

/* ═══════════════════════════════════════════════════════════════════
   FishboneSVG — The wave path + nodes + bone connectors
   ═══════════════════════════════════════════════════════════════════ */
function FishboneSVG({ phases, currentIndex, phaseStateMap, focusedPhaseId, onNodeClick, padLeft, padRight, phaseGap, centerY, amplitude, svgHeight, boneLength }) {
  const count = phases.length;
  if (count === 0) return null;
  const totalWidth = computeTotalWidth(count, padLeft, padRight, phaseGap);
  const wavePath = computeWavePath(count, padLeft, phaseGap, centerY, amplitude);

  return (
    <svg
      className="fishbone-svg absolute inset-0 pointer-events-none"
      width={totalWidth}
      height={svgHeight}
      viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      aria-hidden="true"
    >
      <defs>
        {/* Wave gradient */}
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="40%" stopColor="#14b8a6" />
          <stop offset="70%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="wave-grad-dim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.1" />
        </linearGradient>
        {/* Node glows */}
        {Object.entries(NODE_COLORS).map(([key, color]) => (
          <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={key === "current" ? 6 : 4} />
            <feColorMatrix type="matrix" values={`0 0 0 0 ${parseInt(color.slice(1, 3), 16) / 255} 0 0 0 0 ${parseInt(color.slice(3, 5), 16) / 255} 0 0 0 0 ${parseInt(color.slice(5, 7), 16) / 255} 0 0 0 0.5 0`} />
          </filter>
        ))}
      </defs>

      {/* Glow layer (wide, blurred) */}
      <path d={wavePath} fill="none" stroke="url(#wave-grad-dim)" strokeWidth="32" strokeLinecap="round" />

      {/* Main wave ribbon */}
      <path d={wavePath} fill="none" stroke="url(#wave-grad)" strokeWidth="5" strokeLinecap="round" />

      {/* Highlight line */}
      <path d={wavePath} fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" strokeDasharray="8 12" />

      {/* Bone connectors + Nodes */}
      {phases.map((phase, index) => {
        const x = getPhaseX(index, padLeft, phaseGap);
        const y = getPhaseY(index, centerY, amplitude);
        const state = getVisualState(phase, index, currentIndex, phaseStateMap);
        const isLocked = state === "locked";
        const above = isCardAbove(index);
        const boneEndY = above ? y - boneLength : y + boneLength;
        const isFocused = Number(phase?.phaseId) === Number(focusedPhaseId);
        const nodeR = state === "current" ? 14 : isFocused ? 13 : 10;

        return (
          <g key={phase?.phaseId || index}>
            {/* Bone line */}
            <line
              x1={x}
              y1={y + (above ? -nodeR - 4 : nodeR + 4)}
              x2={x}
              y2={boneEndY}
              stroke={NODE_COLORS[state]}
              strokeWidth="2"
              strokeDasharray={state === "locked" ? "4 4" : "none"}
              opacity={state === "locked" ? 0.4 : 0.7}
            />
            {/* Small dot at bone end */}
            <circle cx={x} cy={boneEndY} r="3" fill={NODE_COLORS[state]} opacity={state === "locked" ? 0.4 : 0.6} />

            {/* Node glow */}
            <circle cx={x} cy={y} r={nodeR + 8} fill={NODE_GLOW[state]} filter={state !== "locked" ? `url(#glow-${state})` : undefined} />

            {/* Node outer ring */}
            <circle cx={x} cy={y} r={nodeR + 3} fill="white" />

            {/* Node inner fill */}
            <circle
              cx={x}
              cy={y}
              r={nodeR}
              fill={NODE_COLORS[state]}
              className={isLocked ? "pointer-events-none opacity-70" : "pointer-events-auto cursor-pointer"}
              onClick={isLocked ? undefined : () => onNodeClick?.(phase)}
            />

            {/* Phase number */}
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="700" className="pointer-events-none select-none">
              {index + 1}
            </text>

            {/* Current phase pulse ring */}
            {state === "current" && (
              <circle cx={x} cy={y} r={nodeR + 3} fill="none" stroke={NODE_COLORS.current} strokeWidth="2" opacity="0.6">
                <animate attributeName="r" from={nodeR + 3} to={nodeR + 18} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CompactPhaseCard — Summary card on the fishbone
   ═══════════════════════════════════════════════════════════════════ */
function CompactPhaseCard({ phase, index, currentIndex, phaseStateMap, isFocused, onClick, fontClass, t, cardWidth, padLeft, phaseGap, centerY, amplitude, svgHeight, boneLength }) {
  const x = getPhaseX(index, padLeft, phaseGap);
  const y = getPhaseY(index, centerY, amplitude);
  const above = isCardAbove(index);
  const state = getVisualState(phase, index, currentIndex, phaseStateMap);
  const isLocked = state === "locked";
  const StatusIcon = STATUS_ICONS[state];
  const knowledgeCount = phase?.knowledges?.length || 0;

  const cardLeft = x - cardWidth / 2;
  const cardTop = above ? y - boneLength + 8 : y + boneLength + 8;

  const borderColor = {
    done: "border-emerald-400",
    current: "border-sky-400",
    next: "border-amber-400",
    locked: "border-slate-300",
  }[state];

  const accentBar = {
    done: "bg-emerald-500",
    current: "bg-sky-500",
    next: "bg-amber-500",
    locked: "bg-slate-400",
  }[state];

  const cardSurface = {
    done: "bg-emerald-50/90",
    current: "bg-sky-50/90",
    next: "bg-amber-50/90",
    locked: "bg-slate-100/95",
  }[state];

  const titleColor = {
    done: "text-slate-900",
    current: "text-slate-900",
    next: "text-slate-900",
    locked: "text-slate-500",
  }[state];

  const labelColor = {
    done: "text-emerald-700",
    current: "text-sky-700",
    next: "text-amber-700",
    locked: "text-slate-400",
  }[state];

  const metaTone = {
    done: "text-emerald-700",
    current: "text-sky-700",
    next: "text-amber-700",
    locked: "text-slate-400",
  }[state];

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-disabled={isLocked || undefined}
      aria-label={`${t("workspace.roadmap.canvas.phase", "Phase")} ${index + 1}: ${phase?.title}`}
      className={`compact-phase-card absolute transition-all duration-300 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"} ${above ? "origin-bottom" : "origin-top"}`}
      style={{
        left: cardLeft,
        [above ? "bottom" : "top"]: above ? svgHeight - cardTop : cardTop,
        width: cardWidth,
      }}
      onClick={isLocked ? undefined : () => onClick?.(phase)}
      onKeyDown={(e) => {
        if (isLocked) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(phase);
        }
      }}
    >
      <div
        className={`relative rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-300 ${borderColor} ${cardSurface} ${
          isLocked
            ? "opacity-82 shadow-none saturate-0"
            : isFocused
            ? "shadow-lg scale-[1.03] ring-2 ring-offset-1 ring-sky-300"
            : "hover:shadow-md hover:scale-[1.01]"
        }`}
      >
        {/* Accent bar */}
        <div className={`h-1 w-full ${accentBar}`} />

          <div className="p-3">
            {/* Header row */}
            <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9.5px] uppercase tracking-[0.15em] font-semibold ${labelColor}`}>
              {t("workspace.roadmap.canvas.phase", "Phase")} {index + 1}
            </span>
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[8.5px] font-bold ${STATUS_BADGE_STYLES[state]}`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {t(STATUS_LABELS[state], state)}
            </span>
          </div>

          {/* Title */}
          <h4 className={`text-[14px] font-semibold leading-snug line-clamp-2 ${titleColor} ${fontClass}`}>
            {phase?.title}
          </h4>

          {/* Description - hidden in compact to save space */}
          <p className={`mt-1 text-[10.5px] leading-relaxed line-clamp-1 ${isLocked ? "text-slate-400" : "text-slate-600"}`}>
            {phase?.description || t("workspace.shell.phaseDescriptionFallback", "Phase này sẵn sàng cho knowledge và quiz.")}
          </p>

          {/* Footer metadata */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {phase?.durationLabel && (
              <span className={`rounded-full border px-1.5 py-px text-[9.5px] ${isLocked ? "border-slate-300 bg-slate-200 text-slate-400" : `border-white/80 bg-white/85 ${metaTone}`}`}>
                {phase.durationLabel}
              </span>
            )}
            {knowledgeCount > 0 && (
              <span className={`rounded-full border px-1.5 py-px text-[9.5px] ${isLocked ? "border-slate-300 bg-slate-200 text-slate-400" : "border-indigo-200 bg-white/90 text-indigo-700"}`}>
                {knowledgeCount} {t("workspace.shell.phaseKnowledge", "knowledge")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   KnowledgeDetailCard — Inside the detail panel (Coursera-style)
   ═══════════════════════════════════════════════════════════════════ */
function KnowledgeDetailCard({ knowledge, phaseId, stepNumber, totalSteps, onCreateQuiz, onViewQuiz, onEditQuiz, onShareQuiz, isGeneratingQuiz, isLocked = false, fontClass, t }) {
  const quizItems = knowledge?.quizzes || [];
  const flashcards = knowledge?.flashcards || [];
  const hasQuiz = quizItems.length > 0;

  return (
    <div className={workspaceSurfaceAlt("knowledge-card rounded-xl p-3.5 mb-2.5 border-l-4 transition-all")} style={{ borderLeftColor: hasQuiz ? "#10b981" : "#e2e8f0" }}>
      {/* Step indicator row */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${hasQuiz ? "bg-emerald-500" : "bg-slate-400"}`}>
          {hasQuiz ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold text-slate-800 ${fontClass}`}>{knowledge.title}</p>
          <p className="text-[11px] text-slate-400 font-medium">
            {t("workspace.roadmap.canvas.stepOf", "Bước {{step}} / {{total}}", { step: stepNumber, total: totalSteps })}
          </p>
        </div>
        {flashcards.length ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 font-medium">
            {flashcards.length} {t("workspace.roadmap.canvas.flashcard", "flashcard")}
          </span>
        ) : null}
      </div>

      {/* Description */}
      <p className="text-xs leading-5 text-slate-500 mb-2">
        {knowledge.description || t("workspace.shell.knowledgeDescriptionFallback", "Use this knowledge node to review core concepts, quizzes, and flashcards.")}
      </p>

      {quizItems.length ? (
        <div className="space-y-2">
          {quizItems.map((quiz) => (
            <div key={getQuizId(quiz) || quiz.title} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className={`text-xs font-bold text-slate-700 ${fontClass}`}>{quiz.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button type="button" size="sm" className="rounded-lg h-7 text-xs px-3" disabled={isLocked} onClick={() => onViewQuiz?.(quiz)}>{t("workspace.shell.openQuiz", "Open quiz")}</Button>
                {onEditQuiz && <Button type="button" size="sm" variant="outline" className="rounded-lg h-7 text-xs px-3" disabled={isLocked} onClick={() => onEditQuiz?.(quiz)}>{t("workspace.shell.editQuiz", "Edit quiz")}</Button>}
                {onShareQuiz && <Button type="button" size="sm" variant="outline" className="rounded-lg h-7 text-xs px-3" disabled={isLocked} onClick={() => onShareQuiz(quiz)}>{t("workspace.roadmap.share", "Chia sẻ")}</Button>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Button type="button" size="sm" className="mt-1 rounded-lg h-7 text-xs" disabled={isLocked || isGeneratingQuiz} onClick={() => onCreateQuiz?.(phaseId, knowledge.knowledgeId)}>
          {isGeneratingQuiz ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          {t("workspace.shell.generateKnowledgeQuiz", "Generate quiz")}
        </Button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StepConnectorArrow — Visual arrow between learning path steps
   ═══════════════════════════════════════════════════════════════════ */
function StepConnectorArrow({ isUnlocked = false, direction = "down" }) {
  const color = isUnlocked ? "text-emerald-400" : "text-slate-300";
  if (direction === "right") {
    return (
      <div className={`hidden lg:flex items-center justify-center mx-1 ${color}`}>
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 10H22M22 10L16 4M22 10L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`flex lg:hidden items-center justify-center my-1 ${color}`}>
      <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2V22M10 22L4 16M10 22L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
  const effectiveCanvasView = roadmap?.canvasView === "view2" ? "view2" : "view1";

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
          {roadmap?.roadmapId ? (
            <DirectFeedbackButton
              targetType="ROADMAP"
              targetId={roadmap.roadmapId}
              label={i18n.language === "en" ? "Feedback" : "Phản hồi"}
              isDarkMode={isDarkMode}
              className={`rounded-full ${isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
              title={i18n.language === "en" ? "Roadmap feedback" : "Phản hồi lộ trình"}
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
            {roadmap?.aiSuggest ? (
              <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDarkMode ? "border-amber-800/60 bg-amber-950/30" : "border-amber-200 bg-amber-50"}`}>
                <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                  {t("workspace.roadmap.aiSuggestTitle", "AI suggestion")}
                </p>
                <p data-no-pan="true" className={`mt-1 text-xs leading-5 select-text cursor-text ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
                  {roadmap.aiSuggest}
                </p>
              </div>
            ) : null}
            <div className={`mt-5 rounded-2xl px-4 py-3 ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-[#F7FBFF] text-gray-700 border border-blue-100"}`}>
              <p data-no-pan="true" className={`text-xs uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {labels.estimatedDuration}
              </p>
              <p data-no-pan="true" className={`mt-1 text-sm font-medium select-text cursor-text ${fontClass}`}>{roadmap.estimatedDuration}</p>
              <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${fontClass}`}>
                {Number(roadmap?.estimatedTotalDays) > 0 ? (
                  <span data-no-pan="true" className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-white border border-slate-200 text-gray-700"}`}>
                    {t("workspace.roadmap.totalDays", "Total days")}: {Number(roadmap?.estimatedTotalDays)}
                  </span>
                ) : null}
                {Number(roadmap?.estimatedMinutesPerDay) > 0 ? (
                  <span data-no-pan="true" className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-white border border-slate-200 text-gray-700"}`}>
                    {t("workspace.roadmap.minutesPerDay", "Minutes/day")}: {Number(roadmap?.estimatedMinutesPerDay)}
                  </span>
                ) : null}
              </div>
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
                    <DirectFeedbackButton
                      targetType="PHASE"
                      targetId={phase.phaseId}
                      label={i18n.language === "en" ? "Feedback" : "Phản hồi"}
                      isDarkMode={isDarkMode}
                      className={`rounded-full px-3 ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-gray-700 hover:bg-slate-100"}`}
                      title={i18n.language === "en" ? "Phase feedback" : "Phản hồi phase"}
                    />
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
                {phase?.aiSuggest ? (
                  <div className={`mt-3 rounded-2xl border px-3.5 py-3 ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50"}`}>
                    <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                      {t("workspace.roadmap.phaseAiSuggestTitle", "AI suggestion")}
                    </p>
                    <p data-no-pan="true" className={`mt-1 text-xs leading-5 select-text cursor-text ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                      {phase.aiSuggest}
                    </p>
                  </div>
                ) : null}
                <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${fontClass}`}>
                  {Number(phase?.estimatedDays) > 0 ? (
                    <span data-no-pan="true" className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-gray-700"}`}>
                      {t("workspace.roadmap.phaseEstimatedDays", "Days")}: {Number(phase?.estimatedDays)}
                    </span>
                  ) : null}
                  {Number(phase?.estimatedMinutesPerDay) > 0 ? (
                    <span data-no-pan="true" className={`inline-flex items-center rounded-full px-2 py-0.5 ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-gray-700"}`}>
                      {t("workspace.roadmap.phaseMinutesPerDay", "Minutes/day")}: {Number(phase?.estimatedMinutesPerDay)}
                    </span>
                  ) : null}
                </div>
                <div className={`mt-4 rounded-2xl border px-3.5 py-3 ${isDarkMode ? "border-blue-900/50 bg-blue-950/30" : "border-blue-100 bg-blue-50"}`}>
                  <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
                    {t("workspace.roadmap.canvas.preLearning", "Pre-learning")}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-sm font-medium select-text cursor-text ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                    {phase.preLearning?.title || "-"}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-xs select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                    {phase.preLearning?.questionCount ?? 0} {labels.questions}
                  </p>
                </div>
                <div className={`mt-3 rounded-2xl border px-3.5 py-3 ${isDarkMode ? "border-amber-900/50 bg-amber-950/30" : "border-amber-100 bg-amber-50"}`}>
                  <p data-no-pan="true" className={`text-[11px] uppercase tracking-[0.18em] select-text cursor-text ${isDarkMode ? "text-amber-300" : "text-amber-700"} ${fontClass}`}>
                    {labels.postLearning}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-sm font-medium select-text cursor-text ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                    {phase.postLearning?.title || "-"}
                  </p>
                  <p data-no-pan="true" className={`mt-1 text-xs select-text cursor-text ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                    {phase.postLearning?.questionCount ?? 0} {labels.questions}
                  </p>
                </div>
              </div>

              {(phase.knowledges ?? []).map((knowledge) => {
                const isExpanded = Boolean(expandedKnowledges[knowledge.knowledgeId]);
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
                              {knowledgeTimeLabel ? (
                                <span data-no-pan="true" className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${isDarkMode ? "bg-blue-950/60 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                                  {knowledgeTimeLabel}
                                </span>
                              ) : null}
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
                              {(knowledge.quizzes ?? []).map((quiz) => (
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
                              {(knowledge.flashcards ?? []).map((flashcard) => (
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

