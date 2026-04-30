import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarDays,
  ChevronRight,
  History,
  PenLine,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ListSpinner from '@/components/ui/ListSpinner';
import UserDisplayName from '@/components/features/users/UserDisplayName';
import { cn } from '@/lib/utils';
import GroupMemberRoadmapProgressPanel from './GroupMemberRoadmapProgressPanel';

function GroupMemberStatsContent({
  PAGE_SIZE,
  assignOpen,
  assigning,
  buildMemberKey,
  canAssignQuiz,
  classificationClass,
  eyebrowClass,
  fontClass,
  formatAttemptModeLabel,
  formatAttemptResult,
  formatAttemptStatusLabel,
  formatAverageResult,
  formatDate,
  formatMinutes,
  formatPercent,
  formatRelativeDate,
  getAttemptResultRatio,
  generatingMemberId,
  handleAssignQuiz,
  handleGenerateMemberSnapshot,
  handleOpenMember,
  isDarkMode,
  isEnglish,
  locale,
  memberPage,
  mutedClass,
  onBack,
  onOpenQuizSection,
  openAssignDialog,
  pagedRows,
  panelClass,
  quizzesQuery,
  selectedAttemptHistory,
  selectedDetailQuery,
  selectedIntelligence,
  selectedMember,
  selectedQuizId,
  selectedRecentActivities,
  selectedSnapshot,
  selectedWorkspaceMemberId,
  setAssignOpen,
  setMemberPage,
  setSelectedQuizId,
  shellClass,
  shouldRenderDedicatedDetail,
  showLegacyMemberCards,
  sortedRows,
  t,
  targetMember,
  totalPages,
  tt,
}) {
  const attemptResultRows = selectedAttemptHistory
    .map((attempt) => ({
      attempt,
      ratio: getAttemptResultRatio(attempt),
    }))
    .filter((item) => item.ratio != null);
  const recentAverageRatio = attemptResultRows.length > 0
    ? attemptResultRows.reduce((sum, item) => sum + item.ratio, 0) / attemptResultRows.length
    : null;
  const bestAttemptResult = attemptResultRows.reduce(
    (best, item) => (!best || item.ratio > best.ratio ? item : best),
    null,
  );
  const weakestAttemptResult = attemptResultRows.reduce(
    (weakest, item) => (!weakest || item.ratio < weakest.ratio ? item : weakest),
    null,
  );
  const weakFocus = selectedIntelligence?.weakFocus || [];
  const roadmapProgress = selectedSnapshot?.roadmapProgress || selectedIntelligence?.roadmapProgress || {};
  const roadmapPercent = Math.max(0, Math.min(100, Math.round(Number(roadmapProgress.roadmapProgressPercent ?? 0))));
  const roadmapCurrent = roadmapProgress.currentPhaseTitle
    || roadmapProgress.currentKnowledgeTitle
    || tt('groupWorkspace.memberStats.roadmap.noCurrent', 'Chưa bắt đầu lộ trình', 'Roadmap not started');
  const recentStatusLabel = (() => {
    if (recentAverageRatio == null) {
      return tt('groupWorkspace.memberStats.learningDiagnosis.noRecent', 'Chưa đủ dữ liệu quiz gần đây', 'Not enough recent quiz data');
    }
    if (recentAverageRatio >= 0.75) {
      return tt('groupWorkspace.memberStats.learningDiagnosis.recentGood', 'Quiz gần đây đang ổn', 'Recent quizzes look stable');
    }
    if (recentAverageRatio >= 0.55) {
      return tt('groupWorkspace.memberStats.learningDiagnosis.recentWatch', 'Quiz gần đây cần ôn lại', 'Recent quizzes need review');
    }
    return tt('groupWorkspace.memberStats.learningDiagnosis.recentRisk', 'Quiz gần đây đang yếu', 'Recent quizzes are weak');
  })();

  return (
    <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
      <section className="space-y-4">
        {!shouldRenderDedicatedDetail ? (
          <div className={cn('rounded-[28px] border p-4 md:p-5', shellClass)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', eyebrowClass)}>
                {tt('groupWorkspace.memberStats.list.eyebrow', 'Danh sách thành viên', 'Member list')}
              </p>
              <h3 className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {tt('groupWorkspace.memberStats.list.title', 'Tổng quan theo member', 'Member overview')}
              </h3>
            </div>
            <span className={cn('text-xs', mutedClass)}>
              {tt(
                'groupWorkspace.memberStats.pageInfoV2',
                `Trang ${memberPage + 1}/${totalPages}`,
                `Page ${memberPage + 1}/${totalPages}`,
              )}
            </span>
          </div>

          <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
            {tt(
              'groupWorkspace.memberStats.list.subtitle',
              'Xem kết quả quiz, thời gian học, tiến độ lộ trình và tín hiệu cần hỗ trợ của từng thành viên.',
              'View quiz results, study time, roadmap progress, and support signals for each member.',
            )}
          </p>

          <div className={cn('mt-4 overflow-hidden rounded-[24px] border', isDarkMode ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className={isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50/90'}>
                  <tr className={isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.member', 'Member', 'Member')}
                    </th>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.score', 'KQ TB', 'Avg result')}
                    </th>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.quizCount', 'Quiz', 'Quizzes')}
                    </th>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.studyTime', 'Học', 'Study time')}
                    </th>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.roadmap', 'Lộ trình', 'Roadmap')}
                    </th>
                    <th className={cn('px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.actions', 'Chi tiết', 'Details')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((member) => {
                    const key = buildMemberKey(member);
                    const memberName = member?.fullName || member?.username || '—';

                    return (
                      <tr
                        key={`table-${key}`}
                        className={cn(
                          'transition',
                          isDarkMode
                            ? 'border-b border-white/6 hover:bg-cyan-400/[0.05]'
                            : 'border-b border-slate-200/80 hover:bg-cyan-50/70',
                        )}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold',
                              isDarkMode ? 'bg-white/[0.08] text-white' : 'bg-slate-100 text-slate-700',
                            )}>
                              {member.avatar ? (
                                <img src={member.avatar} alt="" className="h-10 w-10 object-cover" />
                              ) : (
                                memberName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={cn('truncate font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                                <UserDisplayName user={member} fallback={memberName} isDarkMode={isDarkMode} showUsernameSuffix={false} />
                              </p>
                              <p className={cn('mt-1 max-w-[240px] truncate text-xs', mutedClass)}>
                                {member.email || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {formatAverageResult(member.averageScore)}
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {member.totalQuizAttempts ?? 0}
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {formatMinutes(member.totalMinutesSpent)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {(() => {
                            const roadmap = member?.roadmapProgress || {};
                            const percent = Math.max(0, Math.min(100, Math.round(Number(roadmap.roadmapProgressPercent ?? 0))));
                            return (
                              <div className="min-w-[130px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={cn('text-xs font-semibold', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>
                                    {roadmap.hasRoadmap ? `${percent}%` : tt('groupWorkspace.memberStats.roadmap.noneShort', 'Chưa có', 'None')}
                                  </span>
                                  {roadmap.needsSupport ? (
                                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700')}>
                                      {tt('groupWorkspace.memberStats.roadmap.needCheck', 'Cần kiểm tra', 'Check')}
                                    </span>
                                  ) : null}
                                </div>
                                <div className={cn('mt-2 h-1.5 overflow-hidden rounded-full', isDarkMode ? 'bg-white/10' : 'bg-blue-100')}>
                                  <div className={cn('h-full rounded-full', roadmap.needsSupport ? 'bg-amber-500' : 'bg-blue-600')} style={{ width: `${percent}%` }} />
                                </div>
                                <p className={cn('mt-1.5 line-clamp-1 text-xs', mutedClass)}>
                                  {roadmap.currentPhaseTitle || roadmap.currentKnowledgeTitle || tt('groupWorkspace.memberStats.roadmap.noCurrent', 'Chưa bắt đầu lộ trình', 'Roadmap not started')}
                                </p>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleOpenMember(member)}
                          >
                            {tt('groupWorkspace.memberStats.table.open', 'Xem', 'Open')}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {showLegacyMemberCards ? (<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedRows.map((member) => {
              const key = buildMemberKey(member);
              const memberName = member?.fullName || member?.username || '—';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleOpenMember(member)}
                  className={cn(
                    'h-full w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5',
                    panelClass,
                    isDarkMode
                      ? 'hover:border-cyan-300/30 hover:bg-cyan-400/[0.06]'
                      : 'hover:border-cyan-300 hover:bg-cyan-50/70',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold',
                      isDarkMode ? 'bg-white/[0.08] text-white' : 'bg-slate-100 text-slate-700',
                    )}>
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="h-11 w-11 object-cover" />
                      ) : (
                        memberName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            <UserDisplayName user={member} fallback={memberName} isDarkMode={isDarkMode} showUsernameSuffix={false} />
                          </p>
                          <p className={cn('mt-1 truncate text-xs', eyebrowClass)}>
                            {member.email || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className={cn('rounded-2xl border px-3 py-2', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>
                            {tt('groupWorkspace.memberStats.card.score', 'KQ TB', 'Avg result')}
                          </p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            {formatAverageResult(member.averageScore)}
                          </p>
                        </div>
                        <div className={cn('rounded-2xl border px-3 py-2', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>
                            {tt('groupWorkspace.memberStats.card.quiz', 'Quiz', 'Quizzes')}
                          </p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            {member.totalQuizAttempts ?? 0}
                          </p>
                        </div>
                        <div className={cn('rounded-2xl border px-3 py-2', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>
                            {tt('groupWorkspace.memberStats.card.studyTime', 'Học', 'Study time')}
                          </p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            {formatMinutes(member.totalMinutesSpent)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className={cn('truncate text-xs font-medium', mutedClass)}>
                          {tt('groupWorkspace.memberStats.card.openDetail', 'Xem tình hình học tập', 'Open learning detail')}
                        </span>
                        <ChevronRight className={cn('h-4 w-4 shrink-0', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>) : null}

          {totalPages > 1 ? (
            <div className={cn('mt-4 flex items-center justify-between border-t pt-4', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
              <p className={cn('text-xs', mutedClass)}>
                {tt(
                  'groupWorkspace.memberStats.list.counter',
                  `Hiển thị ${Math.min((memberPage + 1) * PAGE_SIZE, sortedRows.length)}/${sortedRows.length} member`,
                  `Showing ${Math.min((memberPage + 1) * PAGE_SIZE, sortedRows.length)}/${sortedRows.length} members`,
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={memberPage <= 0}
                  onClick={() => setMemberPage((prev) => Math.max(0, prev - 1))}
                >
                  {t('groupWorkspace.memberStats.prev', 'Prev')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={memberPage + 1 >= totalPages}
                  onClick={() => setMemberPage((prev) => prev + 1)}
                >
                  {t('groupWorkspace.memberStats.next', 'Next')}
                </Button>
              </div>
            </div>
          ) : null}
          </div>
        ) : null}
        {shouldRenderDedicatedDetail ? (
          <div className={cn('rounded-[28px] border p-4 md:p-5', shellClass)}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                {tt('groupWorkspace.memberStats.actions.backToList', 'Quay lại danh sách', 'Back to list')}
              </Button>
              <span className={cn('text-xs', mutedClass)}>
                {tt('groupWorkspace.memberStats.detailRouteBadge', 'Trang chi tiết member', 'Member detail page')}
              </span>
            </div>
          {selectedMember ? (
            <div className="space-y-4">
              {/* ── Member banner ── */}
              <div className={cn('flex flex-wrap items-center gap-4 rounded-[24px] border p-4', panelClass)}>
                <div className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold',
                  isDarkMode ? 'bg-white/[0.08] text-white' : 'bg-slate-100 text-slate-700',
                )}>
                  {selectedMember.avatar ? (
                    <img src={selectedMember.avatar} alt="" className="h-14 w-14 object-cover" />
                  ) : (
                    (selectedMember?.fullName || selectedMember?.username || 'M').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', eyebrowClass)}>
                    {tt('groupWorkspace.memberStats.detail.eyebrow', 'Hồ sơ member', 'Member profile')}
                  </p>
                  <h3 className={cn('truncate text-xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    <UserDisplayName
                      user={selectedMember}
                      fallback={selectedMember?.fullName || selectedMember?.username || tt('groupWorkspace.memberStats.memberFallback', 'Thành viên', 'Member')}
                      isDarkMode={isDarkMode}
                      showUsernameSuffix={false}
                    />
                  </h3>
                  <div className={cn('mt-1.5 flex flex-wrap items-center gap-2 text-xs', mutedClass)}>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {tt(
                        'groupWorkspace.memberStats.detail.joinedAt',
                        `Vào nhóm ${formatDate(selectedSnapshot.joinedAt, locale)}`,
                        `Joined ${formatDate(selectedSnapshot.joinedAt, locale)}`,
                      )}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      {formatRelativeDate(selectedDetailQuery.data?.latestActivityAt ?? selectedSnapshot.latestActivityAt ?? selectedSnapshot.snapshotDate, isEnglish)}
                    </span>
                  </div>
                </div>
                {selectedSnapshot.aiClassification ? (
                  <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', classificationClass(selectedSnapshot.aiClassification, isDarkMode))}>
                    {String(selectedSnapshot.aiClassification).replaceAll('_', ' ')}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    key: 'attempts',
                    label: tt('groupWorkspace.memberStats.detail.totalQuiz', 'Tổng quiz đã làm', 'Total quizzes'),
                    value: selectedSnapshot.totalQuizAttempts ?? 0,
                    note: tt('groupWorkspace.memberStats.detail.completedQuiz', `${selectedSnapshot.totalQuizPassed ?? 0} đã pass`, `${selectedSnapshot.totalQuizPassed ?? 0} passed`),
                    accent: isDarkMode ? 'text-cyan-200' : 'text-cyan-700',
                  },
                  {
                    key: 'minutes',
                    label: tt('groupWorkspace.memberStats.detail.totalStudy', 'Tổng thời gian học', 'Total study time'),
                    value: formatMinutes(selectedSnapshot.totalMinutesSpent),
                    note: tt('groupWorkspace.memberStats.detail.avgTimeQuiz', `${formatMinutes(selectedSnapshot.avgTimePerQuiz)} / quiz`, `${formatMinutes(selectedSnapshot.avgTimePerQuiz)} / quiz`),
                    accent: isDarkMode ? 'text-emerald-200' : 'text-emerald-700',
                  },
                  {
                    key: 'score',
                    label: tt('groupWorkspace.memberStats.detail.avgScore', 'Kết quả trung bình', 'Average result'),
                    value: formatAverageResult(selectedSnapshot.averageScore),
                    note: tt('groupWorkspace.memberStats.detail.passRate', `${formatPercent(selectedIntelligence.passRate)} pass rate`, `${formatPercent(selectedIntelligence.passRate)} pass rate`),
                    accent: isDarkMode ? 'text-violet-200' : 'text-violet-700',
                  },
                  {
                    key: 'activeDays',
                    label: tt('groupWorkspace.memberStats.detail.activeDays', 'Ngày hoạt động', 'Active days'),
                    value: selectedIntelligence.trend?.activeDays ?? 0,
                    note: tt('groupWorkspace.memberStats.detail.activeDaysNote', `Trong ${selectedIntelligence.trend?.points?.length ?? 0} snapshot`, `Across ${selectedIntelligence.trend?.points?.length ?? 0} snapshots`),
                    accent: isDarkMode ? 'text-amber-200' : 'text-amber-700',
                  },

                ].map((metric) => (
                  <div key={metric.key} className={cn('rounded-[22px] border p-4', panelClass)}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', eyebrowClass)}>{metric.label}</p>
                    <p className={cn('mt-2 text-lg font-bold leading-6', metric.accent)}>{metric.value}</p>
                    <p className={cn('mt-2 text-xs leading-5', mutedClass)}>{metric.note}</p>
                  </div>
                ))}
              </div>

              <GroupMemberRoadmapProgressPanel
                formatDate={formatDate}
                isDarkMode={isDarkMode}
                locale={locale}
                mutedClass={mutedClass}
                panelClass={panelClass}
                roadmapProgress={selectedSnapshot.roadmapProgress}
                tt={tt}
              />

              <div className={cn('rounded-[24px] border p-4', panelClass)}>
                <div className="flex items-center gap-2">
                  <BarChart3 className={cn('h-4 w-4', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')} />
                  <h4 className={cn('text-base font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {tt('groupWorkspace.memberStats.learningDiagnosis.title', 'Chẩn đoán học tập', 'Learning diagnosis')}
                  </h4>
                </div>
                <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
                  {tt(
                    'groupWorkspace.memberStats.learningDiagnosis.subtitle',
                    'Tổng hợp quiz gần đây, topic sai và roadmap để leader biết member đang học thế nào.',
                    'Combines recent quizzes, weak topics, and roadmap signals so leaders can understand this member.',
                  )}
                </p>

                <div className="mt-4 grid gap-3 lg:grid-cols-4">
                  <div className={cn('rounded-[18px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.learningDiagnosis.recentLabel', 'Quiz gần đây', 'Recent quizzes')}
                    </p>
                    <p className={cn('mt-2 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {recentStatusLabel}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                      {recentAverageRatio == null
                        ? tt('groupWorkspace.memberStats.learningDiagnosis.noRecentAverage', 'Chưa có bài nộp đủ dữ liệu.', 'No completed result data yet.')
                        : tt(
                          'groupWorkspace.memberStats.learningDiagnosis.recentAverage',
                          `Trung bình ${formatPercent(recentAverageRatio)} trên ${attemptResultRows.length} bài gần nhất.`,
                          `Average ${formatPercent(recentAverageRatio)} across ${attemptResultRows.length} recent quizzes.`,
                        )}
                    </p>
                  </div>

                  <div className={cn('rounded-[18px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.learningDiagnosis.bestQuiz', 'Quiz đúng cao nhất', 'Highest quiz')}
                    </p>
                    <p className={cn('mt-2 line-clamp-2 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {bestAttemptResult?.attempt?.quizTitle || tt('groupWorkspace.memberStats.learningDiagnosis.noBestQuiz', 'Chưa có dữ liệu', 'No data yet')}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                      {bestAttemptResult ? formatAttemptResult(bestAttemptResult.attempt) : '—'}
                    </p>
                  </div>

                  <div className={cn('rounded-[18px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.learningDiagnosis.lowQuiz', 'Quiz đúng thấp nhất', 'Lowest quiz')}
                    </p>
                    <p className={cn('mt-2 line-clamp-2 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {weakestAttemptResult?.attempt?.quizTitle || tt('groupWorkspace.memberStats.learningDiagnosis.noLowQuiz', 'Chưa có dữ liệu', 'No data yet')}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', mutedClass)}>
                      {weakestAttemptResult ? formatAttemptResult(weakestAttemptResult.attempt) : '—'}
                    </p>
                  </div>

                  <div className={cn('rounded-[18px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.learningDiagnosis.roadmap', 'Roadmap', 'Roadmap')}
                    </p>
                    <p className={cn('mt-2 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {roadmapProgress.hasRoadmap
                        ? `${roadmapPercent}%`
                        : tt('groupWorkspace.memberStats.learningDiagnosis.noRoadmap', 'Chưa có roadmap', 'No roadmap')}
                    </p>
                    <p className={cn('mt-1 line-clamp-2 text-xs leading-5', mutedClass)}>
                      {roadmapProgress.needsSupport
                        ? tt('groupWorkspace.memberStats.learningDiagnosis.roadmapNeedCheck', `Cần kiểm tra: ${roadmapCurrent}`, `Needs check: ${roadmapCurrent}`)
                        : roadmapCurrent}
                    </p>
                  </div>
                </div>

                <div className={cn('mt-4 rounded-[18px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white')}>
                  <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {tt('groupWorkspace.memberStats.learningDiagnosis.weakTopicTitle', 'Topic/knowledge cần ôn', 'Topics/knowledge to review')}
                  </p>
                  {weakFocus.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {weakFocus.map((topic) => (
                        <span key={topic} className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700')}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={cn('mt-2 text-sm leading-6', mutedClass)}>
                      {tt('groupWorkspace.memberStats.learningDiagnosis.noWeakTopic', 'Chưa thấy topic yếu nổi bật trong snapshot hiện tại.', 'No standout weak topic appears in the current snapshot.')}
                    </p>
                  )}
                  <p className={cn('mt-3 text-sm leading-6', mutedClass)}>
                    {tt(
                      'groupWorkspace.memberStats.learningDiagnosis.privateAssignHint',
                      'Nếu member sai nhiều ở topic này, hãy giao quiz mức dễ hơn để ôn lại. Quiz giao từ đây chỉ gán riêng member này, không đưa vào quiz chung của nhóm.',
                      'If this member misses these topics often, assign an easier review quiz. Quizzes assigned here are private to this member and are not added to the shared group quiz list.',
                    )}
                  </p>
                </div>
              </div>


              <div className="grid gap-4">
                <div className={cn('rounded-[24px] border p-4', panelClass)}>
                  <div className="flex items-center gap-2">
                    <History className={cn('h-4 w-4', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')} />
                    <h4 className={cn('text-base font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {tt('groupWorkspace.memberStats.attemptHistory.title', 'Lịch sử làm bài gần đây', 'Recent attempt history')}
                    </h4>
                  </div>

                  {selectedAttemptHistory.length === 0 ? (
                    <p className={cn('mt-4 text-sm leading-6', mutedClass)}>
                      {selectedRecentActivities.length > 0
                        ? tt('groupWorkspace.memberStats.attemptHistory.emptyWithActivity', 'Chưa có lịch sử nộp bài hoàn chỉnh cho member này. Dữ liệu gần nhất mới chỉ có activity log.', 'No completed attempt history is available yet. The latest signal is still the activity log.')
                        : tt('groupWorkspace.memberStats.attemptHistory.empty', 'Chưa có lịch sử làm bài cho member này.', 'No attempt history is available for this member yet.')}
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedAttemptHistory.map((attempt) => (
                        <div key={attempt.attemptId ?? `${attempt.quizId}-${attempt.completedAt}`} className={cn('rounded-[20px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                                {attempt.quizTitle || tt('groupWorkspace.memberStats.attemptHistory.quizFallback', 'Quiz chưa có tên', 'Untitled quiz')}
                              </p>
                              <div className={cn('mt-1 flex flex-wrap items-center gap-2 text-xs', mutedClass)}>
                                <span>{formatAttemptModeLabel(attempt, isEnglish)}</span>
                                <span>•</span>
                                <span>{formatAttemptStatusLabel(attempt, isEnglish)}</span>
                                <span>•</span>
                                <span>{formatDate(attempt.completedAt || attempt.startedAt, locale, true)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn('text-sm font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>
                                {formatAttemptResult(attempt)}
                              </p>
                              <p className={cn('mt-0.5 text-[10px]', mutedClass)}>
                                {tt('groupWorkspace.memberStats.attemptHistory.result', 'kết quả', 'result')}
                              </p>
                            </div>
                          </div>
                          <p className={cn('mt-3 text-xs', mutedClass)}>
                            {tt('groupWorkspace.memberStats.attemptHistory.attemptMeta', `Lần làm #${attempt.attemptId ?? '—'}`, `Attempt #${attempt.attemptId ?? '—'}`)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn('rounded-xl', !canAssignQuiz ? 'cursor-not-allowed opacity-60' : '')}
                  disabled={!canAssignQuiz || generatingMemberId === selectedWorkspaceMemberId}
                  onClick={() => handleGenerateMemberSnapshot(selectedMember)}
                >
                  <RefreshCw className={cn('h-4 w-4', generatingMemberId === selectedWorkspaceMemberId ? 'animate-spin' : '')} />
                  {generatingMemberId === selectedWorkspaceMemberId
                    ? t('groupWorkspace.memberStats.snapshotGenerating', 'Updating...')
                    : tt('groupWorkspace.memberStats.actions.updateSnapshot', 'Cập nhật snapshot', 'Update snapshot')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={cn('rounded-xl', !canAssignQuiz ? 'cursor-not-allowed opacity-60' : '')}
                  onClick={() => openAssignDialog(selectedMember)}
                >
                  <PenLine className="h-4 w-4" />
                  {canAssignQuiz
                    ? t('groupWorkspace.memberStats.assignQuiz', 'Assign quiz')
                    : t('groupWorkspace.memberStats.assignQuizDisabled', 'Assign quiz (leader only)')}
                </Button>
              </div>
            </div>
          ) : null}
          </div>
        ) : null}
      </section>

      {assignOpen ? (
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className={cn('sm:max-w-lg', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : '')}>
            <DialogHeader>
              <DialogTitle>{t('groupWorkspace.memberStats.assignDialogTitle', 'Assign quiz')}</DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
                {t('groupWorkspace.memberStats.assignDialogDescription', {
                  name: targetMember?.fullName || targetMember?.username || 'member',
                  defaultValue: 'Choose one quiz to assign to this member.',
                })}
              </DialogDescription>
            </DialogHeader>

            {quizzesQuery.isLoading ? (
              <ListSpinner variant="inline" />
            ) : (quizzesQuery.data || []).length === 0 ? (
              <div className={cn('rounded-xl border px-4 py-3 text-sm', isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                <p>{t('groupWorkspace.memberStats.noQuiz', 'No group quiz found yet.')}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setAssignOpen(false);
                    if (typeof onOpenQuizSection === 'function') onOpenQuizSection();
                  }}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {t('groupWorkspace.memberStats.openQuizTab', 'Open quiz tab')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className={cn('text-xs font-semibold uppercase tracking-[0.16em]', isDarkMode ? 'text-slate-400' : 'text-slate-500')} htmlFor="member-stats-quiz-select">
                  {t('groupWorkspace.memberStats.pickQuiz', 'Choose quiz')}
                </label>
                <select
                  id="member-stats-quiz-select"
                  value={selectedQuizId}
                  onChange={(event) => setSelectedQuizId(event.target.value)}
                  className={cn(
                    'h-11 w-full rounded-xl border px-3 text-sm outline-none',
                    isDarkMode
                      ? 'border-white/10 bg-slate-900 text-white focus:border-cyan-400/60'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-cyan-400',
                  )}
                >
                  <option value="">{t('groupWorkspace.memberStats.pickQuizPlaceholder', 'Select one quiz')}</option>
                  {(quizzesQuery.data || []).map((quiz) => (
                    <option key={quiz.quizId} value={quiz.quizId}>{quiz.title}</option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                {t('groupWorkspace.memberStats.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                disabled={assigning || quizzesQuery.isLoading || (quizzesQuery.data || []).length === 0}
                onClick={handleAssignQuiz}
              >
                <Brain className="mr-2 h-4 w-4" />
                {assigning
                  ? t('groupWorkspace.memberStats.assigning', 'Assigning...')
                  : t('groupWorkspace.memberStats.confirmAssign', 'Assign now')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export default GroupMemberStatsContent;
