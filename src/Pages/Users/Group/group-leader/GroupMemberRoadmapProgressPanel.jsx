import { AlertTriangle, Clock3, Map, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusMeta = (status, tt) => {
  switch (String(status || '').toUpperCase()) {
    case 'COMPLETED':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.completed', 'Hoàn thành', 'Completed'),
        tone: 'success',
      };
    case 'ON_TRACK':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.onTrack', 'Đúng nhịp', 'On track'),
        tone: 'success',
      };
    case 'BEHIND':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.behind', 'Chậm nhịp', 'Behind'),
        tone: 'danger',
      };
    case 'STALLED':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.stalled', 'Đang chững lại', 'Stalled'),
        tone: 'danger',
      };
    case 'NEEDS_REMEDIAL':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.remedial', 'Cần remedial', 'Needs remedial'),
        tone: 'danger',
      };
    case 'NOT_STARTED':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.notStarted', 'Chưa bắt đầu', 'Not started'),
        tone: 'warning',
      };
    case 'ROADMAP_EMPTY':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.empty', 'Chưa có nội dung', 'No content'),
        tone: 'warning',
      };
    case 'NO_ROADMAP':
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.noRoadmap', 'Chưa có lộ trình', 'No roadmap'),
        tone: 'neutral',
      };
    default:
      return {
        label: tt('groupWorkspace.memberStats.roadmap.status.unknown', 'Chưa rõ', 'Unknown'),
        tone: 'neutral',
      };
  }
};

const badgeClass = (tone, isDarkMode) => {
  if (tone === 'danger') {
    return isDarkMode ? 'bg-rose-400/10 text-rose-100 ring-1 ring-rose-400/20' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }
  if (tone === 'warning') {
    return isDarkMode ? 'bg-amber-400/10 text-amber-100 ring-1 ring-amber-400/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
  if (tone === 'success') {
    return isDarkMode ? 'bg-emerald-400/10 text-emerald-100 ring-1 ring-emerald-400/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
  return isDarkMode ? 'bg-white/[0.06] text-slate-200 ring-1 ring-white/10' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
};

function GroupMemberRoadmapProgressPanel({
  formatDate,
  isDarkMode,
  locale,
  mutedClass,
  panelClass,
  roadmapProgress,
  tt,
}) {
  const progress = roadmapProgress || {};
  const meta = statusMeta(progress.paceStatus, tt);
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress.roadmapProgressPercent ?? 0))));
  const phaseLine = progress.currentPhaseTitle
    ? `${progress.currentPhaseIndex ? `#${progress.currentPhaseIndex} ` : ''}${progress.currentPhaseTitle}`
    : tt('groupWorkspace.memberStats.roadmap.noPhase', 'Chưa có phase hiện tại', 'No current phase');
  const knowledgeLine = progress.currentKnowledgeTitle
    ? progress.currentKnowledgeTitle
    : tt('groupWorkspace.memberStats.roadmap.noKnowledge', 'Chưa có knowledge hiện tại', 'No current knowledge');
  const lastLearningLine = progress.lastLearningAt
    ? formatDate(progress.lastLearningAt, locale, true)
    : tt('groupWorkspace.memberStats.roadmap.noLearningTime', 'Chưa ghi nhận thời điểm học', 'No learning time recorded');

  return (
    <div className={cn('rounded-[24px] border p-4', panelClass)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-blue-50 text-blue-700')}>
            <Map className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h4 className={cn('text-base font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {tt('groupWorkspace.memberStats.roadmap.title', 'Theo dõi lộ trình học', 'Roadmap tracking')}
            </h4>
            <p className={cn('mt-1 text-sm leading-6', mutedClass)}>
              {tt('groupWorkspace.memberStats.roadmap.subtitle', 'Leader xem member đã bắt đầu, đang học tới đâu và có bị chậm nhịp không.', 'See whether the member started, where they are, and whether they are falling behind.')}
            </p>
          </div>
        </div>
        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', badgeClass(meta.tone, isDarkMode))}>
          {meta.label}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
            {tt('groupWorkspace.memberStats.roadmap.progress', 'Tiến độ', 'Progress')}
          </span>
          <span className={isDarkMode ? 'text-cyan-200' : 'text-blue-700'}>{percent}%</span>
        </div>
        <div className={cn('mt-2 h-2 overflow-hidden rounded-full', isDarkMode ? 'bg-white/10' : 'bg-blue-100')}>
          <div
            className={cn('h-full rounded-full', progress.needsSupport ? 'bg-amber-500' : 'bg-blue-600')}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className={cn('rounded-xl border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-blue-100 bg-blue-50/60')}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Route className={cn('h-3.5 w-3.5', isDarkMode ? 'text-cyan-200' : 'text-blue-700')} />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{tt('groupWorkspace.memberStats.roadmap.phase', 'Phase hiện tại', 'Current phase')}</span>
          </div>
          <p className={cn('mt-2 text-sm font-semibold leading-5', isDarkMode ? 'text-white' : 'text-slate-900')}>{phaseLine}</p>
          <p className={cn('mt-1 text-xs', mutedClass)}>{`${progress.completedPhases ?? 0}/${progress.totalPhases ?? 0} phase`}</p>
        </div>

        <div className={cn('rounded-xl border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-blue-100 bg-blue-50/60')}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Map className={cn('h-3.5 w-3.5', isDarkMode ? 'text-cyan-200' : 'text-blue-700')} />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{tt('groupWorkspace.memberStats.roadmap.knowledge', 'Knowledge hiện tại', 'Current knowledge')}</span>
          </div>
          <p className={cn('mt-2 text-sm font-semibold leading-5', isDarkMode ? 'text-white' : 'text-slate-900')}>{knowledgeLine}</p>
          <p className={cn('mt-1 text-xs', mutedClass)}>{`${progress.completedKnowledges ?? 0}/${progress.totalKnowledges ?? 0} knowledge`}</p>
        </div>

        <div className={cn('rounded-xl border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-blue-100 bg-blue-50/60')}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Clock3 className={cn('h-3.5 w-3.5', isDarkMode ? 'text-cyan-200' : 'text-blue-700')} />
            <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{tt('groupWorkspace.memberStats.roadmap.lastLearning', 'Lần học gần nhất', 'Last learning')}</span>
          </div>
          <p className={cn('mt-2 text-sm font-semibold leading-5', isDarkMode ? 'text-white' : 'text-slate-900')}>{lastLearningLine}</p>
          <p className={cn('mt-1 text-xs', mutedClass)}>
            {progress.daysInactive != null
              ? tt('groupWorkspace.memberStats.roadmap.inactiveDays', `${progress.daysInactive} ngày chưa tiếp tục`, `${progress.daysInactive} day(s) inactive`)
              : tt('groupWorkspace.memberStats.roadmap.inactiveUnknown', 'Chưa đủ dữ liệu nhịp học', 'Cadence data is not ready')}
          </p>
        </div>
      </div>

      {progress.needsSupport ? (
        <div className={cn('mt-4 flex items-start gap-2 rounded-xl border px-3 py-3 text-sm', isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800')}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-6">
            {tt('groupWorkspace.memberStats.roadmap.supportNeeded', 'Member này cần leader kiểm tra lại tiến độ lộ trình trước khi giao thêm việc học.', 'This member needs a roadmap checkpoint before more work is assigned.')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default GroupMemberRoadmapProgressPanel;
