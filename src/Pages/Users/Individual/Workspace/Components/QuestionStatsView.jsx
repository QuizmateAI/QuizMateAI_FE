import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { getIndividualWorkspaceQuestionStats } from "@/api/WorkspaceAPI";

const ATTEMPT_MODES = [
  { value: "OFFICIAL", labelKey: "workspace.questionStats.modeOfficial" },
  { value: "PRACTICE", labelKey: "workspace.questionStats.modePractice" },
  { value: "ALL", labelKey: "workspace.questionStats.modeAll" },
];

const DIFFICULTY_KEYS = ["EASY", "MEDIUM", "HARD", "CUSTOM", "UNSPECIFIED"];
const BLOOM_ORDER = ["ANALYZE", "UNDERSTAND", "REMEMBER", "EVALUATE", "CREATE", "APPLY"];

const BLOOM_COLORS = {
  REMEMBER: {
    main: "#6366f1",
    bar: "bg-indigo-500",
    light: "bg-indigo-100 text-indigo-700",
    dark: "bg-indigo-950/50 text-indigo-300",
  },
  UNDERSTAND: {
    main: "#06b6d4",
    bar: "bg-cyan-500",
    light: "bg-cyan-100 text-cyan-700",
    dark: "bg-cyan-950/50 text-cyan-300",
  },
  APPLY: {
    main: "#22c55e",
    bar: "bg-emerald-500",
    light: "bg-emerald-100 text-emerald-700",
    dark: "bg-emerald-950/50 text-emerald-300",
  },
  ANALYZE: {
    main: "#f59e0b",
    bar: "bg-amber-500",
    light: "bg-amber-100 text-amber-700",
    dark: "bg-amber-950/50 text-amber-300",
  },
  EVALUATE: {
    main: "#ef4444",
    bar: "bg-red-500",
    light: "bg-red-100 text-red-700",
    dark: "bg-red-950/50 text-red-300",
  },
  CREATE: {
    main: "#a855f7",
    bar: "bg-fuchsia-500",
    light: "bg-fuchsia-100 text-fuchsia-700",
    dark: "bg-fuchsia-950/50 text-fuchsia-300",
  },
};

function pct(value, total) {
  if (!total || total <= 0) return 0;
  return Math.round((Number(value || 0) / total) * 100);
}

function fmtAccuracy(accuracy) {
  if (accuracy == null) return "0%";
  return `${Math.round(Number(accuracy) * 100)}%`;
}

function fmtNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

function panelClasses(isDarkMode) {
  return isDarkMode
    ? "border-slate-800/80 bg-slate-900/70 shadow-[0_24px_50px_rgba(2,6,23,0.28)]"
    : "border-slate-200/90 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.08)]";
}

function insetPanelClasses(isDarkMode) {
  return isDarkMode
    ? "border-slate-800/70 bg-slate-950/45"
    : "border-slate-200 bg-slate-50/80";
}

function mutedTextClasses(isDarkMode) {
  return isDarkMode ? "text-slate-400" : "text-slate-500";
}

function getAccuracyTone(pctValue, isDarkMode) {
  if (pctValue >= 70) {
    return {
      textClass: isDarkMode ? "text-emerald-300" : "text-emerald-600",
      softClass: isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-50 text-emerald-700",
      ringColor: isDarkMode ? "#34d399" : "#10b981",
      glowClass: isDarkMode ? "bg-emerald-400/10" : "bg-emerald-200/70",
      barClass: "bg-emerald-500",
    };
  }

  if (pctValue >= 40) {
    return {
      textClass: isDarkMode ? "text-amber-300" : "text-amber-600",
      softClass: isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-50 text-amber-700",
      ringColor: isDarkMode ? "#fbbf24" : "#f59e0b",
      glowClass: isDarkMode ? "bg-amber-400/10" : "bg-amber-200/70",
      barClass: "bg-amber-500",
    };
  }

  return {
    textClass: isDarkMode ? "text-rose-300" : "text-rose-600",
    softClass: isDarkMode ? "bg-rose-950/50 text-rose-300" : "bg-rose-50 text-rose-700",
    ringColor: isDarkMode ? "#fb7185" : "#ef4444",
    glowClass: isDarkMode ? "bg-rose-400/10" : "bg-rose-200/70",
    barClass: "bg-rose-500",
  };
}

function getDifficultyStyle(label, isDarkMode) {
  const normalized = String(label || "").toUpperCase();
  if (normalized === "EASY") return isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-100 text-emerald-700";
  if (normalized === "MEDIUM") return isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-100 text-amber-700";
  if (normalized === "HARD") return isDarkMode ? "bg-rose-950/50 text-rose-300" : "bg-rose-100 text-rose-700";
  return isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700";
}

function getBucketBadgeStyle(label, isDarkMode, bucketType) {
  const normalized = String(label || "").toUpperCase();

  if (bucketType === "difficulty" || DIFFICULTY_KEYS.includes(normalized)) {
    return getDifficultyStyle(normalized, isDarkMode);
  }

  const bloomMeta = BLOOM_COLORS[normalized];
  if (bloomMeta) {
    return isDarkMode ? bloomMeta.dark : bloomMeta.light;
  }

  return isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700";
}

function translateLabel(label, t, bucketType) {
  const upper = String(label || "").toUpperCase();
  if (bucketType === "difficulty" || DIFFICULTY_KEYS.includes(upper)) {
    const translated = t(`workspace.questionStats.difficulty.${upper}`, "");
    if (translated) return translated;
  }

  const bloomTranslated = t(`workspace.questionStats.bloom.${upper}`, "");
  if (bloomTranslated) return bloomTranslated;

  return label;
}

function getRenderableBloomBuckets(buckets = []) {
  const available = buckets.filter((bucket) => String(bucket?.label || "").toUpperCase() !== "UNSPECIFIED");
  const bucketMap = Object.fromEntries(
    available.map((bucket) => [String(bucket?.label || "").toUpperCase(), bucket]),
  );

  return BLOOM_ORDER.map((key) => bucketMap[key]).filter(Boolean);
}

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function ProgressBar({
  value,
  max,
  isDarkMode,
  barClassName = "bg-blue-500",
  trackClassName = "",
  className = "",
}) {
  const percent = max > 0 ? Math.min(100, Math.round((Number(value || 0) / max) * 100)) : 0;
  const resolvedTrackClass = trackClassName || (isDarkMode ? "bg-slate-800" : "bg-slate-100");

  return (
    <div className={`h-2.5 overflow-hidden rounded-full ${resolvedTrackClass} ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClassName}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ModeSwitcher({ attemptMode, onChange, isDarkMode, t, compact = false }) {
  return (
    <div className={`grid grid-cols-3 rounded-2xl border p-1 ${isDarkMode ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white/90"}`}>
      {ATTEMPT_MODES.map((mode) => {
        const active = mode.value === attemptMode;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`rounded-xl font-semibold transition-all ${
              active
                ? "bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]"
                : isDarkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
            } ${compact ? "px-2 py-2 text-[11px]" : "px-3 py-2 text-xs"}`}
            aria-pressed={active}
          >
            {t(mode.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  iconClassName,
  accentClassName,
  isDarkMode,
  compact = false,
}) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border ${compact ? "p-3.5" : "p-4"} ${insetPanelClasses(isDarkMode)}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClassName}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex items-center justify-center rounded-2xl ${compact ? "h-9 w-9" : "h-11 w-11"} ${iconClassName}`}>
            <Icon className={compact ? "h-4.5 w-4.5" : "h-5 w-5"} />
          </div>
          <p className={`font-semibold uppercase tracking-[0.16em] ${compact ? "mt-3 text-[10px]" : "mt-4 text-[11px]"} ${mutedTextClasses(isDarkMode)}`}>
            {label}
          </p>
          <p className={`${compact ? "mt-1 text-xl" : "mt-1 text-2xl"} font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
            {value}
          </p>
        </div>
        {subValue ? (
          <span className={`shrink-0 rounded-full ${compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"} font-semibold ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}>
            {subValue}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MetricBar({
  icon: Icon,
  label,
  value,
  total,
  barClassName,
  badgeClassName,
  iconClassName,
  isDarkMode,
}) {
  return (
    <div className={`rounded-2xl border p-4 ${insetPanelClasses(isDarkMode)}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{label}</p>
            <p className={`text-xs ${mutedTextClasses(isDarkMode)}`}>
              {fmtNumber(value)} / {fmtNumber(total)}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClassName}`}>
          {pct(value, total)}%
        </span>
      </div>

      <ProgressBar
        value={value}
        max={total}
        isDarkMode={isDarkMode}
        barClassName={barClassName}
        className="mt-3"
      />
    </div>
  );
}

function AccuracyRing({ accuracy, size = 148, strokeWidth = 12, isDarkMode, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pctValue = Math.round((accuracy ?? 0) * 100);
  const offset = circumference - (pctValue / 100) * circumference;
  const tone = getAccuracyTone(pctValue, isDarkMode);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className={`absolute inset-4 rounded-full blur-2xl ${tone.glowClass}`} />
      <svg width={size} height={size} className="relative -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDarkMode ? "#1e293b" : "#e2e8f0"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-3xl font-bold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>{pctValue}%</span>
        <span className={`mt-1 text-xs font-medium ${mutedTextClasses(isDarkMode)}`}>{label}</span>
      </div>
    </div>
  );
}

function RadarChart({ buckets, isDarkMode, t, compact = false }) {
  if (compact) {
    return <BloomPerformanceList buckets={buckets} isDarkMode={isDarkMode} t={t} />;
  }

  const filtered = getRenderableBloomBuckets(buckets);
  if (filtered.length < 3) return null;

  const size = 360;
  const center = size / 2;
  const maxRadius = 96;
  const levels = 5;
  const angleStep = 360 / filtered.length;
  const gridRings = Array.from({ length: levels }, (_, index) => (maxRadius / levels) * (index + 1));

  const gridPolygons = gridRings.map((radius) => (
    filtered
      .map((_, index) => {
        const point = polarToCartesian(center, center, radius, index * angleStep);
        return `${point.x},${point.y}`;
      })
      .join(" ")
  ));

  const dataPoints = filtered.map((bucket, index) => {
    const accuracyPct = Math.round((bucket?.accuracyInMode ?? 0) * 100);
    const radius = Math.max(2, (accuracyPct / 100) * maxRadius);
    return polarToCartesian(center, center, radius, index * angleStep);
  });

  const labels = filtered.map((bucket, index) => {
    const angle = index * angleStep;
    const point = polarToCartesian(center, center, maxRadius + 46, angle);
    const accuracyPct = Math.round((bucket?.accuracyInMode ?? 0) * 100);
    const key = String(bucket?.label || "").toUpperCase();
    const colorMeta = BLOOM_COLORS[key] || { main: "#94a3b8" };
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const textAnchor = normalizedAngle > 20 && normalizedAngle < 160
      ? "start"
      : normalizedAngle > 200 && normalizedAngle < 340
        ? "end"
        : "middle";

    return {
      key,
      label: translateLabel(bucket?.label, t, "bloom"),
      point,
      accuracyPct,
      color: colorMeta.main,
      textAnchor,
    };
  });

  return (
    <div className={`rounded-[28px] border p-5 md:p-6 ${panelClasses(isDarkMode)}`}>
      <div className="flex flex-col gap-1">
        <h3 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
          {t("workspace.questionStats.radarTitle")}
        </h3>
        <p className={`text-sm ${mutedTextClasses(isDarkMode)}`}>
          {t("workspace.questionStats.radarSubtitle")}
        </p>
      </div>

      <div className="mt-6 mx-auto aspect-square w-full max-w-[360px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          {gridPolygons.map((points, index) => (
            <polygon
              key={`grid-${points}`}
              points={points}
              fill="none"
              stroke={isDarkMode ? "#334155" : "#cbd5e1"}
              strokeWidth={0.8}
              opacity={index === gridPolygons.length - 1 ? 0.55 : 0.28}
            />
          ))}

          {filtered.map((_, index) => {
            const point = polarToCartesian(center, center, maxRadius, index * angleStep);
            return (
              <line
                key={`axis-${index}`}
                x1={center}
                y1={center}
                x2={point.x}
                y2={point.y}
                stroke={isDarkMode ? "#334155" : "#cbd5e1"}
                strokeWidth={0.8}
                opacity={0.4}
              />
            );
          })}

          <polygon
            points={dataPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            fill={isDarkMode ? "rgba(59,130,246,0.14)" : "rgba(59,130,246,0.10)"}
            stroke={isDarkMode ? "#60a5fa" : "#2563eb"}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {dataPoints.map((point, index) => (
            <circle
              key={`dot-${index}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={isDarkMode ? "#93c5fd" : "#2563eb"}
              stroke={isDarkMode ? "#0f172a" : "#ffffff"}
              strokeWidth={2}
            />
          ))}

          {labels.map((item) => (
            <g key={item.key}>
              <text
                x={item.point.x}
                y={item.point.y - 6}
                textAnchor={item.textAnchor}
                dominantBaseline="middle"
                style={{
                  fill: isDarkMode ? "#cbd5e1" : "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </text>
              <text
                x={item.point.x}
                y={item.point.y + 10}
                textAnchor={item.textAnchor}
                dominantBaseline="middle"
                style={{
                  fill: item.color,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.accuracyPct}%
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filtered.map((bucket) => {
          const key = String(bucket?.label || "").toUpperCase();
          const colorMeta = BLOOM_COLORS[key];

          return (
            <span
              key={key}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${isDarkMode ? "bg-slate-950/70 text-slate-200" : "bg-slate-100 text-slate-700"}`}
            >
              <span className={`h-2 w-2 rounded-full ${colorMeta?.bar || "bg-slate-400"}`} />
              {translateLabel(bucket?.label, t, "bloom")}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BloomPerformanceList({ buckets, isDarkMode, t }) {
  const rows = getRenderableBloomBuckets(buckets);
  if (rows.length === 0) return null;

  return (
    <div className={`rounded-[28px] border p-4 ${panelClasses(isDarkMode)}`}>
      <div className="flex flex-col gap-1">
        <h3 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
          {t("workspace.questionStats.radarTitle")}
        </h3>
        <p className={`text-sm ${mutedTextClasses(isDarkMode)}`}>
          {t("workspace.questionStats.radarSubtitle")}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((bucket) => {
          const key = String(bucket?.label || "").toUpperCase();
          const tone = BLOOM_COLORS[key];
          const accuracyPct = Math.round(Number(bucket?.accuracyInMode || 0) * 100);
          const total = Number(bucket?.totalWorkspaceQuestions || bucket?.totalAnsweredQuestionAttemptsInMode || 0);

          return (
            <div key={key} className={`rounded-2xl border p-4 ${insetPanelClasses(isDarkMode)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBucketBadgeStyle(key, isDarkMode, "bloom")}`}>
                    {translateLabel(bucket?.label, t, "bloom")}
                  </span>
                  <p className={`mt-3 text-sm ${mutedTextClasses(isDarkMode)}`}>
                    {fmtNumber(total)} {t("workspace.questionStats.total")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getAccuracyTone(accuracyPct, isDarkMode).softClass}`}>
                  {accuracyPct}%
                </span>
              </div>

              <ProgressBar
                value={accuracyPct}
                max={100}
                isDarkMode={isDarkMode}
                barClassName={tone?.bar || "bg-slate-400"}
                className="mt-4"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BucketTable({
  title,
  buckets,
  isDarkMode,
  t,
  isLifetime = false,
  bucketType = "difficulty",
  forceCardLayout = false,
}) {
  if (!Array.isArray(buckets) || buckets.length === 0) return null;

  const rows = buckets.map((bucket, index) => {
    const total = isLifetime ? bucket?.totalAnsweredQuestionAttemptsInMode : bucket?.totalWorkspaceQuestions;
    const correct = isLifetime ? bucket?.correctQuestionAttemptsInMode : bucket?.correctQuestionsInMode;
    const incorrect = isLifetime ? bucket?.incorrectQuestionAttemptsInMode : bucket?.incorrectQuestionsInMode;
    const accuracy = bucket?.accuracyInMode ?? 0;
    const accuracyPct = Math.round(Number(accuracy) * 100);

    return {
      key: bucket?.label || index,
      label: translateLabel(bucket?.label, t, bucketType),
      badgeClassName: getBucketBadgeStyle(bucket?.label, isDarkMode, bucketType),
      total: Number(total || 0),
      correct: Number(correct || 0),
      incorrect: Number(incorrect || 0),
      accuracy,
      accuracyPct,
      accuracyTone: getAccuracyTone(accuracyPct, isDarkMode),
    };
  });

  const showCardLayout = forceCardLayout;

  return (
    <div className={`rounded-[28px] border p-4 ${panelClasses(isDarkMode)}`}>
      <div className="flex items-center gap-3">
        <h4 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{title}</h4>
        <div className={`h-px flex-1 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />
      </div>

      <div className={`mt-4 space-y-3 ${showCardLayout ? "" : "md:hidden"}`}>
        {rows.map((row) => (
          <div key={row.key} className={`rounded-2xl border p-4 ${insetPanelClasses(isDarkMode)}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.badgeClassName}`}>
                {row.label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.accuracyTone.softClass}`}>
                {fmtAccuracy(row.accuracy)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClasses(isDarkMode)}`}>
                  {isLifetime ? t("workspace.questionStats.attempts") : t("workspace.questionStats.total")}
                </p>
                <p className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {fmtNumber(row.total)}
                </p>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.correct")}
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-500">{fmtNumber(row.correct)}</p>
              </div>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.incorrect")}
                </p>
                <p className="mt-1 text-lg font-semibold text-rose-500">{fmtNumber(row.incorrect)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-medium ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.accuracy")}
                </span>
                <span className={`text-sm font-semibold ${row.accuracyTone.textClass}`}>
                  {fmtAccuracy(row.accuracy)}
                </span>
              </div>
              <ProgressBar
                value={row.accuracyPct}
                max={100}
                isDarkMode={isDarkMode}
                barClassName={row.accuracyTone.barClass}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-4 overflow-x-auto ${showCardLayout ? "hidden" : "hidden md:block"}`}>
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
              <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.label")}</th>
              <th className="px-4 py-3 text-center font-semibold">
                {isLifetime ? t("workspace.questionStats.attempts") : t("workspace.questionStats.total")}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-emerald-500">
                {t("workspace.questionStats.correct")}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-rose-500">
                {t("workspace.questionStats.incorrect")}
              </th>
              <th className="px-4 py-3 text-right font-semibold">{t("workspace.questionStats.accuracy")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.key}
                className={`${index > 0 ? (isDarkMode ? "border-t border-slate-800/80" : "border-t border-slate-200") : ""} ${
                  isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"
                } transition-colors`}
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.badgeClassName}`}>
                    {row.label}
                  </span>
                </td>
                <td className={`px-4 py-3 text-center font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {fmtNumber(row.total)}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-emerald-500">
                  {fmtNumber(row.correct)}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-rose-500">
                  {fmtNumber(row.incorrect)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <ProgressBar
                      value={row.accuracyPct}
                      max={100}
                      isDarkMode={isDarkMode}
                      barClassName={row.accuracyTone.barClass}
                      className="hidden w-24 lg:block"
                    />
                    <span className={`font-semibold ${row.accuracyTone.textClass}`}>
                      {fmtAccuracy(row.accuracy)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatePanel({ icon: Icon, message, isDarkMode, iconClassName, action = null, spinning = false }) {
  return (
    <div className="flex min-h-full items-center justify-center p-4 md:p-5 xl:p-6">
      <div className={`flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-[28px] border px-6 py-12 text-center ${panelClasses(isDarkMode)}`}>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          <Icon className={`h-7 w-7 ${iconClassName} ${spinning ? "animate-spin" : ""}`} />
        </div>
        <p className={`text-sm ${mutedTextClasses(isDarkMode)}`}>{message}</p>
        {action}
      </div>
    </div>
  );
}

export default function QuestionStatsView({ workspaceId, isDarkMode = false }) {
  const { t } = useTranslation();
  const containerRef = React.useRef(null);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptMode, setAttemptMode] = useState("OFFICIAL");
  const [containerWidth, setContainerWidth] = useState(0);

  const fetchStats = useCallback(async (mode) => {
    if (!workspaceId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getIndividualWorkspaceQuestionStats(workspaceId, mode);
      const data = response?.data?.data ?? response?.data ?? response ?? null;
      setStats(data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("workspace.questionStats.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchStats(attemptMode);
  }, [attemptMode, fetchStats, workspaceId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setContainerWidth(element.clientWidth || 0);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <StatePanel
        icon={Loader2}
        message={t("workspace.questionStats.loading")}
        isDarkMode={isDarkMode}
        iconClassName={isDarkMode ? "text-slate-300" : "text-slate-500"}
        spinning
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        icon={AlertCircle}
        message={error}
        isDarkMode={isDarkMode}
        iconClassName="text-rose-500"
        action={(
          <button
            type="button"
            onClick={() => fetchStats(attemptMode)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            {t("workspace.questionStats.retry")}
          </button>
        )}
      />
    );
  }

  const current = stats?.currentQuestionStats;
  const lifetime = stats?.lifetimeQuestionAttemptStats;

  if (!stats || !current) {
    return (
      <StatePanel
        icon={BarChart3}
        message={t("workspace.questionStats.noData")}
        isDarkMode={isDarkMode}
        iconClassName={isDarkMode ? "text-slate-500" : "text-slate-400"}
      />
    );
  }

  const selectedModeLabel = ATTEMPT_MODES.find((mode) => mode.value === attemptMode)?.labelKey || ATTEMPT_MODES[0].labelKey;
  const totalQuestions = Number(current?.totalWorkspaceQuestions || 0);
  const attemptedQuestions = Number(current?.attemptedQuestionsInMode || 0);
  const correctQuestions = Number(current?.correctQuestionsInMode || 0);
  const incorrectQuestions = Number(current?.incorrectQuestionsInMode || 0);
  const pendingQuestions = Number(current?.pendingQuestionsInMode || 0);
  const attemptedPercent = pct(attemptedQuestions, totalQuestions);
  const hasRadar = getRenderableBloomBuckets(current?.byBloom).length >= 3;
  const isDense = containerWidth > 0 && containerWidth < 760;
  const isUltraCompact = containerWidth > 0 && containerWidth < 560;
  const contentPaddingClass = isUltraCompact ? "space-y-3 p-3" : "space-y-4 p-4";
  const summaryGridClass = isUltraCompact ? "grid-cols-1" : "grid-cols-2";

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className={contentPaddingClass}>
        <div className={`rounded-[28px] border ${isUltraCompact ? "p-4" : "p-5"} ${panelClasses(isDarkMode)}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${isDarkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`${isUltraCompact ? "text-lg" : "text-xl"} font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {t("workspace.questionStats.title")}
                  </h2>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                    {t(selectedModeLabel)}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>{stats?.workspaceName}</p>
              </div>
            </div>

            <ModeSwitcher
              attemptMode={attemptMode}
              onChange={setAttemptMode}
              isDarkMode={isDarkMode}
              t={t}
              compact={isUltraCompact}
            />
          </div>
        </div>

        <div className={`grid gap-3 ${summaryGridClass}`}>
          <StatCard
            icon={Target}
            label={t("workspace.questionStats.totalQuestions")}
            value={fmtNumber(totalQuestions)}
            subValue={t(selectedModeLabel)}
            iconClassName={isDarkMode ? "bg-blue-950/50 text-blue-300" : "bg-blue-100 text-blue-600"}
            accentClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
            isDarkMode={isDarkMode}
            compact
          />
          <StatCard
            icon={CheckCircle2}
            label={t("workspace.questionStats.attempted")}
            value={fmtNumber(attemptedQuestions)}
            subValue={`${attemptedPercent}%`}
            iconClassName={isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-100 text-emerald-600"}
            accentClassName="bg-emerald-500"
            isDarkMode={isDarkMode}
            compact
          />
          <StatCard
            icon={TrendingUp}
            label={t("workspace.questionStats.accuracyLabel")}
            value={fmtAccuracy(current?.accuracyInMode)}
            iconClassName={isDarkMode ? "bg-fuchsia-950/50 text-fuchsia-300" : "bg-fuchsia-100 text-fuchsia-600"}
            accentClassName="bg-fuchsia-500"
            isDarkMode={isDarkMode}
            compact
          />
          <StatCard
            icon={Clock}
            label={t("workspace.questionStats.pendingGrading")}
            value={fmtNumber(pendingQuestions)}
            subValue={`${pct(pendingQuestions, totalQuestions)}%`}
            iconClassName={isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-100 text-amber-600"}
            accentClassName="bg-amber-500"
            isDarkMode={isDarkMode}
            compact
          />
        </div>

        <div className={`rounded-[28px] border ${isUltraCompact ? "p-4" : "p-5"} ${panelClasses(isDarkMode)}`}>
          <div className={`flex ${isDense ? "flex-col" : "items-center"} gap-5`}>
            <div className={`flex ${isUltraCompact ? "flex-col items-start" : "items-center"} gap-4`}>
              <AccuracyRing
                accuracy={current?.accuracyInMode}
                isDarkMode={isDarkMode}
                label={t("workspace.questionStats.accuracy")}
                size={isUltraCompact ? 112 : 120}
                strokeWidth={10}
              />
              <div className="space-y-3">
                <div>
                  <p className={`text-sm font-medium ${mutedTextClasses(isDarkMode)}`}>
                    {t("workspace.questionStats.progress")}
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className={`${isUltraCompact ? "text-3xl" : "text-4xl"} font-bold leading-none ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                      {fmtNumber(attemptedQuestions)}
                    </span>
                    <span className={`pb-1 text-base font-medium ${mutedTextClasses(isDarkMode)}`}>
                      / {fmtNumber(totalQuestions)}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                  {attemptedPercent}% {t("workspace.questionStats.attempted")}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <ProgressBar
                value={attemptedQuestions}
                max={totalQuestions}
                isDarkMode={isDarkMode}
                barClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
                className="h-3"
              />

              <div className="space-y-3">
                <MetricBar
                  icon={CheckCircle2}
                  label={t("workspace.questionStats.correct")}
                  value={correctQuestions}
                  total={totalQuestions}
                  iconClassName={isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-100 text-emerald-600"}
                  badgeClassName={isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-50 text-emerald-700"}
                  barClassName="bg-emerald-500"
                  isDarkMode={isDarkMode}
                />
                <MetricBar
                  icon={XCircle}
                  label={t("workspace.questionStats.incorrect")}
                  value={incorrectQuestions}
                  total={totalQuestions}
                  iconClassName={isDarkMode ? "bg-rose-950/50 text-rose-300" : "bg-rose-100 text-rose-600"}
                  badgeClassName={isDarkMode ? "bg-rose-950/50 text-rose-300" : "bg-rose-50 text-rose-700"}
                  barClassName="bg-rose-500"
                  isDarkMode={isDarkMode}
                />
                <MetricBar
                  icon={Clock}
                  label={t("workspace.questionStats.pending")}
                  value={pendingQuestions}
                  total={totalQuestions}
                  iconClassName={isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-100 text-amber-600"}
                  badgeClassName={isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-50 text-amber-700"}
                  barClassName="bg-amber-500"
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>
        </div>

        {hasRadar ? (
          <RadarChart buckets={current?.byBloom} isDarkMode={isDarkMode} t={t} compact />
        ) : null}

        <section className="space-y-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              {t("workspace.questionStats.currentStatsTitle")}
            </h3>
            <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
              {t("workspace.questionStats.currentStatsDesc")}
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1">
            <BucketTable
              title={t("workspace.questionStats.byDifficulty")}
              buckets={current?.byDifficulty}
              isDarkMode={isDarkMode}
              t={t}
              bucketType="difficulty"
              forceCardLayout
            />
            <BucketTable
              title={t("workspace.questionStats.byBloom")}
              buckets={current?.byBloom}
              isDarkMode={isDarkMode}
              t={t}
              bucketType="bloom"
              forceCardLayout
            />
          </div>
        </section>

        {lifetime ? (
          <section className="space-y-4">
            <div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                {t("workspace.questionStats.lifetimeStatsTitle")}
              </h3>
              <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
                {t("workspace.questionStats.lifetimeStatsDesc")}
              </p>
            </div>

            <div className={`grid gap-3 ${isUltraCompact ? "grid-cols-1" : "grid-cols-2"}`}>
              <StatCard
                icon={BarChart3}
                label={t("workspace.questionStats.totalAttempts")}
                value={fmtNumber(lifetime?.totalQuestionAttempts)}
                iconClassName={isDarkMode ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100 text-indigo-600"}
                accentClassName="bg-indigo-500"
                isDarkMode={isDarkMode}
                compact
              />
              <StatCard
                icon={TrendingUp}
                label={t("workspace.questionStats.lifetimeAccuracy")}
                value={fmtAccuracy(lifetime?.accuracy)}
                iconClassName={isDarkMode ? "bg-teal-950/50 text-teal-300" : "bg-teal-100 text-teal-600"}
                accentClassName="bg-teal-500"
                isDarkMode={isDarkMode}
                compact
              />
            </div>

            <div className="grid gap-4 grid-cols-1">
              <BucketTable
                title={t("workspace.questionStats.byDifficulty")}
                buckets={lifetime?.byDifficulty}
                isDarkMode={isDarkMode}
                t={t}
                isLifetime
                bucketType="difficulty"
                forceCardLayout
              />
              <BucketTable
                title={t("workspace.questionStats.byBloom")}
                buckets={lifetime?.byBloom}
                isDarkMode={isDarkMode}
                t={t}
                isLifetime
                bucketType="bloom"
                forceCardLayout
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
