import React, { useCallback, useEffect, useState } from "react";
import { Clock, Medal, RefreshCw, Trophy } from "lucide-react";
import { getGroupQuizHistory } from "@/api/QuizAPI";

const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

function formatScore(score) {
  if (score == null) return "-";
  const n = Number(score);
  return Number.isFinite(n) ? n.toFixed(1) : "-";
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

/**
 * Converts raw history (array of attempts grouped by member) into ranking rows.
 * Takes best attempt per member (highest score, then fastest time).
 */
function buildRanking(historyData) {
  if (!historyData) return [];

  // historyData may be: array of { member, attempts[] } or flat array of attempts
  let memberGroups = [];

  if (Array.isArray(historyData)) {
    const first = historyData[0];
    if (first && (first.member || first.userId || first.memberId)) {
      // Already grouped by member
      memberGroups = historyData.map((group) => ({
        member: group.member || { userId: group.userId || group.memberId, fullName: group.fullName || group.memberName, avatar: group.avatar },
        attempts: Array.isArray(group.attempts) ? group.attempts : [group],
      }));
    } else {
      // Flat attempt list — group by userId
      const byUser = new Map();
      historyData.forEach((attempt) => {
        const uid = attempt.userId || attempt.memberId || "unknown";
        if (!byUser.has(uid)) {
          byUser.set(uid, {
            member: {
              userId: uid,
              fullName: attempt.fullName || attempt.memberName || attempt.username || "Thành viên",
              avatar: attempt.avatar,
            },
            attempts: [],
          });
        }
        byUser.get(uid).attempts.push(attempt);
      });
      memberGroups = Array.from(byUser.values());
    }
  }

  // Pick best attempt per member
  const rows = memberGroups
    .map(({ member, attempts }) => {
      const completed = attempts.filter(
        (a) => a.status === "SUBMITTED" || a.status === "COMPLETED" || a.score != null
      );
      if (completed.length === 0) return null;

      const best = completed.reduce((prev, cur) => {
        const prevScore = Number(prev.score ?? 0);
        const curScore = Number(cur.score ?? 0);
        if (curScore > prevScore) return cur;
        if (curScore === prevScore) {
          const prevTime = Number(prev.completionTimeSeconds ?? Infinity);
          const curTime = Number(cur.completionTimeSeconds ?? Infinity);
          return curTime < prevTime ? cur : prev;
        }
        return prev;
      });

      return {
        userId: member.userId,
        fullName: member.fullName || member.username || "Thành viên",
        avatar: member.avatar,
        score: best.score,
        completionTimeSeconds: best.completionTimeSeconds,
        attemptCount: completed.length,
        submittedAt: best.submittedAt || best.endTime,
      };
    })
    .filter(Boolean);

  // Sort: score desc, time asc
  rows.sort((a, b) => {
    const sd = Number(b.score ?? 0) - Number(a.score ?? 0);
    if (sd !== 0) return sd;
    return (Number(a.completionTimeSeconds ?? Infinity)) - (Number(b.completionTimeSeconds ?? Infinity));
  });

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * GroupQuizRankingPanel
 * Shows per-quiz ranking for leader. Fetches group history and builds ranking.
 */
export default function GroupQuizRankingPanel({ workspaceId, quizId, isDarkMode = false }) {
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
      setError("Không thể tải bảng xếp hạng.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, quizId]);

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
        <span className={`ml-2 text-sm ${textMuted}`}>Đang tải…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border p-6 text-center text-sm ${isDarkMode ? "border-slate-700 bg-slate-800/50 text-red-400" : "border-red-100 bg-red-50 text-red-600"}`}>
        {error}
        <button type="button" onClick={load} className="ml-2 underline">Thử lại</button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`rounded-xl border p-8 text-center ${isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-[#BFDBFE] bg-[#EFF6FF]/40"}`}>
        <Trophy className={`mx-auto mb-2 w-8 h-8 opacity-30 ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <p className={`text-sm ${textMuted}`}>Chưa có thành viên nào hoàn thành bài này.</p>
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
            Bảng xếp hạng · {rows.length} thành viên
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          className={`p-1 rounded transition-all ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-[#BFDBFE] text-gray-400"}`}
          title="Làm mới"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b text-xs ${isDarkMode ? "border-slate-700 text-slate-400" : "border-[#BFDBFE] text-gray-500"}`}>
            <th className="px-4 py-2.5 text-left font-medium w-10">#</th>
            <th className="px-4 py-2.5 text-left font-medium">Thành viên</th>
            <th className="px-4 py-2.5 text-right font-medium">Điểm</th>
            <th className="px-4 py-2.5 text-right font-medium">Thời gian</th>
            <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Số lần</th>
            <th className="px-4 py-2.5 text-right font-medium hidden md:table-cell">Ngày nộp</th>
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
                    <img src={row.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-[#EFF6FF] text-[#0455BF]"}`}>
                      {(row.fullName || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className={`font-medium truncate max-w-[140px] ${textPrimary}`}>
                    {row.fullName}
                  </span>
                </div>
              </td>

              {/* Score */}
              <td className={`px-4 py-3 text-right font-semibold ${
                row.rank === 1
                  ? isDarkMode ? "text-yellow-300" : "text-yellow-600"
                  : isDarkMode ? "text-slate-200" : "text-[#0455BF]"
              }`}>
                {formatScore(row.score)}
              </td>

              {/* Time */}
              <td className={`px-4 py-3 text-right ${textMuted}`}>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(row.completionTimeSeconds)}
                </span>
              </td>

              {/* Attempt count */}
              <td className={`px-4 py-3 text-right hidden sm:table-cell ${textMuted}`}>
                {row.attemptCount}x
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
