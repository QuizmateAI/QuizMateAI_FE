import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import HomeButton from "@/Components/ui/HomeButton";
import ListSpinner from "@/Components/ui/ListSpinner";
import { getRoadmapGraph } from "@/api/RoadmapAPI";
import CreateRoadmapForm from "./CreateRoadmapForm";
import { workspaceSurfaceAlt } from "./workspaceShellTheme";

/* ═══════════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════════ */
const DONE = new Set(["COMPLETED", "DONE", "SKIPPED"]);
const ACTIVE = new Set(["CURRENT", "IN_PROGRESS", "PROCESSING", "ACTIVE"]);
const QUIZ_DONE = new Set(["COMPLETED", "DONE", "SKIPPED", "PASSED", "FINISHED", "SUBMITTED"]);

const getStatus = (phase) => String(phase?.status || "").toUpperCase();
const getQuizId = (quiz) => Number(quiz?.quizId ?? quiz?.id ?? 0) || null;
const getPhaseKey = (phase, index = 0) => {
  const normalizedPhaseId = Number(phase?.phaseId);
  return Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0
    ? String(normalizedPhaseId)
    : `phase-${index}`;
};
const isTruthyFlag = (value) =>
  value === true || value === 1 || value === "1" || value === "true";
const getDefaultPhase = (phases = [], phaseStateMap = new Map(), currentIndex = 0) =>
  phases.find((phase, index) => phaseStateMap.get(getPhaseKey(phase, index)) === "current") ||
  phases[currentIndex] ||
  phases[phases.length - 1] ||
  null;

function getProgressValue(progressTracking, phaseId, mapKey, getterKey) {
  if (!progressTracking || !Number.isInteger(phaseId) || phaseId <= 0) return 0;
  const directValue = Number(progressTracking?.[mapKey]?.[phaseId] ?? 0);
  if (Number.isFinite(directValue) && directValue > 0) return directValue;
  if (typeof progressTracking?.[getterKey] === "function") {
    const getterValue = Number(progressTracking[getterKey](phaseId) ?? 0);
    if (Number.isFinite(getterValue) && getterValue > 0) return getterValue;
  }
  return 0;
}

function isQuizCompleted(quiz) {
  if (!quiz) return false;
  return (
    QUIZ_DONE.has(getStatus(quiz)) ||
    isTruthyFlag(quiz?.completed) ||
    isTruthyFlag(quiz?.isCompleted) ||
    Boolean(quiz?.completedAt || quiz?.submittedAt || quiz?.finishedAt)
  );
}

function isPhasePostLearningComplete(phase, progressTracking) {
  const normalizedPhaseId = Number(phase?.phaseId);
  const postLearningProgress = getProgressValue(
    progressTracking,
    normalizedPhaseId,
    "postLearningProgressByPhaseId",
    "getPostLearningProgress",
  );
  if (postLearningProgress >= 100) return true;

  const postLearningItems = [
    ...(phase?.postLearningQuizzes || []),
    ...(phase?.postLearning ? [phase.postLearning] : []),
  ].filter(Boolean);

  if (postLearningItems.some(isQuizCompleted)) return true;
  return DONE.has(getStatus(phase)) && postLearningItems.length === 0;
}

function buildPhaseSequence(phases = [], progressTracking = null) {
  const stateMap = new Map();
  let currentIndex = -1;
  let previousPhaseComplete = true;

  phases.forEach((phase, index) => {
    const phaseKey = getPhaseKey(phase, index);
    const phaseCompleted = isPhasePostLearningComplete(phase, progressTracking);

    if (!previousPhaseComplete) {
      stateMap.set(phaseKey, "locked");
      return;
    }

    if (phaseCompleted) {
      stateMap.set(phaseKey, "done");
      previousPhaseComplete = true;
      return;
    }

    if (currentIndex === -1) {
      stateMap.set(phaseKey, "current");
      currentIndex = index;
      previousPhaseComplete = false;
      return;
    }

    stateMap.set(phaseKey, "locked");
  });

  if (currentIndex === -1 && phases.length > 0) currentIndex = phases.length - 1;

  return { stateMap, currentIndex };
}

function getVisualState(phase, index, currentIndex, phaseStateMap = null) {
  const keyedState = phaseStateMap?.get(getPhaseKey(phase, index));
  if (keyedState) return keyedState;
  const status = getStatus(phase);
  if (DONE.has(status) || index < currentIndex) return "done";
  if (ACTIVE.has(status) || index === currentIndex) return "current";
  return index === currentIndex + 1 ? "next" : "locked";
}

/* ═══════════════════════════════════════════════════════════════════
   FISHBONE LAYOUT CONSTANTS — compact by default
   ═══════════════════════════════════════════════════════════════════ */
const PHASE_GAP = 272;
const WAVE_AMPLITUDE = 58;
const WAVE_CENTER_Y = 266;
const SVG_HEIGHT = 648;
const CARD_WIDTH = 236;
const PAD_LEFT = 136;
const PAD_RIGHT = 136;
const BONE_LENGTH = 48;
const DEFAULT_KNOWLEDGE_LIMIT = 3;

/* Fullscreen uses larger constants */
const FS_PHASE_GAP = 390;
const FS_WAVE_AMPLITUDE = 78;
const FS_WAVE_CENTER_Y = 344;
const FS_SVG_HEIGHT = 828;
const FS_CARD_WIDTH = 304;
const FS_PAD_LEFT = 196;
const FS_PAD_RIGHT = 196;
const FS_BONE_LENGTH = 64;
const VIEWPORT_FALLBACK_WIDTH = 1440;
const DEFAULT_ZOOM = 0.95;
const ZOOM_STEP = 0.12;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.45;

function getResponsiveRoadmapLayout(viewportWidth, isFullscreen = false) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : VIEWPORT_FALLBACK_WIDTH;

  if (isFullscreen) {
    if (width < 1280) {
      return {
        phaseGap: 320,
        amplitude: 66,
        centerY: 296,
        svgHeight: 708,
        cardWidth: 258,
        padLeft: 164,
        padRight: 164,
        boneLength: 56,
        minFitZoom: 0.72,
      };
    }

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

/* ═══════════════════════════════════════════════════════════════════
   PhaseDetailPanel — Full detail panel for selected phase
   Coursera-inspired learning path with numbered steps
   ═══════════════════════════════════════════════════════════════════ */
function PhaseDetailPanel({
  phase, phaseIndex, currentIndex, phaseStateMap, viewAllMode, onClose, onToggleViewMode,
  onCreatePreLearning, onCreateKnowledge, onCreateKnowledgeQuiz,
  onViewQuiz, onEditQuiz, onShareQuiz,
  generatingPreLearning, generatingKnowledge, generatingKnowledgeQuizKeys,
  knowledgeProgress, roadmapPhaseGenerationProgress,
  isStudyNewRoadmap, fontClass, t,
}) {
  const state = phase
    ? getVisualState(phase, phaseIndex, currentIndex, phaseStateMap)
    : "locked";
  const StatusIcon = STATUS_ICONS[state];
  const phaseId = Number(phase?.phaseId ?? 0);
  const preQuiz = phase?.preLearningQuizzes?.[0] || phase?.preLearning || null;
  const postQuiz = phase?.postLearningQuizzes?.[0] || phase?.postLearning || null;
  const knowledges = phase?.knowledges || [];
  const displayedKnowledges = viewAllMode ? knowledges : knowledges.slice(0, DEFAULT_KNOWLEDGE_LIMIT);
  const hasMoreKnowledge = knowledges.length > DEFAULT_KNOWLEDGE_LIMIT;
  const isPhaseLocked = state === "locked";
  const showPreLearning = isStudyNewRoadmap;
  const phaseObjective = String(phase?.description || "").trim();
  const allKnowledgeHaveQuizzes = knowledges.length > 0 && knowledges.every((k) => (k?.quizzes?.length || 0) > 0);
  const completedKnowledgeCount = knowledges.filter((k) => (k?.quizzes?.length || 0) > 0).length;
  const knowledgeProgressPercent = knowledges.length > 0 ? Math.round((completedKnowledgeCount / knowledges.length) * 100) : 0;
  const canDoPostLearning = !isPhaseLocked && allKnowledgeHaveQuizzes;
  const defaultEntryMode = showPreLearning
    ? preQuiz
      ? "hasFoundation"
      : knowledges.length > 0
        ? "noBackground"
        : null
    : "noBackground";
  const [entryMode, setEntryMode] = useState(defaultEntryMode);

  const accentBorder = {
    done: "border-emerald-400",
    current: "border-sky-400",
    next: "border-amber-400",
    locked: "border-slate-300",
  }[state];

  const knowledgeStepNum = showPreLearning ? 3 : 1;
  const postLearningStepNum = showPreLearning ? 4 : 2;
  const knowledgeLockedByDecision =
    !isPhaseLocked &&
    showPreLearning &&
    (!entryMode || (entryMode === "hasFoundation" && !preQuiz));
  const knowledgeCardDisabled = isPhaseLocked || knowledgeLockedByDecision;
  const knowledgeEmptyHint = knowledgeLockedByDecision
    ? !entryMode
      ? t(
          "workspace.shell.phaseStartRequired",
          "Chọn cách bắt đầu để mở bước kiến thức của giai đoạn này.",
        )
      : t(
          "workspace.shell.preLearningFirstHint",
          "Bạn đã chọn kiểm tra nhanh. Hãy tạo đánh giá đầu vào trước khi mở phần kiến thức.",
        )
    : t(
        "workspace.shell.phaseKnowledgeHint",
        "Tạo kiến thức để mở quiz và flashcard cho phase này.",
      );
  const preLearningInfoText =
    entryMode === "noBackground" && !preQuiz
      ? t(
          "workspace.shell.preLearningSkippedHint",
          "Bạn đã chọn bắt đầu học ngay. Có thể bỏ qua đánh giá đầu vào ở giai đoạn này.",
        )
      : preQuiz
        ? preQuiz.title
        : t(
            "workspace.shell.preLearningEmpty",
            "Tạo bài đánh giá đầu vào trước khi bắt đầu giai đoạn này.",
          );

  if (!phase) return null;

  return (
    <article
      role="article"
      aria-label={`${t("workspace.roadmap.canvas.phase", "Phase")} ${phaseIndex + 1}: ${phase?.title}`}
      aria-expanded="true"
      data-phase-index={phase?.phaseIndex ?? phaseIndex}
      className={`mt-3 overflow-hidden rounded-2xl border-2 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.32)] transition-all duration-500 ${accentBorder}`}
    >
      {/* ── Detail header ── */}
      <div className="flex items-start justify-between gap-2.5 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-black text-white shadow-md" style={{ backgroundColor: NODE_COLORS[state] }}>
            {phaseIndex + 1}
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {t("workspace.roadmap.canvas.phase", "Phase")} {phaseIndex + 1}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE_STYLES[state]}`}>
                <StatusIcon className="h-2.5 w-2.5" />
                {t(STATUS_LABELS[state], state)}
              </span>
            </div>
            <h3 className={`text-[19px] font-semibold leading-tight text-slate-900 ${fontClass}`}>{phase?.title}</h3>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 transition-colors hover:bg-slate-100" aria-label={t("workspace.timeline.collapse", "Đóng chi tiết")}>
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {phaseObjective && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/85 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
              {t("workspace.shell.phaseObjective", "Mục tiêu giai đoạn")}
            </p>
            <p className="mt-1.5 text-[14px] font-semibold leading-7 text-slate-800">
              {phaseObjective}
            </p>
          </div>
        </div>
      )}

      {/* ── Metadata badges ── */}
      {(knowledgeProgress > 0 || roadmapPhaseGenerationProgress > 0 || phase?.durationLabel) && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {phase?.durationLabel && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">{phase.durationLabel}</span>}
          {knowledgeProgress > 0 && <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700">{t("workspace.shell.phaseProgress", "Phase progress")}: {knowledgeProgress}%</span>}
          {roadmapPhaseGenerationProgress > 0 && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">{roadmapPhaseGenerationProgress}%</span>}
        </div>
      )}

      {isPhaseLocked && (
        <div className="px-4 pb-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
            {t(
              "workspace.shell.lockedPhaseHint",
              "Hoàn thành post-learning của phase trước để mở phase này.",
            )}
          </div>
        </div>
      )}

      {/* ── Learning path — Coursera-inspired vertical / horizontal flow ── */}
      <div className="px-4 pb-4 pt-2.5">
        {showPreLearning && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {t("workspace.roadmap.canvas.learningPath", "Learning path")}
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[15px] font-semibold text-slate-900">
                  {t(
                    "workspace.timeline.preLearningPrompt",
                    "Bạn muốn bắt đầu giai đoạn này như thế nào?",
                  )}
                </p>
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  {t(
                    "workspace.shell.phaseStartRequired",
                    "Chọn cách bắt đầu để mở bước kiến thức của giai đoạn này.",
                  )}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
                <button
                  type="button"
                  onClick={() => setEntryMode("hasFoundation")}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    entryMode === "hasFoundation"
                      ? "border-sky-300 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-slate-900">
                    {t(
                      "workspace.timeline.studyNew.hasFoundation",
                      "Tôi đã có nền tảng cơ bản ở giai đoạn này",
                    )}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {t(
                      "workspace.roadmap.canvas.preLearningHint",
                      "Đánh giá kiến thức nền tảng của bạn",
                    )}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("noBackground")}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    entryMode === "noBackground"
                      ? "border-indigo-300 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-slate-900">
                    {t(
                      "workspace.timeline.studyNew.noBackground",
                      "Tôi mới làm quen với giai đoạn này",
                    )}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {t(
                      "workspace.shell.phaseKnowledgeHint",
                      "Tạo kiến thức để mở quiz và flashcard cho phase này.",
                    )}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {t("workspace.roadmap.canvas.learningPath", "Learning path")}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <div
          className={`grid gap-4 ${
            showPreLearning ? "lg:grid-cols-3" : "lg:grid-cols-2"
          }`}
        >
          {/* ── Step 1: Pre-Learning (only if isStudyNewRoadmap) ── */}
          {showPreLearning && (
              <section
                className={`flex min-h-[264px] flex-col rounded-xl border-2 p-4 transition-all ${
                  entryMode === "noBackground" && !preQuiz
                    ? "border-slate-200 bg-gradient-to-b from-slate-50 to-white"
                    : "border-sky-200 bg-gradient-to-b from-sky-50/60 to-white hover:shadow-md"
                }`}
              >
                {/* Step header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white text-[11px] font-black shadow-sm">1</span>
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-[0.12em] text-sky-800">
                      {t("workspace.shell.preLearning", "Pre-learning")}
                    </p>
                    <p className="text-[10px] text-sky-600 font-semibold">
                      {t("workspace.roadmap.canvas.preLearningHint", "Assess your prior knowledge")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col rounded-lg bg-white border border-sky-100 p-3">
                  <p className="text-[13px] leading-5 text-slate-700 font-semibold">
                    {preLearningInfoText}
                  </p>
                  {entryMode === "noBackground" && !preQuiz ? (
                    <div className="mt-auto pt-3">
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-500">
                        {t(
                          "workspace.shell.preLearningSkippedHint",
                          "Bạn đã chọn bắt đầu học ngay. Có thể bỏ qua đánh giá đầu vào ở giai đoạn này.",
                        )}
                      </div>
                    </div>
                  ) : preQuiz ? (
                    <Button type="button" size="sm" className="mt-auto h-9 w-full rounded-lg px-4 text-[13px] font-bold justify-center" disabled={isPhaseLocked} onClick={() => onViewQuiz?.(preQuiz)}>
                      {t("workspace.shell.openQuiz", "Open quiz")}
                    </Button>
                  ) : (
                    <Button type="button" size="sm" className="mt-auto h-9 w-full rounded-lg px-4 text-[13px] font-bold justify-center" disabled={isPhaseLocked || generatingPreLearning} onClick={() => onCreatePreLearning?.(phaseId)}>
                      {generatingPreLearning ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                      {t("workspace.shell.generatePreLearning", "Generate")}
                    </Button>
                  )}
                </div>
              </section>
          )}

          {/* ── Step 2/1: Knowledge — core learning ── */}
          <section
            className={`flex min-h-[264px] flex-col rounded-xl border-2 p-4 transition-all ${
              knowledgeCardDisabled
                ? "border-slate-200 bg-gradient-to-b from-slate-50 to-white"
                : "border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white hover:shadow-md"
            }`}
          >
            {/* Step header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm ${knowledgeCardDisabled ? "bg-slate-400" : "bg-indigo-500"}`}>{knowledgeStepNum}</span>
                  <div>
                    <p className={`text-[12px] font-black uppercase tracking-[0.12em] ${knowledgeCardDisabled ? "text-slate-500" : "text-indigo-800"}`}>
                      {t("workspace.shell.phaseKnowledge", "Knowledge")}
                      {knowledges.length > 0 && !viewAllMode && hasMoreKnowledge ? (
                        <span className={`ml-1.5 normal-case tracking-normal font-bold ${knowledgeCardDisabled ? "text-slate-400" : "text-indigo-500"}`}>
                        ({displayedKnowledges.length} {t("workspace.timeline.of", "of")} {knowledges.length})
                        </span>
                      ) : knowledges.length > 0 ? (
                        <span className={`ml-1.5 normal-case tracking-normal font-bold ${knowledgeCardDisabled ? "text-slate-400" : "text-indigo-500"}`}>({knowledges.length})</span>
                      ) : null}
                    </p>
                  <p className={`text-[10px] font-semibold ${knowledgeCardDisabled ? "text-slate-400" : "text-indigo-600"}`}>
                    {knowledgeCardDisabled
                      ? knowledgeEmptyHint
                      : t("workspace.roadmap.canvas.knowledgeHint", "Complete all quizzes to unlock post-learning")}
                  </p>
                </div>
              </div>
              {hasMoreKnowledge && (
                <button type="button" className={`text-[11px] font-extrabold ${knowledgeCardDisabled ? "text-slate-400" : "text-indigo-600 hover:text-indigo-700"}`} disabled={knowledgeCardDisabled} onClick={() => onToggleViewMode?.(phaseId)}>
                  {viewAllMode ? t("workspace.timeline.showLess", "Show less") : t("workspace.timeline.viewAll", "View all →")}
                </button>
              )}
            </div>

            {/* Knowledge progress bar — prominent Coursera-style */}
            {knowledges.length > 0 && !knowledgeCardDisabled && (
              <div className="mb-3 rounded-lg bg-white border border-indigo-100 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold text-slate-600">
                    {t("workspace.roadmap.canvas.quizProgress", "Quiz progress")}
                  </span>
                  <span className="text-[12px] font-black text-indigo-700">
                    {completedKnowledgeCount}/{knowledges.length} {t("workspace.roadmap.canvas.completed", "completed")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700"
                    style={{ width: `${knowledgeProgressPercent}%` }}
                  />
                </div>
                {!canDoPostLearning && knowledges.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-amber-700 font-bold flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5 shrink-0" />
                    {t("workspace.roadmap.canvas.knowledgeGateHint", "Finish all {{total}} quizzes to proceed to post-learning", { total: knowledges.length })}
                  </p>
                )}
              </div>
            )}

            {knowledges.length > 0 && !knowledgeCardDisabled ? (
              <div className="space-y-0 max-h-[340px] overflow-y-auto pr-1">
                {displayedKnowledges.map((knowledge, idx) => (
                  <KnowledgeDetailCard
                    key={knowledge.knowledgeId}
                    knowledge={knowledge}
                    phaseId={phaseId}
                    stepNumber={idx + 1}
                    totalSteps={knowledges.length}
                    onCreateQuiz={onCreateKnowledgeQuiz}
                    onViewQuiz={onViewQuiz}
                    onEditQuiz={onEditQuiz}
                    onShareQuiz={onShareQuiz}
                    isGeneratingQuiz={generatingKnowledgeQuizKeys.has(`${phaseId}:${knowledge.knowledgeId}`)}
                    isLocked={isPhaseLocked}
                    fontClass={fontClass}
                    t={t}
                  />
                ))}
              </div>
            ) : (
                <div className={`flex flex-1 flex-col rounded-lg border p-3 ${knowledgeCardDisabled ? "border-slate-200 bg-slate-50" : "border-indigo-100 bg-white"}`}>
                  <p className={`text-[13px] font-semibold ${knowledgeCardDisabled ? "text-slate-500" : "text-slate-600"}`}>
                    {knowledgeEmptyHint}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-auto h-9 w-full rounded-lg px-4 text-[13px] font-bold justify-center"
                    disabled={knowledgeCardDisabled || generatingKnowledge}
                    onClick={() =>
                      onCreateKnowledge?.(phaseId, {
                        skipPreLearning: entryMode === "noBackground",
                      })
                    }
                  >
                    {generatingKnowledge ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                    {t("workspace.shell.generateKnowledge", "Generate")}
                  </Button>
                </div>
              )}
          </section>

          {/* ── Step 3/2: Post-Learning — gated behind knowledge completion ── */}
          <section className={`relative flex min-h-[264px] flex-col overflow-hidden rounded-xl border-2 p-4 transition-all ${
            canDoPostLearning
              ? "border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white hover:shadow-md"
              : "border-slate-200 bg-gradient-to-b from-slate-50 to-white"
          }`}>
            {/* Locked overlay */}
            {!canDoPostLearning && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 mb-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-[13px] font-black text-slate-600 text-center mb-2">
                  {t("workspace.roadmap.canvas.postLearningLocked", "Hoàn thành toàn bộ quiz knowledge để mở")}
                </p>
                {/* Mini progress indicator */}
                <div className="w-full max-w-[180px]">
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                      style={{ width: `${knowledgeProgressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-center text-slate-500">
                    {t("workspace.roadmap.canvas.postLearningProgress", "{{completed}} / {{total}} quiz knowledge đã hoàn thành", { completed: completedKnowledgeCount, total: knowledges.length })}
                  </p>
                </div>
              </div>
            )}

            {/* Step header */}
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white shadow-sm ${
          canDoPostLearning ? "bg-emerald-500" : "bg-slate-400"
        }`}>
                {canDoPostLearning ? <CheckCircle2 className="h-3.5 w-3.5" /> : postLearningStepNum}
              </span>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
            canDoPostLearning ? "text-emerald-800" : "text-slate-500"
          }`}>
                  {t("workspace.roadmap.canvas.postLearning", "Post-learning")}
                </p>
                <p className={`text-[10px] font-medium ${
            canDoPostLearning ? "text-emerald-600" : "text-slate-400"
          }`}>
                  {t("workspace.roadmap.canvas.postLearningSubtitle", "Final assessment for this phase")}
                </p>
              </div>
            </div>

            <div className="mt-auto rounded-lg bg-white border border-slate-100 p-3">
              <p className={`text-[13px] leading-5 font-semibold ${canDoPostLearning ? "text-slate-700" : "text-slate-400"}`}>
                {postQuiz ? postQuiz.title : t("workspace.shell.postLearningPending", "Post-learning will appear here after the phase content is generated.")}
              </p>
              {postQuiz && canDoPostLearning && (
                <Button type="button" size="sm" className="mt-3 h-9 w-full rounded-lg px-4 text-[13px] font-bold justify-center bg-emerald-600 hover:bg-emerald-700" onClick={() => onViewQuiz?.(postQuiz)}>
                  {t("workspace.shell.openPostLearning", "Open post-learning")}
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FishboneWaveSection — Reusable wave area (inline or fullscreen)
   ═══════════════════════════════════════════════════════════════════ */
function FishboneWaveSection({
  phases, currentIndex, phaseStateMap, resolvedFocusedPhaseId, handlePhaseClick,
  scrollContainerRef, scrollBy, fontClass, t,
  padLeft, padRight, phaseGap, centerY, amplitude, svgHeight, cardWidth, boneLength,
  zoomLevel,
}) {
  const totalWidth = computeTotalWidth(phases.length, padLeft, padRight, phaseGap);
  const scaledWidth = Math.max(totalWidth * zoomLevel, 1);
  const scaledHeight = Math.max(svgHeight * zoomLevel, 1);

  return (
    <section
      role="region"
      aria-label={t("workspace.timeline.label", "Dòng thời gian roadmap học tập")}
      className="relative overflow-visible rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.28)]"
    >
      {/* Scroll arrows */}
      <button
        type="button"
      className="absolute -left-6 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.45)] transition-all hover:bg-white hover:shadow-[0_20px_36px_-18px_rgba(15,23,42,0.5)]"
        onClick={() => scrollBy(-phaseGap)}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
      </button>
      <button
        type="button"
      className="absolute -right-6 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 shadow-[0_16px_30px_-18px_rgba(15,23,42,0.45)] transition-all hover:bg-white hover:shadow-[0_20px_36px_-18px_rgba(15,23,42,0.5)]"
        onClick={() => scrollBy(phaseGap)}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
      </button>

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-slate-50 to-transparent" />

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden relative"
        style={{ height: scaledHeight, scrollbarWidth: "thin" }}
      >
        <div className="relative" style={{ width: scaledWidth, height: scaledHeight }}>
          <div
            className="absolute left-0 top-0"
            style={{
              width: totalWidth,
              height: svgHeight,
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
          >
            {/* SVG wave + nodes */}
            <FishboneSVG
              phases={phases}
              currentIndex={currentIndex}
              phaseStateMap={phaseStateMap}
              focusedPhaseId={resolvedFocusedPhaseId}
              onNodeClick={handlePhaseClick}
              padLeft={padLeft}
              padRight={padRight}
              phaseGap={phaseGap}
              centerY={centerY}
              amplitude={amplitude}
              svgHeight={svgHeight}
              boneLength={boneLength}
            />

            {/* Compact phase cards */}
            {phases.map((phase, index) => (
              <CompactPhaseCard
                key={phase?.phaseId || index}
                phase={phase}
                index={index}
                currentIndex={currentIndex}
                phaseStateMap={phaseStateMap}
                isFocused={Number(phase?.phaseId) === Number(resolvedFocusedPhaseId)}
                onClick={handlePhaseClick}
                fontClass={fontClass}
                t={t}
                cardWidth={cardWidth}
                padLeft={padLeft}
                phaseGap={phaseGap}
                centerY={centerY}
                amplitude={amplitude}
                svgHeight={svgHeight}
                boneLength={boneLength}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phase legend */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.38)] backdrop-blur-sm">
          {[
            { state: "done", label: t("workspace.shell.phaseCompleted", "Completed") },
            { state: "current", label: t("workspace.shell.phaseCurrent", "Current") },
            { state: "next", label: t("workspace.timeline.phaseNext", "Next") },
            { state: "locked", label: t("workspace.shell.phaseLocked", "Locked") },
          ].map(({ state, label }) => (
            <div key={state} className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NODE_COLORS[state] }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RoadmapCanvasView (main component)
   ═══════════════════════════════════════════════════════════════════ */
function RoadmapCanvasView({
  workspaceId = null,
  onCreateRoadmap,
  onRoadmapPhaseFocus,
  onCreatePhaseKnowledge,
  onCreateKnowledgeQuizForKnowledge,
  onCreatePhasePreLearning,
  isStudyNewRoadmap = false,
  adaptationMode = "",
  onViewQuiz,
  onEditQuiz,
  roadmapPhaseGenerationProgress = 0,
  generatingKnowledgePhaseIds = [],
  generatingKnowledgeQuizPhaseIds = [],
  generatingKnowledgeQuizKnowledgeKeys = [],
  generatingPreLearningPhaseIds = [],
  reloadToken = 0,
  onReloadRoadmap,
  selectedPhaseId = null,
  disableCreate = false,
  progressTracking = null,
  onShareRoadmap,
  onShareQuiz,
  onEditRoadmapConfig,
  onGenerateRoadmapPhases,
  isSubmittingRoadmapPhaseGeneration = false,
  roadmapConfigSummary = null,
  sources = [],
  selectedSourceIds = [],
  onSelectedSourceIdsChange,
  activeSourceCount = 0,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const location = useLocation();
  const navigate = useNavigate();

  /* ─── UI State ─── */
  const [focusedPhaseId, setFocusedPhaseId] = useState(null);
  const [viewAllModeByPhaseId, setViewAllModeByPhaseId] = useState(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenClosing, setIsFullscreenClosing] = useState(false);
  const [manualZoomLevel, setManualZoomLevel] = useState(DEFAULT_ZOOM);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : VIEWPORT_FALLBACK_WIDTH,
  );

  /* ─── Refs ─── */
  const scrollContainerRef = useRef(null);
  const fsScrollContainerRef = useRef(null);
  const detailPanelRef = useRef(null);
  const fsDetailPanelRef = useRef(null);
  const hasAutoScrolled = useRef(false);
  const shouldFollowSelectedPhase = useRef(false);

  /* ─── External phase id ─── */
  const externalPhaseId = Number(selectedPhaseId);
  const resolvedFocusedPhaseId = Number.isInteger(externalPhaseId) && externalPhaseId > 0 ? externalPhaseId : focusedPhaseId;

  /* ─── Server State ─── */
  const { data: roadmap, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["workspace-roadmap", workspaceId, reloadToken],
    enabled: Number(workspaceId) > 0,
    queryFn: async () => {
      const response = await getRoadmapGraph({ workspaceId });
      return response?.data?.data ?? null;
    },
  });

  /* ─── Derived ─── */
  const phases = useMemo(
    () => [...(roadmap?.phases || [])].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0)),
    [roadmap?.phases],
  );
  const normalizedSelectedSourceIds = useMemo(
    () =>
      selectedSourceIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    [selectedSourceIds],
  );
  const roadmapActiveMaterials = useMemo(() => {
    return (sources || []).filter(
      (source) => String(source?.status || "").toUpperCase() === "ACTIVE",
    );
  }, [sources]);
  const effectiveRoadmapSelectedIds = useMemo(() => {
    if (normalizedSelectedSourceIds.length > 0) {
      return normalizedSelectedSourceIds;
    }

    return roadmapActiveMaterials
      .map((source) => Number(source?.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }, [normalizedSelectedSourceIds, roadmapActiveMaterials]);
  const effectiveRoadmapSelectedSet = useMemo(
    () => new Set(effectiveRoadmapSelectedIds),
    [effectiveRoadmapSelectedIds],
  );
  const handleRoadmapMaterialCheckedChange = useCallback(
    (materialId, nextChecked) => {
      if (!onSelectedSourceIdsChange) return;

      const normalizedMaterialId = Number(materialId);
      if (!Number.isInteger(normalizedMaterialId) || normalizedMaterialId <= 0) {
        return;
      }

      const activeIds = roadmapActiveMaterials
        .map((source) => Number(source?.id))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (activeIds.length === 0) return;

      let nextSelectedIds;

      if (normalizedSelectedSourceIds.length === 0) {
        if (nextChecked) return;
        nextSelectedIds = activeIds.filter((id) => id !== normalizedMaterialId);
      } else {
        const explicitSelection = new Set(normalizedSelectedSourceIds);
        if (nextChecked) {
          explicitSelection.add(normalizedMaterialId);
        } else {
          explicitSelection.delete(normalizedMaterialId);
        }
        nextSelectedIds = activeIds.filter((id) => explicitSelection.has(id));
      }

      if (nextSelectedIds.length === 0) {
        return;
      }

      onSelectedSourceIdsChange(nextSelectedIds);
    },
    [
      normalizedSelectedSourceIds,
      onSelectedSourceIdsChange,
      roadmapActiveMaterials,
    ],
  );
  const hasPhases = phases.length > 0;
  const mainLayout = useMemo(
    () => getResponsiveRoadmapLayout(viewportWidth, false),
    [viewportWidth],
  );
  const fullscreenLayout = useMemo(
    () => getResponsiveRoadmapLayout(viewportWidth, true),
    [viewportWidth],
  );
  const activeLayout = isFullscreen ? fullscreenLayout : mainLayout;
  const phaseSequence = useMemo(
    () => buildPhaseSequence(phases, progressTracking),
    [phases, progressTracking],
  );
  const phaseStateMap = phaseSequence.stateMap;
  const currentIndex = phaseSequence.currentIndex;
  const defaultPhase = useMemo(
    () => getDefaultPhase(phases, phaseStateMap, currentIndex),
    [currentIndex, phaseStateMap, phases],
  );

  const selectedPhase = useMemo(
    () => phases.find((p) => Number(p?.phaseId) === Number(resolvedFocusedPhaseId)) || null,
    [phases, resolvedFocusedPhaseId],
  );
  const selectedPhaseIndex = useMemo(
    () => (selectedPhase ? phases.findIndex((p) => Number(p?.phaseId) === Number(selectedPhase.phaseId)) : -1),
    [phases, selectedPhase],
  );
  const roadmapDescriptionText = String(roadmap?.description || "").trim();

  const generatingQuizKeysSet = useMemo(() => new Set(generatingKnowledgeQuizKnowledgeKeys), [generatingKnowledgeQuizKnowledgeKeys]);
  const zoomLevel = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, manualZoomLevel ?? DEFAULT_ZOOM),
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ─── Auto-scroll to current phase on first load ─── */
  useEffect(() => {
    if (phases.length > 0 && defaultPhase && !hasAutoScrolled.current) {
      const defaultIndex = phases.findIndex((p) => Number(p?.phaseId) === Number(defaultPhase.phaseId));
      let cancelled = false;
      const timer = setTimeout(() => {
        if (cancelled) return;
        const container = scrollContainerRef.current;
        if (container && typeof container.scrollTo === "function") {
          const targetX =
            getPhaseX(
              Math.max(0, defaultIndex),
              mainLayout.padLeft,
              mainLayout.phaseGap,
            ) *
              zoomLevel -
          container.clientWidth / 2;
          container.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
        }
        hasAutoScrolled.current = true;
      }, 300);
      return () => { cancelled = true; clearTimeout(timer); };
    }
  }, [defaultPhase, mainLayout.padLeft, mainLayout.phaseGap, phases, zoomLevel]);

  /* ─── Callbacks ─── */
  const handlePhaseClick = useCallback(
    (phase) => {
      const id = Number(phase?.phaseId);
      if (!Number.isInteger(id) || id <= 0) return;
      const idx = phases.findIndex((p) => Number(p?.phaseId) === id);
      if (idx < 0) return;
      const state = phaseStateMap.get(getPhaseKey(phase, idx));
      if (state === "locked") return;
      shouldFollowSelectedPhase.current = true;
      setFocusedPhaseId(id);
      onRoadmapPhaseFocus?.(id);
      // Scroll the phase into view
      const container = isFullscreen
        ? fsScrollContainerRef.current
        : scrollContainerRef.current;
      if (container && typeof container.scrollTo === "function" && idx >= 0) {
        const layout = isFullscreen ? fullscreenLayout : mainLayout;
        const targetX =
          getPhaseX(idx, layout.padLeft, layout.phaseGap) * zoomLevel -
          container.clientWidth / 2;
        container.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
      }
    },
    [fullscreenLayout, isFullscreen, mainLayout, onRoadmapPhaseFocus, phaseStateMap, phases, zoomLevel],
  );

  const closeDetail = useCallback(() => setFocusedPhaseId(null), []);

  const toggleViewMode = useCallback((phaseId) => {
    setViewAllModeByPhaseId((prev) => {
      const next = new Map(prev);
      next.set(phaseId, !next.get(phaseId));
      return next;
    });
  }, []);

  const openQuiz = useCallback(
    (quiz) => {
      if (!getQuizId(quiz) || !selectedPhase) return;
      onViewQuiz?.(quiz, {
        backTarget: { view: "roadmap", roadmapId: Number(roadmap?.roadmapId) || null, phaseId: Number(selectedPhase.phaseId) },
      });
    },
    [onViewQuiz, roadmap?.roadmapId, selectedPhase],
  );

  const editQuiz = useCallback(
    (quiz) => {
      if (!getQuizId(quiz) || !selectedPhase) return;
      onEditQuiz?.(quiz, {
        backTarget: { view: "roadmap", roadmapId: Number(roadmap?.roadmapId) || null, phaseId: Number(selectedPhase.phaseId) },
      });
    },
    [onEditQuiz, roadmap?.roadmapId, selectedPhase],
  );

  const refreshRoadmap = useCallback(async () => {
    onReloadRoadmap?.();
    await refetch();
  }, [onReloadRoadmap, refetch]);

  const createRoadmap = useCallback(
    async (payload) => {
      await onCreateRoadmap?.(payload);
      await refetch();
    },
    [onCreateRoadmap, refetch],
  );

  /* ─── Scroll arrows ─── */
  const scrollBy = useCallback((delta) => {
    const container = scrollContainerRef.current;
    if (container && typeof container.scrollTo === "function") {
      container.scrollTo({ left: container.scrollLeft + delta, behavior: "smooth" });
    }
  }, []);

  const fsScrollBy = useCallback((delta) => {
    const container = fsScrollContainerRef.current;
    if (container && typeof container.scrollTo === "function") {
      container.scrollTo({ left: container.scrollLeft + delta, behavior: "smooth" });
    }
  }, []);

  /* ─── Zoom ─── */
  const adjustZoom = useCallback((dir) => {
    setManualZoomLevel((prev) => {
      const currentZoom = prev ?? DEFAULT_ZOOM;
      const next = dir === "in" ? currentZoom + ZOOM_STEP : currentZoom - ZOOM_STEP;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(next * 100) / 100));
    });
  }, []);

  /* ─── Fullscreen ─── */
  const openFullscreen = useCallback(() => {
    setIsFullscreenClosing(false);
    setManualZoomLevel(DEFAULT_ZOOM);
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreenClosing(true);
    setTimeout(() => {
      setManualZoomLevel(DEFAULT_ZOOM);
      setIsFullscreen(false);
      setIsFullscreenClosing(false);
    }, 200);
  }, []);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") closeFullscreen(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, closeFullscreen]);

  useEffect(() => {
    if (!selectedPhase || !shouldFollowSelectedPhase.current) return;
    const detailTarget = isFullscreen ? fsDetailPanelRef.current : detailPanelRef.current;
    if (!detailTarget || typeof detailTarget.scrollIntoView !== "function") return;

    const timer = window.setTimeout(() => {
      detailTarget.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      shouldFollowSelectedPhase.current = false;
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isFullscreen, selectedPhase]);

  /* ═══ RENDER ═══ */
  if (isLoading) return <div className="flex h-full items-center justify-center p-8"><ListSpinner variant="section" /></div>;

  /* Empty state */
  if (!roadmap || !hasPhases) {
    const isRoadmapDraftWithoutPhases = Boolean(roadmap) && !hasPhases;
    if (isRoadmapDraftWithoutPhases) {
      const configItems = [
        {
          key: "knowledgeLoad",
          label: t(
            "workspace.profileConfig.fields.knowledgeLoad",
            "Lượng kiến thức cần học",
          ),
          value: getFormattedRoadmapConfigValue(
            t,
            "knowledgeLoad",
            roadmapConfigSummary?.knowledgeLoad,
          ),
        },
        {
          key: "adaptationMode",
          label: t(
            "workspace.profileConfig.fields.adaptationMode",
            "Loại lộ trình",
          ),
          value: getFormattedRoadmapConfigValue(
            t,
            "adaptationMode",
            roadmapConfigSummary?.adaptationMode || adaptationMode,
          ),
        },
        {
          key: "roadmapSpeedMode",
          label: t(
            "workspace.profileConfig.fields.roadmapSpeedMode",
            "Tốc độ lộ trình",
          ),
          value: getFormattedRoadmapConfigValue(
            t,
            "roadmapSpeedMode",
            roadmapConfigSummary?.roadmapSpeedMode,
          ),
        },
        {
          key: "estimatedTotalDays",
          label: t(
            "workspace.profileConfig.fields.estimatedTotalDays",
            "Số ngày dự kiến",
          ),
          value: getFormattedRoadmapConfigValue(
            t,
            "estimatedTotalDays",
            roadmapConfigSummary?.estimatedTotalDays,
          ),
        },
        {
          key: "recommendedMinutesPerDay",
          label: t(
            "workspace.profileConfig.fields.recommendedMinutesPerDay",
            "Số phút học gợi ý mỗi ngày",
          ),
          value: getFormattedRoadmapConfigValue(
            t,
            "recommendedMinutesPerDay",
            roadmapConfigSummary?.recommendedMinutesPerDay,
          ),
        },
      ];

      return (
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <div className="flex items-center pb-4">
            <HomeButton />
          </div>

          <div className="mx-auto flex min-h-[calc(100%-3.75rem)] w-full max-w-5xl items-center">
            <div className="w-full space-y-6">
            <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
              <section className="space-y-5 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.28)] sm:p-7">
                <div className="space-y-2 border-b border-slate-200/70 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t(
                      "workspace.shell.roadmapMaterialsTitle",
                      "Tài liệu sử dụng",
                    )}
                  </p>
                  <p className="text-sm leading-6 text-slate-500">
                    {t(
                      "workspace.shell.roadmapMaterialsHint",
                      "Các tài liệu ACTIVE dưới đây sẽ được dùng để tạo phase cho roadmap.",
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  <p className="leading-6">
                    {t(
                      "workspace.shell.roadmapMaterialSelectionHint",
                      "Tích chọn tài liệu bạn muốn dùng để tạo roadmap.",
                    )}
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {t(
                      "workspace.shell.roadmapMaterialSelectionCount",
                      "{{selected}} / {{total}} tài liệu",
                      {
                        selected: effectiveRoadmapSelectedIds.length,
                        total: roadmapActiveMaterials.length,
                        defaultValue: `${effectiveRoadmapSelectedIds.length} / ${roadmapActiveMaterials.length} tài liệu`,
                      },
                    )}
                  </span>
                </div>

                {roadmapActiveMaterials.length > 0 ? (
                  <div className="space-y-3">
                    {roadmapActiveMaterials.map((material) => {
                      const materialId = Number(material?.id);
                      const checkboxId = `roadmap-material-${materialId}`;
                      const isChecked = effectiveRoadmapSelectedSet.has(
                        materialId,
                      );

                      return (
                      <div
                        key={material?.id}
                        className="flex items-start gap-3 border-b border-slate-200/70 pb-3"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleRoadmapMaterialCheckedChange(
                              materialId,
                              checked === true,
                            )
                          }
                          className="mt-1 h-5 w-5 rounded-md border-slate-300 text-white data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                        />
                        <label
                          htmlFor={checkboxId}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <p
                            className={`text-base font-semibold text-slate-900 ${fontClass}`}
                          >
                            {material?.displayTitle ||
                              material?.title ||
                              material?.name ||
                              material?.fileName ||
                              t(
                                "workspace.shell.untitledMaterial",
                                "Tài liệu chưa đặt tên",
                              )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                            {material?.fileType ? (
                              <span className="uppercase">
                                {material.fileType}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                              {t("workspace.sourceList.status.active", "ACTIVE")}
                            </span>
                          </div>
                        </label>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    {t(
                      "workspace.shell.roadmapNoPhaseNoActiveSources",
                      "Hiện chưa có nguồn ACTIVE để dựng phase roadmap.",
                    )}
                  </p>
                )}
              </section>

              <section className="space-y-5 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.28)] sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {t(
                        "workspace.shell.roadmapConfigTitle",
                        "Cấu hình roadmap hiện tại",
                      )}
                    </p>
                    <p className="text-sm leading-6 text-slate-500">
                      {t(
                        "workspace.shell.roadmapConfigHint",
                        "Đây là cấu hình đã lưu ở bước 3.",
                      )}
                    </p>
                  </div>
                  {onEditRoadmapConfig && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onEditRoadmapConfig}
                      className="rounded-2xl"
                    >
                      {t("workspace.roadmap.editConfigAction", "Edit")}
                    </Button>
                  )}
                </div>

                <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {configItems.map((item) => (
                    <div
                      key={item.key}
                      className="border-b border-slate-200/70 pb-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {item.label}
                      </p>
                      <p
                        className={`mt-2 text-base font-semibold text-slate-900 ${fontClass}`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200/80 pt-5">
                  {disableCreate ? (
                    <p className="text-sm leading-6 text-amber-700">
                      {t(
                        "workspace.shell.roadmapGenerateLocked",
                        "Cần có nguồn ACTIVE và quyền roadmap hợp lệ trước khi tạo phase.",
                      )}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onGenerateRoadmapPhases?.()}
                      disabled={isSubmittingRoadmapPhaseGeneration}
                      className="rounded-2xl px-5"
                    >
                      {isSubmittingRoadmapPhaseGeneration ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {isSubmittingRoadmapPhaseGeneration
                        ? t(
                            "workspace.roadmap.generating",
                            "Đang tạo roadmap",
                          )
                        : t(
                            "workspace.shell.roadmapGenerateAction",
                            "Generate roadmap",
                          )}
                    </Button>
                  )}
                </div>
              </section>
            </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div className="max-w-2xl">
              <h2 className={`text-[28px] font-semibold text-slate-900 ${fontClass}`}>
                {t("workspace.shell.roadmapEmptyTitle", "Build the roadmap before generating outputs")}
              </h2>
              <p className="mt-2.5 text-[13px] leading-6 text-slate-500">
                {t("workspace.shell.roadmapEmptyHint", "Choose the learning goal, keep the right materials selected, and generate a roadmap before creating quizzes, flashcards, or post-learning outputs.")}
              </p>
            </div>
          </div>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.7fr)_minmax(340px,1fr)] xl:items-start">
            <section className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("workspace.shell.selectedMaterials", "Selected materials")}
                </p>
                <p className="mt-2.5 text-[15px] font-semibold text-slate-900">
                  {selectedSourceIds.length > 0
                    ? t("workspace.shell.selectedMaterialCountHint", "{{count}} selected sources will be used for roadmap context.", {
                        count: selectedSourceIds.length,
                        defaultValue: `${selectedSourceIds.length} selected sources will be used for roadmap context.`,
                      })
                    : t("workspace.shell.noSelectedMaterialHint", "No sources selected yet. The roadmap can still be created from your workspace profile.")}
                </p>
              </div>
              {adaptationMode ? (
                <p className="text-[13px] leading-6 text-slate-500">
                  {adaptationMode}
                </p>
              ) : null}
              <div className="space-y-2.5 border-t border-slate-200/80 pt-4 text-[13px] leading-6 text-slate-500">
                <p>{t("workspace.roadmap.aiOnlyDescription", "AI will use the selected sources and learning goal to build phases, knowledge, quizzes, and flashcards for this roadmap.")}</p>
                <p>{t("workspace.roadmap.aiGenerateHint", "Once generated, the roadmap opens directly in the fishbone flow so you can review each phase immediately.")}</p>
              </div>
            </section>
            <section className="space-y-4">
              {disableCreate ? (
                <p className="text-sm leading-6 text-amber-700">
                  {t("workspace.shell.roadmapCreateLocked", "Roadmap creation is locked until the workspace has active learning materials and roadmap access enabled.")}
                </p>
              ) : (
                <CreateRoadmapForm isDarkMode={false} onCreateRoadmap={createRoadmap} hasPrelearning={isStudyNewRoadmap} selectedMaterialCount={selectedSourceIds.length} selectedMaterialIds={selectedSourceIds} />
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main fishbone roadmap view ─── */
  return (
    <div className="h-full overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="mx-auto w-full max-w-[1720px] space-y-3 px-1 pb-4">
        {/* ─── Header ─── */}
        <section className="border-b border-slate-200/80 px-0 pb-3 sm:px-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <HomeButton />
                <h2 className={`min-w-0 text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px] ${fontClass}`}>
                  {roadmap.title || t("workspace.roadmap.title", "Roadmap")}
                </h2>
                <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600">
                  {i18n.language === "vi"
                    ? `${phases.length} giai đoạn`
                    : `${phases.length} phases`}
                </span>
              </div>
              {roadmapDescriptionText ? (
                <p
                  className="mt-2 max-w-[920px] overflow-hidden text-[13px] leading-6 text-slate-600"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={roadmapDescriptionText}
                >
                  {roadmapDescriptionText}
                </p>
              ) : null}
              {selectedPhaseIndex >= 0 ? (
                <p className="mt-1 text-[12px] font-medium text-slate-500">
                  {i18n.language === "vi"
                    ? `Đang xem giai đoạn ${selectedPhaseIndex + 1}`
                    : `Viewing phase ${selectedPhaseIndex + 1}`}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button type="button" variant="outline" onClick={refreshRoadmap} className="h-9 rounded-2xl px-3.5 text-sm">
                {isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                {t("common.refresh", "Refresh")}
              </Button>
              {onEditRoadmapConfig && (
                <Button type="button" variant="outline" onClick={onEditRoadmapConfig} className="h-9 rounded-2xl px-3.5 text-sm">
                  {t("workspace.roadmap.editConfigAction", "Edit")}
                </Button>
              )}
              {onShareRoadmap && (
                <Button type="button" variant="outline" onClick={() => onShareRoadmap(roadmap)} className="h-9 rounded-2xl px-3.5 text-sm" aria-label={t("workspace.shell.shareAria", "Share roadmap")}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("workspace.roadmap.share", "Chia sẻ")}
                </Button>
              )}
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => adjustZoom("out")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-slate-100"
                  aria-label={t("workspace.roadmap.canvas.zoomOut", "Zoom out")}
                  title={t("workspace.roadmap.canvas.zoomOut", "Zoom out")}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-9 text-center text-[11px] font-bold tabular-nums text-slate-600">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => adjustZoom("in")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-slate-100"
                  aria-label={t("workspace.roadmap.canvas.zoomIn", "Zoom in")}
                  title={t("workspace.roadmap.canvas.zoomIn", "Zoom in")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="mx-0.5 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={openFullscreen}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-all hover:bg-slate-100"
                  aria-label={t("workspace.roadmap.canvas.fullscreen", "Fullscreen")}
                  title={t("workspace.roadmap.canvas.fullscreen", "Fullscreen")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Fishbone wave area ─── */}
        <div className="relative">
          <FishboneWaveSection
            phases={phases}
            currentIndex={currentIndex}
            phaseStateMap={phaseStateMap}
            resolvedFocusedPhaseId={resolvedFocusedPhaseId}
            handlePhaseClick={handlePhaseClick}
            scrollContainerRef={scrollContainerRef}
            scrollBy={scrollBy}
            fontClass={fontClass}
            t={t}
            padLeft={mainLayout.padLeft}
            padRight={mainLayout.padRight}
            phaseGap={mainLayout.phaseGap}
            centerY={mainLayout.centerY}
            amplitude={mainLayout.amplitude}
            svgHeight={mainLayout.svgHeight}
            cardWidth={mainLayout.cardWidth}
            boneLength={mainLayout.boneLength}
            zoomLevel={zoomLevel}
          />
        </div>

        {/* ─── Phase detail panel ─── */}
        {selectedPhase && (
          <div ref={detailPanelRef} className="mt-8 scroll-mt-8 sm:mt-10">
            <PhaseDetailPanel
              key={`phase-detail-main-${selectedPhase.phaseId ?? "empty"}`}
              phase={selectedPhase}
              phaseIndex={selectedPhaseIndex}
              currentIndex={currentIndex}
              phaseStateMap={phaseStateMap}
              viewAllMode={viewAllModeByPhaseId.get(Number(selectedPhase.phaseId)) || false}
              onClose={closeDetail}
              onToggleViewMode={toggleViewMode}
              onCreatePreLearning={onCreatePhasePreLearning}
              onCreateKnowledge={onCreatePhaseKnowledge}
              onCreateKnowledgeQuiz={onCreateKnowledgeQuizForKnowledge}
              onViewQuiz={openQuiz}
              onEditQuiz={onEditQuiz ? editQuiz : null}
              onShareQuiz={onShareQuiz}
              generatingPreLearning={generatingPreLearningPhaseIds.includes(Number(selectedPhase.phaseId))}
              generatingKnowledge={generatingKnowledgePhaseIds.includes(Number(selectedPhase.phaseId))}
              generatingKnowledgeQuizKeys={generatingQuizKeysSet}
              knowledgeProgress={Number(progressTracking?.knowledgeProgressByPhaseId?.[Number(selectedPhase.phaseId)] ?? 0)}
              roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
              isStudyNewRoadmap={isStudyNewRoadmap}
              fontClass={fontClass}
              t={t}
            />
          </div>
        )}

        {/* Screen reader live region */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {generatingKnowledgePhaseIds.length > 0 ? `Generating knowledge for phase` : ""}
        </div>
      </div>

      {/* ═══ Fullscreen Popup Modal ═══ */}
      {isFullscreen && (
        <>
          <style>{`
            @keyframes fsBackdropIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fsBackdropOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes fsPanelIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @keyframes fsPanelOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.96); } }
          `}</style>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[130] bg-slate-950/60 backdrop-blur-[2px]"
            style={{ animation: isFullscreenClosing ? "fsBackdropOut 200ms ease-in forwards" : "fsBackdropIn 200ms ease-out" }}
            onClick={closeFullscreen}
          />
          {/* Fullscreen panel */}
          <div
            className="fixed inset-4 sm:inset-6 z-[140] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
            style={{ animation: isFullscreenClosing ? "fsPanelOut 200ms ease-in forwards" : "fsPanelIn 200ms ease-out" }}
          >
            {/* FS Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold text-slate-900 ${fontClass}`}>
                  {roadmap.title || t("workspace.roadmap.title", "Roadmap")}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustZoom("out")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                   aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-slate-500 tabular-nums w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => adjustZoom("in")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={closeFullscreen}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  aria-label="Exit fullscreen"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* FS Wave area — uses larger constants */}
            <div className="flex-1 overflow-y-auto p-4">
              <FishboneWaveSection
                phases={phases}
                currentIndex={currentIndex}
                phaseStateMap={phaseStateMap}
                resolvedFocusedPhaseId={resolvedFocusedPhaseId}
                handlePhaseClick={handlePhaseClick}
                scrollContainerRef={fsScrollContainerRef}
                scrollBy={fsScrollBy}
                fontClass={fontClass}
                t={t}
                padLeft={fullscreenLayout.padLeft}
                padRight={fullscreenLayout.padRight}
                phaseGap={fullscreenLayout.phaseGap}
                centerY={fullscreenLayout.centerY}
                amplitude={fullscreenLayout.amplitude}
                svgHeight={fullscreenLayout.svgHeight}
                cardWidth={fullscreenLayout.cardWidth}
                boneLength={fullscreenLayout.boneLength}
                zoomLevel={zoomLevel}
              />

              {/* FS Detail panel */}
              {selectedPhase && (
                <div ref={fsDetailPanelRef} className="mt-6 scroll-mt-6">
                  <PhaseDetailPanel
                    key={`phase-detail-fullscreen-${selectedPhase.phaseId ?? "empty"}`}
                    phase={selectedPhase}
                    phaseIndex={selectedPhaseIndex}
                    currentIndex={currentIndex}
                    phaseStateMap={phaseStateMap}
                    viewAllMode={viewAllModeByPhaseId.get(Number(selectedPhase.phaseId)) || false}
                    onClose={closeDetail}
                    onToggleViewMode={toggleViewMode}
                    onCreatePreLearning={onCreatePhasePreLearning}
                    onCreateKnowledge={onCreatePhaseKnowledge}
                    onCreateKnowledgeQuiz={onCreateKnowledgeQuizForKnowledge}
                    onViewQuiz={openQuiz}
                    onEditQuiz={onEditQuiz ? editQuiz : null}
                    onShareQuiz={onShareQuiz}
                    generatingPreLearning={generatingPreLearningPhaseIds.includes(Number(selectedPhase.phaseId))}
                    generatingKnowledge={generatingKnowledgePhaseIds.includes(Number(selectedPhase.phaseId))}
                    generatingKnowledgeQuizKeys={generatingQuizKeysSet}
                    knowledgeProgress={Number(progressTracking?.knowledgeProgressByPhaseId?.[Number(selectedPhase.phaseId)] ?? 0)}
                    roadmapPhaseGenerationProgress={roadmapPhaseGenerationProgress}
                    isStudyNewRoadmap={isStudyNewRoadmap}
                    fontClass={fontClass}
                    t={t}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RoadmapCanvasView;
