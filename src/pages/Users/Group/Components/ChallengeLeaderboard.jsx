import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getChallengeLeaderboard } from '../../../../api/ChallengeAPI';
import { Trophy, Medal, Clock, Crown, Star } from 'lucide-react';
import UserDisplayName from '@/components/features/users/UserDisplayName';

function formatTime(seconds) {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatScore(score, scoreIsPercent) {
  if (score == null) return '-';
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return '-';
  const formatted = Number.isInteger(numeric)
    ? numeric.toLocaleString()
    : numeric.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return scoreIsPercent ? `${formatted}%` : formatted;
}

/**
 * Tier zones (rank-based):
 *  rank 1     → CHAMPION  (gold crown, glow)
 *  rank 2-3   → PODIUM    (silver/bronze medals)
 *  rank 4-10  → GOLD ZONE (top performers)
 *  rank 11-25 → SILVER ZONE
 *  rank 26+   → BRONZE ZONE
 */
function resolveRankTier(rank) {
  if (rank == null) return null;
  if (rank === 1) return 'CHAMPION';
  if (rank <= 3) return 'PODIUM';
  if (rank <= 10) return 'GOLD';
  if (rank <= 25) return 'SILVER';
  return 'BRONZE';
}

const TIER_ZONE_PRESETS = {
  GOLD: {
    label: { vi: 'Vùng vàng', en: 'Gold zone' },
    light: 'border-amber-300/60 bg-gradient-to-r from-amber-50/80 to-yellow-50/40',
    dark: 'border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-yellow-900/10',
    text: 'text-amber-700 dark:text-amber-300',
    icon: Crown,
  },
  SILVER: {
    label: { vi: 'Vùng bạc', en: 'Silver zone' },
    light: 'border-slate-300/60 bg-gradient-to-r from-slate-50/80 to-slate-100/40',
    dark: 'border-slate-500/30 bg-gradient-to-r from-slate-700/20 to-slate-800/10',
    text: 'text-slate-600 dark:text-slate-300',
    icon: Star,
  },
  BRONZE: {
    label: { vi: 'Vùng đồng', en: 'Bronze zone' },
    light: 'border-orange-300/40 bg-gradient-to-r from-orange-50/40 to-amber-50/20',
    dark: 'border-orange-700/20 bg-gradient-to-r from-orange-900/10 to-amber-900/5',
    text: 'text-orange-700 dark:text-orange-300',
    icon: Medal,
  },
};

function PodiumCard({ entry, position, isDarkMode, t, scoreIsPercent }) {
  // position 1 = champion, 2 = silver, 3 = bronze
  const presets = {
    1: {
      crown: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]',
      ring: isDarkMode ? 'ring-yellow-500/60 from-amber-900/40 via-yellow-900/30 to-amber-900/40' : 'ring-yellow-400/60 from-amber-100 via-yellow-50 to-amber-100',
      label: t('challengeLeaderboard.podium.champion', 'Champion'),
      size: 'order-2 md:scale-110',
      iconSize: 'h-12 w-12',
      avatarSize: 'h-16 w-16 text-xl',
    },
    2: {
      crown: 'text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]',
      ring: isDarkMode ? 'ring-slate-400/40 from-slate-700/50 to-slate-800/40' : 'ring-slate-300/60 from-slate-100 to-slate-50',
      label: t('challengeLeaderboard.podium.silver', '2nd place'),
      size: 'order-1',
      iconSize: 'h-10 w-10',
      avatarSize: 'h-14 w-14 text-lg',
    },
    3: {
      crown: 'text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]',
      ring: isDarkMode ? 'ring-amber-700/40 from-amber-900/30 to-orange-900/20' : 'ring-orange-300/60 from-orange-50 to-amber-50',
      label: t('challengeLeaderboard.podium.bronze', '3rd place'),
      size: 'order-3',
      iconSize: 'h-10 w-10',
      avatarSize: 'h-14 w-14 text-lg',
    },
  };
  const preset = presets[position];
  const Icon = position === 1 ? Crown : Medal;
  const isFinished = entry.participantStatus === 'FINISHED';

  return (
    <div className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-4 ring-2 ${preset.ring} ${preset.size}`}>
      <Icon className={`${preset.iconSize} ${preset.crown}`} />

      {entry.avatar ? (
        <img src={entry.avatar} alt="" className={`${preset.avatarSize} rounded-full object-cover ring-2 ${isDarkMode ? 'ring-slate-700' : 'ring-white'}`} />
      ) : (
        <div className={`flex ${preset.avatarSize} items-center justify-center rounded-full font-bold ring-2 ${
          isDarkMode ? 'bg-orange-500/20 text-orange-200 ring-slate-700' : 'bg-orange-100 text-orange-700 ring-white'
        }`}>
          {(entry.fullName || entry.username || '?')[0].toUpperCase()}
        </div>
      )}

      <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {preset.label}
      </span>

      <span className={`text-center text-sm font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <UserDisplayName user={entry} fallback={t('challengeLeaderboard.memberFallback', 'Thành viên')} isDarkMode={isDarkMode} />
      </span>

      {isFinished && (
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <span className={`font-mono text-lg font-bold tabular-nums ${
            position === 1
              ? 'text-amber-500'
              : position === 2
                ? (isDarkMode ? 'text-slate-200' : 'text-slate-600')
                : (isDarkMode ? 'text-orange-300' : 'text-orange-600')
          }`}>
            {formatScore(entry.score, scoreIsPercent || entry.scoreIsPercent)}
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Clock className="h-3 w-3" />
            {formatTime(entry.completionTimeSeconds)}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, isDarkMode, t }) {
  const presets = {
    FINISHED: { light: 'bg-emerald-50 text-emerald-700 ring-emerald-300/60', dark: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/40', label: t('challengeLeaderboard.statusFinished', 'Hoàn thành') },
    PLAYING: { light: 'bg-blue-50 text-blue-700 ring-blue-300/60', dark: 'bg-blue-500/15 text-blue-200 ring-blue-500/40', label: t('challengeLeaderboard.statusPlaying', 'Đang làm') },
    WAITING: { light: 'bg-slate-100 text-slate-600 ring-slate-300/60', dark: 'bg-slate-700/40 text-slate-300 ring-slate-500/40', label: t('challengeLeaderboard.statusWaiting', 'Chờ') },
  };
  const p = presets[status] || presets.WAITING;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${isDarkMode ? p.dark : p.light}`}>
      {p.label}
    </span>
  );
}

function LeaderRow({ entry, isDarkMode, t, scoreIsPercent }) {
  const isFinished = entry.participantStatus === 'FINISHED';
  return (
    <tr className={`border-b last:border-b-0 transition-colors ${
      isDarkMode ? 'border-slate-700/40 hover:bg-slate-700/20' : 'border-slate-100 hover:bg-slate-50/70'
    }`}>
      <td className="px-4 py-3">
        <span className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-2 font-mono text-sm font-bold tabular-nums ${
          isDarkMode ? 'bg-slate-700/60 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}>
          {isFinished && entry.rank != null ? entry.rank : '-'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {entry.avatar ? (
            <img src={entry.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              isDarkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-600'
            }`}>
              {(entry.fullName || entry.username || '?')[0].toUpperCase()}
            </div>
          )}
          <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <UserDisplayName user={entry} fallback={t('challengeLeaderboard.memberFallback', 'Thành viên')} isDarkMode={isDarkMode} />
          </span>
        </div>
      </td>
      <td className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
        isFinished
          ? (isDarkMode ? 'text-orange-300' : 'text-orange-600')
          : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
      }`}>
        {isFinished ? formatScore(entry.score, scoreIsPercent || entry.scoreIsPercent) : '-'}
      </td>
      <td className={`px-4 py-3 text-right font-mono tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {isFinished ? formatTime(entry.completionTimeSeconds) : '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <StatusPill status={entry.participantStatus} isDarkMode={isDarkMode} t={t} />
      </td>
    </tr>
  );
}

function ZoneSection({ zoneKey, entries, isDarkMode, t, scoreIsPercent, language }) {
  if (!entries.length) return null;
  const preset = TIER_ZONE_PRESETS[zoneKey];
  const Icon = preset.icon;
  const localized = preset.label[language?.startsWith('en') ? 'en' : 'vi'];

  return (
    <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? preset.dark : preset.light}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2 ${isDarkMode ? 'border-slate-700/40' : 'border-slate-200/60'}`}>
        <Icon className={`h-4 w-4 ${preset.text}`} />
        <h4 className={`text-xs font-bold uppercase tracking-wider ${preset.text}`}>{localized}</h4>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums ${
          isDarkMode ? 'bg-slate-800/70 text-slate-300' : 'bg-white/80 text-slate-600'
        }`}>
          {entries.length}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {entries.map((entry) => (
            <LeaderRow key={entry.userId} entry={entry} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChallengeLeaderboard({ workspaceId, eventId, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const { data: leaderboard } = useQuery({
    queryKey: ['challenge-leaderboard', workspaceId, eventId],
    queryFn: async () => {
      const res = await getChallengeLeaderboard(workspaceId, eventId);
      return res.data;
    },
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 15000,
  });

  const entries = useMemo(() => leaderboard?.entries || [], [leaderboard]);
  const scoreIsPercent = entries.some((e) => e?.scoreIsPercent);
  const scoreHeaderLabel = scoreIsPercent
    ? t('challengeLeaderboard.accuracyHeader', 'Tỉ lệ đúng')
    : t('challengeLeaderboard.scoreHeader', 'Điểm');

  // Bucket finished entries into tier zones; keep non-finished separate at the bottom
  const buckets = useMemo(() => {
    const top3 = [];
    const goldZone = [];
    const silverZone = [];
    const bronzeZone = [];
    const pendingTail = [];
    entries.forEach((entry) => {
      if (entry.participantStatus !== 'FINISHED' || entry.rank == null) {
        pendingTail.push(entry);
        return;
      }
      const tier = resolveRankTier(entry.rank);
      if (tier === 'CHAMPION' || tier === 'PODIUM') top3.push(entry);
      else if (tier === 'GOLD') goldZone.push(entry);
      else if (tier === 'SILVER') silverZone.push(entry);
      else bronzeZone.push(entry);
    });
    top3.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    return { top3, goldZone, silverZone, bronzeZone, pendingTail };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={`rounded-2xl border p-10 text-center text-sm ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}>
        <Trophy className="mx-auto mb-3 h-12 w-12 opacity-40" />
        <p className="font-medium">{t('challengeLeaderboard.empty', 'Chưa có người tham gia')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Podium for top-3 finished (only show when at least 1 finished) */}
      {buckets.top3.length > 0 && (
        <div className={`rounded-3xl p-5 ring-1 ${
          isDarkMode
            ? 'bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-amber-900/20 ring-slate-700'
            : 'bg-gradient-to-br from-white via-amber-50/30 to-amber-50/60 ring-amber-200/60'
        }`}>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-amber-200' : 'text-amber-700'}`}>
              {t('challengeLeaderboard.podiumTitle', 'Bục vinh quang')}
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {buckets.top3.map((entry) => (
              <PodiumCard
                key={entry.userId}
                entry={entry}
                position={entry.rank}
                isDarkMode={isDarkMode}
                t={t}
                scoreIsPercent={scoreIsPercent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tier zones for ranks 4+ */}
      <ZoneSection zoneKey="GOLD" entries={buckets.goldZone} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} language={i18n.language} />
      <ZoneSection zoneKey="SILVER" entries={buckets.silverZone} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} language={i18n.language} />
      <ZoneSection zoneKey="BRONZE" entries={buckets.bronzeZone} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} language={i18n.language} />

      {/* Header table for context if no podium yet */}
      {buckets.top3.length === 0 && entries.length > 0 && (
        <div className={`overflow-hidden rounded-2xl border ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={isDarkMode ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-gray-100 bg-gray-50'}>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">{t('challengeLeaderboard.memberHeader', 'Thành viên')}</th>
                <th className="px-4 py-3 text-right font-medium">{scoreHeaderLabel}</th>
                <th className="px-4 py-3 text-right font-medium">{t('challengeLeaderboard.timeHeader', 'Thời gian')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('challengeLeaderboard.statusHeader', 'Trạng thái')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <LeaderRow key={entry.userId} entry={entry} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending tail — players not yet finished */}
      {buckets.pendingTail.length > 0 && (
        <div className={`overflow-hidden rounded-2xl border ${
          isDarkMode ? 'border-slate-700/60 bg-slate-800/30' : 'border-slate-200/80 bg-slate-50/50'
        }`}>
          <div className={`border-b px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
            isDarkMode ? 'border-slate-700/60 text-slate-400' : 'border-slate-200/80 text-slate-500'
          }`}>
            {t('challengeLeaderboard.pendingTitle', 'Đang tham gia')} ({buckets.pendingTail.length})
          </div>
          <table className="w-full text-sm">
            <tbody>
              {buckets.pendingTail.map((entry) => (
                <LeaderRow key={entry.userId} entry={entry} isDarkMode={isDarkMode} t={t} scoreIsPercent={scoreIsPercent} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`px-4 py-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        {t('challengeLeaderboard.sortHint', 'Xếp hạng theo kết quả cao nhất; cùng kết quả thì ai hoàn thành sớm hơn đứng trên.')}
      </div>
    </div>
  );
}
