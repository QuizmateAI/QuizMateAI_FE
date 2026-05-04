import React, { useCallback, useEffect, useState } from "react";
import { BookMarked, BookOpen, Crown, Medal, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { getGroupOverallRanking, getGroupRankingMemberDetail } from "@/api/GroupAPI";
import UserDisplayName from "@/components/features/users/UserDisplayName";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MEDAL_COLORS = ["text-yellow-400", "text-slate-400", "text-amber-600"];

const PODIUM_STYLES = {
  1: {
    row: {
      light: "bg-gradient-to-r from-amber-50 via-yellow-50 to-transparent",
      dark: "bg-gradient-to-r from-yellow-500/10 via-amber-400/5 to-transparent",
    },
    badge: {
      light: "border-yellow-200 bg-glitter-sheen bg-[length:200%_100%] text-yellow-800 shadow-sm shadow-yellow-200/80 animate-glitter-sheen",
      dark: "border-yellow-500/30 bg-glitter-sheen bg-[length:200%_100%] text-yellow-200 shadow-sm shadow-yellow-500/20 animate-glitter-sheen",
    },
    points: {
      light: "text-yellow-700",
      dark: "text-yellow-300",
    },
  },
  2: {
    row: {
      light: "bg-gradient-to-r from-slate-50 via-slate-100/80 to-transparent",
      dark: "bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent",
    },
    badge: {
      light: "border-slate-200 bg-slate-100 text-slate-700 animate-pulse",
      dark: "border-slate-500/30 bg-slate-400/10 text-slate-200 animate-pulse",
    },
    points: {
      light: "text-slate-700",
      dark: "text-slate-200",
    },
  },
  3: {
    row: {
      light: "bg-gradient-to-r from-orange-50 via-amber-50 to-transparent",
      dark: "bg-gradient-to-r from-amber-700/10 via-orange-500/5 to-transparent",
    },
    badge: {
      light: "border-amber-200 bg-amber-50 text-amber-700 animate-[rankingBronzeFloat_3.2s_ease-in-out_infinite]",
      dark: "border-amber-500/30 bg-amber-500/10 text-amber-200 animate-[rankingBronzeFloat_3.2s_ease-in-out_infinite]",
    },
    points: {
      light: "text-amber-700",
      dark: "text-amber-200",
    },
  },
};

function formatPoints(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
}

function PodiumTile({ row, rank, isDarkMode, t }) {
  const podium = PODIUM_STYLES[rank];
  const surface = podium
    ? (isDarkMode ? podium.row.dark : podium.row.light)
    : isDarkMode ? "bg-slate-900/50" : "bg-white";
  const badgeClass = podium
    ? (isDarkMode ? podium.badge.dark : podium.badge.light)
    : "";
  const pointsClass = podium
    ? (isDarkMode ? podium.points.dark : podium.points.light)
    : isDarkMode ? "text-slate-100" : "text-slate-900";

  // Top 1 nổi bật: ring vàng dày, gradient mạnh hơn, avatar to hơn, RP cỡ chữ to hơn
  const isChamp = rank === 1;
  const ringClass = isChamp
    ? (isDarkMode ? "ring-2 ring-yellow-500/50" : "ring-2 ring-yellow-400/70")
    : rank === 2
      ? (isDarkMode ? "ring-1 ring-slate-500/40" : "ring-1 ring-slate-300/70")
      : rank === 3
        ? (isDarkMode ? "ring-1 ring-amber-600/40" : "ring-1 ring-amber-300/70")
        : (isDarkMode ? "ring-1 ring-slate-700" : "ring-1 ring-slate-200");
  const avatarSize = isChamp ? "h-14 w-14 text-base" : "h-12 w-12 text-sm";
  const RankIcon = isChamp ? Crown : Medal;
  const rankIconColor = rank === 1
    ? (isDarkMode ? "text-yellow-300" : "text-yellow-500")
    : rank === 2
      ? (isDarkMode ? "text-slate-300" : "text-slate-500")
      : rank === 3
        ? (isDarkMode ? "text-amber-400" : "text-amber-600")
        : (isDarkMode ? "text-slate-400" : "text-slate-500");

  return (
    <button
      type="button"
      onClick={() => row?.onOpenDetail?.(row)}
      className={`group relative overflow-hidden rounded-2xl px-5 py-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${surface} ${ringClass}`}
      style={{ animation: `rankingTileIn 420ms ease-out both`, animationDelay: `${rank * 90}ms` }}
    >
      {isChamp ? (
        <span className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${isDarkMode ? "bg-yellow-400/10" : "bg-yellow-200/45"} animate-[rankingAura_3.8s_ease-in-out_infinite]`} />
      ) : null}

      <div className="relative mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass}`}>
          <RankIcon className={`h-3.5 w-3.5 ${rankIconColor}`} />
          {t(`groupWorkspace.ranking.topBadges.${rank}`)}
        </span>
        <span className={`font-black tabular-nums transition-transform duration-300 group-hover:scale-110 ${pointsClass} ${
          isChamp ? "text-2xl" : "text-xl"
        }`}>
          {formatPoints(row?.rankingPoints)}
          <span className={`ml-1 text-xs font-bold ${pointsClass}`}>RP</span>
        </span>
      </div>

      <div className="relative flex items-center gap-3">
        {row?.avatar ? (
          <img
            src={row.avatar}
            alt=""
            className={`${avatarSize} rounded-full object-cover shrink-0 transition-transform duration-300 group-hover:scale-105 ring-2 ${
              isDarkMode ? "ring-slate-700" : "ring-white"
            }`}
          />
        ) : (
          <div className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full font-bold ring-2 ${
            isDarkMode ? "bg-blue-500/20 text-blue-300 ring-slate-700" : "bg-[#EFF6FF] text-[#0455BF] ring-white"
          }`}>
            {(row?.fullName || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <UserDisplayName
            user={row}
            fallback="?"
            className={`block truncate ${isChamp ? "text-base font-bold" : "font-semibold"} ${
              isDarkMode ? "text-slate-100" : "text-gray-900"
            }`}
          />
          {row?.username ? (
            <p className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>@{row.username}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function FloatingDecorations({ isDarkMode }) {
  const iconTone = isDarkMode ? "text-yellow-300/25" : "text-amber-400/35";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <BookOpen className={`absolute left-6 top-6 h-5 w-5 ${iconTone} animate-[rankingFloatBook_6.4s_ease-in-out_infinite]`} />
      <BookMarked className={`absolute right-20 top-10 h-5 w-5 ${iconTone} animate-[rankingFloatBook_7.1s_ease-in-out_infinite]`} style={{ animationDelay: "0.8s" }} />
      <Sparkles className={`absolute left-1/3 top-4 h-4 w-4 ${iconTone} animate-[rankingSparkDrift_5.8s_ease-in-out_infinite]`} style={{ animationDelay: "0.4s" }} />
      <Sparkles className={`absolute right-10 bottom-6 h-4 w-4 ${iconTone} animate-[rankingSparkDrift_6.6s_ease-in-out_infinite]`} style={{ animationDelay: "1.1s" }} />
      <BookOpen className={`absolute bottom-5 left-10 h-4 w-4 ${iconTone} animate-[rankingFloatBook_6.9s_ease-in-out_infinite]`} style={{ animationDelay: "1.5s" }} />
    </div>
  );
}

function RankingDetailDialog({ open, onOpenChange, detail, loading, isDarkMode, t }) {
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";
  const panel = isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const chip = isDarkMode ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50";

  const sourceLabel = (sourceType) => {
    switch (String(sourceType || "").toUpperCase()) {
      case "MOCK_TEST":
        return t("groupWorkspace.ranking.detail.types.MOCK_TEST");
      case "ROADMAP":
        return t("groupWorkspace.ranking.detail.types.ROADMAP");
      default:
        return t("groupWorkspace.ranking.detail.types.REGULAR");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-3xl ${border} ${panel}`}>
        <DialogHeader>
          <DialogTitle>{t("groupWorkspace.ranking.detail.title")}</DialogTitle>
          <DialogDescription className={muted}>
            {t("groupWorkspace.ranking.detail.description")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <RefreshCw className={`h-6 w-6 animate-spin ${muted}`} />
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className={`rounded-lg border p-4 ${chip}`}>
              <div className="flex items-center gap-4">
                {detail.avatar ? (
                  <img src={detail.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-[#EFF6FF] text-[#0455BF]"}`}>
                    {(detail.fullName || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <UserDisplayName user={detail} fallback="?" className="truncate text-lg font-semibold" />
                  {detail.username ? <p className={`truncate text-sm ${muted}`}>@{detail.username}</p> : null}
                </div>
                <div className="text-right">
                  <p className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.currentRank")}</p>
                  <p className="text-lg font-semibold">#{detail.rank}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.totalRp")}</p>
                  <p className="text-xl font-semibold text-yellow-500">{formatPoints(detail.rankingPoints)} RP</p>
                </div>
                <div>
                  <p className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.breakdown.regular")}</p>
                  <p className="text-sm font-semibold">{formatPoints(detail.regularQuizPoints)} RP</p>
                </div>
                <div>
                  <p className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.breakdown.roadmap")}</p>
                  <p className="text-sm font-semibold">{formatPoints(detail.roadmapQuizPoints)} RP</p>
                </div>
                <div>
                  <p className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.breakdown.mockTest")}</p>
                  <p className="text-sm font-semibold">{formatPoints(detail.mockTestPoints)} RP</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{t("groupWorkspace.ranking.detail.evidenceTitle")}</h3>
                <span className={`text-xs ${muted}`}>{t("groupWorkspace.ranking.detail.evidenceHint")}</span>
              </div>

              {Array.isArray(detail.evidenceItems) && detail.evidenceItems.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {detail.evidenceItems.map((item) => (
                    <div key={`${item.quizId}-${item.completedAt || ""}`} className={`rounded-lg border p-3 ${chip}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.quizTitle}</p>
                          <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${muted}`}>
                            <span>{sourceLabel(item.sourceType)}</span>
                            {item.accuracyPercent != null ? <span>{Math.round(Number(item.accuracyPercent) * 10) / 10}%</span> : null}
                            {item.completedAt ? <span>{new Date(item.completedAt).toLocaleString()}</span> : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-yellow-500">
                            {item.rankingPoints >= 0 ? "+" : ""}{formatPoints(item.rankingPoints)} RP
                          </p>
                          <p className={`text-xs ${muted}`}>
                            {t("groupWorkspace.ranking.detail.formula", {
                              base: item.basePoints ?? 0,
                              bonus: item.bonusPoints ?? 0 ? `${item.bonusPoints >= 0 ? "+" : ""}${item.bonusPoints}` : "0",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-lg border p-6 text-sm ${chip}`}>
                  {t("groupWorkspace.ranking.detail.empty")}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RankingHighlights({ rows, isDarkMode, t, onOpenDetail }) {
  const border = isDarkMode ? "border-slate-700" : "border-[#BFDBFE]";
  const panelBg = isDarkMode ? "bg-slate-900/50" : "bg-white";
  const topThree = rows.slice(0, 3);

  return (
    <section className={`relative overflow-hidden rounded-lg border px-4 py-4 ${border} ${panelBg}`}>
      <FloatingDecorations isDarkMode={isDarkMode} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
            {t("groupWorkspace.ranking.podiumTitle")}
          </p>
          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            {t("groupWorkspace.ranking.podiumSubtitle")}
          </p>
        </div>
        <Trophy className={`h-5 w-5 shrink-0 ${isDarkMode ? "text-yellow-300" : "text-yellow-500"}`} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {topThree.map((row, index) => (
          <PodiumTile
            key={row.userId}
            row={{ ...row, onOpenDetail }}
            rank={index + 1}
            isDarkMode={isDarkMode}
            t={t}
          />
        ))}
      </div>
    </section>
  );
}

function RankingTable({ rows, isDarkMode, t, onOpenDetail }) {
  const border = isDarkMode ? "border-slate-700" : "border-[#BFDBFE]";
  const headerBg = isDarkMode ? "bg-slate-800/80 text-slate-300" : "bg-white text-gray-600";
  const rowBorder = isDarkMode ? "border-slate-700/40" : "border-[#E0ECFF]";
  const rowHover = isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-[#EFF6FF]/50";
  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-400";
  const textPrimary = isDarkMode ? "text-slate-100" : "text-gray-900";

  return (
    <div className={`overflow-hidden rounded-xl border ${border}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${border} ${headerBg}`}>
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${isDarkMode ? "text-yellow-300" : "text-yellow-500"}`} />
          <span className={`text-sm font-semibold ${textPrimary}`}>{t("groupWorkspace.ranking.tableTitle")}</span>
        </div>
        <span className={`text-[11px] ${textMuted}`}>{t("groupWorkspace.ranking.priority")}</span>
      </div>

      <div className={`overflow-x-auto ${isDarkMode ? "bg-slate-900/40" : "bg-[#EFF6FF]/25"}`}>
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className={`border-b ${rowBorder} ${headerBg}`}>
              <th className="w-14 px-4 py-3 text-left text-xs font-semibold">{t("groupWorkspace.ranking.columns.rank")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold">{t("groupWorkspace.ranking.columns.member")}</th>
              <th className="w-28 px-4 py-3 text-right text-xs font-semibold">{t("groupWorkspace.ranking.columns.points")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rank = index + 1;
              const podium = PODIUM_STYLES[rank] ?? null;
              const rowHighlight = podium
                ? (isDarkMode ? podium.row.dark : podium.row.light)
                : "";
              const badgeClass = podium
                ? (isDarkMode ? podium.badge.dark : podium.badge.light)
                : "";
              const pointsClass = podium
                ? (isDarkMode ? podium.points.dark : podium.points.light)
                : textPrimary;
              return (
                <tr
                  key={row.userId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDetail?.(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenDetail?.(row);
                    }
                  }}
                  className={`border-b last:border-b-0 transition-colors cursor-pointer ${rowBorder} ${rowHover} ${rowHighlight}`}
                >
                  <td className="px-4 py-3">
                    {rank === 1 ? (
                      <Crown className={`h-6 w-6 ${MEDAL_COLORS[0]} drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]`} />
                    ) : rank <= 3 ? (
                      <Medal className={`h-6 w-6 ${MEDAL_COLORS[rank - 1]}`} />
                    ) : (
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums ${
                        isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                      }`}>{rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {row.avatar ? (
                        <img src={row.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDarkMode ? "bg-blue-500/20 text-blue-300" : "bg-[#EFF6FF] text-[#0455BF]"}`}>
                          {(row.fullName || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserDisplayName user={row} fallback="?" className={`truncate font-medium ${textPrimary}`} />
                          {rank <= 3 ? (
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                              {t(`groupWorkspace.ranking.topBadges.${rank}`)}
                            </span>
                          ) : null}
                        </div>
                        {row.username ? <p className={`truncate text-xs ${textMuted}`}>@{row.username}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums text-base ${pointsClass}`}>
                    {formatPoints(row.rankingPoints)}
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

function OverallRankingTab({ workspaceId, isDarkMode }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getGroupOverallRanking(workspaceId);
      const data = res?.data?.data ?? res?.data ?? {};
      setRanking({
        members: Array.isArray(data.members) ? data.members : [],
        quizCount: data.quizCount ?? 0,
      });
    } catch (err) {
      console.error("OverallRankingTab load error:", err);
      setError(t("groupWorkspace.ranking.error"));
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (member) => {
    if (!workspaceId || !member?.userId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await getGroupRankingMemberDetail(workspaceId, member.userId);
      const data = res?.data?.data ?? res?.data ?? null;
      setDetailData(data);
    } catch (err) {
      console.error("Ranking detail load error:", err);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [workspaceId]);

  const textMuted = isDarkMode ? "text-slate-400" : "text-gray-500";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <RefreshCw className={`h-6 w-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-[#0455BF]"}`} />
        <p className={`text-sm ${textMuted}`}>{t("groupWorkspace.ranking.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10">
        <p className="text-sm text-red-500">{error}</p>
        <button type="button" onClick={load} className="text-xs underline text-[#0455BF]">
          {t("groupWorkspace.ranking.retry")}
        </button>
      </div>
    );
  }

  if (!ranking) return null;

  if (!ranking.members || ranking.members.length === 0) {
    return (
      <div className={`flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center ${textMuted}`}>
        <Trophy className={`mb-3 h-12 w-12 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
        <p className="text-sm">{t("groupWorkspace.ranking.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RankingHighlights
        rows={ranking.members}
        isDarkMode={isDarkMode}
        t={t}
        onOpenDetail={openDetail}
      />

      <RankingTable rows={ranking.members} isDarkMode={isDarkMode} t={t} onOpenDetail={openDetail} />
      <RankingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detail={detailData}
        loading={detailLoading}
        isDarkMode={isDarkMode}
        t={t}
      />
    </div>
  );
}

export default function GroupRankingTab({ workspaceId, isDarkMode = false }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 p-4">
      <style>{`
        @keyframes rankingBronzeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes rankingFloatBook {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.45; }
          50% { transform: translateY(-8px) rotate(6deg); opacity: 0.9; }
        }
        @keyframes rankingSparkDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.95); opacity: 0.25; }
          50% { transform: translate3d(8px, -10px, 0) scale(1.08); opacity: 0.75; }
        }
        @keyframes rankingAura {
          0%, 100% { transform: scale(0.92); opacity: 0.4; }
          50% { transform: scale(1.06); opacity: 0.8; }
        }
        @keyframes rankingTileIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="flex items-center gap-2">
        <Trophy className={`h-5 w-5 ${isDarkMode ? "text-yellow-400" : "text-yellow-500"}`} />
        <h2 className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
          {t("groupWorkspace.ranking.title")}
        </h2>
      </div>
      <p className={`-mt-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
        {t("groupWorkspace.ranking.description")}
      </p>

      <OverallRankingTab workspaceId={workspaceId} isDarkMode={isDarkMode} />
    </div>
  );
}
