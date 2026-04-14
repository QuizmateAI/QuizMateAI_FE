import React, { useCallback, useEffect, useState } from "react";
import { Clock, Medal, RefreshCw, Trophy } from "lucide-react";
import UserDisplayName from "@/Components/users/UserDisplayName";
import { getGroupQuizHistory } from "@/api/QuizAPI";
import { useTranslation } from "react-i18next";

const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

function formatAccuracy(accuracyPercent) {
  if (accuracyPercent == null) return "-";
  const value = Number(accuracyPercent);
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 10) / 10}%`;
}

function formatTime(seconds) {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function resolveAttemptDurationSeconds(attempt) {
  const startedAt = parseDateValue(attempt?.startedAt);
  const completedAt = parseDateValue(attempt?.completedAt ?? attempt?.submittedAt);
  if (startedAt == null || completedAt == null || completedAt < startedAt) {
    return null;
  }
  return Math.round((completedAt - startedAt) / 1000);
}

function compareAttemptsByFirstSubmission(left, right) {
  const leftCompleted = parseDateValue(left?.completedAt ?? left?.submittedAt);
  const rightCompleted = parseDateValue(right?.completedAt ?? right?.submittedAt);
  if (leftCompleted != null && rightCompleted != null && leftCompleted !== rightCompleted) {
    return leftCompleted - rightCompleted;
  }

  const leftStarted = parseDateValue(left?.startedAt);
  const rightStarted = parseDateValue(right?.startedAt);
  if (leftStarted != null && rightStarted != null && leftStarted !== rightStarted) {
    return leftStarted - rightStarted;
  }

  return Number(left?.attemptId ?? Number.MAX_SAFE_INTEGER) - Number(right?.attemptId ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Converts raw history into ranking rows.
 * Takes the first official completed attempt per member.
 */
function buildRanking(historyData) {
  if (!Array.isArray(historyData) || historyData.length === 0) return [];

  const byUser = new Map();
  historyData.forEach((entry) => {
    const attempts = Array.isArray(entry?.attempts) ? entry.attempts : [entry];
    attempts.forEach((attempt) => {
      const uid = attempt?.userId ?? attempt?.memberId ?? entry?.member?.userId ?? entry?.userId;
      if (uid == null) return;
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          member: {
            userId: uid,
            fullName:
              attempt?.userFullName
              || attempt?.memberName
              || attempt?.fullName
              || entry?.member?.fullName
              || "Thành viên",
            username:
              attempt?.userName
              || attempt?.username
              || entry?.member?.userName
              || entry?.member?.username
              || null,
            avatar: attempt?.avatar ?? entry?.member?.avatar ?? null,
          },
          attempts: [],
        });
      }
      byUser.get(uid).attempts.push(attempt);
    });
  });

  const rows = Array.from(byUser.values())
    .map(({ member, attempts }) => {
      const officialCompletedAttempts = attempts
        .filter((attempt) => !attempt?.isPracticeMode && attempt?.completedAt)
        .sort(compareAttemptsByFirstSubmission);

      const firstAttempt = officialCompletedAttempts[0];
      if (!firstAttempt) return null;

      return {
        userId: member.userId,
        fullName: member.fullName || "Thành viên",
        username: member.username || null,
        avatar: member.avatar,
        accuracyPercent: firstAttempt.accuracyPercent,
        durationSeconds: resolveAttemptDurationSeconds(firstAttempt),
        submittedAt: firstAttempt.submittedAt || firstAttempt.completedAt,
      };
    })
    .filter(Boolean);

  // Sort: accuracy desc, time asc, submit date asc
  rows.sort((a, b) => {
    const accuracyDiff = Number(b.accuracyPercent ?? -1) - Number(a.accuracyPercent ?? -1);
    if (accuracyDiff !== 0) return accuracyDiff;

    const timeDiff = Number(a.durationSeconds ?? Number.POSITIVE_INFINITY) - Number(b.durationSeconds ?? Number.POSITIVE_INFINITY);
    if (timeDiff !== 0) return timeDiff;

    const submittedDiff = Number(parseDateValue(a.submittedAt) ?? Number.POSITIVE_INFINITY)
      - Number(parseDateValue(b.submittedAt) ?? Number.POSITIVE_INFINITY);
    if (submittedDiff !== 0) return submittedDiff;

    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * GroupQuizRankingPanel
 * Shows per-quiz ranking for leader. Fetches group history and builds ranking.
 */
export default function GroupQuizRankingPanel({ workspaceId, quizId, isDarkMode = false }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId || !quizId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getGroupQuizHistory(workspaceId, quizId);
      const data = res?.data?.data ?? res?.data ?? null;
      setRows(buildRanking(data));
    } catch (err) {
      console.error("GroupQuizRankingPanel load error:", err);
      setError(t("groupWorkspace.quizRanking.error"));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId, quizId]);

  useEffect(() => { load(); }, [load]);

  const rowBg = isDarkMode ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-50 hover:bg-[#EFF6FF]/40";
  const headerBg = isDarkMode ? "bg-slate-800 border-slate-700" : "bg-[#EFF6FF] border-[#BFDBFE]";
  const containerBorder = isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-[#BFDBFE] bg-white";
  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-400";
  const textPrimary = isDarkMode ? "text-white" : "text-gray-900";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className={`w-5 h-5 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <span className={`ml-2 text-sm ${textMuted}`}>{t("groupWorkspace.quizRanking.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border p-6 text-center text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/50 text-red-400" : "border-red-100 bg-red-50 text-red-600"}`}>
        {error}
        <button type="button" onClick={load} className="ml-2 underline">{t("groupWorkspace.quizRanking.retry")}</button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-[#BFDBFE] bg-[#EFF6FF]/40"}`}>
        <Trophy className={`mx-auto mb-2 w-8 h-8 opacity-30 ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <p className={`text-sm ${textMuted}`}>{t("groupWorkspace.quizRanking.empty")}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${containerBorder}`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${headerBg}`}>
        <div className="flex items-center gap-1.5">
          <Trophy className={`w-4 h-4 ${isDarkMode ? "text-yellow-400" : "text-yellow-500"}`} />
          <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
            {t("groupWorkspace.quizRanking.title", { count: rows.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          className={`p-1 rounded transition-all ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-[#BFDBFE] text-gray-400"}`}
          title={t("groupWorkspace.quizRanking.refresh")}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b text-xs ${isDarkMode ? "border-slate-700 text-slate-400" : "border-[#BFDBFE] text-gray-500"}`}>
            <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
            <th className="px-4 py-2.5 text-left font-medium">{t("groupWorkspace.quizRanking.columns.member")}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t("groupWorkspace.quizRanking.columns.accuracy")}</th>
            <th className="px-4 py-2.5 text-right font-medium">{t("groupWorkspace.quizRanking.columns.time")}</th>
            <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">{t("groupWorkspace.quizRanking.columns.submittedAt")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.userId} className={`border-b last:border-b-0 transition-colors ${rowBg}`}>
              {/* Rank */}
              <td className="px-4 py-3">
                {row.rank <= 3 ? (
                  <Medal className={`w-5 h-5 ${MEDAL_COLORS[row.rank - 1]}`} />
                ) : (
                  <span className={textMuted}>{row.rank}</span>
                )}
              </td>

              {/* Member */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {row.avatar ? (
                    <img src={row.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-[#EFF6FF] text-[#0455BF]"}`}>
                      {(row.fullName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <UserDisplayName user={row} fallback="—" className={`font-medium ${textPrimary}`} />
                    {row.username && (
                      <p className={`truncate text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                        @{row.username}
                      </p>
                    )}
                  </div>
                </div>
              </td>

              {/* Accuracy */}
              <td className={`px-4 py-3 text-right font-semibold ${
                row.rank === 1
                  ? isDarkMode ? "text-yellow-300" : "text-yellow-600"
                  : isDarkMode ? "text-slate-200" : "text-[#0455BF]"
              }`}>
                {formatAccuracy(row.accuracyPercent)}
              </td>

              {/* Time */}
              <td className={`px-4 py-3 text-right ${textMuted}`}>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(row.durationSeconds)}
                </span>
              </td>

              {/* Date */}
              <td className={`px-4 py-3 text-right hidden md:table-cell ${textMuted}`}>
                {formatDate(row.submittedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
