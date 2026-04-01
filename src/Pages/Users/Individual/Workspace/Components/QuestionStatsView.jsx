import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getIndividualWorkspaceQuestionStats } from "@/api/WorkspaceAPI";

const ATTEMPT_MODES = [
  { value: "OFFICIAL", labelKey: "workspace.questionStats.modeOfficial" },
  { value: "PRACTICE", labelKey: "workspace.questionStats.modePractice" },
  { value: "ALL", labelKey: "workspace.questionStats.modeAll" },
];

function pct(value, total) {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}

function fmtAccuracy(accuracy) {
  if (accuracy == null) return "0%";
  return `${Math.round(accuracy * 100)}%`;
}

function ProgressBar({ value, max, color = "bg-emerald-500", className = "" }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color, isDarkMode }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-4 h-full ${isDarkMode ? "bg-slate-800/60" : "bg-white"} border ${isDarkMode ? "border-slate-700/50" : "border-gray-100"} shadow-sm`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className={`text-2xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{value}</p>
      <p className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{label}</p>
      {subValue && (
        <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{subValue}</p>
      )}
    </div>
  );
}

const DIFFICULTY_KEYS = ["EASY", "MEDIUM", "HARD", "CUSTOM", "UNSPECIFIED"];

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

function BucketTable({ title, buckets, isDarkMode, t, isLifetime = false, bucketType = "difficulty" }) {
  if (!buckets || buckets.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className={`text-sm font-semibold mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{title}</h4>
      <div className={`rounded-xl overflow-hidden border ${isDarkMode ? "border-slate-700/50" : "border-gray-100"}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className={isDarkMode ? "bg-slate-800/80" : "bg-gray-50"}>
              <th className={`text-left px-3 py-2 font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.questionStats.label")}
              </th>
              <th className={`text-center px-3 py-2 font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {isLifetime ? t("workspace.questionStats.attempts") : t("workspace.questionStats.total")}
              </th>
              <th className={`text-center px-3 py-2 font-medium text-emerald-500`}>
                <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" />
                {t("workspace.questionStats.correct")}
              </th>
              <th className={`text-center px-3 py-2 font-medium text-red-500`}>
                <XCircle className="w-3.5 h-3.5 inline-block mr-1" />
                {t("workspace.questionStats.incorrect")}
              </th>
              <th className={`text-center px-3 py-2 font-medium ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("workspace.questionStats.accuracy")}
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket, index) => {
              const total = isLifetime ? bucket.totalAnsweredQuestionAttemptsInMode : bucket.totalWorkspaceQuestions;
              const correct = isLifetime ? bucket.correctQuestionAttemptsInMode : bucket.correctQuestionsInMode;
              const incorrect = isLifetime ? bucket.incorrectQuestionAttemptsInMode : bucket.incorrectQuestionsInMode;
              const accuracy = bucket.accuracyInMode;

              return (
                <tr
                  key={bucket.label || index}
                  className={`${isDarkMode ? "border-slate-700/30 hover:bg-slate-800/40" : "border-gray-50 hover:bg-gray-50/50"} border-t transition-colors`}
                >
                  <td className={`px-3 py-2 font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${getDifficultyStyle(bucket.label, isDarkMode)}`}>
                      {translateLabel(bucket.label, t, bucketType)}
                    </span>
                  </td>
                  <td className={`text-center px-3 py-2 ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{total ?? 0}</td>
                  <td className="text-center px-3 py-2 text-emerald-600 dark:text-emerald-400 font-medium">{correct ?? 0}</td>
                  <td className="text-center px-3 py-2 text-red-500 dark:text-red-400 font-medium">{incorrect ?? 0}</td>
                  <td className="text-center px-3 py-2">
                    <span className={`font-bold ${accuracy > 0.7 ? "text-emerald-600 dark:text-emerald-400" : accuracy > 0.4 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                      {fmtAccuracy(accuracy)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getDifficultyStyle(label, isDarkMode) {
  const normalized = String(label || "").toUpperCase();
  if (normalized === "EASY") return isDarkMode ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700";
  if (normalized === "MEDIUM") return isDarkMode ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700";
  if (normalized === "HARD") return isDarkMode ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700";
  return isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600";
}

const BLOOM_COLORS = {
  REMEMBER:    { main: "#6366f1", bg: "bg-indigo-500" },
  UNDERSTAND:  { main: "#06b6d4", bg: "bg-cyan-500" },
  APPLY:       { main: "#22c55e", bg: "bg-emerald-500" },
  ANALYZE:     { main: "#f59e0b", bg: "bg-amber-500" },
  EVALUATE:    { main: "#ef4444", bg: "bg-red-500" },
  CREATE:      { main: "#a855f7", bg: "bg-purple-500" },
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

const BLOOM_ORDER = ["ANALYZE", "UNDERSTAND", "REMEMBER", "EVALUATE", "CREATE", "APPLY"];

function RadarChart({ buckets, isDarkMode, t }) {
  if (!buckets || buckets.length < 3) return null;

  const available = buckets.filter((b) => b.label !== "UNSPECIFIED");
  if (available.length < 3) return null;

  const bucketMap = Object.fromEntries(available.map((b) => [b.label.toUpperCase(), b]));
  const filtered = BLOOM_ORDER.map((key) => bucketMap[key]).filter(Boolean);
  if (filtered.length < 3) return filtered.length === 0 ? null : null;

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 95;
  const levels = 5;
  const angleStep = 360 / filtered.length;

  const gridCircles = Array.from({ length: levels }, (_, i) => (maxR / levels) * (i + 1));

  const gridPolygons = gridCircles.map((r) => {
    return filtered.map((_, j) => {
      const p = polarToCartesian(cx, cy, r, j * angleStep);
      return `${p.x},${p.y}`;
    }).join(" ");
  });

  const dataPoints = filtered.map((bucket, i) => {
    const pctVal = Math.round((bucket.accuracyInMode ?? 0) * 100);
    const r = (pctVal / 100) * maxR;
    return polarToCartesian(cx, cy, Math.max(r, 2), i * angleStep);
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const labelDistance = maxR + 50;
  const labels = filtered.map((bucket, i) => {
    const angle = i * angleStep;
    const p = polarToCartesian(cx, cy, labelDistance, angle);
    const pctVal = Math.round((bucket.accuracyInMode ?? 0) * 100);
    const colorInfo = BLOOM_COLORS[bucket.label.toUpperCase()] || { main: "#94a3b8" };
    const normAngle = ((angle % 360) + 360) % 360;
    const anchor = normAngle > 20 && normAngle < 160 ? "start" : normAngle > 200 && normAngle < 340 ? "end" : "middle";
    return { ...p, angle, label: translateLabel(bucket.label, t, "bloom"), pct: pctVal, color: colorInfo.main, key: bucket.label, anchor };
  });

  return (
    <div className={`rounded-2xl p-5 pb-3 border ${isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white border-gray-100"} shadow-sm`}>
      <div className="mb-0">
        <h3 className={`text-sm font-bold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
          {t("workspace.questionStats.radarTitle")}
        </h3>
        <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
          {t("workspace.questionStats.radarSubtitle")}
        </p>
      </div>
      <div className="flex items-center justify-center overflow-visible">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
          {/* Grid polygons */}
          {gridPolygons.map((points, i) => (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke={isDarkMode ? "#334155" : "#d1d5db"}
              strokeWidth={0.6}
              opacity={i === levels - 1 ? 0.6 : 0.3}
            />
          ))}

          {/* Axis lines */}
          {filtered.map((_, i) => {
            const p = polarToCartesian(cx, cy, maxR, i * angleStep);
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={p.x} y2={p.y}
                stroke={isDarkMode ? "#334155" : "#d1d5db"}
                strokeWidth={0.6}
                opacity={0.3}
              />
            );
          })}

          {/* Data area fill */}
          <polygon
            points={dataPolygon}
            fill={isDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"}
            stroke={isDarkMode ? "#818cf8" : "#6366f1"}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {dataPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y} r={3.5}
              fill={isDarkMode ? "#818cf8" : "#6366f1"}
              stroke={isDarkMode ? "#1e293b" : "#ffffff"}
              strokeWidth={2}
            />
          ))}

          {/* Labels */}
          {labels.map((item) => (
            <g key={item.key}>
              <text
                x={item.x}
                y={item.y - 6}
                textAnchor={item.anchor}
                dominantBaseline="middle"
                className={`text-[12px] font-semibold ${isDarkMode ? "fill-slate-300" : "fill-gray-600"}`}
              >
                {item.label}
              </text>
              <text
                x={item.x}
                y={item.y + 10}
                textAnchor={item.anchor}
                dominantBaseline="middle"
                className="text-[12px] font-bold"
                fill={item.color}
              >
                {item.pct}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function AccuracyRing({ accuracy, size = 120, strokeWidth = 10, isDarkMode, label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pctValue = Math.round((accuracy ?? 0) * 100);
  const offset = circumference - (pctValue / 100) * circumference;

  const color = pctValue >= 70 ? "text-emerald-500" : pctValue >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDarkMode ? "#334155" : "#e5e7eb"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{pctValue}%</span>
        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{label}</span>
      </div>
    </div>
  );
}

export default function QuestionStatsView({ workspaceId, isDarkMode = false }) {
  const { t } = useTranslation();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attemptMode, setAttemptMode] = useState("OFFICIAL");
  const [modeOpen, setModeOpen] = useState(false);

  const fetchStats = async (mode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getIndividualWorkspaceQuestionStats(workspaceId, mode);
      const data = response?.data?.data ?? response?.data ?? response ?? null;
      setStats(data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchStats(attemptMode);
  }, [workspaceId, attemptMode]);

  const current = stats?.currentQuestionStats;
  const lifetime = stats?.lifetimeQuestionAttemptStats;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {t("workspace.questionStats.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{error}</p>
        <button
          onClick={() => fetchStats(attemptMode)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t("workspace.questionStats.retry")}
        </button>
      </div>
    );
  }

  if (!stats || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <BarChart3 className={`w-10 h-10 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
        <p className={`text-sm ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
          {t("workspace.questionStats.noData")}
        </p>
      </div>
    );
  }

  const selectedModeLabel = ATTEMPT_MODES.find((m) => m.value === attemptMode)?.labelKey;

  return (
    <div className={`h-full overflow-y-auto rounded-2xl ${isDarkMode ? "bg-slate-900/50" : "bg-gray-50/80"}`}>
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {t("workspace.questionStats.title")}
              </h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {stats.workspaceName}
              </p>
            </div>
          </div>

          {/* Attempt mode selector */}
          <div className="relative">
            <button
              onClick={() => setModeOpen(!modeOpen)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${isDarkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(selectedModeLabel)}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${modeOpen ? "rotate-180" : ""}`} />
            </button>
            {modeOpen && (
              <div className={`absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                {ATTEMPT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => { setAttemptMode(mode.value); setModeOpen(false); }}
                    className={`block w-full text-left text-xs px-4 py-2 transition ${attemptMode === mode.value
                      ? isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                      : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t(mode.labelKey)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overview: Accuracy Ring + Summary Cards */}
        <div className={`rounded-2xl p-5 border ${isDarkMode ? "bg-slate-800/40 border-slate-700/50" : "bg-white border-gray-100"} shadow-sm`}>
          <div className="flex items-center gap-6">
            <AccuracyRing accuracy={current.accuracyInMode} isDarkMode={isDarkMode} label={t("workspace.questionStats.accuracy")} />

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("workspace.questionStats.progress")}
                </span>
                <span className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {current.attemptedQuestionsInMode}/{current.totalWorkspaceQuestions}
                </span>
              </div>
              <ProgressBar
                value={current.attemptedQuestionsInMode}
                max={current.totalWorkspaceQuestions}
                color="bg-blue-500"
              />

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center">
                  <p className="text-emerald-500 text-lg font-bold">{current.correctQuestionsInMode}</p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.questionStats.correct")}</p>
                </div>
                <div className="text-center">
                  <p className="text-red-500 text-lg font-bold">{current.incorrectQuestionsInMode}</p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.questionStats.incorrect")}</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${isDarkMode ? "text-amber-400" : "text-amber-500"}`}>{current.pendingQuestionsInMode}</p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.questionStats.pending")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Radar + Summary stat cards — side by side */}
        <div className="grid grid-cols-[1fr_1fr] gap-4 items-stretch">
          {current.byBloom && current.byBloom.length >= 3 && (
            <RadarChart
              buckets={current.byBloom}
              isDarkMode={isDarkMode}
              t={t}
            />
          )}
          <div className="grid grid-cols-2 gap-3 content-stretch">
            <StatCard
              icon={Target}
              label={t("workspace.questionStats.totalQuestions")}
              value={current.totalWorkspaceQuestions}
              color={isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}
              isDarkMode={isDarkMode}
            />
            <StatCard
              icon={CheckCircle2}
              label={t("workspace.questionStats.attempted")}
              value={current.attemptedQuestionsInMode}
              subValue={`${pct(current.attemptedQuestionsInMode, current.totalWorkspaceQuestions)}%`}
              color={isDarkMode ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-100 text-emerald-600"}
              isDarkMode={isDarkMode}
            />
            <StatCard
              icon={TrendingUp}
              label={t("workspace.questionStats.accuracyLabel")}
              value={fmtAccuracy(current.accuracyInMode)}
              color={isDarkMode ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}
              isDarkMode={isDarkMode}
            />
            <StatCard
              icon={Clock}
              label={t("workspace.questionStats.pendingGrading")}
              value={current.pendingQuestionsInMode}
              color={isDarkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Current Question Stats - By Difficulty */}
        <div>
          <h3 className={`text-sm font-bold mb-1 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            {t("workspace.questionStats.currentStatsTitle")}
          </h3>
          <p className={`text-xs mb-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            {t("workspace.questionStats.currentStatsDesc")}
          </p>
          <BucketTable
            title={t("workspace.questionStats.byDifficulty")}
            buckets={current.byDifficulty}
            isDarkMode={isDarkMode}
            t={t}
            bucketType="difficulty"
          />
          <BucketTable
            title={t("workspace.questionStats.byBloom")}
            buckets={current.byBloom}
            isDarkMode={isDarkMode}
            t={t}
            bucketType="bloom"
          />
        </div>

        {/* Lifetime Question Attempt Stats */}
        {lifetime && (
          <div>
            <h3 className={`text-sm font-bold mb-1 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
              {t("workspace.questionStats.lifetimeStatsTitle")}
            </h3>
            <p className={`text-xs mb-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("workspace.questionStats.lifetimeStatsDesc")}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard
                icon={BarChart3}
                label={t("workspace.questionStats.totalAttempts")}
                value={lifetime.totalQuestionAttempts}
                color={isDarkMode ? "bg-indigo-900/30 text-indigo-400" : "bg-indigo-100 text-indigo-600"}
                isDarkMode={isDarkMode}
              />
              <StatCard
                icon={TrendingUp}
                label={t("workspace.questionStats.lifetimeAccuracy")}
                value={fmtAccuracy(lifetime.accuracy)}
                color={isDarkMode ? "bg-teal-900/30 text-teal-400" : "bg-teal-100 text-teal-600"}
                isDarkMode={isDarkMode}
              />
            </div>

            <BucketTable
              title={t("workspace.questionStats.byDifficulty")}
              buckets={lifetime.byDifficulty}
              isDarkMode={isDarkMode}
              t={t}
              isLifetime
              bucketType="difficulty"
            />
            <BucketTable
              title={t("workspace.questionStats.byBloom")}
              buckets={lifetime.byBloom}
              isDarkMode={isDarkMode}
              t={t}
              isLifetime
              bucketType="bloom"
            />
          </div>
        )}
      </div>
    </div>
  );
}
