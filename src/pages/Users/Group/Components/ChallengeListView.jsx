import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Users, Clock, ChevronRight, Zap, Trophy, Plus, Flame, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CountdownBadge from './challenge/CountdownBadge';
import ParticipantSlotBar from './challenge/ParticipantSlotBar';

const STATUS_CONFIG = {
  SCHEDULED: { labelKey: 'groupWorkspace.challenge.phase.SCHEDULED', tone: 'orange', icon: Clock },
  LIVE: { labelKey: 'groupWorkspace.challenge.phase.LIVE', tone: 'green', icon: Zap },
  FINISHED: { labelKey: 'groupWorkspace.challenge.phase.FINISHED', tone: 'slate', icon: Trophy },
  CANCELLED: { labelKey: 'groupWorkspace.challenge.phase.CANCELLED', tone: 'red', icon: null },
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

function getMyStatusBadge(myParticipantStatus, t, isDarkMode) {
  if (!myParticipantStatus) return null;
  const presets = {
    FINISHED: {
      light: 'bg-emerald-50 text-emerald-700 ring-emerald-300/60',
      dark: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/40',
      label: t('groupWorkspace.challenge.list.myStatus.finished'),
    },
    PLAYING: {
      light: 'bg-blue-50 text-blue-700 ring-blue-300/60',
      dark: 'bg-blue-500/15 text-blue-200 ring-blue-500/40',
      label: t('groupWorkspace.challenge.list.myStatus.playing'),
    },
    REGISTERED: {
      light: 'bg-violet-50 text-violet-700 ring-violet-300/60',
      dark: 'bg-violet-500/15 text-violet-200 ring-violet-500/40',
      label: t('groupWorkspace.challenge.list.myStatus.registered'),
    },
  };
  const p = presets[myParticipantStatus] || presets.REGISTERED;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${isDarkMode ? p.dark : p.light}`}>
      {p.label}
    </span>
  );
}

function ModeBadge({ matchMode, isDarkMode, t }) {
  const modeLabel = MATCH_MODE_LABELS[matchMode] || MATCH_MODE_LABELS.FREE_FOR_ALL;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
      isDarkMode ? 'bg-teal-500/10 text-teal-200 ring-teal-500/30' : 'bg-teal-50 text-teal-700 ring-teal-300/50'
    }`}>
      {t(modeLabel.key, modeLabel.fallback)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HERO CARD — used for LIVE challenges, attention-grabbing            */
/* ------------------------------------------------------------------ */
function HeroCard({ challenge, isDarkMode, onSelect, t, i18n }) {
  const isLive = challenge.status === 'LIVE';
  const slotTotal = challenge.capacityLimit ?? challenge.bracketSize ?? null;

  return (
    <button
      onClick={() => onSelect(challenge.challengeEventId)}
      className={`group relative w-full overflow-hidden rounded-3xl p-6 text-left ring-1 transition-all hover:scale-[1.005] hover:shadow-2xl ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-900/40 ring-slate-700 hover:ring-cyan-400/50'
          : 'bg-gradient-to-br from-white via-white to-cyan-50/50 ring-slate-200 hover:ring-cyan-400/60'
      }`}
    >
      {/* Glow accent */}
      {isLive && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-rose-400/30 via-orange-400/20 to-transparent blur-3xl" />
      )}

      <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {t('groupWorkspace.challenge.phase.LIVE')}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isDarkMode ? 'bg-orange-500/20 text-orange-200' : 'bg-orange-100 text-orange-700'
              }`}>
                <Flame className="h-3 w-3" />
                Featured
              </span>
            )}
            <ModeBadge matchMode={challenge.matchMode} isDarkMode={isDarkMode} t={t} />
            {challenge.registrationMode === 'INVITE_ONLY' && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                isDarkMode ? 'bg-violet-500/10 text-violet-200 ring-violet-500/30' : 'bg-violet-50 text-violet-700 ring-violet-300/50'
              }`}>
                {t('groupWorkspace.challenge.list.inviteOnly')}
              </span>
            )}
          </div>

          <h3 className={`text-xl font-bold leading-tight md:text-2xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {challenge.title}
          </h3>

          <div className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm ${
            isDarkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDateTime(challenge.startTime, i18n.language)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {t('groupWorkspace.challenge.list.participantCount', { count: challenge.participantCount || 0 })}
            </span>
          </div>

          {(slotTotal || (challenge.participantCount || 0) > 0) && (
            <div className="max-w-md pt-2">
              <ParticipantSlotBar
                used={challenge.participantCount || 0}
                total={slotTotal}
                isDarkMode={isDarkMode}
                size="lg"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {getMyStatusBadge(challenge.myParticipantStatus, t, isDarkMode)}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:items-end">
          {challenge.status === 'SCHEDULED' && challenge.startTime && (
            <CountdownBadge
              targetTime={challenge.startTime}
              size="xl"
              isDarkMode={isDarkMode}
              label={t('groupWorkspace.challenge.list.startsInLabel', 'Starts in')}
            />
          )}
          {isLive && challenge.endTime && (
            <CountdownBadge
              targetTime={challenge.endTime}
              size="xl"
              isDarkMode={isDarkMode}
              label={t('groupWorkspace.challenge.list.endsInLabel', 'Ends in')}
            />
          )}

          <span className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            isDarkMode
              ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40 group-hover:bg-cyan-500/30'
              : 'bg-cyan-500 text-white ring-1 ring-cyan-400 group-hover:bg-cyan-600'
          }`}>
            {isLive
              ? t('groupWorkspace.challenge.list.joinNow', 'Join now')
              : t('groupWorkspace.challenge.list.viewDetail', 'View detail')}
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* FEATURED CARD — medium prominence, used for next-up scheduled       */
/* ------------------------------------------------------------------ */
function FeaturedCard({ challenge, isDarkMode, onSelect, t, i18n }) {
  const slotTotal = challenge.capacityLimit ?? challenge.bracketSize ?? null;

  return (
    <button
      onClick={() => onSelect(challenge.challengeEventId)}
      className={`group flex h-full w-full flex-col gap-3 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isDarkMode
          ? 'border-slate-700 bg-slate-800/60 hover:border-cyan-500/50 hover:bg-slate-800'
          : 'border-slate-200 bg-white hover:border-cyan-400/60 hover:bg-cyan-50/30'
      }`}
    >
      <div className="flex items-start gap-2">
        <ModeBadge matchMode={challenge.matchMode} isDarkMode={isDarkMode} t={t} />
        {challenge.registrationMode === 'INVITE_ONLY' && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
            isDarkMode ? 'bg-violet-500/10 text-violet-200 ring-violet-500/30' : 'bg-violet-50 text-violet-700 ring-violet-300/50'
          }`}>
            {t('groupWorkspace.challenge.list.inviteOnly')}
          </span>
        )}
      </div>

      <h3 className={`line-clamp-2 text-base font-semibold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {challenge.title}
      </h3>

      <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <Calendar className="h-3.5 w-3.5" />
        {formatDateTime(challenge.startTime, i18n.language)}
      </div>

      {challenge.status === 'SCHEDULED' && challenge.startTime && (
        <CountdownBadge
          targetTime={challenge.startTime}
          size="md"
          isDarkMode={isDarkMode}
          label={t('groupWorkspace.challenge.list.startsInLabel', 'Starts in')}
          className="self-start"
        />
      )}

      <div className="mt-auto pt-1">
        <ParticipantSlotBar
          used={challenge.participantCount || 0}
          total={slotTotal}
          isDarkMode={isDarkMode}
          size="sm"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        {getMyStatusBadge(challenge.myParticipantStatus, t, isDarkMode) || <span />}
        <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* COMPACT ROW — dense list for scheduled (overflow) and finished      */
/* ------------------------------------------------------------------ */
function CompactRow({ challenge, isDarkMode, onSelect, t, i18n }) {
  const cfg = STATUS_CONFIG[challenge.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = cfg.icon;
  const isFinished = challenge.status === 'FINISHED';

  return (
    <button
      onClick={() => onSelect(challenge.challengeEventId)}
      className={`group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md ${
        isDarkMode
          ? 'border-slate-700/70 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      <ModeBadge matchMode={challenge.matchMode} isDarkMode={isDarkMode} t={t} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {challenge.title}
          </h4>
          {challenge.published === false && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700'
            }`}>
              {t('groupWorkspace.challenge.list.unpublished')}
            </span>
          )}
        </div>
        <div className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span className="inline-flex items-center gap-1">
            {StatusIcon && <StatusIcon className="h-3 w-3" />}
            {t(cfg.labelKey)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateTime(challenge.startTime, i18n.language)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {challenge.participantCount || 0}
          </span>
        </div>
      </div>

      {challenge.status === 'SCHEDULED' && challenge.startTime && (
        <CountdownBadge
          targetTime={challenge.startTime}
          size="sm"
          isDarkMode={isDarkMode}
          className="shrink-0"
        />
      )}
      {!isFinished && getMyStatusBadge(challenge.myParticipantStatus, t, isDarkMode)}
      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SECTION HEADER                                                      */
/* ------------------------------------------------------------------ */
function SectionHeader({ icon: Icon, title, count, accent = 'slate', isDarkMode }) {
  const accentMap = {
    rose: isDarkMode ? 'text-rose-300' : 'text-rose-600',
    orange: isDarkMode ? 'text-orange-300' : 'text-orange-600',
    cyan: isDarkMode ? 'text-cyan-300' : 'text-cyan-600',
    slate: isDarkMode ? 'text-slate-300' : 'text-slate-600',
  };
  return (
    <div className="mb-3 mt-1 flex items-center gap-2">
      {Icon && <Icon className={`h-4 w-4 ${accentMap[accent]}`} />}
      <h3 className={`text-sm font-bold uppercase tracking-wider ${accentMap[accent]}`}>{title}</h3>
      {typeof count === 'number' && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums ${
          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
        }`}>
          {count}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN VIEW                                                           */
/* ------------------------------------------------------------------ */
export default function ChallengeListView({ challenges, isDarkMode, onSelectChallenge, onCreateChallenge }) {
  const { t, i18n } = useTranslation();

  const grouped = useMemo(() => {
    const live = [];
    const scheduled = [];
    const finished = [];
    (challenges || []).forEach((c) => {
      if (c.status === 'LIVE') live.push(c);
      else if (c.status === 'SCHEDULED') scheduled.push(c);
      else if (c.status === 'FINISHED') finished.push(c);
      else scheduled.push(c);
    });
    scheduled.sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));
    const featured = scheduled.slice(0, 3);
    const remainingScheduled = scheduled.slice(3);
    return { live, featured, remainingScheduled, finished };
  }, [challenges]);

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
    <div className="flex flex-col gap-6">
      {grouped.live.length > 0 && (
        <section>
          <SectionHeader
            icon={Zap}
            title={t('groupWorkspace.challenge.sections.liveNow', 'Live now')}
            count={grouped.live.length}
            accent="rose"
            isDarkMode={isDarkMode}
          />
          <div className="flex flex-col gap-4">
            {grouped.live.map((c) => (
              <HeroCard
                key={c.challengeEventId}
                challenge={c}
                isDarkMode={isDarkMode}
                onSelect={onSelectChallenge}
                t={t}
                i18n={i18n}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.featured.length > 0 && (
        <section>
          <SectionHeader
            icon={Sparkles}
            title={t('groupWorkspace.challenge.sections.startingSoon', 'Starting soon')}
            count={grouped.featured.length}
            accent="orange"
            isDarkMode={isDarkMode}
          />
          {grouped.featured.length === 1 ? (
            <HeroCard
              challenge={grouped.featured[0]}
              isDarkMode={isDarkMode}
              onSelect={onSelectChallenge}
              t={t}
              i18n={i18n}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.featured.map((c) => (
                <FeaturedCard
                  key={c.challengeEventId}
                  challenge={c}
                  isDarkMode={isDarkMode}
                  onSelect={onSelectChallenge}
                  t={t}
                  i18n={i18n}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {grouped.remainingScheduled.length > 0 && (
        <section>
          <SectionHeader
            icon={Calendar}
            title={t('groupWorkspace.challenge.sections.scheduled', 'Scheduled')}
            count={grouped.remainingScheduled.length}
            accent="cyan"
            isDarkMode={isDarkMode}
          />
          <div className="flex flex-col gap-2">
            {grouped.remainingScheduled.map((c) => (
              <CompactRow
                key={c.challengeEventId}
                challenge={c}
                isDarkMode={isDarkMode}
                onSelect={onSelectChallenge}
                t={t}
                i18n={i18n}
              />
            ))}
          </div>
        </section>
      )}

      {grouped.finished.length > 0 && (
        <section>
          <SectionHeader
            icon={Trophy}
            title={t('groupWorkspace.challenge.sections.finished', 'Finished')}
            count={grouped.finished.length}
            accent="slate"
            isDarkMode={isDarkMode}
          />
          <div className="flex flex-col gap-2">
            {grouped.finished.map((c) => (
              <CompactRow
                key={c.challengeEventId}
                challenge={c}
                isDarkMode={isDarkMode}
                onSelect={onSelectChallenge}
                t={t}
                i18n={i18n}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
