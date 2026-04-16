import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  Mail,
  PenLine,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGroup } from '@/hooks/useGroup';
import { formatGroupLogDescription } from '@/lib/groupWorkspaceLogDisplay';
import i18n from '@/i18n';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import { getUserDisplayLabel } from '@/Utils/userProfile';
import UserDisplayName from '@/Components/users/UserDisplayName';
import { useToast } from '@/context/ToastContext';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_MEMBER_DAYS = 7;
const ONBOARDING_WINDOW_DAYS = 14;
const INVITATION_ALERT_DAYS = 2;
const LEARNING_SNAPSHOT_PERIOD = 'DAILY';

const toSafeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const daysAgo = (value) => {
  const date = toSafeDate(value);
  return date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS)) : Number.POSITIVE_INFINITY;
};

const daysUntil = (value) => {
  const date = toSafeDate(value);
  return date ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / DAY_MS)) : Number.POSITIVE_INFINITY;
};

const withinDays = (value, days) => daysAgo(value) <= days;

const shortWeekdayLabel = (date, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', { weekday: 'short' }).format(date);

const startOfDayMs = (value) => {
  const date = toSafeDate(value);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : null;
};

function formatDateTime(value, lang, withTime = false) {
  const date = toSafeDate(value);
  if (!date) return i18n.t('groupDashboard.dateHelpers.noDate', 'No date');
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function relTime(value, lang) {
  const diff = daysAgo(value);
  if (!Number.isFinite(diff)) return i18n.t('groupDashboard.dateHelpers.unknownTime', 'Unknown time');
  if (diff === 0) return i18n.t('groupDashboard.dateHelpers.today', 'Today');
  if (diff === 1) return i18n.t('groupDashboard.dateHelpers.oneDayAgo', '1 day ago');
  if (diff < 7) return i18n.t('groupDashboard.dateHelpers.daysAgo', { count: diff, defaultValue: '{{count}} days ago' });
  return i18n.t('groupDashboard.dateHelpers.onDate', { date: formatDateTime(value, lang), defaultValue: 'On {{date}}' });
}

function joinLabel(value, lang) {
  const diff = daysAgo(value);
  if (!Number.isFinite(diff)) return i18n.t('groupDashboard.dateHelpers.missingJoinDate', 'Missing join date');
  if (diff === 0) return i18n.t('groupDashboard.dateHelpers.joinedToday', 'Joined today');
  if (diff === 1) return i18n.t('groupDashboard.dateHelpers.joinedOneDayAgo', 'Joined 1 day ago');
  if (diff < 7) return i18n.t('groupDashboard.dateHelpers.joinedDaysAgo', { count: diff, defaultValue: 'Joined {{count}} days ago' });
  return i18n.t('groupDashboard.dateHelpers.joinedOnDate', { date: formatDateTime(value, lang), defaultValue: 'Joined on {{date}}' });
}

function invitationExpiry(value) {
  const diff = daysUntil(value);
  if (!Number.isFinite(diff)) return i18n.t('groupDashboard.dateHelpers.noExpiry', 'No expiry');
  if (diff === 0) return i18n.t('groupDashboard.dateHelpers.expiresToday', 'Expires today');
  if (diff === 1) return i18n.t('groupDashboard.dateHelpers.expiresInOneDay', 'Expires in 1 day');
  return i18n.t('groupDashboard.dateHelpers.expiresInDays', { count: diff, defaultValue: 'Expires in {{count}} days' });
}

function logMeta(action, isDarkMode) {
  if (action === 'GROUP_CREATED') return { icon: Users, tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700' };
  if (String(action).startsWith('INVITATION_')) return { icon: Mail, tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700' };
  if (action === 'MEMBER_JOINED') return { icon: UserPlus, tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700' };
  if (String(action).startsWith('QUIZ_')) return { icon: PenLine, tone: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700' };
  return { icon: Activity, tone: isDarkMode ? 'bg-white/[0.08] text-slate-200' : 'bg-slate-100 text-slate-700' };
}

function logLabel(action) {
  const labels = {
    GROUP_CREATED: i18n.t('groupDashboard.logLabels.groupCreated', 'Group created'),
    INVITATION_SENT: i18n.t('groupDashboard.logLabels.invitationSent', 'Invitation sent'),
    INVITATION_PENDING: i18n.t('groupDashboard.logLabels.invitationPending', 'Invitation active'),
    INVITATION_ACCEPTED: i18n.t('groupDashboard.logLabels.invitationAccepted', 'Invitation accepted'),
    INVITATION_EXPIRED: i18n.t('groupDashboard.logLabels.invitationExpired', 'Invitation expired'),
    MEMBER_JOINED: i18n.t('groupDashboard.logLabels.memberJoined', 'Member joined'),
    QUIZ_CREATED_IN_GROUP: i18n.t('groupDashboard.logLabels.quizCreated', 'Quiz created'),
    QUIZ_PUBLISHED_IN_GROUP: i18n.t('groupDashboard.logLabels.quizPublished', 'Quiz published'),
    QUIZ_AUDIENCE_UPDATED_IN_GROUP: i18n.t('groupDashboard.logLabels.quizAudienceUpdated', 'Quiz assignment'),
    QUIZ_SUBMITTED_IN_GROUP: i18n.t('groupDashboard.logLabels.quizSubmitted', 'Quiz submitted'),
  };
  return labels[action] || i18n.t('groupDashboard.logLabels.activity', 'Activity');
}

function classificationLabel(code) {
  const c = String(code || '').toUpperCase();
  const map = {
    STRONG: i18n.t('groupDashboard.classification.strong', 'Strong'),
    AVERAGE: i18n.t('groupDashboard.classification.average', 'Average'),
    WEAK: i18n.t('groupDashboard.classification.weak', 'Needs support'),
    AT_RISK: i18n.t('groupDashboard.classification.atRisk', 'At risk'),
  };
  return map[c] || c || '—';
}

function formatPctRatio(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Math.round(Number(n) * 1000) / 10}%`;
}

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Math.round(Number(value) * 10) / 10;
}

function formatWhole(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return new Intl.NumberFormat().format(Number(value));
}

function passRate(snapshot) {
  const attempts = Number(snapshot?.totalQuizAttempts ?? 0);
  const passed = Number(snapshot?.totalQuizPassed ?? 0);
  return attempts > 0 ? passed / attempts : null;
}

function snapshotMemberId(member) {
  const id = Number(member?.workspaceMemberId ?? member?.groupMemberId ?? 0);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const PIE_CLASSIFICATION_COLORS = ['#22d3ee', '#a78bfa', '#fbbf24', '#fb7185'];

const MEMBER_CARD_PAGE_SIZE = 8;

function GroupDashboardTab({
  isDarkMode,
  group,
  members = [],
  membersLoading,
  isLeader = false,
  compactMode = false,
  currentUserId,
  hasWorkspaceAnalytics = false,
  onOpenMemberStats,
  onRequestAnalyticsUpgrade,
}) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const {
    fetchPendingInvitations,
    fetchGroupLogs,
    fetchGroupLearningSnapshotsSummary,
    fetchGroupLearningSnapshotsLatest,
    fetchGroupLearningSnapshotsRanking,
    fetchGroupMemberLearningSnapshotLatest,
    fetchGroupMemberLearningSnapshotTrend,
    generateGroupLearningSnapshots,
  } = useGroup({ enabled: false });
  const lang = i18n.language;
  const fontClass = lang === 'en' ? 'font-poppins' : 'font-sans';
  const workspaceId = group?.workspaceId;
  const dashboardTitle = group?.groupName || group?.displayTitle || group?.name || t('groupDashboard.common.group', 'Group');

  const { data: pending = { count: 0, invitations: [] }, isLoading: pendingLoading } = useQuery({
    queryKey: ['group-pending-invitations', workspaceId],
    queryFn: () => fetchPendingInvitations(workspaceId),
    enabled: Boolean(isLeader && workspaceId),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['group-activity-logs', workspaceId],
    queryFn: () => fetchGroupLogs(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const [detailSnapshotMember, setDetailSnapshotMember] = useState(null);
  const [generatingSnapshots, setGeneratingSnapshots] = useState(false);
  const memberCardPage = 0;
  const detailWorkspaceMemberId = snapshotMemberId(detailSnapshotMember);

  const analyticsEnabled = Boolean(isLeader && workspaceId && hasWorkspaceAnalytics);

  const {
    data: learningSummary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchLearningSummary,
  } = useQuery({
    queryKey: ['group-learning-snapshot-summary', workspaceId, LEARNING_SNAPSHOT_PERIOD],
    queryFn: () => fetchGroupLearningSnapshotsSummary(workspaceId, { period: LEARNING_SNAPSHOT_PERIOD }),
    enabled: analyticsEnabled,
  });

  const {
    data: memberCardsPage,
    isLoading: cardsLoading,
    refetch: refetchMemberSnapshots,
  } = useQuery({
    queryKey: ['group-learning-snapshot-latest', workspaceId, LEARNING_SNAPSHOT_PERIOD, memberCardPage, MEMBER_CARD_PAGE_SIZE],
    queryFn: () => fetchGroupLearningSnapshotsLatest(workspaceId, {
      period: LEARNING_SNAPSHOT_PERIOD,
      sort: 'averageScore,desc',
      page: memberCardPage,
      size: MEMBER_CARD_PAGE_SIZE,
    }),
    enabled: analyticsEnabled,
  });

  const {
    data: rankingPage,
    isLoading: rankingLoading,
    refetch: refetchRanking,
  } = useQuery({
    queryKey: ['group-learning-snapshot-ranking', workspaceId, LEARNING_SNAPSHOT_PERIOD, 'averageScore', 'desc'],
    queryFn: () => fetchGroupLearningSnapshotsRanking(workspaceId, {
      period: LEARNING_SNAPSHOT_PERIOD,
      metric: 'averageScore',
      direction: 'desc',
      page: 0,
      size: 10,
    }),
    enabled: analyticsEnabled,
  });

  const { data: memberDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['group-member-learning-snapshot-latest', workspaceId, detailWorkspaceMemberId, LEARNING_SNAPSHOT_PERIOD],
    queryFn: () => fetchGroupMemberLearningSnapshotLatest(workspaceId, detailWorkspaceMemberId, { period: LEARNING_SNAPSHOT_PERIOD }),
    enabled: Boolean(analyticsEnabled && detailWorkspaceMemberId != null),
  });

  const { data: memberTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['group-member-learning-snapshot-trend', workspaceId, detailWorkspaceMemberId, LEARNING_SNAPSHOT_PERIOD],
    queryFn: () => fetchGroupMemberLearningSnapshotTrend(workspaceId, detailWorkspaceMemberId, { period: LEARNING_SNAPSHOT_PERIOD }),
    enabled: Boolean(analyticsEnabled && detailWorkspaceMemberId != null),
  });

  const memberLearningCards = useMemo(() => {
    const raw = memberCardsPage?.content;
    return Array.isArray(raw) ? raw : [];
  }, [memberCardsPage]);

  const scoreLeaderboard = useMemo(() => {
    const ranked = Array.isArray(rankingPage?.content) && rankingPage.content.length > 0
      ? rankingPage.content
      : memberLearningCards;
    return [...ranked]
      .filter((m) => (m.totalQuizAttempts || 0) > 0 && m.averageScore != null)
      .sort((a, b) => (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0))
      .slice(0, 10)
      .map((m) => {
        const raw = getUserDisplayLabel(m, '?');
        const label = raw.length > 12 ? `${raw.slice(0, 12)}…` : raw;
        return {
          userId: m.userId,
          label,
          score: Math.round(Number(m.averageScore) * 10) / 10,
        };
      });
  }, [memberLearningCards, rankingPage]);

  const classificationPieData = useMemo(() => {
    const src = learningSummary?.classificationDistribution;
    if (!src || typeof src !== 'object') return [];
    return Object.entries(src).map(([key, value]) => ({
      name: classificationLabel(key),
      value: Number(value) || 0,
      key,
    })).filter((d) => d.value > 0);
  }, [learningSummary, lang]);

  const roster = members.map((member) => ({ ...member, joinedDate: toSafeDate(member.joinedAt) }))
    .sort((a, b) => (b.joinedDate?.getTime() ?? 0) - (a.joinedDate?.getTime() ?? 0));

  const totalMembers = roster.length;
  const leaders = roster.filter((member) => member.role === 'LEADER').length;
  const contributors = roster.filter((member) => member.role === 'CONTRIBUTOR').length;
  const canUpload = roster.filter((member) => member.canUpload).length;
  const newThisWeek = roster.filter((member) => withinDays(member.joinedAt, RECENT_MEMBER_DAYS)).length;
  const onboardingMembers = roster.filter((member) => member.role === 'MEMBER' && withinDays(member.joinedAt, ONBOARDING_WINDOW_DAYS));
  const contributorNoUpload = roster.filter((member) => member.role === 'CONTRIBUTOR' && !member.canUpload);
  const openInvitations = isLeader ? (Number(pending.count) || 0) : 0;
  const expiringSoon = pending.invitations.filter((item) => daysUntil(item.expiredDate) <= INVITATION_ALERT_DAYS);
  const activityThisWeek = logs.filter((log) => withinDays(log.logTime, RECENT_MEMBER_DAYS)).length;
  const uploadCoverage = totalMembers ? Math.round((canUpload / totalMembers) * 100) : 0;
  const coordinatorCoverage = totalMembers ? Math.round(((leaders + contributors) / totalMembers) * 100) : 0;
  const latestActivityMs = logs.reduce((latest, log) => {
    const logDate = toSafeDate(log.logTime);
    return logDate ? Math.max(latest, logDate.getTime()) : latest;
  }, 0);

  const attentionItems = [];
  if (isLeader && openInvitations > 0) attentionItems.push({
    id: 'open-invitations',
    icon: Mail,
    tone: isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700',
    title: t('groupDashboard.attention.openInvitationsTitle', { count: openInvitations, defaultValue: '{{count}} invitation(s) still open' }),
    note: expiringSoon.length > 0
      ? t('groupDashboard.attention.expiringSoonNote', { count: expiringSoon.length, defaultValue: '{{count}} invitation(s) expire soon.' })
      : t('groupDashboard.attention.keepQueueShort', 'Keep the queue short and current.'),
  });
  if (totalMembers > 1 && contributors === 0) attentionItems.push({
    id: 'missing-contributor',
    icon: AlertCircle,
    tone: isDarkMode ? 'bg-rose-400/10 text-rose-100' : 'bg-rose-50 text-rose-700',
    title: t('groupDashboard.attention.missingContributorTitle', 'No contributor assigned'),
    note: t('groupDashboard.attention.missingContributorNote', 'Add at least one contributor to share content ownership.'),
  });
  contributorNoUpload.slice(0, 2).forEach((member) => attentionItems.push({
    id: `upload-${member.groupMemberId ?? member.userId}`,
    icon: Upload,
    tone: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700',
    title: t('groupDashboard.attention.uploadReviewTitle', { name: member.fullName || member.username, defaultValue: '{{name}} needs upload review' }),
    note: t('groupDashboard.attention.uploadReviewNote', 'Contributor lane is set but source upload is still blocked.'),
  }));
  onboardingMembers.slice(0, 2).forEach((member) => attentionItems.push({
    id: `onboarding-${member.groupMemberId ?? member.userId}`,
    icon: UserPlus,
    tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
    title: t('groupDashboard.attention.justJoinedTitle', { name: member.fullName || member.username, defaultValue: '{{name}} just joined' }),
    note: t('groupDashboard.attention.justJoinedNote', 'Assign a first task early.'),
  }));

  const watchlist = [];
  const seen = new Set();
  [...onboardingMembers, ...contributorNoUpload, ...roster].forEach((member) => {
    const key = String(member.groupMemberId ?? member.userId ?? member.username);
    if (!key || seen.has(key) || watchlist.length >= 6) return;
    seen.add(key);
    watchlist.push(member);
  });

  const cardClass = `rounded-[28px] border ${isDarkMode ? 'border-slate-700/70 bg-[#08131a]/92' : 'border-slate-200/80 bg-white/90'}`;
  const innerCardClass = isDarkMode ? 'border-slate-700/60 bg-white/[0.04]' : 'border-slate-200/70 bg-white/85';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const eyebrowClass = 'text-slate-500';

  const roleBadgeClass = (role) => {
    if (role === 'LEADER') return isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700';
    if (role === 'CONTRIBUTOR') return isDarkMode ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700';
    return isDarkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };

  const watchStatus = (member) => {
    if (member.role === 'CONTRIBUTOR' && !member.canUpload) return { label: t('groupDashboard.watchStatus.needsUploadReview', 'Needs upload review'), className: isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700' };
    if (member.canUpload) return { label: t('groupDashboard.watchStatus.readyToContribute', 'Ready to contribute'), className: isDarkMode ? 'bg-cyan-400/10 text-cyan-100' : 'bg-cyan-50 text-cyan-700' };
    if (withinDays(member.joinedAt, ONBOARDING_WINDOW_DAYS)) return { label: t('groupDashboard.watchStatus.onboardingWindow', 'Onboarding window'), className: isDarkMode ? 'bg-emerald-400/10 text-emerald-100' : 'bg-emerald-50 text-emerald-700' };
    return { label: t('groupDashboard.watchStatus.observeParticipation', 'Observe participation'), className: isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700' };
  };

  const stats = [
    { label: t('groupDashboard.stats.totalMembersLabel', 'Total members'), value: totalMembers, note: t('groupDashboard.stats.totalMembersNote', 'full roster'), icon: Users, tone: isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700' },
    { label: t('groupDashboard.stats.newThisWeekLabel', 'New this week'), value: newThisWeek, note: t('groupDashboard.stats.newThisWeekNote', 'recent joiners'), icon: UserPlus, tone: isDarkMode ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700' },
    { label: t('groupDashboard.stats.coordinationLanesLabel', 'Coordination lanes'), value: leaders + contributors, note: t('groupDashboard.stats.coordinationLanesNote', { percent: coordinatorCoverage, defaultValue: '{{percent}}% of roster' }), icon: Shield, tone: isDarkMode ? 'bg-violet-400/10 text-violet-200' : 'bg-violet-50 text-violet-700' },
    { label: t('groupDashboard.stats.uploadReadyLabel', 'Upload ready'), value: canUpload, note: t('groupDashboard.stats.uploadReadyNote', { percent: uploadCoverage, defaultValue: '{{percent}}% can add sources' }), icon: Upload, tone: isDarkMode ? 'bg-amber-400/10 text-amber-200' : 'bg-amber-50 text-amber-700' },
  ];

  const roleChartData = [
    { key: 'leader', label: t('home.group.leader'), value: leaders, color: 'bg-amber-500' },
    { key: 'contributor', label: t('home.group.contributor'), value: contributors, color: 'bg-cyan-500' },
    { key: 'member', label: t('home.group.member'), value: Math.max(0, totalMembers - leaders - contributors), color: 'bg-emerald-500' },
  ];

  const maxRoleCount = Math.max(1, ...roleChartData.map((item) => item.value));

  const activityChartData = latestActivityMs
    ? Array.from({ length: 7 }).map((_, index) => {
      const offset = 6 - index;
      const day = new Date(latestActivityMs - offset * DAY_MS);
      const dayStart = startOfDayMs(day);
      const dayEnd = dayStart + DAY_MS;
      const count = logs.filter((log) => {
        const logDate = toSafeDate(log.logTime);
        if (!logDate) return false;
        const value = logDate.getTime();
        return value >= dayStart && value < dayEnd;
      }).length;

      return {
        key: `${dayStart}`,
        label: shortWeekdayLabel(day, lang),
        count,
      };
    })
    : [];

  const maxActivityCount = Math.max(1, ...activityChartData.map((item) => item.count));

  const chartTooltipBox = {
    contentStyle: {
      borderRadius: 12,
      border: 'none',
      background: isDarkMode ? '#0f172a' : '#ffffff',
      color: isDarkMode ? '#e2e8f0' : '#0f172a',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    },
  };
  const axisMuted = isDarkMode ? '#64748b' : '#94a3b8';
  const memberTrendData = useMemo(() => {
    const points = Array.isArray(memberTrend?.points) ? memberTrend.points : [];
    return points.slice(-8).map((point) => ({
      snapshotId: point.snapshotId,
      label: formatDateTime(point.snapshotDate, lang),
      score: point.averageScore != null ? Math.round(Number(point.averageScore) * 10) / 10 : null,
      attempts: Number(point.totalQuizAttempts ?? 0),
    }));
  }, [memberTrend, lang]);

  const handleGenerateSnapshots = async () => {
    if (!workspaceId || generatingSnapshots) return;
    setGeneratingSnapshots(true);
    try {
      const result = await generateGroupLearningSnapshots(workspaceId, {
        snapshotPeriod: LEARNING_SNAPSHOT_PERIOD,
        force: true,
      });
      await Promise.all([
        refetchLearningSummary(),
        refetchMemberSnapshots(),
        refetchRanking(),
      ]);
      showSuccess(t('groupDashboard.snapshots.generateSuccess', {
        generated: result?.generatedCount ?? 0,
        skipped: result?.skippedCount ?? 0,
        defaultValue: 'Learning snapshots updated.',
      }));
    } catch (error) {
      showError(error?.message || t('groupDashboard.snapshots.generateFailed', 'Could not update learning snapshots.'));
    } finally {
      setGeneratingSnapshots(false);
    }
  };

  if (compactMode) {
    const learningKpis = [
      {
        label: t('groupDashboard.compact.kpiQuizAttemptsLabel', 'Quiz attempts'),
        value: summaryLoading ? '…' : formatWhole(learningSummary?.totalQuizAttempts),
        note: t('groupDashboard.compact.kpiQuizAttemptsNote', {
          count: learningSummary?.snapshotCount ?? 0,
          defaultValue: '{{count}} snapshot(s)',
        }),
        icon: BarChart3,
        tone: isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-50 text-cyan-700',
      },
      {
        label: t('groupDashboard.compact.kpiPassedLabel', 'Passed'),
        value: summaryLoading ? '…' : formatWhole(learningSummary?.totalQuizPassed),
        note: t('groupDashboard.compact.kpiPassedNote', 'passed quiz attempts'),
        icon: CheckCircle2,
        tone: isDarkMode ? 'bg-emerald-400/15 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
      },
      {
        label: t('groupDashboard.compact.kpiAvgScoreLabel', 'Avg score'),
        value: summaryLoading ? '…' : formatScore(learningSummary?.averageScore),
        note: t('groupDashboard.compact.kpiAvgScoreNote', 'from generated snapshots'),
        icon: TrendingUp,
        tone: isDarkMode ? 'bg-violet-400/15 text-violet-200' : 'bg-violet-50 text-violet-700',
      },
      {
        label: t('groupDashboard.compact.kpiMinutesLabel', 'Minutes spent'),
        value: summaryLoading ? '…' : formatWhole(learningSummary?.totalMinutesSpent),
        note: t('groupDashboard.compact.kpiMinutesNote', 'tracked study time'),
        icon: Target,
        tone: isDarkMode ? 'bg-amber-400/15 text-amber-200' : 'bg-amber-50 text-amber-700',
      },
    ];

    const memberCardTotalElements = Number(memberCardsPage?.totalElements) || 0;
    const memberCardTotalPages = Math.max(
      1,
      Number(memberCardsPage?.totalPages) || Math.ceil(memberCardTotalElements / MEMBER_CARD_PAGE_SIZE) || 1,
    );
    const showMemberCardPagination = memberCardTotalElements > MEMBER_CARD_PAGE_SIZE || typeof onOpenMemberStats === 'function';
    const dashboardScopeCards = [
      {
        key: 'group-health',
        icon: Activity,
        title: t('groupDashboard.compact.scope.groupHealthTitle', 'Group health'),
        body: t('groupDashboard.compact.scope.groupHealthBody', 'Invitation queue, role coverage, upload readiness, and recent activity.'),
      },
      {
        key: 'attention',
        icon: AlertCircle,
        title: t('groupDashboard.compact.scope.attentionTitle', 'Attention queue'),
        body: t('groupDashboard.compact.scope.attentionBody', 'Highlights operational gaps before they become member-level work.'),
      },
      {
        key: 'member-handoff',
        icon: Brain,
        title: t('groupDashboard.compact.scope.memberStatsTitle', 'Member stats handoff'),
        body: t('groupDashboard.compact.scope.memberStatsBody', 'Open member stats when you need per-person actions or learning detail.'),
      },
    ];

    return (
      <div className={`space-y-4 animate-in fade-in duration-300 ${fontClass}`}>
        <section className={cn(cardClass, 'overflow-hidden p-0')}>
          <div
            className={cn(
              'border-b px-5 py-5',
              isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/70',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-3xl">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>
                  {t('groupDashboard.compact.systemDashboardEyebrow', 'Group command center')}
                </p>
                <h2 className={`mt-2 text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {t('groupDashboard.compact.titleWithGroup', {
                    name: dashboardTitle,
                    defaultValue: '{{name}} overview',
                  })}
                </h2>
                <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>
                  {t('groupDashboard.compact.headlineSummary', 'Use this tab for group-level operations: health signals, coordination gaps, invitations, and activity flow.')}
                </p>
              </div>
              <div className={cn('min-w-[220px] rounded-[22px] border px-4 py-3', innerCardClass)}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${eyebrowClass}`}>
                  {t('groupDashboard.compact.scope.questionLabel', 'This tab answers')}
                </p>
                <p className={cn('mt-2 text-sm font-semibold leading-6', isDarkMode ? 'text-cyan-100' : 'text-cyan-800')}>
                  {t('groupDashboard.compact.scope.questionValue', 'What needs attention across the whole group?')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {dashboardScopeCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className={cn('rounded-[20px] border px-4 py-3', innerCardClass)}>
                    <div className="flex items-start gap-3">
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isDarkMode ? 'bg-cyan-400/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>{item.title}</p>
                        <p className={`mt-1 text-xs leading-5 ${subtleTextClass}`}>{item.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {typeof onOpenMemberStats === 'function' ? (
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={onOpenMemberStats}
                className={cn(
                  'flex w-full flex-wrap items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left transition hover:-translate-y-0.5',
                  isDarkMode
                    ? 'border-violet-400/20 bg-violet-400/10 text-violet-50 hover:bg-violet-400/15'
                    : 'border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100/70',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isDarkMode ? 'bg-violet-300/15 text-violet-100' : 'bg-white text-violet-700')}>
                    <Brain className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {t('groupDashboard.compact.memberStatsCtaTitle', 'Need per-member decisions?')}
                    </span>
                    <span className={cn('mt-0.5 block text-xs leading-5', isDarkMode ? 'text-violet-100/80' : 'text-violet-800/80')}>
                      {t('groupDashboard.compact.memberStatsCtaBody', 'Use Member stats for individual snapshots, quiz assignment, and member-specific follow-up.')}
                    </span>
                  </span>
                </span>
                <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-violet-800">
                  {t('groupDashboard.snapshots.openMemberStats', 'Open member stats')}
                </span>
              </button>
            </div>
          ) : null}
        </section>

        {isLeader && workspaceId && hasWorkspaceAnalytics ? (
          <section
            className={cn(
              cardClass,
              'overflow-hidden p-0 ring-1',
              isDarkMode ? 'ring-cyan-400/25' : 'ring-cyan-500/20',
            )}
          >
            <div
              className={cn(
                'relative overflow-hidden px-5 py-4',
                isDarkMode
                  ? 'bg-gradient-to-r from-cyan-950/90 via-slate-950/50 to-slate-950/30'
                  : 'bg-gradient-to-r from-cyan-50 via-white to-slate-50/80',
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-400/25 blur-3xl" aria-hidden="true" />
              <div className="relative flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                    isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${eyebrowClass}`}>
                    {t('groupDashboard.compact.learningIntelligenceEyebrow', 'Learning intelligence')}
                  </p>
                  <p className={`mt-1 text-sm leading-relaxed ${subtleTextClass}`}>
                    {t('groupDashboard.compact.learningIntelligenceSummary', 'Daily snapshots from quiz attempts, scores, time spent, and AI classification.')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generatingSnapshots}
                  className={cn('rounded-full font-semibold', isDarkMode ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15' : 'border-cyan-200 bg-white/80 text-cyan-700 hover:bg-cyan-50')}
                  onClick={handleGenerateSnapshots}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', generatingSnapshots ? 'animate-spin' : '')} />
                  {generatingSnapshots
                    ? t('groupDashboard.snapshots.generating', 'Updating...')
                    : t('groupDashboard.snapshots.generateDaily', 'Update daily snapshots')}
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {summaryError ? (
                <p className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
                  {t('groupDashboard.compact.summaryLoadError', 'Could not load learning summary. Try again later.')}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {learningKpis.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className={cn('rounded-[22px] border p-4', innerCardClass)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', k.tone)}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowClass}`}>{k.label}</p>
                      </div>
                      <p className={cn('mt-3 text-2xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>{k.value}</p>
                      <p className={cn('mt-2 text-xs leading-relaxed', subtleTextClass)}>{k.note}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className={cn('rounded-[22px] border p-4', innerCardClass)}>
                  <div className="mb-1 flex items-center gap-2">
                    <TrendingUp className={cn('h-4 w-4', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
                    <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t('groupDashboard.compact.scoreSpotlightTitle', 'Score spotlight')}
                    </h3>
                  </div>
                  <p className={`text-xs ${subtleTextClass}`}>
                    {t('groupDashboard.compact.scoreSpotlightSubtitle', { pageSize: MEMBER_CARD_PAGE_SIZE, defaultValue: 'Latest daily snapshots ranked by average score.' })}
                  </p>
                  <div className="mt-4 h-52 w-full min-h-[13rem]">
                    {rankingLoading ? (
                      <div className={`flex h-full items-center justify-center text-sm ${subtleTextClass}`}>…</div>
                    ) : scoreLeaderboard.length === 0 ? (
                      <div className={`flex h-full items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm ${subtleTextClass}`}>
                        {t('groupDashboard.compact.noCompletedQuizData', 'No generated snapshot data yet.')}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreLeaderboard} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={48} />
                          <YAxis tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip cursor={{ fill: isDarkMode ? 'rgba(34,211,238,0.08)' : 'rgba(6,182,212,0.12)' }} contentStyle={chartTooltipBox.contentStyle} />
                          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={28}>
                            {scoreLeaderboard.map((_, i) => (
                              <Cell key={`cell-bar-${i}`} fill={isDarkMode ? '#22d3ee' : '#0891b2'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={cn('rounded-[22px] border p-4', innerCardClass)}>
                  <div className="mb-1 flex items-center gap-2">
                    <Brain className={cn('h-4 w-4', isDarkMode ? 'text-violet-300' : 'text-violet-600')} />
                    <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t('groupDashboard.compact.aiClassificationTitle', 'AI classification mix')}
                    </h3>
                  </div>
                  <p className={`text-xs ${subtleTextClass}`}>
                    {t('groupDashboard.compact.aiClassificationSubtitle', 'From member learning profiles when available.')}
                  </p>
                  <div className="mt-4 flex h-52 items-center justify-center">
                    {summaryLoading ? (
                      <span className={`text-sm ${subtleTextClass}`}>…</span>
                    ) : classificationPieData.length === 0 ? (
                      <div className={`rounded-xl border border-dashed px-4 py-6 text-center text-sm ${subtleTextClass}`}>
                        {t('groupDashboard.compact.noAiLabels', 'No AI labels yet.')}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classificationPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={44}
                            outerRadius={72}
                            paddingAngle={3}
                          >
                            {classificationPieData.map((entry, index) => (
                              <Cell key={entry.key} fill={PIE_CLASSIFICATION_COLORS[index % PIE_CLASSIFICATION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipBox.contentStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div className={cn('rounded-[22px] border p-4', innerCardClass)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t('groupDashboard.snapshots.latestTitle', 'Latest member snapshots')}
                    </h3>
                    <p className={`mt-1 text-xs ${subtleTextClass}`}>
                      {t('groupDashboard.snapshots.latestSubtitle', {
                        page: memberCardPage + 1,
                        totalPages: memberCardTotalPages,
                        defaultValue: 'Daily snapshot page {{page}}/{{totalPages}}.',
                      })}
                    </p>
                  </div>
                  {showMemberCardPagination && typeof onOpenMemberStats === 'function' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-semibold"
                      onClick={onOpenMemberStats}
                    >
                      {t('groupDashboard.snapshots.openMemberStats', 'Open member stats')}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4">
                  {cardsLoading ? (
                    <div className={`rounded-xl border border-dashed px-4 py-6 text-center text-sm ${subtleTextClass}`}>
                      {t('groupDashboard.snapshots.loadingLatest', 'Loading snapshots...')}
                    </div>
                  ) : memberLearningCards.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-6 text-center text-sm ${subtleTextClass}`}>
                      {t('groupDashboard.snapshots.emptyLatest', 'No snapshots yet. Update daily snapshots to generate data from quiz attempts.')}
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {memberLearningCards.slice(0, MEMBER_CARD_PAGE_SIZE).map((snapshot) => (
                        <button
                          key={snapshot.snapshotId ?? snapshot.workspaceMemberId ?? snapshot.userId}
                          type="button"
                          className={cn(
                            'rounded-[18px] border px-4 py-3 text-left transition hover:-translate-y-0.5',
                            isDarkMode ? 'border-white/10 bg-black/20 hover:bg-white/[0.06]' : 'border-slate-200 bg-white hover:bg-slate-50',
                          )}
                          onClick={() => setDetailSnapshotMember(snapshot)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                                <UserDisplayName
                                  user={snapshot}
                                  fallback={t('groupDashboard.common.memberFallback', 'Member')}
                                  isDarkMode={isDarkMode}
                                />
                              </p>
                              <p className={`mt-1 text-xs ${eyebrowClass}`}>
                                {formatDateTime(snapshot.snapshotDate, lang)}
                              </p>
                            </div>
                            <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700')}>
                              {classificationLabel(snapshot.aiClassification)}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.12em] ${eyebrowClass}`}>{t('groupDashboard.snapshots.attempts', 'Attempts')}</p>
                              <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-cyan-100' : 'text-cyan-700')}>{snapshot.totalQuizAttempts ?? 0}</p>
                            </div>
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.12em] ${eyebrowClass}`}>{t('groupDashboard.snapshots.passed', 'Passed')}</p>
                              <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-emerald-100' : 'text-emerald-700')}>{snapshot.totalQuizPassed ?? 0}</p>
                            </div>
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.12em] ${eyebrowClass}`}>{t('groupDashboard.snapshots.score', 'Score')}</p>
                              <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-violet-100' : 'text-violet-700')}>{formatScore(snapshot.averageScore)}</p>
                            </div>
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.12em] ${eyebrowClass}`}>{t('groupDashboard.snapshots.passRate', 'Pass rate')}</p>
                              <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-amber-100' : 'text-amber-700')}>{formatPctRatio(passRate(snapshot))}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>
        ) : isLeader && workspaceId ? (
          <section className={`${cardClass} p-6`}>
            <div className="flex flex-wrap items-start gap-4">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                  isDarkMode ? 'bg-cyan-400/15 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
                )}
              >
                <BarChart3 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={cn('text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                  {t('groupDashboard.analyticsUpgrade.title', 'Workspace analytics')}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${subtleTextClass}`}>
                  {t('groupDashboard.analyticsUpgrade.description', 'Group learning dashboards use the same Workspace analytics entitlement as individual stats. Upgrade your plan to unlock member cards, charts, and drill-down views.')}
                </p>
                {typeof onRequestAnalyticsUpgrade === 'function' ? (
                  <Button
                    type="button"
                    className={cn('mt-4 rounded-full font-semibold', isDarkMode ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : '')}
                    onClick={onRequestAnalyticsUpgrade}
                  >
                    {t('groupDashboard.analyticsUpgrade.viewPlans', 'View plans')}
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`${cardClass} p-4`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}><Icon className="h-4 w-4" /></span>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowClass}`}>{stat.label}</p>
                </div>
                <p className={`mt-3 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoading ? '...' : stat.value}</p>
                <p className={`mt-1 text-sm ${subtleTextClass}`}>{stat.note}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className={`${cardClass} p-4`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupDashboard.charts.roleDistributionCompact', 'Role distribution')}
            </h3>
            <div className="mt-3 space-y-3">
              {roleChartData.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.label}</span>
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.value}</span>
                  </div>
                  <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${Math.max(6, Math.round((item.value / maxRoleCount) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${cardClass} p-4`}>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {t('groupDashboard.charts.weeklyTrendCompact', '7-day activity trend')}
            </h3>
            {activityChartData.length === 0 ? (
              <div className={`mt-3 rounded-[20px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>
                {t('groupDashboard.charts.noActivityLogData', 'No activity log data yet.')}
              </div>
            ) : (
              <div className="mt-3 flex items-end gap-2 h-28">
                {activityChartData.map((item) => (
                  <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-t ${isDarkMode ? 'bg-cyan-400/80' : 'bg-cyan-500/80'}`}
                      style={{ height: `${Math.max(6, Math.round((item.count / maxActivityCount) * 100))}%` }}
                      title={`${item.label}: ${item.count}`}
                    />
                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <Dialog
          open={Boolean(analyticsEnabled && detailWorkspaceMemberId != null)}
          onOpenChange={(open) => {
            if (!open) {
              setDetailSnapshotMember(null);
            }
          }}
        >
          <DialogContent
            className={cn(
              'max-h-[min(640px,92vh)] w-[min(100vw-1.5rem,560px)] max-w-none overflow-y-auto rounded-[26px] border p-0 shadow-2xl sm:max-w-2xl',
              isDarkMode ? 'border-white/10 bg-[#070f14]' : 'border-slate-200/80 bg-white',
            )}
          >
            <DialogHeader className={cn('space-y-1 border-b px-6 pb-4 pt-6 text-left sm:px-7', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
              <DialogTitle className={cn('text-xl font-black tracking-tight', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {detailLoading && !memberDetail
                  ? t('groupDashboard.detail.loading', 'Loading member…')
                  : (
                    <UserDisplayName
                      user={memberDetail || detailSnapshotMember}
                      fallback={t('groupDashboard.common.memberFallback', 'Member')}
                      isDarkMode={isDarkMode}
                    />
                  )}
              </DialogTitle>
              <DialogDescription className={cn('text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                {(memberDetail || detailSnapshotMember)?.username ? `@${(memberDetail || detailSnapshotMember).username}` : null}
                {(memberDetail || detailSnapshotMember)?.snapshotDate
                  ? ` · ${formatDateTime((memberDetail || detailSnapshotMember).snapshotDate, lang)}`
                  : null}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5 sm:px-7">
              <div className={cn('rounded-2xl border px-4 py-3 text-sm', innerCardClass)}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {t('groupDashboard.detail.snapshotPeriod', 'Daily learning snapshot')}
                  </span>
                  <span className={`text-xs ${subtleTextClass}`}>
                    {t('groupDashboard.detail.snapshotId', {
                      id: (memberDetail || detailSnapshotMember)?.snapshotId ?? '—',
                      defaultValue: 'Snapshot #{{id}}',
                    })}
                  </span>
                </div>
              </div>

              {detailLoading && !memberDetail ? (
                <p className={`text-sm ${subtleTextClass}`}>{t('groupDashboard.detail.fetchingSignals', 'Fetching learning signals…')}</p>
              ) : memberDetail ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { key: 'attempts', label: t('groupDashboard.detail.attempts', 'Attempts'), value: memberDetail.totalQuizAttempts ?? 0 },
                      { key: 'passed', label: t('groupDashboard.detail.passed', 'Passed'), value: memberDetail.totalQuizPassed ?? 0 },
                      { key: 'avgScore', label: t('groupDashboard.detail.avgScore', 'Avg score'), value: formatScore(memberDetail.averageScore) },
                      { key: 'passRate', label: t('groupDashboard.detail.passRate', 'Pass rate'), value: formatPctRatio(passRate(memberDetail)) },
                      { key: 'highest', label: t('groupDashboard.detail.highestScore', 'Highest'), value: formatScore(memberDetail.highestScore) },
                      { key: 'lowest', label: t('groupDashboard.detail.lowestScore', 'Lowest'), value: formatScore(memberDetail.lowestScore) },
                      { key: 'minutes', label: t('groupDashboard.detail.minutesSpent', 'Minutes'), value: formatWhole(memberDetail.totalMinutesSpent) },
                      { key: 'flashcards', label: t('groupDashboard.detail.flashcards', 'Flashcards'), value: memberDetail.flashcardsReviewed ?? 0 },
                    ].map(({ key, label, value }) => (
                      <div key={key} className={cn('rounded-2xl border px-3 py-3', innerCardClass)}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{label}</p>
                        <p className={cn('mt-1 text-lg font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className={cn('rounded-2xl border px-4 py-3 text-sm', innerCardClass)}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className={cn('font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {t('groupDashboard.detail.aiClassification', 'AI classification')}
                      </span>
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', isDarkMode ? 'bg-violet-400/10 text-violet-100' : 'bg-violet-50 text-violet-700')}>
                        {classificationLabel(memberDetail.aiClassification)}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs leading-relaxed ${subtleTextClass}`}>
                      {memberDetail.flashcardMasteryRate == null
                        ? t('groupDashboard.detail.flashcardNote', 'Flashcard mastery is not available yet because user review/progress data is not tracked.')
                        : t('groupDashboard.detail.flashcardMastery', {
                          rate: formatPctRatio(memberDetail.flashcardMasteryRate),
                          defaultValue: 'Flashcard mastery: {{rate}}',
                        })}
                    </p>
                  </div>

                  {(memberDetail.weakTopics?.length > 0 || memberDetail.strongTopics?.length > 0) ? (
                    <div className="space-y-3">
                      {memberDetail.strongTopics?.length > 0 ? (
                        <div>
                          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{t('groupDashboard.detail.strongAreas', 'Strong')}</p>
                          <div className="flex flex-wrap gap-2">
                            {memberDetail.strongTopics.map((a) => (
                              <span key={a} className={cn('rounded-full px-3 py-1 text-xs font-medium', isDarkMode ? 'bg-emerald-400/15 text-emerald-100' : 'bg-emerald-50 text-emerald-800')}>{a}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {memberDetail.weakTopics?.length > 0 ? (
                        <div>
                          <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>{t('groupDashboard.detail.growthAreas', 'Growth areas')}</p>
                          <div className="flex flex-wrap gap-2">
                            {memberDetail.weakTopics.map((a) => (
                              <span key={a} className={cn('rounded-full px-3 py-1 text-xs font-medium', isDarkMode ? 'bg-amber-400/15 text-amber-100' : 'bg-amber-50 text-amber-900')}>{a}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className={cn('rounded-2xl border px-4 py-3', innerCardClass)}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${eyebrowClass}`}>
                        {t('groupDashboard.detail.trendTitle', 'Score trend')}
                      </p>
                      {trendLoading ? <span className={`text-xs ${subtleTextClass}`}>…</span> : null}
                    </div>
                    {memberTrendData.length < 2 ? (
                      <p className={`text-sm ${subtleTextClass}`}>
                        {t('groupDashboard.detail.noTrend', 'Generate more snapshots to show a trend.')}
                      </p>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={memberTrendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: axisMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                            <Tooltip contentStyle={chartTooltipBox.contentStyle} />
                            <Line type="monotone" dataKey="score" stroke={isDarkMode ? '#22d3ee' : '#0891b2'} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className={`text-sm ${subtleTextClass}`}>{t('groupDashboard.detail.noData', 'No data.')}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      <section className={`${cardClass} p-6 lg:p-7`}>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${eyebrowClass}`}>{t('groupDashboard.hero.eyebrow', 'Group dashboard')}</p>
            <h2 className={`mt-2 truncate text-2xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dashboardTitle}</h2>
            <p className={`mt-3 max-w-3xl text-sm leading-6 ${subtleTextClass}`}>{t('groupDashboard.hero.description', 'Focus on who needs follow-up, which invitations are still open, and what changed most recently.')}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{t('groupDashboard.hero.invitationQueueLabel', 'Invitation queue')}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{!isLeader ? '—' : pendingLoading ? '...' : openInvitations}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{!isLeader ? t('groupDashboard.hero.leadersOnly', 'leaders only') : expiringSoon.length > 0 ? `${expiringSoon.length} ${t('groupDashboard.hero.expiringSoon', 'expiring soon')}` : t('groupDashboard.hero.currentlyOpen', 'currently open')}</p>
            </div>
            <div className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{t('groupDashboard.hero.activityThisWeekLabel', 'Activity this week')}</p>
              <p className={`mt-3 text-xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{logsLoading ? '...' : activityThisWeek}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{t('groupDashboard.hero.recentEventsOnLog', 'recent events on log')}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${cardClass} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}><Icon className="h-5 w-5" /></div>
                <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>{t('groupDashboard.hero.trackingBadge', 'Tracking')}</span>
              </div>
              <p className={`text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{membersLoading ? '...' : stat.value}</p>
              <p className={`mt-2 text-sm ${subtleTextClass}`}>{stat.label}</p>
              <p className={`mt-4 text-xs leading-5 ${eyebrowClass}`}>{stat.note}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={`${cardClass} p-6`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupDashboard.charts.roleDistributionTitle', 'Role distribution chart')}
          </h3>
          <p className={`mt-1 text-sm ${subtleTextClass}`}>
            {t('groupDashboard.charts.roleDistributionSubtitle', 'Compare role load across leader, contributor, and member lanes.')}
          </p>
          <div className="mt-5 space-y-4">
            {roleChartData.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{item.label}</span>
                  <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{item.value}</span>
                </div>
                <div className={`h-3 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className={`h-3 rounded-full ${item.color}`}
                    style={{ width: `${Math.max(8, Math.round((item.value / maxRoleCount) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupDashboard.charts.weeklyChartTitle', 'Weekly activity chart')}
          </h3>
          <p className={`mt-1 text-sm ${subtleTextClass}`}>
            {t('groupDashboard.charts.weeklyChartSubtitle', 'Track event volume from activity logs by day.')}
          </p>
          {activityChartData.length === 0 ? (
            <div className={`mt-5 rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>
              {t('groupDashboard.charts.noActivityLogData', 'No activity log data yet.')}
            </div>
          ) : (
            <div className="mt-5 flex items-end gap-3 h-44">
              {activityChartData.map((item) => (
                <div key={item.key} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.count}</span>
                  <div
                    className={`w-full rounded-t-md ${isDarkMode ? 'bg-cyan-400/80' : 'bg-cyan-500/80'}`}
                    style={{ height: `${Math.max(8, Math.round((item.count / maxActivityCount) * 100))}%` }}
                    title={`${item.label}: ${item.count}`}
                  />
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Clock3 className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('groupDashboard.attentionPanel.title', 'What needs attention')}</h3>
          </div>
          <div className="mt-5 space-y-3">
            {attentionItems.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 ${innerCardClass}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}`}><CheckCircle2 className="h-4 w-4" /></div>
                  <div><p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('groupDashboard.attentionPanel.allGoodTitle', 'No urgent gap right now')}</p><p className={`mt-1 text-sm leading-6 ${subtleTextClass}`}>{t('groupDashboard.attentionPanel.allGoodNote', 'The roster looks stable. Keep watching the log and invitation queue.')}</p></div>
                </div>
              </div>
            ) : attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}><Icon className="h-4 w-4" /></div>
                    <div><p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p><p className={`mt-1 text-sm leading-6 ${subtleTextClass}`}>{item.note}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Mail className={`h-5 w-5 ${isDarkMode ? 'text-violet-200' : 'text-violet-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('groupDashboard.invitationsPanel.title', 'Current invitations')}</h3>
          </div>
          <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>{t('groupDashboard.invitationsPanel.description', 'See who was invited, when the invitation was sent, and which requests are close to expiry.')}</p>
          <div className="mt-5 space-y-3">
            {!isLeader ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.invitationsPanel.leadersOnlyNote', 'Only leaders can review this queue.')}</div>
            ) : pendingLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.invitationsPanel.loading', 'Loading invitations...')}</div>
            ) : pending.invitations.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.invitationsPanel.empty', 'No invitations waiting right now.')}</div>
            ) : pending.invitations.slice(0, 5).map((item) => {
              const expiring = daysUntil(item.expiredDate) <= INVITATION_ALERT_DAYS;
              const badgeClass = expiring ? (isDarkMode ? 'bg-amber-400/10 text-amber-100' : 'bg-amber-50 text-amber-700') : (isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700');
              return (
                <div key={item.invitationId ?? item.invitedEmail} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`break-all text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.invitedEmail}</p>
                      <p className={`mt-1 text-xs ${eyebrowClass}`}>{t('groupDashboard.invitationsPanel.invitedBy', 'Invited by')} {item.invitedByFullName || item.invitedByUsername || t('groupDashboard.common.leaderDefault', 'Leader')}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{invitationExpiry(item.expiredDate)}</span>
                  </div>
                  <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${subtleTextClass}`}>
                    <span>{t('groupDashboard.invitationsPanel.sent', 'Sent')} {formatDateTime(item.invitedDate, lang, true)}</span>
                    <span>{t('groupDashboard.invitationsPanel.statusPending', 'Status: pending')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('groupDashboard.watchlist.title', 'Member watchlist')}</h3>
          </div>
          <div className="mt-5 grid gap-3">
            {membersLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.watchlist.preparing', 'Preparing watchlist...')}</div>
            ) : watchlist.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.watchlist.empty', 'No members to watch yet.')}</div>
            ) : watchlist.map((member) => {
              const status = watchStatus(member);
              return (
                <div key={member.groupMemberId ?? member.userId ?? member.username} className={`grid gap-3 rounded-[24px] border px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_auto_auto] md:items-center ${innerCardClass}`}>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      <UserDisplayName user={member} fallback={t('groupDashboard.common.memberFallback', 'Member')} isDarkMode={isDarkMode} />
                    </p>
                    <p className={`mt-1 text-xs ${eyebrowClass}`}>{member.email || (member.username ? `@${member.username}` : 'unknown')} · {joinLabel(member.joinedAt, lang)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClass(member.role)}`}>{member.role === 'LEADER' ? t('home.group.leader') : member.role === 'CONTRIBUTOR' ? t('home.group.contributor') : t('home.group.member')}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${cardClass} p-6`}>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-600'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t('groupDashboard.activityLog.title', 'Group activity log')}</h3>
          </div>
          <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>{t('groupDashboard.activityLog.description', 'A compact timeline of the most recent changes in the group.')}</p>
          <div className="mt-5 space-y-3">
            {logsLoading ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.activityLog.loading', 'Loading activity log...')}</div>
            ) : logs.length === 0 ? (
              <div className={`rounded-[22px] border px-4 py-5 text-sm ${innerCardClass} ${subtleTextClass}`}>{t('groupDashboard.activityLog.empty', 'No group activity recorded yet.')}</div>
            ) : logs.slice(0, 8).map((log) => {
              const { icon: Icon, tone } = logMeta(log.action, isDarkMode);
              return (
                <div key={`${log.logId ?? 'synthetic'}-${log.action}-${log.logTime}-${log.actorEmail ?? 'system'}`} className={`rounded-[22px] border px-4 py-4 ${innerCardClass}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{logLabel(log.action)}</span>
                        <span className={`text-xs ${eyebrowClass}`}>{relTime(log.logTime, lang)}</span>
                      </div>
                      <p className={`mt-2 text-sm font-semibold leading-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{formatGroupLogDescription(log, currentUserId, lang)}</p>
                      <p className={`mt-1 text-xs leading-5 ${subtleTextClass}`}>{log.actorEmail || t('groupDashboard.common.system', 'System')} · {formatDateTime(log.logTime, lang, true)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default GroupDashboardTab;
