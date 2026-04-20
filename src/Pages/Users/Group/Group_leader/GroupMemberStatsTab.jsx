import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Lock,
  Minus,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
      {formulaDialogOpen ? (
        <Dialog open={formulaDialogOpen} onOpenChange={setFormulaDialogOpen}>
          <DialogContent className={cn('max-w-6xl max-h-[85vh] overflow-y-auto', isDarkMode ? 'bg-[#0a1419] text-white border-white/10' : 'bg-white text-slate-900')}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <BookOpen className={cn('h-5 w-5', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
                {tt('groupWorkspace.memberStats.formulaDialog.title', 'Điểm theo dõi — Cách tính', 'Tracking Score — How it works')}
              </DialogTitle>
              <DialogDescription className={mutedClass}>
                {tt('groupWorkspace.memberStats.formulaDialog.subtitle', 'Hệ thống tự động tính điểm dựa trên kết quả quiz, tỉ lệ pass, mức độ hoạt động và xu hướng tiến bộ của thành viên.', 'The system automatically calculates a score based on quiz results, pass rate, activity level, and the member\'s progress trend.')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Main formula */}
              <div className={cn('rounded-xl border p-4', isDarkMode ? 'border-cyan-400/20 bg-cyan-400/5' : 'border-cyan-200 bg-cyan-50/60')}>
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-2', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                  {tt('groupWorkspace.memberStats.formulaDialog.mainFormula', 'Công thức chính', 'Main formula')}
                </p>
                <p className={cn('font-mono text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {'healthScore = clamp(baseHealth + trendBoost, 8, 96)'}
                </p>
                <p className={cn('mt-2 font-mono text-xs', mutedClass)}>
                  {'baseHealth = scoreRatio × 45 + passRate × 35 + activityRatio × 20'}
                </p>
              </div>

              {/* All 6 calculation steps — unified table */}
              <div>
                <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-3', eyebrowClass)}>
                  {tt('groupWorkspace.memberStats.formulaDialog.components', 'Chi tiết từng bước', 'Step-by-step details')}
                </p>
                <div className={cn('overflow-hidden rounded-xl border', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
                  <table className="w-full text-xs">
                    <thead className={isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                      <tr className={isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                        <th className="px-3 py-2.5 text-center font-semibold w-8">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{tt('groupWorkspace.memberStats.formulaDialog.thComponent', 'Thành phần', 'Component')}</th>
                        <th className="px-3 py-2.5 text-left font-semibold">{tt('groupWorkspace.memberStats.formulaDialog.thFormula', 'Công thức', 'Formula')}</th>
                        <th className="px-3 py-2.5 text-left font-semibold">{tt('groupWorkspace.memberStats.formulaDialog.thMeaning', 'Ý nghĩa', 'Meaning')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 1. scoreRatio */}
                      <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>1</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>scoreRatio</span>
                          <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 45%</p>
                        </td>
                        <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>averageScore / 100</td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          {tt('groupWorkspace.memberStats.formulaDialog.scoreDesc', 'Điểm TB quiz, chuẩn hoá 0–1. VD: 78 → 0.78. Chiếm tỉ trọng cao nhất — phản ánh trực tiếp năng lực.', 'Avg quiz score, normalized 0–1. E.g.: 78 → 0.78. Highest weight — directly reflects ability.')}
                        </td>
                      </tr>
                      {/* 2. passRate */}
                      <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>2</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>passRate</span>
                          <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 35%</p>
                        </td>
                        <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>passed / attempts</td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          {tt('groupWorkspace.memberStats.formulaDialog.passDesc', 'Tỉ lệ pass quiz. VD: 6/8 → 0.75. Đo mức thành thạo — không chỉ làm mà còn đạt chuẩn.', 'Quiz pass ratio. E.g.: 6/8 → 0.75. Measures mastery — not just taking but passing.')}
                        </td>
                      </tr>
                      {/* 3. activityRatio */}
                      <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>3</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>activityRatio</span>
                          <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 20%</p>
                        </td>
                        <td className={cn('px-3 py-3 align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          <p className="font-mono">{'min(1, A×0.45 + B×0.55)'}</p>
                          <p className={cn('mt-1 text-[10px]', mutedClass)}>A = min(1, attempts/6)</p>
                          <p className={cn('text-[10px]', mutedClass)}>B = min(1, activeDays/4)</p>
                        </td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          {tt('groupWorkspace.memberStats.formulaDialog.actDesc', 'Đo mức tham gia. Ngày hoạt động ưu tiên hơn (55% vs 45%). Ngưỡng: 6 quiz và 4 ngày = max.', 'Measures engagement. Active days weighted higher (55% vs 45%). Thresholds: 6 quizzes and 4 days = max.')}
                        </td>
                      </tr>
                      {/* 4. baseHealth */}
                      <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>4</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>baseHealth</span>
                        </td>
                        <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {'SR×45 + PR×35 + AR×20'}
                        </td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          {tt('groupWorkspace.memberStats.formulaDialog.baseDesc', 'Tổng điểm gốc từ 3 thành phần trên. Kết quả từ 0 đến 100.', 'Total base score from the 3 components above. Result ranges from 0 to 100.')}
                        </td>
                      </tr>
                      {/* 5. trendBoost */}
                      <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>5</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-amber-200' : 'text-amber-700')}>trendBoost</span>
                        </td>
                        <td className={cn('px-3 py-3 align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          <p className="font-mono">scoreDelta = last − first</p>
                          <div className={cn('mt-1.5 space-y-0.5 text-[10px]', mutedClass)}>
                            <p>≥ 0.05 → <span className={isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}>+8</span></p>
                            <p>{'(-0.05, 0.05)'} → <span>±0</span></p>
                            <p>≤ -0.05 → <span className={isDarkMode ? 'text-rose-300' : 'text-rose-600'}>−10</span></p>
                          </div>
                        </td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          {tt('groupWorkspace.memberStats.formulaDialog.trendDesc', 'Điều chỉnh theo xu hướng. Phạt nặng hơn thưởng (−10 vs +8) để phát hiện sớm sa sút.', 'Adjusts by trend. Penalty heavier than bonus (−10 vs +8) to detect decline early.')}
                        </td>
                      </tr>
                      {/* 6. healthScore */}
                      <tr className={isDarkMode ? '' : ''}>
                        <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>6</td>
                        <td className="px-3 py-3 align-top">
                          <span className={cn('font-mono font-bold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>healthScore</span>
                        </td>
                        <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                          {'clamp(base + boost, 8, 96)'}
                        </td>
                        <td className={cn('px-3 py-3 align-top', mutedClass)}>
                          <p>{tt('groupWorkspace.memberStats.formulaDialog.finalDesc', 'Kết quả cuối cùng, giới hạn 8–96. Phân loại:', 'Final result, clamped 8–96. Classification:')}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[
                              { label: '≥80 strong', c: isDarkMode ? 'text-emerald-300' : 'text-emerald-600' },
                              { label: '60–79 stable', c: isDarkMode ? 'text-cyan-300' : 'text-cyan-600' },
                              { label: '40–59 watch', c: isDarkMode ? 'text-amber-300' : 'text-amber-600' },
                              { label: '<40 risk', c: isDarkMode ? 'text-rose-300' : 'text-rose-600' },
                            ].map((t) => (
                              <span key={t.label} className={cn('font-mono text-[10px] font-bold', t.c)}>{t.label}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>


              {/* Current member calculation */}
              {selectedIntelligence.attempts > 0 ? (() => {
                const sr = selectedIntelligence.scoreRatio ?? 0;
                const pr = selectedIntelligence.passRate ?? 0;
                const ar = selectedIntelligence.activityRatio ?? 0;
                const tb = selectedIntelligence.trendBoost ?? 0;
                const bh = selectedIntelligence.baseHealth ?? 0;
                const sc = Math.round(sr * 45 * 10) / 10;
                const pc = Math.round(pr * 35 * 10) / 10;
                const ac = Math.round(ar * 20 * 10) / 10;
                const avgScore = selectedSnapshot.averageScore ?? 0;
                const passed = selectedSnapshot.totalQuizPassed ?? 0;
                const attempts = selectedSnapshot.totalQuizAttempts ?? 0;
                const aDays = selectedIntelligence.trend?.activeDays ?? 0;
                const sd = selectedIntelligence.trend?.scoreDelta;
                const dir = selectedIntelligence.trend?.direction ?? 'unknown';

                const attemptPart = Math.min(1, attempts / 6);
                const daysPart = Math.min(1, aDays / 4);

                const dirLabel = dir === 'up' ? '↑ UP' : dir === 'down' ? '↓ DOWN' : dir === 'flat' ? '→ FLAT' : '? UNKNOWN';

                const memberSteps = [
                  {
                    label: 'scoreRatio',
                    calc: avgScore > 1
                      ? `${Math.round(avgScore)} / 100 = ${sr.toFixed(2)}`
                      : `${sr.toFixed(2)}`,
                  },
                  {
                    label: 'passRate',
                    calc: `${passed} / ${attempts} = ${pr.toFixed(2)}`,
                  },
                  {
                    label: 'activityRatio',
                    calc: `min(1, (min(1, ${attempts}/6)×0.45) + (min(1, ${aDays}/4)×0.55)) = min(1, ${(attemptPart * 0.45).toFixed(3)} + ${(daysPart * 0.55).toFixed(3)}) = ${ar.toFixed(4)}`,
                  },
                  {
                    label: 'baseHealth',
                    calc: `${sr.toFixed(2)}×45 + ${pr.toFixed(2)}×35 + ${ar.toFixed(2)}×20 = ${sc} + ${pc} + ${ac} = ${bh}`,
                  },
                  {
                    label: 'trendBoost',
                    calc: sd != null
                      ? `scoreDelta = ${sd.toFixed(3)} → ${dirLabel} → ${tb >= 0 ? `+${tb}` : String(tb)}`
                      : `không đủ data → ${tb >= 0 ? `+${tb}` : String(tb)}`,
                  },
                  {
                    label: 'healthScore',
                    calc: `clamp(round(${bh} + ${tb >= 0 ? tb : `(${tb})`}), 8, 96) = ${selectedIntelligence.healthScore}`,
                  },
                ];

                return (
                  <div className={cn('rounded-xl border p-4', isDarkMode ? 'border-cyan-400/20 bg-cyan-400/5' : 'border-cyan-200 bg-cyan-50/60')}>
                    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-2', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                      {tt('groupWorkspace.memberStats.formulaDialog.currentMember', 'Áp dụng cho thành viên hiện tại', 'Applied to current member')}
                    </p>

                    {/* Input badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        { label: 'Quiz', value: String(attempts) },
                        { label: 'Pass', value: `${passed}/${attempts}` },
                        { label: tt('groupWorkspace.memberStats.formulaDialog.inputScore', 'Điểm TB', 'Avg'), value: `${Math.round(avgScore)}` },
                        { label: tt('groupWorkspace.memberStats.formulaDialog.inputDays', 'Ngày HĐ', 'Days'), value: String(aDays) },
                        { label: 'Trend', value: dirLabel },
                      ].map((inp) => (
                        <span key={inp.label} className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium', isDarkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/80 text-slate-600')}>
                          <span className={mutedClass}>{inp.label}</span>
                          <span className={cn('font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{inp.value}</span>
                        </span>
                      ))}
                    </div>

                    {/* Step-by-step */}
                    <div className="space-y-1.5">
                      {memberSteps.map((step, i) => (
                        <div key={step.label} className="flex items-center gap-0">
                          <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold mr-2', isDarkMode ? 'bg-cyan-400/20 text-cyan-200' : 'bg-cyan-100 text-cyan-700')}>
                            {i + 1}
                          </span>
                          <span className={cn('w-[105px] shrink-0 text-left font-mono text-[11px] font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{step.label}</span>
                          <span className={cn('mx-1.5 font-mono text-[11px]', mutedClass)}>=</span>
                          <span className={cn('font-mono text-[11px]', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>{step.calc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Final result */}
                    <div className={cn('mt-3 flex items-center justify-between rounded-lg px-3 py-2', isDarkMode ? 'bg-white/[0.06]' : 'bg-white')}>
                      <span className={cn('font-mono text-xs font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        = ({sc} + {pc} + {ac}) {tb >= 0 ? '+' : '−'} {Math.abs(tb)} = <span className={cn('text-base font-black', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{selectedIntelligence.healthScore}</span>
                      </span>
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold', healthToneClass(selectedIntelligence.healthTone, isDarkMode))}>
                        {healthLabel(selectedIntelligence.healthTone)}
                      </span>
                    </div>
                  </div>
                );
              })() : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export default GroupMemberStatsTab;
