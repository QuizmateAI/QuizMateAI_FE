import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Users } from 'lucide-react';
import { getChallengeTeams } from '@/api/ChallengeAPI';

function fmt(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString();
}
function fmtTime(sec) {
  if (sec == null) return '-';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function ChallengeTeamScoreboard({ workspaceId, eventId, isDarkMode }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['challenge-teams', workspaceId, eventId],
    queryFn: async () => (await getChallengeTeams(workspaceId, eventId))?.data?.data ?? null,
    enabled: Boolean(workspaceId && eventId),
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const teams = data.teams || [];
  const winning = data.winningTeamNumber;
  const finished = String(data.status) === 'FINISHED';

  const cardCls = (active) =>
    `rounded-2xl border p-4 transition-colors ${
      active
        ? (isDarkMode ? 'border-amber-500/60 bg-amber-500/10' : 'border-amber-400 bg-amber-50')
        : (isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-white')
    }`;

  return (
    <div className="flex flex-col gap-3">
      {finished && winning != null && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
          isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-700'
        }`}>
          <Crown className="h-4 w-4" />
          {t('challengeTeams.winnerLabel', { team: winning, defaultValue: 'Đội {{team}} chiến thắng' })}
        </div>
      )}
      {finished && winning == null && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}>
          {t('challengeTeams.draw', 'Hoà — không có đội thắng')}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {teams.map((team) => {
          const isWinner = finished && winning === team.teamNumber;
          return (
            <div key={team.teamNumber} className={cardCls(isWinner)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    isWinner
                      ? 'bg-amber-500 text-white'
                      : (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600')
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {team.teamName || `Đội ${team.teamNumber}`}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {team.finishedCount}/{team.memberCount} {t('challengeTeams.finished', 'đã hoàn thành')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {fmt(team.totalScore)}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {fmtTime(team.totalCompletionTimeSeconds)}
                  </div>
                </div>
              </div>

              <ul className="mt-3 flex flex-col gap-1.5">
                {(team.members || []).map((m) => (
                  <li key={m.participantId} className={`flex items-center justify-between text-xs ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <span className="truncate">{m.fullName || m.username || '—'}</span>
                    <span className="tabular-nums opacity-80">
                      {m.score != null ? fmt(m.score) : '—'} · {fmtTime(m.completionTimeSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {(data.benched || []).length > 0 && (
        <div className={`rounded-xl border border-dashed p-3 text-xs ${
          isDarkMode ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500'
        }`}>
          {t('challengeTeams.benchHint', 'Bench (số lẻ → không tính điểm):')}{' '}
          {data.benched.map((b) => b.fullName || b.username).join(', ')}
        </div>
      )}
    </div>
  );
}
