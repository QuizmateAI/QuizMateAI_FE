import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getChallengeLeaderboard } from '../../../../api/ChallengeAPI';
import { Trophy, Medal, Clock } from 'lucide-react';
import UserDisplayName from '@/Components/users/UserDisplayName';

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

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];

export default function ChallengeLeaderboard({ workspaceId, eventId, isDarkMode }) {
  const { t } = useTranslation();
  const { data: leaderboard } = useQuery({
    queryKey: ['challenge-leaderboard', workspaceId, eventId],
    queryFn: async () => {
      const res = await getChallengeLeaderboard(workspaceId, eventId);
      return res.data;
    },
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 15000,
  });

  const entries = leaderboard?.entries || [];
  const scoreIsPercent = entries.some((e) => e?.scoreIsPercent);
  const scoreHeaderLabel = scoreIsPercent
    ? t('challengeLeaderboard.accuracyHeader', 'Tỉ lệ đúng')
    : t('challengeLeaderboard.scoreHeader', 'Điểm');

  if (entries.length === 0) {
    return (
      <div className={`rounded-xl border p-6 text-center text-sm ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'
      }`}>
        <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
        {t('challengeLeaderboard.empty', 'Chưa có người tham gia')}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border ${
      isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-white'
    }`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={isDarkMode ? 'border-b border-slate-700 bg-slate-800' : 'border-b border-gray-100 bg-gray-50'}>
            <th className="px-4 py-3 text-left font-medium">#</th>
            <th className="px-4 py-3 text-left font-medium">{t('challengeLeaderboard.memberHeader', 'Thành viên')}</th>
            <th
              className="px-4 py-3 text-right font-medium"
              title={t('challengeLeaderboard.sortTooltip', 'Xếp hạng theo kết quả; cùng kết quả thì ai hoàn thành nhanh hơn xếp trên.')}
            >
              {scoreHeaderLabel}
            </th>
            <th className="px-4 py-3 text-right font-medium">{t('challengeLeaderboard.timeHeader', 'Thời gian')}</th>
            <th className="px-4 py-3 text-center font-medium">{t('challengeLeaderboard.statusHeader', 'Trạng thái')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isFinished = entry.participantStatus === 'FINISHED';
            return (
              <tr
                key={entry.userId}
                className={`border-b last:border-b-0 transition-colors ${
                  isDarkMode ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-50 hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3">
                  {isFinished && entry.rank != null && entry.rank <= 3 ? (
                    <Medal className={`h-5 w-5 ${MEDAL_COLORS[entry.rank - 1]}`} />
                  ) : (
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
                      {isFinished ? entry.rank : '-'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
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
                <td className={`px-4 py-3 text-right font-semibold ${
                  isFinished
                    ? (isDarkMode ? 'text-orange-300' : 'text-orange-600')
                    : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
                }`}>
                  {isFinished ? formatScore(entry.score, entry.scoreIsPercent) : '-'}
                </td>
                <td className={`px-4 py-3 text-right ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <div className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {isFinished ? formatTime(entry.completionTimeSeconds) : '-'}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    entry.participantStatus === 'FINISHED'
                      ? (isDarkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-50 text-green-700')
                      : entry.participantStatus === 'PLAYING'
                        ? (isDarkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700')
                        : (isDarkMode ? 'bg-slate-600/30 text-slate-400' : 'bg-gray-100 text-gray-500')
                  }`}>
                    {entry.participantStatus === 'FINISHED' ? t('challengeLeaderboard.statusFinished', 'Hoàn thành')
                      : entry.participantStatus === 'PLAYING' ? t('challengeLeaderboard.statusPlaying', 'Đang làm')
                      : t('challengeLeaderboard.statusWaiting', 'Chờ')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={`border-t px-4 py-2 text-xs ${isDarkMode ? 'border-slate-700 text-slate-500' : 'border-gray-100 text-gray-500'}`}>
        {t('challengeLeaderboard.sortHint', 'Xếp hạng theo kết quả cao nhất; cùng kết quả thì ai hoàn thành sớm hơn đứng trên.')}
      </div>
    </div>
  );
}
