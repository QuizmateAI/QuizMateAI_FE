import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Brain,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import ListSpinner from '@/Components/ui/ListSpinner';
import GroupMemberStatsContent from './GroupMemberStatsContent';
import { cn } from '@/lib/utils';
import { useGroup } from '@/hooks/useGroup';
import { getQuizzesByScope, setGroupQuizAudience } from '@/api/QuizAPI';
import { unwrapApiData } from '@/Utils/apiResponse';
import { useToast } from '@/context/ToastContext';
import {
  buildMemberIntelligence,
  buildTrendMeta,
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

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 10) / 10}`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 1000) / 10}%`;
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

function healthToneClass(tone, isDarkMode) {
  const map = {
    strong: isDarkMode ? 'bg-emerald-400/12 text-emerald-100 ring-1 ring-emerald-400/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    stable: isDarkMode ? 'bg-cyan-400/12 text-cyan-100 ring-1 ring-cyan-400/20' : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
    watch: isDarkMode ? 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    risk: isDarkMode ? 'bg-rose-400/12 text-rose-100 ring-1 ring-rose-400/20' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    new: isDarkMode ? 'bg-violet-400/12 text-violet-100 ring-1 ring-violet-400/20' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  };
  return map[tone] || map.stable;
}

function classificationClass(classification, isDarkMode) {
  const normalized = String(classification || '').toUpperCase();
  if (normalized === 'STRONG') return isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700';
  if (normalized === 'AT_RISK') return isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700';
  if (normalized === 'WEAK') return isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700';
  return isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700';
}

function trendIcon(direction) {
  if (direction === 'up') return TrendingUp;
  if (direction === 'down') return TrendingDown;
  return Minus;
}

function trendClass(direction, isDarkMode) {
  if (direction === 'up') return isDarkMode ? 'text-emerald-200' : 'text-emerald-700';
  if (direction === 'down') return isDarkMode ? 'text-rose-200' : 'text-rose-700';
  return isDarkMode ? 'text-slate-300' : 'text-slate-600';
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
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);
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

      if (leftIntelligence.healthScore !== rightIntelligence.healthScore) {
        return leftIntelligence.healthScore - rightIntelligence.healthScore;
      }

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

  const activeMembersCount = useMemo(() => (
    sortedRows.filter((member) => Number(member?.totalQuizAttempts ?? 0) > 0).length
  ), [sortedRows]);

  const needsAttentionCount = useMemo(() => (
    sortedRows.filter((member) => {
      const tone = intelligenceMap.get(buildMemberKey(member))?.healthTone;
      return tone === 'risk' || tone === 'watch';
    }).length
  ), [intelligenceMap, sortedRows]);

  const averageVisibleScore = useMemo(() => {
    const scores = sortedRows
      .map((member) => member?.averageScore)
      .filter((score) => score != null && !Number.isNaN(Number(score)))
      .map(Number);
    if (scores.length === 0) return '—';
    return formatScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [sortedRows]);

  const snapshotCoverage = useMemo(() => (
    sortedRows.filter((member) => Boolean(member?.snapshotDate)).length
  ), [sortedRows]);

  const selectedTrendMeta = selectedIntelligence?.trend ?? buildTrendMeta();
  const selectedTrendData = useMemo(() => (
    (selectedTrendMeta.points || []).slice(-7).map((point) => ({
      label: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(new Date(point.snapshotDate)),
      fullDate: formatDate(point.snapshotDate, locale),
      performance: point.averageScore == null
        ? null
        : Math.round((normalizeScoreRatio(point.averageScore) ?? 0) * 1000) / 10,
      passRate: point.totalQuizAttempts > 0
        ? Math.round(((Number(point.totalQuizPassed ?? 0) / Number(point.totalQuizAttempts ?? 1)) * 1000)) / 10
        : null,
      minutes: Number(point.totalMinutesSpent ?? 0),
    }))
  ), [locale, selectedTrendMeta.points]);

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

  const healthLabel = useCallback((tone) => {
    switch (tone) {
      case 'strong':
        return tt('groupWorkspace.memberStats.health.strong', 'Đang tiến tốt', 'Performing well');
      case 'stable':
        return tt('groupWorkspace.memberStats.health.stable', 'Ổn định', 'Stable');
      case 'watch':
        return tt('groupWorkspace.memberStats.health.watch', 'Cần theo dõi', 'Needs watching');
      case 'risk':
        return tt('groupWorkspace.memberStats.health.risk', 'Cần can thiệp', 'Needs intervention');
      default:
        return tt('groupWorkspace.memberStats.health.new', 'Chưa bắt đầu', 'Not started');
    }
  }, [tt]);

  const cadenceLabel = useCallback((code) => {
    switch (code) {
      case 'consistent':
        return tt('groupWorkspace.memberStats.cadence.consistent', 'Học đều mỗi ngày', 'Consistent cadence');
      case 'sporadic':
        return tt('groupWorkspace.memberStats.cadence.sporadic', 'Học ngắt quãng', 'Sporadic cadence');
      case 'rushed':
        return tt('groupWorkspace.memberStats.cadence.rushed', 'Làm quiz quá nhanh', 'Rushed attempts');
      case 'deep':
        return tt('groupWorkspace.memberStats.cadence.deep', 'Dành nhiều thời gian ôn', 'Deep study blocks');
      case 'not_started':
        return tt('groupWorkspace.memberStats.cadence.notStarted', 'Chưa có nhịp học', 'No study cadence yet');
      default:
        return tt('groupWorkspace.memberStats.cadence.balanced', 'Nhịp học trung bình', 'Balanced cadence');
    }
  }, [tt]);

  const reasonLabel = useCallback((code, intelligence) => {
    const weakLabel = intelligence?.weakFocus?.[0];
    switch (code) {
      case 'no_attempts':
        return tt('groupWorkspace.memberStats.reason.noAttempts', 'Chưa làm quiz nào', 'No quizzes completed yet');
      case 'low_score':
        return tt('groupWorkspace.memberStats.reason.lowScore', 'Điểm trung bình đang thấp', 'Average score is low');
      case 'low_pass_rate':
        return tt('groupWorkspace.memberStats.reason.lowPassRate', 'Tỉ lệ pass còn thấp', 'Pass rate is still low');
      case 'declining_trend':
        return tt('groupWorkspace.memberStats.reason.decliningTrend', 'Kết quả đang giảm theo ngày', 'Performance is declining day by day');
      case 'weak_topics':
        return weakLabel
          ? tt('groupWorkspace.memberStats.reason.weakTopics', `Vướng nhiều ở ${weakLabel}`, `Struggling on ${weakLabel}`)
          : tt('groupWorkspace.memberStats.reason.weakTopicsGeneric', 'Đang vướng ở các chủ đề yếu', 'Current weak areas need support');
      case 'rushed_attempts':
        return tt('groupWorkspace.memberStats.reason.rushedAttempts', 'Thời gian làm quá nhanh so với kết quả', 'Attempts are too fast for the current result');
      case 'low_study_time':
        return tt('groupWorkspace.memberStats.reason.lowStudyTime', 'Thời lượng học còn ít', 'Study time is still light');
      case 'sporadic':
        return tt('groupWorkspace.memberStats.reason.sporadic', 'Nhịp học chưa đều', 'Study rhythm is inconsistent');
      case 'improving':
        return tt('groupWorkspace.memberStats.reason.improving', 'Kết quả đang đi lên', 'Results are improving');
      default:
        return tt('groupWorkspace.memberStats.reason.steady', 'Giữ được nhịp ổn định', 'Maintaining steady progress');
    }
  }, [tt]);

  const recommendationLabel = useCallback((code, intelligence) => {
    const focusLabel = intelligence?.weakFocus?.slice(0, 2).join(', ');
    switch (code) {
      case 'assign_baseline':
        return tt('groupWorkspace.memberStats.recommend.assignBaseline', 'Giao 1 quiz nền tảng để lấy baseline đầu tiên.', 'Assign one baseline quiz to establish the first checkpoint.');
      case 'refresh_snapshot':
        return tt('groupWorkspace.memberStats.recommend.refreshSnapshot', 'Cập nhật snapshot ngay sau phiên học đầu tiên để có dữ liệu theo dõi.', 'Refresh the snapshot after the first study session to start tracking properly.');
      case 'schedule_followup':
        return tt('groupWorkspace.memberStats.recommend.followUp', 'Lên follow-up 1:1 trong 1-2 ngày tới.', 'Schedule a 1:1 follow-up within the next 1-2 days.');
      case 'focus_weak_topics':
        return focusLabel
          ? tt('groupWorkspace.memberStats.recommend.focusWeakTopics', `Ưu tiên ôn ${focusLabel} trước quiz tiếp theo.`, `Review ${focusLabel} before the next quiz.`)
          : tt('groupWorkspace.memberStats.recommend.focusWeakTopicsGeneric', 'Ôn lại các chủ đề yếu trước khi giao quiz mới.', 'Review weak topics before assigning another quiz.');
      case 'practice_foundation':
        return tt('groupWorkspace.memberStats.recommend.foundation', 'Tạm quay về quiz mức cơ bản để củng cố nền tảng.', 'Step back to easier quizzes to rebuild the foundation.');
      case 'slow_down_review':
        return tt('groupWorkspace.memberStats.recommend.slowDown', 'Yêu cầu member review lời giải kỹ hơn thay vì làm nhanh.', 'Ask the member to slow down and review explanations more carefully.');
      case 'increase_study_time':
        return tt('groupWorkspace.memberStats.recommend.increaseTime', 'Tăng thêm thời gian ôn sau quiz, không chỉ tăng số lượng quiz.', 'Increase review time after each quiz instead of only increasing quiz count.');
      case 'unlock_harder_quiz':
        return tt('groupWorkspace.memberStats.recommend.harderQuiz', 'Có thể giao quiz khó hơn hoặc mở roadmap nâng cao.', 'You can assign a harder quiz or unlock a more advanced roadmap step.');
      default:
        return tt('groupWorkspace.memberStats.recommend.keepMomentum', 'Giữ nhịp hiện tại và kiểm tra lại sau snapshot tiếp theo.', 'Keep the current cadence and re-check on the next snapshot.');
    }
  }, [tt]);

  const selectedNarrative = useMemo(() => {
    if (!selectedMember) return '';
    const memberName = selectedMember?.fullName || selectedMember?.username || tt('groupWorkspace.memberStats.memberFallback', 'Thành viên', 'Member');
    const cadence = cadenceLabel(selectedIntelligence.cadenceCode).toLowerCase();
    const weakLabel = selectedIntelligence.weakFocus.slice(0, 2).join(', ');
    const delta = selectedTrendMeta.scoreDelta;

    let trendSentence = tt('groupWorkspace.memberStats.narrative.noTrend', 'Chưa đủ dữ liệu để kết luận xu hướng theo ngày.', 'There is not enough daily data to conclude a trend yet.');
    if (delta != null) {
      const deltaPct = Math.abs(Math.round(delta * 1000) / 10);
      trendSentence = delta > 0
        ? tt('groupWorkspace.memberStats.narrative.up', `Điểm hiệu suất đang tăng khoảng ${deltaPct}%.`, `Performance is trending up by about ${deltaPct}%.`)
        : delta < 0
          ? tt('groupWorkspace.memberStats.narrative.down', `Điểm hiệu suất đang giảm khoảng ${deltaPct}%.`, `Performance is trending down by about ${deltaPct}%.`)
          : tt('groupWorkspace.memberStats.narrative.flat', 'Kết quả đang đi ngang.', 'Results are holding steady.');
    }

    return tt(
      'groupWorkspace.memberStats.memberNarrative',
      `${memberName} hiện ở trạng thái ${healthLabel(selectedIntelligence.healthTone).toLowerCase()}. Đã làm ${selectedSnapshot.totalQuizAttempts ?? 0} quiz và học khoảng ${formatMinutes(selectedSnapshot.totalMinutesSpent)}. ${trendSentence}${weakLabel ? ` Điểm yếu hiện tại: ${weakLabel}.` : ''}`,
      `${memberName} is currently ${healthLabel(selectedIntelligence.healthTone).toLowerCase()}. Completed ${selectedSnapshot.totalQuizAttempts ?? 0} quizzes with about ${formatMinutes(selectedSnapshot.totalMinutesSpent)} of study time. ${trendSentence}${weakLabel ? ` Current weak areas: ${weakLabel}.` : ''}`,
    );
  }, [
    cadenceLabel,
    healthLabel,
    selectedIntelligence.cadenceCode,
    selectedIntelligence.healthTone,
    selectedIntelligence.weakFocus,
    selectedMember,
    selectedSnapshot.totalMinutesSpent,
    selectedSnapshot.totalQuizAttempts,
    selectedTrendMeta.scoreDelta,
    tt,
  ]);

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

  const overviewCards = [
    {
      key: 'roster',
      icon: Users,
      label: tt('groupWorkspace.memberStats.overview.roster', 'Tổng thành viên', 'Roster'),
      value: `${sortedRows.length}`,
      note: tt('groupWorkspace.memberStats.overview.coverage', `${snapshotCoverage}/${sortedRows.length} có snapshot gần nhất`, `${snapshotCoverage}/${sortedRows.length} have a recent snapshot`),
      tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
    },
    {
      key: 'active',
      icon: Brain,
      label: tt('groupWorkspace.memberStats.overview.active', 'Đang có dữ liệu học', 'Active learners'),
      value: `${activeMembersCount}`,
      note: tt('groupWorkspace.memberStats.overview.activeNote', 'Đã làm ít nhất 1 quiz', 'Have attempted at least one quiz'),
      tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    },
    {
      key: 'avg',
      icon: Target,
      label: tt('groupWorkspace.memberStats.overview.avg', 'Kết quả trung bình', 'Average result'),
      value: averageVisibleScore,
      note: tt('groupWorkspace.memberStats.overview.avgNote', 'Tính trên toàn bộ member đang hiển thị', 'Calculated across the current roster'),
      tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    },
    {
      key: 'attention',
      icon: AlertTriangle,
      label: tt('groupWorkspace.memberStats.overview.attention', 'Cần follow-up', 'Need follow-up'),
      value: `${needsAttentionCount}`,
      note: tt('groupWorkspace.memberStats.overview.attentionNote', 'Ưu tiên hiển thị ở đầu danh sách', 'Prioritized at the top of the list'),
      tone: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    },
  ];

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
      formatAttemptStatusLabel={formatAttemptStatusLabel}
      formatDate={formatDate}
      formatMinutes={formatMinutes}
      formatPercent={formatPercent}
      formatRelativeDate={formatRelativeDate}
      formatScore={formatScore}
      formulaDialogOpen={formulaDialogOpen}
      generatingMemberId={generatingMemberId}
      handleAssignQuiz={handleAssignQuiz}
      handleGenerateMemberSnapshot={handleGenerateMemberSnapshot}
      handleOpenMember={handleOpenMember}
      healthLabel={healthLabel}
      healthToneClass={healthToneClass}
      intelligenceMap={intelligenceMap}
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
      reasonLabel={reasonLabel}
      recommendationLabel={recommendationLabel}
      selectedAttemptHistory={selectedAttemptHistory}
      selectedDetailQuery={selectedDetailQuery}
      selectedIntelligence={selectedIntelligence}
      selectedMember={selectedMember}
      selectedQuizId={selectedQuizId}
      selectedRecentActivities={selectedRecentActivities}
      selectedSnapshot={selectedSnapshot}
      selectedWorkspaceMemberId={selectedWorkspaceMemberId}
      setAssignOpen={setAssignOpen}
      setFormulaDialogOpen={setFormulaDialogOpen}
      setMemberPage={setMemberPage}
      setSelectedQuizId={setSelectedQuizId}
      shellClass={shellClass}
      shouldRenderDedicatedDetail={shouldRenderDedicatedDetail}
      showLegacyMemberCards={showLegacyMemberCards}
      sortedRows={sortedRows}
      t={t}
      targetMember={targetMember}
      totalPages={totalPages}
      trendIcon={trendIcon}
      tt={tt}
    />
  );
}

export default GroupMemberStatsTab;
