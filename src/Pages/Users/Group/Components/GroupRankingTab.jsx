import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Medal,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { getGroupOverallRanking } from "@/api/GroupAPI";
import { useTranslation } from "react-i18next";

// ── Formatters ─────────────────────────────────────────────────────────────────
const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

function formatAccuracy(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${Math.round(Number(v) * 1000) / 10}%`;
}

// ── Mini ranking table ─────────────────────────────────────────────────────────
function MiniTable({ rows, valueKey, valueFormat, isDarkMode, emptyLabel }) {
  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-400";
  const textPrimary = isDarkMode ? "text-white" : "text-gray-900";
  const rowBg = isDarkMode ? "border-slate-700/30 hover:bg-slate-700/20" : "border-gray-50 hover:bg-[#EFF6FF]/40";

  if (!rows || rows.length === 0) {
    return <p className={`text-xs text-center py-3 ${textMuted}`}>{emptyLabel}</p>;
  }

  return (
    <div className="space-y-0">
      {rows.slice(0, 10).map((row, idx) => {
        const rank = idx + 1;
        return (
          <div key={row.userId} className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 transition-colors ${rowBg}`}>
            {/* Rank */}
            <div className="w-6 shrink-0 text-center">
              {rank <= 3 ? (
                <Medal className={`w-4 h-4 mx-auto ${MEDAL_COLORS[rank - 1]}`} />
              ) : (
                <span className={`text-xs font-medium ${textMuted}`}>{rank}</span>
              )}
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {row.avatar ? (
                <img src={row.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-[#EFF6FF] text-[#0455BF]"}`}>
                  {(row.fullName || "?")[0].toUpperCase()}
                </div>
              )}
              <span className={`text-xs font-medium truncate ${textPrimary}`}>{row.fullName}</span>
            </div>

            {/* Value */}
            <span className={`text-xs font-semibold shrink-0 ${
              rank === 1
                ? isDarkMode ? "text-yellow-300" : "text-yellow-600"
                : isDarkMode ? "text-slate-200" : "text-[#0455BF]"
            }`}>
              {valueFormat(row[valueKey])}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RankingPanel({ icon: Icon, title, subtitle, children, isDarkMode }) {
  const border = isDarkMode ? "border-slate-700" : "border-[#BFDBFE]";
  const headerBg = isDarkMode ? "bg-slate-800/80" : "bg-white";
  const bodyBg = isDarkMode ? "bg-slate-800/30" : "bg-[#EFF6FF]/30";
  const iconBg = isDarkMode ? "bg-blue-500/20" : "bg-[#EFF6FF]";
  const iconColor = isDarkMode ? "text-blue-300" : "text-[#0455BF]";

  return (
    <div className={`flex h-full flex-col rounded-xl border overflow-hidden ${border}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${border} ${headerBg}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{title}</p>
          <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>{subtitle}</p>
        </div>
      </div>
      <div className={`flex-1 ${bodyBg}`}>{children}</div>
    </div>
  );
}

// ── Aggregate (Overall) Tab ────────────────────────────────────────────────────
function OverallRankingTab({ workspaceId, isDarkMode }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [aggregated, setAggregated] = useState(null); // { accuracyRows, countRows }
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getGroupOverallRanking(workspaceId);
      const data = res?.data?.data ?? res?.data ?? {};
      const members = Array.isArray(data.members) ? data.members : [];
      const quizCount = data.quizCount ?? 0;

      const accuracyRows = [...members].sort((a, b) => (b.averageAccuracy ?? -1) - (a.averageAccuracy ?? -1));
      const countRows = [...members].sort((a, b) => (b.quizzesCompleted ?? 0) - (a.quizzesCompleted ?? 0));

      setAggregated({ accuracyRows, countRows, quizCount });
    } catch (err) {
      console.error("OverallRankingTab load error:", err);
      setError(t("groupWorkspace.ranking.error"));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => { load(); }, [load]);

  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-500";
  const metricPanels = [
    {
      key: "accuracy",
      icon: BarChart3,
      title: t("groupWorkspace.ranking.metrics.accuracy.title"),
      subtitle: t("groupWorkspace.ranking.metrics.accuracy.subtitle"),
      valueKey: "averageAccuracy",
      valueFormat: formatAccuracy,
      rows: aggregated?.accuracyRows ?? [],
    },
    {
      key: "completion",
      icon: ClipboardList,
      title: t("groupWorkspace.ranking.metrics.completion.title"),
      subtitle: t("groupWorkspace.ranking.metrics.completion.subtitle"),
      valueKey: "quizzesCompleted",
      valueFormat: (value) => t("groupWorkspace.ranking.metrics.completion.value", { count: value ?? 0 }),
      rows: aggregated?.countRows ?? [],
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <p className={`text-sm ${textMuted}`}>{t("groupWorkspace.ranking.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <button type="button" onClick={load} className="text-xs underline text-[#0455BF]">
          {t("groupWorkspace.ranking.retry")}
        </button>
      </div>
    );
  }

  if (!aggregated) return null;

  if (!aggregated.accuracyRows || aggregated.accuracyRows.length === 0) {
    return (
      <div className={`text-center py-12 ${textMuted}`}>
        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">{t("groupWorkspace.ranking.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className={`text-[11px] ${textMuted}`}>
          {t("groupWorkspace.ranking.meta", {
            quizCount: aggregated.quizCount ?? 0,
            memberCount: aggregated.accuracyRows?.length ?? 0,
          })}
        </p>
        <button
          type="button"
          onClick={load}
          className={`inline-flex items-center gap-1 self-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            isDarkMode
              ? "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700/70"
              : "border-[#BFDBFE] bg-white text-[#0455BF] hover:bg-[#EFF6FF]"
          }`}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("groupWorkspace.ranking.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {metricPanels.map((panel) => (
          <RankingPanel
            key={panel.key}
            icon={panel.icon}
            title={panel.title}
            subtitle={panel.subtitle}
            isDarkMode={isDarkMode}
          >
            <MiniTable
              rows={panel.rows}
              valueKey={panel.valueKey}
              valueFormat={panel.valueFormat}
              isDarkMode={isDarkMode}
              emptyLabel={t("groupWorkspace.ranking.noData")}
            />
          </RankingPanel>
        ))}
      </div>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────
/**
 * GroupRankingTab
 * Tổng hợp xếp hạng chung của nhóm — KHÔNG phải per-quiz.
 * Per-quiz ranking nằm trong QuizDetailView (tab "Xếp hạng").
 * Challenge quiz không tính vào ranking (loại bỏ để công bằng).
 */
export default function GroupRankingTab({ workspaceId, isDarkMode = false }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-500"}`} />
        <h2 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
          {t("groupWorkspace.ranking.title")}
        </h2>
      </div>
      <p className={`text-xs -mt-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
        {t("groupWorkspace.ranking.description")}
      </p>

      <OverallRankingTab workspaceId={workspaceId} isDarkMode={isDarkMode} />
    </div>
  );
}
