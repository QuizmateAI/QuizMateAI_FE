import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Crown, Loader2, Zap, Trophy } from 'lucide-react';
import { getChallengeBracket } from '@/api/ChallengeAPI';

function statusBadge(status, isDarkMode) {
  const base = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider';
  switch (status) {
    case 'LIVE':
      return `${base} ${isDarkMode ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`;
    case 'BLITZ_TIEBREAK':
      return `${base} ${isDarkMode ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-700'}`;
    case 'FINISHED':
      return `${base} ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`;
    case 'BYE':
      return `${base} ${isDarkMode ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`;
    default:
      return `${base} ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`;
  }
}

function PlayerRow({ player, isWinner, isDarkMode }) {
  if (!player) {
    return (
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
        isDarkMode ? 'bg-slate-900/40 text-slate-500' : 'bg-gray-50 text-gray-400'
      }`}>
        <span>—</span>
        <span>—</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
      isWinner
        ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-100' : 'bg-emerald-50 text-emerald-900')
        : (isDarkMode ? 'bg-slate-800/60 text-slate-200' : 'bg-white text-slate-800')
    }`}>
      <div className="flex min-w-0 items-center gap-2">
        {player.seed != null && (
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
            isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
          }`}>
            #{player.seed}
          </span>
        )}
        <div className="min-w-0">
          <span className="truncate block">{player.fullName || '—'}</span>
          {player.username && (
            <span className={`block truncate text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              @{player.username}
            </span>
          )}
        </div>
      </div>
      <span className={`shrink-0 tabular-nums text-xs ${isWinner ? 'font-bold' : 'opacity-80'}`}>
        {player.score != null ? Number(player.score).toLocaleString() : '—'}
      </span>
    </div>
  );
}

export default function ChallengeBracketView({ workspaceId, eventId, isDarkMode }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['challenge-bracket', workspaceId, eventId],
    queryFn: async () => (await getChallengeBracket(workspaceId, eventId))?.data?.data ?? null,
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

  const rounds = data.rounds || [];
  const champion = data.championParticipantId
    ? { id: data.championParticipantId, name: data.championFullName || data.championUsername }
    : null;

  return (
    <div className="flex flex-col gap-4">
      {champion && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
          isDarkMode ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-700'
        }`}>
          <Crown className="h-4 w-4" />
          {t('challengeBracket.championLabel', { name: champion.name, defaultValue: 'Vô địch: {{name}}' })}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {rounds.map((round) => (
            <div key={round.round} className="w-[260px] shrink-0 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Trophy className={`h-3.5 w-3.5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {round.roundLabel}
                </h4>
              </div>

              <div className="flex flex-col gap-3">
                {(round.matches || []).map((m) => {
                  const winnerId = m.winnerParticipantId;
                  const isP1Winner = winnerId && m.player1 && m.player1.participantId === winnerId;
                  const isP2Winner = winnerId && m.player2 && m.player2.participantId === winnerId;
                  return (
                    <div
                      key={m.matchId}
                      className={`rounded-xl border p-2.5 ${
                        isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          Match #{m.matchIndex + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {m.blitzInProgress && (
                            <Zap className={`h-3 w-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                          )}
                          <span className={statusBadge(m.status, isDarkMode)}>
                            {m.status === 'BLITZ_TIEBREAK' ? 'BLITZ' : m.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <PlayerRow player={m.player1} isWinner={isP1Winner} isDarkMode={isDarkMode} />
                        <div className={`text-center text-[10px] uppercase tracking-wider ${
                          isDarkMode ? 'text-slate-500' : 'text-gray-400'
                        }`}>vs</div>
                        <PlayerRow player={m.player2} isWinner={isP2Winner} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
