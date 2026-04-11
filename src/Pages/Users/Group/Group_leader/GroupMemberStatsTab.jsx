import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, Brain, Lock, PenLine, UserCog, Users } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useGroup } from '@/hooks/useGroup';
import { getQuizzesByScope, setGroupQuizAudience } from '@/api/QuizAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';

const PAGE_SIZE = 5;

function normalizeQuizzes(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((quiz) => {
      const quizId = Number(quiz?.quizId ?? quiz?.id ?? 0);
      if (!Number.isInteger(quizId) || quizId <= 0) return null;
      return {
        quizId,
        title: String(quiz?.title || '').trim() || `Quiz #${quizId}`,
        status: String(quiz?.status || '').toUpperCase(),
      };
    })
    .filter(Boolean);
}

function normalizeAccuracy(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

function GroupMemberStatsTab({
  isDarkMode,
  workspaceId,
  members = [],
  membersLoading = false,
  isLeader = false,
  isContributor = false,
  onOpenQuizSection,
}) {
  const { t, i18n } = useTranslation();
  const { fetchMemberDashboardCards } = useGroup({ enabled: false });
  const { showError, showInfo, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [memberPage, setMemberPage] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [targetMember, setTargetMember] = useState(null);

  const memberStatsQuery = useQuery({
    queryKey: ['group-member-stats-tab-cards', workspaceId, memberPage, PAGE_SIZE],
    queryFn: () => fetchMemberDashboardCards(workspaceId, memberPage, PAGE_SIZE),
    enabled: Boolean(workspaceId),
  });

  const quizzesQuery = useQuery({
    queryKey: ['group-member-stats-tab-quizzes', workspaceId],
    queryFn: async () => {
      const response = await getQuizzesByScope('GROUP', workspaceId);
      return normalizeQuizzes(unwrapApiData(response));
    },
    enabled: Boolean(assignOpen && isLeader && workspaceId),
  });

  const fallbackRows = useMemo(() => {
    return (Array.isArray(members) ? members : []).map((member) => ({
      userId: Number(member?.userId ?? 0),
      fullName: member?.fullName || member?.username || '—',
      username: member?.username || '',
      role: member?.role || null,
      quizCompletedCount: 0,
      averageScore: null,
      accuracy: null,
      aiClassification: null,
    }));
  }, [members]);

  const rows = useMemo(() => {
    const memberMap = new Map(
      (Array.isArray(members) ? members : []).map((member) => [
        Number(member?.userId ?? 0),
        member,
      ]),
    );

    const cards = Array.isArray(memberStatsQuery.data?.content) ? memberStatsQuery.data.content : [];
    if (cards.length === 0) {
      const start = memberPage * PAGE_SIZE;
      return fallbackRows.slice(start, start + PAGE_SIZE);
    }

    return cards.map((card) => {
      const member = memberMap.get(Number(card?.userId ?? 0));
      return {
        ...card,
        fullName: card?.fullName || member?.fullName || member?.username || '—',
        username: card?.username || member?.username || '',
        role: card?.role || member?.role || null,
      };
    });
  }, [fallbackRows, memberPage, memberStatsQuery.data?.content, members]);

  const hasServerPagingData = Number(memberStatsQuery.data?.totalElements) > 0;
  const totalElements = hasServerPagingData
    ? Number(memberStatsQuery.data?.totalElements)
    : fallbackRows.length;
  const totalPages = hasServerPagingData
    ? Math.max(1, Number(memberStatsQuery.data?.totalPages) || Math.ceil(totalElements / PAGE_SIZE))
    : Math.max(1, Math.ceil(fallbackRows.length / PAGE_SIZE));

  useEffect(() => {
    if (memberPage < totalPages) return;
    setMemberPage(Math.max(0, totalPages - 1));
  }, [memberPage, totalPages]);
  const canAssignQuiz = Boolean(isLeader);

  const openAssignDialog = useCallback((member) => {
    if (!canAssignQuiz) {
      showInfo(t('groupWorkspace.memberStats.contributorReadOnly', 'Contributors can view member stats only.'));
      return;
    }
    setTargetMember(member);
    setSelectedQuizId('');
    setAssignOpen(true);
  }, [canAssignQuiz, showInfo, t]);

  const handleRoadmapAction = useCallback(() => {
    if (!isLeader) {
      showInfo(t('groupWorkspace.memberStats.contributorReadOnly', 'Contributors can view member stats only.'));
      return;
    }
    showInfo(t('groupWorkspace.memberStats.roadmapPending', 'Member-specific roadmap action is waiting for backend support.'));
  }, [isLeader, showInfo, t]);

  const handleAssignQuiz = useCallback(async () => {
    const quizId = Number(selectedQuizId);
    const targetUserId = Number(targetMember?.userId ?? 0);

    if (!Number.isInteger(quizId) || quizId <= 0) {
      showInfo(t('groupWorkspace.memberStats.assignRequiredQuiz', 'Please choose a quiz first.'));
      return;
    }

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      showError(t('groupWorkspace.memberStats.assignMissingMember', 'Member was not found. Please reopen this dialog.'));
      return;
    }

    setAssigning(true);
    try {
      await setGroupQuizAudience(quizId, {
        mode: 'SELECTED_MEMBERS',
        assigneeUserIds: [targetUserId],
      });
      showSuccess(t('groupWorkspace.memberStats.assignSuccess', 'Quiz assigned successfully.'));
      setAssignOpen(false);
    } catch (error) {
      showError(error?.message || t('groupWorkspace.memberStats.assignFailed', 'Could not assign quiz.'));
    } finally {
      setAssigning(false);
    }
  }, [selectedQuizId, targetMember?.userId, showInfo, t, showError, showSuccess]);

  const shellClass = isDarkMode
    ? 'border-white/12 bg-[#08131a]/92'
    : 'border-slate-200/85 bg-white/86';
  const cardClass = isDarkMode
    ? 'border-white/12 bg-white/[0.045]'
    : 'border-slate-200/90 bg-white/94';
  const metricCardClass = isDarkMode
    ? 'border-white/12 bg-black/20'
    : 'border-slate-200/85 bg-slate-50/85';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const eyebrowClass = 'text-slate-500';

  return (
    <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
      <section className={cn('rounded-[30px] border p-5', shellClass)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', eyebrowClass)}>
              {t('groupWorkspace.memberStats.eyebrow', 'Member operations')}
            </p>
            <h2 className={cn('mt-2 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
              {t('groupWorkspace.memberStats.title', 'Member stats')}
            </h2>
            <p className={cn('mt-2 max-w-3xl text-sm leading-7', subtleTextClass)}>
              {t('groupWorkspace.memberStats.description', 'Track each member and trigger focused actions from one place.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
            )}>
              <Users className="h-3.5 w-3.5" />
              {t('groupWorkspace.memberStats.totalMembers', { count: totalElements, defaultValue: `${totalElements} members` })}
            </span>
            {isContributor ? (
              <span className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
              )}>
                <Lock className="h-3.5 w-3.5" />
                {t('groupWorkspace.memberStats.readOnlyBadge', 'Contributor read-only')}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {membersLoading || memberStatsQuery.isLoading ? (
        <div className={cn('rounded-[28px] border p-6', shellClass)}>
          <ListSpinner variant="section" />
        </div>
      ) : rows.length === 0 ? (
        <section className={cn('rounded-[28px] border p-6', shellClass)}>
          <p className={cn('text-sm', subtleTextClass)}>
            {t('groupWorkspace.memberStats.empty', 'No member data available yet.')}
          </p>
        </section>
      ) : (
        <section className={cn('rounded-[28px] border p-4 md:p-5', shellClass)}>
          <div className="space-y-3">
            {rows.map((member) => {
              const memberName = member?.fullName || member?.username || '—';
              const username = member?.username ? `@${member.username}` : '';
              return (
                <article key={`${member.userId || memberName}`} className={cn('rounded-[22px] border p-4', cardClass)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{memberName}</p>
                        {username ? <span className={cn('text-xs', eyebrowClass)}>{username}</span> : null}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.quizDone', 'Quiz done')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{member.quizCompletedCount ?? 0}</p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.avgScore', 'Avg score')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>
                            {member.averageScore != null ? Math.round(Number(member.averageScore) * 10) / 10 : '—'}
                          </p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.accuracy', 'Accuracy')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-amber-200' : 'text-amber-700')}>{normalizeAccuracy(member.accuracy)}</p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.aiClass', 'AI class')}</p>
                          <p className={cn('mt-1 truncate text-sm font-semibold', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>
                            {member.aiClassification || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:min-w-[180px]">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('justify-start rounded-xl', !canAssignQuiz ? 'cursor-not-allowed opacity-60' : '')}
                        onClick={() => openAssignDialog(member)}
                      >
                        <PenLine className="mr-2 h-4 w-4" />
                        {canAssignQuiz
                          ? t('groupWorkspace.memberStats.assignQuiz', 'Assign quiz')
                          : t('groupWorkspace.memberStats.assignQuizDisabled', 'Assign quiz (leader only)')}
                      </Button>

                      <button
                        type="button"
                        onClick={handleRoadmapAction}
                        className={cn(
                          'inline-flex items-center justify-start rounded-xl border px-3 py-2 text-sm font-medium transition',
                          'cursor-not-allowed opacity-70',
                          isDarkMode
                            ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.06]'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                        )}
                        aria-disabled="true"
                      >
                        <UserCog className="mr-2 h-4 w-4" />
                        {t('groupWorkspace.memberStats.roadmapByMember', 'Create member roadmap')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className={cn('mt-4 flex items-center justify-between border-t pt-4', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
              <p className={cn('text-xs', subtleTextClass)}>
                {t('groupWorkspace.memberStats.pageInfo', {
                  page: memberPage + 1,
                  totalPages,
                  count: totalElements,
                  defaultValue: `Page ${memberPage + 1}/${totalPages} · ${totalElements} members`,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={memberPage <= 0 || memberStatsQuery.isFetching}
                  onClick={() => setMemberPage((prev) => Math.max(0, prev - 1))}
                >
                  {t('groupWorkspace.memberStats.prev', 'Prev')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={memberPage + 1 >= totalPages || memberStatsQuery.isFetching}
                  onClick={() => setMemberPage((prev) => prev + 1)}
                >
                  {t('groupWorkspace.memberStats.next', 'Next')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}

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
                <Button type="button" variant="outline" className="mt-3" onClick={() => {
                  setAssignOpen(false);
                  if (typeof onOpenQuizSection === 'function') onOpenQuizSection();
                }}>
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
                      : 'border-slate-200 bg-white text-slate-900 focus:border-cyan-400'
                  )}
                >
                  <option value="">{t('groupWorkspace.memberStats.pickQuizPlaceholder', 'Select one quiz')}</option>
                  {(quizzesQuery.data || []).map((quiz) => (
                    <option key={quiz.quizId} value={quiz.quizId}>
                      {quiz.title}
                    </option>
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

export default GroupMemberStatsTab;
