import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getIndividualWorkspaceQuestionStats,
  getIndividualWorkspaceQuizStats,
} from "@/api/WorkspaceAPI";

const ATTEMPT_MODES = [
  { value: "OFFICIAL", labelKey: "workspace.questionStats.modeOfficial" },
  { value: "PRACTICE", labelKey: "workspace.questionStats.modePractice" },
  { value: "ALL", labelKey: "workspace.questionStats.modeAll" },
];

const SURFACE_OPTIONS = [
  {
    value: "QUESTION",
    titleKey: "workspace.questionStats.viewQuestion",
    descKey: "workspace.questionStats.viewQuestionDesc",
    icon: BarChart3,
  },
  {
    value: "QUIZ",
    titleKey: "workspace.questionStats.viewQuiz",
    descKey: "workspace.questionStats.viewQuizDesc",
    icon: ClipboardList,
  },
];

const DIFFICULTY_KEYS = ["EASY", "MEDIUM", "HARD", "CUSTOM", "UNSPECIFIED"];
const BLOOM_ORDER = ["ANALYZE", "UNDERSTAND", "REMEMBER", "EVALUATE", "CREATE", "APPLY"];

const BLOOM_COLORS = {
  REMEMBER: { main: "#6366f1" },
  UNDERSTAND: { main: "#06b6d4" },
  APPLY: { main: "#22c55e" },
  ANALYZE: { main: "#f59e0b" },
  EVALUATE: { main: "#ef4444" },
  CREATE: { main: "#a855f7" },
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

function fmtScore(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function fmtSeconds(value, t) {
  const totalSeconds = Math.round(Number(value || 0));
  if (!totalSeconds) return t("workspace.questionStats.noDuration");

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function fmtDateTime(value, locale = "vi-VN") {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      ringColor: isDarkMode ? "#34d399" : "#10b981",
      glowClass: isDarkMode ? "bg-emerald-400/10" : "bg-emerald-200/70",
    };
  }
  if (pctValue >= 40) {
    return {
      textClass: isDarkMode ? "text-amber-300" : "text-amber-600",
      ringColor: isDarkMode ? "#fbbf24" : "#f59e0b",
      glowClass: isDarkMode ? "bg-amber-400/10" : "bg-amber-200/70",
    };
  }
  return {
    textClass: isDarkMode ? "text-rose-300" : "text-rose-600",
    ringColor: isDarkMode ? "#fb7185" : "#ef4444",
    glowClass: isDarkMode ? "bg-rose-400/10" : "bg-rose-200/70",
  };
}

function translateLabel(label, t, bucketType) {
  const upper = String(label || "").toUpperCase();
  if (bucketType === "difficulty" || DIFFICULTY_KEYS.includes(upper)) {
    const translated = t(`workspace.questionStats.difficulty.${upper}`, "");
    if (translated) return translated;
  }
  const bloomTranslated = t(`workspace.questionStats.bloom.${upper}`, "");
  if (bloomTranslated) return bloomTranslated;
  return label || t("workspace.questionStats.unknown");
}

function getRenderableBloomBuckets(buckets = []) {
  const available = buckets.filter((bucket) => String(bucket?.label || "").toUpperCase() !== "UNSPECIFIED");
  const bucketMap = Object.fromEntries(available.map((bucket) => [String(bucket?.label || "").toUpperCase(), bucket]));
  return BLOOM_ORDER.map((key) => bucketMap[key]).filter(Boolean);
}

function getQuestionBucketAttemptCount(bucket) {
  return Number(bucket?.attemptedQuestionsInMode ?? bucket?.gradedQuestionsInMode ?? 0);
}

function getQuestionBucketAccuracy(bucket) {
  return Number(bucket?.accuracyInMode ?? 0);
}

function pickQuestionInsightBucket(buckets = [], type = "best") {
  const candidates = buckets.filter((bucket) => getQuestionBucketAttemptCount(bucket) > 0);
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((left, right) => {
    const accuracyDiff = getQuestionBucketAccuracy(right) - getQuestionBucketAccuracy(left);
    if (Math.abs(accuracyDiff) > 0.0001) return accuracyDiff;
    return getQuestionBucketAttemptCount(right) - getQuestionBucketAttemptCount(left);
  });

  return type === "worst" ? sorted[sorted.length - 1] : sorted[0];
}

function pickQuizInsightItem(items = [], type = "best") {
  const candidates = items.filter((item) => Number(item?.totalAttempts || 0) > 0);
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((left, right) => {
    const accuracyDiff = Number(right?.averageAccuracy ?? 0) - Number(left?.averageAccuracy ?? 0);
    if (Math.abs(accuracyDiff) > 0.0001) return accuracyDiff;
    const scoreDiff = Number(right?.averageScore ?? 0) - Number(left?.averageScore ?? 0);
    if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
    return Number(right?.totalAttempts ?? 0) - Number(left?.totalAttempts ?? 0);
  });

  return type === "worst" ? sorted[sorted.length - 1] : sorted[0];
}

function hasQuestionStatsData(stats) {
  if (!stats) return false;

  const current = stats.currentQuestionStats;
  const lifetime = stats.lifetimeQuestionAttemptStats;

  const attemptedQuestions = Number(current?.attemptedQuestionsInMode || 0);
  const gradedQuestions = Number(current?.gradedQuestionsInMode || 0);
  const totalQuestionAttempts = Number(lifetime?.totalQuestionAttempts ?? lifetime?.totalAttempts ?? 0);

  return attemptedQuestions > 0 || gradedQuestions > 0 || totalQuestionAttempts > 0;
}

function hasQuizStatsData(stats) {
  if (!stats) return false;

  const current = stats.currentQuizStats;
  const lifetime = stats.lifetimeQuizAttemptStats;

  const attemptedQuizzes = Number(current?.attemptedQuizzesInMode || 0);
  const totalQuizAttempts = Number(lifetime?.totalQuizAttempts || 0);

  return attemptedQuizzes > 0 || totalQuizAttempts > 0;
}

function chartColors(isDarkMode) {
  return {
    grid: isDarkMode ? "#334155" : "#e2e8f0",
    axis: isDarkMode ? "#94a3b8" : "#64748b",
    tooltipBg: isDarkMode ? "#1e293b" : "#ffffff",
    tooltipBorder: isDarkMode ? "#334155" : "#e2e8f0",
    tooltipText: isDarkMode ? "#e2e8f0" : "#1e293b",
  };
}

function ProgressBar({ value, max, isDarkMode, barClassName = "bg-blue-500", trackClassName = "", className = "" }) {
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

function ModeSwitcher({ attemptMode, onChange, isDarkMode, t, compact = false, modes = ATTEMPT_MODES }) {
  if (!Array.isArray(modes) || modes.length <= 1) return null;

  return (
    <div
      className={`grid rounded-2xl border p-1 ${isDarkMode ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white/90"}`}
      style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
    >
      {modes.map((mode) => {
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

function SurfaceSwitcher({ surface, onChange, isDarkMode, t }) {
  return (
    <div className={`grid gap-2 rounded-[24px] border p-2 ${isDarkMode ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/90"} md:grid-cols-2`}>
      {SURFACE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = surface === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
              active
                ? isDarkMode
                  ? "border-blue-500/60 bg-blue-500/15"
                  : "border-blue-200 bg-blue-50"
                : isDarkMode
                  ? "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                  : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                active
                  ? isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"
                  : isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                  {t(option.titleKey)}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${mutedTextClasses(isDarkMode)}`}>
                  {t(option.descKey)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, iconClassName, accentClassName, isDarkMode, compact = false, muted = false }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] border ${compact ? "p-3.5" : "p-4"} ${insetPanelClasses(isDarkMode)}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClassName}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex items-center justify-center rounded-2xl ${compact ? "h-9 w-9" : "h-11 w-11"} ${iconClassName} ${muted ? "opacity-50" : ""}`}>
            <Icon className={compact ? "h-4.5 w-4.5" : "h-5 w-5"} />
          </div>
          <p className={`font-semibold uppercase tracking-[0.16em] ${compact ? "mt-3 text-[10px]" : "mt-4 text-[11px]"} ${mutedTextClasses(isDarkMode)}`}>
            {label}
          </p>
          <p className={`${compact ? "mt-1 text-xl" : "mt-1 text-2xl"} font-semibold ${muted ? mutedTextClasses(isDarkMode) : isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={isDarkMode ? "#1e293b" : "#e2e8f0"} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={tone.ringColor} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-3xl font-bold ${tone.textClass}`}>{pctValue}%</span>
        <span className={`mt-1 text-xs font-medium ${mutedTextClasses(isDarkMode)}`}>{label}</span>
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

function tooltipStyle(colors) {
  return {
    contentStyle: {
      background: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      color: colors.tooltipText,
      borderRadius: "12px",
      fontSize: "12px",
      padding: "6px 12px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.12)",
    },
    itemStyle: { color: colors.tooltipText },
    labelStyle: { fontWeight: 600, color: colors.tooltipText, marginBottom: "2px" },
  };
}

function AccuracyDonutChart({ correct, incorrect, pending, isDarkMode, t }) {
  const total = correct + incorrect + pending;
  if (total === 0) return null;

  const colors = chartColors(isDarkMode);
  const ts = tooltipStyle(colors);
  const data = [
    { name: t("workspace.questionStats.correct"), value: correct, fill: "#22c55e" },
    { name: t("workspace.questionStats.incorrect"), value: incorrect, fill: "#ef4444" },
    ...(pending > 0 ? [{ name: t("workspace.questionStats.pending"), value: pending, fill: "#f59e0b" }] : []),
  ].filter((item) => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} innerRadius={52} outerRadius={76} paddingAngle={2} dataKey="value" strokeWidth={0}>
          {data.map((entry, index) => (
            <Cell key={`question-donut-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip {...ts} formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DifficultyBarChart({ buckets, isDarkMode, t, isLifetime = false }) {
  if (!Array.isArray(buckets) || buckets.length === 0) return null;

  const colors = chartColors(isDarkMode);
  const ts = tooltipStyle(colors);
  const data = buckets
    .filter((bucket) => String(bucket?.label || "").toUpperCase() !== "UNSPECIFIED")
    .map((bucket) => ({
      label: translateLabel(bucket?.label, t, "difficulty"),
      correct: isLifetime ? Number(bucket?.correctQuestionAttemptsInMode || 0) : Number(bucket?.correctQuestionsInMode || 0),
      incorrect: isLifetime ? Number(bucket?.incorrectQuestionAttemptsInMode || 0) : Number(bucket?.incorrectQuestionsInMode || 0),
    }));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip {...ts} cursor={{ fill: isDarkMode ? "#ffffff06" : "#00000006" }} />
        <Bar dataKey="correct" name={t("workspace.questionStats.correct")} fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="incorrect" name={t("workspace.questionStats.incorrect")} fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BloomRadarChart({ buckets, isDarkMode, t }) {
  const filtered = getRenderableBloomBuckets(buckets);
  if (filtered.length < 3) return null;

  const colors = chartColors(isDarkMode);
  const ts = tooltipStyle(colors);
  const data = filtered.map((bucket) => ({
    subject: translateLabel(bucket?.label, t, "bloom"),
    accuracy: Math.round((bucket?.accuracyInMode ?? 0) * 100),
    fullMark: 100,
  }));

  return (
    <div className={`rounded-[28px] border p-5 ${panelClasses(isDarkMode)}`}>
      <h3 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
        {t("workspace.questionStats.radarTitle")}
      </h3>
      <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
        {t("workspace.questionStats.radarSubtitle")}
      </p>
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke={colors.grid} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: colors.axis, fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: colors.axis, fontSize: 10 }} tickCount={4} />
            <Radar dataKey="accuracy" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
            <Tooltip {...ts} formatter={(value) => [`${value}%`, t("workspace.questionStats.accuracy")]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BloomAccuracyBarChart({ buckets, isDarkMode, t }) {
  const rows = getRenderableBloomBuckets(buckets);
  if (rows.length === 0) return null;

  const colors = chartColors(isDarkMode);
  const ts = tooltipStyle(colors);
  const data = rows.map((bucket) => {
    const key = String(bucket?.label || "").toUpperCase();
    return {
      label: translateLabel(bucket?.label, t, "bloom"),
      accuracy: Math.round((bucket?.accuracyInMode ?? 0) * 100),
      fill: BLOOM_COLORS[key]?.main || "#6366f1",
    };
  });

  const chartHeight = Math.max(200, rows.length * 52);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={76} />
        <Tooltip {...ts} cursor={{ fill: isDarkMode ? "#ffffff06" : "#00000006" }} formatter={(value) => [`${value}%`, t("workspace.questionStats.accuracy")]} />
        <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`bloom-bar-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MetricAverageBarChart({ buckets, isDarkMode, t, titleKey, bucketType = "default" }) {
  if (!Array.isArray(buckets) || buckets.length === 0) return null;

  const colors = chartColors(isDarkMode);
  const ts = tooltipStyle(colors);
  const data = buckets
    .filter((bucket) => Number(bucket?.distinctQuizCount || bucket?.totalQuizAttempts || 0) > 0)
    .map((bucket) => ({
      label: bucketType === "difficulty"
        ? translateLabel(bucket?.label, t, "difficulty")
        : bucket?.label || t("workspace.questionStats.unknown"),
      accuracy: Math.round((bucket?.averageAccuracy ?? 0) * 100),
    }));

  if (data.length === 0) return null;

  return (
    <ChartSection title={t(titleKey)} isDarkMode={isDarkMode}>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 54)}>
        <BarChart data={data} layout="vertical" barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
          <YAxis type="category" dataKey="label" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={92} />
          <Tooltip {...ts} cursor={{ fill: isDarkMode ? "#ffffff06" : "#00000006" }} formatter={(value) => [`${value}%`, t("workspace.questionStats.accuracy")]} />
          <Bar dataKey="accuracy" fill="#3b82f6" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartSection>
  );
}

function WelcomeCard({ isDarkMode, t, onDismiss }) {
  return (
    <div className={`rounded-[24px] border px-5 py-4 ${isDarkMode ? "border-blue-900/50 bg-blue-950/20" : "border-blue-200 bg-blue-50/70"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-800"}`}>
            {t("workspace.questionStats.welcomeTitle")}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${isDarkMode ? "text-blue-300/80" : "text-blue-700/80"}`}>
            {t("workspace.questionStats.welcomeDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${isDarkMode ? "text-blue-400 hover:bg-blue-900/40" : "text-blue-400 hover:bg-blue-100"}`}
          aria-label={t("workspace.questionStats.welcomeDismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ChartSection({ title, subtitle, isDarkMode, children }) {
  return (
    <div className={`rounded-[28px] border p-4 ${panelClasses(isDarkMode)}`}>
      <div className="mb-4 flex items-center gap-3">
        <h4 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{title}</h4>
        <div className={`h-px flex-1 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />
      </div>
      {subtitle ? <p className={`-mt-2 mb-4 text-sm ${mutedTextClasses(isDarkMode)}`}>{subtitle}</p> : null}
      {children}
    </div>
  );
}

function QuizPerformanceTable({ items, isDarkMode, t, locale }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <ChartSection
      title={t("workspace.questionStats.quizLeaderboardTitle")}
      subtitle={t("workspace.questionStats.quizLeaderboardDesc")}
      isDarkMode={isDarkMode}
    >
      <div className={`overflow-hidden rounded-[22px] border ${insetPanelClasses(isDarkMode)}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800/70">
            <thead className={isDarkMode ? "bg-slate-950/70 text-slate-300" : "bg-slate-100/80 text-slate-600"}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.quizName")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.attempts")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.accuracy")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.avgTimePerQuiz")}</th>
                <th className="px-4 py-3 text-left font-semibold">{t("workspace.questionStats.latestAttempt")}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/70 text-slate-100" : "divide-slate-200/70 text-slate-800"}`}>
              {items.map((item) => (
                <tr key={`${item?.quizId}-${item?.quizTitle}`} className={isDarkMode ? "bg-slate-950/20" : "bg-white/70"}>
                  <td className="px-4 py-3">
                    <div className="min-w-[220px]">
                      <p className="font-medium">{item?.quizTitle || t("workspace.questionStats.unknown")}</p>
                      <p className={`mt-1 text-xs ${mutedTextClasses(isDarkMode)}`}>
                        {item?.quizType || t("workspace.questionStats.unknown")}
                        {" • "}
                        {translateLabel(item?.difficulty, t, "difficulty")}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{fmtNumber(item?.totalAttempts)}</td>
                  <td className="px-4 py-3">{fmtAccuracy(item?.averageAccuracy)}</td>
                  <td className="px-4 py-3">{fmtSeconds(item?.averageDurationSeconds, t)}</td>
                  <td className={`px-4 py-3 text-xs ${mutedTextClasses(isDarkMode)}`}>{fmtDateTime(item?.latestCompletedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ChartSection>
  );
}

function InsightCard({ title, value, description, isDarkMode, tone = "blue" }) {
  const toneMap = {
    blue: isDarkMode ? "border-blue-900/40 bg-blue-950/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-800",
    emerald: isDarkMode ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: isDarkMode ? "border-amber-900/40 bg-amber-950/20 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-[24px] border p-4 ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p>
    </div>
  );
}

function QuestionStatsContent({ lifetime, current, isDarkMode, t, containerWidth, welcomeDismissed, onDismissWelcome, selectedModeLabel }) {
  const totalQuestions = Number(current?.totalWorkspaceQuestions || 0);
  const attemptedQuestions = Number(current?.attemptedQuestionsInMode || 0);
  const gradedQuestions = Number(current?.gradedQuestionsInMode || 0);
  const correctQuestions = Number(current?.correctQuestionsInMode || 0);
  const incorrectQuestions = Number(current?.incorrectQuestionsInMode || 0);
  const pendingQuestions = Number(current?.pendingQuestionsInMode || 0);
  const untouchedQuestions = Math.max(0, totalQuestions - attemptedQuestions);
  const attemptedPercent = pct(attemptedQuestions, totalQuestions);
  const hasBloomRadar = getRenderableBloomBuckets(current?.byBloom).length >= 3;
  const isUltraCompact = containerWidth > 0 && containerWidth < 560;
  const isDense = containerWidth > 0 && containerWidth < 760;
  const summaryGridClass = isDense ? "grid-cols-2" : "grid-cols-3";
  const totalAttempts = Number(lifetime?.totalQuestionAttempts ?? lifetime?.totalAttempts ?? 0);
  const showWelcome = !welcomeDismissed && totalAttempts <= 5;
  const strongestDifficulty = pickQuestionInsightBucket(current?.byDifficulty, "best");
  const weakestDifficulty = pickQuestionInsightBucket(current?.byDifficulty, "worst");

  return (
    <>
      {showWelcome ? <WelcomeCard isDarkMode={isDarkMode} t={t} onDismiss={onDismissWelcome} /> : null}

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
          icon={BookOpen}
          label={t("workspace.questionStats.graded")}
          value={fmtNumber(gradedQuestions)}
          iconClassName={isDarkMode ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100 text-indigo-600"}
          accentClassName="bg-indigo-500"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={Scale}
          label={t("workspace.questionStats.correct")}
          value={fmtNumber(correctQuestions)}
          iconClassName={isDarkMode ? "bg-teal-950/50 text-teal-300" : "bg-teal-100 text-teal-600"}
          accentClassName="bg-teal-500"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={Clock}
          label={t("workspace.questionStats.untouched")}
          value={fmtNumber(untouchedQuestions)}
          iconClassName={isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}
          accentClassName={isDarkMode ? "bg-slate-600" : "bg-slate-400"}
          isDarkMode={isDarkMode}
          compact
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <InsightCard
          title={t("workspace.questionStats.strongArea")}
          value={strongestDifficulty ? translateLabel(strongestDifficulty.label, t, "difficulty") : t("workspace.questionStats.notEnoughData")}
          description={strongestDifficulty
            ? `${fmtAccuracy(strongestDifficulty.accuracyInMode)} • ${fmtNumber(strongestDifficulty.attemptedQuestionsInMode)} ${t("workspace.questionStats.attempted").toLowerCase()}`
            : t("workspace.questionStats.strongAreaDesc")}
          isDarkMode={isDarkMode}
          tone="emerald"
        />
        <InsightCard
          title={t("workspace.questionStats.needsFocus")}
          value={weakestDifficulty ? translateLabel(weakestDifficulty.label, t, "difficulty") : t("workspace.questionStats.notEnoughData")}
          description={weakestDifficulty
            ? `${fmtAccuracy(weakestDifficulty.accuracyInMode)} • ${fmtNumber(weakestDifficulty.attemptedQuestionsInMode)} ${t("workspace.questionStats.attempted").toLowerCase()}`
            : t("workspace.questionStats.needsFocusDesc")}
          isDarkMode={isDarkMode}
          tone="amber"
        />
      </div>

      <div className={`rounded-[28px] border ${isUltraCompact ? "p-4" : "p-5"} ${panelClasses(isDarkMode)}`}>
        <div className={`flex ${isUltraCompact ? "flex-col" : "items-start"} gap-6`}>
          <div className="flex shrink-0 flex-col items-center gap-3">
            <AccuracyRing
              accuracy={current?.accuracyInMode}
              isDarkMode={isDarkMode}
              label={t("workspace.questionStats.accuracy")}
              size={isUltraCompact ? 108 : 120}
              strokeWidth={10}
            />
            <div className="text-center">
              <div className="flex items-end justify-center gap-2">
                <span className={`${isUltraCompact ? "text-2xl" : "text-3xl"} font-bold leading-none ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {fmtNumber(attemptedQuestions)}
                </span>
                <span className={`pb-0.5 text-sm font-medium ${mutedTextClasses(isDarkMode)}`}>
                  /
                  {" "}
                  {fmtNumber(totalQuestions)}
                </span>
              </div>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-blue-950/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                {attemptedPercent}% {t("workspace.questionStats.attempted")}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className={`mb-1 text-sm font-medium ${mutedTextClasses(isDarkMode)}`}>
              {t("workspace.questionStats.progress")}
            </p>
            <ProgressBar
              value={attemptedQuestions}
              max={totalQuestions}
              isDarkMode={isDarkMode}
              barClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
              className="mb-4 h-3"
            />
            <AccuracyDonutChart correct={correctQuestions} incorrect={incorrectQuestions} pending={pendingQuestions} isDarkMode={isDarkMode} t={t} />
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                {t("workspace.questionStats.correct")}
                {" ("}
                {fmtNumber(correctQuestions)}
                )
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                {t("workspace.questionStats.incorrect")}
                {" ("}
                {fmtNumber(incorrectQuestions)}
                )
              </span>
              {pendingQuestions > 0 ? (
                <span className={`flex items-center gap-1.5 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                  {t("workspace.questionStats.pending")}
                  {" ("}
                  {fmtNumber(pendingQuestions)}
                  )
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {t("workspace.questionStats.currentStatsTitle")}
          </h3>
          <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
            {t("workspace.questionStats.currentStatsDesc")}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartSection title={t("workspace.questionStats.difficultyChartTitle")} isDarkMode={isDarkMode}>
            <DifficultyBarChart buckets={current?.byDifficulty} isDarkMode={isDarkMode} t={t} />
          </ChartSection>

          <ChartSection title={t("workspace.questionStats.bloomChartTitle")} isDarkMode={isDarkMode}>
            <BloomAccuracyBarChart buckets={current?.byBloom} isDarkMode={isDarkMode} t={t} />
          </ChartSection>
        </div>

        {hasBloomRadar ? <BloomRadarChart buckets={current?.byBloom} isDarkMode={isDarkMode} t={t} /> : null}
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

          <div className={`grid gap-3 ${isUltraCompact ? "grid-cols-1" : "grid-cols-3"}`}>
            <StatCard
              icon={BarChart3}
              label={t("workspace.questionStats.totalAttempts")}
              value={fmtNumber(lifetime?.totalQuestionAttempts ?? lifetime?.totalAttempts)}
              iconClassName={isDarkMode ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100 text-indigo-600"}
              accentClassName="bg-indigo-500"
              isDarkMode={isDarkMode}
              compact
            />
            <StatCard
              icon={TrendingUp}
              label={t("workspace.questionStats.lifetimeAccuracy")}
              value={fmtAccuracy(lifetime?.accuracy ?? lifetime?.overallAccuracy)}
              iconClassName={isDarkMode ? "bg-teal-950/50 text-teal-300" : "bg-teal-100 text-teal-600"}
              accentClassName="bg-teal-500"
              isDarkMode={isDarkMode}
              compact
            />
            <StatCard
              icon={Clock}
              label={t("workspace.questionStats.pending")}
              value={fmtNumber(lifetime?.pendingQuestionAttempts)}
              iconClassName={isDarkMode ? "bg-amber-950/50 text-amber-300" : "bg-amber-100 text-amber-600"}
              accentClassName="bg-amber-500"
              isDarkMode={isDarkMode}
              compact
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartSection title={t("workspace.questionStats.difficultyChartTitle")} isDarkMode={isDarkMode}>
              <DifficultyBarChart buckets={lifetime?.byDifficulty} isDarkMode={isDarkMode} t={t} isLifetime />
            </ChartSection>

            <ChartSection title={t("workspace.questionStats.bloomChartTitle")} isDarkMode={isDarkMode}>
              <BloomAccuracyBarChart buckets={lifetime?.byBloom} isDarkMode={isDarkMode} t={t} />
            </ChartSection>
          </div>
        </section>
      ) : null}
    </>
  );
}

function QuizStatsContent({ lifetime, current, isDarkMode, t, containerWidth, selectedModeLabel, locale }) {
  const attemptedQuizzes = Number(current?.attemptedQuizzesInMode || 0);
  const isDense = containerWidth > 0 && containerWidth < 760;
  const bestQuiz = pickQuizInsightItem(lifetime?.byQuiz, "best");
  const needsReviewQuiz = pickQuizInsightItem(lifetime?.byQuiz, "worst");
  const totalQuizAttempts = Number(lifetime?.totalQuizAttempts || 0);

  return (
    <>
      <div className={`grid gap-3 ${isDense ? "grid-cols-2" : "grid-cols-4"}`}>
        <StatCard
          icon={ClipboardList}
          label={t("workspace.questionStats.attemptedQuizzes")}
          value={fmtNumber(attemptedQuizzes)}
          subValue={t(selectedModeLabel)}
          iconClassName={isDarkMode ? "bg-blue-950/50 text-blue-300" : "bg-blue-100 text-blue-600"}
          accentClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={BarChart3}
          label={t("workspace.questionStats.totalAttempts")}
          value={fmtNumber(totalQuizAttempts)}
          iconClassName={isDarkMode ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-100 text-emerald-600"}
          accentClassName="bg-emerald-500"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={Trophy}
          label={t("workspace.questionStats.averageScore")}
          value={fmtScore(current?.averageScoreInMode)}
          iconClassName={isDarkMode ? "bg-fuchsia-950/50 text-fuchsia-300" : "bg-fuchsia-100 text-fuchsia-600"}
          accentClassName="bg-fuchsia-500"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={TrendingUp}
          label={t("workspace.questionStats.accuracyLabel")}
          value={fmtAccuracy(current?.averageAccuracyInMode)}
          iconClassName={isDarkMode ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100 text-indigo-600"}
          accentClassName="bg-indigo-500"
          isDarkMode={isDarkMode}
          compact
        />
        <StatCard
          icon={Clock}
          label={t("workspace.questionStats.avgTimePerQuiz")}
          value={fmtSeconds(current?.averageDurationSecondsInMode, t)}
          iconClassName={isDarkMode ? "bg-teal-950/50 text-teal-300" : "bg-teal-100 text-teal-600"}
          accentClassName="bg-teal-500"
          isDarkMode={isDarkMode}
          compact
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <InsightCard
          title={t("workspace.questionStats.bestQuiz")}
          value={bestQuiz?.quizTitle || t("workspace.questionStats.notEnoughData")}
          description={bestQuiz
            ? `${fmtAccuracy(bestQuiz.averageAccuracy)} • ${fmtScore(bestQuiz.averageScore)} • ${fmtNumber(bestQuiz.totalAttempts)} ${t("workspace.questionStats.attempts").toLowerCase()}`
            : t("workspace.questionStats.bestQuizDesc")}
          isDarkMode={isDarkMode}
          tone="emerald"
        />
        <InsightCard
          title={t("workspace.questionStats.reviewQuiz")}
          value={needsReviewQuiz?.quizTitle || t("workspace.questionStats.notEnoughData")}
          description={needsReviewQuiz
            ? `${fmtAccuracy(needsReviewQuiz.averageAccuracy)} • ${fmtScore(needsReviewQuiz.averageScore)} • ${fmtNumber(needsReviewQuiz.totalAttempts)} ${t("workspace.questionStats.attempts").toLowerCase()}`
            : t("workspace.questionStats.reviewQuizDesc")}
          isDarkMode={isDarkMode}
          tone="amber"
        />
      </div>

      <div className={`rounded-[28px] border p-5 ${panelClasses(isDarkMode)}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex shrink-0 flex-col items-center gap-3">
            <AccuracyRing
              accuracy={current?.averageAccuracyInMode}
              isDarkMode={isDarkMode}
              label={t("workspace.questionStats.averageAccuracy")}
              size={120}
              strokeWidth={10}
            />
            <div className="text-center">
              <div className={`text-3xl font-bold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                {fmtScore(current?.averageScoreInMode)}
              </div>
              <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-fuchsia-950/40 text-fuchsia-300" : "bg-fuchsia-50 text-fuchsia-700"}`}>
                {t("workspace.questionStats.averageScore")}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className={`rounded-[22px] border p-4 ${insetPanelClasses(isDarkMode)}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.totalAttempts")}
                </p>
                <p className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {fmtNumber(lifetime?.totalQuizAttempts)}
                </p>
              </div>
              <div className={`rounded-[22px] border p-4 ${insetPanelClasses(isDarkMode)}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.distinctCompletedQuizzes")}
                </p>
                <p className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {fmtNumber(lifetime?.distinctCompletedQuizzes)}
                </p>
              </div>
              <div className={`rounded-[22px] border p-4 ${insetPanelClasses(isDarkMode)}`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mutedTextClasses(isDarkMode)}`}>
                  {t("workspace.questionStats.avgTimePerQuiz")}
                </p>
                <p className={`mt-2 text-2xl font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {fmtSeconds(lifetime?.averageDurationSeconds ?? current?.averageDurationSecondsInMode, t)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {t("workspace.questionStats.quizCurrentTitle")}
          </h3>
          <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
            {t("workspace.questionStats.quizCurrentDesc")}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MetricAverageBarChart buckets={current?.byQuizType} isDarkMode={isDarkMode} t={t} titleKey="workspace.questionStats.quizTypeChartTitle" />
          <MetricAverageBarChart buckets={current?.byDifficulty} isDarkMode={isDarkMode} t={t} titleKey="workspace.questionStats.quizDifficultyChartTitle" bucketType="difficulty" />
        </div>
      </section>

      {lifetime ? (
        <section className="space-y-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              {t("workspace.questionStats.quizLifetimeTitle")}
            </h3>
            <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>
              {t("workspace.questionStats.quizLifetimeDesc")}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              icon={BarChart3}
              label={t("workspace.questionStats.totalAttempts")}
              value={fmtNumber(lifetime?.totalQuizAttempts)}
              iconClassName={isDarkMode ? "bg-indigo-950/50 text-indigo-300" : "bg-indigo-100 text-indigo-600"}
              accentClassName="bg-indigo-500"
              isDarkMode={isDarkMode}
              compact
            />
            <StatCard
              icon={TrendingUp}
              label={t("workspace.questionStats.averageAccuracy")}
              value={fmtAccuracy(lifetime?.averageAccuracy)}
              iconClassName={isDarkMode ? "bg-teal-950/50 text-teal-300" : "bg-teal-100 text-teal-600"}
              accentClassName="bg-teal-500"
              isDarkMode={isDarkMode}
              compact
            />
            <StatCard
              icon={Trophy}
              label={t("workspace.questionStats.averageScore")}
              value={fmtScore(lifetime?.averageScore)}
              iconClassName={isDarkMode ? "bg-fuchsia-950/50 text-fuchsia-300" : "bg-fuchsia-100 text-fuchsia-600"}
              accentClassName="bg-fuchsia-500"
              isDarkMode={isDarkMode}
              compact
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <MetricAverageBarChart buckets={lifetime?.byQuizType} isDarkMode={isDarkMode} t={t} titleKey="workspace.questionStats.quizTypeLifetimeChartTitle" />
            <MetricAverageBarChart buckets={lifetime?.byDifficulty} isDarkMode={isDarkMode} t={t} titleKey="workspace.questionStats.quizDifficultyLifetimeChartTitle" bucketType="difficulty" />
          </div>
          <QuizPerformanceTable items={lifetime?.byQuiz} isDarkMode={isDarkMode} t={t} locale={locale} />
        </section>
      ) : null}
    </>
  );
}

export default function QuestionStatsView({ workspaceId, isDarkMode = false }) {
  const { t, i18n } = useTranslation();
  const containerRef = React.useRef(null);

  const [questionStatsByMode, setQuestionStatsByMode] = useState({});
  const [quizStatsByMode, setQuizStatsByMode] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptMode, setAttemptMode] = useState("ALL");
  const [surface, setSurface] = useState("QUESTION");
  const [containerWidth, setContainerWidth] = useState(0);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const parseStatsResponse = useCallback((response) => response?.data?.data ?? response?.data ?? response ?? null, []);

  const isNoDataError = useCallback((err) => {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.message || err?.response?.data?.error || "";
    return status === 404 || status === 409 || /ch[uư]a c[oó]|no data|not found|empty|conflict/i.test(apiMsg);
  }, []);

  const fetchQuestionModeStats = useCallback(async (mode) => {
    try {
      const response = await getIndividualWorkspaceQuestionStats(workspaceId, mode);
      return parseStatsResponse(response);
    } catch (err) {
      if (isNoDataError(err)) return null;
      throw err;
    }
  }, [isNoDataError, parseStatsResponse, workspaceId]);

  const fetchQuizModeStats = useCallback(async (mode) => {
    try {
      const response = await getIndividualWorkspaceQuizStats(workspaceId, mode);
      return parseStatsResponse(response);
    } catch (err) {
      if (isNoDataError(err)) return null;
      throw err;
    }
  }, [isNoDataError, parseStatsResponse, workspaceId]);

  useEffect(() => {
    let cancelled = false;

    const loadAllModes = async () => {
      if (!workspaceId) {
        setQuestionStatsByMode({});
        setQuizStatsByMode({});
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          ATTEMPT_MODES.map(async (mode) => {
            const [questionData, quizData] = await Promise.all([
              fetchQuestionModeStats(mode.value),
              fetchQuizModeStats(mode.value),
            ]);
            return [mode.value, questionData, quizData];
          }),
        );

        if (cancelled) return;

        const nextQuestionStatsByMode = {};
        const nextQuizStatsByMode = {};

        results.forEach(([modeValue, questionData, quizData]) => {
          nextQuestionStatsByMode[modeValue] = questionData;
          nextQuizStatsByMode[modeValue] = quizData;
        });

        setQuestionStatsByMode(nextQuestionStatsByMode);
        setQuizStatsByMode(nextQuizStatsByMode);
      } catch (err) {
        if (cancelled) return;
        const apiMsg = err?.response?.data?.message || err?.response?.data?.error || "";
        setError(apiMsg || err?.message || t("workspace.questionStats.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAllModes();

    return () => {
      cancelled = true;
    };
  }, [fetchQuestionModeStats, fetchQuizModeStats, t, workspaceId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = () => setContainerWidth(element.clientWidth || 0);
    updateWidth();

    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const surfaceHasData = (modeValue, surfaceValue) => (
    surfaceValue === "QUIZ"
      ? hasQuizStatsData(quizStatsByMode[modeValue])
      : hasQuestionStatsData(questionStatsByMode[modeValue])
  );

  const activeModes = ATTEMPT_MODES.filter((mode) => surfaceHasData(mode.value, surface));
  const fallbackModes = ATTEMPT_MODES.filter((mode) => surfaceHasData(mode.value, "QUESTION") || surfaceHasData(mode.value, "QUIZ"));
  const availableModes = activeModes.length > 0 ? activeModes : fallbackModes;

  useEffect(() => {
    if (loading) return;

    const surfaceHasAnyData = surface === "QUIZ"
      ? ATTEMPT_MODES.some((mode) => hasQuizStatsData(quizStatsByMode[mode.value]))
      : ATTEMPT_MODES.some((mode) => hasQuestionStatsData(questionStatsByMode[mode.value]));

    if (!surfaceHasAnyData) {
      const canUseQuiz = ATTEMPT_MODES.some((mode) => hasQuizStatsData(quizStatsByMode[mode.value]));
      const canUseQuestion = ATTEMPT_MODES.some((mode) => hasQuestionStatsData(questionStatsByMode[mode.value]));
      if (surface === "QUESTION" && canUseQuiz) {
        setSurface("QUIZ");
        return;
      }
      if (surface === "QUIZ" && canUseQuestion) {
        setSurface("QUESTION");
        return;
      }
    }

    if (availableModes.length === 0) {
      setAttemptMode("ALL");
      return;
    }

    if (!availableModes.some((mode) => mode.value === attemptMode)) {
      const fallbackMode = availableModes.find((mode) => mode.value === "ALL") || availableModes[0];
      setAttemptMode(fallbackMode.value);
    }
  }, [attemptMode, availableModes, loading, questionStatsByMode, quizStatsByMode, surface]);

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
            onClick={() => window.location.reload()}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            {t("workspace.questionStats.retry")}
          </button>
        )}
      />
    );
  }

  const questionStats = questionStatsByMode[attemptMode] || null;
  const questionCurrent = questionStats?.currentQuestionStats;
  const questionLifetime = questionStats?.lifetimeQuestionAttemptStats;
  const quizStats = quizStatsByMode[attemptMode] || null;
  const quizCurrent = quizStats?.currentQuizStats;
  const quizLifetime = quizStats?.lifetimeQuizAttemptStats;
  const selectedModeLabel = ATTEMPT_MODES.find((mode) => mode.value === attemptMode)?.labelKey || ATTEMPT_MODES[0].labelKey;
  const isUltraCompact = containerWidth > 0 && containerWidth < 560;
  const contentPaddingClass = isUltraCompact ? "space-y-3 p-3" : "space-y-4 p-4";
  const surfaceOption = SURFACE_OPTIONS.find((option) => option.value === surface) || SURFACE_OPTIONS[0];
  const SurfaceIcon = surfaceOption.icon;

  const hasCurrentSurfaceData = surface === "QUIZ"
    ? hasQuizStatsData(quizStats)
    : hasQuestionStatsData(questionStats);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className={contentPaddingClass}>
        <div className={`rounded-[28px] border ${isUltraCompact ? "p-4" : "p-5"} ${panelClasses(isDarkMode)}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${isDarkMode ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-600"}`}>
                <SurfaceIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`${isUltraCompact ? "text-lg" : "text-xl"} font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {t("workspace.questionStats.overviewTitle")}
                  </h2>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                    {t(selectedModeLabel)}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${mutedTextClasses(isDarkMode)}`}>{questionStats?.workspaceName || quizStats?.workspaceName}</p>
                <p className={`mt-2 max-w-3xl text-sm ${mutedTextClasses(isDarkMode)}`}>
                  {t(surfaceOption.descKey)}
                </p>
              </div>
            </div>

            <SurfaceSwitcher surface={surface} onChange={setSurface} isDarkMode={isDarkMode} t={t} />
            <ModeSwitcher attemptMode={attemptMode} onChange={setAttemptMode} isDarkMode={isDarkMode} t={t} compact={isUltraCompact} modes={availableModes} />
          </div>
        </div>

        {!hasCurrentSurfaceData ? (
          <div className={`flex flex-col items-center justify-center gap-4 rounded-[28px] border px-6 py-14 text-center ${panelClasses(isDarkMode)}`}>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
              <SurfaceIcon className={`h-7 w-7 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                {surface === "QUIZ" ? t("workspace.questionStats.noQuizData") : t("workspace.questionStats.noData")}
              </p>
              <p className={`mt-2 max-w-sm text-xs leading-relaxed ${mutedTextClasses(isDarkMode)}`}>
                {t(surfaceOption.descKey)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isDarkMode ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              {t("workspace.questionStats.retry")}
            </button>
          </div>
        ) : surface === "QUIZ" ? (
          <QuizStatsContent
            lifetime={quizLifetime}
            current={quizCurrent}
            isDarkMode={isDarkMode}
            t={t}
            containerWidth={containerWidth}
            selectedModeLabel={selectedModeLabel}
            locale={i18n.language?.startsWith("en") ? "en-US" : "vi-VN"}
          />
        ) : (
          <QuestionStatsContent
            lifetime={questionLifetime}
            current={questionCurrent}
            isDarkMode={isDarkMode}
            t={t}
            containerWidth={containerWidth}
            welcomeDismissed={welcomeDismissed}
            onDismissWelcome={() => setWelcomeDismissed(true)}
            selectedModeLabel={selectedModeLabel}
          />
        )}
      </div>
    </div>
  );
}
