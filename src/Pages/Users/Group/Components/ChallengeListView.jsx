import { useState, useEffect } from 'react';
import { Swords, Users, Clock, ChevronRight, Zap, Trophy } from 'lucide-react';

function useCountdown(targetTime) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!targetTime) return undefined;
    const tick = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Đã bắt đầu'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) {
        setRemaining(`${d} ngày ${h}h ${m}m ${s}s`);
        return;
      }
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);
  return remaining;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Sắp diễn ra', color: 'orange', icon: Clock },
  LIVE: { label: 'Đang diễn ra', color: 'green', icon: Zap },
  FINISHED: { label: 'Đã kết thúc', color: 'slate', icon: Trophy },
  CANCELLED: { label: 'Đã huỷ', color: 'red', icon: null },
};

function formatDateTime(dt) {
  if (!dt) return '-';
  const d = new Date(dt);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function ChallengeCard({ challenge, isDarkMode, onSelect }) {
  const cfg = STATUS_CONFIG[challenge.status] || STATUS_CONFIG.SCHEDULED;
  const countdown = useCountdown(challenge.status === 'SCHEDULED' ? challenge.startTime : null);
  const StatusIcon = cfg.icon;

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
              {cfg.label}
            </span>
            {challenge.registrationMode === 'INVITE_ONLY' && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'
              }`}>
                Mời riêng
              </span>
            )}
            {challenge.published === false && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}>
                Chưa publish
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
              {formatDateTime(challenge.startTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {challenge.participantCount} người tham gia
            </span>
          </div>

          {challenge.status === 'SCHEDULED' && countdown && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-50 text-orange-600'
            }`}>
              <Clock className="h-3 w-3" />
              Còn {countdown}
            </div>
          )}

          {challenge.myParticipantStatus && (
            <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-600'
            }`}>
              {challenge.myParticipantStatus === 'FINISHED' ? 'Đã hoàn thành'
                : challenge.myParticipantStatus === 'PLAYING' ? 'Đang làm'
                : 'Đã đăng ký'}
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

export default function ChallengeListView({ challenges, isDarkMode, onSelectChallenge }) {
  if (!challenges || challenges.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-2xl border py-16 ${
        isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-gray-200 bg-gray-50/50'
      }`}>
        <Swords className={`mb-3 h-10 w-10 ${isDarkMode ? 'text-orange-300/40' : 'text-orange-300'}`} />
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Chưa có challenge nào
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {challenges.map((c) => (
        <ChallengeCard
          key={c.challengeEventId}
          challenge={c}
          isDarkMode={isDarkMode}
          onSelect={onSelectChallenge}
        />
      ))}
    </div>
  );
}
