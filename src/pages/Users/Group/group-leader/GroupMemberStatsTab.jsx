import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ListSpinner from '@/components/ui/ListSpinner';
import GroupMemberStatsContent from './GroupMemberStatsContent';
import { cn } from '@/lib/utils';
import { useGroup } from '@/hooks/useGroup';
import { getQuizzesByScope, setGroupQuizAudience } from '@/api/QuizAPI';
import { unwrapApiData } from '@/utils/apiResponse';
import { useToast } from '@/context/ToastContext';
import {
  buildMemberIntelligence,
  normalizeLearningSnapshotRow,
  normalizeScoreRatio,
  resolveUserId,
  resolveWorkspaceMemberId,
} from './memberStatsInsights';

const PAGE_SIZE = 6;
const LEARNING_SNAPSHOT_PERIOD = 'DAILY';
const DAY_MS = 24 * 60 * 60 * 1000;

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

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

function formatAverageResult(value) {
  const ratio = normalizeScoreRatio(value);
  return ratio == null ? '—' : formatPercent(ratio);
}

function getAttemptResultRatio(attempt) {
  const accuracyPercent = attempt?.accuracyPercent != null ? Number(attempt.accuracyPercent) : null;
  if (accuracyPercent != null && !Number.isNaN(accuracyPercent)) {
    const ratio = accuracyPercent > 1 ? accuracyPercent / 100 : accuracyPercent;
    return Math.max(0, Math.min(1, ratio));
  }
  return normalizeScoreRatio(attempt?.score);
}

function formatAttemptResult(attempt) {
  const ratio = getAttemptResultRatio(attempt);
  return ratio == null ? '—' : formatPercent(ratio);
}

function formatMinutes(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const minutes = Math.max(0, Math.round(Number(value)));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain > 0 ? `${hours}h ${remain}m` : `${hours}h`;
}

function formatDate(value, locale, withTime = false) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatRelativeDate(value, isEnglish) {
  const date = toDate(value);
  if (!date) return isEnglish ? 'No recent activity' : 'Chưa có hoạt động gần đây';
  const diffDays = Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
  if (diffDays === 0) return isEnglish ? 'Today' : 'Hôm nay';
  if (diffDays === 1) return isEnglish ? '1 day ago' : '1 ngày trước';
  if (diffDays < 7) return isEnglish ? `${diffDays} days ago` : `${diffDays} ngày trước`;
  return isEnglish ? `On ${formatDate(date, 'en-GB')}` : `${formatDate(date, 'vi-VN')}`;
}

function formatAttemptModeLabel(attempt, isEnglish) {
  if (attempt?.isPracticeMode) {
    return isEnglish ? 'Practice' : 'Luyện tập';
  }
  return isEnglish ? 'Official' : 'Chính thức';
}

function formatAttemptStatusLabel(attempt, isEnglish) {
  const normalized = String(attempt?.status || '').toUpperCase();
  if (normalized === 'COMPLETED') {
    return isEnglish ? 'Completed' : 'Đã nộp';
  }
  if (normalized === 'IN_PROGRESS') {
    return isEnglish ? 'In progress' : 'Đang làm';
  }
  return normalized || (isEnglish ? 'Unknown' : 'Không rõ');
}

function buildMemberKey(member) {
  return String(
    resolveWorkspaceMemberId(member)
    ?? resolveUserId(member)
    ?? member?.email
    ?? member?.username
    ?? 'member',
  );
}

function classificationClass(classification, isDarkMode) {
  const normalized = String(classification || '').toUpperCase();
  if (normalized === 'STRONG') return isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700';
  if (normalized === 'AT_RISK') return isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700';
  if (normalized === 'WEAK') return isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700';
  return isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700';
}

function GroupMemberStatsTab({
  isDarkMode,
  workspaceId,
  members = [],
  membersLoading = false,
  isLeader = false,
  isContributor = false,
  onOpenQuizSection,
  onOpenMemberDetail,
  onBack,
  detailOnly = false,
  forcedMemberId = null,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showInfo, showSuccess } = useToast();
  const {
    fetchMemberDashboardCards,
    fetchGroupLearningSnapshotsLatest,
    fetchMemberDashboardDetail,
    fetchGroupMemberLearningSnapshotTrend,
    generateGroupMemberLearningSnapshot,
  } = useGroup({ enabled: false });

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const isEnglish = i18n.language === 'en';
  const locale = isEnglish ? 'en-GB' : 'vi-VN';
  const tt = useCallback((key, vi, en, options = {}) => (
    t(key, { defaultValue: isEnglish ? en : vi, ...options })
  ), [isEnglish, t]);

  const [memberPage, setMemberPage] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [targetMember, setTargetMember] = useState(null);
  const [generatingMemberId, setGeneratingMemberId] = useState(null);
  const [detailRefreshNonce, setDetailRefreshNonce] = useState(0);
  const normalizedForcedMemberId = useMemo(() => {
    const nextValue = Number(forcedMemberId);
    return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : null;
  }, [forcedMemberId]);
  const shouldRenderDedicatedDetail = detailOnly;
  const showLegacyMemberCards = false;

  const canAssignQuiz = Boolean(isLeader);
  const snapshotFetchSize = useMemo(() => {
    const memberCount = Array.isArray(members) ? members.length : PAGE_SIZE;
    return Math.max(PAGE_SIZE, Math.min(Math.max(memberCount, PAGE_SIZE), 100));
  }, [members]);

  const memberCardsQuery = useQuery({
    queryKey: ['group-member-stats-tab-cards', workspaceId, snapshotFetchSize],
    queryFn: () => fetchMemberDashboardCards(workspaceId, 0, snapshotFetchSize),
    enabled: Boolean(workspaceId && (isLeader || isContributor)),
  });

  const memberStatsQuery = useQuery({
    queryKey: ['group-member-stats-tab-learning-snapshots', workspaceId, LEARNING_SNAPSHOT_PERIOD, snapshotFetchSize],
    queryFn: () => fetchGroupLearningSnapshotsLatest(workspaceId, {
      period: LEARNING_SNAPSHOT_PERIOD,
      sort: 'snapshotDate,desc',
      page: 0,
      size: snapshotFetchSize,
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

  const allRows = useMemo(() => {
    const roster = Array.isArray(members) ? members : [];
    const cardRows = Array.isArray(memberCardsQuery.data?.content) ? memberCardsQuery.data.content : [];
    const memberByUserId = new Map(
      roster
        .map((member) => [resolveUserId(member), member])
        .filter(([id]) => id != null),
    );
    const memberByWorkspaceMemberId = new Map(
      roster
        .map((member) => [resolveWorkspaceMemberId(member), member])
        .filter(([id]) => id != null),
    );
    const snapshotRows = Array.isArray(memberStatsQuery.data?.content) ? memberStatsQuery.data.content : [];
    const snapshotByUserId = new Map(
      snapshotRows
        .map((snapshot) => [resolveUserId(snapshot), snapshot])
        .filter(([id]) => id != null),
    );
    const snapshotByWorkspaceMemberId = new Map(
      snapshotRows
        .map((snapshot) => [resolveWorkspaceMemberId(snapshot), snapshot])
        .filter(([id]) => id != null),
    );
    const seen = new Set();
    const rows = [];

    const pushRow = (value) => {
      const normalized = normalizeLearningSnapshotRow(value);
      const key = buildMemberKey(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push(normalized);
    };

    cardRows.forEach((card) => {
      const relatedMember = memberByWorkspaceMemberId.get(resolveWorkspaceMemberId(card))
        || memberByUserId.get(resolveUserId(card));
      const relatedSnapshot = snapshotByWorkspaceMemberId.get(resolveWorkspaceMemberId(card))
        || snapshotByUserId.get(resolveUserId(card));

      pushRow({
        ...relatedMember,
        ...card,
        ...relatedSnapshot,
        workspaceMemberId: card?.workspaceMemberId ?? relatedMember?.workspaceMemberId ?? relatedMember?.groupMemberId ?? null,
        groupMemberId: relatedMember?.groupMemberId ?? card?.workspaceMemberId ?? null,
        fullName: card?.fullName || relatedMember?.fullName || relatedMember?.username || '—',
        username: card?.username || relatedMember?.username || '',
        avatar: card?.avatar || relatedMember?.avatar || '',
        email: card?.email || relatedMember?.email || '',
        role: card?.role || relatedMember?.role || null,
        joinedAt: card?.joinedAt ?? relatedMember?.joinedAt ?? null,
        latestActivityAt: relatedSnapshot?.latestActivityAt ?? card?.latestActivityAt ?? relatedMember?.latestActivityAt ?? null,
      });
    });

    snapshotRows.forEach((snapshot) => {
      const relatedMember = memberByWorkspaceMemberId.get(resolveWorkspaceMemberId(snapshot))
        || memberByUserId.get(resolveUserId(snapshot));

      pushRow({
        ...relatedMember,
        ...snapshot,
        workspaceMemberId: snapshot?.workspaceMemberId ?? relatedMember?.workspaceMemberId ?? relatedMember?.groupMemberId ?? null,
        groupMemberId: relatedMember?.groupMemberId ?? snapshot?.workspaceMemberId ?? null,
        fullName: snapshot?.fullName || relatedMember?.fullName || relatedMember?.username || '—',
        username: snapshot?.username || relatedMember?.username || '',
        avatar: snapshot?.avatar || relatedMember?.avatar || '',
        email: snapshot?.email || relatedMember?.email || '',
        role: snapshot?.role || relatedMember?.role || null,
        joinedAt: snapshot?.joinedAt ?? relatedMember?.joinedAt ?? null,
        latestActivityAt: snapshot?.latestActivityAt ?? relatedMember?.latestActivityAt ?? null,
      });
    });

    roster.forEach((member) => {
      pushRow({
        ...member,
        workspaceMemberId: member?.workspaceMemberId ?? member?.groupMemberId ?? null,
        groupMemberId: member?.groupMemberId ?? member?.workspaceMemberId ?? null,
        totalQuizAttempts: 0,
        totalQuizPassed: 0,
        averageScore: null,
        totalMinutesSpent: 0,
        avgTimePerQuiz: null,
        snapshotDate: null,
      });
    });

    return rows;
  }, [memberCardsQuery.data?.content, memberStatsQuery.data?.content, members]);

  const intelligenceMap = useMemo(() => {
    const map = new Map();
    allRows.forEach((member) => {
      map.set(buildMemberKey(member), buildMemberIntelligence(member));
    });
    return map;
  }, [allRows]);

  const sortedRows = useMemo(() => {
    const priority = { risk: 0, watch: 1, new: 2, stable: 3, strong: 4 };
    return [...allRows].sort((left, right) => {
      const leftIntelligence = intelligenceMap.get(buildMemberKey(left)) ?? buildMemberIntelligence(left);
      const rightIntelligence = intelligenceMap.get(buildMemberKey(right)) ?? buildMemberIntelligence(right);

      const toneDiff = (priority[leftIntelligence.healthTone] ?? 9) - (priority[rightIntelligence.healthTone] ?? 9);
      if (toneDiff !== 0) return toneDiff;

      const leftAttemptCount = Number(left?.totalQuizAttempts ?? 0);
      const rightAttemptCount = Number(right?.totalQuizAttempts ?? 0);
      if (leftAttemptCount !== rightAttemptCount) return rightAttemptCount - leftAttemptCount;

      const leftDate = toDate(left?.snapshotDate ?? left?.joinedAt)?.getTime() ?? 0;
      const rightDate = toDate(right?.snapshotDate ?? right?.joinedAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    });
  }, [allRows, intelligenceMap]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => (
    sortedRows.slice(memberPage * PAGE_SIZE, (memberPage + 1) * PAGE_SIZE)
  ), [memberPage, sortedRows]);

  useEffect(() => {
    if (memberPage < totalPages) return;
    setMemberPage(Math.max(0, totalPages - 1));
  }, [memberPage, totalPages]);

  useEffect(() => {
    if (shouldRenderDedicatedDetail) return;
    if (pagedRows.length === 0) {
      setSelectedMemberId(null);
      return;
    }
    const hasSelected = pagedRows.some((member) => resolveWorkspaceMemberId(member) === selectedMemberId);
    if (!hasSelected) {
      setSelectedMemberId(resolveWorkspaceMemberId(pagedRows[0]));
    }
  }, [pagedRows, selectedMemberId, shouldRenderDedicatedDetail]);

  const selectedMember = useMemo(() => (
    shouldRenderDedicatedDetail
      ? sortedRows.find((member) => resolveWorkspaceMemberId(member) === normalizedForcedMemberId) || null
      : pagedRows.find((member) => resolveWorkspaceMemberId(member) === selectedMemberId) || pagedRows[0] || null
  ), [normalizedForcedMemberId, pagedRows, selectedMemberId, shouldRenderDedicatedDetail, sortedRows]);

  const selectedWorkspaceMemberId = shouldRenderDedicatedDetail
    ? normalizedForcedMemberId ?? resolveWorkspaceMemberId(selectedMember)
    : resolveWorkspaceMemberId(selectedMember);

  const selectedDetailQuery = useQuery({
    queryKey: ['group-member-stats-detail', workspaceId, selectedWorkspaceMemberId, detailRefreshNonce],
    queryFn: () => fetchMemberDashboardDetail(workspaceId, selectedWorkspaceMemberId, 'ALL'),
    enabled: Boolean(shouldRenderDedicatedDetail && workspaceId && selectedWorkspaceMemberId && (isLeader || isContributor)),
    staleTime: 0,
  });

  const selectedTrendQuery = useQuery({
    queryKey: ['group-member-stats-trend', workspaceId, selectedWorkspaceMemberId, LEARNING_SNAPSHOT_PERIOD, detailRefreshNonce],
    queryFn: () => fetchGroupMemberLearningSnapshotTrend(workspaceId, selectedWorkspaceMemberId, { period: LEARNING_SNAPSHOT_PERIOD }),
    enabled: Boolean(shouldRenderDedicatedDetail && workspaceId && selectedWorkspaceMemberId && (isLeader || isContributor)),
    staleTime: 0,
  });

  const selectedSnapshot = useMemo(() => (
    normalizeLearningSnapshotRow(selectedMember ?? {}, isLeader ? selectedDetailQuery.data : null)
  ), [isLeader, selectedDetailQuery.data, selectedMember]);

  const selectedIntelligence = useMemo(() => (
    buildMemberIntelligence(selectedMember ?? {}, isLeader ? selectedDetailQuery.data : null, isLeader ? selectedTrendQuery.data : null)
  ), [isLeader, selectedDetailQuery.data, selectedMember, selectedTrendQuery.data]);

  const selectedRecentActivities = useMemo(() => {
    const items = Array.isArray(selectedDetailQuery.data?.recentActivities)
      ? selectedDetailQuery.data.recentActivities
      : [];
    return items.slice(0, 4);
  }, [selectedDetailQuery.data?.recentActivities]);

  const selectedAttemptHistory = useMemo(() => {
    const items = Array.isArray(selectedDetailQuery.data?.attemptHistory)
      ? selectedDetailQuery.data.attemptHistory
      : [];
    return items.slice(0, 8);
  }, [selectedDetailQuery.data?.attemptHistory]);

  const shellClass = isDarkMode
    ? 'border-white/12 bg-[#08131a]/92'
    : 'border-slate-200/85 bg-white/92';
  const panelClass = isDarkMode
    ? 'border-white/12 bg-white/[0.04]'
    : 'border-slate-200/80 bg-white/92';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const eyebrowClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const openAssignDialog = useCallback((member) => {
    if (!canAssignQuiz) {
      showInfo(t('groupWorkspace.memberStats.contributorReadOnly', 'Contributors can view member stats only.'));
      return;
    }
    setTargetMember(member);
    setSelectedQuizId('');
    setAssignOpen(true);
  }, [canAssignQuiz, showInfo, t]);

  const handleOpenMember = useCallback((member) => {
    if (!member) return;
    if (typeof onOpenMemberDetail === 'function') {
      onOpenMemberDetail(member);
      return;
    }
    setSelectedMemberId(resolveWorkspaceMemberId(member));
  }, [onOpenMemberDetail]);

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
      await Promise.allSettled([
        refetchMemberStats(),
        selectedDetailQuery.refetch(),
        selectedTrendQuery.refetch(),
      ]);
      setDetailRefreshNonce((current) => current + 1);
      showSuccess(t('groupWorkspace.memberStats.snapshotGenerateSuccess', 'Learning snapshot updated.'));
    } catch (error) {
      showError(error?.message || t('groupWorkspace.memberStats.snapshotGenerateFailed', 'Could not update learning snapshot.'));
    } finally {
      setGeneratingMemberId(null);
    }
  }, [
    generateGroupMemberLearningSnapshot,
    isLeader,
    refetchMemberStats,
    selectedDetailQuery,
    selectedTrendQuery,
    showError,
    showInfo,
    showSuccess,
    t,
    workspaceId,
  ]);

  if (membersLoading || memberCardsQuery.isLoading || memberStatsQuery.isLoading) {
    return (
      <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
        <div className={cn('rounded-[28px] border p-6', shellClass)}>
          <ListSpinner variant="section" />
        </div>
      </div>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <div className={cn('space-y-5 animate-in fade-in duration-300', fontClass)}>
        <section className={cn('rounded-[28px] border p-6', shellClass)}>
          <p className={cn('text-sm', mutedClass)}>
            {t('groupWorkspace.memberStats.empty', 'No member data available yet.')}
          </p>
        </section>
      </div>
    );
  }

  return (
    <GroupMemberStatsContent
      PAGE_SIZE={PAGE_SIZE}
      assignOpen={assignOpen}
      assigning={assigning}
      buildMemberKey={buildMemberKey}
      canAssignQuiz={canAssignQuiz}
      classificationClass={classificationClass}
      eyebrowClass={eyebrowClass}
      fontClass={fontClass}
      formatAttemptModeLabel={formatAttemptModeLabel}
      formatAttemptResult={formatAttemptResult}
      formatAttemptStatusLabel={formatAttemptStatusLabel}
      formatAverageResult={formatAverageResult}
      formatDate={formatDate}
      formatMinutes={formatMinutes}
      formatPercent={formatPercent}
      formatRelativeDate={formatRelativeDate}
      getAttemptResultRatio={getAttemptResultRatio}
      generatingMemberId={generatingMemberId}
      handleAssignQuiz={handleAssignQuiz}
      handleGenerateMemberSnapshot={handleGenerateMemberSnapshot}
      handleOpenMember={handleOpenMember}
      isDarkMode={isDarkMode}
      isEnglish={isEnglish}
      locale={locale}
      memberPage={memberPage}
      mutedClass={mutedClass}
      onBack={onBack}
      onOpenQuizSection={onOpenQuizSection}
      openAssignDialog={openAssignDialog}
      pagedRows={pagedRows}
      panelClass={panelClass}
      quizzesQuery={quizzesQuery}
      selectedAttemptHistory={selectedAttemptHistory}
      selectedDetailQuery={selectedDetailQuery}
      selectedIntelligence={selectedIntelligence}
      selectedMember={selectedMember}
      selectedQuizId={selectedQuizId}
      selectedRecentActivities={selectedRecentActivities}
      selectedSnapshot={selectedSnapshot}
      selectedWorkspaceMemberId={selectedWorkspaceMemberId}
      setAssignOpen={setAssignOpen}
      setMemberPage={setMemberPage}
      setSelectedQuizId={setSelectedQuizId}
      shellClass={shellClass}
      shouldRenderDedicatedDetail={shouldRenderDedicatedDetail}
      showLegacyMemberCards={showLegacyMemberCards}
      sortedRows={sortedRows}
      t={t}
      targetMember={targetMember}
      totalPages={totalPages}
      tt={tt}
    />
  );
}

export default GroupMemberStatsTab;
