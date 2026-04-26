import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Users, Clock, ChevronRight, Zap, Trophy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCountdown(diff, t) {
  if (diff <= 0) {
    return t('groupWorkspace.challenge.list.started');
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (days > 0) {
    return t('groupWorkspace.challenge.list.countdownWithDays', {
      days,
      hours,
      minutes,
      seconds,
      defaultValue: '{{days}}d {{hours}}h {{minutes}}m {{seconds}}s',
    });
  }

  if (hours > 0) {
    return t('groupWorkspace.challenge.list.countdownWithHours', {
      hours,
      minutes,
      seconds,
      defaultValue: '{{hours}}h {{minutes}}m {{seconds}}s',
    });
  }

  return t('groupWorkspace.challenge.list.countdownWithMinutes', {
    minutes,
    seconds,
    defaultValue: '{{minutes}}m {{seconds}}s',
  });
}

function useCountdown(targetTime) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!targetTime) return undefined;

    const tick = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      setRemaining(formatCountdown(diff, t));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime, t]);

  return remaining;
}

const STATUS_CONFIG = {
  SCHEDULED: { labelKey: 'groupWorkspace.challenge.phase.SCHEDULED', color: 'orange', icon: Clock },
  LIVE: { labelKey: 'groupWorkspace.challenge.phase.LIVE', color: 'green', icon: Zap },
  FINISHED: { labelKey: 'groupWorkspace.challenge.phase.FINISHED', color: 'slate', icon: Trophy },
  CANCELLED: { labelKey: 'groupWorkspace.challenge.phase.CANCELLED', color: 'red', icon: null },
};

const MATCH_MODE_LABELS = {
  FREE_FOR_ALL: { key: 'groupWorkspace.challenge.modes.freeForAll', fallback: 'Free-for-all' },
  TEAM_BATTLE: { key: 'groupWorkspace.challenge.modes.teamBattle', fallback: 'Team battle' },
  SOLO_BRACKET: { key: 'groupWorkspace.challenge.modes.soloBracket', fallback: '1v1 bracket' },
};

function formatDateTime(dt, language) {
  if (!dt) return '-';
  const locale = language?.startsWith('en') ? 'en-US' : 'vi-VN';
  const date = new Date(dt);
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' '
    + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function ChallengeCard({ challenge, isDarkMode, onSelect }) {
  const { t, i18n } = useTranslation();
  const cfg = STATUS_CONFIG[challenge.status] || STATUS_CONFIG.SCHEDULED;
  const countdown = useCountdown(challenge.status === 'SCHEDULED' ? challenge.startTime : null);
  const StatusIcon = cfg.icon;
  const modeLabel = MATCH_MODE_LABELS[challenge.matchMode] || MATCH_MODE_LABELS.FREE_FOR_ALL;

  return (
    <button
      onClick={() => onSelect(challenge.challengeEventId)}
      className={`group w-full rounded-2xl border p-5 text-left transition-all hover:shadow-lg ${
        isDarkMode
          ? 'border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              cfg.color === 'orange'
                ? (isDarkMode ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-50 text-orange-600')
                : cfg.color === 'green'
                  ? (isDarkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-50 text-green-600')
                  : cfg.color === 'red'
                    ? (isDarkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-600')
                    : (isDarkMode ? 'bg-slate-600/30 text-slate-400' : 'bg-gray-100 text-gray-500')
            }`}>
              {StatusIcon && <StatusIcon className="h-3 w-3" />}
              {t(cfg.labelKey)}
            </span>
            {challenge.registrationMode === 'INVITE_ONLY' && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'
              }`}>
                {t('groupWorkspace.challenge.list.inviteOnly')}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              isDarkMode ? 'bg-teal-500/15 text-teal-200' : 'bg-teal-50 text-teal-700'
            }`}>
              {t(modeLabel.key, modeLabel.fallback)}
            </span>
            {challenge.published === false && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}>
                {t('groupWorkspace.challenge.list.unpublished')}
              </span>
            )}
          </div>

          <h3 className={`truncate text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {challenge.title}
          </h3>

          <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(challenge.startTime, i18n.language)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t('groupWorkspace.challenge.list.participantCount', { count: challenge.participantCount || 0 })}
            </span>
          </div>

          {challenge.status === 'SCHEDULED' && countdown && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-600'
            }`}>
              <Clock className="h-3 w-3" />
              {t('groupWorkspace.challenge.list.startsIn', { value: countdown })}
            </div>
          )}

          {challenge.myParticipantStatus && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-600'
            }`}>
              {challenge.myParticipantStatus === 'FINISHED'
                ? t('groupWorkspace.challenge.list.myStatus.finished')
                : challenge.myParticipantStatus === 'PLAYING'
                  ? t('groupWorkspace.challenge.list.myStatus.playing')
                  : t('groupWorkspace.challenge.list.myStatus.registered')}
            </div>
          )}
        </div>

        <ChevronRight className={`mt-1 h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
          isDarkMode ? 'text-slate-500' : 'text-gray-400'
        }`} />
      </div>
    </button>
  );
}

export default function ChallengeListView({ challenges, isDarkMode, onSelectChallenge, onCreateChallenge }) {
  const { t } = useTranslation();

  if (!challenges || challenges.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
        <Swords className={`mb-3 h-12 w-12 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {t('groupWorkspace.challenge.noItems')}
        </p>
        {onCreateChallenge ? (
          <Button
            type="button"
            onClick={onCreateChallenge}
            className="mt-4 h-10 rounded-full bg-orange-500 px-4 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-sm">{t('groupWorkspace.challenge.createChallenge')}</span>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.challengeEventId}
          challenge={challenge}
          isDarkMode={isDarkMode}
          onSelect={onSelectChallenge}
        />
      ))}
    </div>
  );
}
