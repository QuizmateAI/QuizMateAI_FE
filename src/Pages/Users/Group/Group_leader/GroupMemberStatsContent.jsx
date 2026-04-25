import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  History,
  PenLine,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import ListSpinner from '@/Components/ui/ListSpinner';
import UserDisplayName from '@/Components/users/UserDisplayName';
import { cn } from '@/lib/utils';
import { buildMemberIntelligence } from './memberStatsInsights';
import GroupMemberStatsFormulaDialog from './GroupMemberStatsFormulaDialog';

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
  formatAttemptStatusLabel,
  formatDate,
  formatMinutes,
  formatPercent,
  formatRelativeDate,
  formatScore,
  formulaDialogOpen,
  generatingMemberId,
  handleAssignQuiz,
  handleGenerateMemberSnapshot,
  handleOpenMember,
  healthLabel,
  healthToneClass,
  intelligenceMap,
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
  reasonLabel,
  recommendationLabel,
  selectedAttemptHistory,
  selectedDetailQuery,
  selectedIntelligence,
  selectedMember,
  selectedQuizId,
  selectedRecentActivities,
  selectedSnapshot,
  selectedWorkspaceMemberId,
  setAssignOpen,
  setFormulaDialogOpen,
  setMemberPage,
  setSelectedQuizId,
  shellClass,
  shouldRenderDedicatedDetail,
  showLegacyMemberCards,
  sortedRows,
  t,
  targetMember,
  totalPages,
  trendIcon,
  tt,
}) {
  return (
    <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
      {!shouldRenderDedicatedDetail ? (
        <section className={cn('rounded-[30px] border p-5 md:p-6', shellClass)}>
          <div className="min-w-0 max-w-3xl">
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.22em]', eyebrowClass)}>
              {tt('groupWorkspace.memberStats.eyebrow', 'Phân tích từng thành viên', 'Member intelligence')}
            </p>
            <h2 className={cn('mt-2 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {tt('groupWorkspace.memberStats.titleV2', 'Thống kê thành viên', 'Member stats')}
            </h2>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {!shouldRenderDedicatedDetail ? (
          <div className={cn('rounded-[28px] border p-4 md:p-5', shellClass)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', eyebrowClass)}>
                {tt('groupWorkspace.memberStats.list.eyebrow', 'Danh sách ưu tiên', 'Priority list')}
              </p>
              <h3 className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {tt('groupWorkspace.memberStats.list.title', 'Member cần leader nhìn trước', 'Members to review first')}
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
              'Hệ thống ưu tiên member có dấu hiệu giảm phong độ, thiếu dữ liệu hoặc cần hỗ trợ ở đầu danh sách.',
              'The list prioritizes members with declining performance, thin data, or signs that they need support.',
            )}
          </p>

          <div className={cn('mt-4 overflow-hidden rounded-[24px] border', isDarkMode ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white')}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className={isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50/90'}>
                  <tr className={isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.member', 'Member', 'Member')}
                    </th>
                    <th className={cn('px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.health', 'Trạng thái', 'Health')}
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
                      {tt('groupWorkspace.memberStats.table.notes', 'Ghi chú', 'Notes')}
                    </th>
                    <th className={cn('px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.table.actions', 'Chi tiết', 'Details')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((member) => {
                    const key = buildMemberKey(member);
                    const intelligence = intelligenceMap.get(key) ?? buildMemberIntelligence(member);
                    const memberName = member?.fullName || member?.username || '—';
                    const TrendIcon = trendIcon(intelligence.trend.direction);
                    const reasons = intelligence.reasonCodes.slice(0, 2).map((code) => reasonLabel(code, intelligence));

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
                        <td className="px-4 py-4 align-top">
                          <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold', healthToneClass(intelligence.healthTone, isDarkMode))}>
                            {healthLabel(intelligence.healthTone)}
                          </span>
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {formatScore(member.averageScore)}
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {member.totalQuizAttempts ?? 0}
                        </td>
                        <td className={cn('px-4 py-4 align-top font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {formatMinutes(member.totalMinutesSpent)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className={cn('max-w-[280px] text-xs leading-5', mutedClass)}>
                            {reasons.join(' • ')}
                          </p>
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
              const intelligence = intelligenceMap.get(key) ?? buildMemberIntelligence(member);
              const memberName = member?.fullName || member?.username || '—';
              const TrendIcon = trendIcon(intelligence.trend.direction);
              const reasons = intelligence.reasonCodes.slice(0, 2).map((code) => reasonLabel(code, intelligence));

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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            <UserDisplayName user={member} fallback={memberName} isDarkMode={isDarkMode} showUsernameSuffix={false} />
                          </p>
                          <p className={cn('mt-1 truncate text-xs', eyebrowClass)}>
                            {member.email || '—'}
                          </p>
                        </div>

                        <span className={cn('inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-semibold', healthToneClass(intelligence.healthTone, isDarkMode))}>
                          {healthLabel(intelligence.healthTone)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className={cn('rounded-2xl border px-3 py-2', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>
                            {tt('groupWorkspace.memberStats.card.score', 'KQ TB', 'Avg result')}
                          </p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            {formatScore(member.averageScore)}
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
                        <div className="min-w-0">
                          <p className={cn('truncate text-xs font-medium', mutedClass)}>
                            {reasons.join(' · ')}
                          </p>
                        </div>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', healthToneClass(selectedIntelligence.healthTone, isDarkMode))}>
                    {healthLabel(selectedIntelligence.healthTone)}
                  </span>
                  {selectedSnapshot.aiClassification ? (
                    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', classificationClass(selectedSnapshot.aiClassification, isDarkMode))}>
                      {String(selectedSnapshot.aiClassification).replaceAll('_', ' ')}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* ── Health score card ── */}
              <div className={cn('rounded-[22px] border p-4', panelClass)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em]', eyebrowClass)}>
                      {tt('groupWorkspace.memberStats.detail.healthScore', 'Điểm theo dõi', 'Follow-up score')}
                    </p>
                    <p className={cn('mt-2 text-3xl font-black tracking-[-0.05em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {selectedIntelligence.healthScore}
                      <span className={cn('ml-1 text-sm font-semibold', mutedClass)}>/ 96</span>
                    </p>
                    <p className={cn('mt-2 text-xs leading-5', mutedClass)}>
                      {selectedIntelligence.reasonCodes.slice(0, 2).map((code) => reasonLabel(code, selectedIntelligence)).join(' · ')}
                    </p>

                    {selectedIntelligence.attempts > 0 ? (() => {
                      const sr = selectedIntelligence.scoreRatio ?? 0;
                      const pr = selectedIntelligence.passRate ?? 0;
                      const ar = selectedIntelligence.activityRatio ?? 0;
                      const tb = selectedIntelligence.trendBoost ?? 0;
                      const sc = Math.round(sr * 45 * 10) / 10;
                      const pc = Math.round(pr * 35 * 10) / 10;
                      const ac = Math.round(ar * 20 * 10) / 10;
                      return (
                        <div className={cn('mt-3 rounded-xl border px-3 py-2.5 space-y-1', isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60')}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('font-mono text-[11px]', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>
                              {tt('groupWorkspace.memberStats.detail.scoreBreak', 'Điểm TB', 'Avg score')} <span className={cn('font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{sc}</span>
                            </span>
                            <span className={cn('text-[10px]', mutedClass)}>+</span>
                            <span className={cn('font-mono text-[11px]', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>
                              {tt('groupWorkspace.memberStats.detail.passBreak', 'Pass', 'Pass')} <span className={cn('font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{pc}</span>
                            </span>
                            <span className={cn('text-[10px]', mutedClass)}>+</span>
                            <span className={cn('font-mono text-[11px]', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>
                              {tt('groupWorkspace.memberStats.detail.actBreak', 'Hoạt động', 'Activity')} <span className={cn('font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{ac}</span>
                            </span>
                            {tb !== 0 ? (
                              <>
                                <span className={cn('text-[10px]', mutedClass)}>{tb > 0 ? '+' : '−'}</span>
                                <span className={cn('font-mono text-[11px] font-bold', tb > 0 ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : (isDarkMode ? 'text-rose-300' : 'text-rose-600'))}>
                                  {tt('groupWorkspace.memberStats.detail.trendBreak', 'Xu hướng', 'Trend')} {Math.abs(tb)}
                                </span>
                              </>
                            ) : null}
                            <span className={cn('text-[10px]', mutedClass)}>=</span>
                            <span className={cn('font-mono text-[11px] font-black', isDarkMode ? 'text-white' : 'text-slate-900')}>{selectedIntelligence.healthScore}</span>
                          </div>
                          <p className={cn('text-[10px] leading-relaxed', mutedClass)}>
                            {tt('groupWorkspace.memberStats.detail.scoreExplain', 'Điểm từ 8 đến 96. Tổng hợp từ điểm quiz (×45), tỉ lệ pass (×35), mức hoạt động (×20) và xu hướng tiến bộ.', 'Score ranges from 8 to 96. Combines avg quiz score (×45), pass rate (×35), activity level (×20), and progress trend.')}
                          </p>
                        </div>
                      );
                    })() : (
                      <p className={cn('mt-3 text-[10px] leading-relaxed', mutedClass)}>
                        {tt('groupWorkspace.memberStats.detail.scoreExplainNew', 'Điểm mặc định 18/96 — chưa có dữ liệu quiz. Khi thành viên bắt đầu làm quiz, điểm sẽ được tính tự động.', 'Default score 18/96 — no quiz data yet. The score will be calculated automatically once the member starts taking quizzes.')}
                      </p>
                    )}
                  </div>
                  {selectedIntelligence.attempts > 0 ? (
                    <button
                      type="button"
                      onClick={() => setFormulaDialogOpen(true)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                        isDarkMode
                          ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
                          : 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {tt('groupWorkspace.memberStats.formula.title', 'Cách tính điểm', 'How score works')}
                    </button>
                  ) : null}
                </div>
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
                    value: formatScore(selectedSnapshot.averageScore),
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

              <div className="grid gap-4 xl:grid-cols-2">
                <div className={cn('rounded-[24px] border p-4', panelClass)}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn('h-4 w-4', isDarkMode ? 'text-amber-200' : 'text-amber-700')} />
                    <h4 className={cn('text-base font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {tt('groupWorkspace.memberStats.focus.title', 'Đang lỗi ở phần nào?', 'Where is this member struggling?')}
                    </h4>
                  </div>

                  {selectedIntelligence.weakFocus.length === 0 ? (
                    <p className={cn('mt-3 text-sm leading-6', mutedClass)}>
                      {tt('groupWorkspace.memberStats.focus.none', 'Chưa có chủ đề yếu nổi bật trong snapshot hiện tại.', 'No standout weak topics appear in the current snapshot.')}
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedIntelligence.weakFocus.map((topic) => (
                          <span key={topic} className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700')}>
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedIntelligence.strongFocus.length > 0 ? (
                      <>
                        <div className={cn('mt-4 h-px', isDarkMode ? 'bg-white/10' : 'bg-slate-200')} />
                        <p className={cn('mt-4 text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {tt('groupWorkspace.memberStats.focus.strongTitle', 'Điểm đang làm tốt', 'Current strengths')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedIntelligence.strongFocus.map((topic) => (
                            <span key={topic} className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700')}>
                              {topic}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                </div>

                <div className={cn('rounded-[24px] border p-4', panelClass)}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={cn('h-4 w-4', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')} />
                    <h4 className={cn('text-base font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {tt('groupWorkspace.memberStats.recommend.title', 'Leader nên làm gì tiếp?', 'Recommended next steps')}
                    </h4>
                  </div>

                  <div className="mt-3 space-y-3">
                    {selectedIntelligence.recommendationCodes.map((code) => (
                      <div key={code} className={cn('rounded-[20px] border px-4 py-3', isDarkMode ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50/80')}>
                        <p className={cn('text-sm leading-6', isDarkMode ? 'text-slate-100' : 'text-slate-800')}>
                          {recommendationLabel(code, selectedIntelligence)}
                        </p>
                      </div>
                    ))}
                  </div>
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
                              {(() => {
                                const rawScore = attempt.score != null ? Number(attempt.score) : null;
                                const accPct = attempt.accuracyPercent != null ? Number(attempt.accuracyPercent) : null;
                                const hasScore = rawScore != null && rawScore > 0;
                                const primaryValue = hasScore ? formatScore(rawScore) : (accPct != null ? `${Math.round(accPct * 10) / 10}%` : '—');
                                const primaryLabel = hasScore
                                  ? tt('groupWorkspace.memberStats.attemptHistory.score', 'điểm', 'score')
                                  : tt('groupWorkspace.memberStats.attemptHistory.accuracy', 'chính xác', 'accuracy');
                                return (
                                  <>
                                    <p className={cn('text-sm font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>
                                      {primaryValue}
                                    </p>
                                    <p className={cn('mt-0.5 text-[10px]', mutedClass)}>
                                      {primaryLabel}
                                    </p>
                                  </>
                                );
                              })()}
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
      <GroupMemberStatsFormulaDialog
        eyebrowClass={eyebrowClass}
        formulaDialogOpen={formulaDialogOpen}
        healthLabel={healthLabel}
        healthToneClass={healthToneClass}
        isDarkMode={isDarkMode}
        mutedClass={mutedClass}
        selectedIntelligence={selectedIntelligence}
        selectedSnapshot={selectedSnapshot}
        setFormulaDialogOpen={setFormulaDialogOpen}
        tt={tt}
      />
    </div>
  );
}

export default GroupMemberStatsContent;
