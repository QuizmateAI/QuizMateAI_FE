import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Clock,
  ClipboardList,
  Medal,
  RefreshCw,
  Swords,
  Trophy,
} from "lucide-react";
import { getQuizzesByScope, getGroupQuizHistory } from "@/api/QuizAPI";
import { listChallenges, getChallengeLeaderboard } from "@/api/ChallengeAPI";

// ── Formatters ─────────────────────────────────────────────────────────────────
const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

function formatScore(v) {
  if (v == null) return "-";
  return Number(v).toFixed(1);
}

function formatTime(seconds) {
  if (seconds == null || seconds === 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}g ${m}p`;
  if (m > 0) return `${m}p ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

// ── Build aggregate stats from all-quiz histories ─────────────────────────────
/**
 * Given a map { quizId → historyData }, produce per-member aggregates:
 *   totalScore, quizzesCompleted, totalTimeSeconds
 */
function buildAggregateRanking(historyMap) {
  const members = new Map(); // userId → stats

  const ensure = (uid, name, avatar) => {
    if (!members.has(uid)) {
      members.set(uid, { userId: uid, fullName: name || "Thành viên", avatar, totalScore: 0, quizzesCompleted: 0, totalTimeSeconds: 0 });
    }
    return members.get(uid);
  };

  for (const historyData of Object.values(historyMap)) {
    if (!historyData) continue;
    const arr = Array.isArray(historyData) ? historyData : [];
    if (arr.length === 0) continue;

    const first = arr[0];
    let memberGroups = [];

    if (first && (first.member || first.memberId || first.userId)) {
      memberGroups = arr.map((g) => ({
        member: g.member || { userId: g.userId || g.memberId, fullName: g.fullName || g.memberName, avatar: g.avatar },
        attempts: Array.isArray(g.attempts) ? g.attempts : [g],
      }));
    } else {
      const byUser = new Map();
      arr.forEach((a) => {
        const uid = a.userId || a.memberId || "unknown";
        if (!byUser.has(uid)) byUser.set(uid, { member: { userId: uid, fullName: a.fullName || a.memberName || a.username || "Thành viên", avatar: a.avatar }, attempts: [] });
        byUser.get(uid).attempts.push(a);
      });
      memberGroups = Array.from(byUser.values());
    }

    for (const { member, attempts } of memberGroups) {
      const done = attempts.filter((a) => a.status === "SUBMITTED" || a.status === "COMPLETED" || a.score != null);
      if (done.length === 0) continue;

      const best = done.reduce((p, c) => {
        const pd = Number(p.score ?? 0);
        const cd = Number(c.score ?? 0);
        return cd > pd ? c : p;
      });

      const uid = member.userId;
      const row = ensure(uid, member.fullName || member.username, member.avatar);
      row.quizzesCompleted += 1;
      row.totalScore += Number(best.score ?? 0);
      row.totalTimeSeconds += Number(best.completionTimeSeconds ?? 0);
    }
  }

  return Array.from(members.values());
}

// ── Mini ranking table ─────────────────────────────────────────────────────────
function MiniTable({ rows, valueKey, valueFormat, isDarkMode }) {
  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-400";
  const textPrimary = isDarkMode ? "text-white" : "text-gray-900";
  const rowBg = isDarkMode ? "border-slate-700/30 hover:bg-slate-700/20" : "border-gray-50 hover:bg-[#EFF6FF]/40";

  if (!rows || rows.length === 0) {
    return <p className={`text-xs text-center py-3 ${textMuted}`}>Chưa có dữ liệu.</p>;
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

// ── Aggregate ranking card ─────────────────────────────────────────────────────
function AggCard({ icon: Icon, iconBg, iconColor, title, subtitle, children, isDarkMode }) {
  const border = isDarkMode ? "border-slate-700" : "border-[#BFDBFE]";
  const headerBg = isDarkMode ? "bg-slate-800/80" : "bg-white";
  const bodyBg = isDarkMode ? "bg-slate-800/30" : "bg-[#EFF6FF]/30";

  return (
    <div className={`rounded-xl border overflow-hidden ${border}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${border} ${headerBg}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{title}</p>
          <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>{subtitle}</p>
        </div>
      </div>
      <div className={bodyBg}>{children}</div>
    </div>
  );
}

// ── Aggregate (Overall) Tab ────────────────────────────────────────────────────
function OverallRankingTab({ workspaceId, isDarkMode }) {
  const [loading, setLoading] = useState(false);
  const [aggregated, setAggregated] = useState(null); // { scoreRows, countRows, timeRows }
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      // 1. Fetch all active quizzes
      const qRes = await getQuizzesByScope("GROUP", workspaceId);
      const rawQuizzes = qRes?.data?.data ?? qRes?.data ?? [];
      const quizzes = (Array.isArray(rawQuizzes) ? rawQuizzes : []).filter((q) => q.status === "ACTIVE");

      // 2. Fetch group history for each quiz (parallel, max 10 at a time)
      const historyMap = {};
      const chunks = [];
      for (let i = 0; i < quizzes.length; i += 8) chunks.push(quizzes.slice(i, i + 8));
      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map((q) =>
            getGroupQuizHistory(workspaceId, q.quizId || q.id)
              .then((r) => [q.quizId || q.id, r?.data?.data ?? r?.data ?? null])
          )
        );
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value) {
            const [qid, data] = r.value;
            historyMap[qid] = data;
          }
        });
      }

      // 3. Aggregate
      const rows = buildAggregateRanking(historyMap);

      const scoreRows = [...rows].sort((a, b) => b.totalScore - a.totalScore);
      const countRows = [...rows].sort((a, b) => b.quizzesCompleted - a.quizzesCompleted);
      const timeRows = [...rows].sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

      setAggregated({ scoreRows, countRows, timeRows, quizCount: quizzes.length });
    } catch (err) {
      console.error("OverallRankingTab load error:", err);
      setError("Không thể tải dữ liệu xếp hạng.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-500";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <p className={`text-sm ${textMuted}`}>Đang tổng hợp dữ liệu từ tất cả các quiz…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <button type="button" onClick={load} className="text-xs underline text-[#0455BF]">Thử lại</button>
      </div>
    );
  }

  if (!aggregated) return null;

  if (aggregated.scoreRows.length === 0) {
    return (
      <div className={`text-center py-12 ${textMuted}`}>
        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Chưa có thành viên nào hoàn thành quiz nào cả.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Meta info */}
      <p className={`text-[11px] ${textMuted}`}>
        Tổng hợp từ {aggregated.quizCount} quiz đang hoạt động · {aggregated.scoreRows.length} thành viên tham gia
        <button type="button" onClick={load} className="ml-2 inline-flex items-center gap-0.5 underline opacity-60 hover:opacity-100">
          <RefreshCw className="w-3 h-3" /> Làm mới
        </button>
      </p>

      {/* Score ranking */}
      <AggCard
        icon={BarChart3}
        iconBg={isDarkMode ? "bg-blue-500/20" : "bg-[#EFF6FF]"}
        iconColor={isDarkMode ? "text-blue-300" : "text-[#0455BF]"}
        title="Tổng điểm cao nhất"
        subtitle="Cộng dồn điểm cao nhất của từng quiz"
        isDarkMode={isDarkMode}
      >
        <MiniTable
          rows={aggregated.scoreRows}
          valueKey="totalScore"
          valueFormat={(v) => formatScore(v) + " điểm"}
          isDarkMode={isDarkMode}
        />
      </AggCard>

      {/* Quiz count ranking */}
      <AggCard
        icon={ClipboardList}
        iconBg={isDarkMode ? "bg-emerald-500/20" : "bg-emerald-50"}
        iconColor={isDarkMode ? "text-emerald-300" : "text-emerald-600"}
        title="Hoàn thành nhiều quiz nhất"
        subtitle="Số lượng quiz đã hoàn thành ít nhất 1 lần"
        isDarkMode={isDarkMode}
      >
        <MiniTable
          rows={aggregated.countRows}
          valueKey="quizzesCompleted"
          valueFormat={(v) => `${v} quiz`}
          isDarkMode={isDarkMode}
        />
      </AggCard>

      {/* Time ranking */}
      <AggCard
        icon={Clock}
        iconBg={isDarkMode ? "bg-orange-500/20" : "bg-orange-50"}
        iconColor={isDarkMode ? "text-orange-300" : "text-orange-500"}
        title="Tổng thời gian làm bài"
        subtitle="Cộng dồn thời gian hoàn thành bài tốt nhất mỗi quiz"
        isDarkMode={isDarkMode}
      >
        <MiniTable
          rows={aggregated.timeRows}
          valueKey="totalTimeSeconds"
          valueFormat={formatTime}
          isDarkMode={isDarkMode}
        />
      </AggCard>
    </div>
  );
}

// ── Challenge Tab ──────────────────────────────────────────────────────────────
function ChallengeRankingTab({ workspaceId, isDarkMode }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaderboards, setLeaderboards] = useState({});
  const [loadingLb, setLoadingLb] = useState({});
  const [openId, setOpenId] = useState(null);

  const loadChallenges = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await listChallenges(workspaceId, "FINISHED");
      const data = res?.data?.data ?? res?.data ?? [];
      const arr = Array.isArray(data) ? data.slice(0, 30) : [];
      setChallenges(arr);
      if (arr.length > 0 && openId === null) setOpenId(arr[0].eventId || arr[0].id || arr[0].challengeEventId);
    } catch (e) {
      console.error("ChallengeRankingTab:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, openId]);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  const loadLeaderboard = useCallback(async (eid) => {
    if (leaderboards[eid] !== undefined || loadingLb[eid]) return;
    setLoadingLb((p) => ({ ...p, [eid]: true }));
    try {
      const res = await getChallengeLeaderboard(workspaceId, eid);
      const entries = res?.data?.entries ?? res?.data ?? [];
      const rows = (Array.isArray(entries) ? entries : [])
        .filter((e) => e.participantStatus === "FINISHED")
        .sort((a, b) => {
          const sd = Number(b.score ?? 0) - Number(a.score ?? 0);
          if (sd !== 0) return sd;
          return Number(a.completionTimeSeconds ?? Infinity) - Number(b.completionTimeSeconds ?? Infinity);
        });
      setLeaderboards((p) => ({ ...p, [eid]: rows }));
    } catch (e) {
      setLeaderboards((p) => ({ ...p, [eid]: [] }));
    } finally {
      setLoadingLb((p) => ({ ...p, [eid]: false }));
    }
  }, [workspaceId, leaderboards, loadingLb]);

  // Auto-load leaderboard when opening a challenge
  useEffect(() => {
    if (openId != null && leaderboards[openId] === undefined && !loadingLb[openId]) {
      loadLeaderboard(openId);
    }
  }, [openId, leaderboards, loadingLb, loadLeaderboard]);

  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-500";
  const border = isDarkMode ? "border-slate-700" : "border-[#BFDBFE]";
  const itemBg = isDarkMode ? "bg-slate-800/60 hover:bg-slate-700/40" : "bg-white hover:bg-[#EFF6FF]/60";
  const itemActiveBg = isDarkMode ? "bg-slate-800 border-blue-500/60" : "bg-[#EFF6FF] border-[#0455BF]";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <RefreshCw className={`w-5 h-5 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <span className={`text-sm ${textMuted}`}>Đang tải…</span>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className={`text-center py-12 ${textMuted}`}>
        <Swords className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Chưa có challenge nào kết thúc.</p>
      </div>
    );
  }

  const activeChallenge = challenges.find((c) => {
    const eid = c.eventId || c.id || c.challengeEventId;
    return eid === openId;
  });
  const activeLb = openId != null ? (leaderboards[openId] || []) : [];
  const isLoadingActiveLb = openId != null && loadingLb[openId];

  return (
    <div className="flex gap-3 min-h-[300px]">
      {/* Left: challenge list */}
      <div className={`w-44 shrink-0 space-y-1 border-r pr-3 ${border}`}>
        <p className={`text-[11px] font-semibold mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
          Challenges ({challenges.length})
        </p>
        {challenges.map((ch) => {
          const eid = ch.eventId || ch.id || ch.challengeEventId;
          const isActive = eid === openId;
          return (
            <button
              key={eid}
              type="button"
              onClick={() => setOpenId(eid)}
              className={`w-full text-left rounded-lg px-2.5 py-2 text-xs border transition-colors ${
                isActive
                  ? `${itemActiveBg} font-semibold`
                  : `${itemBg} border-transparent ${isDarkMode ? "text-slate-300" : "text-gray-600"}`
              }`}
            >
              <span className="line-clamp-2">{ch.title || ch.name || `Challenge #${eid}`}</span>
            </button>
          );
        })}
      </div>

      {/* Right: leaderboard */}
      <div className="flex-1 min-w-0">
        {activeChallenge && (
          <p className={`text-xs font-semibold mb-2 ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>
            {activeChallenge.title || activeChallenge.name}
          </p>
        )}

        {isLoadingActiveLb && (
          <div className="flex items-center gap-2 py-4">
            <RefreshCw className={`w-4 h-4 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
            <span className={`text-xs ${textMuted}`}>Đang tải…</span>
          </div>
        )}

        {!isLoadingActiveLb && activeLb.length === 0 && openId != null && (
          <p className={`text-xs ${textMuted} py-4`}>Chưa có người hoàn thành challenge này.</p>
        )}

        {!isLoadingActiveLb && activeLb.length > 0 && (
          <div className={`rounded-xl border overflow-hidden ${border}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${isDarkMode ? "border-slate-700 text-slate-400 bg-slate-800/60" : "border-[#BFDBFE] text-gray-400 bg-[#EFF6FF]/60"}`}>
                  <th className="px-3 py-2 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left font-medium">Thành viên</th>
                  <th className="px-3 py-2 text-right font-medium">Điểm</th>
                  <th className="px-3 py-2 text-right font-medium">TG</th>
                </tr>
              </thead>
              <tbody>
                {activeLb.map((entry, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr
                      key={entry.userId || idx}
                      className={`border-b last:border-b-0 transition-colors ${
                        isDarkMode ? "border-slate-700/30 hover:bg-slate-700/20" : "border-gray-50 hover:bg-[#EFF6FF]/30"
                      }`}
                    >
                      <td className="px-3 py-2">
                        {rank <= 3 ? (
                          <Medal className={`w-4 h-4 ${MEDAL_COLORS[rank - 1]}`} />
                        ) : (
                          <span className={isDarkMode ? "text-slate-400" : "text-gray-400"}>{rank}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {entry.avatar ? (
                            <img src={entry.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isDarkMode ? "bg-orange-500/20 text-orange-300" : "bg-orange-50 text-orange-600"}`}>
                              {(entry.fullName || entry.username || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <span className={`font-medium truncate max-w-[80px] ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {entry.fullName || entry.username}
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${
                        rank === 1 ? (isDarkMode ? "text-yellow-300" : "text-yellow-600") : (isDarkMode ? "text-slate-200" : "text-[#0455BF]")
                      }`}>
                        {entry.score ?? "-"}
                      </td>
                      <td className={`px-3 py-2 text-right ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
                        {formatTime(entry.completionTimeSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────
/**
 * GroupRankingTab
 * Tổng hợp xếp hạng chung của nhóm — KHÔNG phải per-quiz.
 * Per-quiz ranking nằm trong QuizDetailView (tab "Xếp hạng").
 *
 * Sub-tabs:
 *   • Tổng hợp — điểm tổng, số quiz hoàn thành, tổng thời gian
 *   • Challenge — bảng xếp hạng từng challenge đã kết thúc
 */
export default function GroupRankingTab({ workspaceId, isDarkMode = false }) {
  const [subTab, setSubTab] = useState("overall"); // "overall" | "challenge"

  const tabBtn = (key, label, Icon) => (
    <button
      type="button"
      onClick={() => setSubTab(key)}
      className={[
        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all",
        subTab === key
          ? isDarkMode
            ? "bg-slate-800 text-blue-300 shadow-sm"
            : "bg-white text-[#0455BF] shadow-sm"
          : isDarkMode
            ? "text-slate-400 hover:text-slate-200"
            : "text-gray-500 hover:text-gray-700",
      ].join(" ")}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className={`w-5 h-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-500"}`} />
        <h2 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
          Bảng xếp hạng nhóm
        </h2>
      </div>
      <p className={`text-xs -mt-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
        Xếp hạng tổng hợp toàn nhóm. Ranking theo từng quiz riêng xem trong tab "Xếp hạng" của từng bài.
      </p>

      {/* Sub-tabs */}
      <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800/80" : "bg-[#EFF6FF]"}`}>
        {tabBtn("overall", "Tổng hợp", BarChart3)}
        {tabBtn("challenge", "Challenge", Swords)}
      </div>

      {/* Content */}
      {subTab === "overall" && (
        <OverallRankingTab workspaceId={workspaceId} isDarkMode={isDarkMode} />
      )}
      {subTab === "challenge" && (
        <ChallengeRankingTab workspaceId={workspaceId} isDarkMode={isDarkMode} />
      )}
    </div>
  );
}
