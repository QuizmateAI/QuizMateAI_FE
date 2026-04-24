import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, Brain, Lock, PenLine, RefreshCw, UserCog, Users } from 'lucide-react';
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
import { useGroup } from '@/hooks/useGroup';
import { getQuizzesByScope, setGroupQuizAudience } from '@/api/QuizAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';

const PAGE_SIZE = 5;
const LEARNING_SNAPSHOT_PERIOD = 'DAILY';

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
        quizIntent: String(quiz?.quizIntent || '').toUpperCase(),
      };
    })
    .filter(Boolean);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function pickNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return null;
}

function normalizeRateValue(value) {
  const numeric = pickNumber(value);
  if (numeric == null) return null;
  if (numeric > 1) return numeric / 100;
  if (numeric < 0) return null;
  return numeric;
}

function normalizeLearningSnapshotRow(base = {}, detail = null) {
  const source = detail && typeof detail === 'object' ? { ...base, ...detail } : { ...base };

  const attempts = pickNumber(
    source.totalQuizAttempts,
    source.quizAttemptCount,
    source.totalAttempts,
    source.attemptCount,
    source.attempts,
  ) ?? 0;

  const passed = pickNumber(
    source.totalQuizPassed,
    source.quizCompletedCount,
    source.quizPassedCount,
    source.passedCount,
    source.completedCount,
    source.totalCompleted,
  ) ?? 0;

  const averageScore = pickNumber(
    source.averageScore,
    source.avgScore,
    source.averageQuizScore,
    source.scoreAverage,
    source.meanScore,
  );

  const passRate = normalizeRateValue(
    pickFirst(
      source.passRate,
      source.quizPassRate,
      source.passedRate,
      source.pass_percentage,
    ),
  );

  return {
    ...source,
    totalQuizAttempts: attempts,
    totalQuizPassed: passed,
    averageScore,
    passRate,
    aiClassification: pickFirst(
      source.aiClassification,
      source.aiClass,
      source.classification,
    ),
    snapshotDate: pickFirst(
      source.snapshotDate,
      source.generatedAt,
      source.createdAt,
      source.snapshotCreatedAt,
    ),
  };
}

function normalizePassRate(member) {
  const explicitRate = normalizeRateValue(member?.passRate);
  const attempts = Number(member?.totalQuizAttempts ?? member?.quizAttemptCount ?? 0);
  const passed = Number(member?.totalQuizPassed ?? member?.quizCompletedCount ?? 0);
  const value = explicitRate ?? (attempts > 0 ? passed / attempts : null);
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Math.round(Number(value) * 10) / 10;
}

function resolveWorkspaceMemberId(member) {
  const id = Number(member?.workspaceMemberId ?? member?.groupMemberId ?? 0);
  return Number.isInteger(id) && id > 0 ? id : null;
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
  const {
    fetchGroupLearningSnapshotsLatest,
    fetchGroupMemberLearningSnapshotLatest,
    generateGroupMemberLearningSnapshot,
  } = useGroup({ enabled: false });
  const { showError, showInfo, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [memberPage, setMemberPage] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [targetMember, setTargetMember] = useState(null);
  const [generatingMemberId, setGeneratingMemberId] = useState(null);
  const [detailRefreshNonce, setDetailRefreshNonce] = useState(0);

  const memberStatsQuery = useQuery({
    queryKey: ['group-member-stats-tab-learning-snapshots', workspaceId, LEARNING_SNAPSHOT_PERIOD, memberPage, PAGE_SIZE],
    queryFn: () => fetchGroupLearningSnapshotsLatest(workspaceId, {
      period: LEARNING_SNAPSHOT_PERIOD,
      sort: 'averageScore,desc',
      page: memberPage,
      size: PAGE_SIZE,
    }),
    enabled: Boolean(workspaceId && (isLeader || isContributor)),
  });
  const refetchMemberStats = memberStatsQuery.refetch;

  const quizzesQuery = useQuery({
    queryKey: ['group-member-stats-tab-quizzes', workspaceId],
    queryFn: async () => {
      const response = await getQuizzesByScope('GROUP', workspaceId);
      const list = normalizeQuizzes(unwrapApiData(response));
      return list.filter((quiz) => quiz.quizIntent !== 'MOCK_TEST');
    },
    enabled: Boolean(assignOpen && isLeader && workspaceId),
  });

  const fallbackRows = useMemo(() => {
    return (Array.isArray(members) ? members : []).map((member) => ({
      workspaceMemberId: member?.workspaceMemberId ?? member?.groupMemberId ?? null,
      groupMemberId: member?.groupMemberId ?? null,
      userId: Number(member?.userId ?? 0),
      fullName: member?.fullName || member?.username || '—',
      username: member?.username || '',
      avatar: member?.avatar || '',
      email: member?.email || '',
      role: member?.role || null,
      totalQuizAttempts: 0,
      totalQuizPassed: 0,
      averageScore: null,
      aiClassification: null,
      snapshotDate: null,
    }));
  }, [members]);

  const rawRows = useMemo(() => {
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
      return normalizeLearningSnapshotRow({
        ...card,
        workspaceMemberId: card?.workspaceMemberId ?? member?.workspaceMemberId ?? member?.groupMemberId ?? null,
        groupMemberId: member?.groupMemberId ?? card?.workspaceMemberId ?? null,
        fullName: card?.fullName || member?.fullName || member?.username || '—',
        username: card?.username || member?.username || '',
        avatar: card?.avatar || member?.avatar || '',
        email: card?.email || member?.email || '',
        role: card?.role || member?.role || null,
      });
    });
  }, [fallbackRows, memberPage, memberStatsQuery.data?.content, members]);

  const rowDetailQueries = useQueries({
    queries: rawRows.map((member) => {
      const workspaceMemberId = resolveWorkspaceMemberId(member);
      return {
        queryKey: ['group-member-stats-row-latest', workspaceId, workspaceMemberId, LEARNING_SNAPSHOT_PERIOD, detailRefreshNonce],
        queryFn: () => fetchGroupMemberLearningSnapshotLatest(workspaceId, workspaceMemberId, { period: LEARNING_SNAPSHOT_PERIOD }),
        enabled: Boolean(workspaceId && workspaceMemberId),
        staleTime: 0,
      };
    }),
  });

  const rows = useMemo(() => (
    rawRows.map((member, index) => normalizeLearningSnapshotRow(member, rowDetailQueries[index]?.data))
  ), [rawRows, rowDetailQueries]);

  const hasServerPagingData = Number(memberStatsQuery.data?.totalElements) > 0;
  const totalElements = hasServerPagingData
    ? Number(memberStatsQuery.data?.totalElements)
    : fallbackRows.length;
  const totalPages = hasServerPagingData
    ? Math.max(1, Number(memberStatsQuery.data?.totalPages) || Math.ceil(totalElements / PAGE_SIZE))
    : Math.max(1, Math.ceil(fallbackRows.length / PAGE_SIZE));
  const visibleRowsWithAttempts = useMemo(() => (
    rows.filter((member) => Number(member?.totalQuizAttempts ?? 0) > 0).length
  ), [rows]);
  const visibleRowsWithSnapshots = useMemo(() => (
    rows.filter((member) => Boolean(member?.snapshotDate)).length
  ), [rows]);
  const visibleAverageScore = useMemo(() => {
    const scores = rows
      .map((member) => member?.averageScore)
      .filter((score) => score != null && !Number.isNaN(Number(score)))
      .map(Number);

    if (scores.length === 0) return '—';
    const total = scores.reduce((sum, score) => sum + score, 0);
    return formatScore(total / scores.length);
  }, [rows]);

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
  }, [selectedQuizId, showError, showInfo, showSuccess, t, targetMember?.userId]);

  const handleGenerateMemberSnapshot = useCallback(async (member) => {
    if (!isLeader) {
      showInfo(t('groupWorkspace.memberStats.contributorReadOnly', 'Contributors can view member stats only.'));
      return;
    }

    const workspaceMemberId = resolveWorkspaceMemberId(member);
    if (!workspaceMemberId) {
      showError(t('groupWorkspace.memberStats.snapshotMissingMember', 'Member snapshot id was not found.'));
      return;
    }

    setGeneratingMemberId(workspaceMemberId);
    try {
      await generateGroupMemberLearningSnapshot(workspaceId, workspaceMemberId, {
        snapshotPeriod: LEARNING_SNAPSHOT_PERIOD,
        force: true,
      });
      await refetchMemberStats();
      setDetailRefreshNonce((current) => current + 1);
      showSuccess(t('groupWorkspace.memberStats.snapshotGenerateSuccess', 'Learning snapshot updated.'));
    } catch (error) {
      showError(error?.message || t('groupWorkspace.memberStats.snapshotGenerateFailed', 'Could not update learning snapshot.'));
    } finally {
      setGeneratingMemberId(null);
    }
  }, [generateGroupMemberLearningSnapshot, isLeader, refetchMemberStats, showError, showInfo, showSuccess, t, workspaceId]);

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
  const heroMetricCards = [
    {
      key: 'total',
      icon: Users,
      label: t('groupWorkspace.memberStats.hero.totalRosterLabel', 'Roster scope'),
      value: t('groupWorkspace.memberStats.totalMembers', { count: totalElements, defaultValue: `${totalElements} members` }),
      note: t('groupWorkspace.memberStats.hero.totalRosterNote', 'All members available for review.'),
      tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    },
    {
      key: 'attempts',
      icon: BarChart3,
      label: t('groupWorkspace.memberStats.hero.activeRowsLabel', 'Learning data'),
      value: t('groupWorkspace.memberStats.hero.activeRowsValue', {
        count: visibleRowsWithAttempts,
        total: rows.length,
        defaultValue: '{{count}}/{{total}} visible',
      }),
      note: t('groupWorkspace.memberStats.hero.activeRowsNote', {
        count: visibleRowsWithSnapshots,
        defaultValue: '{{count}} row(s) already have a generated snapshot.',
      }),
      tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
    },
    {
      key: 'average',
      icon: Brain,
      label: t('groupWorkspace.memberStats.hero.visibleAverageLabel', 'Visible avg score'),
      value: visibleAverageScore,
      note: t('groupWorkspace.memberStats.hero.visibleAverageNote', 'Average across rows currently shown.'),
      tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    },
  ];
  const scopeCards = [
    {
      key: 'detail',
      icon: BarChart3,
      title: t('groupWorkspace.memberStats.scope.detailTitle', 'Per-member drill-down'),
      body: t('groupWorkspace.memberStats.scope.detailBody', 'Attempts, passed count, average score, pass rate, and AI class live on each row.'),
    },
    {
      key: 'refresh',
      icon: RefreshCw,
      title: t('groupWorkspace.memberStats.scope.refreshTitle', 'Snapshot control'),
      body: t('groupWorkspace.memberStats.scope.refreshBody', 'Refresh a single member without regenerating the entire group view.'),
    },
    {
      key: 'action',
      icon: PenLine,
      title: t('groupWorkspace.memberStats.scope.actionTitle', 'Focused actions'),
      body: t('groupWorkspace.memberStats.scope.actionBody', 'Assign a quiz or prepare a follow-up for exactly one learner.'),
    },
  ];

  return (
    <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
      <section className={cn('overflow-hidden rounded-[30px] border', shellClass)}>
        <div
          className={cn(
            'border-b px-5 py-5',
            isDarkMode ? 'border-white/10 bg-violet-400/[0.04]' : 'border-slate-200/80 bg-violet-50/60',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em]', eyebrowClass)}>
                {t('groupWorkspace.memberStats.eyebrow', 'Member drill-down')}
              </p>
              <h2 className={cn('mt-2 text-2xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {t('groupWorkspace.memberStats.title', 'Member stats')}
              </h2>
              <p className={cn('mt-2 max-w-3xl text-sm leading-7', subtleTextClass)}>
                {t('groupWorkspace.memberStats.description', 'Use this tab after Overview: inspect one learner at a time, refresh their learning snapshot, and assign focused work.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-white text-violet-700',
              )}>
                <Brain className="h-3.5 w-3.5" />
                {t('groupWorkspace.memberStats.hero.questionValue', 'Per-member decisions')}
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

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {scopeCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className={cn('rounded-[20px] border px-4 py-3', cardClass)}>
                  <div className="flex items-start gap-3">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isDarkMode ? 'bg-white/[0.06] text-violet-100' : 'bg-white text-violet-700')}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{item.title}</p>
                      <p className={cn('mt-1 text-xs leading-5', subtleTextClass)}>{item.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-3">
          {heroMetricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.key} className={cn('rounded-[22px] border p-4', cardClass)}>
                <div className="flex items-center gap-2">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', metric.tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.14em]', eyebrowClass)}>{metric.label}</p>
                </div>
                <p className={cn('mt-3 text-2xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>{metric.value}</p>
                <p className={cn('mt-2 text-xs leading-5', subtleTextClass)}>{metric.note}</p>
              </div>
            );
          })}
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
              const workspaceMemberId = resolveWorkspaceMemberId(member);
              const isGeneratingThisMember = generatingMemberId === workspaceMemberId;
              return (
                <article key={`${member.userId || memberName}`} className={cn('rounded-[22px] border p-4', cardClass)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold', isDarkMode ? 'bg-white/[0.07] text-white' : 'bg-slate-100 text-slate-700')}>
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-10 w-10 object-cover" />
                          ) : (
                            memberName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                            <UserDisplayName user={member} fallback={memberName} isDarkMode={isDarkMode} />
                          </p>
                          {(member.email || member.username) ? (
                            <p className={cn('truncate text-xs', eyebrowClass)}>
                              {member.email || `@${member.username}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-4">
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.attempts', 'Attempts')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{member.totalQuizAttempts ?? 0}</p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.passed', 'Passed')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>{member.totalQuizPassed ?? 0}</p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.avgScore', 'Avg score')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>{formatScore(member.averageScore)}</p>
                        </div>
                        <div className={cn('rounded-xl border px-3 py-2', metricCardClass)}>
                          <p className={cn('text-[11px] uppercase tracking-[0.14em]', eyebrowClass)}>{t('groupWorkspace.memberStats.passRate', 'Pass rate')}</p>
                          <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-amber-200' : 'text-amber-700')}>{normalizePassRate(member)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700')}>
                          {member.aiClassification || t('groupWorkspace.memberStats.noAiClass', 'No AI class')}
                        </span>
                        {member.snapshotDate ? (
                          <span className={cn('text-xs', eyebrowClass)}>
                            {t('groupWorkspace.memberStats.snapshotDate', {
                              date: new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              }).format(new Date(member.snapshotDate)),
                              defaultValue: 'Snapshot {{date}}',
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:min-w-[180px]">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('justify-start rounded-xl', !canAssignQuiz ? 'cursor-not-allowed opacity-60' : '')}
                        disabled={!canAssignQuiz || isGeneratingThisMember}
                        onClick={() => handleGenerateMemberSnapshot(member)}
                      >
                        <RefreshCw className={cn('mr-2 h-4 w-4', isGeneratingThisMember ? 'animate-spin' : '')} />
                        {isGeneratingThisMember
                          ? t('groupWorkspace.memberStats.snapshotGenerating', 'Updating...')
                          : t('groupWorkspace.memberStats.updateSnapshot', 'Update snapshot')}
                      </Button>

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
